'use strict';
const $=id=>document.getElementById(id);
const MAX_FILE=2*1024*1024,IDLE_MS=300_000,REVEAL_MS=15_000;
let encrypted=null,db=null,entries=[],selected=null,epoch=0,idleTimer=null,busy=false,revealTimers=new Set(),vaultName='Household.kdbx',lastLocalSave=null,idleDeadline=0;
const text=value=>value&&typeof value.getText==='function'?value.getText():String(value??'');
const value=(entry,key)=>text(entry.fields.get(key));
const node=(tag,content,className)=>{const el=document.createElement(tag);if(content!==undefined)el.textContent=content;if(className)el.className=className;return el;};
function entryOwner(entry){return window.VaultActors?VaultActors.name(entry):value(entry,'Owner');}
function message(s){$('message').textContent=s;}
function clearReveals(){for(const timer of revealTimers)clearTimeout(timer);revealTimers.clear();$('fields').replaceChildren();}
function lock(reason='Vault locked.'){
 window.onVaultLock?.();document.body.classList.remove('vault-unlocked');document.getElementById('documentCards')?.replaceChildren();epoch++;db=null;entries=[];selected=null;busy=false;clearTimeout(idleTimer);idleDeadline=0;clearReveals();
 $('editor').replaceChildren();$('editor').hidden=true;$('password').value='';$('entries').replaceChildren();$('entryTitle').textContent='';$('entryMeta').textContent='';$('owner').replaceChildren(new Option('Everyone',''));$('search').value='';$('count').textContent='';
 $('unlocked').hidden=true;$('detail').hidden=true;$('locked').hidden=false;$('lock').hidden=true;$('lock').textContent='Lock';$('state').textContent='Locked';$('unlock').disabled=!encrypted;$('unlock').textContent='Unlock vault';$('demo').disabled=false;$('file').disabled=false;message(reason);
}
function vaultSessionActive(){return !!db||busy||!$('editor').hidden;}
function checkVaultIdle(){if(vaultSessionActive()&&idleDeadline&&Date.now()>=idleDeadline){lock('Locked after five minutes without activity.');return false;}return true;}
function touch(){if(!checkVaultIdle()||!vaultSessionActive())return;clearTimeout(idleTimer);idleDeadline=Date.now()+IDLE_MS;idleTimer=setTimeout(()=>lock('Locked after five minutes without activity.'),IDLE_MS);}
function concealVault(){clearReveals();if(selected){$('detail').hidden=true;$('entries').hidden=false;selected=null;}}
async function chooseFile(file){lock('');encrypted=null;$('unlock').disabled=true;
 if(!file||file.size>MAX_FILE){message('Choose a .kdbx file smaller than 2 MB.');return;}
 const request=epoch;
 try{const bytes=await file.arrayBuffer();if(request!==epoch)return;checkHeader(bytes);encrypted=bytes;vaultName=file.name;$('fileName').textContent=file.name+' · encrypted copy in memory';$('unlock').disabled=false;message('Ready to unlock. No file was uploaded.');}
 catch{if(request!==epoch)return;encrypted=null;$('fileName').textContent='No file selected';message('This file is invalid, unsupported, or exceeds the preview’s work limits.');}
}
async function unlock(event){event.preventDefault();if(!encrypted||busy)return;
 const password=$('password').value;if(!password){message('Enter the vault password.');return;}
 const request=++epoch;busy=true;$('lock').hidden=false;$('lock').textContent='Cancel unlock';$('unlock').disabled=true;$('unlock').textContent='Unlocking…';$('demo').disabled=true;$('file').disabled=true;message('Unlocking locally…');touch();
 try{
  const credentials=new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(password));$('password').value='';
  const opened=await kdbxweb.Kdbx.load(encrypted.slice(0),credentials);
  if(request!==epoch||document.hidden)return;
  db=opened;refreshEntries();
  if(entries.length>500){lock('This preview supports up to 500 entries.');return;}
  const owners=[...new Set(entries.filter(e=>!['Document','Document folder'].includes(value(e,'Access type'))).map(e=>entryOwner(e)||'Unassigned'))].sort();if(window.VaultActors)VaultActors.fill($('owner'),$('owner').value,true);else $('owner').replaceChildren(new Option('Everyone',''),...owners.map(o=>new Option(o,o)));
  $('locked').hidden=true;$('unlocked').hidden=false;$('lock').hidden=false;$('lock').textContent='Lock';$('state').textContent='Unlocked';document.body.classList.add('vault-unlocked');busy=false;list();touch();message('Unlocked.');$('search').focus();window.onVaultEnter?.();window.onVaultUnlocked?.();
 }catch(error){if(request!==epoch)return;lock(error.message.includes('PREVIEW_')?'This vault uses settings outside this prototype’s limits.':'Could not unlock. Check the password and file. Key-file vaults are not supported.');}
 finally{if(request===epoch){busy=false;$('unlock').disabled=!encrypted;$('unlock').textContent='Unlock vault';$('demo').disabled=false;$('file').disabled=false;}}
}
function list(){if($('editor')){$('editor').hidden=true;$('editor').replaceChildren();}selected=null;clearReveals();$('detail').hidden=true;$('entries').hidden=false;
 const query=$('search').value.toLowerCase(),owner=$('owner').value;
 const filtered=entries.filter(e=>!['Document','Document folder'].includes(value(e,'Access type'))&&(!owner||(entryOwner(e)||'Unassigned')===owner)&&[value(e,'Title'),value(e,'Institution')].join(' ').toLowerCase().includes(query));
 $('count').textContent=filtered.length+' of '+entries.filter(e=>!['Document','Document folder'].includes(value(e,'Access type'))).length+' credentials';$('entries').replaceChildren();
 for(const entry of filtered){const b=node('button',undefined,'entry');const body=node('span',undefined,'body');body.append(node('strong',value(entry,'Title')||'Untitled entry'),node('small',(entryOwner(entry)||'Unassigned')+' · '+(value(entry,'Access type')||'Credential')));b.append(node('span',(entryOwner(entry)||'?')[0],'avatar'),body,node('span','›'));b.addEventListener('click',()=>detail(entry));$('entries').append(b);}
 if(!filtered.length)$('entries').append(node('p','No matching entries.','muted'));
}
function detail(entry){if(!db)return;selected=entry;clearReveals();$('entryTitle').textContent=value(entry,'Title')||'Untitled entry';$('entryMeta').textContent=(entryOwner(entry)||'Unassigned')+' · '+(value(entry,'Access type')||'Credential');$('entries').hidden=true;$('detail').hidden=false;
 for(const [key,raw]of entry.fields){if(['Title','Owner','Owner actor ID','Institution','Access type'].includes(key)||!text(raw).trim())continue;
  const field=node('div',undefined,'field'),out=node('div','••••••••','field-value'),actions=node('div',undefined,'field-actions');const reveal=node('button','Reveal'),copy=node('button','Copy');let timer;
  function hide(){out.textContent='••••••••';reveal.textContent='Reveal';if(timer){clearTimeout(timer);revealTimers.delete(timer);}}
  reveal.addEventListener('click',()=>{if(!db||selected!==entry)return;if(reveal.textContent==='Hide'){hide();return;}out.textContent=text(raw)||'(empty)';reveal.textContent='Hide';timer=setTimeout(hide,REVEAL_MS);revealTimers.add(timer);});
  copy.addEventListener('click',async()=>{if(!db||selected!==entry)return;const request=epoch;try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(text(raw));if(request===epoch)message('Copied '+key+'. Clear your clipboard when finished.');}catch{if(request===epoch)message('Clipboard unavailable. Reveal and copy the field manually.');}});
  actions.append(reveal,copy);field.append(node('div',key,'field-label'),out,actions);$('fields').append(field);
 }
 const edit=node('button','Edit entry');edit.addEventListener('click',()=>openEditor(entry));$('fields').append(edit);
 if(entry.binaries?.size)$('fields').append(node('p','This entry has attachments. Attachments are not displayed in this preview.','muted small'));
}
$('unlockForm').addEventListener('submit',unlock);$('lock').addEventListener('click',()=>lock());$('back').addEventListener('click',list);$('create').addEventListener('click',createVaultForm);$('add').addEventListener('click',()=>openEditor());$('backup').addEventListener('click',downloadVault);$('search').addEventListener('input',list);$('owner').addEventListener('change',list);
$('file').addEventListener('change',e=>{const file=e.target.files[0];e.target.value='';if(file)chooseFile(file);});
$('demo').addEventListener('click',async()=>{lock('Loading the fictional sample…');const request=epoch;try{const response=await fetch('household-demo.kdbx');if(!response.ok)throw new Error();const file=new File([await response.arrayBuffer()],'household-demo.kdbx');if(request!==epoch)return;await chooseFile(file);$('password').focus();}catch{message('Sample unavailable. Choose the downloaded dummy file instead.');}});
for(const event of ['pointerdown','keydown','input'])document.addEventListener(event,touch,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)concealVault();else checkVaultIdle();});
window.addEventListener('pagehide',event=>{if(event.persisted)concealVault();else{lock('');encrypted=null;}});
window.addEventListener('pageshow',()=>{checkVaultIdle();if(!db)$('state').textContent='Locked';});
if('serviceWorker'in navigator){navigator.serviceWorker.register('sw.js').then(async()=>{await navigator.serviceWorker.ready;$('offline').textContent='Encrypted copy available on this device';}).catch(()=>{$('offline').textContent='Keep this page open for offline use. Offline shell unavailable.';});}else $('offline').textContent='Keep this page open for offline use.';

