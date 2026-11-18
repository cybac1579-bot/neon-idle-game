'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),E=require('../site/expedition-engine.js');
function paused(){const s=E.newState(1000);s.enemyHp=1e13;return s;}
function oneChest(s){s.chests++;s.chestDepths.push(5);}
test('minute snapshots track auto collection and toggles at their actual times',()=>{
 const s=paused();oneChest(s);E.setAutoChest(s,true);E.tick(s,60);
 const a=s.playtest.snapshots.at(-1);
 assert.equal(a.autoChestEnabled,true);assert.equal(a.autoChestOpened,1);
 assert.equal(a.source,'foreground');assert.equal(s.chests,0);
 E.setAutoChest(s,false);E.tick(s,60);
 const b=s.playtest.snapshots.at(-1);
 assert.equal(b.autoChestEnabled,false);assert.equal(b.autoChestOpened,1);
 assert.equal(s.playtest.snapshots[0].autoChestEnabled,true);
});
test('offline minute snapshots track source and auto collection state',()=>{
 const s=paused();oneChest(s);E.setAutoChest(s,true);s.lastSaved=1000;
 assert.equal(E.offline(s,121000),120);
 assert.equal(s.playtest.snapshots.length,2);
 for(const p of s.playtest.snapshots){
  assert.equal(p.source,'offline');assert.equal(p.autoChestEnabled,true);
  assert.equal(p.autoChestOpened,1);
 }
});
test('manual opening never masquerades as auto collection',()=>{
 const s=paused();oneChest(s);E.tick(s,60);E.openChest(s);
 assert.equal(s.playtest.snapshots.at(-1).autoChestEnabled,false);
 assert.equal(s.playtest.snapshots.at(-1).autoChestOpened,0);
 assert.equal(s.runMetrics.chestsOpened,1);
 assert.equal(s.autoChest.opened,0);
});
test('latest return and recent-run history preserve auto count; new run resets it',()=>{
 const s=paused();s.best=s.runBest=26;s.coreProgress=5;
 oneChest(s);E.setAutoChest(s,true);E.tick(s,60);
 assert.ok(E.rebirth(s)>0);
 assert.equal(s.latestReturn.autoChestOpened,1);
 assert.equal(s.runHistory.at(-1).autoChestOpened,1);
 assert.equal(s.autoChest.opened,0);assert.equal(s.autoChest.enabled,true);
 const restored=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.equal(restored.latestReturn.autoChestOpened,1);
 assert.equal(restored.runHistory.at(-1).autoChestOpened,1);
 assert.equal(restored.autoChest.enabled,true);
});
test('missing legacy history is UNKNOWN, not fabricated false/zero',()=>{
 const s=paused();E.tick(s,60);const old=JSON.parse(JSON.stringify(s));
 delete old.playtest.snapshots[0].autoChestEnabled;
 delete old.playtest.snapshots[0].autoChestOpened;
 old.latestReturn={number:1,cleared:25,cores:5,firstClear:3,earned:2,relicKinds:4,relicCopies:6,chests:0};
 old.runHistory=[{duration:500,best:26,kills:25,cores:5,manualPurchases:2,autoPurchases:1,chestsOpened:5,milestones:{25:500}}];
 const loaded=E.normalize(old,2000);
 assert.equal(loaded.playtest.snapshots[0].autoChestEnabled,null);
 assert.equal(loaded.playtest.snapshots[0].autoChestOpened,null);
 assert.equal(loaded.latestReturn.autoChestOpened,null);
 assert.equal(loaded.runHistory[0].autoChestOpened,null);
 const twice=E.normalize(JSON.parse(JSON.stringify(loaded)),3000);
 assert.equal(twice.playtest.snapshots[0].autoChestEnabled,null);
 assert.equal(twice.runHistory[0].autoChestOpened,null);
});
test('malformed values are bounded without changing effective relic stacks',()=>{
 const s=paused();E.tick(s,60);const raw=JSON.parse(JSON.stringify(s));
 raw.playtest.snapshots[0].autoChestEnabled='true';
 raw.playtest.snapshots[0].autoChestOpened=-30;
 raw.runHistory=[{duration:120,best:11,kills:10,cores:1,autoChestOpened:1e200}];
 const n=E.normalize(raw,3000);
 assert.equal(n.playtest.snapshots[0].autoChestEnabled,null);
 assert.equal(n.playtest.snapshots[0].autoChestOpened,0);
 assert.equal(n.runHistory[0].autoChestOpened,1000000000);
 for(const r of E.RELICS)assert.equal(E.relic(n,r.id),E.relic(s,r.id));
 assert.equal(n.chests,s.chests);
});
