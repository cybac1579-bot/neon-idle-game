'use strict';
/* Deterministic 30-minute comparison of short/core and deep/discovery runs.
 * Player actions: all available chests manually opened and rebirth chosen at
 * each target. Core upgrades are manually invested in valor after each return.
 * This is an engine experiment, not a human playtest or optimality proof.
 */
const assert=require('node:assert/strict'),E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118];
const targets=[11,26,36]; // current distance; boss clears are 10,25,35
function simulate(seed,target,seconds=1800){
 const s=E.newState(1000);s.seed=seed;E.setAutoBuy(s,'balanced',true);
 let returns=0,cores=0,base=0,bonus=0,chestsOpened=0,firstReturn=null;
 for(let t=4;t<=seconds;t+=4){
  E.tick(s,4);
  while(s.chests>0){assert.ok(E.openChest(s));chestsOpened++;}
  if(s.stage>=target&&E.rebirthGain(s)>0){
   const result=E.rebirthRewards(s);
   returns++;cores+=result.total;base+=result.base;bonus+=result.recordBonus;
   if(firstReturn===null)firstReturn=t;
   assert.equal(E.rebirth(s),result.total);
   while(E.buyCore(s,'valor')){}
  }
 }
 return {seed,target,returns,cores,base,bonus,chestsOpened,firstReturn,
  discoveredKinds:E.RELICS.filter(r=>E.relic(s,r.id)>0).length,
  finalValor:s.coreUpgrades.valor};
}
const scenarios=targets.map(target=>({target,samples:SEEDS.map(seed=>simulate(seed,target))}));
assert.ok(scenarios[0].samples.every(x=>x.bonus===0&&x.discoveredKinds===5));
assert.ok(scenarios[1].samples.every(x=>x.bonus===3&&x.discoveredKinds>=8));
assert.ok(scenarios[2].samples.every(x=>x.bonus===6&&x.discoveredKinds>=10));
assert.ok(scenarios[2].samples.every(x=>x.firstReturn>scenarios[0].samples[0].firstReturn));
console.log(JSON.stringify({experiment:'first-clear-core-versus-relic-depth',
 method:'synthetic seeded engine; 4-second steps; immediate player-confirmed chest opens and rebirth; balanced auto purchase; earned cores invested in valor',
 durationSeconds:1800,scenarios}));
