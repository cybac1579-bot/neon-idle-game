'use strict';
// A new battleCue type must not silently degrade into a generic hit after
// serialization. Scan literal engine emissions and cover dynamic cases.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),E=require('../site/expedition-engine.js');
const source=fs.readFileSync(require.resolve('../site/expedition-engine.js'),'utf8');
const emitted=new Set([...source.matchAll(/battleCue\(s,\s*'([^']+)'/g)].map(m=>m[1]));
for(const type of ['aim','clear','intel'])emitted.add(type);
test('all emitted combat events survive JSON save/restore with their identity',()=>{
 assert.ok(emitted.size>=18,'unexpectedly low event coverage');
 for(const type of emitted){
  const s=E.newState(1000);
  s.battleCueSeq=42;s.battleEvent={seq:42,type,id:'ranger',value:1.25};
  const r=E.normalize(JSON.parse(JSON.stringify(s)),2000);
  assert.deepEqual(r.battleEvent,{seq:42,type,id:'ranger',value:1.25},type);
  assert.equal(r.battleCueSeq,42);
 }
});
test('unknown or malformed battle cues are safely sanitized',()=>{
 const s=E.newState(1000);
 s.battleEvent={seq:7,type:'untrusted-event',id:'unknown',value:-100};
 const r=E.normalize(s,2000);
 assert.deepEqual(r.battleEvent,{seq:7,type:'hit',id:'guard',value:0});
});
test('pursuit boss second-phase cue survives save without re-triggering',()=>{
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=60;s.enemyTactic.stage=60;s.relics.pursuit=1;
 s.enemyHp=E.enemyMax(60)*.5+1;
 for(const actor of s.actors){actor.hp=1e8;actor.progress=1;actor.cooldown=0;}
 E.tick(s,1);
 assert.equal(s.battleEvent.type,'pursuit');
 assert.equal(s.enemyTactic.pursuitTriggered,true);
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.equal(loaded.battleEvent.type,'pursuit');
 assert.equal(loaded.enemyTactic.pursuitTriggered,true);
 assert.equal(E.pursuitBoost(loaded),1.6);
 const n=loaded.events.filter(e=>e.includes('추격 신호기')).length;
 E.tick(loaded,1);
 assert.equal(loaded.events.filter(e=>e.includes('추격 신호기')).length,n);
});
