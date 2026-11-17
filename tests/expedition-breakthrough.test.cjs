'use strict';
/* Core return audit: first boss gate, one-time progress, legacy saves.
   No reward for rebirth count alone, no automatic stat multiplier. */
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
function state(stage){const s=E.newState(1000);s.stage=s.runBest=s.best=stage;return s;}
test('distance 10 must be defeated before rebirth becomes eligible',()=>{
 const before=state(10);assert.equal(E.rebirthGain(before),0);
 assert.equal(E.rebirth(before),false);
 before.enemyHp=1;before.actors.forEach(a=>{a.progress=1;a.cooldown=0;});
 E.tick(before,1);
 assert.equal(before.stage,11);
 assert.equal(E.rebirthGain(before),1);
 assert.equal(before.chests,1);
});
test('record reward is not awarded on merely arriving at a milestone',()=>{
 const a=state(15),b=state(16);
 assert.equal(E.rebirthRewards(a).recordBonus,0);
 assert.equal(E.rebirthRewards(b).recordBonus,1);
 assert.deepEqual(E.rebirthRewards(b).newMilestones,[{stage:15,cores:1}]);
});
test('first 35 clear grants base 2 and one-time 6 without automatic combat growth',()=>{
 const s=state(36),damage=E.partyDps(s);
 assert.deepEqual(Object.entries(E.rebirthRewards(s)).slice(0,3),[['base',2],['recordBonus',6],['total',8]]);
 assert.equal(E.rebirth(s),8);
 assert.equal(s.cores,8);
 assert.equal(s.claimedBreakthroughDistance,35);
 assert.equal(E.partyDps(s),damage);
});
test('returning again at the same depth grants base only',()=>{
 const s=state(36);assert.equal(E.rebirth(s),8);
 s.stage=s.runBest=36;
 assert.equal(E.rebirthRewards(s).recordBonus,0);
 assert.equal(E.rebirth(s),2);
 assert.equal(s.cores,10);
 assert.equal(s.rebirths,2);
 assert.equal(E.rebirthRewards(s).recordBonus,0);
});
test('previous depth claims do not block a later new distance record',()=>{
 const s=state(16);assert.equal(E.rebirth(s),2);
 s.stage=s.runBest=26;
 const next=E.rebirthRewards(s);
 assert.equal(next.base,2);assert.equal(next.recordBonus,2);
 assert.equal(E.rebirth(s),4);
 s.stage=s.runBest=36;
 assert.equal(E.rebirthRewards(s).recordBonus,3);
});
test('legacy saves start from previously recorded best without retroactive cores',()=>{
 const raw=state(36);raw.rebirths=5;raw.cores=9;delete raw.claimedBreakthroughDistance;
 const loaded=E.normalize(JSON.parse(JSON.stringify(raw)),2000);
 assert.equal(loaded.claimedBreakthroughDistance,35);
 assert.equal(E.rebirthRewards(loaded).recordBonus,0);
 assert.equal(E.rebirth(loaded),2);
 assert.equal(loaded.cores,11);
});
test('unclaimed milestones persist across save/load while actual claims do not duplicate',()=>{
 const first=state(26);
 const loaded=E.normalize(JSON.parse(JSON.stringify(first)),2000);
 assert.equal(E.rebirthRewards(loaded).recordBonus,3);
 assert.equal(E.rebirth(loaded),5);
 const second=E.normalize(JSON.parse(JSON.stringify(loaded)),3000);
 second.stage=second.runBest=26;
 assert.equal(E.rebirthRewards(second).recordBonus,0);
});
test('rebirth count never changes return yield or attack directly',()=>{
 const s=state(11),count=E.rebirthRewards(s).total,damage=E.partyDps(s);
 s.rebirths=999;
 assert.equal(E.rebirthRewards(s).total,count);
 assert.equal(E.partyDps(s),damage);
});
