/* Instrument-specific entry forms. Existing holdings keep their original type and fields. */
function savingKind(type){
  const t=String(type||'').toLowerCase().trim();
  if(t==='fd'||t==='fixed deposit')return 'fd';
  if(t==='rd'||t==='recurring deposit')return 'rd';
  if(['arbitrage fund','liquid fund','mutual fund'].includes(t))return 'fund';
  if(t==='gold')return 'gold';
  return 'other';
}
function hasSavingMaturity(f){const kind=savingKind(f.type);return ['fd','rd'].includes(kind)||(kind==='other'&&!!f.maturity);}
function savingTypeLabel(type){return type==='FD'?'Fixed deposit (FD)':type==='Recurring Deposit'?'Recurring deposit (RD)':type;}
function institutionFor(f){return INSTITUTIONS.find(x=>x.id===f.institutionId)||INSTITUTIONS.find(x=>x.name.toLowerCase()===String(f.bank||'').trim().toLowerCase());}
function institutionBadge(f){
  const item=institutionFor(f),name=String(item?.name||f.bank||f.schemeName||'Holding');
  const monogram=esc(name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase());
  return `<span class="institution-badge" aria-hidden="true">${item?.logo?`<img src="${esc(item.logo)}" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>${monogram}</span>`:`<span>${monogram}</span>`}</span>`;
}
function holdingTitle(f){return savingKind(f.type)==='fund'?(f.schemeName||f.bank||f.type):(f.bank||f.type);}
function holdingSubtitle(f){
  const kind=savingKind(f.type),parts=[f.type];
  if(kind==='fund'&&f.schemeName&&f.bank)parts.push(f.bank);
  if(kind==='rd'&&f.rdMonthly)parts.push(fmt(f.rdMonthly)+'/month');
  if(['fd','rd'].includes(kind)&&f.interestRate!==''&&f.interestRate!=null)parts.push(f.interestRate+'% p.a.');
  if(f.source)parts.push(f.source);
  return parts.map(esc).join(' · ');
}
function addTermDate(start,count,unit){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isInteger(count)||count<=0||!['days','months','years'].includes(unit))return '';
  const date=new Date(start+'T00:00:00Z');
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==start)return '';
  const [y,m,d]=start.split('-').map(Number);
  if(unit==='days')date.setUTCDate(d+count);
  else{
    const month=m-1+count*(unit==='years'?12:1),end=new Date(0);
    end.setUTCFullYear(y,month+1,0);
    date.setUTCFullYear(y,month,Math.min(d,end.getUTCDate()));
  }
  if(!Number.isFinite(date.getTime())||date.getUTCFullYear()<1||date.getUTCFullYear()>9999)return '';
  return date.toISOString().slice(0,10);
}

