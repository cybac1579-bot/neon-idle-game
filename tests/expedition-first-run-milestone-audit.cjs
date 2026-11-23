'use strict';
/* Reproducible first-expedition pacing: exact boss clear times with 5-minute
 * player chest-opening check-ins. Scripted, not human play observations.
 * No runtime balance mutations or forced time target assertions. */
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118];
const MODES=['off','balanced','recruit','train','supply'];
const DISTANCES=[5,10,15,25,30,35];
function simulate(mode,seed){
 const s=E.newState(1000000);s.seed=seed;
 if(mode!=='off')assert.equal(E.setAutoBuy(s,mode,true),true);
 let opened=0,firstReturnOfferSec=null;
 for(let second=1;second<=1800;second++){
  E.tick(s,1);
  if(firstReturnOfferSec===null&&E.rebirthGain(s)>0)firstReturnOfferSec=second;
  if(second%300===0)while(s.chests>0){
   const result=E.openChestBatch(s,20);
   assert.ok(result.results.length>0);opened+=result.results.length;
  }
 }
 const milestoneClears=Object.fromEntries(DISTANCES.map(n=>[n,s.runMilestones[n]??null]));
 const timestamps=Object.values(milestoneClears).filter(x=>x!==null);
 assert.ok(timestamps.every(x=>Number.isFinite(x)&&x>=0&&x<=1800));
 assert.deepEqual(timestamps,timestamps.slice().sort((a,b)=>a-b));
 const reload=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.deepEqual(reload.runMilestones,s.runMilestones);
 return {mode,seed,milestoneClears,firstReturnOfferSec,finalDistance:s.stage,
  autoPurchases:s.autoBuy.purchases,openedChests:opened,
  relicKinds:E.RELICS.filter(r=>E.relic(s,r.id)>0).length};
}
const scenarios=MODES.map(mode=>({mode,results:SEEDS.map(seed=>simulate(mode,seed))}));
console.log(JSON.stringify({experiment:'first-expedition-exact-clear-times',
 synthetic:true,seconds:1800,chestCheckIntervalSeconds:300,
 notes:'No manual growth purchases. Five-minute player check-ins open held chests. First return offer is a reward availability, not a forced return. Does not demonstrate player enjoyment or optimal play.',
 scenarios}));
