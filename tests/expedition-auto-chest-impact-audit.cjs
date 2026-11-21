'use strict';
/* Opt-in chest collection is a convenience strategy, not a guaranteed buff.
 * Compare earned depth5..45 loot under real 60s auto-batches versus player
 * opening once per 300 seconds (+ immediately before a planned return).
 * A chosen return at 25 and core investment are manual, with no combat taps.
 * Preserve exact automation state/time and original RNG rules. */
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118,314159265,271828182,
 135791357,246802468,44444444,7654321,111333555,987456321,20261119];
const MODES=['balanced','adaptive'];
const MAX_SECONDS=12000;
function play(seed,mode,autoChest,returnAfter){
 const s=E.newState(1000);s.seed=seed;
 assert.equal(E.setAutoBuy(s,mode,true),true);
 assert.equal(E.setAutoChest(s,autoChest),true);
 let manualOpens=0,automaticPriorRun=0,returnAt=null,returnCount=0;
 function manual(){while(s.chests>0){assert.ok(E.openChest(s));manualOpens++;}}
 for(let sec=1;sec<=MAX_SECONDS;sec++){
  E.tick(s,1);
  if(!autoChest&&sec%300===0)manual();
  if(returnAfter>0&&returnAt===null&&s.stage>returnAfter&&E.rebirthGain(s)>0){
   if(!autoChest)manual();
   automaticPriorRun+=s.autoChest.opened;
   assert.ok(E.rebirth(s)>0);
   let invested=0;while(E.buyCore(s,'valor'))invested++;
   assert.ok(invested>0);
   returnAt=sec;returnCount++;
   assert.equal(s.autoChest.enabled,autoChest);
  }
  if(s.stage>45){
   const finalAuto=s.autoChest.opened;
   manual(); // final observation: reward inventory count, not elapsed benefit
   return {seed,mode,autoChest,returnAfter,clear45Seconds:sec,
    returnAt,manualOpens,autoOpens:automaticPriorRun+finalAuto,
    totalOpens:manualOpens+automaticPriorRun+finalAuto,
    relicKinds:E.RELICS.filter(r=>E.relic(s,r.id)>0).length,
    coreValor:s.coreUpgrades.valor,rewardCores:E.rebirthGain(s),
    returnCount};
  }
 }
 throw Error('Distance45 unreachable: '+JSON.stringify({seed,mode,autoChest,returnAfter}));
}
const pairs=[];
for(const mode of MODES)for(const seed of SEEDS)for(const returnAfter of [0,25]){
 const manual=play(seed,mode,false,returnAfter);
 const automatic=play(seed,mode,true,returnAfter);
 assert.equal(manual.returnCount,returnAfter===0?0:1);
 assert.equal(automatic.returnCount,manual.returnCount);
 assert.equal(manual.autoOpens,0);
 assert.ok(automatic.manualOpens===0||automatic.manualOpens===1,
  'auto chest timing may leave zero or one pending chest at the final checkpoint');
 assert.equal(manual.totalOpens,returnAfter===0?9:14);
 assert.equal(automatic.totalOpens,manual.totalOpens,
  'both strategies must earn exactly the same count of stage5 boxes');
 assert.ok(automatic.autoOpens>0);
 assert.equal(automatic.coreValor,manual.coreValor,'opt-in auto loot never changes direct core investment');
 const pct=+(100*(manual.clear45Seconds-automatic.clear45Seconds)/manual.clear45Seconds).toFixed(1);
 assert.ok(Math.abs(pct)<=30,'auto chest has become an extreme >30% speed changer: '+JSON.stringify({seed,mode,returnAfter,pct}));
 pairs.push({seed,mode,returnAfter,
  manualSeconds:manual.clear45Seconds,autoSeconds:automatic.clear45Seconds,
  autoVsManualPercent:pct,
  manualOpens:manual.manualOpens,automaticOpens:automatic.autoOpens,
  automaticFinalManualOpens:automatic.manualOpens,
  totalEarnedBoxes:manual.totalOpens,
  manualRelicKinds:manual.relicKinds,autoRelicKinds:automatic.relicKinds,
  manualReturnAt:manual.returnAt,autoReturnAt:automatic.returnAt});
}
const summary=[0,25].map(route=>{
 const v=pairs.filter(r=>r.returnAfter===route);
 return {returnAfter:route,pairs:v.length,
  faster:v.filter(x=>x.autoVsManualPercent>0).length,
  slower:v.filter(x=>x.autoVsManualPercent<0).length,
  averagePercent:+(v.reduce((sum,x)=>sum+x.autoVsManualPercent,0)/v.length).toFixed(1),
  minPercent:Math.min(...v.map(x=>x.autoVsManualPercent)),
  maxPercent:Math.max(...v.map(x=>x.autoVsManualPercent))};
});
assert.equal(pairs.length,48);
console.log(JSON.stringify({experiment:'optional-auto-chest-vs-low-input-manual',
 synthetic:true,autoReturn:false,autoCoreSpend:false,
 note:'48 matched pairs (96 simulated runs), 12 seeds × two player-selected purchase policies × no return or one distance25 manual return × 60-second auto chest vs 5-minute manual check-ins. There is no time-gated return and never any auto-rebirth.',
 summary,pairs}));
