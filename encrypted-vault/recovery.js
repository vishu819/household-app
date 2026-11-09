'use strict';
let passwordChangeAfterUnlock=false;
window.onVaultUnlocked=()=>{if(passwordChangeAfterUnlock){passwordChangeAfterUnlock=false;$('changeVaultPassword').click();}};
$('changeVaultPassword').addEventListener('click',()=>{
 if(!db){passwordChangeAfterUnlock=true;showVaultSection('credentials');$('vaultSettings').hidden=true;message('Unlock to continue to Change password.');$('password').focus();$('password').scrollIntoView?.({block:'center',behavior:'smooth'});return;}
 $('vaultSettings').hidden=true;
 showEditor('Change vault password');const form=node('form');form.append(node('p','Both people will need the new password after syncing. Older backup files keep their previous password. Keep an emergency copy somewhere safe.','muted small'));
 const password=addInput(form,'New password','changedPassword','','password'),again=addInput(form,'Confirm new password','changedPasswordAgain','','password');password.minLength=8;password.required=again.required=true;
 const submit=node('button','Change password & sync','primary'),cancel=node('button','Cancel');submit.type='submit';cancel.type='button';cancel.addEventListener('click',enterVault);form.append(submit,cancel);$('editor').append(form);$('editor').scrollIntoView?.({block:'start',behavior:'smooth'});touch();
 form.addEventListener('submit',async event=>{event.preventDefault();if(!db||busy)return;if(password.value.length<8){message('Use at least 8 characters.');return;}if(password.value!==again.value){message('Passwords do not match.');return;}
 const active=db,request=epoch,oldCredentials=active.credentials,newCredentials=new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(password.value));password.value=again.value='';busy=true;submit.disabled=true;
 try{active.credentials=newCredentials;const bytes=await active.save();if(request!==epoch)return;await VaultStorage.put(bytes,vaultName);if(request!==epoch)return;encrypted=bytes;busy=false;enterVault();window.dispatchEvent(new Event('household-vault-saved'));lock('Password changed on this device. Use the new password to unlock; check sync status before opening the other phone.');}
 catch(e){active.credentials=oldCredentials;if(request!==epoch)return;busy=false;enterVault();message('Password change was not saved. The previous password still protects the saved copy.');}
 });
});
$('restoreVaultFile').addEventListener('click',()=>{
 if(!driveReady){message('Connect Google Drive first.');return;}
 $('vaultSettings').hidden=true;showEditor('Restore encrypted backup');const form=node('form');form.append(node('p','Restoring replaces this device’s vault after the backup password is verified. The previous encrypted device copy is retained. Drive conflicts stop automatic replacement.','muted small'));
 const file=addInput(form,'Encrypted backup (.kdbx)','restoreFile','','file');file.accept='.kdbx';file.required=true;const password=addInput(form,'Backup password','restorePassword','','password');password.required=true;
 const agree=node('label','I want to replace the current device copy'),checkbox=node('input');checkbox.type='checkbox';checkbox.required=true;agree.prepend(checkbox);form.append(agree);
 const submit=node('button','Verify & restore backup','primary'),cancel=node('button','Cancel');submit.type='submit';cancel.type='button';cancel.addEventListener('click',()=>lock('Restore cancelled.'));form.append(submit,cancel);$('editor').append(form);$('editor').scrollIntoView?.({block:'start',behavior:'smooth'});touch();
 form.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;const selected=file.files[0];if(!selected||selected.size>MAX_FILE){message('Choose a .kdbx file smaller than 2 MB.');return;}const request=epoch;busy=true;submit.disabled=true;const credentials=new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString(password.value));password.value='';
 try{const bytes=await selected.arrayBuffer();checkHeader(bytes);const restored=await kdbxweb.Kdbx.load(bytes.slice(0),credentials);if(request!==epoch||document.hidden)return;
 // Retain an encrypted Drive backup before replacing local state when linked.
 if(encrypted&&driveBinding?.id)await backupVault(encrypted.slice(0),'before-restore');if(request!==epoch)return;
 await VaultStorage.put(bytes,'Household.kdbx');if(request!==epoch)return;encrypted=bytes;vaultName='Household.kdbx';db=restored;busy=false;enterVault();window.dispatchEvent(new Event('household-vault-saved'));message('Backup restored on this device. Check sync status before using the other phone.');
 }catch(e){if(request!==epoch)return;busy=false;submit.disabled=false;message('Restore did not complete. Check the backup password, file and connection. The previously saved device copy is retained.');}
 });
});
