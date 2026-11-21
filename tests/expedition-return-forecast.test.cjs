'use strict';
// The archive compares a voluntary current return against an actually reachable
// future boss-clear milestone. It must not fabricate cores or force a timer.
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
function stateAt(clear,claimed=0,reserve=0){
 const s=E.newState(1000);s.stage=s.best=s.runBest=clear+1;
 s.coreProgress=Array.from({length:clear},(_,i)=>E.coreProgressForClear(i+1)).reduce((a,b)=>a+b,0);
 s.coreReserve=reserve;s.claimedBreakthroughDistance=claimed;
 return s;
}
test('projection does not enable an instant early return',()=>{
 const s=E.newState(1000),before=JSON.stringify(s);
 const predicted=E.projectedRebirthRewards(s,10);
 assert.equal(E.rebirthGain(s),0);
 assert.equal(predicted.targetCleared,10);
 assert.equal(predicted.recordBonus,1);
 assert.equal(predicted.total,1);
 assert.equal(s.rebirths,0);
 assert.equal(JSON.stringify(s),before);
});
test('projection matches precise future actual rewards including carry',()=>{
 for(const from of [0,10,15,25,35,45,50]){
  for(const target of [10,15,25,35,50,75,100].filter(t=>t>from)){
   const s=stateAt(from,0,.33),raw=JSON.stringify(s);
   const predicted=E.projectedRebirthRewards(s,target);
   const copy=JSON.parse(JSON.stringify(s));
   for(let d=from+1;d<=target;d++)copy.coreProgress=Math.min(1e9,copy.coreProgress+E.coreProgressForClear(d));
   copy.stage=copy.best=copy.runBest=target+1;
   const actual=E.rebirthRewards(copy);
   assert.equal(predicted.total,actual.total,from+'→'+target+' total');
   assert.equal(predicted.base,actual.base,from+'→'+target+' base');
   assert.equal(predicted.recordBonus,actual.recordBonus,from+'→'+target+' bonus');
   assert.equal(predicted.additional,actual.total-E.rebirthGain(s));
   assert.equal(JSON.stringify(s),raw,'source state should be immutable');
  }
 }
});
test('previously claimed breakthrough bonuses never reappear',()=>{
 const s=stateAt(25,25);
 const p=E.projectedRebirthRewards(s,35);
 assert.equal(p.recordBonus,3);
 const repeat=stateAt(50,50);
 const later=E.projectedRebirthRewards(repeat,75);
 assert.equal(later.recordBonus,8);
 assert.equal(E.projectedRebirthRewards(repeat,100).recordBonus,21);
});
test('projected rewards never spend cores or assume return-only power',()=>{
 const s=stateAt(25,25);s.cores=20;s.coreUpgrades.valor=3;
 const before=JSON.stringify(s);
 const next=E.projectedRebirthRewards(s,35);
 assert.ok(next.total>=E.rebirthGain(s));
 assert.equal(s.cores,20);
 assert.equal(s.coreUpgrades.valor,3);
 assert.equal(s.rebirths,0);
 assert.equal(JSON.stringify(s),before);
});
test('invalid and achieved target distance returns null, never fake forecast',()=>{
 const s=stateAt(45);
 for(const target of [0,10,45,-1,45.5,1e8,NaN,Infinity,null,'50'])
  assert.equal(E.projectedRebirthRewards(s,target),null,JSON.stringify(target));
 assert.ok(E.projectedRebirthRewards(s,50));
});
test('a returned save has an independent new future prediction',()=>{
 const s=stateAt(35,0,.6);
 const expected=E.projectedRebirthRewards(s,50);
 const reward=E.rebirth(s);
 assert.ok(reward>0);
 assert.equal(s.rebirths,1);
 assert.equal(s.claimedBreakthroughDistance,35);
 assert.equal(s.coreProgress,0);
 const newP=E.projectedRebirthRewards(s,50);
 assert.equal(newP.recordBonus,5,'already claimed 10/15/25/35 cannot be forecast again');
 assert.ok(newP.total<expected.total,'progress resets after return, even though cores banked');
 const reload=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.deepEqual(E.projectedRebirthRewards(reload,50),newP);
});
