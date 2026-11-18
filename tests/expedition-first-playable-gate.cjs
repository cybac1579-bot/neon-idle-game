'use strict';
/* Technical FIRST-PLAYABLE acceptance for the separate expedition prototype.
 * Six seeded 30-minute low-touch runs, not a substitute for a human player.
 * Never constrains the player's chosen return timing or equates stage with fun. */
const assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118];
const MODES=['balanced','adaptive'];
const CHECKPOINTS=new Set([300,900,1800]);
const copy=value=>JSON.parse(JSON.stringify(value));
const kinds=s=>E.RELICS.filter(r=>E.relic(s,r.id)>0).length;
function firstThirty(seed,mode){
 const s=E.newState(1000000);s.seed=seed;
 assert.equal(E.setAutoBuy(s,mode,true),true);
 const moments=[];
 let playerCheckins=0,manualChestOpens=0;
 for(let sec=1;sec<=1800;sec++){
  E.tick(s,1);
  if(sec%300===0){
   playerCheckins++;
   while(s.chests>0){
    assert.ok(E.openChest(s));
    manualChestOpens++;
   }
  }
  if(CHECKPOINTS.has(sec))moments.push({
   elapsedSeconds:sec,stage:s.stage,credits:Math.round(s.credits),
   squad:s.actors.length,training:s.training,
   supplyLevels:Object.values(s.questLevels).reduce((a,b)=>a+b,0),
   relicKinds:kinds(s),chestsOpened:s.chestsOpened,
   autoBuys:s.autoBuy.purchases,coreIfReturned:E.rebirthGain(s)
  });
 }
 assert.equal(moments.length,3);
 assert.equal(playerCheckins,6,'one 5-minute chest check per visit; no tap attack');
 assert.equal(manualChestOpens,s.chestsOpened);
 assert.equal(s.runMetrics.manualPurchases,0,'no scripted manual growth clicks');
 assert.equal(s.rebirths,0,'no forced return during the evaluation');
 assert.equal(s.autoChest.enabled,false,'automatic chests remain opt-in');
 assert.ok(moments.every((x,i)=>i===0||x.stage>=moments[i-1].stage),'progress must not reverse');
 assert.ok(moments[2].stage>moments[0].stage,'the first half-hour cannot be an inert encounter');
 assert.ok(moments[2].squad>2&&moments[2].autoBuys>0,'opt-in growth must actually function');
 assert.ok(moments[2].relicKinds>0&&moments[2].chestsOpened>0,'earned collectibles must be obtainable');
 assert.ok(E.rebirthGain(s)>0,'voluntary return must be possible, not mandatory');
 const held={heroLevel:s.heroLevel,heroXp:s.heroXp,relics:copy(s.relics),best:s.best};
 const expected=E.rebirthGain(s),granted=E.rebirth(s);
 assert.equal(granted,expected);
 assert.equal(s.rebirths,1);
 assert.equal(s.stage,1);
 assert.equal(s.heroLevel,held.heroLevel);
 assert.equal(s.heroXp,held.heroXp);
 // Loaded/reborn saves normalize the relic catalog into explicit zero slots.
 // Compare ownership values, not sparse-vs-normalized object key shape.
 assert.deepEqual(E.RELICS.map(r=>E.relic(s,r.id)),
  E.RELICS.map(r=>held.relics[r.id]||0),'return cannot erase owned relics');
 assert.equal(s.best,held.best);
 assert.ok(s.cores>=expected);
 const restored=E.normalize(copy(s),2000000);
 assert.equal(restored.rebirths,1);
 assert.deepEqual(restored.relics,s.relics);
 assert.equal(restored.heroLevel,held.heroLevel);
 assert.equal(restored.latestReturn.cores,expected);
 return {seed,mode,checkIns:playerCheckins,manualGrowthClicks:0,
  actualRebirthAfterCheck:granted,checkpoints:moments};
}
const cases=MODES.flatMap(mode=>SEEDS.map(seed=>firstThirty(seed,mode)));
assert.equal(cases.length,6);
const byMode=Object.fromEntries(MODES.map(mode=>{
 const rows=cases.filter(x=>x.mode===mode);
 return [mode,{
  thirtyMinuteDistances:rows.map(x=>x.checkpoints[2].stage),
  firstFiveMinuteRelicKinds:rows.map(x=>x.checkpoints[0].relicKinds),
  thirtyMinuteRelicKinds:rows.map(x=>x.checkpoints[2].relicKinds),
  thirtyMinutePurchases:rows.map(x=>x.checkpoints[2].autoBuys)
 }];
}));
// Test the bounded two-hour offline settlement for the same independent
// engine. The test logs wall time but does not claim performance on Android.
const startedAt=1000000,now=startedAt+4*3600*1000;
const parked=E.newState(startedAt);
E.setAutoBuy(parked,'balanced',true);
const t0=performance.now();
const settled=E.offline(parked,now),settlementWallMs=performance.now()-t0;
const firstClock=parked.clock,firstStage=parked.stage;
assert.equal(settled,7200,'a 4-hour absence is capped at two hours');
assert.equal(firstClock,7200);
assert.equal(parked.playtest.offlineSeconds,7200);
assert.equal(parked.rebirths,0);
assert.equal(E.offline(parked,now),0,'a second identical resume does not duplicate progress');
assert.equal(parked.clock,firstClock);
const reloaded=E.normalize(copy(parked),now);
assert.equal(E.offline(reloaded,now),0,'save/reload must not double-settle');
assert.equal(reloaded.stage,firstStage);
assert.equal(reloaded.playtest.offlineSeconds,7200);
assert.ok(Number.isFinite(settlementWallMs));
console.log(JSON.stringify({
 gate:'expedition-first-playable-technical-check',
 synthetic:true,devicePlayVerified:false,humanFunVerified:false,
 source:'current expedition engine, seeded deterministic check-ins',
 checkInsEverySeconds:300,
 voluntaryReturnAfterEvaluationOnly:true,
 noForcedReturn:true,
 firstReturnAt60MinutesVerified:false,
 automationOptIn:true,
 modes:byMode,cases,
 offline:{absenceSeconds:14400,settledSeconds:settled,secondSettlementSeconds:0,
  nodeWallMs:Math.round(settlementWallMs),stageAfter:firstStage},
 outcome:'technical assertions passed; actual Galaxy S25+ 30-minute play still required'
}));
