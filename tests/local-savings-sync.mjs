// Run with: node tests/local-savings-sync.mjs. No network or dependencies.
const fs=await import('node:fs'),vm=await import('node:vm'),assert=(await import('node:assert/strict')).default;
const {fileURLToPath}=await import('node:url');
const root=fileURLToPath(new URL('../',import.meta.url));
const data=new Map(),elements=new Map(),timers=[];
const now='2026-11-09T10:00:00Z';
class Clock extends Date {constructor(...args){super(...(args.length?args:[now]));}static now(){return new Date(now).getTime();}}
const el=(value='')=>({value,innerHTML:'',hidden:true,textContent:'',addEventListener(){},scrollIntoView(){},classList:{contains:()=>false}});
const context=vm.createContext({console,Intl,Date:Clock,Math,JSON,Number,String,Boolean,Map,Set,
  localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},
  document:{querySelectorAll:()=>[],querySelector:()=>null,getElementById:id=>elements.get(id)||null,addEventListener(){}},
  window:{matchMedia:()=>({matches:true}),scrollY:0,scrollTo(){}},navigator:{},alert(){},
  setTimeout:(callback,delay)=>{timers.push({callback,delay});return timers.length;},clearTimeout(){}
});
vm.runInContext(['app.js','institutions.js','savings.js','views.js'].map(f=>fs.readFileSync(root+f,'utf8')).join('\n'),context);
const run=s=>vm.runInContext(s,context);
assert.equal(run("addTermDate('2026-01-31',1,'months')"),'2026-02-28');
assert.equal(run("addTermDate('2024-02-29',1,'years')"),'2025-02-28');
assert.equal(run("addTermDate('2026-12-31',1,'days')"),'2027-01-01');
assert.equal(run("addTermDate('',12,'months')"),'');
assert.equal(run("hasSavingMaturity({type:'Arbitrage Fund',maturity:'2026-11-20'})"),false);
assert.equal(run("hasSavingMaturity({type:'RD'})"),true);
run("DB={people:[{id:'p',name:'Test'}],savings:[],savingsTypes:['FD','Recurring Deposit','Arbitrage Fund'],expenses:[],budgets:[]};save=()=>{};closeModal=()=>{};render=()=>{};");
elements.set('savingFields',el());elements.set('savingError',el());
for(const [type,expected,absent] of [
  ['FD','Deposit principal','Fund / scheme'],['Recurring Deposit','Monthly deposit','Fund / scheme'],['Arbitrage Fund','Fund / scheme','Maturity date'],['Gold','Weight (grams','Maturity date']
]){
  run(`savingsDraft={type:${JSON.stringify(type)},owner:'Test',bank:'',amount:'',status:'Running'};renderSavingFields()`);
  const html=elements.get('savingFields').innerHTML;assert(html.includes(expected));assert(!html.includes(absent));
}
// Save a fixed deposit with its selected institution and locked rate.
run("savingsDraft={type:'FD',owner:'Test',bank:'Axis Bank',institutionId:'axis',amount:1000,interestRate:7.25,startDate:'2026-01-01',maturity:'2027-01-01',maturityMode:'date',status:'Running'};saveSaving('')");
assert.equal(run('DB.savings[0].interestRate'),7.25);assert.equal(run('DB.savings[0].institutionId'),'axis');
run("savingsDraft={type:'Recurring Deposit',owner:'Test',bank:'HDFC Bank',rdMonthly:2000,startDate:'2026-01-31',interestRate:7,maturityMode:'tenure',termCount:1,termUnit:'months',status:'Running'};saveSaving('')");
assert.equal(run('DB.savings[1].maturity'),'2026-02-28');assert.equal(run('DB.savings[1].rdMonthly'),2000);
run("savingsDraft={type:'Arbitrage Fund',owner:'Test',bank:'Zerodha',institutionId:'zerodha',amount:5000,schemeName:'Test Arbitrage Direct Growth',maturity:'2028-01-01',status:'Running'};saveSaving('')");
assert.equal(run('DB.savings[2].maturity'),'');assert.equal(run('DB.savings[2].bank'),'Zerodha');
assert.equal(run('DB.savings[2].schemeName'),'Test Arbitrage Direct Growth');
run("savingsDraft={type:'FD',owner:'Test',bank:'Axis Bank',amount:1000,interestRate:-5,startDate:'2026-01-01',maturity:'2027-01-01'};saveSaving('')");
assert.equal(run('DB.savings.length'),3);assert.match(elements.get('savingError').textContent,/Interest rate/);
console.log('PASS: distinct fields, institution selection, FD rate, RD term, fund maturity exclusion, validation and month-end dates');

