'use strict';
/* Stage40 first-playable gap: ten-percent trim only, one-time legacy save
 * migration preserves actual damage dealt. No loot, cores or forced returns. */
const assert=require('node:assert/strict'),test=require('node:test');
const E=require('../site/expedition-engine.js');
const oldBoss40=Math.round(3.8*13*Math.pow(1.235,39));
const newBoss40=Math.round(3.42*13*Math.pow(1.235,39));
test('the isolated 40-distance boss loses 10 percent, never the early or late bosses',()=>{
 assert.equal(E.enemyMax(40),newBoss40);
 assert.ok(Math.abs(newBoss40/oldBoss40-.9)<.00001);
 assert.ok(E.enemyMax(40)>E.enemyMax(39)*4,
  'stage40 remains a major boss instead of an ordinary enemy');
 for(const stage of [1,5,10,15,20,25,30,35,39,41,45,50,55,60,64,65,70]){
  // Previous high-stage elite/boss rebalancing is intentionally untouched.
  const early=Math.min(stage-1,39),late=Math.max(0,Math.min(stage-40,60));
  const rank=E.isBoss(stage)?(stage>=60?1.9:stage>=50?2.2:3.8):
   E.isElite(stage)?(stage>=65?1.2:2):1;
  const old=Math.min(1e13,Math.round(rank*13*Math.pow(1.235,early)*Math.pow(1.18,late)));
  assert.equal(E.enemyMax(stage),old,'other stage '+stage);
 }
});
test('ongoing old stage40 fights preserve defeated HP percentage exactly once',()=>{
 for(const remaining of [.05,.25,.48,.72,1]){
  const raw=E.newState(1000);
  raw.stage=raw.best=raw.runBest=40;
  raw.enemyHp=Math.round(oldBoss40*remaining);
  delete raw.firstDeepBossHpBalanceVersion;
  raw.clock=1200;raw.credits=4567;raw.cores=9;raw.rebirths=2;
  raw.relics.guard=1;raw.chests=2;raw.chestDepths=[20,35];
  raw.engagement={stage:40,seconds:120,autoBuyStart:0,legacyResume:false};
  const oldEnemyHp=raw.enemyHp;
  const saved=E.normalize(raw,2000);
  assert.equal(saved.firstDeepBossHpBalanceVersion,1);
  assert.ok(Math.abs(saved.enemyHp/newBoss40-oldEnemyHp/oldBoss40)<.00001);
  assert.ok(saved.enemyHp>0&&saved.enemyHp<=newBoss40);
  assert.equal(saved.credits,4567);assert.equal(saved.cores,9);
  assert.equal(saved.rebirths,2);assert.equal(E.relic(saved,'guard'),1);
  assert.deepEqual(saved.chestDepths,[20,35]);
  assert.equal(saved.engagement.seconds,120);
  const next=E.normalize(JSON.parse(JSON.stringify(saved)),3000);
  assert.equal(next.enemyHp,saved.enemyHp,
   'loading migrated 40 boss a second time cannot double-reduce HP');
  assert.equal(next.engagement.seconds,120);
 }
});
test('malformed previous-version marker cannot trick old active boss into full health',()=>{
 const raw=E.newState(1000);
 raw.stage=raw.best=raw.runBest=40;raw.enemyHp=Math.round(oldBoss40*.31);
 raw.firstDeepBossHpBalanceVersion=999;
 const loaded=E.normalize(raw,2000);
 assert.ok(loaded.enemyHp>0&&loaded.enemyHp<newBoss40*.35);
 assert.equal(loaded.firstDeepBossHpBalanceVersion,1);
});
test('new, reloaded and manually reborn expeditions use current marker',()=>{
 const fresh=E.newState(1000);
 assert.equal(fresh.firstDeepBossHpBalanceVersion,1);
 fresh.stage=fresh.runBest=fresh.best=40;
 fresh.enemyHp=Math.round(E.enemyMax(40)*.4);
 const loaded=E.normalize(JSON.parse(JSON.stringify(fresh)),2000);
 assert.equal(loaded.enemyHp,fresh.enemyHp);
 assert.equal(loaded.firstDeepBossHpBalanceVersion,1);
 const old=E.newState(1000);
 old.stage=old.best=old.runBest=41;old.coreProgress=10;
 delete old.firstDeepBossHpBalanceVersion;
 const restored=E.normalize(old,2000);
 assert.equal(restored.stage,41);
 assert.equal(restored.enemyHp,old.enemyHp);
 assert.ok(E.rebirth(restored)>0);
 assert.equal(restored.firstDeepBossHpBalanceVersion,1);
 assert.equal(restored.stage,1);
});
test('40 reward is still earned only by a genuine victory',()=>{
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=40;s.enemyHp=E.enemyMax(40);
 assert.equal(s.chests,0);
 assert.equal(E.rebirthRewards(s).newMilestones.some(x=>x.stage===40),false);
 const beforeCores=E.rebirthGain(s);
 s.enemyHp=1;
 s.actors.forEach(a=>{a.progress=1;a.cooldown=0});
 E.tick(s,1);
 assert.equal(s.stage,41);
 assert.equal(s.chests,1);
 assert.deepEqual(s.chestDepths,[40]);
 assert.ok(E.rebirthGain(s)>beforeCores);
 assert.equal(s.rebirths,0);
 assert.equal(s.relics.enlist,undefined);
});

test('stage40 full-squad recovery preserves the encounter and does not invent a return',()=>{
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=40;
 s.enemyHp=E.enemyMax(40)*.6;
 s.autoBuy.enabled=false;
 const remaining=s.enemyHp;
 s.actors.forEach(a=>{a.hp=0;a.revive=3;a.progress=0;a.cooldown=1;});
 s.squadHp=0;s.respawn=3;
 E.tick(s,1);
 assert.equal(s.stage,40,'a wiped squad must not advance');
 assert.equal(s.enemyHp,remaining,'the enemy should not heal or take fictional damage while all actors recover');
 assert.equal(s.rebirths,0);
 assert.equal(s.chests,0);
 assert.ok(s.actors.every(a=>a.revive>0));
 E.tick(s,2);
 assert.ok(s.actors.some(a=>a.revive===0&&a.hp>0),'the squad must rejoin automatically');
 assert.equal(s.stage,40);
 assert.equal(s.rebirths,0);
 assert.ok(s.squadHp>0,'recovered actor HP must update the aggregate health');
});
