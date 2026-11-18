'use strict';
/* Head-to-head real engine replay, not isolated core/relic assumptions.
 * Distances: shallow25 -> voluntary return -> deep45 -> voluntary return
 * -> clear50, versus deep45 -> voluntary return -> clear50.
 * This measures what the player gets at a meaningful first collection goal.
 */
const assert=require('node:assert/strict'),E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118];
const MODES=['balanced','adaptive'];
function replay(seed,mode,autoChest,returnTargets){
 const s=E.newState(1000);s.seed=seed;
 assert.ok(E.setAutoBuy(s,mode,true));
 assert.ok(E.setAutoChest(s,autoChest));
 const returns=[];
 let next=0,manualOpen=0,autoOpenedBeforeReturn=0;
 for(let sec=1;sec<=13000;sec++){
  E.tick(s,1);
  if(!autoChest&&sec%300===0)while(s.chests>0){assert.ok(E.openChest(s));manualOpen++;}
  if(next<returnTargets.length&&s.stage>returnTargets[next]&&E.rebirthGain(s)>0){
   while(s.chests>0){assert.ok(E.openChest(s));manualOpen++;}
   const reward=E.rebirthRewards(s),levelBefore=s.coreUpgrades.valor;
   autoOpenedBeforeReturn+=s.autoChest.opened;
   const paid=E.rebirth(s);assert.equal(paid,reward.total);
   while(E.buyCore(s,'valor')){}
   returns.push({atSeconds:sec,afterDistance:returnTargets[next],
    earnedCores:paid,recordBonus:reward.recordBonus,
    investmentLevels:s.coreUpgrades.valor-levelBefore,valorLevel:s.coreUpgrades.valor});
   next++;
  }
  if(next===returnTargets.length&&s.stage>50){
   while(s.chests>0){assert.ok(E.openChest(s));manualOpen++;}
   return {seed,mode,autoChest,route:returnTargets.join('>'),elapsedSeconds:sec,
    returns,relicKinds:E.RELICS.filter(r=>E.relic(s,r.id)>0).length,
    relicCopies:E.RELICS.reduce((n,r)=>n+E.relic(s,r.id),0),
    coreLevel:s.coreUpgrades.valor,unclaimedCores:E.rebirthGain(s),
    manualOpen,autoOpen:autoOpenedBeforeReturn+s.autoChest.opened,
    claimedDistance:s.claimedBreakthroughDistance};
  }
 }
 throw Error('50 not cleared: '+JSON.stringify({seed,mode,autoChest,returnTargets,stage:s.stage}));
}
const pairs=[];
for(const seed of SEEDS)for(const mode of MODES)for(const autoChest of [false,true]){
 const direct=replay(seed,mode,autoChest,[45]);
 const early=replay(seed,mode,autoChest,[25,45]);
 assert.equal(direct.returns.length,1);
 assert.equal(early.returns.length,2);
 assert.equal(direct.claimedDistance,45);
 assert.equal(early.claimedDistance,45);
 assert.equal(direct.coreLevel,early.coreLevel,
  'fixed-seed paths must be compared at equal purchased core strength');
 assert.equal(direct.relicKinds,15);
 assert.equal(early.relicKinds,15);
 assert.ok(early.relicCopies>=direct.relicCopies,
  'early return should be expected to gain more repeat relic opportunities');
 const earlyLeadPercent=+((direct.elapsedSeconds-early.elapsedSeconds)/direct.elapsedSeconds*100).toFixed(1);
 assert.ok(earlyLeadPercent<=35,
  '25 clear shortcut unexpectedly exceeded 35%: '+JSON.stringify({seed,mode,autoChest,earlyLeadPercent}));
 pairs.push({seed,mode,autoChest,directSeconds:direct.elapsedSeconds,earlySeconds:early.elapsedSeconds,
  earlyLeadPercent,extraEarlyRelicCopies:early.relicCopies-direct.relicCopies,
  directCopies:direct.relicCopies,earlyCopies:early.relicCopies,
  directCores:direct.returns.map(x=>x.earnedCores),
  earlyCores:early.returns.map(x=>x.earnedCores),
  finalCoreLevel:direct.coreLevel,
  directChestOpens:direct.manualOpen+direct.autoOpen,
  earlyChestOpens:early.manualOpen+early.autoOpen});
}
const aggregate={
 trials:pairs.length,earlyFaster:pairs.filter(p=>p.earlyLeadPercent>0).length,
 directFaster:pairs.filter(p=>p.earlyLeadPercent<0).length,
 averageLead:+(pairs.reduce((s,p)=>s+p.earlyLeadPercent,0)/pairs.length).toFixed(2),
 maxLead:Math.max(...pairs.map(p=>p.earlyLeadPercent)),
 averageExtraCopies:+(pairs.reduce((s,p)=>s+p.extraEarlyRelicCopies,0)/pairs.length).toFixed(2)
};
console.log(JSON.stringify({experiment:'two-routes-through-distance50',synthetic:true,
 note:'3 seeds × 2 player-selected buy modes × auto chests OFF/ON × explicit manual returns and valor spending; identical earned-loot rules, no forced first return.',
 aggregate,pairs}));
