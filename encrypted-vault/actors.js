'use strict';
const VaultActors={
 list(){return HouseholdMembership.actors||[];},
 selected(entry){return entry?(value(entry,'Owner actor ID')||this.list().find(a=>a.name===value(entry,'Owner'))?.id||''):'';},
 fill(select,selected='',filter=false){const list=this.list();select.replaceChildren(new Option(filter?'Everyone':'Select household actor',''));for(const actor of list)select.append(new Option(actor.name,filter?actor.name:actor.id));select.value=selected;if(!list.length&&!filter)select.options[0].textContent='Add actors in Household settings';},
 select(form,label,id,entry=null){const wrap=node('label',label),select=node('select');wrap.htmlFor=id;select.id=id;select.required=true;this.fill(select,this.selected(entry));wrap.append(select);form.append(wrap);return select;},
 name(entry){return this.get(value(entry,'Owner actor ID'))?.name||value(entry,'Owner')||'Unassigned';},
 get(id){return this.list().find(actor=>actor.id===id);}
};
window.VaultActors=VaultActors;
window.addEventListener('household-vault-actors-updated',()=>{for(const id of ['owner','documentOwner']){const select=document.getElementById(id);if(select)VaultActors.fill(select,select.value,true);}for(const id of ['editOwner','organizeOwner']){const select=document.getElementById(id);if(select)VaultActors.fill(select,select.value);}});

function addSelect(form,label,id,options,selected=''){const wrapper=node('label',label),select=node('select');wrapper.htmlFor=id;select.id=id;for(const [v,name]of options)select.append(new Option(name,v));select.value=selected;wrapper.append(select);form.append(wrapper);return select;}
