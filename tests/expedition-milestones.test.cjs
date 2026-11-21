'use strict';
/* Exact elite/boss clear stamps; independent of minute snapshots and combat tuning. */
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');

test('fresh and legacy saves have no invented milestone times',()=>{
 const fresh=E.newState(1000);
 assert.deepEqual(fresh.runMilestones,{});
 const old={...fresh};delete old.runMilestones;
 old.runHistory=[{duration:200,best:11,cores:1}];
 const restored=E.normalize(old,2000);
 assert.deepEqual(restored.runMilestones,{});
 assert.deepEqual(restored.runHistory[0].milestones,{});
});

test('actual elite victory stamps its clear time rather than arrival time',()=>{
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=5;s.enemyHp=1;
 assert.equal(s.runMilestones[5],undefined);
 s.actors.forEach(a=>{a.progress=1;a.cooldown=0;});
 E.tick(s,1);
 assert.equal(s.stage,6);
 assert.equal(s.runMilestones[5],1);
 assert.equal(s.runMilestones[10],undefined);
});

test('clearing the first boss records distance 10 without double counting',()=>{
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=10;s.enemyHp=1;
 s.actors.forEach(a=>{a.progress=1;a.cooldown=0;});
 E.tick(s,1);
 assert.equal(s.stage,11);
 assert.equal(s.runMilestones[10],1);
 E.tick(s,3);
 assert.equal(s.runMilestones[10],1);
});

test('early milestones are preserved despite 60-second sampling cadence',()=>{
 const s=E.newState(1000);
 E.tick(s,240);
 assert.ok(s.runMilestones[5]>0);
 assert.ok(s.runMilestones[10]>s.runMilestones[5]);
 assert.ok(s.runMilestones[10]<240);
 assert.equal(s.playtest.snapshots.length,4);
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.deepEqual(loaded.runMilestones,s.runMilestones);
});

test('malformed save input cannot inject arbitrary milestone keys or durations',()=>{
 const raw=E.newState(1000);
 raw.runMilestones={'5':-1,'10':Infinity,'15':33.34,'77':2,'35':'fake'};
 raw.runHistory=[{duration:50,best:15,milestones:{'5':11.18,'90':2,'10':-10}}];
 const restored=E.normalize(raw,2000);
 assert.deepEqual(restored.runMilestones,{'15':33.3});
 assert.deepEqual(restored.runHistory[0].milestones,{'5':11.2});
 assert.ok(Object.keys(restored.runMilestones).every(k=>E.MILESTONE_STAGES.includes(Number(k))));
});

test('rebirth archives this run milestones, resets current, and preserves history',()=>{
 const s=E.newState(1000);
 s.runBest=s.best=s.stage=11;s.runMilestones={'5':13.5,'10':58.2};
 const gained=E.rebirth(s);
 assert.ok(gained>=1);
 assert.deepEqual(s.runMilestones,{});
 assert.deepEqual(s.runHistory.at(-1).milestones,{'5':13.5,'10':58.2});
 const recovered=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.deepEqual(recovered.runHistory.at(-1).milestones,{'5':13.5,'10':58.2});
});

test('offline catch-up and direct clock ticks record the same clear timestamps',()=>{
 const now=1000000;
 const off=E.newState(now),direct=E.newState(now);
 const elapsed=E.offline(off,now+240000);
 E.tick(direct,240);
 assert.equal(elapsed,240);
 assert.deepEqual(off.runMilestones,direct.runMilestones);
 assert.deepEqual(off.seed,direct.seed);
 assert.equal(off.stage,direct.stage);
});
