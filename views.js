/* ============ views ============ */
function viewHome(){
  const ex=DB.expenses.filter(e=>e.month===curMonth()&&e.kind==='fixed'&&!isExternalExpense(e));
  const paid=ex.filter(e=>e.paid);
  const totalBills=ex.reduce((s,e)=>s+e.amount,0), paidAmt=paid.reduce((s,e)=>s+e.amount,0);
  const a=analyticsMonth(curMonth());
  const savTotal=DB.savings.reduce((s,f)=>s+f.amount,0);
  const maturing=DB.savings.filter(f=>{const d=daysTo(f.maturity);return d!==null&&d>=0&&d<=90;});
  const bpct=totalBills?Math.round(paidAmt/totalBills*100):0;
  const isNow=curMonth()===thisMonth();

  let html=`<div style="padding-right:52px">
    <h1>${isNow?'This Month':'Overview'}</h1><p class="sub">${monthLabel(curMonth())} · IST</p></div>`;
  if(sync.enabled){const t={idle:'Synced',pushing:'Saving…',pulling:'Syncing…',error:'Offline — retry'}[sync.status]||'Sync';
    html+=`<button class="btn sm ghost" style="margin:0 0 12px" onclick="syncNow()">🔄 ${t}</button>`;}
  html+=monthBar();
  if(!window.matchMedia('(display-mode: standalone)').matches)
    html+=`<div class="install-tip">📲 <b>Install:</b> Safari Share button → <b>Add to Home Screen</b>. Full-screen &amp; offline.</div>`;

  html+=`<div class="grid2">
    <div class="stat"><div class="l">${icon('wallet','var(--muted)',14)} Income</div><div class="n">${fmt(a.salary)}</div></div>
    <div class="stat"><div class="l" style="color:var(--green)">${icon('save','var(--green)',14)} Saving · ${pct(a.saveRate)}</div><div class="n" style="color:var(--green)">${fmt(a.saved)}</div></div>
    <div class="stat"><div class="l" style="color:var(--accent)">${icon('invest','var(--accent)',14)} Investing · ${pct(a.investRate)}</div><div class="n" style="color:var(--accent)">${fmt(a.invested)}</div></div>
    <div class="stat"><div class="l" style="color:var(--red)">${icon('expense','var(--red)',14)} Expenses · ${pct(a.expRate)}</div><div class="n" style="color:var(--red)">${fmt(a.expense)}</div></div>
  </div>`;

  html+=`<h2>Bills ticked</h2><div class="card"><div class="row"><span class="b" data-paidcount>${paid.length} of ${ex.length} paid</span>
      <span class="amt" data-paidamt>${fmt(paidAmt)} / ${fmt(totalBills)}</span></div><div class="bar"><i style="width:${bpct}%"></i></div>`;
  const pending=ex.filter(e=>!e.paid).sort((x,y)=>x.dueDay-y.dueDay);
  if(pending.length){html+=`<div style="margin-top:12px">`;pending.slice(0,4).forEach(e=>{
    html+=`<div class="exp"><button class="tick" onclick="togglePaid('${e.id}')"></button>
      <div style="flex:1"><div class="nm b">${esc(e.name)}</div><div class="muted xs">Due ${e.dueDay} · ${esc(e.paidBy)} · ${esc(e.account)}</div></div>
      <span class="amt">${fmt(e.amount)}</span></div>`;});html+=`</div>`;}
  else html+=`<p class="muted sm" style="margin:10px 0 0">All bills ticked 🎉</p>`;
  html+=`</div>`;



  html+=`<div class="row"><h2 style="margin-bottom:0">Savings &amp; investments</h2><span class="amt">${fmt(savTotal)}</span></div>`;
  if(maturing.length){maturing.sort((x,y)=>daysTo(x.maturity)-daysTo(y.maturity)).forEach(f=>{const d=daysTo(f.maturity);
    html+=`<div class="card"><div class="row"><div><div class="b">${esc(f.bank)}</div>
      <div class="muted xs">${esc(f.owner)} · ${esc(f.type)} · ${fmtDate(f.maturity)}</div></div>
      <div style="text-align:right"><div class="amt">${fmt(typeof rdv==='number'?rdv:f.amount)}</div><span class="pill ${d<=30?'p-red':'p-amber'}">in ${d}d</span></div></div></div>`;});}
  else html+=`<div class="card"><p class="muted sm" style="margin:0">Nothing maturing in 90 days. Open the Savings tab for the full list.</p></div>`;
  return html;
}

