// Dependency-free checks for reference-only Vault storage, validation and rendering.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),elements=new Map();
const context=vm.createContext({console,URL,Intl,Date,Math,JSON,Number,String,Boolean,Map,Set,localStorage:{getItem(){return null;}},document:{querySelectorAll:()=>[],addEventListener(){},getElementById:id=>elements.get(id)},window:{addEventListener(){}},confirm:()=>true});
for(const f of ['app.js','institutions.js','vault.js'])vm.runInContext(fs.readFileSync(new URL(f,root),'utf8'),context);
const run=s=>vm.runInContext(s,context);run("DB=seed();migrate();save=()=>{};closeModal=()=>{};render=()=>{};");
for(const id of ['vKind','vTitle','vOwner','vInstitution','vAccess','vItem','vURL','vLinked','vaultError'])elements.set(id,{value:'',textContent:''});
function form(values){for(const [id,e]of elements)e.value=values[id]||'';}
form({vKind:'credential',vTitle:'Axis Bank',vOwner:'Test actor',vInstitution:'Axis Bank',vAccess:'Net banking',vItem:'Axis Bank — Test'});
assert.equal(run("saveVaultEntry('')"),true);assert.equal(run('DB.vault.length'),1);
assert.equal(run("Object.keys(DB.vault[0]).sort().join(',')"),'access,id,institution,itemName,kind,owner,title');
const id=run('DB.vault[0].id');
form({vKind:'document',vTitle:'Receipt',vOwner:'Joint',vAccess:'Deposit',vURL:'javascript:alert(1)'});assert.equal(run("saveVaultEntry('')"),false);
for(const url of ['http://drive.google.com/file/d/1','https://drive.google.com.evil.test/','https://user:pass@drive.google.com/','https://evil.test/'])assert.equal(run(`vaultDocumentURL(${JSON.stringify(url)})`),'');
form({vKind:'document',vTitle:'Receipt <test>',vOwner:'Joint',vAccess:'Deposit',vURL:'https://drive.google.com/file/d/sample/view',vLinked:id});assert.equal(run("saveVaultEntry('')"),true);
assert(run('vaultRows()').includes('Receipt &lt;test&gt;'));run("vaultOwner='Joint'");assert(!run('vaultRows()').includes('Axis Bank'));run("vaultOwner='';vaultQuery='receipt'");assert(!run('vaultRows()').includes('Axis Bank'));
run(`deleteVaultEntry(${JSON.stringify(id)})`);assert.equal(run('DB.vault.length'),1);assert.equal(run('DB.vault[0].linkedId'),undefined);
run("vaultQuery='';DB.vault=undefined;migrate()");assert.equal(run('DB.vault.length'),0);
console.log('PASS: Vault references only, owner/search filters, escaped rendering, safe document URLs, deletion unlinking and legacy migration');
