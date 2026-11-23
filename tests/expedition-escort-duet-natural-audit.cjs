'use strict';
/* Observation only. Does the duplicate-relic escort duet appear in natural
 * three-return play, rather than only in a preloaded regression fixture?
 * Scripted choices: auto-buy on, manual chest opening every 300 seconds and
 * on the selected goal, voluntary rebirth and manual valor core spending.
 * Never force a new relic or seed a second ranger. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118];
const MODES=['balanced','adaptive'];
const ROUTES=[[25,45,50],[45,50,55]];
const LIMIT_PER_RUN=15000;
const mean=values=>values.length?Math.round(values.reduce((a,b)=>a+b,0)*100/values.length)/100:null;
const available=s=>E.relic(s,'guard')>=2&&E.relic(s,'archer')>=2;
const liveRangers=s=>s.actors.filter(a=>a.id==='ranger'&&a.hp>0&&a.revive===0&&a.progress>=.36).length;
function scenario(seed,mode,route){
 const s=E.newState(1000);s.seed=seed;
 assert.equal(E.setAutoBuy(s,mode,true),true);
 assert.equal(s.autoChest.enabled,false);
 const runs=[];
 for(let idx=0;idx<route.length;idx++){
  const target=route[idx];
  const rec={number:idx+1,goal:target,complete:false,elapsed:null,
   startGuardCopies:E.relic(s,'guard'),startArcherCopies:E.relic(s,'archer'),
   finishGuardCopies:0,finishArcherCopies:0,maxRangers:0,
   firstTwoCopyAt:null,firstEligibleAt:null,firstDuetAt:null,
   twoCopySeconds:0,eligibleSeconds:0,eligibleCommanderSeconds:0,
   flankShots:0,intercepts:0,escortDuets:0,commandMoves:0,
   firstDuetStage:null,duetEvents:[],openedChests:0,firstCopies:0,duplicateCopies:0,
   missingSecondCopyAtEnd:null,coreReward:0};
  const before={flankShots:s.relicEffects.flankShots,intercepts:s.relicEffects.intercepts,
   escortDuets:s.relicEffects.escortDuets,commandMoves:s.relicEffects.commandMoves};
  function open(){
   while(s.chests){
    const draw=E.openChest(s);assert.ok(draw);
    rec.openedChests++;
    if(draw.id&&draw.duplicate)rec.duplicateCopies++;
    if(draw.id&&!draw.duplicate)rec.firstCopies++;
   }
  }
  for(let sec=1;sec<=LIMIT_PER_RUN;sec++){
   const prev=s.relicEffects.escortDuets;
   E.tick(s,1);
   const rangerCount=liveRangers(s);
   rec.maxRangers=Math.max(rec.maxRangers,rangerCount);
   if(available(s)){
    rec.twoCopySeconds++;
    if(rec.firstTwoCopyAt===null)rec.firstTwoCopyAt=sec;
    if(s.stage>=40&&rangerCount>=2){
     rec.eligibleSeconds++;
     if(rec.firstEligibleAt===null)rec.firstEligibleAt=sec;
     if(E.isElite(s.stage))rec.eligibleCommanderSeconds++;
    }
   }
   const gained=s.relicEffects.escortDuets-prev;
   assert.ok(gained===0||gained===1,'at most one escort duet per one-second tick');
   if(gained){
    assert.equal(available(s),true,'duet must require both duplicate copies');
    if(rec.firstDuetAt===null){rec.firstDuetAt=sec;rec.firstDuetStage=s.stage;}
    if(rec.duetEvents.length<12)rec.duetEvents.push({sec,stage:s.stage,rangerCount});
   }
   if(sec%300===0)open();
   if(s.stage>target){open();rec.elapsed=sec;rec.complete=true;break;}
  }
  rec.finishGuardCopies=E.relic(s,'guard');
  rec.finishArcherCopies=E.relic(s,'archer');
  rec.missingSecondCopyAtEnd=Math.max(0,2-rec.finishGuardCopies)+
   Math.max(0,2-rec.finishArcherCopies);
  for(const k of Object.keys(before))rec[k]=s.relicEffects[k]-before[k];
  assert.ok(rec.escortDuets<=rec.intercepts,'deep duet is an upgraded real intercept');
  assert.ok(rec.intercepts<=rec.flankShots,'only actual flanks may be intercepted');
  if(rec.escortDuets>0){
   assert.ok(rec.firstDuetAt!==null&&rec.firstEligibleAt!==null);
   assert.ok(rec.firstDuetStage>=40);
   assert.ok(rec.maxRangers>=2);
  }
  runs.push(rec);
  if(!rec.complete)break;
  const reward=E.rebirthGain(s);assert.ok(reward>0);
  rec.coreReward=E.rebirth(s);assert.equal(rec.coreReward,reward);
  while(E.buyCore(s,'valor')){}
  assert.equal(s.rebirths,idx+1);
 }
 return {seed,mode,route:route.join('>'),completed:runs.length===3&&runs.every(r=>r.complete),runs};
}
const samples=ROUTES.flatMap(route=>MODES.flatMap(mode=>SEEDS.map(seed=>scenario(seed,mode,route))));
const summary=ROUTES.map(route=>{
 const group=samples.filter(x=>x.route===route.join('>'));
 return {route:route.join('>'),experiments:group.length,allThreeReturns:group.filter(x=>x.completed).length,
  runs:[0,1,2].map(idx=>{
   const rows=group.map(x=>x.runs[idx]).filter(Boolean);
   return {number:idx+1,goal:route[idx],samples:rows.length,
    withTwoCopyPair:rows.filter(x=>x.firstTwoCopyAt!==null).length,
    withEligibleCommanderSeconds:rows.filter(x=>x.eligibleCommanderSeconds>0).length,
    withActualDuet:rows.filter(x=>x.escortDuets>0).length,
    totalFlanks:rows.reduce((n,x)=>n+x.flankShots,0),
    totalIntercepts:rows.reduce((n,x)=>n+x.intercepts,0),
    totalDuets:rows.reduce((n,x)=>n+x.escortDuets,0),
    meanMissingPartnerCopiesAtGoal:mean(rows.map(x=>x.missingSecondCopyAtEnd)),
    avgTwoCopySeconds:mean(rows.map(x=>x.twoCopySeconds)),
    avgEligibleCommanderSeconds:mean(rows.map(x=>x.eligibleCommanderSeconds)),
    meanFirstDuetSec:mean(rows.filter(x=>x.firstDuetAt!==null).map(x=>x.firstDuetAt)),
    meanCompletedSeconds:mean(rows.filter(x=>x.complete).map(x=>x.elapsed))};
  })};
});
assert.equal(samples.length,12);
assert.ok(samples.every(x=>x.completed),'these scripted routes previously finished; flag any regression');
const out={experiment:'naturally-acquired-deep-escort-duet',synthetic:true,
 description:'Natural seeded 3-run play; no forced relics, ranger recruitment, or returns',
 seeds:SEEDS,modes:MODES,routes:ROUTES,limitPerRun:LIMIT_PER_RUN,summary,samples};
const target=path.join(__dirname,'..','artifacts','expedition','escort-duet-natural.json');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify(out,null,2)+'\n');
console.log('ESCORT_DUET_NATURAL_SUMMARY '+JSON.stringify(summary));
for(const x of samples)console.log('ESCORT_DUET_NATURAL_SAMPLE '+JSON.stringify({seed:x.seed,mode:x.mode,route:x.route,
 runs:x.runs.map(r=>({number:r.number,goal:r.goal,elapsed:r.elapsed,
  copies:r.finishGuardCopies+'/'+r.finishArcherCopies,maxRangers:r.maxRangers,
  eligibleSeconds:r.eligibleSeconds,eligibleCommanderSeconds:r.eligibleCommanderSeconds,
  flanks:r.flankShots,intercepts:r.intercepts,duets:r.escortDuets,firstDuetAt:r.firstDuetAt}))}));
console.log('ESCORT_DUET_NATURAL_OUTPUT '+target);