// Exercise automatic refresh and Force sync against a mocked RPC only.
elements.clear();run("DB={people:[],budgets:[],expenses:[],savings:[],rev:1};lastSerialized=JSON.stringify(DB);sync={enabled:true,id:'test',pin:'0000',status:'idle',lastPulledAt:'2026-11-09T09:00:00Z'};let calls=[];rpc=async(fn,body)=>{calls.push(fn);return [{data:DB,rev:1}];};");
await run('syncIfDue()');assert.equal(run('calls.length'),0);
run('startPull()');assert.equal(timers.at(-1).delay,11*60*60*1000);
await run('syncNow()');assert.equal(run("calls.join(',')"),'household_get');assert.equal(Date.parse(run('sync.lastSyncedAt')),Date.parse(now));
run("calls=[];sync.lastPulledAt='2026-11-08T21:59:00Z'");await run('syncIfDue()');assert.equal(run('calls.length'),1);
run("calls=[];sync.pendingPush=true;rpc=async(fn)=>{calls.push(fn);return fn==='household_put'?1:[{data:DB,rev:1}];};");
await run('syncNow()');assert.equal(run("calls.join(',')"),'household_put,household_get');assert.equal(run('sync.pendingPush'),false);
const before=run('sync.lastSyncedAt');run("sync.lastPulledAt=null;rpc=async()=>{throw new Error('offline');};");await run('syncIfDue()');assert.equal(run('sync.status'),'error');assert.equal(run('sync.lastSyncedAt'),before);
run("sync.pendingPush=true;persistSync();sync={enabled:false};loadSync()");assert.equal(run('sync.pendingPush'),true);
console.log('PASS: 12-hour due check, precise scheduling, Force sync reads clean data, pending edit upload, failure timestamp and pending persistence');
// A stale device must retain its pending edits if the server rejects its revision.
run("sync={enabled:true,id:'test',pin:'0000',status:'idle',pendingPush:true,lastSyncedAt:'2026-11-08T10:00:00Z'};rpc=async()=>20;");
await run('syncNow()');assert.equal(run('sync.pendingPush'),true);assert.equal(run('sync.status'),'error');assert.equal(run('sync.lastSyncedAt'),'2026-11-08T10:00:00Z');
assert.equal(run('DB.rev'),1);
console.log('PASS: rejected stale writes keep local edits and do not claim a successful sync');
const worker=fs.readFileSync(root+'sw.js','utf8');
for(const path of [...worker.matchAll(/'\.\/([^']+)'/g)].map(x=>x[1]))assert(fs.existsSync(root+path),'Missing offline asset: '+path);
console.log('PASS: all offline shell assets and downloaded logos exist locally');
// Review regressions: extreme terms must validate, and late sync responses cannot restore a disconnected household.
assert.equal(run("addTermDate('2026-01-01',1000000000,'years')"),'');
run("DB={people:[],budgets:[],expenses:[],savings:[],rev:1};sync={enabled:true,id:'old-household',pin:'0000',status:'idle'};let finishRead;rpc=()=>new Promise(resolve=>{finishRead=resolve});");
const disconnectedRead=run('syncPull(true)');
run("sync={enabled:false,id:null,pin:null,status:'off'};finishRead([{data:{people:[],budgets:[],expenses:[],savings:[],rev:2},rev:2}])");
await disconnectedRead;assert.equal(run('DB.rev'),1);assert.equal(run('sync.status'),'off');
console.log('PASS: extreme tenure validation and disconnected-household response isolation');
assert.equal(run("addTermDate('2026-02-31',1,'months')"),'');
assert.equal(run("addTermDate('2026-01-01',1,'invalid-unit')"),'');
run("sync={enabled:true,id:'old-household',pin:'0000',status:'idle',pendingPush:true};let finishWrite;rpc=()=>new Promise(resolve=>{finishWrite=resolve});");
const disconnectedWrite=run('syncNow()');
run("sync={enabled:false,id:null,pin:null,status:'off'};finishWrite(1)");
await disconnectedWrite;assert.equal(run('sync.status'),'off');assert.equal(run('sync.lastSyncedAt'),undefined);
elements.set('savingError',el());
run("DB.savings=[{id:'legacy',type:'Other deposit',owner:'Test',bank:'Legacy provider',amount:1000,maturity:'2029-01-01',tenure:'36 months',interestRate:6,customNote:'keep me'}];savingsDraft={...DB.savings[0]};saveSaving('legacy')");
assert.equal(run('DB.savings[0].maturity'),'2029-01-01');assert.equal(run('DB.savings[0].tenure'),'36 months');assert.equal(run('DB.savings[0].interestRate'),6);assert.equal(run('DB.savings[0].customNote'),'keep me');
assert.equal(run('hasSavingMaturity(DB.savings[0])'),true);
assert.equal(run("rdCurrentValue({type:'RD',rdMonthly:100,rdStart:'2026-09-01'})"),300);
console.log('PASS: disconnected upload isolation, invalid dates, RD alias valuation and legacy custom holding preservation');
