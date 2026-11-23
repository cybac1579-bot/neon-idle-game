'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');

// Deterministic long encounter: no fabricated relics, drops or extra enemy DPS.
function fixture({combo=false,medic=true,ranger=true}={}){
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=16;s.enemyHp=1e10;
 for(const a of s.actors){a.hp=10000;a.revive=0;a.progress=1;a.cooldown=100;}
 if(ranger){s.units.ranger=1;s.actors.push({id:'ranger',hp:10000,revive:0,progress:1,cooldown:100,shots:0});}
 if(medic){s.units.medic=1;s.actors.push({id:'medic',hp:10000,revive:0,progress:1,cooldown:100,shots:0});}
 if(combo){s.relics.medkit=1;s.relics.relay=1;}
 return s;
}
test('ranged disruptors appear at deterministic ordinary stages, preserving chargers and bosses',()=>{
 for(const [stage,kind] of [[8,'charger'],[10,'boss'],[14,'charger'],[15,'elite'],
 [16,'disruptor'],[20,'boss'],[22,'disruptor'],[25,'elite'],[28,'disruptor'],
 [32,'charger'],[34,'disruptor'],[40,'boss'],[46,'disruptor']]){
  assert.equal(E.enemyKind(stage),kind,'stage '+stage);
 }
});
test('disruptor visibly aims, delays a real ranger timer once, and survives mid-telegraph save',()=>{
 const s=fixture();
 E.tick(s,3);
 assert.equal(s.enemyTactic.phase,'windup');
 assert.equal(s.enemyTactic.windup,1.5);
 assert.equal(s.battleEvent.type,'jam-aim');
 s.actors.find(a=>a.id==='ranger').cooldown=2.5;
 E.tick(s,1);
 assert.equal(s.enemyTactic.windup,.5);
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
 assert.equal(loaded.enemyTactic.kind,'disruptor');
 assert.equal(loaded.enemyTactic.windup,.5);
 E.tick(loaded,1);
 assert.equal(loaded.enemyTactic.used,true);
 assert.equal(loaded.enemyTactic.result,'jam');
 assert.equal(loaded.relicEffects.jams,1);
 assert.equal(loaded.battleEvent.type,'jam');
 assert.ok(loaded.actors.find(a=>a.id==='ranger').cooldown>=1.25);
 E.tick(loaded,12);
 assert.equal(loaded.relicEffects.jams,1,'exactly one interference per enemy');
});
test('medkit plus relay requires living medic and cancels the delay with real bounded ranger damage',()=>{
 const base=fixture(),prepared=fixture({combo:true});
 E.tick(base,3);E.tick(prepared,3);
 base.actors.find(a=>a.id==='ranger').cooldown=2.5;
 prepared.actors.find(a=>a.id==='ranger').cooldown=2.5;
 E.tick(base,2);E.tick(prepared,2);
 assert.equal(base.relicEffects.jams,1);
 assert.equal(prepared.relicEffects.jams,1);
 assert.equal(base.relicEffects.cleanses,0);
 assert.equal(prepared.relicEffects.cleanses,1);
 assert.equal(prepared.enemyTactic.result,'unjam');
 assert.equal(prepared.battleEvent.type,'unjam');
 assert.ok(prepared.relicEffects.cleanseDamage>0);
 assert.ok(prepared.enemyHp<base.enemyHp,'the ranger reply changes actual enemy HP');
 assert.ok(base.actors.find(a=>a.id==='ranger').cooldown>
  prepared.actors.find(a=>a.id==='ranger').cooldown,'saved cooldown differs after defended shot');
 const totalTaken=s=>Object.values(s.contribution.taken).reduce((a,b)=>a+b,0);
 assert.ok(Math.abs(totalTaken(base)-totalTaken(prepared))<1e-8,'no extra enemy HP damage from ranged type');
 const loaded=E.normalize(JSON.parse(JSON.stringify(prepared)),Date.now());
 assert.equal(loaded.relicEffects.cleanses,1);
 assert.equal(loaded.relicEffects.cleanseDamage,prepared.relicEffects.cleanseDamage);
 assert.equal(loaded.enemyTactic.result,'unjam');
});
test('no free signal defense with one missing relic or an absent medic',()=>{
 for(const condition of ['medkitOnly','relayOnly','noMedic']){
  const s=fixture({combo:true});
  if(condition==='medkitOnly')s.relics.relay=0;
  if(condition==='relayOnly')s.relics.medkit=0;
  if(condition==='noMedic')for(const a of s.actors.filter(x=>x.id==='medic')){a.hp=0;a.revive=100;}
  E.tick(s,5);
  assert.equal(s.relicEffects.jams,1,condition);
  assert.equal(s.relicEffects.cleanses,0,condition);
  assert.equal(s.relicEffects.cleanseDamage,0,condition);
  assert.equal(s.enemyTactic.result,'jam',condition);
 }
 const rangerless=fixture({combo:true,ranger:false});
 E.tick(rangerless,8);
 assert.equal(rangerless.enemyTactic.phase,'idle');
 assert.equal(rangerless.relicEffects.jams,0);
});
test('disruption counters reset on return but remain in report, legacy saves default to zero',()=>{
 const s=fixture({combo:true});
 E.tick(s,5);
 assert.equal(s.relicEffects.cleanses,1);
 assert.ok(E.rebirth(s)>0);
 assert.equal(s.relicEffects.jams,0);assert.equal(s.relicEffects.cleanses,0);
 assert.equal(s.relicEffects.cleanseDamage,0);
 assert.equal(s.latestReturn.relicEffects.cleanses,1);
 assert.equal(s.runHistory.at(-1).relicEffects.jams,1);
 assert.equal(E.normalize(JSON.parse(JSON.stringify(s)),Date.now()).latestReturn.relicEffects.cleanses,1);
 const old=E.newState(1000);delete old.relicEffects;delete old.enemyTactic;
 const migrated=E.normalize(old,Date.now());
 assert.equal(migrated.relicEffects.jams,0);
 assert.equal(migrated.relicEffects.cleanses,0);
 assert.equal(migrated.enemyTactic.kind,'regular');
});
