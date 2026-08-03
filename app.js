
/* ============ storage ============ */
const KEY='family-finance-v1';
let hideMoney=(localStorage.getItem('hideMoney')==='1');
const fmt=(n)=>hideMoney?'₹•••••':'₹'+Math.round(Number(n||0)).toLocaleString('en-IN');
function toggleHide(){hideMoney=!hideMoney;localStorage.setItem('hideMoney',hideMoney?'1':'0');render();}
const uid=()=>Math.random().toString(36).slice(2,10);

/* ---- IST-locked time. The app's "now" is always Asia/Kolkata regardless of device tz. ---- */
function istNow(){
  // Convert current instant to IST wall-clock by formatting in that timezone.
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const g=t=>p.find(x=>x.type===t).value;
  return {y:+g('year'),m:+g('month'),d:+g('day')};
}
const thisMonth=()=>{const n=istNow();return n.y+'-'+String(n.m).padStart(2,'0');};
const istToday=()=>{const n=istNow();return n.y+'-'+String(n.m).padStart(2,'0')+'-'+String(n.d).padStart(2,'0');};

let viewMonth=thisMonth();
const curMonth=()=>viewMonth;
function shiftMonth(m,delta){let [y,mo]=m.split('-').map(Number);mo+=delta;if(mo<1){mo=12;y--;}if(mo>12){mo=1;y++;}return y+'-'+String(mo).padStart(2,'0');}
function monthLabel(m){const [y,mo]=m.split('-').map(Number);return new Date(y,mo-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'});}
// Check if today (IST) is the last working day (Mon-Fri) of the current month.
// On that day, the next month unlocks as a draft — you can start setting it up.
function isLastWorkingDay(){
  const n=istNow();
  const last=new Date(n.y,n.m,0); // last day of current month (n.m is 1-indexed)
  const dow=last.getDay();let d=last.getDate();
  if(dow===0)d-=2;else if(dow===6)d-=1; // Sunday→Fri, Saturday→Fri
  return n.d===d;
}
// A month is in the future (relative to real IST current month) if it sorts after it.
// Exception: on the last working day, the immediate next month is draftable.
function isFutureMonth(m){
  if(m<=thisMonth())return false;
  if(m===shiftMonth(thisMonth(),1)&&isLastWorkingDay())return false;
  return true;
}
function changeMonth(delta){
  const target=shiftMonth(viewMonth,delta);
  if(isFutureMonth(target)){alert("That month hasn't started yet. Come back on the 1st (or the last working day for a draft).");return;}
  // Auto-carry-forward when navigating to an empty draft month from a populated source
  if(target>viewMonth&&!DB.budgets.some(b=>b.month===target)&&!DB.expenses.some(e=>e.month===target)){
    carryForward(viewMonth,target);
  }
  viewMonth=target;render();
}
function monthBar(){
  const nextIsFuture=isFutureMonth(shiftMonth(viewMonth,1));
  return `<div class="row" style="margin:0 0 14px;background:var(--card2);border-radius:12px;padding:6px">
    <button class="btn sm ghost" style="width:auto" onclick="changeMonth(-1)">‹</button>
    <span class="b" style="font-size:15px">${monthLabel(viewMonth)}${viewMonth===thisMonth()?'':''}</span>
    <button class="btn sm ghost" style="width:auto${nextIsFuture?';opacity:.35':''}" ${nextIsFuture?'disabled':''} onclick="changeMonth(1)">›</button>
  </div>`;
}

/* ---- Reset month: blank or carry forward from previous. ---- */
function resetMonth(){
  const m=curMonth(),prev=shiftMonth(m,-1);
  if(!confirm(`Reset ${monthLabel(m)}?\n\nAll budgets and expenses for this month will be removed.`))return;
  const choice=confirm('Cancel = blank reset. OK = carry forward from previous month.');
  DB.budgets=DB.budgets.filter(b=>b.month!==m);
  DB.expenses=DB.expenses.filter(e=>e.month!==m);
  if(choice)carryForward(prev,m);
  save();render();
}
/* ---- Carry forward: copy budgets & expenses from one month to another. ---- */
function carryForward(from,to){
  const existingEx=DB.expenses.filter(e=>e.month===to);
  const existingBd=DB.budgets.filter(b=>b.month===to);
  let n=0;
  DB.expenses.filter(e=>e.month===from).forEach(e=>{
    if(existingEx.some(x=>x.name===e.name&&x.paidBy===e.paidBy))return;
    DB.expenses.push({...e,id:uid(),month:to,paid:false,paidDate:null});n++;
  });
  DB.budgets.filter(b=>b.month===from).forEach(b=>{
    if(existingBd.some(x=>x.person===b.person))return;
    DB.budgets.push({...b,id:uid(),month:to,fixedItems:(b.fixedItems||[]).map(i=>({...i}))});n++;
  });
  if(n)save();
}
/* ---- Start next month: draft from last working day, or from the 1st. ---- */
function startNewMonth(){
  const from=viewMonth, to=shiftMonth(viewMonth,1);
  if(isFutureMonth(to)){alert(`${monthLabel(to)} isn't available yet. It opens on the 1st (or the last working day for a draft).`);return;}
  const before=DB.budgets.filter(b=>b.month===to).length+DB.expenses.filter(e=>e.month===to).length;
  carryForward(from,to);
  viewMonth=to;render();
  const after=DB.budgets.filter(b=>b.month===to).length+DB.expenses.filter(e=>e.month===to).length;
  alert(after>before?`Started ${monthLabel(to)} — copied ${after-before} item(s) forward.`
             :`${monthLabel(to)} already set up.`);
}

/* ============ seed ============ */
const SUB_TYPES=['Investment','Insurance','Expense','Savings']; // subcategory tags
const SUB_TAGCLASS={Investment:'t-invest',Insurance:'t-insure',Expense:'t-expense',Savings:'t-savings'};

function seed(){
  return {
    savingsTypes:['FD','Arbitrage Fund','Liquid Fund','Mutual Fund','Recurring Deposit','Gold'],
    people:[], budgets:[], expenses:[], savings:[]
  };
}

let DB;
function migrate(){
  // Bring older data blobs up to the new model without losing anything.
  if(!DB.savingsTypes)DB.savingsTypes=['FD','Arbitrage Fund','Liquid Fund','Mutual Fund','Recurring Deposit','Gold'];
  if(!DB.savings&&DB.fds){DB.savings=DB.fds.map(f=>({...f,type:f.type||'FD'}));delete DB.fds;}
  if(!DB.savings)DB.savings=[];
  (DB.people||[]).forEach((p,i)=>{if(p.commonPct==null){p.commonPct=50;p.personalPct=50;}if(!p.id)p.id='p_'+uid();});
  // convert legacy budgets to salary model; ensure each fixedItem has a stable key
  (DB.budgets||[]).forEach(b=>{
    if(b.salary==null){
      const fixed=(b.fixedItems||[]).reduce((s,i)=>s+(i.a||0),0);
      b.salary=(b.common||0)+fixed+(b.personal||0)+(b.prepayment||0)+(b.buffer||0);
      delete b.common;delete b.fixed;delete b.personal;delete b.prepayment;delete b.buffer;
    }
    b.fixedItems=(b.fixedItems||[]).map(i=>({k:i.k||uid(),n:i.n,a:i.a,t:i.t||'Expense'}));
  });
  (DB.expenses||[]).forEach(e=>{
    if(!e.account)e.account='Common';
    if(!e.kind)e.kind='fixed';               // legacy expenses were all tickable/fixed
    if(e.kind==='fixed'&&e.linkSub===undefined)e.linkSub=null;
    if(e.kind==='extra'){e.account='Common';if(!e.date)e.date=(e.month||thisMonth())+'-01';}
  });
}
const BACKUP_KEY='family-finance-lastgood';
let lastSerialized='';        // used for sync dirty-check
function load(){
  try{const raw=localStorage.getItem(KEY);DB=raw?JSON.parse(raw):seed();}
  catch(e){
    // corrupt data — try last-known-good before falling back to seed
    try{const bg=localStorage.getItem(BACKUP_KEY);DB=bg?JSON.parse(bg):seed();}catch(e2){DB=seed();}
  }
  migrate();
  if(!DB.rev)DB.rev=1;
  lastSerialized=JSON.stringify(DB);
  localStorage.setItem(BACKUP_KEY,lastSerialized); // snapshot known-good on load
}
function save(){
  DB.rev=(DB.rev||0)+1;
  DB.updatedAt=nowISO();
  migrate();
  const s=JSON.stringify(DB);
  localStorage.setItem(BACKUP_KEY,localStorage.getItem(KEY)||s); // previous good state kept as backup
  localStorage.setItem(KEY,s);
  if(s.length>200000)console.warn('[household] data blob is '+Math.round(s.length/1024)+'KB — consider archiving old months.');
  syncPush();
}

/* ============ split math ============ */
function splitFor(b){
  const p=(DB.people.find(x=>x.name===b.person))||{commonPct:50,personalPct:50};
  const fixed=(b.fixedItems||[]).reduce((s,i)=>s+(i.a||0),0);
  const remainder=Math.max(0,(b.salary||0)-fixed);
  const commonPct=p.commonPct??50, personalPct=p.personalPct??(100-commonPct);
  const commonSave=remainder*commonPct/100;
  const personalSave=remainder*personalPct/100;
  // tag totals from fixed subcategories
  let invest=0,insure=0,fixExp=0,fixSave=0;
  (b.fixedItems||[]).forEach(i=>{
    if(i.t==='Investment')invest+=i.a; else if(i.t==='Insurance')insure+=i.a;
    else if(i.t==='Savings')fixSave+=i.a; else fixExp+=i.a;
  });
  return {fixed,remainder,commonPct,personalPct,commonSave,personalSave,invest,insure,fixExp,fixSave,salary:b.salary||0};
}
// Extra (unplanned, common) spend for a month — a joint concept, dips into common savings.
function extraCommon(month){return DB.expenses.filter(e=>e.month===month&&e.kind==='extra').reduce((s,e)=>s+(e.amount||0),0);}

// Per-person analytics from the DECLARED plan only (fixed expenses are already in the split,
// so ticking doesn't add new money). Extra common spend is handled at month level.
function analyticsFor(b){
  const s=splitFor(b);
  const salary=s.salary||0;
  return {salary,
    invested:s.invest,                                  // investment-tagged fixed
    saved:s.commonSave+s.personalSave+s.fixSave,        // split savings + savings-tagged fixed
    commonSave:s.commonSave, personalSave:s.personalSave,
    expense:s.fixExp+s.insure,                          // expense+insurance tagged fixed
    saveRate:salary?(s.commonSave+s.personalSave+s.fixSave)/salary:0,
    investRate:salary?s.invest/salary:0,
    expRate:salary?(s.fixExp+s.insure)/salary:0};
}
function analyticsMonth(month){
  const bs=DB.budgets.filter(b=>b.month===month);
  const agg={salary:0,invested:0,declaredSaved:0,commonSave:0,expense:0};
  bs.forEach(b=>{const a=analyticsFor(b);agg.salary+=a.salary;agg.invested+=a.invested;
    agg.declaredSaved+=a.saved;agg.commonSave+=a.commonSave;agg.expense+=a.expense;});
  const extra=extraCommon(month);                       // unplanned common spend
  agg.extra=extra;
  agg.effectiveCommon=agg.commonSave-extra;             // common savings after dipping for extras
  agg.saved=agg.declaredSaved-extra;                    // effective total savings
  agg.expense=agg.expense+extra;                        // total money spent incl. unplanned
  agg.saveRate=agg.salary?agg.saved/agg.salary:0;
  agg.investRate=agg.salary?agg.invested/agg.salary:0;
  agg.expRate=agg.salary?agg.expense/agg.salary:0;
  return agg;
}

/* ============ two-phone sync (Supabase, opt-in, PIN-protected) ============ */
const SYNC_KEY='family-finance-sync';
const SB_URL='https://eqhflowsnjzewfvlwkto.supabase.co';
const SB_KEY='sb_publishable_FdhMtetQeLUGzbNlyw4qIw_lBMcFYbh';
let sync={enabled:false,id:null,pin:null,status:'off'};
let pushTimer=null, pullTimer=null;
function nowISO(){return new Date().toISOString();}
async function rpc(fn,body){
  const r=await fetch(SB_URL+'/rest/v1/rpc/'+fn,{method:'POST',cache:'no-store',
    headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok)throw new Error('rpc '+fn+' '+r.status);
  const t=await r.text();return t?JSON.parse(t):null;
}
function loadSync(){try{const s=JSON.parse(localStorage.getItem(SYNC_KEY));if(s&&s.id&&s.pin){sync={enabled:true,id:s.id,pin:s.pin,status:'idle'};}}catch(e){}}
function persistSync(){localStorage.setItem(SYNC_KEY,JSON.stringify({id:sync.id,pin:sync.pin}));}
async function createHousehold(pin){
  pin=(pin||'').trim();if(pin.length<4){alert('Choose a PIN of at least 4 digits.');return;}
  sync.status='pushing';renderIfSync();
  try{const id=await rpc('household_create',{p_pin:pin,p_data:DB});if(!id||typeof id!=='string')throw 0;
    sync={enabled:true,id:id,pin:pin,status:'idle'};persistSync();startPull();renderIfSync();}
  catch(e){sync.status='error';renderIfSync();alert('Could not create household. Check connection and try again.');}
}
async function joinHousehold(id,pin){
  id=(id||'').trim();pin=(pin||'').trim();if(!id||!pin){alert('Enter both the household code and PIN.');return;}
  sync.status='pulling';renderIfSync();
  try{const rows=await rpc('household_get',{p_id:id,p_pin:pin});if(!rows||!rows.length)throw 0;
    const remote=rows[0].data;if(!remote||typeof remote!=='object')throw 0;
    DB=remote;migrate();if(!DB.rev)DB.rev=rows[0].rev||1;localStorage.setItem(KEY,JSON.stringify(DB));
    sync={enabled:true,id:id,pin:pin,status:'idle'};persistSync();startPull();render();}
  catch(e){sync.status='error';renderIfSync();alert('Could not join. Double-check the household code and PIN.');}
}
function disableSync(){clearInterval(pullTimer);sync={enabled:false,id:null,pin:null,status:'off'};localStorage.removeItem(SYNC_KEY);render();}
function syncPush(){
  if(!sync.enabled||!sync.id)return;clearTimeout(pushTimer);
  pushTimer=setTimeout(async()=>{
    const s=JSON.stringify(DB);
    if(s===lastSerialized){sync.status='idle';renderIfSync();return;} // nothing changed — skip network
    sync.status='pushing';renderIfSync();
    try{await rpc('household_put',{p_id:sync.id,p_pin:sync.pin,p_data:DB,p_rev:DB.rev||1});lastSerialized=s;sync.status='idle';}
    catch(e){sync.status='error';}renderIfSync();},800);
}
async function syncNow(){
  if(!sync.enabled||!sync.id){go('sync');return;}
  clearTimeout(pushTimer);sync.status='pushing';renderIfSync();
  try{await rpc('household_put',{p_id:sync.id,p_pin:sync.pin,p_data:DB,p_rev:DB.rev||1});lastSerialized=JSON.stringify(DB);}
  catch(e){sync.status='error';renderIfSync();return;}
  await syncPull(false);
}
async function syncPull(silent){
  if(!sync.enabled||!sync.id)return;if(!silent){sync.status='pulling';renderIfSync();}
  try{const rows=await rpc('household_get',{p_id:sync.id,p_pin:sync.pin});const row=rows&&rows[0];
    if(row&&row.data&&typeof row.data==='object'&&(row.rev||0)>(DB.rev||0)){
      DB=row.data;migrate();lastSerialized=JSON.stringify(DB);localStorage.setItem(KEY,lastSerialized);
      if(!silent||tab!=='sync')render();else renderIfSync();}
    if(sync.status!=='pushing')sync.status='idle';}
  catch(e){sync.status='error';}renderIfSync();
}
function startPull(){clearInterval(pullTimer);pullTimer=setInterval(()=>syncPull(true),5000);}
function renderIfSync(){if(tab==='sync')render();updateSyncBadge();}
function updateSyncBadge(){
  const ic=document.getElementById('syncIc');if(!ic)return;
  const dot=sync.enabled?(sync.status==='error'?'#ff6b7d':(sync.status==='pushing'||sync.status==='pulling'?'#ffc44d':'#3ddc97')):null;
  ic.querySelector('.sync-dot')?.remove();
  if(dot){const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('class','sync-dot');s.setAttribute('viewBox','0 0 10 10');
    s.style.cssText='position:absolute;width:8px;height:8px;transform:translate(11px,-9px);';
    const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx','5');c.setAttribute('cy','5');c.setAttribute('r','5');c.setAttribute('fill',dot);
    s.appendChild(c);ic.style.position='relative';ic.appendChild(s);}
}

/* ============ router ============ */
let tab='home';
function go(t){tab=t;render();}
document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>go(b.dataset.tab));

/* ============ helpers ============ */
function daysTo(dateStr){if(!dateStr)return null;const t=istToday();const now=new Date(t+'T00:00:00');const d=new Date(dateStr+'T00:00:00');return Math.round((d-now)/86400000);}
function fmtDate(s){if(!s)return '—';const d=new Date(s+'T00:00:00');return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function pct(x){return Math.round(x*100)+'%';}
// Build HTML strings without nested backtick hell. Pass attrs=null or {}, children as rest args.
function h(tag,attrs,...kids){const a=attrs?Object.entries(attrs).filter(([,v])=>v!==null&&v!==false&&v!==undefined).map(([k,v])=>v===true?k:k+'="'+esc(String(v))+'"').join(' '):'';return `<${tag}${a?' '+a:''}>${kids.flat().filter(x=>x!=null).join('')}</${tag}>`;}
// Render an expense row (used in expenses, home, and grouped views)
function expenseRow(e,opts={}){
  const link=e.linkSub?subByKey(e.linkSub):null;
  const tick=opts.showTick!==false?h('button',{class:'tick '+(e.paid?'on':''),onclick:"togglePaid('"+e.id+"')"},e.paid?'✓':''):'';
  const name=h('div',{class:'nm b'},esc(e.name));
  const meta=[esc(e.category)];
  if(opts.showDueDay!==false)meta.push('Due '+e.dueDay);
  if(opts.showPaidBy)meta.push(av(e.paidBy),esc(e.paidBy));
  if(link)meta.push(h('span',{class:'link'},'🔗 '+esc(link.it.n)));
  const info=h('div',{class:'muted xs'},meta.join(' · '));
  const body=opts.onClick?h('div',{style:'flex:1',onclick:opts.onClick},name,info):h('div',{style:'flex:1'},name,info);
  return h('div',{class:'exp'+(e.paid?' paid':'')},tick,body,h('span',{class:'amt'},fmt(e.amount)));
}
// Tiny inline line-icons (stroke inherits currentColor). Keeps the app dependency-free.
const ICONS={
  wallet:'<path d="M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11"/><circle cx="16" cy="13" r="1.3"/>',
  save:'<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  invest:'<path d="M4 15l4.5-4.5 3.5 3L20 6"/><path d="M15 6h5v5"/>',
  expense:'<path d="M6 6l12 12"/><path d="M18 10v8h-8"/>',
  insure:'<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>',
  person:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  edit:'<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 6.5l3 3"/>',
  chevD:'<path d="M6 9l6 6 6-6"/>', chevU:'<path d="M6 15l6-6 6 6"/>',
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/>',
  cal:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
  phone:'<path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'
};
function icon(name,color,sz){return `<svg viewBox="0 0 24 24" style="width:${sz||15}px;height:${sz||15}px;fill:none;stroke:${color||'currentColor'};stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto;vertical-align:-2px">${ICONS[name]||''}</svg>`;}
const TAGICON={Investment:'invest',Insurance:'insure',Expense:'expense',Savings:'save'};
const TAGCOLOR={Investment:'var(--accent)',Insurance:'var(--amber)',Expense:'var(--red)',Savings:'var(--green)'};
function personBy(name){return DB.people.find(p=>p.name===name);}
function avatarOf(name){const p=personBy(name);return p?(p.name||'?')[0].toUpperCase():'?';}
function av(name){const p=personBy(name);const c=p?p.color:'#888';const initial=p?(p.name||'?')[0].toUpperCase():'?';return `<span class="ava" style="border-color:${c};background:${c}22;color:${c};font-weight:800;font-size:12px">${initial}</span>`;}
// Find a linked budget subcategory {person,item} by its key, in the current month.
// Calculate RD current value: monthly deposit × months elapsed since start
function rdCurrentValue(f){if(f.type!=='Recurring Deposit'||!f.rdMonthly||!f.rdStart)return null;const s=f.rdStart.split('-');if(s.length<3)return null;const start=new Date(+s[0],+s[1]-1,+s[2]);const now=new Date();const months=(now.getFullYear()-start.getFullYear())*12+(now.getMonth()-start.getMonth())+1;return months>0?f.rdMonthly*months:0;}
function subByKey(k){for(const b of DB.budgets.filter(x=>x.month===curMonth())){const it=(b.fixedItems||[]).find(i=>i.k===k);if(it)return{b,it};}return null;}
// All Expense-tagged fixed subcategories this month, for the link dropdown.
function expenseSubs(){const out=[];DB.budgets.filter(b=>b.month===curMonth()).forEach(b=>(b.fixedItems||[]).forEach(i=>{if(i.t==='Expense')out.push({k:i.k,label:`${b.person}: ${i.n} (${fmt(i.a)})`});}));return out;}
// Check if an expense is paid by someone outside the household (tracked, not counted in totals)
function isExternalExpense(e){return e.kind==='fixed'&&(e.account==='External'||!DB.people.some(p=>p.name===e.paidBy));}
/* ============ actions & modals ============ */
function togglePaid(id){
  const e=DB.expenses.find(x=>x.id===id);if(!e)return;
  e.paid=!e.paid;e.paidDate=e.paid?nowISO():null;save();
  // Targeted DOM update for the tapped row (avoids rebuilding the whole screen on every tick).
  const btn=document.querySelector(`.tick[onclick*="${id}"]`);
  const rowEl=btn&&btn.closest('.exp');
  if(!rowEl){render();return;} // row not on screen (e.g. filter changed) -> safe fallback
  btn.classList.toggle('on',e.paid);btn.textContent=e.paid?'✓':'';
  rowEl.classList.toggle('paid',e.paid);
  // refresh the "X of Y paid" summary + progress bar in place
  const scope=DB.expenses.filter(x=>x.month===curMonth()&&x.kind==='fixed'&&!isExternalExpense(x));
  const paid=scope.filter(x=>x.paid);
  const tot=scope.reduce((s,x)=>s+x.amount,0), pd=paid.reduce((s,x)=>s+x.amount,0);
  const bar=document.querySelector('.bar > i');if(bar)bar.style.width=(tot?Math.round(pd/tot*100):0)+'%';
  const cnt=document.querySelector('[data-paidcount]');if(cnt)cnt.textContent=tab==='home'?`${paid.length} of ${scope.length} paid`:`${paid.length}/${scope.length} paid`;
  const amt=document.querySelector('[data-paidamt]');if(amt)amt.textContent=`${fmt(pd)} / ${fmt(tot)}`;
}
function openModal(html){document.getElementById('sheet').innerHTML=html;document.getElementById('modal').classList.add('show');}
function closeModal(){document.getElementById('modal').classList.remove('show');}
function val(id){return document.getElementById(id).value;}
function peopleOptions(sel){return DB.people.map(p=>`<option ${p.name===sel?'selected':''}>${esc(p.name)}</option>`).join('');}
function delItem(coll,id){DB[coll]=DB[coll].filter(x=>x.id!==id);save();closeModal();render();}

// --- Fixed / planned expense (tickable, linkable to a Split Expense subcategory) ---
function openExpense(id){
  const e=id?DB.expenses.find(x=>x.id===id):{name:'',amount:'',category:'Home',dueDay:1,paidBy:DB.people[0]?.name||'',account:'Common',linkSub:null};
  const acc=['Common','Personal','External'].map(a=>`<option ${e.account===a?'selected':''}>${a}</option>`).join('');
  const subs=expenseSubs();
  const linkOpts=`<option value="">— none —</option>`+subs.map(s=>`<option value="${s.k}" ${e.linkSub===s.k?'selected':''}>${esc(s.label)}</option>`).join('');
  openModal(`<h3>${id?'Edit':'Add'} planned expense</h3>
    <label>Name</label><input id="f_name" value="${esc(e.name)}">
    <label>Amount (₹)</label><input id="f_amount" type="number" inputmode="numeric" value="${e.amount}">
    <label>Category</label><input id="f_cat" value="${esc(e.category)}">
    <label>Account</label><select id="f_acc">${acc}</select>
    <label>Due day of month</label><input id="f_due" type="number" inputmode="numeric" value="${e.dueDay}">
    <label>Paid by</label><select id="f_by">${peopleOptions(e.paidBy)}</select>
    <label>Link to Split subcategory (Expense-tagged)</label><select id="f_link">${linkOpts}</select>
    <p class="muted xs" style="margin-top:6px">Linking maps this bill to the fixed budget you declared in Split.</p>
    <div style="height:16px"></div><button class="btn" onclick="saveExpense('${id||''}')">Save</button>
    ${id?`<button class="del" onclick="delItem('expenses','${id}')">Delete</button>`:''}`);
}
function saveExpense(id){
  const o={kind:'fixed',name:val('f_name'),amount:+val('f_amount')||0,category:val('f_cat')||'Other',account:val('f_acc'),
    dueDay:+val('f_due')||1,paidBy:val('f_by'),linkSub:val('f_link')||null,month:curMonth()};
  if(id)Object.assign(DB.expenses.find(x=>x.id===id),o);else DB.expenses.push({id:uid(),paid:false,...o});
  save();closeModal();render();
}
// --- Extra / unplanned common transaction (no tick) ---
function openExtra(id){
  const e=id?DB.expenses.find(x=>x.id===id):{name:'',amount:'',date:istToday()};
  openModal(`<h3>${id?'Edit':'Add'} unplanned expense</h3>
    <p class="muted sm" style="margin:0 0 8px">Common spend — comes out of the joint Common Savings pool.</p>
    <label>What was it?</label><input id="f_name" value="${esc(e.name)}">
    <label>Amount (₹)</label><input id="f_amount" type="number" inputmode="numeric" value="${e.amount}">
    <label>Date</label><input id="f_date" type="date" value="${e.date||istToday()}">
    <div style="height:16px"></div><button class="btn" onclick="saveExtra('${id||''}')">Save</button>
    ${id?`<button class="del" onclick="delItem('expenses','${id}')">Delete</button>`:''}`);
}
function saveExtra(id){
  const date=val('f_date')||istToday();
  const o={kind:'extra',name:val('f_name'),amount:+val('f_amount')||0,date,account:'Common',month:date.slice(0,7)};
  if(id)Object.assign(DB.expenses.find(x=>x.id===id),o);else DB.expenses.push({id:uid(),...o});
  save();closeModal();render();
}

// --- Budget / salary split (with dynamic subcategories) ---
let editFixed=[]; // working copy of fixedItems while sheet is open
function openBudget(id){
  const b=id?DB.budgets.find(x=>x.id===id):{person:DB.people[0]?.name||'',salary:'',fixedItems:[]};
  editFixed=(b.fixedItems||[]).map(i=>({...i}));
  const p=DB.people.find(x=>x.name===b.person)||{commonPct:50,personalPct:50};
  openModal(`<h3>${id?'Edit':'Add'} salary split</h3>
    <label>Person</label><select id="f_per" onchange="onBudgetPerson()">${peopleOptions(b.person)}</select>
    <label>Monthly salary (₹)</label><input id="f_sal" type="number" inputmode="numeric" value="${b.salary}" oninput="renderSplitPreview()">
    <div class="row"><div style="flex:1"><label>Common savings %</label><input id="f_cpct" type="number" inputmode="numeric" value="${p.commonPct}" oninput="onPctChange()"></div>
      <div style="flex:1"><label>Personal savings %</label><input id="f_ppct" type="number" inputmode="numeric" value="${p.personalPct}" oninput="renderSplitPreview()"></div></div>
    <label>Fixed budget subcategories</label><div id="fixedList"></div>
    <button class="btn ghost sm" style="width:100%;margin-top:6px" onclick="addFixedRow()">+ Add subcategory</button>
    <div id="splitPreview" style="margin-top:14px"></div>
    <div style="height:14px"></div><button class="btn" onclick="saveBudget('${id||''}')">Save</button>
    ${id?`<button class="del" onclick="delItem('budgets','${id}')">Delete</button>`:''}`);
  renderFixedList();renderSplitPreview();
}
function onBudgetPerson(){const p=DB.people.find(x=>x.name===val('f_per'));if(p){document.getElementById('f_cpct').value=p.commonPct;document.getElementById('f_ppct').value=p.personalPct;}renderSplitPreview();}
function onPctChange(){const c=+val('f_cpct')||0;document.getElementById('f_ppct').value=Math.max(0,100-c);renderSplitPreview();}
function typeOptions(sel){return SUB_TYPES.map(t=>`<option ${t===sel?'selected':''}>${t}</option>`).join('');}
function renderFixedList(){
  const el=document.getElementById('fixedList');if(!el)return;
  el.innerHTML=editFixed.map((i,ix)=>`<div class="subrow">
    <input placeholder="Name" value="${esc(i.n)}" oninput="editFixed[${ix}].n=this.value">
    <input placeholder="₹" type="number" inputmode="numeric" value="${i.a}" oninput="editFixed[${ix}].a=+this.value||0;renderSplitPreview()">
    <select onchange="editFixed[${ix}].t=this.value;renderSplitPreview()">${typeOptions(i.t)}</select>
    <button class="x" onclick="removeFixedRow(${ix})">×</button></div>`).join('');
}
function addFixedRow(){editFixed.push({k:uid(),n:'',a:0,t:'Expense'});renderFixedList();renderSplitPreview();}
function removeFixedRow(ix){editFixed.splice(ix,1);renderFixedList();renderSplitPreview();}
function renderSplitPreview(){
  const el=document.getElementById('splitPreview');if(!el)return;
  const sal=+val('f_sal')||0, c=+val('f_cpct')||0, pp=+val('f_ppct')||0;
  const fixed=editFixed.reduce((s,i)=>s+(+i.a||0),0);const rem=Math.max(0,sal-fixed);
  el.innerHTML=`<div class="flow">
    <div class="step"><span class="sm">Fixed budget</span><span class="amt sm">${fmt(fixed)}</span></div>
    <div class="arrow">↓ remainder ${fmt(rem)} split ${c}:${pp}</div>
    <div class="step"><span class="sm">Common savings</span><span class="amt sm">${fmt(rem*c/100)}</span></div>
    <div class="step"><span class="sm">Personal savings</span><span class="amt sm">${fmt(rem*pp/100)}</span></div></div>`;
}
function saveBudget(id){
  const person=val('f_per'),salary=+val('f_sal')||0,c=+val('f_cpct')||0,pp=+val('f_ppct')||0;
  // persist the ratio onto the person so it's the default next time
  const pers=DB.people.find(x=>x.name===person);if(pers){pers.commonPct=c;pers.personalPct=pp;}
  const clean=editFixed.filter(i=>i.n||i.a).map(i=>({k:i.k||uid(),n:i.n||'—',a:+i.a||0,t:i.t||'Expense'}));
  const o={person,salary,fixedItems:clean,month:curMonth()};
  if(id)Object.assign(DB.budgets.find(x=>x.id===id),o);else DB.budgets.push({id:uid(),...o});
  save();closeModal();render();
}

// --- Savings holding ---
function openSaving(id){
  const f=id?DB.savings.find(x=>x.id===id):{owner:DB.people[0]?.name||'',type:DB.savingsTypes[0],bank:'',amount:'',maturity:'',tenure:'',source:'Bank',status:'Running',phone:'',nominee:'',rdMonthly:0,rdStart:''};
  const types=DB.savingsTypes.map(t=>`<option ${t===f.type?'selected':''}>${esc(t)}</option>`).join('');
  const isRD=f.type==='Recurring Deposit';
  const isFund=f.type==='Arbitrage Fund'||f.type==='Liquid Fund';
  openModal(`<h3>${id?'Edit':'Add'} savings</h3>
    <label>Type</label><select id="f_type" onchange="onSavingTypeChange()">${types}</select>
    <label>Owner (actor)</label><select id="f_owner">${DB.people.map(p=>`<option ${p.name===f.owner?'selected':''}>${esc(p.name)}</option>`).join('')}${DB.people.some(p=>p.name===f.owner)?'':`<option selected>${esc(f.owner)}</option>`}</select>
    <label id="f_bank_label">${isFund?'Broker':'Bank / Provider'}</label><input id="f_bank" value="${esc(f.bank)}">
    <label>Amount (₹)</label><input id="f_amount" type="number" inputmode="numeric" value="${f.amount}">
    <div id="rd_fields" style="${isRD?'':'display:none'}">
      <label>Monthly deposit (₹)</label><input id="f_rd_monthly" type="number" inputmode="numeric" value="${f.rdMonthly||''}">
      <label>Start date</label><input id="f_rd_start" type="date" value="${f.rdStart||''}">
    </div>
    <label>Maturity input</label><select id="f_mat_mode" onchange="onMatModeChange()"><option value="date">Enter date</option><option value="days">Enter days from now</option></select>
    <div id="f_mat_date_wrap"><label>Maturity date</label><input id="f_mat" type="date" value="${f.maturity}"></div>
    <div id="f_mat_days_wrap" style="display:none"><label>Tenure in days</label><input id="f_mat_days" type="number" inputmode="numeric" placeholder="e.g. 666"></div>
    <label>Tenure (display)</label><input id="f_ten" value="${esc(f.tenure)}" placeholder="1Y 6M">
    <label>Source</label><input id="f_src" value="${esc(f.source)}">
    <label>Status</label><select id="f_st"><option ${f.status==='Running'?'selected':''}>Running</option><option ${f.status==='Matured'?'selected':''}>Matured</option></select>
    <label>Phone</label><input id="f_ph" type="tel" value="${esc(f.phone)}">
    <label>Nominee</label><input id="f_nom" value="${esc(f.nominee)}">
    <div style="height:16px"></div><button class="btn" onclick="saveSaving('${id||''}')">Save</button>
    ${id?`<button class="del" onclick="delItem('savings','${id}')">Delete</button>`:''}`);
}
function onSavingTypeChange(){
  const type=val('f_type');
  document.getElementById('f_bank_label').textContent=(type==='Arbitrage Fund'||type==='Liquid Fund')?'Broker':'Bank / Provider';
  document.getElementById('rd_fields').style.display=type==='Recurring Deposit'?'block':'none';
}
function onMatModeChange(){
  const mode=val('f_mat_mode');
  document.getElementById('f_mat_date_wrap').style.display=mode==='date'?'block':'none';
  document.getElementById('f_mat_days_wrap').style.display=mode==='days'?'block':'none';
}
function saveSaving(id){
  let maturity=val('f_mat'),tenure=val('f_ten')||'-';
  if(val('f_mat_mode')==='days'){
    const days=+val('f_mat_days')||0;
    if(days>0){const d=new Date();d.setDate(d.getDate()+days);maturity=d.toISOString().slice(0,10);tenure=days+' days';}
  }
  const o={type:val('f_type'),owner:val('f_owner'),bank:val('f_bank'),amount:+val('f_amount')||0,maturity,tenure,
    source:val('f_src'),status:val('f_st'),phone:val('f_ph'),nominee:val('f_nom'),
    rdMonthly:val('f_rd_monthly')?+val('f_rd_monthly')||0:0,rdStart:val('f_rd_start')||''};
  if(id)Object.assign(DB.savings.find(x=>x.id===id),o);else DB.savings.push({id:uid(),...o});
  save();closeModal();render();
}
// --- Manage savings types ---
function openTypes(){
  openModal(`<h3>Savings types</h3><p class="muted sm">Used in the Type dropdown when adding a holding.</p>
    <div id="typeList"></div><button class="btn ghost sm" style="width:100%;margin-top:8px" onclick="addType()">+ Add type</button>
    <div style="height:14px"></div><button class="btn" onclick="saveTypes()">Done</button>`);
  renderTypeList();
}
function renderTypeList(){const el=document.getElementById('typeList');if(!el)return;
  el.innerHTML=DB.savingsTypes.map((t,ix)=>`<div class="subrow"><input value="${esc(t)}" oninput="DB.savingsTypes[${ix}]=this.value">
    <button class="x" onclick="DB.savingsTypes.splice(${ix},1);renderTypeList()">×</button></div>`).join('');}
function addType(){DB.savingsTypes.push('New type');renderTypeList();}
function saveTypes(){DB.savingsTypes=DB.savingsTypes.map(t=>(t||'').trim()).filter(Boolean);if(!DB.savingsTypes.length)DB.savingsTypes=['FD'];save();closeModal();render();}

function onFab(){
  if(tab==='expenses'){expTab==='extra'?openExtra():openExpense();}
  else if(tab==='split')openBudget();
  else if(tab==='savings')openSaving();
  else openExpense();
}

/* ============ profiles / actors ============ */
function openProfile(id){
  const p=id?DB.people.find(x=>x.id===id):{id:'',name:'',color:'#5b8cff',commonPct:50,personalPct:50};
  const colors=['#5b8cff','#a78bfa','#3ddc97','#fb923c','#f472b6','#ffc44d','#ff6b7d'];
  openModal(`<h3>${id?'Edit':'Add'} actor</h3>
    <label>Name</label><input id="p_name" value="${esc(p.name)}">
    <label>Colour</label><div style="display:flex;gap:8px">${colors.map(c=>`<button onclick="document.getElementById('p_color').value='${c}'" style="width:32px;height:32px;border-radius:9px;background:${c};border:2px solid ${c===p.color?'#fff':'transparent'}"></button>`).join('')}</div>
    <input type="hidden" id="p_color" value="${p.color}">
    <div class="row"><div style="flex:1"><label>Common savings %</label><input id="p_cpct" type="number" inputmode="numeric" value="${p.commonPct}" oninput="document.getElementById('p_ppct').value=Math.max(0,100-(+this.value||0))"></div>
      <div style="flex:1"><label>Personal savings %</label><input id="p_ppct" type="number" inputmode="numeric" value="${p.personalPct}"></div></div>
    <div style="height:16px"></div><button class="btn" onclick="saveProfile('${id||''}')">Save</button>
    ${id?`<button class="del" onclick="delProfile('${id}')">Delete actor</button>`:''}`);
}

function saveProfile(id){
  const name=val('p_name').trim();if(!name){alert('Name required');return;}
  const c=+val('p_cpct')||0;
  const o={name,color:val('p_color')||'#5b8cff',commonPct:c,personalPct:Math.max(0,100-c)};
  if(id){const old=DB.people.find(x=>x.id===id);const oldName=old.name;Object.assign(old,o);
    if(oldName!==name){ // cascade rename across data
      DB.budgets.forEach(b=>{if(b.person===oldName)b.person=name;});
      DB.expenses.forEach(e=>{if(e.paidBy===oldName)e.paidBy=name;});
      DB.savings.forEach(s=>{if(s.owner===oldName)s.owner=name;});
    }}
  else DB.people.push({id:'p_'+uid(),...o});
  save();closeModal();render();
}
function delProfile(id){
  const p=DB.people.find(x=>x.id===id);if(!p)return;
  const used=DB.budgets.some(b=>b.person===p.name)||DB.expenses.some(e=>e.paidBy===p.name)||DB.savings.some(s=>s.owner===p.name);
  if(used&&!confirm(`${p.name} is used in existing data. Delete the actor anyway? (their existing entries keep the name)`))return;
  DB.people=DB.people.filter(x=>x.id!==id);save();closeModal();render();
}

/* ============ backup: export / import ============ */
function exportData(){
  const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='household-backup-'+istToday()+'.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importData(){
  const inp=document.createElement('input');inp.type='file';inp.accept='application/json,.json';
  inp.onchange=()=>{
    const f=inp.files&&inp.files[0];if(!f)return;
    const rd=new FileReader();
    rd.onload=()=>{
      let data;try{data=JSON.parse(rd.result);}catch(e){alert('That file is not valid JSON.');return;}
      if(!data||!Array.isArray(data.people)||!Array.isArray(data.expenses)){alert('This does not look like a Household backup.');return;}
      const counts=`${data.people.length} actors · ${data.budgets?.length||0} splits · ${data.expenses.length} expenses · ${data.savings?.length||0} savings`;
      if(!confirm(`Restore this backup?\n${counts}\n\nThis REPLACES your current data on this device (and syncs to the household).`))return;
      DB=data;migrate();DB.rev=(DB.rev||0)+1;DB.updatedAt=nowISO();
      lastSerialized=JSON.stringify(DB);localStorage.setItem(KEY,lastSerialized);
      syncPush();render();alert('Backup restored.');
    };
    rd.readAsText(f);
  };
  inp.click();
}

/* ============ render ============ */
function render(){
  const v={home:viewHome,split:viewSplit,expenses:viewExpenses,analytics:viewAnalytics,savings:viewSavings,sync:viewSync}[tab];
  document.getElementById('app').innerHTML=v();
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  document.getElementById('fab').style.display=(tab==='home'||tab==='sync'||tab==='analytics')?'none':'flex';
  const eye=document.getElementById('eye');
  eye.innerHTML=hideMoney
    ? '<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.6M6.6 6.6C4.6 7.9 3.4 9.7 3 11c1 2.5 5 7 9 7 1.4 0 2.7-.3 3.9-.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  eye.style.color=hideMoney?'var(--accent)':'var(--muted)';
  updateSyncBadge();window.scrollTo(0,0);
}
