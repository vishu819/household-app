'use strict';
const $=id=>document.getElementById(id);
const MAX_FILE=2*1024*1024,IDLE_MS=300_000,REVEAL_MS=15_000;
let encrypted=null,db=null,entries=[],selected=null,epoch=0,idleTimer=null,busy=false,revealTimers=new Set(),vaultName='Household.kdbx',lastLocalSave=null,idleDeadline=0;
const text=value=>value&&typeof value.getText==='function'?value.getText():String(value??'');
const value=(entry,key)=>text(entry.fields.get(key));
const node=(tag,content,className)=>{const el=document.createElement(tag);if(content!==undefined)el.textContent=content;if(className)el.className=className;return el;};
function entryOwner(entry){return window.VaultActors?VaultActors.name(entry):value(entry,'Owner');}
function message(s){$('message').textContent=s;$('message').classList?.toggle('vault-warning',/failed|could not|conflict|unsynced|expired|cannot/i.test(s));}
function clearReveals(){for(const timer of revealTimers)clearTimeout(timer);revealTimers.clear();$('fields').replaceChildren();}
function lock(reason='Vault locked.'){
 window.onVaultLock?.();document.body.classList.remove('vault-unlocked');document.getElementById('documentCards')?.replaceChildren();epoch++;db=null;entries=[];selected=null;busy=false;clearTimeout(idleTimer);idleDeadline=0;clearReveals();
 $('editor').replaceChildren();$('editor').hidden=true;$('password').value='';$('entries').replaceChildren();$('entryTitle').textContent='';$('entryMeta').textContent='';$('owner').replaceChildren(new Option('Everyone',''));$('search').value='';$('count').textContent='';
 $('unlocked').hidden=true;$('detail').hidden=true;$('locked').hidden=false;$('lock').hidden=true;$('lock').textContent='Lock';$('state').textContent='Locked';$('unlock').disabled=!encrypted;$('unlock').textContent='Unlock vault';$('demo').disabled=false;$('file').disabled=false;message(reason);notifyVaultView();
}
function vaultSessionActive(){return !!db||busy||!$('editor').hidden;}
function checkVaultIdle(){if(vaultSessionActive()&&idleDeadline&&Date.now()>=idleDeadline){lock('Locked after five minutes without activity.');return false;}return true;}
function touch(){if(!checkVaultIdle()||!vaultSessionActive())return;clearTimeout(idleTimer);idleDeadline=Date.now()+IDLE_MS;idleTimer=setTimeout(()=>lock('Locked after five minutes without activity.'),IDLE_MS);}
function concealVault(){clearReveals();if(selected){$('detail').hidden=true;$('entries').hidden=false;document.getElementById('credentialTools')?.removeAttribute('hidden');selected=null;notifyVaultView();}}
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
  $('locked').hidden=true;$('unlocked').hidden=false;$('lock').hidden=false;$('lock').textContent='Lock';$('state').textContent='Unlocked';document.body.classList.add('vault-unlocked');busy=false;list();touch();message('');window.onVaultEnter?.();window.onVaultUnlocked?.();
 }catch(error){if(request!==epoch)return;lock(error.message.includes('PREVIEW_')?'This vault uses settings outside this prototype’s limits.':'Could not unlock. Check the password and file. Key-file vaults are not supported.');}
 finally{if(request===epoch){busy=false;$('unlock').disabled=!encrypted;$('unlock').textContent='Unlock vault';$('demo').disabled=false;$('file').disabled=false;}}
}
function credentialAvatar(entry){
 const avatar=node('span',undefined,'avatar'),name=(value(entry,'Institution')||value(entry,'Title')).toLowerCase().trim();
 const bank=typeof INSTITUTIONS!=='undefined'?INSTITUTIONS.find(b=>b.kind==='bank'&&[b.name,...(b.aliases||[])].some(n=>n.toLowerCase()===name)):null;
 const fallback=()=>{avatar.replaceChildren();if(value(entry,'Access type')==='Net banking'){avatar.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m3 9 9-6 9 6H3ZM5 10v9m7-9v9m7-9v9M3 21h18"/></svg>';}else avatar.textContent=(entryOwner(entry)||'?')[0];};
 fallback();if(bank?.logo){const image=document.createElement('img');image.src='../'+bank.logo;image.alt='';image.addEventListener('error',fallback,{once:true});avatar.replaceChildren(image);}return avatar;
}
function notifyVaultView(){window.onVaultViewChange?.();}
function list(){if($('editor')){$('editor').hidden=true;$('editor').replaceChildren();}selected=null;clearReveals();$('detail').hidden=true;$('entries').hidden=false;document.getElementById('credentialTools')?.removeAttribute('hidden');
 const query=$('search').value.toLowerCase(),owner=$('owner').value;
 const filtered=entries.filter(e=>!['Document','Document folder'].includes(value(e,'Access type'))&&(!owner||(entryOwner(e)||'Unassigned')===owner)&&[value(e,'Title'),value(e,'Institution')].join(' ').toLowerCase().includes(query));
 sortVaultEntries(filtered,'credentials');
 $('count').textContent=filtered.length+' of '+entries.filter(e=>!['Document','Document folder'].includes(value(e,'Access type'))).length+' credentials';$('entries').replaceChildren();
 for(const entry of filtered){const b=node('button',undefined,'entry');const body=node('span',undefined,'body');body.append(node('strong',value(entry,'Title')||'Untitled entry'),node('small',(entryOwner(entry)||'Unassigned')+' · '+(value(entry,'Access type')||'Credential')));b.append(credentialAvatar(entry),body,node('span','›'));b.addEventListener('click',()=>detail(entry));$('entries').append(b);}
 if(!filtered.length)$('entries').append(node('p','No matching entries.','muted'));notifyVaultView();
}
const vaultIcons={eye:'<path d="M2.1 12a1 1 0 0 1 0-.7C4 7.4 7.5 5 12 5s8 2.4 9.9 6.3a1 1 0 0 1 0 1.4C20 16.6 16.5 19 12 19s-8-2.4-9.9-6.3a1 1 0 0 1 0-.7Z"/><circle cx="12" cy="12" r="3"/>',pencil:'<path d="m15.5 5.5 3 3M4 20l4.5-1 12-12a2.1 2.1 0 0 0-3-3l-12 12L4 20Z"/>',copy:'<rect x="8" y="8" width="12" height="13" rx="2.5"/><path d="M15 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>'};
function iconButton(kind,label){const b=node('button',undefined,'icon-button');b.type='button';b.title=label;b.setAttribute('aria-label',label);b.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+vaultIcons[kind]+'</svg>';return b;}
function detail(entry){if(!db)return;selected=entry;clearReveals();$('entryTitle').textContent=value(entry,'Title')||'Untitled entry';$('entryMeta').textContent=(entryOwner(entry)||'Unassigned')+' · '+(value(entry,'Access type')||'Credential');$('entries').hidden=true;$('detail').hidden=false;$('credentialTools').hidden=true;
 const topActions=node('div',undefined,'detail-toolbar'),edit=iconButton('pencil','Edit entry'),revealAll=iconButton('eye','Reveal all fields');edit.addEventListener('click',()=>openEditor(entry));const toggles=[];let allTimer,allVisible=false;
 function allState(visible){allVisible=visible;revealAll.setAttribute('aria-pressed',String(visible));revealAll.setAttribute('aria-label',visible?'Hide all fields':'Reveal all fields');revealAll.title=visible?'Hide all fields':'Reveal all fields';}
 revealAll.addEventListener('click',()=>{const reveal=!allVisible;for(const toggle of toggles)toggle(reveal);allState(reveal);clearTimeout(allTimer);if(reveal){allTimer=setTimeout(()=>allState(false),REVEAL_MS);revealTimers.add(allTimer);}});allState(false);topActions.append(revealAll,edit);$('fields').append(topActions);
 for(const [key,raw]of entry.fields){if(['Title','Owner','Owner actor ID','Institution','Access type'].includes(key)||!text(raw).trim())continue;
  const field=node('div',undefined,'field'),out=node('div','••••••••','field-value'),row=node('div',undefined,'field-row'),actions=node('div',undefined,'field-actions');const reveal=iconButton('eye','Reveal '+key),copy=iconButton('copy','Copy '+key);let timer,visible=false;
  function hide(){visible=false;out.textContent='••••••••';reveal.setAttribute('aria-label','Reveal '+key);reveal.setAttribute('aria-pressed','false');reveal.title='Reveal '+key;if(timer){clearTimeout(timer);revealTimers.delete(timer);}}
  function setVisible(show){if(!db||selected!==entry)return;hide();if(!show)return;visible=true;out.textContent=text(raw);reveal.setAttribute('aria-label','Hide '+key);reveal.setAttribute('aria-pressed','true');reveal.title='Hide '+key;timer=setTimeout(hide,REVEAL_MS);revealTimers.add(timer);}
  toggles.push(setVisible);hide();reveal.addEventListener('click',()=>setVisible(!visible));
  copy.addEventListener('click',async()=>{if(!db||selected!==entry)return;const request=epoch;try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(text(raw));if(request===epoch)message('Copied '+key+'. Clear your clipboard when finished.');}catch{if(request===epoch)message('Clipboard unavailable. Reveal and copy the field manually.');}});
  actions.append(reveal,copy);row.append(out,actions);field.append(node('div',key,'field-label'),row);$('fields').append(field);
 }
 notifyVaultView();if(entry.binaries?.size)$('fields').append(node('p','This entry has attachments. Attachments are not displayed in this preview.','muted small'));
}
$('unlockForm').addEventListener('submit',unlock);$('lock').addEventListener('click',()=>lock());$('back').addEventListener('click',list);$('create').addEventListener('click',createVaultForm);$('add').addEventListener('click',()=>openEditor());$('backup').addEventListener('click',downloadVault);$('search').addEventListener('input',list);
$('file').addEventListener('change',e=>{const file=e.target.files[0];e.target.value='';if(file)chooseFile(file);});
$('demo').addEventListener('click',async()=>{lock('Loading the fictional sample…');const request=epoch;try{const response=await fetch('household-demo.kdbx');if(!response.ok)throw new Error();const file=new File([await response.arrayBuffer()],'household-demo.kdbx');if(request!==epoch)return;await chooseFile(file);$('password').focus();}catch{message('Sample unavailable. Choose the downloaded dummy file instead.');}});
for(const event of ['pointerdown','keydown','input'])document.addEventListener(event,touch,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)concealVault();else checkVaultIdle();});
window.addEventListener('pagehide',event=>{if(event.persisted)concealVault();else{lock('');encrypted=null;}});
window.addEventListener('pageshow',()=>{checkVaultIdle();if(!db)$('state').textContent='Locked';});
if('serviceWorker'in navigator){navigator.serviceWorker.register('sw.js').then(async()=>{await navigator.serviceWorker.ready;$('offline').textContent='Encrypted copy available on this device';}).catch(()=>{$('offline').textContent='Keep this page open for offline use. Offline shell unavailable.';});}else $('offline').textContent='Keep this page open for offline use.';

