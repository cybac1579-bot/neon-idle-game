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
 for(const entry of loot){
  if(entry.depth===40&&entry.first)assert.equal(entry.relic,'enlist');
  if(entry.depth===45&&entry.first)assert.equal(entry.relic,'drill');
 }
 assert.ok(E.relic(s,'enlist')<=3&&E.relic(s,'drill')<=3);
 assert.ok(s.credits>=0);
 return {mode,seed,cleared:{'35':s.runMilestones[35]??null,'40':s.runMilestones[40]??null,'45':s.runMilestones[45]??null,'50':s.runMilestones[50]??null},
  currentDistance:s.stage,deepRelics:{enlist:E.relic(s,'enlist'),drill:E.relic(s,'drill')},
  relicKinds:E.RELICS.filter(r=>E.relic(s,r.id)>0).length,
  after35GrowthPurchases:purchasesAfter35,roster:s.actors.length,
  training:s.training,highestContractLevel:s.questLevels.contract,chestDiscoveries:loot};
}
const samples=MODES.flatMap(mode=>SEEDS.map(seed=>audit(mode,seed)));
console.log(JSON.stringify({experiment:'expedition-deep-40-45-relic-audit',synthetic:true,
 description:'2-hour opt-in auto-buy and five-minute player chest openings. No returns or manual growth actions.',
 seconds:7200,seeds:SEEDS,samples}));
