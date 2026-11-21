'use strict';
/* Read-only first-playable 30-minute stall audit.
 * Test uses real expedition engine, earned loot, opt-in buying and manual
 * five-minute visits. This is not a fun score or actual Android test. */
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118],MODES=['balanced','adaptive'];
function simulate(seed,mode){
 const s=E.newState(1000000);s.seed=seed;
 assert.equal(E.setAutoBuy(s,mode,true),true);
 const checkpoints=[],firstStageArrival={};
 let lastStage=s.stage,lastAdvance=0,lastPurchase=0,lastChestOpen=0;
 let lastBuyCount=0,lastChestCount=0,mostUnchangedSeconds=0;
 for(let sec=1;sec<=1800;sec++){
  E.tick(s,1);
  if(s.stage!==lastStage){
   for(let stage=lastStage+1;stage<=s.stage;stage++)firstStageArrival[stage]??=sec;
   lastStage=s.stage;lastAdvance=sec;
  }
  if(s.autoBuy.purchases!==lastBuyCount){lastBuyCount=s.autoBuy.purchases;lastPurchase=sec;}
  if(sec%300===0){
   while(s.chests>0){
    const reward=E.openChestBatch(s,20);
    assert.ok(reward.results.length>0);
    lastChestOpen=sec;
   }
  }
  if(s.chestsOpened!==lastChestCount){lastChestCount=s.chestsOpened;}
  mostUnchangedSeconds=Math.max(mostUnchangedSeconds,sec-lastAdvance);
  if(sec%60===0){
   checkpoints.push({
    minute:sec/60,stage:s.stage,
    stageWaitSeconds:sec-lastAdvance,
    combatSeconds:s.engagement?.stage===s.stage?Math.round(s.engagement.seconds):null,
    enemyRemainingPercent:+(100*Math.min(s.enemyHp,E.enemyMax(s.stage))/E.enemyMax(s.stage)).toFixed(1),
    autoPurchases:s.autoBuy.purchases,
    firstRelicKinds:E.RELICS.filter(r=>E.relic(s,r.id)>0).length,
    openedChests:s.chestsOpened
   });
  }
 }
 assert.equal(checkpoints.length,30);
 assert.equal(s.rebirths,0,'every return is voluntary');
 assert.equal(s.autoChest.enabled,false,'automatic chest opening is opt-in');
 const late=checkpoints.slice(19),advance=late.at(-1).stage-late[0].stage;
 const purchases=late.at(-1).autoPurchases-late[0].autoPurchases;
 const chestOpens=late.at(-1).openedChests-late[0].openedChests;
 const finish=checkpoints.at(-1);
 const summary={seed,mode,
  reached40AtSeconds:firstStageArrival[40]??null,
  finalStage:finish.stage,
  finalStageWaitSeconds:finish.stageWaitSeconds,
  finalEnemyHpPercent:finish.enemyRemainingPercent,
  maxTimeWithoutNewStage:mostUnchangedSeconds,
  first15MinuteStage:checkpoints[14].stage,
  last10MinuteStagesAdvanced:advance,
  last10MinuteAutoPurchases:purchases,
  last10MinuteChestsOpened:chestOpens,
  lastPurchasedAtSeconds:lastPurchase,
  lastChestOpenedAtSeconds:lastChestOpen,
  checkpoints};
 assert.ok(summary.last10MinuteStagesAdvanced>=0);
 assert.ok(summary.last10MinuteAutoPurchases>=0);
 assert.ok(summary.last10MinuteChestsOpened>=0);
 return summary;
}
const runs=MODES.flatMap(mode=>SEEDS.map(seed=>simulate(seed,mode)));
assert.equal(runs.length,6);
const overview={
 experiment:'first-playable-30m-stall-risk',synthetic:true,
 noAutoReturn:true,autoBuyOptIn:true,chestsCheckedEverySeconds:300,
 humanFunVerified:false,realDeviceVerified:false,
 warnings:runs.filter(r=>r.finalStageWaitSeconds>=600).map(r=>({
  seed:r.seed,mode:r.mode,stage:r.finalStage,waitSeconds:r.finalStageWaitSeconds,
  enemyHpRemaining:r.finalEnemyHpPercent,
  growthPurchasesInLast10m:r.last10MinuteAutoPurchases,
  chestOpensInLast10m:r.last10MinuteChestsOpened
 })),
 cases:runs.map(({checkpoints,...x})=>x)
};
console.log('FIRST_PLAYABLE_STALL_RISK '+JSON.stringify(overview));
console.log('FIRST_PLAYABLE_STALL_TIMELINES '+JSON.stringify(runs));
