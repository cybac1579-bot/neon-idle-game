'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
function hero(){
 const s=E.newState(1000);s.heroLevel=11;s.heroXp=18;
 s.traits.command=6;s.traits.supply=3;s.cores=17;
 s.coreUpgrades.valor=4;s.coreUpgrades.trade=2;
 s.relics.ember=2;s.relics.shield=1;s.rebirths=1;
 s.runBest=s.best=s.stage=35;s.coreProgress=5;s.chests=2;s.chestDepths=[15,25];
 return s;
}
test('voluntary respec returns exactly invested trait points and keeps permanent resources',()=>{
 const s=hero(),original=JSON.parse(JSON.stringify(s));
 assert.equal(E.traitRemaining(s),1);
 assert.equal(E.respecTraits(s),9);
 assert.deepEqual(s.traits,{command:0,supply:0});
 assert.equal(E.traitRemaining(s),10);
 for(const k of ['heroLevel','heroXp','cores','coreSpent','rebirths','stage','best','runBest','chests','coreProgress'])
  assert.equal(s[k],original[k],k);
 for(const k of ['coreUpgrades','relics','chestDepths','units','questLevels'])
  assert.deepEqual(s[k],original[k],k);
});
test('respec may be followed by a different real trait investment with correct cap',()=>{
 const s=hero();E.respecTraits(s);
 for(let i=0;i<10;i++)assert.equal(E.buyTrait(s,'supply'),true);
 assert.equal(s.traits.supply,10);assert.equal(E.traitRemaining(s),0);
 assert.equal(E.buyTrait(s,'supply'),false);
 assert.equal(E.buyTrait(s,'command'),false);
 assert.equal(E.respecTraits(s),10);
 assert.equal(s.traits.supply,0);assert.equal(E.traitRemaining(s),10);
});
test('respec with no spent points is a no-op and cannot mint points',()=>{
 const s=E.newState(1000),before=JSON.stringify(s);
 assert.equal(E.respecTraits(s),false);
 assert.equal(JSON.stringify(s),before);
 for(let i=0;i<3;i++)assert.equal(E.respecTraits(s),false);
 assert.equal(E.traitRemaining(s),0);
});
test('respec preserves the user economy and does not buy anything automatically',()=>{
 const s=hero();const credits=s.credits,auto=JSON.stringify(s.autoBuy);
 const oldCores=s.cores,oldRebirths=s.rebirths,oldQuest=JSON.stringify(s.questLevels);
 assert.equal(E.respecTraits(s),9);
 assert.equal(s.credits,credits);
 assert.equal(s.cores,oldCores);
 assert.equal(s.rebirths,oldRebirths);
 assert.equal(JSON.stringify(s.autoBuy),auto);
 assert.equal(JSON.stringify(s.questLevels),oldQuest);
});
test('saved traits after respec and reallocation restore identically',()=>{
 const s=hero();E.respecTraits(s);E.buyTrait(s,'supply');E.buyTrait(s,'command');
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.deepEqual(loaded.traits,{command:1,supply:1});
 assert.equal(loaded.heroLevel,11);
 assert.equal(E.traitRemaining(loaded),8);
 assert.equal(E.relic(loaded,'ember'),2);
 assert.equal(loaded.coreUpgrades.valor,4);
});
test('voluntary rebirth retains manually reassigned trait distribution',()=>{
 const s=hero();E.respecTraits(s);for(let i=0;i<7;i++)E.buyTrait(s,'command');
 assert.ok(E.rebirth(s)>0);
 assert.deepEqual(s.traits,{command:7,supply:0});
 assert.equal(s.heroLevel,11);
 assert.equal(E.traitRemaining(s),3);
 assert.equal(s.rebirths,2);
});
test('respec has no combat tapping or passive activation: it only runs on explicit call',()=>{
 const s=hero();E.tick(s,60);
 assert.deepEqual(s.traits,{command:6,supply:3});
 E.setAutoBuy(s,'balanced',true);E.setAutoChest(s,true);
 E.tick(s,60);
 assert.deepEqual(s.traits,{command:6,supply:3});
});

test('different trait allocations change real combat and passive-income results',()=>{
 const s=hero();const q=E.QUESTS[0];
 const attackBefore=E.partyDps(s),incomeBefore=E.questIncome(s,q);
 assert.equal(E.respecTraits(s),9);
 const attackAfter=E.partyDps(s),incomeAfter=E.questIncome(s,q);
 assert.ok(attackAfter<attackBefore&&incomeAfter<incomeBefore);
 for(let i=0;i<10;i++)assert.equal(E.buyTrait(s,'supply'),true);
 assert.equal(E.traitRemaining(s),0);
 assert.equal(E.partyDps(s),attackAfter,'economy trait cannot secretly increase combat');
 assert.ok(E.questIncome(s,q)>incomeBefore,'economy investment changes actual quest reward');
 assert.equal(s.cores,17);
});
