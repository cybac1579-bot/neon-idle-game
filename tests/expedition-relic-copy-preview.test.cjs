'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const clone=s=>JSON.parse(JSON.stringify(s));
test('all sixteen next-copy previews are bounded, honest and read-only',()=>{
 const s=E.newState(1000),before=clone(s);
 for(const r of E.RELICS){
  assert.equal(s.relics[r.id],undefined);
  const first=E.nextRelicCopyPreview(s,r.id);
  assert.ok(first,'missing kind '+r.id);
  assert.equal(first.copies,0);
  assert.equal(first.cap,r.cap);
  if(r.cap>1){
   assert.equal(first.capped,false);
   assert.ok(Number.isFinite(first.from)&&Number.isFinite(first.to),r.id);
  }else assert.equal(first.unique,true);
  const owned=clone(s);owned.relics[r.id]=r.cap;
  const capped=E.nextRelicCopyPreview(owned,r.id);
  assert.equal(capped.capped,true);
  assert.equal(capped.copies,r.cap);
  assert.equal(capped.unique,r.cap===1);
 }
 assert.deepEqual(s,before,'previews must never change credit, save or RNG');
 assert.equal(E.nextRelicCopyPreview(s,'unknown'),null);
});
test('attack copy preview uses current formation and live DPS equation',()=>{
 const s=E.newState(1000);s.relics.ember=1;s.training=3;
 const expected=clone(s);expected.relics.ember=2;
 const before=clone(s),p=E.nextRelicCopyPreview(s,'ember');
 assert.equal(p.copies,1);
 assert.equal(p.label,'현재 편성 화력/초');
 assert.equal(p.from,+E.partyDps(s).toFixed(2));
 assert.equal(p.to,+E.partyDps(expected).toFixed(2));
 assert.ok(p.to>p.from);
 assert.deepEqual(s,before);
});
test('temporary context effects are not incorrectly labeled global battle bonuses',()=>{
 const s=E.newState(1000);
 s.relics.medkit=1;
 const recovery=E.nextRelicCopyPreview(s,'medkit');
 assert.match(recovery.context,/정비사가 배치된/);
 assert.equal(recovery.from,+Number(2.7*1.18).toFixed(2));
 assert.equal(recovery.to,+Number(2.7*1.36).toFixed(2));
 s.relics.scout=1;
 const xp=E.nextRelicCopyPreview(s,'scout');
 assert.match(xp.label,/경험치/);
 assert.equal(xp.from,15);assert.equal(xp.to,30);assert.equal(xp.unit,'%');
 s.relics.fortune=1;
 const credits=E.nextRelicCopyPreview(s,'fortune');
 assert.match(credits.context,/중복 수집/);
 assert.equal(credits.from,75);assert.equal(credits.to,150);
 s.relics.boss=1;
 const boss=E.nextRelicCopyPreview(s,'boss');
 assert.match(boss.context,/지휘급/);
 assert.equal(boss.from,14);assert.equal(boss.to,28);
});
test('recruit, training, guard HP and income previews derive from real current state',()=>{
 const s=E.newState(1000);
 s.training=5;s.units.guard=5;
 s.relics.enlist=1;s.relics.drill=1;s.relics.guard=1;s.relics.income=1;
 const metrics=[
  ['enlist',()=>E.hireCost(s)],
  ['drill',()=>E.trainCost(s)],
  ['guard',()=>E.maxHp(s)],
  ['income',()=>E.questIncome(s,E.QUESTS[0])]
 ];
 for(const [id,fn] of metrics){
  const p=E.nextRelicCopyPreview(s,id);
  assert.equal(p.from,+fn().toFixed(2));
  const after=clone(s);after.relics[id]++;
  const expected=id==='enlist'?E.hireCost(after):id==='drill'?E.trainCost(after):id==='guard'?E.maxHp(after):E.questIncome(after,E.QUESTS[0]);
  assert.equal(p.to,+expected.toFixed(2));
  if(['enlist','drill'].includes(id))assert.ok(p.to<=p.from);
  else assert.ok(p.to>=p.from);
 }
});
test('archer copies amplify third-shot volley and one-copy combos remain binary',()=>{
 const s=E.newState(1000);s.relics.archer=1;
 const preview=E.nextRelicCopyPreview(s,'archer');
 assert.equal(preview.from,45);assert.equal(preview.to,90);
 assert.match(preview.context,/척후사수/);
 const shot=copies=>{
  const f=E.newState(1000);
  f.stage=f.best=f.runBest=35;f.enemyHp=1e9;
  f.relics.archer=copies;
  f.units={guard:0,ranger:1,medic:0};
  f.actors=[{id:'ranger',hp:1e6,revive:0,progress:1,cooldown:0,shots:2}];
  E.tick(f,1);
  return {extra:f.relicEffects.volleyBonusDamage,volley:f.relicEffects.volleys};
 };
 const a=shot(1),b=shot(2);
 assert.equal(a.volley,1);assert.equal(b.volley,1);
 assert.ok(Math.abs(b.extra/a.extra-2)<1e-9);
});
