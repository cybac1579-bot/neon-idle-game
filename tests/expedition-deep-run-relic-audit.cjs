'use strict';
/* Synthetic 2-hour first expedition. Five-minute chest opening check-ins. */
const assert=require('node:assert/strict'),E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118],MODES=['balanced','adaptive'];
function audit(mode,seed){
 const s=E.newState(1000000);s.seed=seed;assert.ok(E.setAutoBuy(s,mode,true));
 const loot=[];let at35Purchases=null;
 for(let t=1;t<=7200;t++){
  E.tick(s,1);
  if(s.runMilestones[35]!==undefined&&at35Purchases===null)at35Purchases=s.autoBuy.purchases;
  if(t%300===0)while(s.chests>0){
   const reward=E.openChest(s);
   assert.ok(reward);
   if(reward.depth>=35)loot.push({openedAt:t,depth:reward.depth,relic:reward.id,first:!reward.duplicate});
  }
 }
 const purchasesAfter35=at35Purchases===null?0:s.autoBuy.purchases-at35Purchases;
 // Before network finds existed, the 40/45-depth chest was necessarily
 // the first owner of each gated relic. Network discoveries can legitimately
 // grant it before the queued ordinary chest is opened. Verify actual tier
 // provenance and guaranteed access instead of hardcoding the RNG order.
 for(const entry of s.relicHistory){
  if(entry.id==='enlist')assert.ok(entry.depth>=40,'no early enlist relic');
  if(entry.id==='drill')assert.ok(entry.depth>=45,'no early drill relic');
  if(entry.id==='chronicle')assert.ok(entry.depth>=50,'no early chronicle relic');
  if(entry.source==='intel')assert.ok(entry.depth>=30,'network rewards only follow deep elite clears');
 }
 if(loot.some(x=>x.depth===40))assert.ok(E.relic(s,'enlist')>=1,'40-depth collection still unlocks enlist');
 if(loot.some(x=>x.depth===45))assert.ok(E.relic(s,'drill')>=1,'45-depth collection still unlocks drill');
 assert.ok(E.relic(s,'enlist')<=3&&E.relic(s,'drill')<=3);
 assert.ok(s.credits>=0);
 return {mode,seed,cleared:{'35':s.runMilestones[35]??null,'40':s.runMilestones[40]??null,'45':s.runMilestones[45]??null,'50':s.runMilestones[50]??null},
  currentDistance:s.stage,deepRelics:{enlist:E.relic(s,'enlist'),drill:E.relic(s,'drill')},
  relicKinds:E.RELICS.filter(r=>E.relic(s,r.id)>0).length,
  after35GrowthPurchases:purchasesAfter35,roster:s.actors.length,
  training:s.training,highestContractLevel:s.questLevels.contract,
  networkAutoFinds:s.relicEffects.intelFinds,networkProgress:s.relicEffects.intelClears,
  chestDiscoveries:loot};
}
const samples=MODES.flatMap(mode=>SEEDS.map(seed=>audit(mode,seed)));
console.log(JSON.stringify({experiment:'expedition-deep-40-45-relic-audit',synthetic:true,
 description:'2-hour opt-in auto-buy and five-minute player chest openings. No returns or manual growth actions.',
 seconds:7200,seeds:SEEDS,samples}));
