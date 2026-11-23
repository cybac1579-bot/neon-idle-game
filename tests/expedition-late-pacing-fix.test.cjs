'use strict';
/* Root-cause fix for late-stage purchase starvation and exponential HP walls.
 * Preserve user-selected strict saving, original opening, old saves and cores. */
const test=require('node:test'),assert=require('node:assert/strict'),E=require('../site/expedition-engine.js');
function state(){const s=E.newState(1000);s.stage=s.best=s.runBest=40;s.enemyHp=1e12;return s;}
test('balanced and strict reserve stay distinct, valid persisted preferences',()=>{
 const s=E.newState(1000);assert.equal(s.autoBuy.mode,'balanced');assert.equal(s.autoBuy.enabled,false);
 assert.equal(E.BALANCED_SAVING_HORIZON_SECONDS,240);
 assert.equal(E.BALANCED_FALLBACK_BUDGET_RATIO,.35);
 assert.equal(E.setAutoBuy(s,'reserve',true),true);
 const saved=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.equal(saved.autoBuy.mode,'reserve');assert.equal(saved.autoBuy.enabled,true);
 assert.equal(E.setAutoBuy(saved,'balanced',true),true);
 assert.equal(E.normalize(saved,3000).autoBuy.mode,'balanced');
 const old=E.newState(1000);delete old.autoBuy;assert.equal(E.normalize(old,2000).autoBuy.enabled,false);
});
test('balanced still saves for affordable-in-4min high-grade quest',()=>{
 const s=state();s.credits=100;s.autoBuy.cursor=2;
 assert.ok(E.setAutoBuy(s,'balanced',true));s.autoBuy.cursor=2;
 const target=E.autoTarget(s);
 assert.equal(target.kind,'supply');assert.equal(target.id,'contract');
 assert.ok(target.cost>s.credits);
 E.tick(s,4);assert.equal(s.autoBuy.purchases,0);
});
test('balanced no longer starves affordable training when high-grade quest takes hours',()=>{
 const s=state();s.questLevels.contract=12;s.credits=100;
 E.setAutoBuy(s,'balanced',true);s.autoBuy.cursor=2;
 assert.equal(E.autoTarget(s).kind,'train');
 const before=s.credits;
 E.tick(s,4);
 assert.equal(s.training,1);assert.equal(s.autoBuy.purchases,1);
 assert.equal(s.autoBuy.cursor,1,'actual purchased training drives next category');
 assert.ok(s.credits<before);
 assert.equal(s.questLevels.contract,12,'no lower-grade supply bypass');
});
test('fallback respects 35% preferred-cost budget and can pick affordable recruitment',()=>{
 const s=state();s.questLevels.contract=8;s.training=22;s.credits=1000;
 E.setAutoBuy(s,'balanced',true);s.autoBuy.cursor=2;
 const t=E.autoTarget(s);
 assert.equal(t.kind,'recruit');
 assert.ok(t.cost<=E.questCost(s,E.QUESTS[2])*E.BALANCED_FALLBACK_BUDGET_RATIO);
 const before=s.actors.length;E.tick(s,4);assert.equal(s.actors.length,before+1);
 assert.equal(s.autoBuy.cursor,2,'recruit purchase rotates back to supply');
});
test('explicit reserve reproduces original long-saving cycle without silent fallback',()=>{
 const s=state();s.questLevels.contract=12;s.credits=100;
 E.setAutoBuy(s,'reserve',true);s.autoBuy.cursor=2;
 assert.deepEqual(E.autoTarget(s),{kind:'supply',id:'contract',cost:E.questCost(s,E.QUESTS[2])});
 E.tick(s,4);
 assert.equal(s.autoBuy.purchases,0);assert.equal(s.training,0);
 assert.equal(s.autoBuy.cursor,2);
 s.credits=1e9;s.autoBuy.cursor=0;
 E.tick(s,4);assert.equal(s.training,1);assert.equal(s.autoBuy.cursor,1);
 E.tick(s,4);assert.equal(s.actors.length,3);assert.equal(s.autoBuy.cursor,2);
 E.tick(s,4);assert.equal(s.questLevels.contract,13);assert.equal(s.autoBuy.cursor,0);
});
test('balanced and reserve never downgrade unlocked supply grade',()=>{
 for(const mode of ['balanced','reserve','adaptive','supply']){
  const s=state();s.questLevels.contract=10;s.credits=1e9;
  E.setAutoBuy(s,mode,true);s.autoBuy.cursor=2;
  const chosen=E.autoTarget(s);
  assert.equal(chosen.kind,'supply');assert.equal(chosen.id,'contract');
  E.tick(s,4);assert.equal(s.questLevels.dispatch,0);assert.equal(s.questLevels.salvage,0);
 }
});
test('enemy HP unchanged through 39; isolated 40 boss trims 10% without a late wall',()=>{
 const prior=stage=>Math.min(1e13,Math.round((stage%10===0?3.8:stage%5===0?2:1)*13*Math.pow(1.235,Math.min(stage-1,100))));
 for(const stage of [1,5,10,25,35,39])assert.equal(E.enemyMax(stage),prior(stage));
 assert.equal(E.enemyMax(40),Math.round(prior(40)*.9),'depth40 boss is selectively eased');
 assert.ok(E.enemyMax(50)<prior(50));
 assert.ok(E.enemyMax(50)>E.enemyMax(49)*2,'50 boss remains a stronger target');
 const ratio=E.enemyMax(42)/E.enemyMax(41);
 assert.ok(ratio>1.17&&ratio<1.19,'late ordinary enemies still grow by about 18%');
});
test('balanced fallback and post40 smoothing never open chests, spend cores or auto-rebirth',()=>{
 const s=state();s.questLevels.contract=12;s.credits=1000;s.chests=2;s.chestDepths=[35,40];s.cores=15;
 E.setAutoBuy(s,'balanced',true);s.autoBuy.cursor=2;E.tick(s,4);
 assert.equal(s.chests,2);assert.deepEqual(s.chestDepths,[35,40]);
 assert.equal(s.cores,15);assert.equal(s.rebirths,0);assert.equal(s.coreUpgrades.valor,0);
});
