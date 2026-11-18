'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
function chest(depth,seed=123456789){const s=E.newState(1000);s.seed=seed;s.chests=1;s.chestDepths=[depth];return s;}
function battle(stage){const s=E.newState(1000);s.stage=s.best=s.runBest=stage;s.enemyTactic.stage=stage;s.enemyHp=E.enemyMax(stage);return s;}
test('one unique 55 relic and no shallow reward leak',()=>{
 const r=E.RELICS.find(x=>x.id==='pursuit');
 assert.equal(r.unlockStage,55);assert.equal(r.cap,1);
 for(const depth of [0,5,15,25,35,45,50])for(const seed of [1,100,123456789]){
  const x=E.openChest(chest(depth,seed));assert.notEqual(x.id,'pursuit','depth '+depth);
 }
 const s=chest(55);const found=E.openChest(s);
 assert.equal(found.id,'pursuit');assert.equal(found.duplicate,false);assert.equal(found.depth,55);
 s.chests=1;s.chestDepths=[55];
 assert.notEqual(E.openChest(s).id,'pursuit','unique relic cannot repeat');
});
test('real 55 elite victory gives a chest, not unearned automatic pickup',()=>{
 const s=battle(55);s.enemyHp=1;
 s.actors.forEach(a=>{a.progress=1;a.cooldown=0;a.hp=1e8;});
 E.tick(s,1);
 assert.equal(s.stage,56);assert.deepEqual(s.chestDepths,[55]);
 assert.equal(s.runMilestones[55],1);assert.equal(E.relic(s,'pursuit'),0);
 assert.equal(E.openChest(s).id,'pursuit');
});
test('only 60+ injured bosses trigger the conditional 60% attack boost',()=>{
 const s=battle(60);s.relics.pursuit=1;
 for(const st of [5,25,45,50,55,59,61]){
  s.stage=st;s.enemyHp=E.enemyMax(st)*.25;assert.equal(E.pursuitBoost(s),1);
 }
 s.stage=60;const hp=E.enemyMax(60);
 s.enemyHp=hp*.5001;assert.equal(E.pursuitBoost(s),1);
 s.enemyHp=hp*.5;assert.equal(E.pursuitBoost(s),1.6);
 s.enemyHp=hp*.25;assert.equal(E.pursuitBoost(s),1.6);
 s.relics.pursuit=0;assert.equal(E.pursuitBoost(s),1);
});
test('real guard damage and displayed DPS share the exact 1.6 finisher factor',()=>{
 const plain=battle(60);plain.enemyHp=E.enemyMax(60)*.45;
 plain.actors.forEach(a=>{a.progress=1;a.cooldown=0;a.hp=1e8});
 const buff=JSON.parse(JSON.stringify(plain));buff.relics.pursuit=1;
 assert.ok(Math.abs(E.partyDps(buff)/E.partyDps(plain)-1.6)<1e-10);
 E.tick(plain,1);E.tick(buff,1);
 assert.ok(plain.contribution.damage.guard>0);
 assert.ok(Math.abs(buff.contribution.damage.guard/plain.contribution.damage.guard-1.6)<1e-8);
});
test('crossing half health announces the finishing tactic once across reload',()=>{
 const s=battle(60);s.relics.pursuit=1;s.enemyHp=E.enemyMax(60)*.5+1;
 s.actors.forEach(a=>{a.progress=1;a.cooldown=0;a.hp=1e8});
 E.tick(s,1);
 assert.equal(s.enemyTactic.pursuitTriggered,true);
 assert.equal(s.battleEvent.type,'pursuit');
 assert.equal(s.events.filter(e=>e.includes('추격 신호기')).length,1);
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.equal(loaded.enemyTactic.pursuitTriggered,true);
 // a saved pursuit cue must keep its semantic type, not degrade to '-60'.
 assert.equal(loaded.battleEvent.type,'pursuit');
 assert.equal(loaded.battleEvent.seq,s.battleEvent.seq);
 E.tick(loaded,1);
 assert.ok(loaded.events.filter(e=>e.includes('추격 신호기')).length<=1);
});
test('opt-in opening of earned 55 chest equals manual roll and never returns automatically',()=>{
 const a=chest(55),b=chest(55);a.enemyHp=b.enemyHp=1e13;
 E.setAutoChest(a,true);E.tick(a,60);E.tick(b,60);
 assert.equal(E.openChest(b).id,'pursuit');
 assert.equal(a.autoChest.opened,1);
 for(const key of ['relics','seed','chests','chestDepths'])assert.deepEqual(a[key],b[key],key);
 assert.equal(a.rebirths,0);assert.equal(a.coreUpgrades.valor,0);
});
test('pursuit stays after voluntary rebirth and older saves default to zero',()=>{
 const s=chest(55);E.openChest(s);s.stage=s.best=s.runBest=56;s.coreProgress=20;
 assert.ok(E.rebirth(s)>0);assert.equal(E.relic(s,'pursuit'),1);
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.equal(E.relic(loaded,'pursuit'),1);
 const old=E.newState(1000);delete old.relics.pursuit;
 assert.equal(E.relic(E.normalize(old,2000),'pursuit'),0);
});
test('60 boss keeps a distinct tier while 50 and all previous HP remain unchanged',()=>{
 assert.equal(E.enemyMax(50),562597);
 assert.equal(E.enemyMax(60),2543012);
 assert.ok(E.enemyMax(60)>2.1*E.enemyMax(59));
 for(const stage of [1,10,20,30,40,50])assert.equal(E.pursuitBoost(battle(stage)),1);
 assert.ok(E.MILESTONE_STAGES.includes(55)&&E.MILESTONE_STAGES.includes(60));
});
