'use strict';
(()=>{
 const household=new URLSearchParams(location.search).get('household');let accepted=false,driveId=null,actors=[];
 let accept,reject;const ready=new Promise((resolve,fail)=>{accept=resolve;reject=fail;});ready.catch(()=>{});
 const requests=new Map();
 window.HouseholdMembership={household,ready,driveTag:null,get actors(){return actors;},get driveId(){return driveId;},check(){if(!accepted)throw new Error('Open Vault from your verified Household account.');},async bind(id){this.check();const request=crypto.randomUUID();return new Promise((resolve,fail)=>{const timer=setTimeout(()=>{requests.delete(request);fail(new Error('Household link could not be saved. Keep this vault file and retry.'));},15000);requests.set(request,{resolve,fail,timer});parent.postMessage({type:'household-vault-bind',household,id,request},location.origin);});}};
 window.addEventListener('message',async event=>{if(event.origin!==location.origin||event.source!==parent)return;const data=event.data;
  if(['household-vault-context','household-vault-actors'].includes(data?.type)&&data.household===household&&Array.isArray(data.actors)){actors=data.actors.filter(a=>a&&typeof a.id==='string'&&typeof a.name==='string'&&a.id&&a.name.trim()).map(a=>({id:a.id,name:a.name.trim()}));window.dispatchEvent(new Event('household-vault-actors-updated'));}
  if(data?.type==='household-vault-context'&&data.household===household){window.requestedVaultSection=data.section==='settings'?'settings':'credentials';if(window.showVaultSection)window.showVaultSection(window.requestedVaultSection);if(data.error){reject(new Error(data.error));return;}const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(household));HouseholdMembership.driveTag=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');accepted=true;driveId=data.driveId||null;accept();}
  if(data?.type==='household-vault-bind-result'){const pending=requests.get(data.request);if(!pending)return;clearTimeout(pending.timer);requests.delete(data.request);if(data.error)pending.fail(new Error(data.error));else{driveId=data.id;pending.resolve();}}
 });
 if(!household||!/^[a-zA-Z0-9-]{8,128}$/.test(household)||parent===window){reject(new Error('Create or join a household before opening Vault.'));return;}
 parent.postMessage({type:'household-vault-context'},location.origin);
 setTimeout(()=>{if(!accepted)reject(new Error('Household verification is required. Open Vault inside Household.'));},10000);
})();