let splitOpen={}; // budgetId -> expanded?
function toggleSplit(id){splitOpen[id]=!splitOpen[id];render();}
function viewSplit(){
  const bs=DB.budgets.filter(b=>b.month===curMonth());
  let html=`<h1>Monthly Split</h1><p class="sub">Salary → fixed → common/personal savings</p>`+monthBar();
  if(!bs.length)html+=`<div class="empty">No salary set for ${monthLabel(curMonth())}. Tap + to add.</div>`;
  bs.forEach(b=>{
    const s=splitFor(b);const p=DB.people.find(x=>x.name===b.person);const open=!!splitOpen[b.id];
    const totalSave=s.commonSave+s.personalSave+s.fixSave;
    const denom=(s.fixExp+s.insure+s.invest+totalSave)||1;
    const seg=(v,c)=>v>0?`<span style="width:${v/denom*100}%;background:${c}"></span>`:'';
    html+=`<div class="card">
      <div class="row" onclick="toggleSplit('${b.id}')">
        <span style="display:flex;align-items:center;gap:9px">${av(b.person)}
          <span class="b" style="color:${p?p.color:'#fff'};font-size:16px">${esc(b.person)}</span></span>
        <span style="display:flex;align-items:center;gap:10px"><span class="amt">${fmt(s.salary)}</span>
          <button class="iconbtn" onclick="event.stopPropagation();openBudget('${b.id}')" aria-label="Edit">${icon('edit','var(--muted)',17)}</button></span>
      </div>
      <div class="propbar">${seg(s.fixExp+s.insure,'var(--red)')}${seg(s.invest,'var(--accent)')}${seg(totalSave,'var(--green)')}</div>
      <div class="legend-row">
        ${s.fixExp+s.insure>0?`<span>${icon('expense','var(--red)',12)} Expense ${fmt(s.fixExp+s.insure)}</span>`:''}
        ${s.invest>0?`<span>${icon('invest','var(--accent)',12)} Invest ${fmt(s.invest)}</span>`:''}
        <span>${icon('save','var(--green)',12)} Save ${fmt(totalSave)}</span>
      </div>
      <div class="row expandbar" onclick="toggleSplit('${b.id}')">
        <span class="muted sm">${(b.fixedItems||[]).length} fixed items · ${s.commonPct}:${s.personalPct} split</span>
        <span class="sm" style="color:var(--accent);display:flex;align-items:center;gap:3px">${open?'Hide':'Details'} ${icon(open?'chevU':'chevD','var(--accent)',15)}</span>
      </div>`;
    if(open){
      html+=`<div class="flow" style="margin-top:10px">
        <div class="step"><span class="sm b">Fixed budget</span><span class="amt sm">${fmt(s.fixed)}</span></div>`;
      (b.fixedItems||[]).forEach(i=>{const t=i.t||'Expense';
        html+=`<div class="split-col" style="margin-left:10px"><span class="sm" style="display:flex;align-items:center;gap:7px">${icon(TAGICON[t],TAGCOLOR[t],15)} ${esc(i.n)} <span class="tag ${SUB_TAGCLASS[t]}">${t}</span></span><span class="amt sm">${fmt(i.a)}</span></div>`;});
      html+=`<div class="arrow">↓ remainder ${fmt(s.remainder)} split ${s.commonPct}:${s.personalPct}</div>
        <div class="step"><span class="sm" style="color:var(--green);display:flex;align-items:center;gap:7px">${icon('save','var(--green)',15)} Common savings (joint)</span><span class="amt sm" style="color:var(--green)">${fmt(s.commonSave)}</span></div>
        <div class="step"><span class="sm" style="color:var(--green);display:flex;align-items:center;gap:7px">${icon('person','var(--green)',15)} Personal savings</span><span class="amt sm" style="color:var(--green)">${fmt(s.personalSave)}</span></div>
      </div>`;
    }
    html+=`</div>`;
  });
  return html;
}

