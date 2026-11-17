'use strict';
/* Depth-bound artifact discovery: deterministic engine checks, no player footage. */
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
function chest(depth,seed=123456789){
 const s=E.newState(1000);s.seed=seed;s.chests=1;s.chestDepths=[depth];return s;
}
test('all fourteen prototype relics have explicit tiered discovery depths',()=>{
 assert.equal(E.RELICS.length,15);
 assert.deepEqual([...new Set(E.RELICS.map(r=>r.unlockStage))].sort((a,b)=>a-b),[5,15,25,30,40,45,50]);
});
test('actual elite and boss clears stamp the defeated distance on each chest',()=>{
 for(const depth of [5,15,25,30,40,45,50]){
  const s=E.newState(1000);
  s.stage=s.best=s.runBest=depth;s.enemyHp=1;
  for(const a of s.actors){a.progress=1;a.cooldown=0;}
  E.tick(s,1);
  assert.equal(s.chests,1);
  assert.deepEqual(s.chestDepths,[depth]);
  assert.equal(E.openChest(s).depth,depth);
 }
});
test('shallow earned chests never yield deep relics even when opened at stage 90',()=>{
 for(let seed=1;seed<=60;seed++){
  const s=chest(5,seed);s.stage=s.best=90;
  const result=E.openChest(s);
  assert.equal(result.depth,5);
  assert.ok(E.RELICS.find(r=>r.id===result.id).unlockStage<=5);
  assert.equal(s.chests,0);assert.deepEqual(s.chestDepths,[]);
 }
});
test('first tier milestone chest guarantees one new matching-depth relic',()=>{
 for(const depth of [15,25,30,40,45,50]){
  const s=chest(depth);
  const reward=E.openChest(s),item=E.RELICS.find(r=>r.id===reward.id);
  assert.ok(item);
  assert.equal(item.unlockStage,depth);
  assert.equal(reward.duplicate,false);
 }
});
test('shallow relic cap exchanges for credits instead of leaking deeper relics',()=>{
 const s=chest(5);
 for(const r of E.RELICS)if(r.unlockStage===5)s.relics[r.id]=r.cap;
 const result=E.openChest(s);
 assert.equal(result.id,null);
 assert.ok(result.credits>0);
 assert.equal(result.depth,5);
 assert.match(s.events.at(-1),/이 상자 깊이의 유물 수집 상한/);
 assert.ok(E.RELICS.filter(r=>r.unlockStage>5).every(r=>E.relic(s,r.id)===0));
});
test('earned chest distances survive save, FIFO opening, and rebirth',()=>{
 const s=E.newState(1000);
 s.chests=3;s.chestDepths=[5,15,30];s.runBest=20;s.best=20;
 const restored=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.deepEqual(restored.chestDepths,[5,15,30]);
 assert.ok(E.rebirth(restored)>0);
 assert.deepEqual(restored.chestDepths,[5,15,30]);
 const results=[E.openChest(restored),E.openChest(restored),E.openChest(restored)];
 assert.deepEqual(results.map(r=>r.depth),[5,15,30]);
 assert.equal(restored.chests,0);
 assert.deepEqual(restored.chestDepths,[]);
 assert.equal(E.openChest(restored),null);
});
test('old saves keep their outstanding chests and original unrestricted reward pool',()=>{
 const legacy=E.newState(1000);legacy.chests=3;delete legacy.chestDepths;
 const s=E.normalize(JSON.parse(JSON.stringify(legacy)),2000);
 assert.deepEqual(s.chestDepths,[0,0,0]);
 assert.equal(E.openChestBatch(s,5).results.length,3);
 assert.equal(s.chests,0);
 assert.equal(s.relicHistory.length,3);
 assert.ok(s.relicHistory.every(r=>r.depth===0));
});
test('multi-open and single-open preserve exact reward order, seed and depth queue',()=>{
 const make=()=>{const s=E.newState(1000);s.chests=5;s.chestDepths=[5,15,25,30,5];return s;};
 const batch=make(),single=make();
 const a=E.openChestBatch(batch,5).results;
 const b=Array.from({length:5},()=>E.openChest(single));
 assert.deepEqual(a,b);assert.equal(batch.seed,single.seed);
 assert.deepEqual(batch.relics,single.relics);
 assert.deepEqual(batch.chestDepths,single.chestDepths);
});
