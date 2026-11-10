'use strict';
// Deletions are encrypted tombstones, so an unsuccessful save can be rolled back.
async function deleteVaultItem(entry){
 if(!db||busy)return false;
 const active=db,request=epoch,previous=entry.fields.get('Household deleted');busy=true;
 entry.fields.set('Household deleted',new Date().toISOString());entry.times.update();
 try{const bytes=await active.save();if(epoch!==request||db!==active)return false;await VaultStorage.put(bytes,vaultName);if(epoch!==request||db!==active)return false;encrypted=bytes;lastLocalSave=Date.now();busy=false;enterVault();showVaultSection(value(entry,'Access type')==='Document'?'documents':'credentials');message('Entry deleted.');window.dispatchEvent(new Event('household-vault-saved'));return true;}
 catch{if(previous===undefined)entry.fields.delete('Household deleted');else entry.fields.set('Household deleted',previous);if(epoch===request&&db===active){busy=false;message('Could not delete. Your entry has been kept.');}return false;}
}
function confirmVaultDelete(entry){
 if(!db||busy)return;const active=db,request=epoch,dialog=node('dialog',undefined,'vault-delete-dialog'),title=node('h2','Delete '+(value(entry,'Title')||'entry')+'?'),description=node('p',value(entry,'Access type')==='Document'?'Remove this link from your shared vault? The original document stays in Drive.':'Remove this credential from your shared vault?');title.id='deleteVaultTitle';dialog.setAttribute('aria-labelledby',title.id);const actions=node('div',undefined,'delete-dialog-actions'),cancel=node('button','Cancel'),confirm=node('button','Delete','danger');cancel.type=confirm.type='button';cancel.addEventListener('click',()=>dialog.close());confirm.addEventListener('click',async()=>{if(active!==db||request!==epoch){dialog.close();return;}confirm.disabled=true;cancel.disabled=true;await deleteVaultItem(entry);dialog.close();});dialog.addEventListener('close',()=>dialog.remove());dialog.append(title,description,actions);actions.append(cancel,confirm);document.body.append(dialog);dialog.showModal();cancel.focus();
}
window.VaultItemActions={wrap(card,entry){
 const wrapper=node('div',undefined,'vault-swipe-item'),remove=iconButton('trash','Delete '+(value(entry,'Title')||'entry')),more=iconButton('more','Actions for '+(value(entry,'Title')||'entry'));remove.classList.add('swipe-delete');more.classList.add('swipe-menu');card.classList.add('swipe-content');wrapper.append(remove,card,more);let start=null,dragged=false,open=false;
 function setOpen(next){open=next;wrapper.classList.toggle('actions-open',open);more.setAttribute('aria-expanded',String(open));remove.tabIndex=open?0:-1;}setOpen(false);
 more.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();setOpen(!open);});remove.addEventListener('click',()=>confirmVaultDelete(entry));
 card.addEventListener('pointerdown',event=>{if(event.button!==0)return;start={x:event.clientX,y:event.clientY};dragged=false;});
 card.addEventListener('pointermove',event=>{if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>10){start=null;return;}if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy)*1.5){dragged=true;setOpen(dx<0);}});
 card.addEventListener('pointerup',()=>{start=null;});card.addEventListener('pointercancel',()=>{start=null;dragged=false;});card.addEventListener('click',event=>{if(dragged||open){event.preventDefault();event.stopImmediatePropagation();if(dragged){dragged=false;return;}if(open)setOpen(false);}},{capture:true});wrapper.addEventListener('keydown',event=>{if(event.key==='Escape'){setOpen(false);more.focus();}});return wrapper;
}};
