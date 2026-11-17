'use strict';
/* Independent scripted efficiency probe; not an assertion of player behavior.
 * A rebirth decision is always manual, as is chest opening. Automatic upgrades
 * are opt-in. Targets are CLEARED stages, not the current enemy stage.
 * We compare early and deeper return targets over the same clock. */
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const TARGETS=[10,15,20,25,30,35],SEEDS=[123456789,987654321,20261118];
const TOTAL_SECONDS=3600;
const beforeBoss=E.newState(1000000),afterBoss=E.newState(1000000);
beforeBoss.runBest=10;afterBoss.runBest=11;
assert.equal(E.rebirthGain(beforeBoss),0,'arriving at stage 10 is not yet a boss clear');
assert.equal(E.rebirthGain(afterBoss),1,'clearing stage 10 unlocks the first return');
function simulate(seed,target){
 const s=E.newState(1000000);s.seed=seed;E.setAutoBuy(s,'balanced',true);
 const summary={seed,target,elapsed:0,returns:0,totalCoresEarned:0,
  manuallyOpenedChests:0,manualReturnActions:0,coreInvestments:0,firstReturnSec:null,
  newRelicKinds:0,secondRunStarts:0,completedRuns:[],lastDistance:1};
 for(let t=4;t<=TOTAL_SECONDS;t+=4){
  E.tick(s,4);summary.elapsed=t;
  // A stage is cleared only when the state advances to the next enemy.
  if(s.stage<=target)continue;
  const actual=s.stage-1,elapsedRun=Math.floor(s.clock),reward=E.rebirthGain(s);
  assert.ok(reward>0,'cleared distance '+actual+' must allow return (current '+s.stage+', runBest '+s.runBest+')');
  const count=s.chests;
  for(let i=0;i<count;i+=20){
   const r=E.openChestBatch(s,20);
   summary.manuallyOpenedChests+=r.results.length;
  }
  const gained=E.rebirth(s);
  assert.equal(gained,reward);
  summary.totalCoresEarned+=gained;
  summary.returns++;
  summary.manualReturnActions++;
  summary.completedRuns.push({sec:elapsedRun,stage:actual,cores:gained});
  if(summary.firstReturnSec===null)summary.firstReturnSec=t;
  let loops=0;while(E.buyCore(s,'valor')){summary.coreInvestments++;if(++loops>=30)break;}
 }
 summary.lastDistance=s.stage;
 summary.newRelicKinds=E.RELICS.filter(r=>E.relic(s,r.id)>0).length;
 summary.endingCoreLevel=s.coreUpgrades.valor;
 summary.unspentCores=s.cores;
 summary.unopenedChests=s.chests;
 summary.earnedCoreRatePerHour=summary.totalCoresEarned/(summary.elapsed/3600);
 summary.returnFrequencyPerHour=summary.returns/(summary.elapsed/3600);
 assert.equal(summary.totalCoresEarned,s.coreSpent+s.cores,'core accounting must match actual state');
 assert.ok(summary.returns>0,'all target loops must make one return within an hour');
 assert.ok(summary.manualReturnActions===summary.returns);
 assert.ok(Number.isFinite(summary.earnedCoreRatePerHour));
 return summary;
}
const rows=TARGETS.flatMap(target=>SEEDS.map(seed=>simulate(seed,target)));
const grouped=TARGETS.map(target=>{
 const sample=rows.filter(r=>r.target===target);
 const metric=key=>sample.map(r=>r[key]);
 return {target,returns:metric('returns'),coresEarned:metric('totalCoresEarned'),
  firstReturnSec:metric('firstReturnSec'),uniqueRelicKinds:metric('newRelicKinds'),
  manualReturnActions:metric('manualReturnActions'),chestsOpened:metric('manuallyOpenedChests'),
  finalCombatCoreLevel:metric('endingCoreLevel'),unspentCores:metric('unspentCores')};
});
const shallow=grouped[0],deep=grouped.at(-1);
const coreRateAdvantage=shallow.coresEarned.map((v,i)=>+(v/Math.max(1,deep.coresEarned[i])).toFixed(2));
console.log(JSON.stringify({experiment:'expedition-early-return-efficiency',
 synthetic:true,observationSeconds:TOTAL_SECONDS,
 assumptions:'balanced automatic purchases, after each chosen-distance return open all saved chests manually in batches and spend earned cores on combat. No free rebirth count bonus. Player must manually return and open rewards. No travel/menu animation overhead or real user decisions.',
 grouped,earlyVsDeepCoreRate:coreRateAdvantage,
 risk:'Short loops can farm cores faster; descriptive evidence, not a passing balance criterion.'}));
