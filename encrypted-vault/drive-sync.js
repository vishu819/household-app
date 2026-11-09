'use strict';
// Immutable encrypted snapshots: no remote version is overwritten or deleted.
window.VaultDriveSync={
 async digest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');},
 async upload(bytes,baseId=null,name=null,parentFolder=null){
  checkHeader(bytes);const hash=await this.digest(bytes),boundary='household_'+crypto.randomUUID();
  const metadata={name:name||'Household '+new Date().toISOString().replace(/[:.]/g,'-')+'.kdbx',mimeType:'application/octet-stream',...(parentFolder?{parents:[parentFolder]}:{}),appProperties:{householdVault:'1',householdId:HouseholdMembership.driveTag,sha256:hash,...(baseId?{parentSnapshot:baseId}:{})}};
  const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n',JSON.stringify(metadata),'\r\n--'+boundary+'\r\nContent-Type: application/octet-stream\r\n\r\n',bytes,'\r\n--'+boundary+'--'],{type:'multipart/related; boundary='+boundary});
  return HouseholdDrive.request('/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',{method:'POST',body});
 },
 async download(id){if(!/^[\w-]+$/.test(id))throw new Error('Invalid Drive file.');const response=await HouseholdDrive.request('/drive/v3/files/'+id+'?alt=media',{},true);const length=Number(response.headers.get('content-length'));if(length>MAX_FILE)throw new Error('Vault exceeds the local size limit.');const bytes=await response.arrayBuffer();if(bytes.byteLength>MAX_FILE)throw new Error('Vault exceeds the local size limit.');checkHeader(bytes);return bytes;}
};
