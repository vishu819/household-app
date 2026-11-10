import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const els=new Map(),listeners=new Map(),timeouts=new Map();let next=0,resolveLoad;
function element(){return {textContent:'',value:'',hidden:false,disabled:false,children:[],replaceChildren(...v){this.children=v;},append(...v){this.children.push(...v);},handlers:{},attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];if(k==='hidden')this.hidden=false;},addEventListener(k,fn){this.handlers[k]=fn;},focus(){},className:''};}
const ctx=vm.createContext({sortVaultEntries:items=>items,console,URL,ArrayBuffer,Uint8Array,Set,Map,Number,String,Error,Promise,
 document:{body:{classList:{remove(){},add(){}}},hidden:false,getElementById(id){if(!els.has(id))els.set(id,element());return els.get(id);},createElement:element,addEventListener(k,fn){listeners.set(k,fn);}},
 window:{addEventListener(){}},navigator:{},VaultStorage:{get:()=>Promise.resolve(null)},Option:function(text,value){this.textContent=text;this.value=value;},
 setTimeout(fn,ms){timeouts.set(++next,{fn,ms});return next;},clearTimeout(id){timeouts.delete(id);},
 kdbxweb:{Credentials:function(){},ProtectedValue:{fromString:p=>p},Kdbx:{load:()=>new Promise(resolve=>resolveLoad=resolve)}},
});
vm.runInContext(fs.readFileSync(new URL('../encrypted-vault/prototype.js',import.meta.url),'utf8'),ctx);const run=s=>vm.runInContext(s,ctx);
run("db={};var testEntry={fields:new Map([['Title','Test'],['Owner','Joint'],['Password','filled-value'],['URL',''],['Notes','  '],['Security answer','']])};detail(testEntry);");
assert.equal(els.get('fields').children.length,2,'Only the populated password row plus Edit entry should render');
console.log('PASS: empty and whitespace credential fields have no reveal/copy rows');

const toolbar=els.get('fields').children[0],field=els.get('fields').children[1],row=field.children[1];
assert.equal(toolbar.children[0].attrs['aria-label'],'Reveal all fields');assert.equal(toolbar.children[1].attrs['aria-label'],'Edit entry');
assert.equal(row.children[1].children[1].attrs['aria-label'],'Copy Password');
toolbar.children[0].handlers.click();assert.equal(row.children[0].textContent,'filled-value');assert.equal(toolbar.children[0].attrs['aria-pressed'],'true');
toolbar.children[0].handlers.click();assert.equal(row.children[0].textContent,'••••••••');
console.log('PASS: accessible icon actions, reveal all and conceal all');

let viewChanges=0;ctx.window.onVaultViewChange=()=>viewChanges++;run('list()');assert.equal(viewChanges,1);run('detail(testEntry)');assert.equal(viewChanges,2);run('showEditor("Edit")');assert.equal(viewChanges,3);run('lock()');assert.equal(viewChanges,4);
console.log('PASS: list, detail, editor and lock notify one explicit screen-state subscriber');

run("entries=[{fields:new Map([['Title','Bank'],['Access type','Net banking']])},{fields:new Map([['Title','Payment'],['Access type','UPI']])}];credentialType='Net banking';list()");assert.equal(els.get('count').textContent,'1 of 2 credentials');run("credentialType='Insurance';list()");assert.equal(els.get('count').textContent,'0 of 2 credentials');run("credentialType='';list()");assert.equal(els.get('count').textContent,'2 of 2 credentials');console.log('PASS: credential type filters match exact access types and All restores the list');
