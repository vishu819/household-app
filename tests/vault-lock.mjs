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
run("encrypted=new ArrayBuffer(64);db={};entries=[{secret:'dummy'}];selected={};document.getElementById('password').value='dummy';document.getElementById('fields').append({secret:'dummy'});touch();");
assert([...timeouts.values()].some(x=>x.ms===300000));[...timeouts.values()].find(x=>x.ms===300000).fn();assert.equal(run('db'),null);assert.equal(run('entries.length'),0);assert.equal(els.get('fields').children.length,0);assert.equal(els.get('password').value,'');assert.equal(els.get('unlocked').hidden,true);
run('db={};document.hidden=true;');listeners.get('visibilitychange')();assert.equal(run('db'),null);assert(els.get('message').textContent.includes('hidden'));
run("document.hidden=false;document.getElementById('password').value='dummy';var pending=unlock({preventDefault(){}});");assert.equal(run('busy'),true);run('lock()');resolveLoad({groups:[],meta:{}});await run('pending');assert.equal(run('db'),null);assert.equal(els.get('unlocked').hidden,true);assert.equal(els.get('password').value,'');
assert(!fs.readFileSync(new URL('../encrypted-vault/prototype.js',import.meta.url),'utf8').includes('localStorage'));
console.log('PASS: five-minute inactivity lock, background lock, cleared fields/password, late-unlock cancellation, and no localStorage use');
