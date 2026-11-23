'use strict';
/* Deterministic, explicitly synthetic experiment — not a human playtest. */
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const UNIT_TOTAL=s=>E.UNITS.reduce((a,u)=>a+s.units[u.id],0);
function buyByPriority(s){
 const ops=[
  {kind:'train',allowed:()=>s.training<10},
  {kind:'recruit',allowed:()=>UNIT_TOTAL(s)<12},
  {kind:'quest',id:'dispatch',allowed:()=>s.questLevels.dispatch<5},
  {kind:'quest',id:'salvage',allowed:()=>s.stage>=5&&s.questLevels.salvage<4},
  {kind:'quest',id:'contract',allowed:()=>s.stage>=12&&s.questLevels.contract<3}
 ];
 for(const op of ops){
  if(!op.allowed())continue;
  const bought=E.purchase(s,op.kind,5,op.id||null);
  if(bought.count>0)return {clicks:1,upgrades:bought.count,spent:bought.spent};
 }
 return {clicks:0,upgrades:0,spent:0};
}
function simulate(s,seconds=600){
 const metrics={clicks:0,upgrades:0,spent:0,chestClicks:0,firstAt:{},startDistance:s.stage,initialDamage:E.partyDps(s),initialHp:E.maxHp(s),initialQuest:E.questIncome(s,E.QUESTS[0]),newRelics:0,duplicateRelics:0};
 const steps=[10,15,20,25,30,35];
 for(let sec=1;sec<=seconds;sec++){
  E.tick(s,1);
  for(const stage of steps)if(s.stage>=stage&&metrics.firstAt[stage]===undefined)metrics.firstAt[stage]=sec;
  while(s.chests>0){
   const result=E.openChest(s);metrics.chestClicks++;
   if(result&&result.id){if(result.duplicate)metrics.duplicateRelics++;else metrics.newRelics++;}
  }
  if(sec%12===0)for(let i=0;i<2;i++){
   const r=buyByPriority(s);metrics.clicks+=r.clicks;metrics.upgrades+=r.upgrades;metrics.spent+=r.spent;
   if(!r.clicks)break;
  }
 }
 metrics.finalStage=s.stage;
 metrics.finalCredits=Math.floor(s.credits);
 metrics.totalActions=metrics.clicks+metrics.chestClicks;
 metrics.estimatedSingleBuyActions=metrics.upgrades+metrics.chestClicks;
 metrics.savedClicks=metrics.upgrades-metrics.clicks;
 metrics.roleDamage=Object.fromEntries(E.UNITS.map(u=>[u.id,Math.floor(s.contribution.damage[u.id])]));
 metrics.roleHealing=Object.fromEntries(E.UNITS.map(u=>[u.id,Math.floor(s.contribution.healing[u.id])]));
 metrics.roleTaken=Object.fromEntries(E.UNITS.map(u=>[u.id,Math.floor(s.contribution.taken[u.id])]));
 return metrics;
}
const started=E.normalize(E.newState(100000),100000);
const first=simulate(started,900);
assert.ok(started.best>=10,'first synthetic expedition must reach rebirth');
assert.ok(Object.values(started.relics).some(n=>n>0),'first expedition must earn a relic');
const preReturn={stage:started.stage,level:started.heroLevel,relicCount:Object.values(started.relics).reduce((a,b)=>a+b,0),coreGain:E.rebirthGain(started)};
const cores=E.rebirth(started);
assert.ok(cores>=1);
const upgrades=[];
for(const id of ['valor','trade'])if(E.buyCore(started,id))upgrades.push(id);
const baseline=E.normalize(E.newState(100000),100000);
baseline.seed=started.seed; // identical initial recruitment RNG, but separate growth and unlocks
const bonus=E.permanentBonuses(started);
assert.ok(bonus.attack>1,'earned permanent rewards must change combat potential');
assert.ok(E.partyDps(started)>E.partyDps(baseline),'second run starts stronger than fresh');
const inherited={best:started.best,heroLevel:started.heroLevel,relics:preReturn.relicCount,cores:started.cores,coreUpgrades:{...started.coreUpgrades},bonuses:bonus,upgrades};
const second=simulate(started,900);
const fresh=simulate(baseline,900);
assert.equal(started.rebirths,1);
assert.equal(baseline.rebirths,0);
assert.ok([first,second,fresh].every(x=>Number.isFinite(x.finalStage)&&Number.isFinite(x.savedClicks)));
console.log(JSON.stringify({experiment:'two-expeditions-fixed-batch-policy',durationSecondsPerRun:900,notes:'Synthetic deterministic purchase schedule and instant chest opens. Not observed player behavior. Baseline is an independent fresh run; distance comparison also includes persistent best-stage recruitment unlocks and RNG divergence after progression.',firstRun:first,returnPoint:preReturn,inherited,secondRun:second,freshComparison:fresh,stageDelta:second.finalStage-fresh.finalStage,initialDamageRatio:second.initialDamage/fresh.initialDamage,initialHpRatio:second.initialHp/fresh.initialHp,initialQuestRatio:second.initialQuest/fresh.initialQuest}));