let savingsDraft=null,savingsEditId='',institutionMatches=[],institutionIndex=-1;
function savingInput(id){return document.getElementById(id);}
function readSavingDraft(){
  if(!savingsDraft)return;
  const fields={f_owner:'owner',f_bank:'bank',f_amount:'amount',f_interest:'interestRate',f_start:'startDate',f_rd_monthly:'rdMonthly',f_mat:'maturity',f_term_count:'termCount',f_term_unit:'termUnit',f_mat_mode:'maturityMode',f_scheme:'schemeName',f_invested:'investedAmount',f_units:'units',f_weight:'goldGrams',f_legacy_tenure:'tenure',f_src:'source',f_st:'status',f_ph:'phone',f_nom:'nominee'};
  Object.entries(fields).forEach(([id,key])=>{const el=savingInput(id);if(el)savingsDraft[key]=el.value;});
}
function formField(label,id,value='',type='text',extra=''){
  return `<label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value??'')}" ${extra}>`;
}
function openSaving(id){
  savingsEditId=id||'';
  const old=id?DB.savings.find(f=>f.id===id):null;
  savingsDraft=old?{...old}:{type:DB.savingsTypes[0]||'FD',owner:DB.people[0]?.name||'',bank:'',amount:'',maturity:'',startDate:istToday(),interestRate:'',source:'Common',status:'Running',phone:'',nominee:''};
  savingsDraft.startDate=old?(old.startDate||old.rdStart||''):istToday();
  savingsDraft.maturityMode=old?.maturityMode||'date';
  const types=[...new Set([...DB.savingsTypes,savingsDraft.type])];
  openModal(`<h3>${id?'Edit':'Add'} savings</h3><p class="muted sm form-intro">Choose a type to see the relevant fields.</p>
    <label for="f_type">Savings type</label><select id="f_type" onchange="onSavingTypeChange()">${types.map(t=>`<option value="${esc(t)}" ${t===savingsDraft.type?'selected':''}>${esc(savingTypeLabel(t))}</option>`).join('')}</select>
    <div id="savingFields"></div><p id="savingError" class="form-error" role="alert" hidden></p>
    <div class="form-actions"><button class="btn" onclick="saveSaving('${id||''}')">Save holding</button>${id?`<button class="del" onclick="delItem('savings','${id}')">Delete holding</button>`:''}</div>`);
  renderSavingFields();
}
function onSavingTypeChange(){
  readSavingDraft();const oldKind=savingKind(savingsDraft.type),type=val('f_type'),newKind=savingKind(type);
  if((oldKind==='fund')!==(newKind==='fund')){savingsDraft.bank='';savingsDraft.institutionId='';}
  savingsDraft.type=type;renderSavingFields();
}
function renderSavingFields(){
  const f=savingsDraft,kind=savingKind(f.type),term=kind==='fd'||kind==='rd';
  const provider=term?'Bank':kind==='fund'?'Broker':'Provider';
  const people=[...new Set([...DB.people.map(p=>p.name),f.owner].filter(Boolean))];
  let html=`<label for="f_owner">Account owner</label><select id="f_owner"><option value="">Select owner</option>${people.map(p=>`<option ${p===f.owner?'selected':''}>${esc(p)}</option>`).join('')}</select>`;
  if(term||kind==='fund'){
    html+=`<label for="f_bank">${provider}</label><div class="institution-picker"><div class="institution-input"><span id="selectedInstitution">${institutionBadge(f)}</span><input id="f_bank" value="${esc(f.bank)}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="institutionOptions" autocomplete="off" placeholder="Search ${term?'banks':'brokers'}" onfocus="searchInstitutions(this.value)" oninput="onInstitutionInput(this.value)" onkeydown="institutionKey(event)" onblur="setTimeout(closeInstitutionMenu,150)"></div><div id="institutionOptions" class="institution-options" role="listbox" aria-label="${provider} suggestions" hidden></div></div><p class="field-help">Search the saved directory or enter another ${provider.toLowerCase()}.</p>`;
  }else html+=formField(kind==='gold'?'Jeweller / platform':'Provider','f_bank',f.bank);
  if(kind==='fund')html+=formField('Fund / scheme name','f_scheme',f.schemeName||'','text','placeholder="e.g. scheme name and plan"');
  if(kind==='rd'){
    html+=`<div class="field-pair">${'<div>'+formField('Monthly deposit (₹)','f_rd_monthly',f.rdMonthly||'','number','min="1" step="any" inputmode="decimal"')+'</div>'}${'<div>'+formField('Locked interest (% p.a.)','f_interest',f.interestRate,'number','min="0" max="100" step="0.01" inputmode="decimal"')+'</div>'}</div>`;
    html+=formField('Start date','f_start',f.startDate,'date');
  }else{
    html+=formField(kind==='fd'?'Deposit principal (₹)':kind==='fund'?'Recorded holding value (₹)':'Holding value (₹)','f_amount',f.amount,'number','min="0" step="any" inputmode="decimal"');
    if(kind==='fd')html+=`<div class="field-pair"><div>${formField('Locked interest (% p.a.)','f_interest',f.interestRate,'number','min="0" max="100" step="0.01" inputmode="decimal"')}</div><div>${formField('Deposit date','f_start',f.startDate,'date')}</div></div>`;
  }
  if(term){
    html+=`<fieldset class="term-fields"><legend>Deposit term</legend><label for="f_mat_mode">Set maturity using</label><select id="f_mat_mode" onchange="onMatModeChange()"><option value="date" ${f.maturityMode!=='tenure'?'selected':''}>Maturity date</option><option value="tenure" ${f.maturityMode==='tenure'?'selected':''}>Tenure from start date</option></select><div id="f_mat_date_wrap" ${f.maturityMode==='tenure'?'hidden':''}>${formField('Maturity date','f_mat',f.maturity,'date')}</div><div id="f_mat_tenure_wrap" ${f.maturityMode==='tenure'?'':'hidden'}><div class="field-pair"><div>${formField('Tenure','f_term_count',f.termCount||'','number','min="1" step="1" inputmode="numeric" oninput="updateTermPreview()"')}</div><div><label for="f_term_unit">Unit</label><select id="f_term_unit" onchange="updateTermPreview()">${['months','days','years'].map(u=>`<option ${u===(f.termUnit||'months')?'selected':''}>${u}</option>`).join('')}</select></div></div><p id="termPreview" class="field-help"></p></div></fieldset>`;
    html+=`<p class="field-help">The interest rate is recorded for reference. This form does not estimate bank interest or a guaranteed payout.</p>`;
  }else if(kind==='fund'){
    html+=`<div class="field-pair"><div>${formField('Invested amount (₹, optional)','f_invested',f.investedAmount||'','number','min="0" step="any" inputmode="decimal"')}</div><div>${formField('Units (optional)','f_units',f.units||'','number','min="0" step="any" inputmode="decimal"')}</div></div><p class="field-help">Funds are open-ended here; no deposit maturity date is used.</p>`;
  }else if(kind==='gold')html+=formField('Weight (grams, optional)','f_weight',f.goldGrams||'','number','min="0" step="any" inputmode="decimal"');
  if(kind==='other')html+=formField('Maturity date (optional)','f_mat',f.maturity||'','date')+formField('Tenure (optional)','f_legacy_tenure',f.tenure==='-'?'':f.tenure||'');
  const statuses=term?['Running','Matured']:['Running','Closed'];if(f.status&&!statuses.includes(f.status))statuses.push(f.status);
  html+=`<details class="holding-details"><summary>Source, nominee & contact</summary>${formField('Source','f_src',f.source||'')}${formField('Nominee (optional)','f_nom',f.nominee||'')}${formField('Contact phone (optional)','f_ph',f.phone||'','tel')}</details><label for="f_st">Status</label><select id="f_st">${statuses.map(st=>`<option ${st===f.status?'selected':''}>${esc(st)}</option>`).join('')}</select>`;
  document.getElementById('savingFields').innerHTML=html;
  const start=savingInput('f_start');if(start)start.addEventListener('input',updateTermPreview);
  updateTermPreview();
}
function onMatModeChange(){readSavingDraft();savingInput('f_mat_date_wrap').hidden=val('f_mat_mode')==='tenure';savingInput('f_mat_tenure_wrap').hidden=val('f_mat_mode')!=='tenure';updateTermPreview();}
function updateTermPreview(){const el=savingInput('termPreview');if(!el)return;const date=addTermDate(savingInput('f_start')?.value||'',+savingInput('f_term_count')?.value,savingInput('f_term_unit')?.value);el.textContent=date?'Matures '+fmtDate(date):'Choose a start date and tenure to calculate the maturity date.';}
function institutionKind(){return savingKind(savingsDraft.type)==='fund'?'broker':'bank';}
function onInstitutionInput(value){savingsDraft.bank=value;savingsDraft.institutionId='';savingInput('selectedInstitution').innerHTML=institutionBadge({bank:value});searchInstitutions(value);}
function searchInstitutions(value){
  const q=value.trim().toLowerCase();institutionMatches=INSTITUTIONS.filter(i=>i.kind===institutionKind()&&(!q||(i.name+' '+(i.aliases||[]).join(' ')).toLowerCase().includes(q)));institutionIndex=-1;
  const box=savingInput('institutionOptions');box.hidden=false;savingInput('f_bank').setAttribute('aria-expanded','true');
  box.innerHTML=institutionMatches.length?institutionMatches.map((item,i)=>`<button type="button" id="institution-option-${i}" role="option" aria-selected="false" tabindex="-1" onmousedown="event.preventDefault()" onclick="chooseInstitution('${item.id}')">${institutionBadge({institutionId:item.id})}<span>${esc(item.name)}</span></button>`).join(''):`<p>No saved matches. You can keep “${esc(value)}” as a custom provider.</p>`;
}
function closeInstitutionMenu(){const box=savingInput('institutionOptions');if(box)box.hidden=true;const input=savingInput('f_bank');input?.setAttribute('aria-expanded','false');input?.removeAttribute('aria-activedescendant');}
function chooseInstitution(id){const item=INSTITUTIONS.find(i=>i.id===id);if(!item)return;savingsDraft.institutionId=id;savingsDraft.bank=item.name;savingInput('f_bank').value=item.name;savingInput('selectedInstitution').innerHTML=institutionBadge({institutionId:id});closeInstitutionMenu();}
function institutionKey(e){
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeInstitutionMenu();return;}
  if(e.key==='Enter'&&institutionIndex>=0){e.preventDefault();chooseInstitution(institutionMatches[institutionIndex].id);return;}
  if(!['ArrowDown','ArrowUp'].includes(e.key))return;e.preventDefault();if(savingInput('institutionOptions').hidden)searchInstitutions(e.target.value);
  if(!institutionMatches.length)return;institutionIndex=institutionIndex<0?(e.key==='ArrowDown'?0:institutionMatches.length-1):(institutionIndex+(e.key==='ArrowDown'?1:-1)+institutionMatches.length)%institutionMatches.length;
  savingInput('institutionOptions').querySelectorAll('[role=option]').forEach((el,i)=>{el.setAttribute('aria-selected',String(i===institutionIndex));if(i===institutionIndex){e.target.setAttribute('aria-activedescendant',el.id);el.scrollIntoView({block:'nearest'});}});
}
function savingError(message){const el=savingInput('savingError');el.hidden=false;el.textContent=message;el.scrollIntoView({block:'nearest'});}
function saveSaving(id){
  readSavingDraft();const f=savingsDraft,kind=savingKind(f.type),term=['fd','rd'].includes(kind);
  if(!f.owner)return savingError('Select an account owner. Add one in Settings if needed.');
  if(!String(f.bank||'').trim())return savingError('Enter or select a '+(kind==='fund'?'broker':term?'bank':'provider')+'.');
  const known=INSTITUTIONS.find(i=>i.name.toLowerCase()===String(f.bank).trim().toLowerCase());
  if(known&&(term||kind==='fund')&&known.kind!==(term?'bank':'broker'))return savingError(term?'Choose a bank for this deposit.':'Choose a broker for this fund, rather than a bank.');
  if(kind==='rd'&&(!Number.isFinite(+f.rdMonthly)||+f.rdMonthly<=0||!f.startDate))return savingError('Enter a positive monthly deposit and start date.');
  if(kind!=='rd'&&(!Number.isFinite(+f.amount)||+f.amount<=0))return savingError('Enter a positive holding amount.');
  if(term&&f.interestRate!==''&&f.interestRate!=null&&(!Number.isFinite(+f.interestRate)||+f.interestRate<0||+f.interestRate>100))return savingError('Interest rate must be between 0 and 100.');
  if(kind==='fund'&&[f.investedAmount,f.units].some(v=>v!==''&&v!=null&&(!Number.isFinite(+v)||+v<0)))return savingError('Invested amount and units cannot be negative.');
  if(kind==='fund'&&!String(f.schemeName||'').trim())return savingError('Enter the fund or scheme name.');
  if(kind==='gold'&&f.goldGrams!==''&&f.goldGrams!=null&&(!Number.isFinite(+f.goldGrams)||+f.goldGrams<0))return savingError('Gold weight cannot be negative.');
  const maturity=term?(f.maturityMode==='tenure'?addTermDate(f.startDate,+f.termCount,f.termUnit):f.maturity):'';
  if(term&&(!maturity||(f.startDate&&maturity<=f.startDate)))return savingError('Set a maturity date after the start date.');
  const selected=INSTITUTIONS.find(i=>i.id===f.institutionId&&i.kind===institutionKind()&&i.name===f.bank);
  const o={type:f.type,owner:f.owner,bank:f.bank.trim(),institutionId:selected?.id||'',amount:kind==='rd'?(+f.amount||+f.rdMonthly):+f.amount,
    maturityMode:term?f.maturityMode||'date':'',termCount:term&&f.maturityMode==='tenure'?+f.termCount:null,termUnit:term&&f.maturityMode==='tenure'?f.termUnit:'',
    interestRate:term&&f.interestRate!==''&&f.interestRate!=null?+f.interestRate:null,startDate:term?f.startDate||'':'',maturity,tenure:term&&f.maturityMode==='tenure'?f.termCount+' '+f.termUnit:term?f.tenure||'-':'-',
    source:f.source||'',status:f.status||'Running',phone:f.phone||'',nominee:f.nominee||'',rdMonthly:kind==='rd'?+f.rdMonthly:0,rdStart:kind==='rd'?f.startDate:'',
    schemeName:kind==='fund'?f.schemeName.trim():'',investedAmount:kind==='fund'&&f.investedAmount!=null&&f.investedAmount!==''?+f.investedAmount||0:null,units:kind==='fund'&&f.units!=null&&f.units!==''?+f.units||0:null,goldGrams:kind==='gold'?+f.goldGrams||0:null};
  if(kind==='other'){for(const key of ['maturityMode','termCount','termUnit','interestRate','startDate','rdMonthly','rdStart','schemeName','investedAmount','units','goldGrams'])delete o[key];o.maturity=f.maturity||'';o.tenure=f.tenure||'-';}
  if(id)Object.assign(DB.savings.find(x=>x.id===id),o);else DB.savings.push({id:uid(),...o});save();closeModal();render();
}
