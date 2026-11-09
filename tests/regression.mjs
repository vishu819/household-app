// Run with: node tests/regression.mjs (no dependencies).
const fs = await import('node:fs');
const vm = await import('node:vm');
const assert = (await import('node:assert/strict')).default;
const { fileURLToPath } = await import('node:url');
const root = fileURLToPath(new URL('../', import.meta.url));
const app = fs.readFileSync(root + 'app.js', 'utf8');
const views = fs.readFileSync(root + 'views.js', 'utf8');
const alerts = [];
const FixedDate = class extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-11-09T06:00:00Z'])); }
  static now() { return new Date('2026-11-09T06:00:00Z').getTime(); }
};
const context = vm.createContext({
  console, Intl, Date: FixedDate, Math, JSON, Number, String, Boolean, Map, Set,
  localStorage: { getItem: () => null, setItem() {} },
  document: { querySelectorAll: () => [], addEventListener() {} },
  window: { matchMedia: () => ({ matches: true }), scrollY: 0, scrollTo() {} },
  navigator: {}, alert: message => alerts.push(message),
});
vm.runInContext(app + '\n' + views, context);
const run = code => vm.runInContext(code, context);
run(`DB={people:[{id:'p',name:'Test',commonPct:50,personalPct:50}],budgets:[
  {id:'b',person:'Test',month:'2026-10',salary:1000,fixedItems:[{k:'item',n:'Rent',a:100,t:'Expense'}]}
],expenses:[
  {id:'fixed',month:'2026-10',kind:'fixed',name:'Rent',paidBy:'Test',amount:100,paid:true},
  {id:'extra',month:'2026-10',kind:'extra',name:'Repair',paidBy:'Test',amount:50,date:'2026-10-12'}
],savings:[]};save=()=>{};carryForward('2026-10','2026-11');`);
assert.equal(run(`DB.expenses.filter(e=>e.month==='2026-11').length`), 1);
assert.equal(run(`DB.expenses.find(e=>e.month==='2026-11').kind`), 'fixed');
assert.equal(run(`DB.expenses.find(e=>e.month==='2026-11').paid`), false);
assert.equal(run(`DB.expenses.find(e=>e.month==='2026-11').paidDate`), null);
assert.equal(run(`DB.expenses.find(e=>e.id==='extra').date`), '2026-10-12');
run(`carryForward('2026-10','2026-11')`);
assert.equal(run('DB.expenses.length'), 3);
assert.equal(run('DB.budgets.length'), 2);
run(`DB.budgets.find(b=>b.month==='2026-11').fixedItems[0].a=200`);
assert.equal(run(`DB.budgets.find(b=>b.month==='2026-10').fixedItems[0].a`), 100);
console.log('PASS: rollover copies only planned bills, resets paid status, is idempotent, and preserves the source month');

run(`viewMonth='2026-11';DB.budgets=[];DB.expenses=[];DB.savings=[
  {id:'rd',amount:999,type:'Recurring Deposit',rdMonthly:100,rdStart:'2026-09-01',maturity:'2026-11-27',bank:'Test bank',owner:'Test',source:'Common',status:'Running'}
];`);
assert.equal(run('rdCurrentValue(DB.savings[0])'), 300);
const home = run('viewHome()'), savings = run('viewSavings()');
assert.equal((home.match(/₹300/g) || []).length, 2, 'Home total and maturity row use the RD value');
assert(!home.includes('₹999'));
assert(savings.includes('Total ₹300'));
run(`DB.savings.push({id:'fd',amount:500,type:'FD',bank:'FD bank',owner:'Test',maturity:'2026-11-27'})`);
assert(run('viewHome()').includes('₹800'));
assert(run('viewSavings()').includes('Total ₹800'));
console.log('PASS: Home and Savings agree for recurring deposits and mixed FD/RD holdings');

await run('copyCode()');
assert.match(alerts.pop(), /Could not copy/);
context.navigator.clipboard = { writeText: async () => { throw new Error('Permission denied'); } };
await run('copyCode()');
assert.match(alerts.pop(), /Could not copy/);
let copied;
context.navigator.clipboard = { writeText: async text => { copied = text; } };
run("sync.id='test-household'");
await run('copyCode()');
assert.equal(copied, 'test-household');
assert.equal(alerts.pop(), 'Household code copied.');
console.log('PASS: clipboard unavailable, permission denied, and success paths');
