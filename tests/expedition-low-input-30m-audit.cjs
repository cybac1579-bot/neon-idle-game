'use strict';
// Real expedition engine, 30-minute low-input observation; no forced drops or returns.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../site/expedition-engine.js');
const seeds=[123456789,987654321,20261118];
const modes=['balanced','adaptive'];
const chestCadences=[60,300];
const results=[];
for(const mode of modes)for(const seed of seeds)for(const chestEvery of chestCadences){
 const s=E.newState(1000);s.seed=seed;
 assert.equal(E.setAutoBuy(s,mode,true),true);
 assert.equal(s.autoChest.enabled,false);
 let opened=0,manualActions=0,firstChest=null,firstRelic=null;
 let lastTenMinuteAutoBuys=0,lastTenMinuteChestDrops=0,lastTenMinuteStageAdvances=0,lastTenMinuteChestOpens=0;
 let stage40Seconds=0,stage40AutoBuys=0,stage40ChestDrops=0,stage40Start=null,stage40End=null;
 let lastChestDropAt=0,longestChestDropWait=0,chestDropEvents=[];
 const checkpoints=[];
 const milestones=[];
 let lastStage=s.stage,lastRelicCount=0,lastAdvanceAt=0,lastRewardAt=0;
 let longestStageWait=0,longestRewardWait=0,stageWaitAt=null,rewardWaitAt=null;
 const rewardEvents=[];
 for(let second=1;second<=1800;second++){
  const chestsBeforeTick=s.chests,stageBeforeTick=s.stage,autoBuysBeforeTick=s.autoBuy.purchases;
  if(stageBeforeTick===40){stage40Seconds++;if(stage40Start===null)stage40Start=second;}
  E.tick(s,1);
  if(stageBeforeTick===40){
   stage40AutoBuys+=Math.max(0,s.autoBuy.purchases-autoBuysBeforeTick);
   stage40ChestDrops+=Math.max(0,s.chests-chestsBeforeTick);
   if(s.stage>40&&stage40End===null)stage40End=second;
  }
  if(second>1200){
   lastTenMinuteAutoBuys+=Math.max(0,s.autoBuy.purchases-autoBuysBeforeTick);
   lastTenMinuteStageAdvances+=Math.max(0,s.stage-stageBeforeTick);
   lastTenMinuteChestDrops+=Math.max(0,s.chests-chestsBeforeTick);
  }
  if(s.chests>chestsBeforeTick){
   longestChestDropWait=Math.max(longestChestDropWait,second-lastChestDropAt);
   chestDropEvents.push({second,count:s.chests-chestsBeforeTick});lastChestDropAt=second;
  }
  if(s.stage>lastStage){
   if(second-lastAdvanceAt>longestStageWait){longestStageWait=second-lastAdvanceAt;stageWaitAt=lastStage;}
   milestones.push({second,stage:s.stage});lastStage=s.stage;lastAdvanceAt=second;
  }
  if(s.chests>0&&firstChest===null)firstChest=second;
  if(second%chestEvery===0){
   if(s.chests>0)manualActions++;
   while(s.chests>0){assert.ok(E.openChest(s));opened++;if(second>1200)lastTenMinuteChestOpens++;
    if(second-lastRewardAt>longestRewardWait){longestRewardWait=second-lastRewardAt;rewardWaitAt=second;}
    rewardEvents.push({second,kind:'chest-open'});lastRewardAt=second;
   }
  }
  const count=E.RELICS.filter(r=>E.relic(s,r.id)>0).length;
  if(count>lastRelicCount&&firstRelic===null)firstRelic=second;
  lastRelicCount=count;
  if(second%300===0)checkpoints.push({minute:second/60,stage:s.stage,credits:s.credits,chests:s.chests,opened,uniqueRelics:count,manualActions});
 }
 longestChestDropWait=Math.max(longestChestDropWait,1800-lastChestDropAt);
 if(1800-lastAdvanceAt>longestStageWait){longestStageWait=1800-lastAdvanceAt;stageWaitAt=lastStage;}
 if(1800-lastRewardAt>longestRewardWait){longestRewardWait=1800-lastRewardAt;rewardWaitAt=1800;}
 // Verify stage-40 counters are coherent before using them to justify balance changes.
 assert.ok(stage40Seconds>=0&&stage40Seconds<=1800);
 assert.ok(stage40AutoBuys>=0&&stage40ChestDrops>=0);
 assert.ok(stage40ChestDrops<=chestDropEvents.reduce((sum,e)=>sum+e.count,0));
 if(stage40Start!==null){
  assert.ok(stage40Start>=1&&stage40Start<=1800);
  if(stage40End!==null)assert.ok(stage40End>=stage40Start&&stage40End<=1800);
 }
 assert.equal(checkpoints.length,6);
 assert.ok(manualActions<=1800/chestEvery,'manual chest batches cannot exceed scheduled checks');
 assert.ok(milestones.every((x,i)=>i===0||x.second>=milestones[i-1].second));
 results.push({mode,seed,chestEvery,firstChest,firstRelic,opened,manualActions,
  finalStage:s.stage,uniqueRelics:lastRelicCount,stage40Seconds,stage40AutoBuys,stage40ChestDrops,stage40Start,stage40End,lastTenMinuteAutoBuys,lastTenMinuteChestDrops,lastTenMinuteStageAdvances,lastTenMinuteChestOpens,longestChestDropWait,chestDropEvents,longestStageWait,stageWaitAt,longestRewardWait,rewardWaitAt,rewardEvents,stageMilestones:milestones,checkpoints});
}
assert.equal(results.length,12);
// Keep a compact aggregate in the CI log, not only the downloadable JSON artifact.
const plateauSummary=results.map(r=>({mode:r.mode,seed:r.seed,chestEvery:r.chestEvery,stage40Seconds:r.stage40Seconds,stage40AutoBuys:r.stage40AutoBuys,stage40ChestDrops:r.stage40ChestDrops,stage40Start:r.stage40Start,stage40End:r.stage40End,finalStage:r.finalStage,lastTenMinuteChestDrops:r.lastTenMinuteChestDrops,lastTenMinuteChestOpens:r.lastTenMinuteChestOpens}));
console.log('STAGE40_ATTRIBUTION '+JSON.stringify(plateauSummary));
// Surface a compact, comparable 20–30 minute reward/progression window in CI.
// This is diagnostic telemetry, not evidence that waiting is intrinsically bad.
const tailWindow=results.map(r=>({
 mode:r.mode,seed:r.seed,chestEvery:r.chestEvery,
 stageAt20m:r.checkpoints[3].stage,stageAt30m:r.finalStage,
 stageAdvances:r.lastTenMinuteStageAdvances,
 autoBuys:r.lastTenMinuteAutoBuys,
 chestDrops:r.lastTenMinuteChestDrops,
 chestOpens:r.lastTenMinuteChestOpens,
 stage40Seconds:r.stage40Seconds,
 stage40AutoBuys:r.stage40AutoBuys,
 stage40ChestDrops:r.stage40ChestDrops
}));
assert.ok(tailWindow.every(r=>r.stageAt30m>=r.stageAt20m&&r.autoBuys>=0&&r.chestDrops>=0));
console.log('LOW_INPUT_20_30M_ATTRIBUTION '+JSON.stringify(tailWindow));
const output={experiment:'expedition-30m-low-input-cadence',synthetic:true,
 methodology:'Actual expedition engine, 1-second ticks, auto-buy enabled, chest batch every 60s or 300s, no forced drops/returns, 3 seeds x 2 auto-buy modes.',
 caveats:['No human or mobile device observations','Engine ticks are not frame-rate or offline lifecycle evidence','Chest opening is a scheduled manual action; no tapping combat','Chest drop gap tracks actual chest acquisition; reward gap tracks scheduled opening and is policy-dependent','Milestones represent stage advancement, not subjective enjoyment'],
 results};