function refreshEntries(){entries=[];const visit=group=>{if(db.meta.recycleBinUuid&&group.uuid.equals(db.meta.recycleBinUuid))return;entries.push(...group.entries);group.groups.forEach(visit);};db.groups.forEach(visit);}
function showEditor(title){clearReveals();$('locked').hidden=true;$('unlocked').hidden=true;$('editor').hidden=false;$('editor').replaceChildren(node('h2',title));notifyVaultView();}
function addInput(form,label,id,initial='',type='text'){const wrapper=node('label',label),input=node('input');input.id=id;input.name=id;input.type=type;input.value=initial;input.maxLength=4096;if(type==='password')input.autocomplete='new-password';wrapper.htmlFor=id;wrapper.append(input);form.append(wrapper);return input;}
function createVaultForm(){lock('');showEditor('Create encrypted vault');$('editor').append(node('p','The password encrypts the vault. It is not sent to a server and cannot be reset here. Keep a recovery copy.','muted small'));const form=node('form'),password=addInput(form,'Master password','newVaultPassword','','password'),again=addInput(form,'Confirm password','confirmVaultPassword','','password');password.required=again.required=true;password.minLength=8;const submit=node('button','Create & connect vault','primary wide');submit.type='submit';const cancel=node('button','Cancel','wide');cancel.type='button';cancel.addEventListener('click',()=>lock(''));form.append(submit,cancel);$('editor').append(form);touch();
 form.addEventListener('submit',async e=>{e.preventDefault();if(password.value.length<8){message('Use a master password of at least 8 characters.');return;}if(password.value!==again.value){message('Passwords do not match.');return;}const request=++epoch;busy=true;$('lock').hidden=false;$('lock').textContent='Cancel';submit.disabled=true;touch();const credentials=new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(password.value));password.value=again.value='';try{const created=kdbxweb.Kdbx.create(credentials,'Household');created.setKdf(kdbxweb.Consts.KdfId.Argon2id);created.header.kdfParameters.set('M',kdbxweb.VarDictionary.ValueType.UInt64,kdbxweb.Int64.from(64*1024*1024));created.header.kdfParameters.set('I',kdbxweb.VarDictionary.ValueType.UInt64,kdbxweb.Int64.from(3));created.header.kdfParameters.set('P',kdbxweb.VarDictionary.ValueType.UInt32,1);const bytes=await created.save();if(request!==epoch||document.hidden)return;await VaultStorage.put(bytes,'Household.kdbx');if(request!==epoch)return;encrypted=bytes;vaultName='Household.kdbx';db=created;lastLocalSave=Date.now();$('fileName').textContent='Household.kdbx · encrypted copy saved on this device';enterVault();message('Vault created. Connecting it to Drive…');window.dispatchEvent(new Event('household-vault-saved'));}catch{if(request===epoch){lock('Could not create and save the vault. Existing local copy was kept.');}}});}
