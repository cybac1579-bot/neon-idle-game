'use strict';
/* Return economy tests: first-boss unlock, cleared-depth progress,
   fractional carry, one-time milestone bonuses, quadratic investment costs. */
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
function state(stage){const s=E.newState(1000);s.stage=s.runBest=s.best=stage;return s;}
test('distance 10 must be cleared before the first return',()=>{
 const before=state(10);assert.equal(E.rebirthGain(before),0);
 assert.equal(E.rebirth(before),false);
 before.enemyHp=1;before.actors.forEach(a=>{a.progress=1;a.cooldown=0;});
 E.tick(before,1);
 assert.equal(before.stage,11);
 assert.ok(before.coreProgress>0);
 assert.equal(E.rebirthGain(before),1,'first boss breakthrough, not a repeat free core');
 assert.equal(before.chests,1);
});
test('a later first-clear grants a milestone exactly once, after clearing its enemy',()=>{
 const a=state(15),b=state(16);
 assert.equal(E.rebirthRewards(a).recordBonus,1,'first 10-clear');
 assert.equal(E.rebirthRewards(b).recordBonus,2,'first 10+15 clear');
 assert.deepEqual(E.rebirthRewards(b).newMilestones,[{stage:10,cores:1},{stage:15,cores:1}]);
});
test('first 35 clear earns once-only breakthrough cores but no unearned combat base',()=>{
 const s=state(36),damage=E.partyDps(s);
 const reward=E.rebirthRewards(s);
 assert.equal(reward.base,0);
 assert.equal(reward.recordBonus,7);
 assert.equal(reward.total,7);
 assert.equal(E.rebirth(s),7);
 assert.equal(s.cores,7);
 assert.equal(s.claimedBreakthroughDistance,35);
 assert.equal(E.partyDps(s),damage);
});
test('repeated shallow returns do not generate core merely for pressing return',()=>{
 const s=state(36);assert.equal(E.rebirth(s),7);
 s.stage=s.runBest=36;
 assert.equal(E.rebirthRewards(s).recordBonus,0);
 assert.equal(E.rebirthGain(s),0);
 assert.equal(E.rebirth(s),false,'must earn via combat for a repeat core');
 s.coreProgress=1.4;
 assert.equal(E.rebirth(s),1);
 assert.equal(s.cores,8);
 assert.equal(s.rebirths,2);
 assert.ok(Math.abs(s.coreReserve-.4)<1e-9);
});
test('previous milestones never block an actually new depth record',()=>{
 const s=state(16);assert.equal(E.rebirth(s),2);
 s.stage=s.runBest=26;
 const next=E.rebirthRewards(s);
 assert.equal(next.base,0);assert.equal(next.recordBonus,2);
 assert.equal(E.rebirth(s),2);
 s.stage=s.runBest=36;
 assert.equal(E.rebirthRewards(s).recordBonus,3);
});
test('legacy best distance is not paid again and old cores survive migration',()=>{
 const raw=state(36);raw.rebirths=5;raw.cores=9;
 delete raw.claimedBreakthroughDistance;delete raw.coreProgress;delete raw.coreReserve;
 const loaded=E.normalize(JSON.parse(JSON.stringify(raw)),2000);
 assert.equal(loaded.claimedBreakthroughDistance,35);
 assert.equal(loaded.coreProgress,0);assert.equal(loaded.coreReserve,0);
 assert.equal(E.rebirthRewards(loaded).recordBonus,0);
 assert.equal(E.rebirth(loaded),false);
 loaded.coreProgress=2.25;
 assert.equal(E.rebirth(loaded),2);
 assert.equal(loaded.cores,11);
 assert.ok(Math.abs(loaded.coreReserve-.25)<1e-9);
});
test('unclaimed milestone persists through save and is not duplicated by reload',()=>{
 const first=state(26);
 const loaded=E.normalize(JSON.parse(JSON.stringify(first)),2000);
 assert.equal(E.rebirthRewards(loaded).recordBonus,4);
 assert.equal(E.rebirth(loaded),4);
 const second=E.normalize(JSON.parse(JSON.stringify(loaded)),3000);
 second.stage=second.runBest=26;
 assert.equal(E.rebirthRewards(second).recordBonus,0);
 assert.equal(E.rebirthGain(second),0);
});
test('fractional return core progress survives returns and can form the next core',()=>{
 const s=state(11);s.coreProgress=.65;
 assert.equal(E.rebirth(s),1,'initial boss milestone');
 assert.ok(Math.abs(s.coreReserve-.65)<1e-9);
 assert.equal(s.coreProgress,0);
 s.stage=s.runBest=11;s.coreProgress=.4;
 assert.equal(E.rebirthRewards(s).base,1);
 assert.equal(E.rebirth(s),1);
 assert.ok(Math.abs(s.coreReserve-.05)<1e-9);
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.ok(Math.abs(loaded.coreReserve-.05)<1e-9);
});
test('deeper enemy clears award more fractional core work and the cost curve is bounded',()=>{
 assert.ok(E.coreProgressForClear(35)>E.coreProgressForClear(25));
 assert.ok(E.coreProgressForClear(25)>E.coreProgressForClear(10));
 assert.ok(E.coreProgressForClear(10)>E.coreProgressForClear(1));
 assert.ok(Number.isFinite(E.coreProgressForClear(100000)));
 const s=E.newState();
 const get=l=>{s.coreUpgrades.valor=l;return E.coreCost(s,'valor');};
 assert.deepEqual([get(0),get(2),get(5),get(10),get(20),get(29)],[1,2,6,18,61,120]);
});
test('rebirth count itself neither raises payout nor attack and saved progress rejects malicious values',()=>{
 const s=state(11),before=E.rebirthRewards(s).total,damage=E.partyDps(s);
 s.rebirths=999;
 assert.equal(E.rebirthRewards(s).total,before);
 assert.equal(E.partyDps(s),damage);
 const bad=state(11);bad.coreProgress=Infinity;bad.coreReserve=-10;
 const clean=E.normalize(bad,2000);
 assert.equal(clean.coreProgress,0);assert.equal(clean.coreReserve,0);
});
