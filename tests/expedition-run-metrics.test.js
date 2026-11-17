/* Run with: node --test tests/expedition-run-metrics.test.js */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
test('legacy expedition saves initialize action metrics without losing existing state',()=>{
 const old=E.newState(1000);delete old.runMetrics;delete old.runHistory;
 old.credits=1234;old.heroLevel=9;
 const s=E.normalize(JSON.parse(JSON.stringify(old)),1000);
 assert.equal(s.credits,1234);assert.equal(s.heroLevel,9);
 assert.equal(s.runMetrics.manualPurchases,0);
 assert.equal(s.runMetrics.chestsOpened,0);
 assert.deepEqual(s.runHistory,[]);
});
test('manual batch purchases count successful individual transactions only',()=>{
 const s=E.newState(1000);s.credits=10000;
 const p=E.purchase(s,'train',5);
 assert.equal(s.runMetrics.manualPurchases,p.count);
 assert.equal(s.runMetrics.manualSpent,p.spent);
 assert.ok(p.count>0);
});
test('automatic purchases are separated from manual actions',()=>{
 const s=E.newState(1000);s.credits=10000;
 E.setAutoBuy(s,'train',true);
 const p=E.autoPurchaseOnce(s);
 assert.ok(p);
 assert.equal(s.runMetrics.manualPurchases,0);
 assert.equal(s.autoBuy.purchases,1);
});
test('opening a chest counts once even when no other chest remains',()=>{
 const s=E.newState(1000);s.chests=1;
 assert.ok(E.openChest(s));assert.equal(s.runMetrics.chestsOpened,1);
 assert.equal(E.openChest(s),null);assert.equal(s.runMetrics.chestsOpened,1);
});
test('rebirth preserves five histories and resets run-specific counters',()=>{
 const s=E.newState(1000);s.runBest=20;s.best=20;
 for(let i=0;i<6;i++){
  s.clock=100+i;s.runBest=20;s.best=20;
  E.purchase(s,'train',1);
  const expected=s.runMetrics.manualPurchases;
  const gain=E.rebirth(s);
  assert.ok(gain>0);assert.equal(s.runMetrics.manualPurchases,0);
  assert.equal(s.runHistory.at(-1).manualPurchases,expected);
 }
 assert.equal(s.runHistory.length,5);
 assert.equal(s.runHistory[0].duration,101);
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.deepEqual(loaded.runHistory,s.runHistory);
});