function refreshEntries(){entries=[];const visit=group=>{if(db.meta.recycleBinUuid&&group.uuid.equals(db.meta.recycleBinUuid))return;entries.push(...group.entries);group.groups.forEach(visit);};db.groups.forEach(visit);}
function showEditor(title){clearReveals();$('locked').hidden=true;$('unlocked').hidden=true;$('editor').hidden=false;$('editor').replaceChildren(node('h2',title));}
function addInput(form,label,id,initial='',type='text'){const wrapper=node('label',label),input=node('input');input.id=id;input.name=id;input.type=type;input.value=initial;input.maxLength=4096;if(type==='password')input.autocomplete='new-password';wrapper.htmlFor=id;wrapper.append(input);form.append(wrapper);return input;}
function createVaultForm(){lock('');showEditor('Create encrypted vault');$('editor').append(node('p','The password encrypts the vault. It is not sent to a server and cannot be reset here. Keep a recovery copy.','muted small'));const form=node('form'),password=addInput(form,'Master password','newVaultPassword','','password'),again=addInput(form,'Confirm password','confirmVaultPassword','','password');password.required=again.required=true;password.minLength=8;const submit=node('button','Create & connect vault','primary wide');submit.type='submit';const cancel=node('button','Cancel','wide');cancel.type='button';cancel.addEventListener('click',()=>lock(''));form.append(submit,cancel);$('editor').append(form);touch();
 form.addEventListener('submit',async e=>{e.preventDefault();if(password.value.length<8){message('Use a master password of at least 8 characters.');return;}if(password.value!==again.value){message('Passwords do not match.');return;}const request=++epoch;busy=true;$('lock').hidden=false;$('lock').textContent='Cancel';submit.disabled=true;touch();const credentials=new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(password.value));password.value=again.value='';try{const created=kdbxweb.Kdbx.create(credentials,'Household');created.setKdf(kdbxweb.Consts.KdfId.Argon2id);created.header.kdfParameters.set('M',kdbxweb.VarDictionary.ValueType.UInt64,kdbxweb.Int64.from(64*1024*1024));created.header.kdfParameters.set('I',kdbxweb.VarDictionary.ValueType.UInt64,kdbxweb.Int64.from(3));created.header.kdfParameters.set('P',kdbxweb.VarDictionary.ValueType.UInt32,1);const bytes=await created.save();if(request!==epoch||document.hidden)return;await VaultStorage.put(bytes,'Household.kdbx');if(request!==epoch)return;encrypted=bytes;vaultName='Household.kdbx';db=created;lastLocalSave=Date.now();$('fileName').textContent='Household.kdbx · encrypted copy saved on this device';enterVault();message('Vault created. Connecting it to Drive…');window.dispatchEvent(new Event('household-vault-saved'));}catch{if(request===epoch){lock('Could not create and save the vault. Existing local copy was kept.');}}});}