function enterVault(){busy=false;$('lock').textContent='Lock';refreshEntries();$('editor').hidden=true;$('editor').replaceChildren();$('locked').hidden=true;$('unlocked').hidden=false;$('lock').hidden=false;$('state').textContent='Unlocked';document.body.classList.add('vault-unlocked');const owners=[...new Set(entries.filter(e=>!['Document','Document folder'].includes(value(e,'Access type'))).map(e=>entryOwner(e)||'Unassigned'))].sort();if(window.VaultActors)VaultActors.fill($('owner'),$('owner').value,true);else $('owner').replaceChildren(new Option('Everyone',''),...owners.map(o=>new Option(o,o)));$('saveStatus').textContent=lastLocalSave?'Encrypted copy saved on this device':'Opened file · save an encrypted backup after editing';list();touch();window.onVaultEnter?.();}
function downloadVault(){if(!encrypted){message('Create or open a vault first.');return;}const blob=new Blob([encrypted],{type:'application/octet-stream'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download=vaultName.endsWith('.kdbx')?vaultName:'Household.kdbx';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);message('Encrypted file prepared. On iPhone, use Save to Files. Google sync is not connected.');}
const restoreRequest=epoch;VaultStorage.get().then(stored=>{if(!stored||restoreRequest!==epoch||encrypted||db)return;checkHeader(stored.bytes);encrypted=stored.bytes;vaultName=stored.name;lastLocalSave=stored.updatedAt;$('fileName').textContent=vaultName+' · encrypted copy on this device';$('unlock').disabled=false;message('Encrypted local vault found. Enter its master password to unlock.');}).catch(()=>message('Device storage unavailable. You can still open a file; new saves require working device storage.'));
