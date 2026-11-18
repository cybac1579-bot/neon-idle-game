'use strict';
/* Natural combat-variety observation on the actual expedition engine.
 * 12 seeded choices x 3 voluntary runs. No forced drops, units or rewards.
 * This is scripted low-touch play, not a human playtest.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118];
const MODES=['balanced','adaptive'];
const ROUTES=[[25,45,50],[45,50,55]];
const CADENCES=[30,300]; // Same voluntary returns; chest pickup timing is the only policy change.
const LIMIT_PER_RUN=15000;
const COUNT_KEYS=[
 'volleys','triages','flankShots','intercepts','partialCovers','escortDuets',
 'rushes','braces','partialBraces','jams','cleanses','commandMoves','commandSurges','guardPlateBlocks'
];
const FRIENDLY=['volleys','triages','intercepts','partialCovers','escortDuets','braces','partialBraces','cleanses'];
const ENEMY=['flankShots','rushes','jams','commandSurges'];
const CUE_TYPES=new Set([
 'volley','triage','intercept','intercept-duet','cover-step','brace','brace-step','unjam'
]);
const avg=xs=>xs.length?Math.round(xs.reduce((a,b)=>a+b,0)*100/xs.length)/100:null;
function scenario(seed,mode,route,openEvery){
 const s=E.newState(1000);s.seed=seed;
 assert.equal(E.setAutoBuy(s,mode,true),true);
 assert.equal(s.autoChest.enabled,false);
 const runs=[];
 for(let index=0;index<route.length;index++){
  const goal=route[index];
  const startRelics=E.RELICS.filter(r=>E.relic(s,r.id)>0).map(r=>r.id);
  const record={
   number:index+1,goal,completed:false,seconds:null,
   relicsAtStart:startRelics,relicsAtFinish:[],
   stageAtFinish:null,chestsOpened:0,
   counts:Object.fromEntries(COUNT_KEYS.map(k=>[k,0])),
   first:Object.fromEntries(COUNT_KEYS.map(k=>[k,null])),
   firstVisibleCue:null,visibleFriendlyCues:0,
   observedCueTypes:{},recentCueExamples:[],
   firstBossCombatStage:null,firstBossReaction:null,
   firstFlankStage:null,firstInterceptStage:null
  };
  function open(){
   while(s.chests>0){assert.ok(E.openChest(s));record.chestsOpened++;}
  }
  for(let sec=1;sec<=LIMIT_PER_RUN;sec++){
   const stageBefore=s.stage;
   const before=Object.fromEntries(COUNT_KEYS.map(k=>[k,s.relicEffects[k]||0]));
   const cueBefore=s.battleCueSeq;
   E.tick(s,1);
   for(const key of COUNT_KEYS){
    const delta=(s.relicEffects[key]||0)-before[key];
    assert.ok(delta>=0&&Number.isInteger(delta),key+' must be a monotonic action count');
    if(delta>0){
     record.counts[key]+=delta;
     if(record.first[key]===null)record.first[key]={sec,stage:stageBefore};
    }
   }
   if(s.battleCueSeq!==cueBefore&&s.battleEvent&&typeof s.battleEvent.type==='string'){
    const type=s.battleEvent.type;
    record.observedCueTypes[type]=(record.observedCueTypes[type]||0)+1;
    if(CUE_TYPES.has(type)){
     record.visibleFriendlyCues++;
     if(record.firstVisibleCue===null)record.firstVisibleCue={sec,stage:stageBefore,type};
     if(record.recentCueExamples.length<8)record.recentCueExamples.push({sec,stage:stageBefore,type});
    }
   }
   if(E.isBoss(stageBefore)&&record.firstBossCombatStage===null)
    record.firstBossCombatStage=stageBefore;
   if(E.isBoss(stageBefore)&&record.firstBossReaction===null&&
      (record.counts.intercepts>0||record.counts.braces>0||record.counts.escortDuets>0))
    record.firstBossReaction={sec,stage:stageBefore};
   if(record.firstFlankStage===null&&record.first.flankShots)
    record.firstFlankStage=record.first.flankShots.stage;
   if(record.firstInterceptStage===null&&record.first.intercepts)
    record.firstInterceptStage=record.first.intercepts.stage;
   if(sec%openEvery===0)open();
   if(s.stage>goal){open();record.seconds=sec;record.completed=true;break;}
  }
  record.stageAtFinish=s.stage;
  record.relicsAtFinish=E.RELICS.filter(r=>E.relic(s,r.id)>0).map(r=>r.id);
  record.uniqueFriendly=FRIENDLY.filter(k=>record.counts[k]>0);
  record.uniqueEnemy=ENEMY.filter(k=>record.counts[k]>0);
  record.uniqueFriendlyCount=record.uniqueFriendly.length;
  record.uniqueEnemyCount=record.uniqueEnemy.length;
  assert.ok(record.counts.escortDuets<=record.counts.intercepts,
   'all duet shots must be a subset of real interception');
  assert.ok(record.counts.intercepts+record.counts.partialCovers<=record.counts.flankShots,
   'full and partial escort only answer real, mutually exclusive flank attacks');
  assert.ok(record.counts.partialBraces+record.counts.braces<=record.counts.rushes,
   'full and partial brace can only answer real rushes');
  assert.ok(record.counts.braces<=record.counts.rushes,
   'brace can only stop an actual rush');
  assert.ok(record.counts.cleanses<=record.counts.jams,
   'cleanse can only answer an actual jam');
  runs.push(record);
  if(!record.completed)break;
  const earned=E.rebirthGain(s);
  assert.ok(earned>0,'only earned voluntary returns are permitted');
  assert.equal(E.rebirth(s),earned);
  while(E.buyCore(s,'valor')){}
  assert.equal(s.rebirths,index+1);
  assert.deepEqual(E.RELICS.filter(r=>E.relic(s,r.id)>0).map(r=>r.id),
   record.relicsAtFinish,'all permanent relics survive each return');
 }
 return {seed,mode,openEvery,route:route.join('>'),completed:runs.length===3&&runs.every(x=>x.completed),runs};
}
const samples=ROUTES.flatMap(route=>MODES.flatMap(mode=>SEEDS.flatMap(seed=>CADENCES.map(c=>scenario(seed,mode,route,c)))));
assert.equal(samples.length,24);
assert.ok(samples.every(s=>s.completed),'scripted three-return baseline should still clear');
const summary=ROUTES.flatMap(route=>CADENCES.map(openEvery=>{
 const group=samples.filter(s=>s.route===route.join('>')&&s.openEvery===openEvery);
 return {route:route.join('>'),openEvery,scenarios:group.length,completed:group.filter(s=>s.completed).length,
  runs:[0,1,2].map(i=>{
   const rows=group.map(s=>s.runs[i]).filter(Boolean);
   return {number:i+1,goal:route[i],samples:rows.length,
    averageSeconds:avg(rows.map(r=>r.seconds).filter(Number.isFinite)),
    averageUniqueFriendly:avg(rows.map(r=>r.uniqueFriendlyCount)),
    withTwoOrMoreFriendly:rows.filter(r=>r.uniqueFriendlyCount>=2).length,
    withThreeOrMoreFriendly:rows.filter(r=>r.uniqueFriendlyCount>=3).length,
    withAnyVisibleFriendlyCue:rows.filter(r=>r.visibleFriendlyCues>0).length,
    totalCounts:Object.fromEntries(COUNT_KEYS.map(k=>[k,rows.reduce((n,r)=>n+r.counts[k],0)])),
    scenariosWithAction:Object.fromEntries(COUNT_KEYS.map(k=>[k,rows.filter(r=>r.counts[k]>0).length])),
    avgDistinctObservedCueTypes:avg(rows.map(r=>Object.keys(r.observedCueTypes).length))};
  })};
}));
const output={
 experiment:'natural-three-return-combat-variety',synthetic:true,
 methodology:'Engine tick(1), seeded low-touch auto-buy, manual chest batch each 30s or 300s and at target, voluntary return, earned core valor; no forced loot or roster.',
 seeds:SEEDS,modes:MODES,routes:ROUTES,chestOpenCadences:CADENCES,limitPerRun:LIMIT_PER_RUN,
 caveats:['Final battleEvent per second may hide earlier cues from the same second.',
  'Distinct combat actions are not necessarily distinct animations.',
  'These fixed seeded routes cannot estimate population-wide player engagement.',
  'Counter counts measure actual engine activations, not whether a human noticed them.'],
 summary,samples
};
const target=path.join(__dirname,'..','artifacts','expedition','combat-variety-three-return.json');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify(output,null,2)+'\n');
console.log('COMBAT_VARIETY_SUMMARY '+JSON.stringify(summary));
console.log('COMBAT_VARIETY_OUTPUT '+target);
