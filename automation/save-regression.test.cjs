// Run: node --test automation/save-regression.test.cjs
// No external dependencies. Executes actual site/game.js with fake browser objects.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../site/game.js'),'utf8');
function boot(saved,now=Date.UTC(2026,10,12,0,0,0)){
  const values=new Map();
  if(saved!==undefined)values.set('neon_rework_07',JSON.stringify(saved));
  const listeners={};
  const nodes=new Map();
  function element(){
    return {style:{},dataset:{},children:[],classList:{toggle(){}},addEventListener(){},
      querySelectorAll(){return []},appendChild(n){this.children.push(n)},
      remove(){},
      set innerHTML(html){this.children=[...String(html).matchAll(/<(strong|small|button)\b[^>]*>/g)].map(()=>element())},
      get firstElementChild(){return this.children[0]||null},
      get lastElementChild(){return this.children[this.children.length-1]||null},
      set textContent(v){this._text=v},get textContent(){return this._text||''}};
  }
  const document={hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},
    createElement(){return element()},addEventListener(name,cb){listeners[name]=cb}};
  const localStorage={getItem(k){return values.get(k)||null},setItem(k,v){values.set(k,v)},removeItem(k){values.delete(k)}};
  const RealDate=Date;
  class FakeDate extends RealDate{static now(){return now}}
  const ctx=vm.createContext({document,localStorage,Date:FakeDate,Math,JSON,Number,Object,Array,Set,
    performance:{now:()=>0},window:{addEventListener(){}},requestAnimationFrame(){},confirm:()=>true});
  vm.runInContext(source,ctx,{filename:'site/game.js',timeout:15000});
  return {ctx,document,listeners,values,now,setNow(n){now=n},get(expr){return vm.runInContext(expr,ctx)}};
}
test('invalid timestamp does not award phantom offline progress',()=>{
  const b=boot({stage:1,lastSaved:null,credits:30});
  assert.equal(b.get('s.credits'),30);
  assert.equal(b.get('s.stage'),1);
});
test('corrupted skill maps with legacy migration do not reset saved progression',()=>{
  const b=boot({stage:25,best:25,credits:1234,heroLevel:60,traitPointsEarned:59,
    traits:{inherit:1},skillsOwned:['hasteSkill'],skillsEquipped:['hasteSkill'],
    skillsInherited:['hasteSkill'],skillLevels:'broken',skillXp:['bad'],lastSaved:Date.UTC(2026,10,12,0,0,0)});
  assert.equal(b.get('s.stage'),25);
  assert.equal(b.get('s.credits'),1234);
  assert.equal(b.get('s.skillsOwned.includes("bountySkill")'),true);
  assert.equal(b.get('s.skillsInherited.includes("bountySkill")'),true);
  assert.equal(b.get('s.skillLevels.bountySkill'),1);
});
test('offline settlement never auto-rebirths even when threshold is reached',()=>{
  const b=boot({stage:100,best:100,autoLevel:3,autoRebirth:true,rebirths:0,totalCores:0,
    lastSaved:Date.UTC(2026,10,12,0,0,0)});
  b.get('settleElapsed(2)');
  assert.equal(b.get('s.rebirths'),0);
});
test('hidden-tab resume settles elapsed time once and remains stable on immediate repeat',()=>{
  const b=boot({lastSaved:Date.UTC(2026,10,12,0,0,0)});
  b.document.hidden=true;b.listeners.visibilitychange();
  b.setNow(Date.UTC(2026,10,12,0,0,10));
  b.document.hidden=false;b.listeners.visibilitychange();
  const first=b.get('s.energy');
  assert.ok(first>=10);
  b.listeners.visibilitychange();
  assert.equal(b.get('s.energy'),first);
});