let expTab='fixed'; // fixed | extra
function setExpTab(t){expTab=t;render();}
function viewExpenses(){
  const all=DB.expenses.filter(e=>e.month===curMonth());
  const fixed=all.filter(e=>e.kind==='fixed').sort((a,b)=>a.paid-b.paid||(a.dueDay||0)-(b.dueDay||0));
  const extra=all.filter(e=>e.kind==='extra').sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  let html=h('h1',{},'Expenses')+h('p',{class:'sub'},'Planned bills & unplanned spends')+monthBar();
  html+=h('div',{class:'seg'},
    h('button',{class:expTab==='fixed'?'on':'',onclick:"setExpTab('fixed')"},'Fixed / Planned'),
    h('button',{class:expTab==='extra'?'on':'',onclick:"setExpTab('extra')"},'Extra / Unplanned'));

  if(expTab==='fixed'){
    const internal=fixed.filter(e=>!isExternalExpense(e));
    const tracked=fixed.filter(e=>isExternalExpense(e));
    const paid=internal.filter(e=>e.paid), tot=internal.reduce((s,e)=>s+e.amount,0), paidAmt=paid.reduce((s,e)=>s+e.amount,0);
    const planned=DB.budgets.filter(b=>b.month===curMonth()).reduce((s,b)=>s+(b.fixedItems||[]).filter(i=>i.t==='Expense').reduce((x,i)=>x+i.a,0),0);
    html+=h('div',{class:'card'},
      h('div',{class:'row'},h('span',{'data-paidcount':true,class:'b'},paid.length+'/'+internal.length+' paid'),h('span',{'data-paidamt':true,class:'amt'},fmt(paidAmt)+' / '+fmt(tot))),
      h('div',{class:'bar'},h('i',{style:'width:'+(tot?Math.round(paidAmt/tot*100):0)+'%'})),
      h('div',{class:'row xs muted',style:'margin-top:10px'},h('span',{},'Planned in Split (Expense tag): '+fmt(planned)),h('span',{},'Ticked: '+fmt(paidAmt))));
    if(!internal.length&&!tracked.length)html+=h('div',{class:'empty'},'No planned bills. Tap + to add.');
    // Group internal expenses by account/paidBy
    const groups={};
    internal.forEach(e=>{
      if(e.account==='Common'){if(!groups.Common)groups.Common=[];groups.Common.push(e);}
      else{const key=e.paidBy;if(!groups[key])groups[key]=[];groups[key].push(e);}
    });
    Object.keys(groups).forEach(key=>{
      const isCommon=key==='Common';
      const p=isCommon?null:DB.people.find(x=>x.name===key);
      const label=isCommon?'Common Recurring':(p?p.name+"'s Recurring":key);
      html+=h('h2',{},isCommon?'Shared ':'',!isCommon?av(key)+' ':'',esc(label));
      html+=h('div',{class:'card'},...groups[key].map(e=>expenseRow(e,{showPaidBy:!isCommon,onClick:"openExpense('"+e.id+"')"})));
    });
    // Tracked section: external expenses
    if(tracked.length){
      html+=h('h2',{},'📋 Tracked (not paid by us)');
      html+=h('div',{class:'card',style:'opacity:.8'},...tracked.map(e=>expenseRow(e,{showPaidBy:false,onClick:"openExpense('"+e.id+"')"})));
    }
    if(curMonth()>=thisMonth()){
      html+=h('button',{class:'btn ghost',onclick:'startNewMonth()'},'📅 Start '+monthLabel(shiftMonth(curMonth(),1)));
      html+=h('p',{class:'muted xs',style:'text-align:center;margin-top:8px'},'Copies bills & split forward (unpaid), only after the month begins. Past months never change.');
      html+=h('button',{class:'btn ghost',style:'margin-top:10px;border-color:var(--red);color:var(--red)',onclick:'resetMonth()'},'↻ Reset this month');
    }
  } else {
    const tot=extra.reduce((s,e)=>s+e.amount,0);
    html+=h('div',{class:'card'},h('div',{class:'row'},h('span',{class:'b'},'Unplanned this month'),h('span',{class:'amt'},fmt(tot))),
      h('p',{class:'muted xs',style:'margin:8px 0 0'},'All extra spends are ',h('b',{},'common'),' and come out of the joint Common Savings pool — your declared budget stays intact.'));
    if(!extra.length)html+=h('div',{class:'empty'},'No unplanned expenses. Tap + to log one.');
    else html+=h('div',{class:'card'},...extra.map(e=>h('div',{class:'exp'},h('div',{style:'flex:1',onclick:"openExtra('"+e.id+"')"},h('div',{class:'nm b'},esc(e.name)),h('div',{class:'muted xs'},fmtDate(e.date),' · Common')),h('span',{class:'amt'},fmt(e.amount)))));
  }
  return html;
}

