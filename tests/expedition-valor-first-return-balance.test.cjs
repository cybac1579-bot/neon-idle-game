'use strict';
// First-return balance: initial low-cost cores should not create +24% damage
// for only five cores. Above level nine, existing combat power is invariant.
const test=require('node:test'),assert=require('node:assert/strict'),E=require('../site/expedition-engine.js');
function state(){const s=E.newState(1000);s.enemyHp=1e13;return s;}
const expected=level=>level<=3?1+.03*level:level<9?1+.09+.105*(level-3):1+.08*level;
test('early valor multiplier is bounded, monotone, and rejoins old curve by 9',()=>{
 const s=state(),base=E.partyDps(s);
 let previous=0;
 for(let level=0;level<=30;level++){
  s.coreUpgrades.valor=level;
  const observed=E.partyDps(s)/base;
  assert.ok(Math.abs(observed-expected(level))<1e-11,'LV'+level+' expected '+expected(level)+' got '+observed);
  assert.ok(observed>=previous,'valor purchase must never reduce player power');
  previous=observed;
 }
 assert.ok(Math.abs(expected(3)-1.09)<1e-11);
 assert.ok(Math.abs(expected(9)-1.72)<1e-11);
 assert.ok(Math.abs(expected(30)-3.4)<1e-11);
});
test('first five earned cores still buy three levels, but give +9% not +24% power',()=>{
 const s=state(),baseline=E.partyDps(s);
 s.cores=5;
 assert.ok(E.buyCore(s,'valor'));assert.ok(E.buyCore(s,'valor'));assert.ok(E.buyCore(s,'valor'));
 assert.equal(s.coreUpgrades.valor,3);
 assert.ok(Math.abs(E.partyDps(s)/baseline-1.09)<1e-12);
 assert.equal(E.coreCost(s,'valor'),3);
 assert.equal(s.cores,1);
});
test('retained health bonuses and all core costs are unchanged by the damage reweighting',()=>{
 const s=state(),base=E.actorMaxHp(s,'guard');
 for(let lvl=0;lvl<=30;lvl++){
  s.coreUpgrades.valor=lvl;
  assert.ok(Math.abs(E.actorMaxHp(s,'guard')/base-(1+.06*lvl))<1e-11);
  assert.equal(E.coreCost(s,'valor'),1+Math.floor(lvl/2)+Math.floor(lvl*lvl/8));
 }
});
test('combat guard blows, counter skills and nominal party DPS use one valor power rule',()=>{
 const s=state();s.stage=s.best=s.runBest=14;s.enemyHp=1e13;
 const baseline=JSON.parse(JSON.stringify(s)),up=JSON.parse(JSON.stringify(s));
 for(const v of [baseline,up])v.actors.forEach(a=>{a.progress=1;a.cooldown=0;});
 up.coreUpgrades.valor=3;
 E.tick(baseline,1);E.tick(up,1);
 assert.ok(up.contribution.damage.guard>0);
 assert.ok(baseline.contribution.damage.guard>0);
 assert.ok(Math.abs(up.contribution.damage.guard/baseline.contribution.damage.guard-1.09)<.001,
  'observed guard hits must match the new LV3 multiplier');
});
test('previous saved core levels survive normalization; level9+ nominal DPS is unchanged',()=>{
 const s=state();s.coreUpgrades.valor=3;s.rebirths=2;s.cores=7;
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.equal(loaded.coreUpgrades.valor,3);
 assert.equal(loaded.rebirths,2);assert.equal(loaded.cores,7);
 assert.ok(Math.abs(E.partyDps(loaded)/E.partyDps(E.newState(1000))-1.09)<1e-11);
 for(const lvl of [9,11,17,25,30]){
  loaded.coreUpgrades.valor=lvl;
  const factor=E.partyDps(loaded)/E.partyDps(E.newState(1000));
  assert.ok(Math.abs(factor-(1+.08*lvl))<1e-11,'LV'+lvl+' unchanged');
 }
});
test('an unreturned initial expedition is unaffected by the valor core revision',()=>{
 const s=state();s.stage=25;s.runBest=25;
 const noValor=E.partyDps(s);const oldBase=E.newState(1000);
 assert.ok(Math.abs(noValor-E.partyDps(oldBase))<1e-11);
 assert.equal(s.coreUpgrades.valor,0);
 assert.equal(s.rebirths,0);
});