const target=path.join(__dirname,'..','artifacts','expedition','low-input-30m.json');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify(output,null,2)+'\n');
console.log('LOW_INPUT_30M_SUMMARY '+JSON.stringify(results.map(({mode,seed,chestEvery,firstChest,firstRelic,opened,manualActions,finalStage,uniqueRelics,stage40Seconds,stage40AutoBuys,stage40ChestDrops,stage40Start,stage40End,longestChestDropWait,longestStageWait,stageWaitAt,longestRewardWait,lastTenMinuteAutoBuys,lastTenMinuteChestDrops,lastTenMinuteStageAdvances,lastTenMinuteChestOpens,checkpoints})=>({mode,seed,chestEvery,firstChest,firstRelic,opened,manualActions,finalStage,uniqueRelics,stage40Seconds,stage40AutoBuys,stage40ChestDrops,stage40Start,stage40End,longestChestDropWait,longestStageWait,stageWaitAt,longestRewardWait,lastTenMinuteAutoBuys,lastTenMinuteChestDrops,lastTenMinuteStageAdvances,lastTenMinuteChestOpens,checkpoints}))));
console.log('LOW_INPUT_30M_OUTPUT '+target);

// Controlled diagnostic only: reduce the first stage-40 enemy's *current* HP by 10%
// on entry. This is NOT a production balance change: later rally resets still use
// the original enemyMax(40), so the experiment is an upper-bound probe, not a
// faithful simulation of changing the permanent stage-40 HP multiplier.
const stage40Probe=[];
for(const baseline of results){
 const s=E.newState(1000);s.seed=baseline.seed;
 assert.equal(E.setAutoBuy(s,baseline.mode,true),true);
 let adjusted=false,entered40=false,first40Exit=null,stage40Seconds=0,opened=0;
 for(let second=1;second<=1800;second++){
  if(s.stage===40){
   entered40=true;stage40Seconds++;
   if(!adjusted){s.enemyHp=Math.max(1,Math.round(s.enemyHp*.9));adjusted=true;}
  }
  E.tick(s,1);
  if(entered40&&first40Exit===null&&s.stage>40)first40Exit=second;
  if(second%baseline.chestEvery===0){
   while(s.chests>0){assert.ok(E.openChest(s));opened++;}
  }
 }
 assert.equal(entered40,baseline.stage40Start!==null);
 stage40Probe.push({mode:baseline.mode,seed:baseline.seed,chestEvery:baseline.chestEvery,
  baselineStage:baseline.finalStage,probeStage:s.stage,
  baseline40Seconds:baseline.stage40Seconds,probe40Seconds:stage40Seconds,
  baseline40Exit:baseline.stage40End,probe40Exit:first40Exit,
  baselineOpened:baseline.opened,probeOpened:opened});
}
assert.equal(stage40Probe.length,12);
console.log('STAGE40_INITIAL_HP_10PCT_PROBE '+JSON.stringify({
 synthetic:true,notProductionBalance:true,
 limitation:'Only initial current HP is reduced once; any subsequent squad wipe resets full stage-40 HP. Not equivalent to changing enemyMax(40).',
 comparisons:stage40Probe
}));

