'use strict';
/* The stage-50 permanent chronicle makes distinct discoveries meaningful,
 * but must never leak to shallow/legacy chests or scale without bound. */
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
function chest(depth){
 const s=E.newState(1000);s.chests=1;s.chestDepths=[depth];return s;
}
test('chronicle is a single-copy stage-50-only discovery',()=>{
 const r=E.RELICS.find(x=>x.id==='chronicle');
 assert.ok(r);assert.equal(r.unlockStage,50);assert.equal(r.cap,1);
 assert.equal(E.RELICS.length,15);
 const s=chest(50),found=E.openChest(s);
 assert.equal(found.id,'chronicle');
 assert.equal(found.depth,50);assert.equal(found.duplicate,false);
 assert.equal(E.relic(s,'chronicle'),1);
 s.chests=1;s.chestDepths=[50];
 assert.notEqual(E.openChest(s).id,'chronicle','capped unique must not be drawn twice');
});
test('50-distance arrival is not a boss clear or an earned chest',()=>{
 const s=E.newState(1000);s.stage=s.runBest=s.best=50;
 assert.equal(s.chests,0);
 assert.equal(s.runMilestones[50],undefined);
 assert.equal(E.rebirthRewards(s).newMilestones.some(r=>r.stage===50),false);
 s.enemyHp=1;s.actors.forEach(a=>{a.progress=1;a.cooldown=0});
 E.tick(s,1);
 assert.equal(s.stage,51);assert.equal(s.chestDepths.at(-1),50);
 assert.equal(s.runMilestones[50],1);
 assert.equal(E.rebirthRewards(s).newMilestones.find(r=>r.stage===50).cores,5);
});
test('no shallow box can reveal stage50 chronicle, even opened at stage100',()=>{
 for(const depth of [0,5,10,15,25,30,35,40,45]){
  for(let seed=1;seed<=10;seed++){
   const s=chest(depth);s.seed=seed;s.stage=s.best=s.runBest=100;
   const found=E.openChest(s);
   assert.notEqual(found.id,'chronicle',String(depth));
  }
 }
});
test('unknown-depth legacy saves retain the previous 12-relic pool',()=>{
 const old=E.newState(1000);old.chests=25;delete old.chestDepths;
 const s=E.normalize(old,2000);
 for(let n=0;n<25;n++){
  const found=E.openChest(s);
  if(found.id)assert.ok(E.RELICS.find(r=>r.id===found.id).unlockStage<=30);
 }
 assert.equal(E.relic(s,'chronicle'),0);
});
test('chronicle boosts partyDps by two percent per distinct collected kind',()=>{
 const s=E.newState(1000),baseline=E.partyDps(s);
 s.relics.chronicle=1;
 assert.ok(Math.abs(E.partyDps(s)/baseline-1.02)<1e-10);
 s.relics.chronicle=0;
 s.relics.enlist=1;
 const without=E.partyDps(s);
 s.relics.chronicle=1;
 assert.ok(Math.abs(E.partyDps(s)/without-1.04)<1e-10);
 s.relics.enlist=3;
 assert.ok(Math.abs(E.partyDps(s)/without-1.04)<1e-10,'copies do not add new distinct types');
});
test('full chronicle bonus caps at 30 percent; extra malicious copies do nothing',()=>{
 const s=E.newState(1000);
 E.RELICS.forEach(r=>s.relics[r.id]=r.cap);
 const fullyBoosted=E.partyDps(s);
 s.relics.chronicle=0;
 const noChronicle=E.partyDps(s);
 assert.ok(Math.abs(fullyBoosted/noChronicle-1.3)<1e-10);
 s.relics.chronicle=9999;
 assert.equal(E.partyDps(s),fullyBoosted);
 const restored=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.equal(restored.relics.chronicle,1);
});
test('combat damage uses same chronicle factor as partyDps statistic',()=>{
 const source=E.newState(1000);
 source.stage=2;source.enemyHp=1e7;
 source.actors.forEach(a=>{a.progress=1;a.cooldown=0});
 const ordinary=E.normalize(JSON.parse(JSON.stringify(source)),2000);
 const active=E.normalize(JSON.parse(JSON.stringify(source)),2000);
 active.relics.chronicle=1;
 const predicted=E.partyDps(active)/E.partyDps(ordinary);
 E.tick(active,1);E.tick(ordinary,1);
 const actual=(1e7-active.enemyHp)/(1e7-ordinary.enemyHp);
 assert.ok(Math.abs(actual-predicted)<1e-8,'actual fighter strikes match tooltip DPS');
});
test('chronicle is retained through rebirth without automatic core purchases',()=>{
 const s=chest(50);E.openChest(s);
 s.runBest=s.stage=s.best=51;
 const dpsWith=E.partyDps(s);
 const gained=E.rebirth(s);
 assert.ok(gained>0);
 assert.equal(s.relics.chronicle,1);
 assert.equal(s.coreUpgrades.valor,0);
 assert.equal(s.autoBuy.enabled,false);
 assert.equal(s.rebirths,1);
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.equal(loaded.relics.chronicle,1);
 assert.equal(E.partyDps(loaded),dpsWith);
});
