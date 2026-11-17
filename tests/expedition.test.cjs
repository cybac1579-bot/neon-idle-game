'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');

test('original game has an isolated save key and exactly three prototype roles',()=>{
 assert.notEqual(E.SAVE_KEY,'neon_rework_07');
 assert.equal(E.UNITS.length,3);
 assert.equal(E.RELICS.length,12);
 assert.equal(E.QUESTS.length,3);
});

test('new run restores a nonzero enemy and a viable squad',()=>{
 const s=E.normalize(E.newState(100000),100000);
 assert.equal(s.stage,1);
 assert.ok(s.enemyHp>0);
 assert.equal(s.squadHp,E.maxHp(s));
 assert.ok(E.partyDps(s)>0);
});

test('combat advances by itself, without tap attack',()=>{
 const s=E.normalize(E.newState(),Date.now());
 E.tick(s,10);
 assert.ok(s.stage>1);
 assert.ok(s.kills>0);
});

test('first quest rewards are collected automatically',()=>{
 const s=E.normalize(E.newState(),Date.now());
 const before=s.credits;
 // No monsters are needed to exercise the timed income clock.
 s.units={guard:0,ranger:0,medic:0};
 E.tick(s,13);
 assert.ok(s.credits>=before+18);
});

test('recruitment costs credits and growing roster improves damage',()=>{
 const s=E.normalize(E.newState(),Date.now());
 const cost=E.hireCost(s),dps=E.partyDps(s);
 const chosen=E.recruit(s);
 assert.equal(chosen,'guard');
 assert.equal(s.credits,65-cost);
 assert.ok(E.partyDps(s)>dps);
 assert.ok(E.hireCost(s)>cost);
});

test('unlock distance governs the recruitment pool',()=>{
 const s=E.normalize(E.newState(),Date.now());
 s.best=6;s.credits=100000;
 const available=new Set();
 for(let i=0;i<22;i++)available.add(E.recruit(s));
 assert.ok(available.has('ranger'));
 assert.ok(available.has('medic'));
});

test('battle upgrades are priced and consume run credits',()=>{
 const s=E.normalize(E.newState(),Date.now());
 const before=E.partyDps(s),cost=E.trainCost(s);
 assert.equal(E.train(s),true);
 assert.equal(s.credits,65-cost);
 assert.equal(s.training,1);
 assert.ok(E.partyDps(s)>before);
});

test('quest upgrades increase passive rewards',()=>{
 const s=E.normalize(E.newState(),Date.now());
 const before=E.questIncome(s,E.QUESTS[0]);
 assert.ok(E.upgradeQuest(s,'dispatch'));
 assert.ok(E.questIncome(s,E.QUESTS[0])>before);
});

test('elite and boss victories award chests and advance progression',()=>{
 const s=E.normalize(E.newState(),Date.now());
 for(const stage of [5,10]){
  s.stage=stage;s.runBest=stage;s.best=stage;s.enemyHp=1;s.squadHp=E.maxHp(s);
  const before=s.chests;E.tick(s,1);
  assert.equal(s.stage,stage+1);
  assert.equal(s.chests,before+1);
 }
});

test('opening a chest awards a permanent collectible, never a negative balance',()=>{
 const s=E.normalize(E.newState(),Date.now());s.chests=1;
 const result=E.openChest(s);
 assert.ok(result&&result.id);
 assert.equal(s.chests,0);
 assert.equal(E.relic(s,result.id),1);
 assert.equal(E.openChest(s),null);
 assert.ok(s.credits>=0);
});

test('unknown artifact IDs cannot be equipped or inherited',()=>{
 const s=E.normalize({...E.newState(),relics:{hacked:9999,ember:9999}},Date.now());
 assert.equal(s.relics.hacked,undefined);
 assert.equal(E.relic(s,'ember'),5);
 assert.equal(E.relic(s,'hacked'),0);
});

test('chest collection never exceeds catalog cap',()=>{
 const s=E.normalize(E.newState(),Date.now());
 for(const r of E.RELICS)s.relics[r.id]=r.cap;
 s.chests=2;s.best=30;
 const result=E.openChest(s);
 assert.equal(result.id,null);
 assert.equal(s.chests,1);
 assert.ok(s.credits>65);
});

test('player level is permanent and traits consume only earned points',()=>{
 const s=E.normalize(E.newState(),Date.now());
 assert.equal(E.buyTrait(s,'command'),false);
 s.heroLevel=3;
 assert.equal(E.traitRemaining(s),2);
 assert.equal(E.buyTrait(s,'command'),true);
 assert.equal(E.traitRemaining(s),1);
});

test('rebirth requires progress and grants cores, not a free rebirth-count multiplier',()=>{
 const s=E.normalize(E.newState(),Date.now());
 assert.equal(E.rebirth(s),false);
 s.runBest=15;s.best=15;s.stage=15;s.relics.ember=2;s.heroLevel=4;
 s.units.ranger=4;s.training=6;s.questLevels.dispatch=3;
 const gain=E.rebirthGain(s);
 assert.equal(E.rebirth(s),gain);
 assert.equal(s.stage,1);
 assert.equal(s.units.ranger,0);
 assert.equal(s.training,0);
 assert.equal(s.questLevels.dispatch,0);
 assert.equal(s.heroLevel,4);
 assert.equal(s.relics.ember,2);
 assert.equal(s.cores,gain);
 assert.equal(s.rebirths,1);
 const dps=E.partyDps(s);
 // Returned expedition is stronger through relics, not a free +rebirths stat.
 s.rebirths=99;assert.equal(E.partyDps(s),dps);
});

test('core investment consumes currency and boosts next runs',()=>{
 const s=E.normalize(E.newState(),Date.now());
 s.cores=3;
 const prior=E.partyDps(s);
 assert.equal(E.buyCore(s,'valor'),true);
 assert.ok(s.cores<3);
 assert.ok(E.partyDps(s)>prior);
});

test('off-line catch-up uses elapsed wall time and is capped to two hours',()=>{
 const now=10000000;
 const s=E.normalize(E.newState(now),now);
 s.lastSaved=now-12*3600*1000;
 const credited=E.offline(s,now);
 assert.equal(credited,7200);
 assert.equal(s.lastSaved,now);
 assert.ok(s.credits>65);
});

test('malformed legacy and unrelated save objects start a separate expedition',()=>{
 const s=E.normalize({version:999,stage:88,credits:9e10},100);
 assert.equal(s.stage,1);
 assert.equal(s.credits,65);
});

test('save/load restores permanent rewards, enemy progress and bounded event log',()=>{
 const s=E.normalize(E.newState(),Date.now());
 s.heroLevel=12;s.stage=6;s.best=19;s.chests=3;s.relics.ember=1;
 s.events=Array(30).fill('기록');
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
 assert.equal(loaded.heroLevel,12);
 assert.equal(loaded.stage,6);
 assert.equal(loaded.best,19);
 assert.equal(loaded.relics.ember,1);
 assert.equal(loaded.events.length,8);
});
