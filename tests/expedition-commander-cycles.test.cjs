'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const clone=s=>JSON.parse(JSON.stringify(s));
function longEncounter(stage=50,{escort=false,brace=false}={}){
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=stage;s.enemyHp=1e13;
 s.enemyTactic.stage=stage;s.enemyTactic.kind=E.enemyKind(stage);
 s.units.ranger=1;
 s.actors.push({id:'ranger',hp:1e8,revive:0,progress:1,cooldown:1000,shots:0});
 for(const a of s.actors){a.hp=1e8;a.revive=0;a.progress=1;a.cooldown=1000;}
 if(escort){s.relics.guard=1;s.relics.archer=1;}
 if(brace){s.relics.shield=1;s.relics.swift=1;}
 return s;
}
test('40+ elite and boss alternate repeating flank/surge while earlier elites stay single-use',()=>{
 for(const stage of [40,45,50]){
  const s=longEncounter(stage);
  E.tick(s,3);assert.equal(s.enemyTactic.phase,'windup',stage);
  assert.equal(s.enemyTactic.move,'flank');
  E.tick(s,2);assert.equal(s.enemyTactic.turns,1);
  assert.equal(s.relicEffects.flankShots,1);
  assert.ok(s.enemyTactic.nextAt>=40,stage+' cooldown exists');
  E.tick(s,35);
  assert.equal(s.enemyTactic.turns,1,'no early repetition at stage '+stage);
  E.tick(s,1);
  assert.equal(s.enemyTactic.phase,'windup');
  assert.equal(s.enemyTactic.move,'rush');
  assert.equal(s.enemyTactic.windup,1.5);
  E.tick(s,2);
  assert.equal(s.enemyTactic.turns,2);
  assert.equal(s.relicEffects.commandMoves,1);
  assert.equal(s.relicEffects.commandSurges,1);
  assert.equal(s.relicEffects.rushes,1);
  E.tick(s,36);
  assert.equal(s.enemyTactic.move,'flank');
  assert.equal(s.enemyTactic.phase,'windup');
  E.tick(s,2);
  assert.equal(s.enemyTactic.turns,3);
  assert.equal(s.relicEffects.flankShots,2);
  assert.equal(s.relicEffects.commandMoves,2);
 }
 for(const stage of [15,20,25,30,35]){
  const s=longEncounter(stage);E.tick(s,100);
  assert.equal(s.relicEffects.flankShots,1,'early elite single-use: '+stage);
  assert.equal(s.relicEffects.commandMoves,0);
 }
});
test('surge genuinely moves a guard while shield and swift protect and counter',()=>{
 const plain=longEncounter(50),guarded=longEncounter(50,{brace:true});
 E.tick(plain,41);E.tick(guarded,41);
 assert.equal(plain.enemyTactic.phase,'windup');
 assert.equal(guarded.enemyTactic.phase,'windup');
 E.tick(plain,2);E.tick(guarded,2);
 assert.equal(plain.enemyTactic.result,'rush');
 assert.equal(guarded.enemyTactic.result,'brace');
 assert.ok(plain.actors[0].progress<=.22);
 assert.equal(guarded.actors[0].progress,1);
 assert.equal(guarded.relicEffects.braces,1);
 assert.ok(guarded.relicEffects.braceDamage>0);
 assert.ok(guarded.enemyHp<plain.enemyHp);
 const taken=s=>Object.values(s.contribution.taken).reduce((a,b)=>a+b,0);
 assert.ok(Math.abs(taken(plain)-taken(guarded))<1e-7,'surge cannot add extra HP damage');
});
test('escort interception still answers second focus after commander pressure',()=>{
 const s=longEncounter(50,{escort:true,brace:true});
 E.tick(s,5);assert.equal(s.relicEffects.intercepts,1);
 E.tick(s,38);assert.equal(s.relicEffects.commandSurges,1);
 E.tick(s,38);assert.equal(s.enemyTactic.turns,3);
 assert.equal(s.relicEffects.intercepts,2);
 assert.ok(s.relicEffects.counterDamage>0);
});
test('warning, phase and next move survive reload without duplicate strike',()=>{
 const s=longEncounter(50,{brace:true});
 E.tick(s,42);
 assert.equal(s.enemyTactic.move,'rush');
 assert.equal(s.enemyTactic.phase,'windup');
 assert.equal(s.enemyTactic.windup,.5);
 const saved=E.normalize(clone(s),Date.now());
 assert.equal(saved.enemyTactic.windup,.5);
 assert.equal(saved.enemyTactic.turns,1);
 assert.equal(saved.enemyTactic.move,'rush');
 assert.equal(saved.enemyTactic.nextAt,s.enemyTactic.nextAt);
 for(const a of saved.actors){a.hp=1e8;a.revive=0;a.progress=1;a.cooldown=1000;}
 E.tick(saved,1);
 assert.equal(saved.enemyTactic.turns,2);
 assert.equal(saved.relicEffects.commandMoves,1);
 E.tick(saved,8);
 assert.equal(saved.relicEffects.commandSurges,1);
});
test('old deep-boss save starts future cycle without inventing past telemetry',()=>{
 const s=longEncounter(50);E.tick(s,5);
 const legacy=clone(s);
 delete legacy.enemyTactic.turns;delete legacy.enemyTactic.nextAt;delete legacy.enemyTactic.move;
 delete legacy.relicEffects.commandMoves;delete legacy.relicEffects.commandSurges;
 const loaded=E.normalize(legacy,Date.now());
 assert.equal(loaded.relicEffects.commandMoves,0);
 assert.equal(loaded.relicEffects.commandSurges,0);
 assert.equal(loaded.enemyTactic.turns,1);
 assert.ok(loaded.enemyTactic.nextAt>=loaded.enemyTactic.elapsed+35);
 const early=E.newState(1000);delete early.enemyTactic;delete early.relicEffects;
 const old=E.normalize(early,Date.now());
 assert.equal(old.enemyTactic.turns,0);
 assert.equal(old.relicEffects.commandMoves,0);
});
test('return preserves observed commander cycles but resets next run counters',()=>{
 const s=longEncounter(50,{escort:true,brace:true});E.tick(s,81);
 assert.ok(s.relicEffects.commandMoves>=2);
 const moves=s.relicEffects.commandMoves,surges=s.relicEffects.commandSurges;
 assert.ok(E.rebirth(s)>0);
 assert.equal(s.enemyTactic.turns,0);
 assert.equal(s.relicEffects.commandMoves,0);
 assert.equal(s.relicEffects.commandSurges,0);
 assert.equal(s.latestReturn.relicEffects.commandMoves,moves);
 assert.equal(s.runHistory.at(-1).relicEffects.commandSurges,surges);
 const loaded=E.normalize(clone(s),Date.now());
 assert.equal(loaded.latestReturn.relicEffects.commandMoves,moves);
});
