'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const copy=x=>JSON.parse(JSON.stringify(x));
function prepared(stage,owned=true){
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=stage;
 s.enemyTactic.stage=stage;s.enemyTactic.kind=E.enemyKind(stage);
 s.enemyHp=Math.ceil(E.enemyMax(stage)*.75)+1;
 if(owned)s.relics.diagram=1;
 for(const a of s.actors){a.hp=1e8;a.progress=1;a.cooldown=0;}
 return s;
}
test('a real source-65 chest guarantees the new one-off diagram and no free chest',()=>{
 const s=E.newState(1000);
 assert.equal(E.relic(s,'diagram'),0);
 s.stage=s.best=s.runBest=65;s.enemyHp=.01;
 s.enemyTactic.stage=65;s.enemyTactic.kind=E.enemyKind(65);
 for(const a of s.actors){a.progress=1;a.cooldown=0;}
 E.tick(s,1);
 assert.equal(s.chests,1);assert.deepEqual(s.chestDepths,[65]);
 assert.equal(E.relic(s,'diagram'),0,'earned unopened chest does not auto-open');
 const choice=E.returnChoiceSnapshot(s);
 assert.equal(choice.guaranteedFirstDiscovery,true);
 assert.ok(choice.pendingNewKinds>=1);
 const found=E.openChest(s);
 assert.equal(found.id,'diagram');assert.equal(found.duplicate,false);
 assert.equal(found.depth,65);assert.equal(E.relic(s,'diagram'),1);
 assert.equal(s.chests,0);
});
test('earlier chest provenance cannot yield the depth65 item',()=>{
 for(const depth of [0,5,15,25,30,40,45,50,55])for(let seed=1;seed<=20;seed++){
  const s=E.newState(1000);
  s.seed=seed;s.chests=1;s.chestDepths=[depth];
  const got=E.openChest(s);
  assert.notEqual(got.id,'diagram');
  assert.equal(E.relic(s,'diagram'),0);
 }
});
test('deep boss and deep elite weak points cause exactly one bounded real strike',()=>{
 for(const stage of [70,75,80,85]){
  const a=prepared(stage),b=prepared(stage,false);
  E.tick(a,1);E.tick(b,1);
  const strike=E.enemyMax(stage)*.06;
  assert.ok(Math.abs((b.enemyHp-a.enemyHp)-strike)<2,'real HP difference at '+stage);
  assert.equal(a.relicEffects.diagrams,1);
  assert.ok(Math.abs(a.relicEffects.diagramDamage-strike)<2);
  assert.equal(a.enemyTactic.diagramTriggered,true);
  assert.equal(a.battleEvent.type,'diagram');
  E.tick(a,10);
  assert.equal(a.relicEffects.diagrams,1,'no second hit in the same fight');
 }
});
test('deep weak-point action does not change stage65, stage69, or an early boss',()=>{
 for(const stage of [50,60,65,69]){
  const a=prepared(stage),b=prepared(stage,false);
  E.tick(a,1);E.tick(b,1);
  assert.equal(a.enemyHp,b.enemyHp,'early enemy HP unchanged '+stage);
  assert.equal(a.relicEffects.diagrams,0);
 }
 const a=prepared(70);a.enemyHp=E.enemyMax(70)*.9;
 E.tick(a,1);
 assert.equal(a.relicEffects.diagrams,0,'no instant proc before 75% HP');
});
test('the earned action respects one-time save/reload and retains battle cue',()=>{
 const s=prepared(70);E.tick(s,1);
 const before=s.enemyHp;
 const saved=E.normalize(copy(s),2000);
 assert.equal(saved.enemyHp,before);
 assert.equal(saved.enemyTactic.diagramTriggered,true);
 assert.equal(saved.battleEvent.type,'diagram');
 assert.equal(saved.relicEffects.diagrams,1);
 assert.equal(saved.relicEffects.diagramDamage,s.relicEffects.diagramDamage);
 const again=E.normalize(copy(saved),3000);
 assert.equal(again.enemyHp,saved.enemyHp);
 E.tick(again,10);
 assert.equal(again.relicEffects.diagrams,1,'reloading never grants a second strike');
});
test('deep diagram reward cannot mint cores or buy units and survives voluntary return',()=>{
 const s=prepared(70);const ordinary=prepared(70,false);
 E.tick(s,1);E.tick(ordinary,1);
 for(const key of ['chests','credits','coreProgress','cores','rebirths'])
  assert.equal(s[key],ordinary[key],key+' cannot be gifted by diagram');
 assert.deepEqual(s.units,ordinary.units);
 assert.equal(E.relic(s,'diagram'),1);
 assert.ok(E.rebirth(s)>0);
 assert.equal(s.relicEffects.diagrams,0);
 assert.equal(s.relicEffects.diagramDamage,0);
 assert.equal(s.latestReturn.relicEffects.diagrams,1);
 assert.ok(s.latestReturn.relicEffects.diagramDamage>0);
 assert.equal(E.relic(s,'diagram'),1);
 const saved=E.normalize(copy(s),3000);
 assert.equal(E.relic(saved,'diagram'),1);
 assert.equal(saved.latestReturn.relicEffects.diagrams,1);
});
test('older saves without diagram counters or trigger cannot invent historical events',()=>{
 const old=E.newState(1000);delete old.relicEffects.diagrams;
 delete old.relicEffects.diagramDamage;delete old.enemyTactic.diagramTriggered;
 const saved=E.normalize(copy(old),2000);
 assert.equal(saved.relicEffects.diagrams,0);
 assert.equal(saved.relicEffects.diagramDamage,0);
 assert.equal(saved.enemyTactic.diagramTriggered,false);
 assert.equal(E.relic(saved,'diagram'),0);
});
