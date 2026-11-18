'use strict';
/* Fourth voluntary expedition, real time-to-clear depth65. The pursuit
 * relic was earned at depth55; no free copies, forced cores or auto-return.
 * Includes optional 60-second chest automation and manual 300-second opens. */
const assert=require('node:assert/strict'),E=require('../site/expedition-engine.js');
const SEEDS=[123456789,20261118],MODES=['balanced','adaptive'];
function replay(seed,mode,autoChest){
 const s=E.newState(1000);s.seed=seed;
 assert.equal(E.setAutoBuy(s,mode,true),true);
 assert.equal(E.setAutoChest(s,autoChest),true);
 const runs=[];
 for(const target of [45,50,60,65]){
  let arrivedAt=null,phaseSeen=false,phaseSignals=0,startedInPhase=false;
  for(let t=1;t<=11000;t++){
   E.tick(s,1);
   if(!autoChest&&t%300===0)while(s.chests>0)assert.ok(E.openChest(s));
   if((target===60||target===65)&&s.stage===target){
    if(arrivedAt===null){
     arrivedAt=t;
     if(target===65)startedInPhase=s.enemyTactic.pursuitTriggered;
    }
    if(target===65&&!phaseSeen&&s.enemyTactic.pursuitTriggered){phaseSeen=true;phaseSignals++;}
   }
   if(s.stage>target){
    runs.push({target,elapsedSeconds:t,boss60Seconds:target===60?t-arrivedAt:null,
     elite65Seconds:target===65?t-arrivedAt:null,
     firstClearAt:s.runMilestones[target]??null,receivedPursuit:E.relic(s,'pursuit'),
     coreValor:s.coreUpgrades.valor,rebirths:s.rebirths,
     uniqueKinds:E.RELICS.filter(r=>E.relic(s,r.id)>0).length,
     phaseSeen:target===65?phaseSeen:null,phaseSignals:target===65?phaseSignals:null,
     startedInPhase:target===65?startedInPhase:null});
    break;
   }
   if(t===11000)throw Error('distance '+target+' timeout '+JSON.stringify({seed,mode,autoChest,stage:s.stage}));
  }
  if(target===65)break;
  // Any unopened earned boxes are manually collected before player-ordered
  // returns in both comparison arms.
  while(s.chests>0)assert.ok(E.openChest(s));
  assert.ok(E.rebirth(s)>0);
  while(E.buyCore(s,'valor')){}
 }
 assert.equal(runs.length,4);
 assert.ok(runs[3].elite65Seconds>0&&runs[3].elite65Seconds<=1100,
  'depth65 elite became a long stationary HP wall: '+JSON.stringify({seed,mode,autoChest,final:runs[3]}));
 assert.equal(runs[3].firstClearAt,runs[3].elapsedSeconds);
 assert.equal(runs[3].receivedPursuit,1,'earned depth55 collection must survive 60 return');
 assert.equal(runs[3].phaseSeen,true);
 assert.equal(runs[3].phaseSignals,1);
 assert.equal(runs[3].startedInPhase,false,'full health elite must not start boosted');
 assert.equal(runs[3].rebirths,3,'no automatic rebirth at the elite');
 return {seed,mode,autoChest,first45:runs[0].elapsedSeconds,
  second50:runs[1].elapsedSeconds,third60:runs[2].elapsedSeconds,
  fourth65:runs[3].elapsedSeconds,boss60Seconds:runs[2].boss60Seconds,
  elite65Seconds:runs[3].elite65Seconds,
  discoveredKinds:runs[3].uniqueKinds,valorAt65:runs[3].coreValor};
}
const rows=MODES.flatMap(mode=>SEEDS.flatMap(seed=>[false,true].map(auto=>replay(seed,mode,auto))));
const summary={comparisons:rows.length,
 elite65Min:Math.min(...rows.map(x=>x.elite65Seconds)),
 elite65Max:Math.max(...rows.map(x=>x.elite65Seconds)),
 elite65Average:+(rows.reduce((a,x)=>a+x.elite65Seconds,0)/rows.length).toFixed(1),
 boss60Average:+(rows.reduce((a,x)=>a+x.boss60Seconds,0)/rows.length).toFixed(1),
 eliteVsBossAverageRatio:+(rows.reduce((a,x)=>a+x.elite65Seconds/x.boss60Seconds,0)/rows.length).toFixed(3),
 noNewKindsAfter55:rows.every(x=>x.discoveredKinds===E.RELICS.length)};
console.log(JSON.stringify({experiment:'fourth-expedition-deep-elite65-pursuit',
 synthetic:true,note:'8 engine scenarios; no taps, one manual return after 45/50/60, real 55 source chest, explicitly chosen auto-buy and chest-open policies.',summary,rows}));
