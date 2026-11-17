'use strict';
/* Deep 40/45 relic collection and permanent economy: non-intrusive to earlier levels. */
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
function chest(depth,seed=123456789){
 const s=E.newState(1000);s.seed=seed;s.chests=1;s.chestDepths=[depth];return s;
}
test('40 and 45 have separate newly discovered permanent cost relics',()=>{
 assert.equal(E.RELICS.length,15);
 assert.equal(E.RELICS.find(r=>r.id==='enlist').unlockStage,40);
 assert.equal(E.RELICS.find(r=>r.id==='drill').unlockStage,45);
 assert.ok(E.RELICS.filter(r=>r.unlockStage<=30).length===12);
 for(const [depth,expected] of [[40,'enlist'],[45,'drill']]){
  const s=chest(depth);
  const item=E.openChest(s);
  assert.equal(item.id,expected);
  assert.equal(item.duplicate,false);
  assert.equal(item.depth,depth);
 }
});
test('old 5..30 chest depths cannot leak later items regardless of current stage',()=>{
 for(const depth of [5,10,15,20,25,30]){
  for(let seed=1;seed<=15;seed++){
   const s=chest(depth,seed);s.stage=99;s.best=s.runBest=99;
   const result=E.openChest(s);
   assert.ok(!result.id||E.RELICS.find(r=>r.id===result.id).unlockStage<=depth);
  }
 }
});
test('legacy unknown depth keeps the old 12-item unrestricted pool, not new items',()=>{
 const old=E.newState(1000);old.chests=30;delete old.chestDepths;
 const restored=E.normalize(JSON.parse(JSON.stringify(old)),2000);
 assert.deepEqual(restored.chestDepths,Array(30).fill(0));
 const open1=E.openChestBatch(restored,20),open2=E.openChestBatch(restored,20);
 assert.equal(open1.results.length+open2.results.length,30);
 assert.ok([...open1.results,...open2.results].every(x=>!x.id||E.RELICS.find(r=>r.id===x.id).unlockStage<=30));
});
test('old save without two new relic keys defaults them to zero, preserving old power',()=>{
 const old=E.newState(1000);delete old.relics.enlist;delete old.relics.drill;
 const loaded=E.normalize(JSON.parse(JSON.stringify(old)),2000);
 assert.equal(loaded.relics.enlist,0);
 assert.equal(loaded.relics.drill,0);
 assert.equal(E.hireCost(loaded),E.hireCost(E.newState(1000)));
 assert.equal(E.trainCost(loaded),E.trainCost(E.newState(1000)));
});
test('economic bonuses reduce only their associated run upgrade costs',()=>{
 const s=E.newState(1000);
 const hire=E.hireCost(s),train=E.trainCost(s);
 s.relics.enlist=1;
 assert.ok(E.hireCost(s)<hire);
 assert.equal(E.trainCost(s),train);
 const once=E.hireCost(s);
 s.relics.enlist=3;
 assert.ok(E.hireCost(s)<once);
 s.relics.drill=1;
 assert.ok(E.trainCost(s)<train);
 const t1=E.trainCost(s);
 s.relics.drill=3;
 assert.ok(E.trainCost(s)<t1);
 assert.ok(E.permanentBonuses(s).hireCost<1);
 assert.ok(E.permanentBonuses(s).trainCost<1);
});
test('deep relic cost discounts persist after saving and rebirth',()=>{
 const s=chest(40);E.openChest(s);
 s.chests=1;s.chestDepths=[45];E.openChest(s);
 const oldCost={hire:E.hireCost(s),train:E.trainCost(s)};
 s.runBest=s.stage=s.best=46;
 assert.ok(E.rebirth(s)>=1);
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.equal(loaded.relics.enlist,1);
 assert.equal(loaded.relics.drill,1);
 assert.deepEqual({hire:E.hireCost(loaded),train:E.trainCost(loaded)},oldCost);
 assert.equal(loaded.runMilestones[40],undefined,'new run has no phantom clear times');
});
test('deep chest FIFO is pinned to earned distance, not later opening',()=>{
 const s=E.newState(1000);s.chests=4;s.chestDepths=[5,30,40,45];s.stage=99;
 const results=E.openChestBatch(s,20).results;
 assert.deepEqual(results.map(x=>x.depth),[5,30,40,45]);
 assert.equal(results[2].id,'enlist');
 assert.equal(results[3].id,'drill');
 assert.deepEqual(s.chestDepths,[]);
});
test('relic collection does not automatically enable auto-buy or spend core currency',()=>{
 const s=chest(45);s.cores=4;
 const initial=E.newState(1000);
 assert.equal(s.autoBuy.enabled,false);
 E.openChest(s);
 assert.equal(s.autoBuy.enabled,false);
 assert.equal(s.cores,4);
 assert.equal(s.rebirths,0);
 assert.equal(E.partyDps(s),E.partyDps(initial));
 assert.equal(E.questIncome(s,E.QUESTS[0]),E.questIncome(initial,E.QUESTS[0]));
});
