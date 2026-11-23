'use strict';
/* Low-touch player model. Both paths open earned chests only at the same
 * five- or ten-minute check-in cadence (plus final inspection), never by
 * automatic loot pickup or instantaneous per-boss interaction.
 * A 25-clear return is explicitly initiated by the synthetic player, and
 * collected core investment is also explicitly simulated. */
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118,314159265,271828182,
 135791357,246802468,44444444,7654321,111333555,987456321,20261119];
function simulate(seed,mode,returnAfter,checkinSeconds){
 const s=E.newState(1000000);s.seed=seed;
 assert.equal(E.setAutoBuy(s,mode,true),true);
 let earlyReturnSeconds=null,chestOpens=0,checkins=0;
 for(let elapsed=1;elapsed<=12000;elapsed++){
  E.tick(s,1);
  if(elapsed%checkinSeconds===0){
   checkins++;
   while(s.chests>0){assert.ok(E.openChest(s));chestOpens++;}
  }
  if(returnAfter>0&&earlyReturnSeconds===null&&s.stage>returnAfter&&E.rebirthGain(s)>0){
   const gained=E.rebirth(s);
   assert.ok(gained>0);
   earlyReturnSeconds=elapsed;
   let bought=0;while(E.buyCore(s,'valor'))bought++;
   assert.ok(bought>0,'a manual early core investment must be possible');
  }
  if(s.stage>45){
   while(s.chests>0){assert.ok(E.openChest(s));chestOpens++;}
   return {seed,mode,returnAfter,checkinSeconds,elapsed,
    earlyReturnSeconds,chestOpens,checkins,
    relicKinds:E.RELICS.filter(r=>E.relic(s,r.id)>0).length,
    returnCount:s.rebirths,valor:s.coreUpgrades.valor};
  }
 }
 throw Error('45 distance was never cleared: '+mode+'/'+seed);
}
const samples=[];
for(const checkinSeconds of [300,600])for(const mode of ['balanced','adaptive'])for(const seed of SEEDS){
 const direct=simulate(seed,mode,0,checkinSeconds);
 const early=simulate(seed,mode,25,checkinSeconds);
 assert.equal(direct.returnCount,0);
 assert.equal(early.returnCount,1);
 assert.ok(early.earlyReturnSeconds>0&&early.valor>0);
 assert.equal(direct.chestOpens,9);
 assert.equal(early.chestOpens,14,'returning 25 replays exactly five earned chests');
 const shortcutPercent=+(100*(direct.elapsed-early.elapsed)/direct.elapsed).toFixed(1);
 // A sentinel; changing balance can improve this, but letting it dominate
 // >35% must trigger a review. It is not an endorsement of the status quo.
 assert.ok(shortcutPercent<=35,
  'excessive >35% early return shortcut: '+JSON.stringify({seed,mode,checkinSeconds,shortcutPercent}));
 samples.push({seed,mode,checkinSeconds,firstReturnSeconds:early.earlyReturnSeconds,
  direct45Seconds:direct.elapsed,earlyReturn45Seconds:early.elapsed,
  shortcutPercent,extraChests:early.chestOpens-direct.chestOpens,
  directKinds:direct.relicKinds,earlyKinds:early.relicKinds,
  directCheckins:direct.checkins,earlyCheckins:early.checkins});
}
const overview=[300,600].map(seconds=>{
 const group=samples.filter(s=>s.checkinSeconds===seconds);
 return {checkinSeconds:seconds,sampleCount:group.length,
  meanShortcutPercent:+(group.reduce((n,r)=>n+r.shortcutPercent,0)/group.length).toFixed(1),
  worstShortcutPercent:Math.max(...group.map(r=>r.shortcutPercent)),
  positiveCases:group.filter(r=>r.shortcutPercent>0).length};
});
assert.equal(samples.length,48);
console.log(JSON.stringify({experiment:'early-return-low-touch-checkin-cadence',
 synthetic:true,autoLoot:false,autoReturn:false,
 note:'Manual player: every 5/10 minutes opens earned chests, optionally returns exactly once at 25 and invests valor cores. No combat taps. This does not measure subjective fun or show an actual phone playthrough.',
 overview,samples}));