// Extended 60-minute counterfactual: keep the exact same low-input policy and
// compare the one-time initial-HP probe with an untouched engine run.
// No automatic rebirth is triggered; this measures progression only, not
// first-rebirth timing. Never interpret this as a production HP multiplier.
const hourProbe=[];
for(const baseline of results){
 const pair=[];
 for(const reduceInitialHp of [false,true]){
  const s=E.newState(1000);s.seed=baseline.seed;
  assert.equal(E.setAutoBuy(s,baseline.mode,true),true);
  let entered40=false,adjusted=false,exit40=null,opened=0;
  for(let second=1;second<=3600;second++){
   if(s.stage===40){
    entered40=true;
    if(reduceInitialHp&&!adjusted){
     s.enemyHp=Math.max(1,Math.round(s.enemyHp*.9));adjusted=true;
    }
   }
   E.tick(s,1);
   if(entered40&&exit40===null&&s.stage>40)exit40=second;
   if(second%baseline.chestEvery===0){
    while(s.chests>0){assert.ok(E.openChest(s));opened++;}
   }
  }
  pair.push({reduceInitialHp,finalStage:s.stage,exit40,opened,entered40});
 }
 assert.equal(pair[0].entered40,pair[1].entered40);
 hourProbe.push({mode:baseline.mode,seed:baseline.seed,chestEvery:baseline.chestEvery,
  baseline:pair[0],probe:pair[1]});
}
assert.equal(hourProbe.length,12);
// Guard the diagnostic against accidental divergence: an initial-only HP
// adjustment cannot delay the stage-40 clear, and this fixed-seed experiment
// must not silently change the 60-minute reward/endpoint baseline.
for(const sample of hourProbe){
 assert.ok(sample.baseline.exit40!==null&&sample.probe.exit40!==null,
  '60m paired scenario must clear stage 40 in both arms');
 assert.ok(sample.probe.exit40<=sample.baseline.exit40,
  'initial HP reduction must not delay the stage-40 clear');
 assert.equal(sample.probe.finalStage,sample.baseline.finalStage,
  '60m endpoint drift requires explicit balance review');
 assert.equal(sample.probe.opened,sample.baseline.opened,
  '60m chest drift requires explicit reward review');
}
console.log('STAGE40_60M_GUARDS '+JSON.stringify({
 pairs:hourProbe.length,
 earlierOrEqual:hourProbe.filter(x=>x.probe.exit40<=x.baseline.exit40).length,
 stageParity:hourProbe.filter(x=>x.probe.finalStage===x.baseline.finalStage).length,
 chestParity:hourProbe.filter(x=>x.probe.opened===x.baseline.opened).length,
 caution:'Synthetic one-time current HP only; not a permanent max HP change or rebirth timing'
}));
console.log('STAGE40_INITIAL_HP_60M_COUNTERFACTUAL '+JSON.stringify({
 synthetic:true,notProductionBalance:true,notRebirthTiming:true,
 limitation:'Initial current HP reduced once only; wipe resets to original HP. No rebirth action, no human/mobile evidence.',
 comparisons:hourProbe
}));
