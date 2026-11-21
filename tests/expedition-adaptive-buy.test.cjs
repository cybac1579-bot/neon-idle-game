'use strict';
// Adaptive auto-buy is optional; pre-existing balanced and category-only modes
// retain their saving behavior. Supply never falls back to lower-grade quests.
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
function fixed(){
 const s=E.newState(1000);s.stage=s.best=s.runBest=12;
 s.enemyHp=1e12;return s;
}
test('adaptive mode remains opt-in and loadable without changing legacy default',()=>{
 const fresh=E.newState(1000);
 assert.equal(fresh.autoBuy.mode,'balanced');
 assert.equal(fresh.autoBuy.enabled,false);
 assert.ok(E.setAutoBuy(fresh,'adaptive',true));
 const restored=E.normalize(JSON.parse(JSON.stringify(fresh)),2000);
 assert.equal(restored.autoBuy.mode,'adaptive');
 assert.equal(restored.autoBuy.enabled,true);
 const legacy=E.newState(1000);delete legacy.autoBuy;
 assert.equal(E.normalize(legacy,2000).autoBuy.enabled,false);
});
test('adaptive skips unaffordable training in favor of affordable recruit',()=>{
 const s=fixed();s.credits=30;E.setAutoBuy(s,'adaptive',true);
 assert.equal(E.autoTarget(s).kind,'recruit');
 const existing=s.actors.length;
 E.tick(s,4);
 assert.equal(s.actors.length,existing+1);
 assert.equal(s.training,0);
 assert.equal(s.autoBuy.cursor,2,'cursor follows actual purchased category');
 assert.equal(s.autoBuy.purchases,1);
 assert.equal(s.runMetrics.manualPurchases,0);
});
test('adaptive supply grade stays the highest unlocked even if lower grade is affordable',()=>{
 const s=fixed();s.credits=100;s.autoBuy.cursor=2;
 E.setAutoBuy(s,'adaptive',true);s.autoBuy.cursor=2;
 const target=E.autoTarget(s);
 assert.equal(target.kind,'train','unaffordable highest supply, choose other growth category');
 assert.equal(s.questLevels.dispatch,0);
 assert.equal(s.questLevels.salvage,0);
 assert.equal(s.questLevels.contract,0);
 s.credits=1000;s.autoBuy.cursor=2;
 assert.deepEqual(E.autoTarget(s),{kind:'supply',id:'contract',cost:E.questCost(s,E.QUESTS[2])});
 E.tick(s,4);
 assert.equal(s.questLevels.contract,1);
 assert.equal(s.questLevels.dispatch,0);
 assert.equal(s.questLevels.salvage,0);
});
test('adaptive saves toward preferred type if nothing is affordable',()=>{
 const s=fixed();s.credits=0;E.setAutoBuy(s,'adaptive',true);
 const target=E.autoTarget(s);
 assert.equal(target.kind,'train');
 const priorCursor=s.autoBuy.cursor;
 E.tick(s,4);
 assert.equal(s.autoBuy.purchases,0);
 assert.equal(s.autoBuy.cursor,priorCursor);
});
test('fixed balanced still waits for an expensive selected high-grade quest',()=>{
 const s=fixed();s.credits=100;E.setAutoBuy(s,'balanced',true);s.autoBuy.cursor=2;
 const target=E.autoTarget(s);
 assert.equal(target.id,'contract');
 assert.ok(target.cost>s.credits);
 E.tick(s,4);
 assert.equal(s.autoBuy.purchases,0);
 assert.equal(s.training,0);
 assert.equal(s.actors.length,2);
});
test('exclusive modes still buy only their selected category',()=>{
 for(const mode of ['train','recruit','supply']){
  const s=fixed();s.credits=10000;E.setAutoBuy(s,mode,true);
  E.tick(s,4);
  assert.equal(s.autoBuy.purchases,1);
  if(mode!=='train')assert.equal(s.training,0);
  if(mode!=='recruit')assert.equal(s.actors.length,2);
  if(mode!=='supply')assert.equal(s.questLevels.contract,0);
 }
});
test('adaptive mode does not open chests, spend cores or rebirth',()=>{
 const s=fixed();s.credits=1000;s.chests=2;s.chestDepths=[5,10];s.cores=5;
 E.setAutoBuy(s,'adaptive',true);E.tick(s,4);
 assert.equal(s.chests,2);
 assert.deepEqual(s.chestDepths,[5,10]);
 assert.equal(s.cores,5);
 assert.equal(s.rebirths,0);
});
test('adaptive mode selection can be changed back to old saving behavior',()=>{
 const s=fixed();s.credits=100;
 E.setAutoBuy(s,'adaptive',true);
 assert.equal(E.autoTarget(s).kind,'train');
 E.setAutoBuy(s,'balanced',true);s.autoBuy.cursor=2;
 assert.equal(E.autoTarget(s).id,'contract');
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.equal(loaded.autoBuy.mode,'balanced');
});
