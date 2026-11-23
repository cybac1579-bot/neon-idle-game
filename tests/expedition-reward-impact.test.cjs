'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const clone=s=>JSON.parse(JSON.stringify(s));
function bossBoxes(){
 const s=E.newState(1000);
 for(const r of E.RELICS)if(r.unlockStage<=25)s.relics[r.id]=r.cap;
 s.relics.boss=1;
 s.chests=2;s.chestDepths=[25,25];
 return s;
}
test('each actual boss-only duplicate in same batch explains its own conditional gain',()=>{
 const s=bossBoxes();
 const result=E.openChestBatch(s,5);
 assert.equal(result.results.length,2);
 assert.deepEqual(result.results.map(r=>r.id),['boss','boss']);
 assert.deepEqual(result.results.map(r=>r.duplicate),[true,true]);
 assert.deepEqual(result.results.map(r=>r.copyGain&&[
  r.copyGain.label,r.copyGain.from,r.copyGain.to,r.copyGain.unit,
  r.copyGain.context]),[
  ['지휘급 적 공격 보정',14,28,'%','정예가 아닌 지휘급 보스 대상'],
  ['지휘급 적 공격 보정',28,42,'%','정예가 아닌 지휘급 보스 대상']
 ]);
 assert.equal(result.after.attack,result.before.attack,
  'general party DPS does not include boss-only damage; popup must use specific impact');
 assert.equal(s.relics.boss,3);
 assert.equal(s.runMetrics.duplicateRelics,2);
 assert.ok(!JSON.stringify(s).includes('copyGain'),'reward-only preview must not become save data');
});
test('batch rewards and repeated singles have identical RNG, state, and measured changes',()=>{
 const a=E.newState(1000);a.chests=6;a.chestDepths=[5,15,20,25,30,35];
 const b=clone(a);
 const batch=E.openChestBatch(a,20).results;
 const one=Array.from({length:6},()=>E.openChest(b));
 assert.deepEqual(batch,one,'new preview cannot change drawing sequence');
 assert.deepEqual(a,b,'preview cannot change permanent inventory, credits, RNG or save');
 assert.ok(batch.some(r=>r.copyGain));
});
test('a capped shallow chest never announces a fictional conditional improvement',()=>{
 const s=E.newState(1000);
 for(const r of E.RELICS)if(r.unlockStage<=5)s.relics[r.id]=r.cap;
 s.chests=1;s.chestDepths=[5];
 const reward=E.openChest(s);
 assert.equal(reward.id,null);
 assert.equal(reward.copyGain,undefined);
 assert.ok(reward.credits>0);
});
test('single-copy unique relic is labeled unique, never invents a second stack',()=>{
 const s=E.newState(1000);
 s.chests=1;s.chestDepths=[55];
 const result=E.openChest(s);
 assert.equal(result.id,'pursuit');
 assert.equal(result.copyGain.unique,true);
 assert.equal(result.copyGain.copies,0);
 assert.equal(result.copyGain.cap,1);
 assert.equal(E.nextRelicCopyPreview(s,'pursuit').capped,true);
});
test('the network uses the same reward measurement but never spends an earned chest',()=>{
 const s=E.newState(1000);
 s.relics.scout=1;s.relics.relay=1;
 const pass=stage=>{
  s.stage=s.runBest=s.best=stage;s.enemyHp=1;
  for(const a of s.actors){a.progress=1;a.cooldown=0;a.hp=1e6;a.revive=0;}
  E.tick(s,1);
 };
 pass(30);pass(35);
 assert.equal(s.relicEffects.intelFinds,1);
 const entry=s.relicHistory.at(-1);
 assert.equal(entry.source,'intel');
 assert.equal(s.chests,2,'earned chests are preserved for player opening');
 assert.equal(s.chestsOpened,0);
});
