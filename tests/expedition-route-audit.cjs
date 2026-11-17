'use strict';
/* Synthetic, reproducible three-expedition route audit.
 * Goal distance 35 is a benchmark, not a rebirth unlock (rebirth starts at 10).
 * Chest collection every 300 seconds and core allocations are scripted player actions.
 * Manual mode purchases only one upgrade at each scheduled check, rotating the
 * same balanced order as the automatic mode. This is not observed human behavior.
 */
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const TARGET_DISTANCE=35,MAX_SECONDS=5400,CHEST_CHECK=300;
const SEEDS=[123456789,987654321,20261118];
const CASES=[
 {mode:'balanced',manualInterval:0},
 {mode:'balanced',manualInterval:4},
 {mode:'balanced',manualInterval:20},
 {mode:'recruit',manualInterval:0},
 {mode:'train',manualInterval:0},
 {mode:'supply',manualInterval:0}
];
function runScenario(config,seed){
 const s=E.newState(1000000);
 s.seed=seed;
 assert.equal(E.setAutoBuy(s,config.mode,config.manualInterval===0),true);
 const runs=[];
 for(let number=1;number<=3;number++){
  let seconds=0,manualClicks=0,chestClicks=0;
  while(seconds<MAX_SECONDS&&s.stage<TARGET_DISTANCE){
   E.tick(s,4);
   seconds+=4;
   if(seconds%CHEST_CHECK===0){
    while(s.chests>0){assert.ok(E.openChest(s));chestClicks++;}
   }
   if(config.manualInterval>0&&seconds%config.manualInterval===0){
    const target=E.autoTarget(s);
    if(target&&s.credits>=target.cost){
     const kind=target.kind==='supply'?'quest':target.kind;
     const bought=E.purchase(s,kind,1,target.id);
     if(bought.count){
      manualClicks+=bought.count;
      if(config.mode==='balanced')s.autoBuy.cursor=(s.autoBuy.cursor+1)%3;
     }
    }
   }
  }
  const completed=s.stage>=TARGET_DISTANCE;
  const row={run:number,seconds,completed,finalDistance:s.stage,
   manualGrowthClicks:manualClicks,manualPurchases:s.runMetrics.manualPurchases,
   autoPurchases:s.autoBuy.purchases,chestClicks,
   collectedRelics:Object.values(s.relics).reduce((sum,n)=>sum+n,0),
   projectedCores:E.rebirthGain(s)};
  assert.equal(row.manualGrowthClicks,row.manualPurchases);
  assert.ok(Number.isFinite(s.credits)&&s.credits>=0);
  assert.ok(s.stage>=1&&s.stage<=100000);
  assert.equal(row.chestClicks,s.runMetrics.chestsOpened);
  if(config.manualInterval===0)assert.equal(row.manualPurchases,0);
  else assert.equal(row.autoPurchases,0);
  runs.push(row);
  if(!completed)break;
  const gain=E.rebirth(s);
  assert.equal(gain,row.projectedCores);
  assert.equal(s.runHistory.at(-1).manualPurchases,row.manualPurchases);
  assert.equal(s.runHistory.at(-1).autoPurchases,row.autoPurchases);
  assert.equal(s.runHistory.length,number);
  // Same permanent-investment rule for all scenarios: spend all affordable
  // cores on attack, never on automatic rebirth or unattended chest opening.
  while(E.buyCore(s,'valor')){}
 }
 return runs;
}
const results=CASES.map(config=>{
 const samples=SEEDS.map(seed=>({seed,runs:runScenario(config,seed)}));
 const finished=samples.filter(x=>x.runs.length===3&&x.runs.every(y=>y.completed));
 const firstSamples=samples.filter(x=>x.runs[0].completed).map(x=>x.runs[0].seconds);
 return {...config,firstGoalReached:firstSamples.length,
  firstGoalSeconds:firstSamples,
  allThreeReached:finished.length,
  threeRunSeconds:finished.map(x=>x.runs.reduce((sum,y)=>sum+y.seconds,0)),
  manualGrowthClicks:samples.map(x=>x.runs.reduce((sum,y)=>sum+y.manualGrowthClicks,0)),
  automaticPurchases:samples.map(x=>x.runs.reduce((sum,y)=>sum+y.autoPurchases,0)),
  samples};
});
const balanced=results.find(x=>x.mode==='balanced'&&x.manualInterval===0);
const sameCadence=results.find(x=>x.mode==='balanced'&&x.manualInterval===4);
assert.equal(balanced.allThreeReached,SEEDS.length);
assert.equal(sameCadence.allThreeReached,SEEDS.length);
assert.ok(balanced.manualGrowthClicks.every(x=>x===0));
assert.ok(sameCadence.manualGrowthClicks.every(x=>x>0));
console.log(JSON.stringify({experiment:'expedition-3-run-auto-versus-manual',
 synthetic:true,goalDistance:TARGET_DISTANCE,maxSecondsPerRun:MAX_SECONDS,
 playerChestCheckSeconds:CHEST_CHECK,rebirthUnlockDistance:10,
 investment:'all affordable earned cores to valor',
 notes:'Same seeded engine, scheduled chest collection and priority policy. RNG may diverge when purchase timing changes. Single-category modes never buy other categories; timeouts are censored results, not claims of permanent impossibility.',
 results:results.map(({samples,...summary})=>summary)}));
