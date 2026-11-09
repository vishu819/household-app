import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const elements=new Map(),calls=[],stored=[],windowHandlers=new Map();let connectClicks=0;let metadata={id:'shared',version:'1',md5Checksum:'old'},uploadError=false,onPatch=null;const timers=new Map();let timerId=0;
const element=id=>{if(!elements.has(id))elements.set(id,{textContent:'',hidden:true,disabled:false,click(){connectClicks++;},addEventListener(){}});return elements.get(id);};
const c=vm.createContext({console,URL,JSON,Date,Number,Math,Promise,ArrayBuffer,encodeURIComponent,setInterval(){},setTimeout(fn,ms){timers.set(++timerId,{fn,ms});return timerId;},clearTimeout(id){timers.delete(id);},ResizeObserver:class{observe(){}},parent:{postMessage(){}},location:{origin:'https://household.test'},window:{addEventListener(k,fn){windowHandlers.set(k,fn);},dispatchEvent(){}},document:{body:{classList:{add(){},remove(){}}},hidden:false,getElementById:element},$:element,encrypted:new Uint8Array([1,2]).buffer,epoch:1,busy:false,db:null,entries:[],lock(){},createVaultForm(){},checkHeader(){},VaultStorage:{revision:'r1',metaGet:async()=>null,metaPut:async x=>stored.push({...x}),put:async()=>{}},VaultDriveSync:{upload:async(...args)=>{calls.push(['backup',...args]);if(uploadError)throw new Error('Offline');return {id:'new'};},download:async()=>new ArrayBuffer(2)},HouseholdMembership:{household:'test-household',bind:async()=>{}},HouseholdDrive:{request:async(path,options)=>{calls.push([path,options]);if(path.includes('pageSize=100'))return {files:[{id:'backup-folder'}]};if(path.includes('fields=id,parents,ownedByMe'))return {id:'shared',parents:['backup-folder'],ownedByMe:true};if(options?.method==='PATCH'){if(onPatch)await onPatch();return {md5Checksum:'new',version:'2'};}return {...metadata};}}});
vm.runInContext(fs.readFileSync(new URL('../encrypted-vault/workflow.js',import.meta.url),'utf8'),c);const run=s=>vm.runInContext(s,c);
run("driveReady=true;driveBinding={id:'shared',checksum:'old',version:'1',dirty:true}");await run('forceVaultSync()');assert.equal(run('driveBinding.dirty'),false);assert(calls.some(x=>x[0]==='backup'&&x[4]==='backup-folder')); assert(calls.some(x=>x[1]?.method==='PATCH'));
calls.length=0;metadata={id:'shared',version:'3',md5Checksum:'other'};run("driveBinding={id:'shared',checksum:'old',version:'1',dirty:true}");await run('forceVaultSync()');assert.equal(run('driveBinding.dirty'),true);assert(!calls.some(x=>x[1]?.method==='PATCH'));assert(element('syncStatus').textContent.includes('Both phones'));
calls.length=0;uploadError=true;metadata={version:'1',md5Checksum:'old'};await run('forceVaultSync()');assert(!calls.some(x=>x[1]?.method==='PATCH'));assert.equal(run('driveBinding.dirty'),true);assert(element('syncStatus').textContent.includes('Offline'));
run('driveReady=false');await run('syncSavedVault()');assert.equal(run('driveBinding.dirty'),true);assert(element('syncStatus').textContent.includes('waiting'));
assert(!fs.readFileSync(new URL('../encrypted-vault/index.html',import.meta.url),'utf8').includes('Use sample vault'));
console.log('PASS: recovery before update, conflicting edits never patched, failed backups preserve pending edits, disconnected queue, sample UI removed');

// Multiple local saves share one delayed sync; explicit sync bypasses the delay.
uploadError=false;metadata={version:'1',md5Checksum:'old'};timers.clear();calls.length=0;
run("driveReady=true;driveBinding={id:'shared',checksum:'old',version:'1',dirty:false}");
await run('syncSavedVault()');await run('syncSavedVault()');assert.equal(timers.size,1);assert.equal(calls.length,0);assert.equal([...timers.values()][0].ms,750);
// An edit arriving during the upload must be uploaded in a follow-up pass.
onPatch=async()=>{onPatch=null;run("VaultStorage.revision='r2';encrypted=new Uint8Array([3,4]).buffer");await run('syncSavedVault()');await run('forceVaultSync()');};
await run('forceVaultSync()');assert.equal(run('driveBinding.dirty'),true);assert.equal(timers.size,1);
metadata={version:'2',md5Checksum:'new'};const queued=[...timers.values()][0];timers.clear();queued.fn();
for(let i=0;i<40;i++)await Promise.resolve();
assert.equal(run('syncRunning'),false);assert.equal(run('driveBinding.dirty'),false);assert.equal(calls.filter(x=>x[1]?.method==='PATCH').length,2);
// A conflict must not start an automatic retry loop.
timers.clear();metadata={version:'9',md5Checksum:'other'};run('driveBinding.dirty=true');await run('forceVaultSync()');assert.equal(timers.size,0);
console.log('PASS: batched saves, immediate manual sync, edits during upload queued without overlap, conflicts stop automatic retries');

run('driveReady=false');const route=windowHandlers.get('message');
route({origin:'https://untrusted.test',source:c.parent,data:{type:'household-vault-sync'}});assert.equal(connectClicks,0);
route({origin:c.location.origin,source:{},data:{type:'household-vault-sync'}});assert.equal(connectClicks,0);
route({origin:c.location.origin,source:c.parent,data:{type:'household-vault-sync'}});assert.equal(connectClicks,1);
console.log('PASS: header sync reconnect routing and cross-origin/source rejection');
