'use strict';
/* Boss-50 HP sponge fix with one-time in-progress save migration. */
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
function oldHp(stage){
 const early=Math.min(stage-1,39),late=Math.max(0,Math.min(stage-40,60));
 const factor=stage%10===0?3.8:stage%5===0?2:1;
 return Math.min(1e13,Math.round(factor*13*Math.pow(1.235,early)*Math.pow(1.18,late)));
}
function ongoingBoss(stage,remainingRatio){
 const s=E.newState(1000);s.stage=s.best=s.runBest=stage;
 s.enemyHp=Math.round(oldHp(stage)*remainingRatio);
 delete s.bossHpBalanceVersion;
 return s;
}
test('early bosses and every ordinary/elite enemy are unchanged',()=>{
 for(const stage of [1,4,5,10,15,20,25,30,35,39,40,41,45,46,49,51,55,59,61])
  assert.equal(E.enemyMax(stage),oldHp(stage),'stage '+stage);
});
test('50+ boss wall is trimmed without dropping below ordinary/elite challenge',()=>{
 assert.equal(E.enemyMax(50),562597);
 assert.ok(E.enemyMax(50)<oldHp(50));
 assert.ok(E.enemyMax(50)>E.enemyMax(49)*2.4);
 for(const stage of [50,60,70,80]){
  assert.ok(E.enemyMax(stage)<oldHp(stage));
  assert.ok(E.enemyMax(stage)>E.enemyMax(stage-1)*2.4);
 }
});
test('new states and saves carry the post-fix boss curve marker',()=>{
 const s=E.newState(1000);
 assert.equal(s.bossHpBalanceVersion,2);
 s.stage=s.best=s.runBest=50;s.enemyHp=E.enemyMax(50);
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.equal(loaded.bossHpBalanceVersion,2);
 assert.equal(loaded.enemyHp,E.enemyMax(50));
});
test('old in-progress 50-boss saves retain percentage defeated once',()=>{
 for(const ratio of [.1,.4,.85,1]){
  const raw=ongoingBoss(50,ratio);
  const loaded=E.normalize(raw,2000);
  assert.equal(loaded.bossHpBalanceVersion,2);
  assert.ok(Math.abs(loaded.enemyHp/E.enemyMax(50)-ratio)<.00001);
  const next=E.normalize(JSON.parse(JSON.stringify(loaded)),3000);
  assert.equal(next.enemyHp,loaded.enemyHp,'second load must not apply the nerf again');
 }
});
test('old 60-boss saves scale remaining HP, not already defeated percentage',()=>{
 const raw=ongoingBoss(60,.3);
 const restored=E.normalize(raw,2000);
 assert.ok(Math.abs(restored.enemyHp/E.enemyMax(60)-.3)<.00001);
 assert.ok(restored.enemyHp>0);
});
test('old non-boss saves do not lose ongoing battle progress',()=>{
 for(const stage of [10,35,40,49,55,59,61]){
  const s=E.newState(1000);s.stage=s.best=s.runBest=stage;
  s.enemyHp=Math.round(oldHp(stage)*.37);delete s.bossHpBalanceVersion;
  const loaded=E.normalize(s,2000);
  assert.equal(loaded.enemyHp,s.enemyHp);
 }
});
test('50 boss still requires victory to drop depth50 chest and record cores',()=>{
 const s=E.newState(1000);s.stage=s.best=s.runBest=50;
 s.enemyHp=E.enemyMax(50);
 assert.equal(s.chests,0);
 assert.equal(E.rebirthRewards(s).newMilestones.some(m=>m.stage===50),false);
 s.enemyHp=1;s.actors.forEach(a=>{a.progress=1;a.cooldown=0});
 E.tick(s,1);
 assert.equal(s.stage,51);
 assert.equal(s.chests,1);
 assert.equal(s.chestDepths[0],50);
 assert.equal(E.rebirthRewards(s).newMilestones.find(m=>m.stage===50)?.cores,5);
 assert.equal(s.rebirths,0,'no automatic return');
 assert.equal(s.relics.chronicle,undefined,'chest remains unopened');
});
test('rebirth stays voluntary at stage10; no extra cores merely from returning',()=>{
 const stage10=E.newState(1000);stage10.runBest=11;
 assert.equal(E.rebirthGain(stage10),1);
 const gained=E.rebirth(stage10);
 assert.equal(gained,1);
 assert.equal(stage10.rebirths,1);
 assert.equal(stage10.cores,1);
 assert.equal(E.rebirthGain(stage10),0);
});
