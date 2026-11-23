'use strict';
/* Guard the post-50 core economy against silent growth explosions. */
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
function clearState(distance){const s=E.newState(1000);s.stage=s.best=s.runBest=distance+1;
 s.coreProgress=Array.from({length:distance},(_,i)=>E.coreProgressForClear(i+1)).reduce((a,b)=>a+b,0);
 return s;}
test('per-clear core work stops accelerating after stage45, but remains positive',()=>{
 const at45=E.coreProgressForClear(45);
 assert.ok(at45>0);
 for(const n of [46,50,60,75,100,100000])assert.ok(Math.abs(E.coreProgressForClear(n)-at45)<1e-12);
 assert.ok(E.coreProgressForClear(35)<E.coreProgressForClear(45));
});
test('after stage45, repeat core returns grow linearly with cleared enemies',()=>{
 const p45=clearState(45),p50=clearState(50),p60=clearState(60);
 const r45=E.rebirthRewards(p45).base,r50=E.rebirthRewards(p50).base,r60=E.rebirthRewards(p60).base;
 assert.ok(r50>r45&&r60>r50);
 const per=E.coreProgressForClear(45);
 assert.ok(Math.abs((p50.coreProgress-p45.coreProgress)-5*per)<1e-8);
 assert.ok(Math.abs((p60.coreProgress-p50.coreProgress)-10*per)<1e-8);
});
test('first stage50 boss milestone is +5 once, not a rebirth-count multiplier',()=>{
 const before=clearState(49);before.claimedBreakthroughDistance=45;
 assert.equal(E.rebirthRewards(before).recordBonus,0);
 const after=clearState(50);after.claimedBreakthroughDistance=45;
 assert.equal(E.rebirthRewards(after).recordBonus,5);
 const n=E.rebirthRewards(after).total;
 assert.equal(E.rebirth(after),n);
 after.stage=after.best=after.runBest=51;
 assert.equal(E.rebirthRewards(after).recordBonus,0);
 after.rebirths=300;
 assert.equal(E.rebirthRewards(after).recordBonus,0);
});
test('core purchase costs are nondecreasing and outpace a single stage50 payout',()=>{
 const s=E.newState(1000),costs=[];
 for(let level=0;level<30;level++){s.coreUpgrades.valor=level;costs.push(E.coreCost(s,'valor'));}
 assert.ok(costs.every((cost,i)=>i===0||cost>=costs[i-1]));
 const fullCost=costs.reduce((a,b)=>a+b,0);
 assert.equal(fullCost,1304,'max-level cost is a known guard against later tuning mistakes');
 const first50=E.rebirthGain(clearState(50));
 assert.ok(first50<fullCost/10,'one stage50 clear should not fully unlock permanent combat');
});
test('100 cores buys a bounded number of permanent upgrades with no free repeat bonus',()=>{
 const s=E.newState(1000);s.cores=100;
 let levels=0;while(E.buyCore(s,'valor'))levels++;
 assert.equal(levels,11);
 assert.equal(s.coreUpgrades.valor,11);
 assert.ok(s.cores>0);
 const dps=E.partyDps(s),rebirths=s.rebirths;
 s.rebirths=12345;
 assert.equal(E.partyDps(s),dps);
 assert.equal(s.coreUpgrades.valor,11);
 assert.equal(rebirths,0);
});
test('legacy saves without chronicle do not gain DPS or core payouts implicitly',()=>{
 const a=clearState(50);a.relics={};a.rebirths=5;
 const baseline=E.partyDps(a),payout=E.rebirthGain(a);
 const raw=JSON.parse(JSON.stringify(a));delete raw.relics.chronicle;
 const normalized=E.normalize(raw,2000);
 assert.equal(normalized.relics.chronicle,0);
 assert.equal(E.partyDps(normalized),baseline);
 assert.equal(E.rebirthGain(normalized),payout);
});
