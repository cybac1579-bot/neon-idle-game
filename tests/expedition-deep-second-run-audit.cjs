'use strict';
/* Reproducible deep first return + second run, not a human playtest.
 * Quality assertion: with player-invested cores and earned relics, the same
 * distance should not take longer on the second expedition for this baseline.
 * No fixed balance-time target, automatic rebirth, or hidden investment. */
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118],MODES=['balanced','adaptive'];
function until(s,mode,clearedTarget,limit){
 assert.equal(E.setAutoBuy(s,mode,true),true);
 let opened=0;
 for(let sec=1;sec<=limit;sec++){
  E.tick(s,1);
  if(sec%300===0||s.stage>clearedTarget)while(s.chests>0){
   assert.ok(E.openChest(s));opened++;
  }
  if(s.stage>clearedTarget)return {seconds:sec,opened,stages:{...s.runMilestones}};
 }
 return {seconds:null,opened,stages:{...s.runMilestones}};
}
function simulate(mode,seed){
 const s=E.newState(100000);s.seed=seed;
 const first=until(s,mode,45,11000);
 assert.ok(first.seconds!==null,'stage45 must be clearable in audit horizon');
 const relicsAtReturn={enlist:E.relic(s,'enlist'),drill:E.relic(s,'drill')};
 assert.equal(relicsAtReturn.enlist,1);
 assert.equal(relicsAtReturn.drill,1);
 const claimed=E.rebirthRewards(s);
 assert.ok(claimed.total>=claimed.recordBonus);
 const paid=E.rebirth(s);
 assert.equal(paid,claimed.total);
 assert.equal(s.rebirths,1);
 let investments=0;
 while(E.buyCore(s,'valor'))investments++;
 assert.ok(investments>0,'core spending is an explicit player-simulated action');
 assert.equal(s.runMilestones[45],undefined,'new run must not retain a fake clear time');
 const second=until(s,mode,50,15000);
 assert.ok(second.seconds!==null,'second expedition should reach stage50 with earned investment');
 assert.ok(Number.isFinite(second.stages[45]));
 assert.ok(second.stages[45]<first.seconds,'second run should clear the same stage45 faster');
 assert.ok(second.stages[50]>second.stages[45]);
 assert.equal(s.rebirths,1,'exploration must not auto return');
 return {seed,mode,first45Seconds:first.seconds,second45Seconds:second.stages[45],
  second50Seconds:second.stages[50],firstCoresPaid:paid,coresInvestedInValor:investments,
  preservedDeepRelics:relicsAtReturn,firstChestsOpened:first.opened,
  secondChestsOpened:second.opened,secondBestDistance:s.runBest,
  combatCoreLevel:s.coreUpgrades.valor};
}
const samples=MODES.flatMap(mode=>SEEDS.map(seed=>simulate(mode,seed)));
console.log(JSON.stringify({experiment:'first-versus-second-deep-expedition',synthetic:true,
 note:'First run to cleared 45, manual return, all affordable earned cores manually invested in valor, second run to cleared 50; automatic purchases explicitly opt-in; chests opened at 5-minute check-ins and each return target. The two auto strategies are not claimed to be economically equal.',
 samples}));
