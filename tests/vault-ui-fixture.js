'use strict';
(async()=>{
 await HouseholdMembership.ready;
 // Fictional UI fixture: isolated household namespace, no real Drive requests.
 await VaultStorage.get();const response=await fetch('../encrypted-vault/household-demo.kdbx');encrypted=await response.arrayBuffer();
 db=await kdbxweb.Kdbx.load(encrypted.slice(0),new kdbxweb.Credentials(kdbxweb.ProtectedValue.fromString('Household-demo-only!')));
 const emptyOptional=group=>{for(const e of group.entries){e.fields.set('Notes','');e.fields.set('URL','');e.fields.set('Security answer','');}group.groups.forEach(emptyOptional);};db.groups.forEach(emptyOptional);
 const group=db.getDefaultGroup(),folder=db.createEntry(group);folder.fields.set('Title','Family IDs');folder.fields.set('Access type','Document folder');
 for(const [title,category,owner,id]of [['Identity card','Identity','Vishal','fixture_identity'],['Health policy','Insurance','Joint','fixture_policy']]){const e=db.createEntry(group);for(const [k,v]of [['Title',title],['Category',category],['Owner',owner],['Access type','Document'],['Drive file ID',id],['Document folder',folder.uuid.toString()]])e.fields.set(k,v);}
 window.HouseholdDrive={pick:async()=>[{id:'fixture_new',name:'New statement.pdf',mimeType:'application/pdf'}],request:async(path)=>{if(path.includes('alt=media'))return new Response(new Blob(['Fictional document for ZIP testing.']));if(path.includes('fields=name,mimeType'))return {name:'Fictional document.pdf',mimeType:'application/pdf',size:34,capabilities:{canDownload:true}};throw new Error('Fixture has no live Drive access.');}};
 document.body.classList.add('drive-ready');driveReady=false;enterVault();showVaultSection('documents');syncMessage('Fictional preview · no Drive access');message('');
 if(new URLSearchParams(location.search).has('locked'))lock('');
 $('connectGoogle').hidden=true;window.addEventListener('household-vault-saved',()=>message('Fictional changes saved locally.'));
})().catch(e=>message(e.message));
