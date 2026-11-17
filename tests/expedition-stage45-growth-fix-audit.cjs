'use strict';
/* Regression guard for the *measured* 45–50 idle gap, not an arbitrary
 * whole-game completion time. Same deterministic simulated player actions:
 * opt-in auto buying; manual 5-minute chest opening; direct core investment
 * after first 45 clear; no autoplay rebirth or chest claiming. */
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118],MODES=['balanced','reserve','adaptive'];
function cycle(state,mode,target,limit){
 assert.equal(E.setAutoBuy(state,mode,true),true);
 let first45=null,lastAuto=state.autoBuy.purchases,after45Buys=[],at50=null;
 for(let elapsed=1;elapsed<=limit;elapsed++){
  E.tick(state,1);
  if(elapsed%300===0)while(state.chests>0)assert.ok(E.openChest(state));
  if(state.runMilestones[45]!==undefined&&first45===null)first45=state.runMilestones[45];
  if(state.autoBuy.purchases!==lastAuto){
   if(first45!==null)after45Buys.push(elapsed);
   lastAuto=state.autoBuy.purchases;
  }
  if(state.stage>target){
   while(state.chests>0)assert.ok(E.openChest(state));
   at50=state.runMilestones[50]??null;
   const end=at50??elapsed,events=after45Buys.filter(t=>t<=end);
   const marks=[first45??elapsed,...events,end];
   return {seconds:elapsed,first45,last50:at50,growthBuysAfter45:events.length,
    maxNoGrowthSeconds:Math.max(...marks.slice(1).map((x,i)=>x-marks[i])),
    training:state.training,roster:state.actors.length,contract:state.questLevels.contract};
  }
 }
 return {seconds:null,stage:state.stage};
}
function compare(mode,seed){
 const s=E.newState(1000000);s.seed=seed;
 const first=cycle(s,mode,45,19000);
 assert.ok(first.seconds!==null,mode+' initial 45 unreachable');
 const paid=E.rebirth(s);
 assert.ok(paid>0);
 let investments=0;while(E.buyCore(s,'valor'))investments++;
 assert.ok(investments>0);
 const second=cycle(s,mode,50,19000);
 assert.ok(second.seconds!==null,mode+' second 50 boss unreachable');
 assert.ok(second.last50>second.first45);
 assert.ok(s.relics.chronicle===1,'the stage50 treasure must remain collectable');
 assert.equal(s.rebirths,1,'never auto-rebirth');
 return {mode,seed,first45Seconds:first.seconds,second45Seconds:second.first45,
  second50Seconds:second.last50,after45GrowthBuys:second.growthBuysAfter45,
  longestNoGrowthSeconds:second.maxNoGrowthSeconds,
  training:second.training,roster:second.roster,contract:second.contract,
  firstReturnCores:paid,valorLevels:investments};
}
const results=MODES.flatMap(mode=>SEEDS.map(seed=>compare(mode,seed)));
for(const r of results.filter(x=>x.mode==='balanced')){
 assert.ok(r.longestNoGrowthSeconds<=1200,'balanced late growth unexpectedly stalled >20m '+JSON.stringify(r));
 assert.ok(r.after45GrowthBuys>=5,'balanced must still improve army between distance45 and 50');
}
for(const seed of SEEDS){
 const balanced=results.find(x=>x.seed===seed&&x.mode==='balanced');
 const reserve=results.find(x=>x.seed===seed&&x.mode==='reserve');
 assert.ok(balanced.longestNoGrowthSeconds<reserve.longestNoGrowthSeconds,
  'new balanced mode must reduce waiting compared with explicit legacy saving');
 assert.ok(balanced.second50Seconds<reserve.second50Seconds,
  'balanced mode must correct late enemy HP plus growth blockage');
 assert.ok(reserve.contract>=balanced.contract,
  'strict reserve still prioritizes deeper supply levels and remains a distinct choice');
}
console.log(JSON.stringify({experiment:'fixed-late-pacing-stage45-50',synthetic:true,
 note:'3 seeds × 3 explicit auto-buy modes; first cleared45→manual return→player-invested valor→second cleared50. Only the 45–50 growth gap is guarded, not a forced 60-minute game timer.',
 results}));
