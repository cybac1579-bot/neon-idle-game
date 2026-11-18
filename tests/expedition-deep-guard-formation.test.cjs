'use strict';
/* Late formation protection: an earned two-relic defense lets guards reach
 * melee before being erased by enormous 55+ enemy single-hit damage.
 * It is neither free from an old save nor an immortal/unconditional shield. */
const test=require('node:test'),assert=require('node:assert/strict'),E=require('../site/expedition-engine.js');
function front(stage,shield=1,guard=1){
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=stage;
 s.enemyHp=E.enemyMax(stage);s.enemyTactic.stage=stage;
 s.relics.shield=shield;s.relics.guard=guard;
 s.actors.forEach(a=>{a.hp=E.actorMaxHp(s,a.id);a.progress=1;a.cooldown=1e5;});
 return s;
}
test('earned two-item late protection stops the first 55+ one-shot',()=>{
 const s=front(60);const hp=E.actorMaxHp(s,'guard');
 E.tick(s,1);
 assert.equal(s.relicEffects.guardPlateBlocks,1);
 assert.ok(s.actors[0].hp>=hp*.34&&s.actors[0].hp<=hp*.36,
  'first attack must cost only 65% max guard HP');
 assert.equal(s.contribution.falls.guard,0);
 assert.equal(s.rebirths,0);
});
test('two heavy hits still defeat a protected guard, no invulnerability',()=>{
 const s=front(60);E.tick(s,2);
 assert.ok(s.contribution.falls.guard>=1);
 assert.ok(s.actors.some(a=>a.revive>0));
 assert.ok(s.relicEffects.guardPlateBlocks>=1,'only actual HP-saving blocks are counted, not discarded overkill');
});
test('only BOTH shield and escort activate formation cap',()=>{
 for(const [shield,guard] of [[0,0],[0,1],[1,0]]){
  const s=front(60,shield,guard);E.tick(s,1);
  assert.equal(s.relicEffects.guardPlateBlocks,0);
  assert.ok(s.contribution.falls.guard>=1,'missing combination must not gain free defense');
 }
});
test('no earlier stage changes even with both relics',()=>{
 for(const stage of [10,25,40,50]){
  const s=front(stage);E.tick(s,1);
  assert.equal(s.relicEffects.guardPlateBlocks,0,'stage '+stage);
 }
});
test('saved formation counters and ownership roundtrip; absent old field is zero',()=>{
 const s=front(60);E.tick(s,4);
 const restored=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.equal(restored.relicEffects.guardPlateBlocks,s.relicEffects.guardPlateBlocks);
 assert.equal(E.relic(restored,'guard'),1);
 assert.equal(E.relic(restored,'shield'),1);
 const old=JSON.parse(JSON.stringify(s));delete old.relicEffects.guardPlateBlocks;
 assert.equal(E.normalize(old,2000).relicEffects.guardPlateBlocks,0);
});
test('voluntary return retains earned relic combination but resets per-run block tally',()=>{
 const s=front(60);E.tick(s,4);
 const count=s.relicEffects.guardPlateBlocks;
 assert.ok(count>0);
 assert.ok(E.rebirth(s)>0);
 assert.equal(E.relic(s,'guard'),1);assert.equal(E.relic(s,'shield'),1);
 assert.equal(s.relicEffects.guardPlateBlocks,0);
 assert.equal(s.latestReturn.relicEffects.guardPlateBlocks,count);
 assert.equal(s.runHistory.at(-1).relicEffects.guardPlateBlocks,count);
});
test('guard damage mitigation never creates extra cores, loot or enemy damage',()=>{
 const s=front(60);const initialChests=s.chests,initialCores=s.cores;
 E.tick(s,1);
 assert.equal(s.chests,initialChests);
 assert.equal(s.cores,initialCores);
 assert.ok(s.contribution.taken.guard<=E.actorMaxHp(s,'guard')*.65+1e-8);
 assert.ok(s.enemyHp>0);
});