/* ---- Analytics ---- */
let anMode='combined'; // combined | <person name>
function setAnMode(m){anMode=m;render();}
function donut(items){
  const R=52,C=2*Math.PI*R;let off=0,seg='';
  const tot=items.reduce((s,i)=>s+i.v,0)||1;
  items.forEach(it=>{const len=C*it.v/tot;
    seg+=`<circle r="${R}" cx="60" cy="60" fill="none" stroke="${it.color}" stroke-width="16" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`;off+=len;});
  return `<svg class="donut" width="150" height="150" viewBox="0 0 120 120">${seg}<circle r="36" cx="60" cy="60" fill="var(--bg)"/></svg>`;
}
function viewAnalytics(){
  const people=DB.people.filter(p=>DB.budgets.some(b=>b.person===p.name));
  let html=`<h1>Analytics</h1><p class="sub">Saving · investing · expenses</p>`+monthBar();
  // mode selector
  html+=`<div class="seg"><button class="${anMode==='combined'?'on':''}" onclick="setAnMode('combined')">Combined</button>`;
  people.forEach(p=>html+=`<button class="${anMode===p.name?'on':''}" onclick="setAnMode('${esc(p.name)}')">${esc(p.name)}</button>`);
  html+=`</div>`;

  let a;
  if(anMode==='combined')a=analyticsMonth(curMonth());
  else{const b=DB.budgets.find(x=>x.month===curMonth()&&x.person===anMode);a=b?analyticsFor(b):{salary:0,saved:0,invested:0,expense:0,saveRate:0,investRate:0,expRate:0};}

  html+=`<div class="grid2">
    <div class="stat"><div class="l">${icon('wallet','var(--muted)',14)} Income</div><div class="n">${fmt(a.salary)}</div></div>
    <div class="stat"><div class="l" style="color:var(--green)">${icon('save','var(--green)',14)} Saving rate</div><div class="n" style="color:var(--green)">${pct(a.saveRate)}</div></div>
    <div class="stat"><div class="l" style="color:var(--accent)">${icon('invest','var(--accent)',14)} Invest rate</div><div class="n" style="color:var(--accent)">${pct(a.investRate)}</div></div>
    <div class="stat"><div class="l" style="color:var(--red)">${icon('expense','var(--red)',14)} Expense rate</div><div class="n" style="color:var(--red)">${pct(a.expRate)}</div></div>
  </div>`;

  // Common savings pool: declared - unplanned extra = effective (combined only)
  if(anMode==='combined'){
    const neg=a.effectiveCommon<0;
    html+=`<h2>Common savings pool</h2><div class="card">
      <div class="split-col"><span class="sm">Declared common savings</span><span class="amt sm">${fmt(a.commonSave)}</span></div>
      <div class="split-col"><span class="sm">− Unplanned common spend</span><span class="amt sm" style="color:var(--red)">${fmt(a.extra)}</span></div>
      <div class="split-col" style="background:${neg?'rgba(255,107,125,.12)':'rgba(61,220,151,.10)'}"><span class="b">= Effective common savings</span><span class="amt" style="color:${neg?'var(--red)':'var(--green)'}">${fmt(a.effectiveCommon)}</span></div>
      ${neg?`<p class="xs" style="color:var(--red);margin:8px 0 0">⚠️ Unplanned spend exceeded the joint pool this month.</p>`:''}
    </div>`;
  }

  // breakdown donut
  const parts=[{k:'Saved',v:a.saved,color:'#3ddc97'},{k:'Invested',v:a.invested,color:'#5b8cff'},{k:'Expenses',v:a.expense,color:'#ff6b7d'}];
  html+=`<h2>Where the income goes</h2><div class="card"><div class="row" style="align-items:flex-start">${donut(parts)}
    <div class="legend" style="flex:1">`;
  parts.forEach(p=>html+=`<div class="row"><span style="display:flex;align-items:center;gap:8px"><span class="d" style="background:${p.color}"></span>${p.k}</span><span class="b sm">${fmt(p.v)}</span></div>`);
  const leftover=a.salary-a.saved-a.invested-a.expense;
  if(Math.abs(leftover)>1)html+=`<div class="row"><span class="muted sm">Unallocated</span><span class="b sm">${fmt(leftover)}</span></div>`;
  html+=`</div></div>`;

  // month-over-month comparison (last 6 months up to current)
  const months=[];let m=curMonth();for(let i=0;i<6;i++){months.unshift(m);m=shiftMonth(m,-1);}
  const series=months.map(mm=>{
    if(anMode==='combined')return {m:mm,...analyticsMonth(mm)};
    const b=DB.budgets.find(x=>x.month===mm&&x.person===anMode);return {m:mm,...(b?analyticsFor(b):{saved:0,invested:0,expense:0,salary:0})};
  });
  const maxV=Math.max(1,...series.map(s=>s.saved+s.invested+s.expense));
  html+=`<h2>Last 6 months</h2><div class="card"><div class="cmp">`;
  series.forEach(s=>{const H=x=>Math.round(x/maxV*100);
    html+=`<div class="col"><div class="stk" style="height:${H(s.saved+s.invested+s.expense)}%">
        <div style="background:#ff6b7d;height:${s.saved+s.invested+s.expense?H(s.expense)/Math.max(H(s.saved+s.invested+s.expense),1)*100:0}%"></div>
        <div style="background:#5b8cff;flex:${s.invested}"></div>
        <div style="background:#3ddc97;flex:${s.saved}"></div>
      </div><div class="lbl">${s.m.split('-')[1]}/${s.m.split('-')[0].slice(2)}</div></div>`;});
  html+=`</div><div class="row xs muted" style="margin-top:10px;justify-content:center;gap:14px">
      <span><span style="color:#3ddc97">●</span> Saved</span><span><span style="color:#5b8cff">●</span> Invested</span><span><span style="color:#ff6b7d">●</span> Expenses</span></div></div>`;

  // per-person quick compare (combined mode only)
  if(anMode==='combined'&&people.length>1){
    html+=`<h2>By person</h2>`;
    people.forEach(p=>{const b=DB.budgets.find(x=>x.month===curMonth()&&x.person===p.name);if(!b)return;const pa=analyticsFor(b);
      html+=`<div class="card"><div class="row"><span class="b" style="color:${p.color}">${esc(p.name)}</span><span class="amt sm">${fmt(pa.salary)}</span></div>
        <div class="barrow"><div class="top"><span class="muted">Saving ${pct(pa.saveRate)}</span><span class="muted">Invest ${pct(pa.investRate)}</span></div>
        <div class="bar"><i style="width:${Math.round((pa.saveRate+pa.investRate)*100)}%"></i></div></div></div>`;});
  }
  return html;
}

