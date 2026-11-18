'use strict';
/* Actual expedition engine and loot rolls across three voluntary returns.
 * Player choices are scripted, not recorded from a human player:
 * auto-buy opt-in, manual chest opening every 5m and at each clear,
 * manual return at the target, manual combat-core investment.
 * Record misses and duplicates; never force a new discovery.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118];
const MODES=['balanced','adaptive'];
const ROUTES=[[25,45,50],[45,50,55]];
const LIMIT_PER_RUN=15000;
const relicKinds=s=>E.RELICS.filter(r=>E.relic(s,r.id)>0).length;
const copies=s=>E.RELICS.reduce((sum,r)=>sum+E.relic(s,r.id),0);
const totalCapacity=E.RELICS.reduce((sum,r)=>sum+r.cap,0);
const ownedIds=s=>E.RELICS.filter(r=>E.relic(s,r.id)>0).map(r=>r.id);
const round=n=>Math.round(n*100)/100;
function scenario(seed,mode,route){
 const s=E.newState(1000);
 s.seed=seed;
 assert.ok(E.setAutoBuy(s,mode,true));
 assert.equal(s.autoChest.enabled,false);
 const runs=[];
 for(let run=0;run<route.length;run++){
  const target=route[run],previousOwned=new Set(ownedIds(s));
  const startKinds=relicKinds(s),startCopies=copies(s);
  const result={number:run+1,goal:target,seconds:null,
   startKinds,startCopies,startRelics:[...previousOwned],
   newKinds:0,duplicateCopies:0,exchangeBoxes:0,
   chestOpens:0,intelFinds:0,intelFirsts:0,
   chestFirsts:0,firstNewSeconds:null,firstNewStage:null,
   newRelicIds:[],earnedCores:0,investedValor:0,
   endKinds:null,endCopies:null,endStage:null,
   complete:false};
  function noteFirst(id,source,elapsed,stage){
   if(previousOwned.has(id))return false;
   previousOwned.add(id);result.newKinds++;
   result.newRelicIds.push({id,source,atSeconds:elapsed,stage});
   if(result.firstNewSeconds===null){result.firstNewSeconds=elapsed;result.firstNewStage=stage;}
   return true;
  }
  function open(elapsed){
   while(s.chests>0){
    const r=E.openChest(s);
    assert.ok(r);
    result.chestOpens++;
    if(r.id){
     if(noteFirst(r.id,'chest',elapsed,r.depth))result.chestFirsts++;
     else result.duplicateCopies++;
    }else result.exchangeBoxes++;
   }
  }
  for(let sec=1;sec<=LIMIT_PER_RUN;sec++){
   const beforeIntel=s.relicEffects.intelFinds;
   E.tick(s,1);
   if(s.relicEffects.intelFinds>beforeIntel){
    const delta=s.relicEffects.intelFinds-beforeIntel;
    assert.equal(delta,1,'one network discovery max per engine second');
    const entry=s.relicHistory.at(-1);
    assert.ok(entry&&entry.source==='intel','network find retains provenance');
    result.intelFinds++;
    if(entry.id&&noteFirst(entry.id,'intel',sec,entry.depth))result.intelFirsts++;
   }
   if(sec%300===0)open(sec);
   if(s.stage>target){open(sec);result.seconds=sec;result.complete=true;break;}
  }
  result.endStage=s.stage;
  result.endKinds=relicKinds(s);
  result.endCopies=copies(s);
  assert.equal(result.endKinds-startKinds,result.newKinds,'every kind change must be tracked');
  assert.equal(result.endCopies-startCopies,
   result.newKinds+result.duplicateCopies+result.intelFinds-result.intelFirsts,
   'copies must equal firsts + duplicate chest + every network find');
  assert.equal(result.intelFirsts+result.chestFirsts,result.newKinds);
  assert.ok(result.endKinds<=E.RELICS.length&&result.endCopies<=totalCapacity);
  result.missingKinds=E.RELICS.length-result.endKinds;
  result.unfilledCopies=totalCapacity-result.endCopies;
  runs.push(result);
  if(!result.complete)break;
  const payout=E.rebirthGain(s);
  assert.ok(payout>0,'all scripted return targets require an earned return');
  result.earnedCores=E.rebirth(s);
  assert.equal(result.earnedCores,payout);
  while(E.buyCore(s,'valor'))result.investedValor++;
  assert.equal(s.rebirths,run+1);
  assert.equal(relicKinds(s),result.endKinds,'return cannot erase discoveries');
  assert.equal(copies(s),result.endCopies,'return cannot erase collected copies');
 }
 return {seed,mode,route:route.join('>'),runs,completed:runs.length===3&&runs.every(x=>x.complete)};
}
const samples=ROUTES.flatMap(route=>MODES.flatMap(mode=>SEEDS.map(seed=>scenario(seed,mode,route))));
const summary=ROUTES.map(route=>{
 const matching=samples.filter(x=>x.route===route.join('>'));
 return {route:route.join('>'),trials:matching.length,fullThreeRuns:matching.filter(x=>x.completed).length,
  runs:[0,1,2].map(idx=>{
   const rows=matching.map(x=>x.runs[idx]).filter(Boolean);
   const full=rows.filter(x=>x.complete);
   return {number:idx+1,goal:route[idx],reached:full.length,
    meanNewKinds:rows.length?round(rows.reduce((n,x)=>n+x.newKinds,0)/rows.length):null,
    meanDuplicates:rows.length?round(rows.reduce((n,x)=>n+x.duplicateCopies,0)/rows.length):null,
    meanFirstNewSeconds:rows.filter(x=>x.firstNewSeconds!==null).length?
     round(rows.filter(x=>x.firstNewSeconds!==null).reduce((n,x)=>n+x.firstNewSeconds,0)/
       rows.filter(x=>x.firstNewSeconds!==null).length):null,
    noNewKinds:rows.filter(x=>x.newKinds===0).length,
    endKinds:rows.map(x=>x.endKinds),meanChestsOpened:rows.length?
     round(rows.reduce((n,x)=>n+x.chestOpens,0)/rows.length):null
   };
  })};
});
assert.equal(samples.length,12,'three seeds × two buy policies × two planned routes');
assert.ok(samples.every(x=>x.runs.every(r=>r.endKinds>=r.startKinds)));
const output={experiment:'three-expedition-permanent-relic-discovery',synthetic:true,
 observation:'Three voluntarily scripted expeditions per path, five-minute manual chest openings; no automatic return or invented loot.',
 seeds:SEEDS,modes:MODES,routes:ROUTES,limitPerRun:LIMIT_PER_RUN,
 totalRelicKinds:E.RELICS.length,totalMaxCopies:totalCapacity,summary,samples};
const target=path.join(__dirname,'..','artifacts','expedition','three-run-relic-discovery.json');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify(output,null,2)+'\n');
console.log('RELIC_THREE_RUN_SUMMARY '+JSON.stringify(summary));
for(const x of samples)console.log('RELIC_THREE_RUN_SAMPLE '+JSON.stringify({seed:x.seed,mode:x.mode,route:x.route,completed:x.completed,
 runs:x.runs.map(r=>({number:r.number,goal:r.goal,seconds:r.seconds,newKinds:r.newKinds,
 duplicates:r.duplicateCopies,firstNewSeconds:r.firstNewSeconds,newRelicIds:r.newRelicIds,
 endKinds:r.endKinds,endCopies:r.endCopies,chestOpens:r.chestOpens,intelFinds:r.intelFinds}))}));
console.log('RELIC_THREE_RUN_OUTPUT '+target);
