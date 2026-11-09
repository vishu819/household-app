import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const els=new Map(),listeners=new Map(),timeouts=new Map();let next=0,resolveLoad;
function element(){return {textContent:'',value:'',hidden:false,disabled:false,children:[],replaceChildren(...v){this.children=v;},append(...v){this.children.push(...v);},addEventListener(){},focus(){},className:''};}
const ctx=vm.createContext({console,URL,ArrayBuffer,Uint8Array,Set,Map,Number,String,Error,Promise,
 document:{body:{classList:{remove(){},add(){}}},hidden:false,getElementById(id){if(!els.has(id))els.set(id,element());return els.get(id);},createElement:element,addEventListener(k,fn){listeners.set(k,fn);}},
 window:{addEventListener(){}},navigator:{},VaultStorage:{get:()=>Promise.resolve(null)},Option:function(text,value){this.textContent=text;this.value=value;},
 setTimeout(fn,ms){timeouts.set(++next,{fn,ms});return next;},clearTimeout(id){timeouts.delete(id);},
 kdbxweb:{Credentials:function(){},ProtectedValue:{fromString:p=>p},Kdbx:{load:()=>new Promise(resolve=>resolveLoad=resolve)}},
});
vm.runInContext(fs.readFileSync(new URL('../encrypted-vault/prototype.js',import.meta.url),'utf8'),ctx);const run=s=>vm.runInContext(s,ctx);
run("db={};var testEntry={fields:new Map([['Title','Test'],['Owner','Joint'],['Password','filled-value'],['URL',''],['Notes','  '],['Security answer','']])};detail(testEntry);");
assert.equal(els.get('fields').children.length,2,'Only the populated password row plus Edit entry should render');
console.log('PASS: empty and whitespace credential fields have no reveal/copy rows');
