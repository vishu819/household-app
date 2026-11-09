'use strict';
// All credential and document metadata lives inside KDBX. Only encrypted bytes
// and Drive synchronization identifiers are persisted outside that file.
let driveBinding=null,syncRunning=false,driveReady=false,syncRequested=false,syncSaveTimer=null;
const SYNC_BATCH_MS=750;
function scheduleVaultSync(){clearTimeout(syncSaveTimer);syncSaveTimer=setTimeout(()=>{syncSaveTimer=null;if(driveReady)forceVaultSync();},SYNC_BATCH_MS);}
const syncMessage=s=>{$('syncStatus').textContent=s;parent.postMessage({type:'household-vault-status',text:s,connected:driveReady},location.origin);};
async function persistBinding(){await VaultStorage.metaPut(driveBinding);}
async function remoteMeta(id){return HouseholdDrive.request('/drive/v3/files/'+encodeURIComponent(id)+'?fields=id,name,version,md5Checksum,trashed,capabilities(canEdit),appProperties');}
async function saveRemote(bytes,id){return HouseholdDrive.request('/upload/drive/v3/files/'+encodeURIComponent(id)+'?uploadType=media&fields=id,version,md5Checksum',{method:'PATCH',headers:{'Content-Type':'application/octet-stream'},body:bytes});}
async function discoverVault(){
 driveReady=true;message('');document.body.classList.add('drive-ready');syncMessage('Finding your vault…');
 try{
  driveBinding=await VaultStorage.metaGet();if(driveBinding?.id&&HouseholdMembership.driveId&&driveBinding.id!==HouseholdMembership.driveId)throw new Error('This device is linked to a different vault. Open this household’s shared vault before continuing.');if(!driveBinding&&HouseholdMembership.driveId){driveBinding={id:HouseholdMembership.driveId,dirty:false};await persistBinding();}
  if(driveBinding?.id){const m=await remoteMeta(driveBinding.id);if(m.trashed)throw new Error('Your linked vault is in Drive trash. Restore it before syncing.');await organizeDriveVault();if(!encrypted)await adoptDriveVault(driveBinding.id);else await forceVaultSync();}
  else{
   const found=await HouseholdDrive.request('/drive/v3/files?q='+encodeURIComponent("trashed = false and appProperties has { key='householdId' and value='"+HouseholdMembership.driveTag+"' }")+'&fields=files(id,name,version,md5Checksum)&pageSize=100');
   if(found.files.length===1&&!encrypted){await adoptDriveVault(found.files[0].id);}
   else if(!found.files.length&&encrypted){await syncSavedVault();}
   else if(found.files.length||encrypted){$('chooseExisting').hidden=false;syncMessage(encrypted?'Connect your existing encrypted copy to Drive, or choose the shared vault.':'Choose your existing shared vault to avoid creating a duplicate.');$('setupActions').hidden=false;}
   else createVaultForm();
  }
 }catch(e){$('setupActions').hidden=false;$('chooseExisting').hidden=false;$('startNew').hidden=!!driveBinding?.id;syncMessage(e.message);}
}
async function adoptDriveVault(id){
 const m=await remoteMeta(id);if(m.appProperties?.householdId!==HouseholdMembership.driveTag)throw new Error('This vault belongs to a different household or is an older unlinked test vault. Restore a backup explicitly to import it.');if(m.trashed)throw new Error('That file is in Drive trash.');
 if(driveBinding?.dirty)throw new Error('This device has unsynced edits. Sync or export a backup before switching vaults.');
 const bytes=await VaultDriveSync.download(id);const verified=await remoteMeta(id);if(verified.version!==m.version)throw new Error('The shared vault changed while downloading. Sync again.');await VaultStorage.put(bytes,'Household.kdbx');
 await HouseholdMembership.bind(id);driveBinding={id,checksum:m.md5Checksum,version:m.version,dirty:false};await persistBinding();encrypted=bytes;vaultName='Household.kdbx';lock('Enter your shared vault password.');syncMessage('Connected · encrypted vault ready');
}
async function syncSavedVault(){
 if(!encrypted)return;
 driveBinding=driveBinding||{id:null};driveBinding.dirty=true;await persistBinding();
 if(driveReady){if(syncRunning)syncRequested=true;else scheduleVaultSync();}else syncMessage('Saved on this device · waiting for Google connection');
}
async function ensureDriveFolder(name,parentId=null){
 const q="trashed = false and mimeType = 'application/vnd.google-apps.folder' and name = '"+name+"'"+(parentId?" and '"+parentId+"' in parents":" and 'root' in parents");
 const found=await HouseholdDrive.request('/drive/v3/files?q='+encodeURIComponent(q)+'&fields=files(id)&pageSize=100');if(found.files.length)return found.files[0].id;
 const folder=await HouseholdDrive.request('/drive/v3/files?fields=id',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,mimeType:'application/vnd.google-apps.folder',...(parentId?{parents:[parentId]}:{}),appProperties:{householdVaultFolder:'1'}})});return folder.id;
}
async function organizeDriveVault(){
 const household=await ensureDriveFolder('Household');
 if(driveBinding?.id){
  const m=await HouseholdDrive.request('/drive/v3/files/'+encodeURIComponent(driveBinding.id)+'?fields=id,parents,ownedByMe');
  // Shared files remain in the owner's folder. Each account may keep its own backups.
  if(m.ownedByMe&&!(m.parents||[]).includes(household))await HouseholdDrive.request('/drive/v3/files/'+encodeURIComponent(m.id)+'?addParents='+encodeURIComponent(household)+(m.parents?.length?'&removeParents='+encodeURIComponent(m.parents.join(',')):'')+'&fields=id',{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'});
 }
 return household;
}
async function backupVault(bytes,kind){
 const household=await organizeDriveVault(),folder=await ensureDriveFolder('Backups',household);
 const name='Household '+kind+' '+new Date().toISOString().replace(/[:.]/g,'-')+'.kdbx';
 return VaultDriveSync.upload(bytes,driveBinding.id,name,folder);
}
async function forceVaultSync(){
 if(syncRunning){syncRequested=true;return;}clearTimeout(syncSaveTimer);syncSaveTimer=null;if(busy||!$('editor').hidden){syncMessage('Finish editing before syncing.');return;}syncRunning=true;syncRequested=false;let succeeded=false;$('forceVaultSync').disabled=true;
 try{
  if(!driveReady)throw new Error('Connect Google Drive to sync.');
  if(!encrypted)throw new Error('Set up or choose a vault first.');
  const bytes=encrypted.slice(0),localRevision=VaultStorage.revision;
  syncMessage('Syncing encrypted vault…');
  if(!driveBinding?.id){
   // Discover again immediately before creation, including retry after uncertain upload.
   const found=await HouseholdDrive.request('/drive/v3/files?q='+encodeURIComponent("trashed = false and appProperties has { key='householdId' and value='"+HouseholdMembership.driveTag+"' }")+'&fields=files(id)&pageSize=100');
   if(found.files.length)throw new Error('A Household vault already exists. Choose it before syncing this device.');
   const household=await ensureDriveFolder('Household');const saved=await VaultDriveSync.upload(bytes,null,'Household.kdbx',household);await HouseholdMembership.bind(saved.id);const m=await remoteMeta(saved.id);
   driveBinding={id:saved.id,checksum:m.md5Checksum,version:m.version,dirty:VaultStorage.revision!==localRevision};await persistBinding();
  }else{
   const m=await remoteMeta(driveBinding.id);if(m.trashed)throw new Error('Restore the vault from Drive trash before syncing.');
   if(m.md5Checksum!==driveBinding.checksum){
    if(driveBinding.dirty){await backupVault(bytes,'conflict');throw new Error('Both phones have changes. An encrypted backup of this device was saved in Drive. Your local edits are kept; resolve the conflict before replacing either copy.');}
    await adoptDriveVault(driveBinding.id);
   }else if(driveBinding.dirty){
    // Preserve every pending version before touching the shared file. This also
    // retains edits if Drive accepts racing writes from separate devices.
    await backupVault(bytes,'recovery');
    const latest=await remoteMeta(driveBinding.id);
    if(latest.version!==m.version)throw new Error('The other phone just saved. Your encrypted recovery copy is safe. Sync again to review the conflict.');
    const saved=await saveRemote(bytes,driveBinding.id);
    driveBinding.checksum=saved.md5Checksum;driveBinding.version=saved.version;driveBinding.dirty=VaultStorage.revision!==localRevision;await persistBinding();
   }
  }
  succeeded=true;syncMessage(driveBinding.dirty?'New edits waiting to sync':'Synced just now');
 }catch(e){syncMessage(e.message);}finally{syncRunning=false;$('forceVaultSync').disabled=false;if(succeeded&&driveReady&&(syncRequested||driveBinding?.dirty))scheduleVaultSync();}
}
$('forceVaultSync').addEventListener('click',forceVaultSync);
$('chooseExisting').addEventListener('click',async()=>{try{const id=await HouseholdDrive.pick();if(id)await adoptDriveVault(id);}catch(e){syncMessage(e.message);}});
$('startNew').addEventListener('click',()=>{if(!encrypted)createVaultForm();else syncSavedVault();});
window.addEventListener('household-drive-connected',discoverVault);
window.addEventListener('household-drive-disconnected',()=>{driveReady=false;clearTimeout(syncSaveTimer);syncSaveTimer=null;syncRequested=false;document.body.classList.remove('drive-ready');lock('Connect Google Drive again.');});
window.addEventListener('online',()=>{if(driveReady)forceVaultSync();});
window.addEventListener('household-vault-saved',()=>{syncSavedVault().catch(e=>syncMessage(e.message));});
// Keep a single page scroll rather than a nested scrolling panel.
window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===parent&&event.data?.type==='household-vault-sync'){if(driveReady)forceVaultSync();else $('connectGoogle').click();}if(event.origin===location.origin&&event.source===parent&&event.data?.type==='household-vault-background')concealVault();if(event.origin===location.origin&&event.source===parent&&event.data?.type==='household-vault-resume')checkVaultIdle();if(event.origin===location.origin&&event.source===parent&&event.data?.type==='household-vault-lock')lock('Vault locked. Your Google connection is still active.');});
setInterval(()=>{if(driveReady&&!document.hidden)forceVaultSync();},12*60*60*1000);
// Vault uses one viewport-sized scrolling document; no iframe auto-height loop.
(async()=>{try{await HouseholdMembership.ready;const [stored,binding]=await Promise.all([VaultStorage.get(),VaultStorage.metaGet()]);if(stored&&binding?.id){driveBinding=binding;document.body.classList.add('vault-available');syncMessage('Saved on this device');$('connectGoogle').textContent='Connect Drive to sync';}}catch{}})();

$('backToMainSettings').addEventListener('click',()=>parent.postMessage({type:'household-vault-main-settings'},location.origin));