/* ---- Savings (renamed FDs), with customizable type ---- */
let savingsFilter='';
function setSavingsFilter(t){savingsFilter=t;render();}
function viewSavings(){
  const filtered=DB.savings.filter(f=>!savingsFilter||f.type===savingsFilter);
  const groups={};filtered.forEach(f=>{(groups[f.owner]=groups[f.owner]||[]).push(f);});
  const rdAmt=f=>rdCurrentValue(f)??f.amount;const total=filtered.reduce((s,f)=>s+rdAmt(f),0);
  let html=`<h1>Savings</h1><p class="sub">Total ${fmt(total)} · ${filtered.length} holdings${savingsFilter?' ('+esc(savingsFilter)+')':''}</p>`;
  // by-type summary
  const byType={};DB.savings.forEach(f=>byType[f.type]=(byType[f.type]||0)+rdAmt(f));
  html+=`<div class="card"><div class="row" style="flex-wrap:wrap;gap:6px">`;
  Object.keys(byType).forEach(t=>html+=`<span class="pill p-blue" style="cursor:pointer${savingsFilter===t?';outline:2px solid var(--accent)':''}" onclick="setSavingsFilter('${esc(t)}')">${esc(t)} · ${fmt(byType[t])}</span>`);
  html+=`</div>`;
	  html+=`<div class="seg" style="margin:8px 0"><button class="${!savingsFilter?'on':''}" onclick="setSavingsFilter('')">All</button>`;
	  Object.keys(byType).forEach(t=>{html+=`<button class="${savingsFilter===t?'on':''}" onclick="setSavingsFilter('${esc(t)}')">${esc(t)}</button>`;});
	  html+=`</div><button class="btn ghost sm" style="margin-top:12px;width:100%" onclick="openTypes()">⚙︎ Manage types</button></div>`
  Object.keys(groups).forEach(owner=>{const sum=groups[owner].reduce((s,f)=>s+rdAmt(f),0);
    html+=`<h2>${avatarOf(owner)} ${esc(owner)} · ${fmt(sum)}</h2>`;
    groups[owner].forEach(f=>{const d=daysTo(f.maturity);
      const st=f.status==='Matured'?'p-green':(d!==null&&d>=0&&d<=90?'p-amber':'p-blue');
      const rdv=rdAmt(f);
      html+=`<div class="card tap" onclick="openSaving('${f.id}')"><div class="row"><div><div class="b">${esc(f.bank)}</div>
        <div class="muted xs">${esc(f.type)} · ${esc(f.source)}${f.tenure&&f.tenure!=='-'?' · '+esc(f.tenure):''}${f.nominee?' · Nominee '+esc(f.nominee):''}</div></div>
        <div style="text-align:right"><div class="amt">${fmt(typeof rdv==='number'?rdv:f.amount)}</div><span class="pill ${st}">${f.status==='Matured'?'Matured':(d!==null?fmtDate(f.maturity):'Running')}</span></div></div>
        ${f.phone?`<div class="xs" style="margin-top:6px"><a href="tel:${esc(f.phone)}">📞 ${esc(f.phone)}</a></div>`:''}</div>`;});});
  return html;
}

