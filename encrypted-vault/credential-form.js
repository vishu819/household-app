'use strict';
const ACCESS_FIELDS={
 'Net banking':[['Customer ID','Customer ID','text'],['UserName','Username','text'],['Password','Login password','password'],['Transaction password','Transaction password','password'],['MPIN','Mobile banking PIN','password'],['Security question','Security question','text'],['Security answer','Security answer','password']],
 'UPI':[['UPI ID','UPI ID','text'],['Mobile number','Registered mobile number','tel'],['App PIN','App lock PIN','password'],['UPI PIN','UPI PIN','password']],
 'Insurance':[['Policy number','Policy number','text'],['UserName','Portal username','text'],['Password','Portal password','password'],['Mobile number','Registered mobile number','tel']],
 'Deposit':[['Account number','Deposit account number','text'],['Customer ID','Customer ID','text'],['UserName','Portal username','text'],['Password','Portal password','password']],
 'Investment':[['Client ID','Client / folio ID','text'],['UserName','Broker username','text'],['Password','Login password','password'],['App PIN','App PIN','password']],
 'Other':[['UserName','Username / ID','text'],['Password','Password','password'],['Notes','Secure notes','text']]
};
window.VaultAccessFields=ACCESS_FIELDS;
function openEditor(entry){if(!db||busy)return;showEditor(entry?'Edit credential':'Add credential');const form=node('form');form.className='credential-form';
 const title=addInput(form,'Entry name','editTitle',entry?value(entry,'Title'):'');title.required=true;
 const owner=VaultActors.select(form,'Owner','editOwner',entry),purpose=addSelect(form,'Access type','editAccess',Object.keys(ACCESS_FIELDS).map(t=>[t,t]),entry&&ACCESS_FIELDS[value(entry,'Access type')]?value(entry,'Access type'):'Net banking');
 const institution=addInput(form,'Bank / provider','editInstitution',entry?value(entry,'Institution'):''),fields=node('div');fields.id='accessFields';form.append(fields);
 const note=node('p','Only fields relevant to this access type are shown. Optional fields can be left empty.','small muted');form.append(note);const draft=new Map(),inputs=new Map();
 function draw(){for(const [key,input]of inputs)draft.set(key,input.value);inputs.clear();fields.replaceChildren();institution.parentElement.firstChild.textContent=purpose.value==='UPI'?'UPI app / provider':purpose.value==='Insurance'?'Insurance company':purpose.value==='Investment'?'Broker / fund provider':'Bank / provider';
  for(const [key,label,type]of ACCESS_FIELDS[purpose.value]){const input=addInput(fields,label,'credential_'+key.replace(/\W/g,''),draft.has(key)?draft.get(key):entry?value(entry,key):'',type);inputs.set(key,input);}
 }
 purpose.addEventListener('change',draw);draw();const submit=node('button','Save credential','primary wide'),cancel=node('button','Cancel','wide');submit.type='submit';cancel.type='button';cancel.addEventListener('click',()=>enterVault());form.append(submit,cancel);$('editor').append(form);title.focus();touch();
 form.addEventListener('submit',async event=>{event.preventDefault();if(!db||busy)return;const actor=VaultActors.get(owner.value);if(!title.value.trim()||!actor){message('Enter an entry name and select an existing household actor.');return;}
 const active=db,request=epoch,target=entry||active.createEntry(active.getDefaultGroup()),before=entry?new Map(entry.fields):null;submit.disabled=true;busy=true;if(entry)target.pushHistory();
 for(const [key,v]of [['Title',title.value.trim()],['Owner',actor.name],['Owner actor ID',actor.id],['Institution',institution.value.trim()],['Access type',purpose.value]])target.fields.set(key,v);
 for(const [key,input]of inputs){target.fields.set(key,kdbxweb.ProtectedValue.fromString(input.value));input.value='';}draft.clear();target.times.update();
 try{const bytes=await active.save();if(request!==epoch)return;await VaultStorage.put(bytes,vaultName);if(request!==epoch)return;encrypted=bytes;lastLocalSave=Date.now();busy=false;enterVault();message('Credential saved.');window.dispatchEvent(new Event('household-vault-saved'));}
 catch(error){if(entry){target.fields=before;target.history.pop();}else active.move(target,null);if(request!==epoch)return;busy=false;enterVault();message('Save failed. The previously saved copy is unchanged.');}
 });
}
