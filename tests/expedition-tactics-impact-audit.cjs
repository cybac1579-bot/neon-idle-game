'use strict';
/*
 * Real-code, paired 30m / 120m expedition audit against the last charger-only
 * implementation. Requires a FULL local git checkout for the pinned baseline.
 * Test scenario: no manual taps, auto-buy balanced, auto-chest every 60s,
 * no return/core investment; optional preowned pair isolates combo mechanics.
 *
 * Not a simulation of user behavior; no claim that preowned relics are
 * naturally available on the first expedition.
 */
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const Module=require('node:module');
const path=require('node:path');
const fs=require('node:fs');
const Current=require('../site/expedition-engine.js');
const BASELINE='d863a560cd3f04b454d478a060a2130347c9814d';
const file='site/expedition-engine.js';
const source=execFileSync('git',['show',BASELINE+':'+file],
 {encoding:'utf8',maxBuffer:1024*1024});
assert.match(source,/return stage>=8&&stage%6===2\?'charger':'regular'/,
 'pinned control must be the last charger-only engine');
const baselineModule=new Module(path.join(__dirname,'fixtures','pre-disruptor-engine.cjs'),module);
baselineModule.filename=path.join(__dirname,'fixtures','pre-disruptor-engine.cjs');
baselineModule.paths=module.paths;
baselineModule._compile(source,baselineModule.filename);
const Baseline=baselineModule.exports;

const SEEDS=[123456789,987654321,20261118];
const DURATIONS=[1800,7200];
const CONDITIONS=['natural','preowned-signal'];
const ROUND=n=>Math.round(n*1000)/1000;
function play(E,seed,seconds,condition){
 const s=E.newState(1000);
 s.seed=seed;
 assert.equal(E.setAutoBuy(s,'balanced',true),true);
 assert.equal(E.setAutoChest(s,true),true);
 if(condition==='preowned-signal'){
  s.relics.medkit=1;s.relics.relay=1;
 }
 const checkpoints={};
 const entries={regular:0,charger:0,disruptor:0,elite:0,boss:0};
 const secondsByKind={regular:0,charger:0,disruptor:0,elite:0,boss:0};
 const longEncounters={regular:0,charger:0,disruptor:0,elite:0,boss:0};
 let seen=s.stage,age=0,longMarked=false;
 entries[E.enemyKind(seen)]++;
 const milestoneSet=new Set([10,15,20,25,30,35,40,45,50,60,75]);
 for(let sec=1;sec<=seconds;sec++){
  const kind=E.enemyKind(s.stage);
  secondsByKind[kind]++;
  age++;
  if(age===3&&!longMarked){longEncounters[kind]++;longMarked=true;}
  E.tick(s,1);
  if(s.stage!==seen){
   for(const target of milestoneSet)if(!(target in checkpoints)&&s.stage>target)
    checkpoints[target]=sec;
   seen=s.stage;age=0;longMarked=false;
   entries[E.enemyKind(seen)]++;
  }
 }
 const fx=s.relicEffects||{};
 const r={seed,seconds,condition,stage:s.stage,cleared:s.stage-1,
  coresIfReturned:E.rebirthGain(s),coreProgress:ROUND(s.coreProgress),
  relicKinds:E.RELICS.filter(x=>E.relic(s,x.id)>0).length,
  relicCopies:E.RELICS.reduce((n,x)=>n+E.relic(s,x.id),0),
  chestOpens:s.chestsOpened,credits:Math.round(s.credits),
  training:s.training,actors:s.actors.length,autobuys:s.autoBuy.purchases,
  rebirths:s.rebirths,entries,longEncounters,secondsByKind,checkpoints,
  tactics:{rushes:fx.rushes||0,braces:fx.braces||0,flanks:fx.flankShots||0,
   intercepts:fx.intercepts||0,jams:fx.jams||0,cleanses:fx.cleanses||0,
   cleanseDamage:ROUND(fx.cleanseDamage||0)}};
 assert.equal(r.rebirths,0,'audit must not automatically return');
 assert.ok(Number.isFinite(r.coreProgress)&&r.stage>=1&&r.stage<=100000);
 assert.ok(Number.isFinite(r.coresIfReturned)&&r.coresIfReturned>=0);
 assert.ok(r.chestOpens>=0&&r.autobuys>=0);
 return r;
}
const pairs=[];
for(const condition of CONDITIONS)for(const seconds of DURATIONS)for(const seed of SEEDS){
 const previous=play(Baseline,seed,seconds,condition);
 const current=play(Current,seed,seconds,condition);
 const delta={stage:current.stage-previous.stage,
  core:current.coresIfReturned-previous.coresIfReturned,
  relicKinds:current.relicKinds-previous.relicKinds,
  chestOpens:current.chestOpens-previous.chestOpens};
 assert.equal(previous.entries.disruptor,0,'control cannot contain the new role');
 assert.equal(previous.tactics.jams,0,'control has no jam');
 assert.ok(current.tactics.cleanses<=current.tactics.jams,'no phantom defense');
 assert.ok(current.tactics.jams<=current.entries.disruptor,'at most one jam per disruptor');
 assert.ok(current.tactics.cleanses===0 || condition==='preowned-signal' ||
  current.relicKinds>=2,'unexpected defense without collecting relics');
 pairs.push({seed,minutes:seconds/60,condition,previous,current,delta});
 console.log('TACTICS_PAIR '+JSON.stringify({seed,minutes:seconds/60,condition,delta,
  currentStage:current.stage,coresIfReturned:current.coresIfReturned,
  enemies:current.entries,eligibleBySurvival:current.longEncounters,
  elapsedByKind:current.secondsByKind,tactics:current.tactics}));
}
assert.equal(pairs.length,12);
const summary=CONDITIONS.flatMap(condition=>DURATIONS.map(seconds=>{
 const rows=pairs.filter(p=>p.condition===condition&&p.minutes===seconds/60);
 const avg=key=>ROUND(rows.reduce((sum,p)=>sum+p.delta[key],0)/rows.length);
 return {condition,minutes:seconds/60,pairs:rows.length,
  meanStageDelta:avg('stage'),meanCoreDelta:avg('core'),
  meanRelicKindDelta:avg('relicKinds'),
  totalJams:rows.reduce((n,p)=>n+p.current.tactics.jams,0),
  totalCleanses:rows.reduce((n,p)=>n+p.current.tactics.cleanses,0),
  totalDisruptorsEncountered:rows.reduce((n,p)=>n+p.current.entries.disruptor,0),
  totalDisruptorsSurvivedThreeSeconds:rows.reduce((n,p)=>n+p.current.longEncounters.disruptor,0)};
}));
const result={experiment:'ranged-disruptor-vs-charger-only',baseline:BASELINE,
 synthetic:true,mode:'balanced auto-buy + 60s auto-chest; no manual return',
 note:'12 matched pairs, controlled RNG at start only. Future loot and purchases can diverge following earlier combat. Stage/core equality is not a required outcome.',
 summary,pairs};
const out=path.join(__dirname,'..','artifacts','expedition','tactics-impact.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log('TACTICS_SUMMARY '+JSON.stringify(summary));
console.log('TACTICS_OUTPUT '+out);