function viewSync(){
  let html=`<h1>Settings</h1><p class="sub">Actors, sync &amp; more</p>`;
  // --- Profiles / actors ---
  html+=`<h2>Actors</h2>`;
  DB.people.forEach(p=>{
    html+=`<div class="card tap" onclick="openProfile('${p.id}')"><div class="row">
      <span style="display:flex;align-items:center;gap:10px"><span class="ava big" style="border-color:${p.color};background:${p.color}22;color:${p.color};font-weight:800;font-size:14px">${(p.name||'?')[0].toUpperCase()}</span>
        <span><span class="b" style="color:${p.color}">${esc(p.name)}</span><br><span class="muted xs">Common ${p.commonPct}% · Personal ${p.personalPct}%</span></span></span>
      <span class="muted">›</span></div></div>`;});
  html+=`<button class="btn ghost" onclick="openProfile()">+ Add actor</button>`;
  html+=`<h2>Data sync</h2>`;
  if(!sync.enabled){
    html+=`<div class="card"><div class="b" style="margin-bottom:6px">This device is local-only</div>
      <p class="muted sm" style="margin:0 0 14px">Enable sync to share everything with another iPhone.</p>
      <label>Set a PIN (both phones use the same)</label><input id="create_pin" type="tel" inputmode="numeric" maxlength="8" placeholder="e.g. 4826">
      <div style="height:10px"></div><button class="btn" onclick="createHousehold(document.getElementById('create_pin').value)">Create a household on this phone</button></div>
    <div class="card"><label>…or join an existing household</label><input id="join_id" placeholder="Paste household code">
      <div style="height:8px"></div><input id="join_pin" type="tel" inputmode="numeric" maxlength="8" placeholder="PIN">
      <div style="height:10px"></div><button class="btn ghost" onclick="joinHousehold(document.getElementById('join_id').value,document.getElementById('join_pin').value)">Join household</button></div>
    <div class="install-tip">🔒 <b>Private &amp; secure:</b> data lives in your own Supabase, locked behind a household code <b>plus</b> PIN.</div>`;
  }else{
    const statusTxt={idle:'Synced ✅',pushing:'Saving…',pulling:'Checking…',error:'Offline / retrying ⚠️'}[sync.status]||'';
    html+=`<div class="card"><div class="row"><span class="b">Household active</span><span class="pill ${sync.status==='error'?'p-red':'p-green'}">${statusTxt}</span></div>
      <p class="muted sm" style="margin:10px 0 4px">Share this code + your PIN with the other iPhone.</p>
      <div style="background:var(--card2);border-radius:10px;padding:12px;margin-top:8px;word-break:break-all;font-family:ui-monospace,monospace;font-size:13px">${esc(sync.id)}</div>
      <div style="height:10px"></div><button class="btn ghost" onclick="copyCode()">Copy household code</button>
      <div style="height:8px"></div><button class="btn ghost" onclick="syncNow()">Sync now</button>
      <div class="muted xs" style="margin-top:10px">Last updated: ${DB.updatedAt?fmtDateTime(DB.updatedAt):'—'} · auto-syncs every 5s</div></div>
    <button class="del" onclick="if(confirm('Stop syncing on this phone? Data stays here but stops updating the other phone.'))disableSync()">Turn off sync on this device</button>`;
  }
  html+=`<h2>Backup &amp; data</h2>
    <div class="card"><p class="muted sm" style="margin:0 0 12px">Download a copy of everything, or restore from a backup file. Recommended before big changes.</p>
      <button class="btn ghost" onclick="exportData()">${icon('save','var(--ink)',16)} &nbsp;Download backup (.json)</button>
      <div style="height:8px"></div>
      <button class="btn ghost" onclick="importData()">${icon('expense','var(--ink)',16)} &nbsp;Restore from backup</button></div>`;
  return html;
}
function copyCode(){navigator.clipboard?.writeText(sync.id).then(()=>alert('Household code copied.'),()=>{});}
function fmtDateTime(iso){try{return new Date(iso).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){return '—';}}


