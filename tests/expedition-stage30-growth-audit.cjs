'use strict';
/* Optional adaptive versus existing fixed-balanced auto-buy; synthetic seed tests.
 * No balance target is hard-coded: this is a regression and pacing audit. */
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118];
const MODES=['balanced','adaptive'];
function simulate(mode,seed){
 const s=E.newState(1000000);s.seed=seed;
 assert.equal(E.setAutoBuy(s,mode,true),true);
 let lastAuto=0,arrivedAt30=null,lastPurchase=null,longestSilence=0,
  purchasesInSegment=0,unaffordableSeconds=0;
 for(let sec=1;sec<=2400;sec++){
  E.tick(s,1);
  if(sec%300===0)while(s.chests>0)assert.ok(E.openChest(s));
  if(arrivedAt30===null&&s.stage>=30){arrivedAt30=sec;lastPurchase=sec;}
  if(s.stage>=30&&s.stage<=35){
   if(s.autoBuy.purchases!==lastAuto){purchasesInSegment+=s.autoBuy.purchases-lastAuto;lastPurchase=sec;}
   if(lastPurchase!==null)longestSilence=Math.max(longestSilence,sec-lastPurchase);
   const target=E.autoTarget(s);
   if(target&&s.credits<target.cost)unaffordableSeconds++;
  }
  lastAuto=s.autoBuy.purchases;
  if(s.stage>=36)break;
 }
 const at30=s.runMilestones[30]??null,at35=s.runMilestones[35]??null;
 assert.ok(!at30||at30>0);
 if(at35!==null)assert.ok(at35>at30);
 assert.ok(s.credits>=0);
 return {mode,seed,clear30Seconds:at30,clear35Seconds:at35,
  segmentSeconds:at35!==null&&at30!==null?at35-at30:null,
  growthPurchasesInSegment:purchasesInSegment,longestNoGrowthSeconds:longestSilence,
  unaffordableSeconds,finalDistance:s.stage,
  training:s.training,recruits:s.actors.length,questLevels:{...s.questLevels},
  totalAutoPurchases:s.autoBuy.purchases,
  relicKinds:E.RELICS.filter(r=>E.relic(s,r.id)>0).length};
}
const samples=MODES.flatMap(mode=>SEEDS.map(seed=>simulate(mode,seed)));
for(const item of samples)assert.ok(item.longestNoGrowthSeconds>=0);
console.log(JSON.stringify({experiment:'expedition-stage30-35-auto-buy-growth-gaps',
 synthetic:true,checkInSeconds:300,firstRunOnly:true,secondsLimit:2400,
 assumptions:'Balanced auto-buy explicitly enabled, user opens chests at 5-minute visits, no manual growth purchases and no return. Adaptive is an alternate opt-in mode; fixed balanced retains save-up behavior.',
 samples}));