function enterVault(){busy=false;$('lock').textContent='Lock';refreshEntries();$('editor').hidden=true;$('editor').replaceChildren();$('locked').hidden=true;$('unlocked').hidden=false;$('lock').hidden=false;$('state').textContent='Unlocked';document.body.classList.add('vault-unlocked');const owners=[...new Set(entries.filter(e=>!['Document','Document folder'].includes(value(e,'Access type'))).map(e=>entryOwner(e)||'Unassigned'))].sort();if(window.VaultActors)VaultActors.fill($('owner'),$('owner').value,true);else $('owner').replaceChildren(new Option('Everyone',''),...owners.map(o=>new Option(o,o)));$('saveStatus').textContent=lastLocalSave?'Encrypted copy saved on this device':'Opened file · save an encrypted backup after editing';list();touch();window.onVaultEnter?.();}
function downloadVault(){if(!encrypted){message('Create or open a vault first.');return;}const blob=new Blob([encrypted],{type:'application/octet-stream'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=vaultName.endsWith('.kdbx')?vaultName:'Household.kdbx';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);message('Encrypted file prepared. On iPhone, use Save to Files. Google sync is not connected.');}
const restoreRequest=epoch;VaultStorage.get().then(stored=>{if(!stored||restoreRequest!==epoch||encrypted||db)return;checkHeader(stored.bytes);encrypted=stored.bytes;vaultName=stored.name;lastLocalSave=stored.updatedAt;$('fileName').textContent=vaultName+' · encrypted copy on this device';$('unlock').disabled=false;message('Encrypted local vault found. Enter its master password to unlock.');}).catch(()=>message('Device storage unavailable. You can still open a file; new saves require working device storage.'));
