'use strict';
/* Controlled, counterfactual phase-40 boss duration experiment.
 * Never alters a real player save, changes live engine or injects loot.
 * A candidate applies a one-time virtual reduction when the actual stage-40
 * encounter starts; only genuine 40 clears can grant the chest/cores. */
const assert=require('node:assert/strict'),E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118];
const MODES=['balanced','adaptive'],CANDIDATES=[0,.10,.20,.25];
function run(seed,mode,hpDiscount){
 const s=E.newState(1000000);s.seed=seed;
 assert.equal(E.setAutoBuy(s,mode,true),true);
 let first40=null,cleared40=null,discountApplied=false,first40Hp=null;
 let milestone30=null;
 for(let elapsed=1;elapsed<=2400;elapsed++){
  const before=s.stage;
  E.tick(s,1);
  if(!discountApplied&&s.stage===40){
   first40=elapsed;discountApplied=true;
   first40Hp=s.enemyHp;
   // Counterfactual at the EXACT start of the encounter. No attacks,
   // rewards, credit purchases, RNG or historical records are changed.
   s.enemyHp=Math.round(s.enemyHp*(1-hpDiscount));
  }
  if(cleared40===null&&before===40&&s.stage>40)cleared40=elapsed;
  if(elapsed%300===0)while(s.chests>0){
   const o=E.openChestBatch(s,20);
   assert.ok(o.results.length>0);
  }
  if(elapsed===1800)milestone30={
   stage:s.stage,enemyHpRatio:+(s.enemyHp/E.enemyMax(s.stage)).toFixed(3),
   relicKinds:E.RELICS.filter(r=>E.relic(s,r.id)>0).length,
   chestsOpened:s.chestsOpened,
   autoPurchases:s.autoBuy.purchases,
   coreIfReturned:E.rebirthGain(s),
   boss40Cleared:s.runMilestones[40]!==undefined
  };
 }
 assert.ok(first40!==null,'40 boss must be encountered naturally');
 assert.ok(first40Hp>0);
 assert.equal(s.rebirths,0,'first return is never forced');
 assert.equal(s.autoChest.enabled,false,'manual chest choice remains off');
 const reward40=cleared40!==null;
 assert.equal(reward40,s.runMilestones[40]!==undefined,'no fake 40 reward');
 return {seed,mode,hpDiscount,first40AtSeconds:first40,cleared40AtSeconds:cleared40,
  boss40FightSeconds:cleared40===null?null:cleared40-first40,
  first40Hp,minute30:milestone30,minute40:{stage:s.stage,
   relicKinds:E.RELICS.filter(r=>E.relic(s,r.id)>0).length,
   chestsOpened:s.chestsOpened,coreIfReturned:E.rebirthGain(s)},
  clearedBefore30:milestone30.boss40Cleared,
  earned40DepthChest:s.chestDepths.includes(40)||s.relicHistory.some(r=>r.depth===40)};
}
const trials=MODES.flatMap(mode=>SEEDS.flatMap(seed=>CANDIDATES.map(d=>run(seed,mode,d))));
assert.equal(trials.length,24);
const paired=[];
for(const mode of MODES)for(const seed of SEEDS){
 const set=trials.filter(x=>x.mode===mode&&x.seed===seed);
 const old=set[0];
 assert.equal(old.hpDiscount,0);
 for(const c of set.slice(1)){
  assert.equal(c.first40AtSeconds,old.first40AtSeconds,
   'candidate may not change pre-boss gameplay');
  assert.ok(c.minute30.stage>=old.minute30.stage,
   'candidate may not slow the initial first-run progress');
  assert.ok(c.minute40.stage>=old.minute40.stage,
   'candidate may not slow deeper progress within 40 minutes');
  paired.push({mode,seed,discount:c.hpDiscount,
   baselineBossFightSeconds:old.boss40FightSeconds,
   candidateBossFightSeconds:c.boss40FightSeconds,
   savedFightSeconds:old.boss40FightSeconds!==null&&c.boss40FightSeconds!==null?
    old.boss40FightSeconds-c.boss40FightSeconds:null,
   stageAt30Before:old.minute30.stage,stageAt30After:c.minute30.stage,
   cleared40By30Before:old.clearedBefore30,cleared40By30After:c.clearedBefore30,
   newRelicKindsBy30:c.minute30.relicKinds-old.minute30.relicKinds,
   chestOpensBy30:c.minute30.chestsOpened-old.minute30.chestsOpened,
   additionalCoreIfReturnedBy30:c.minute30.coreIfReturned-old.minute30.coreIfReturned});
 }
}
const summary=CANDIDATES.map(d=>{
 const cases=trials.filter(x=>x.hpDiscount===d);
 return {bossHpReductionPercent:Math.round(d*100),cases:cases.length,
  boss40ClearedBy30:cases.filter(x=>x.clearedBefore30).length,
  boss40ClearedBy40:cases.filter(x=>x.cleared40AtSeconds!==null).length,
  typicalFightMinutes:cases.map(x=>x.boss40FightSeconds===null?null:+(x.boss40FightSeconds/60).toFixed(1)),
  stageAt30:cases.map(x=>x.minute30.stage),
  first30RelicKinds:cases.map(x=>x.minute30.relicKinds)};
});
assert.ok(summary[0].boss40ClearedBy30===0,'baseline comparison must reproduce 30min gap');
console.log('STAGE40_CANDIDATE_COMPARISON '+JSON.stringify({
 experiment:'stage40-boss-first-run-counterfactual',synthetic:true,
 changesLiveGameplay:false,stage40BossRemainsBoss:true,
 scenarios:24,minutesPerScenario:40,seedCount:SEEDS.length,modes:MODES,
 noFreeChests:true,noForcedRebirth:true,
 note:'Trial discount changes virtual starting HP for stage 40 only. A release balance change requires an explicit versioned save migration, legacy-fight preservation and wide regression. Values are not user playtimes.',
 summary,paired}));
