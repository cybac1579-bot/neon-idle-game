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
  s.clock=100+i;s.runBest=20;s.best=20;s.coreProgress=1.25;
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

test('30-minute low-touch expedition records actual reward and growth cadence',()=>{
 const s=E.newState(1000);
 E.setAutoBuy(s,'balanced',true);
 const checkpoints=[];
 let deliberateActions=0;
 for(let minute=1;minute<=30;minute++){
  E.tick(s,60);
  // One optional strategic intervention per minute, never rapid tapping.
  const kind=minute%2===0?'recruit':'train';
  const bought=E.purchase(s,kind,1);
  if(bought.count)deliberateActions++;
  if(s.chests>0){
   const reward=E.openChest(s);
   if(reward)deliberateActions++;
  }
  if(minute%5===0)checkpoints.push({
   minute,stage:s.stage,best:s.runBest,credits:Math.floor(s.credits),
   recruits:Object.values(s.units).reduce((a,n)=>a+n,0),
   training:s.training,chestsOpened:s.runMetrics.chestsOpened,
   firstRelics:s.runMetrics.firstRelicFinds,
   duplicateRelics:s.runMetrics.duplicateRelics,
   automaticPurchases:s.autoBuy.purchases,
   manualActions:deliberateActions
  });
 }
 assert.equal(checkpoints.length,6);
 assert.equal(Math.floor(s.clock),1800);
 assert.ok(checkpoints.every(x=>Number.isFinite(x.credits)&&x.stage>=1));
 assert.ok(checkpoints.every((x,i)=>i===0||x.chestsOpened>=checkpoints[i-1].chestsOpened));
 assert.ok(s.runMetrics.manualPurchases<=30);
 assert.ok(deliberateActions<=60);
 const intervals=checkpoints.map((point,i)=>{
  const previous=i?checkpoints[i-1]:{minute:0,best:1,chestsOpened:0,firstRelics:0,duplicateRelics:0,automaticPurchases:0,manualActions:0};
  return {fromMinute:previous.minute,toMinute:point.minute,
   bestStageGain:point.best-previous.best,
   chestsOpened:point.chestsOpened-previous.chestsOpened,
   firstRelics:point.firstRelics-previous.firstRelics,
   duplicateRelics:point.duplicateRelics-previous.duplicateRelics,
   automaticPurchases:point.automaticPurchases-previous.automaticPurchases,
   manualActions:point.manualActions-previous.manualActions};
 });
 assert.ok(intervals.every(x=>x.bestStageGain>=0&&x.chestsOpened>=0&&x.firstRelics>=0&&x.duplicateRelics>=0&&x.automaticPurchases>=0&&x.manualActions>=0));
 assert.equal(intervals.reduce((n,x)=>n+x.chestsOpened,0),s.runMetrics.chestsOpened);
 assert.equal(intervals.reduce((n,x)=>n+x.firstRelics,0),s.runMetrics.firstRelicFinds);
 assert.equal(intervals.reduce((n,x)=>n+x.duplicateRelics,0),s.runMetrics.duplicateRelics);
 console.log('LOW_TOUCH_30M '+JSON.stringify(checkpoints));
 console.log('LOW_TOUCH_30M_INTERVALS '+JSON.stringify(intervals));
});

test('30-minute low-touch reward drought sensitivity across genuinely distinct intervention policies',()=>{
 const results=[];
 // Initial timestamps do not seed the engine RNG. Compare actual player choices instead.
 for(const intervention of ['none','alternating','train','recruit']){
  for(const policy of ['balanced','train','recruit']){
   const s=E.newState(1000);
   E.setAutoBuy(s,policy,true);
   const windows=[];let prior={best:1,chests:0,first:0,auto:0};let manual=0;
   for(let minute=1;minute<=30;minute++){
    E.tick(s,60);
    const choice=intervention==='alternating'?(minute%2===0?'recruit':'train'):intervention;
    if(choice!=='none'){
     const bought=E.purchase(s,choice,1);
     if(bought.count)manual++;
    }
    if(s.chests>0&&E.openChest(s))manual++;
    if(minute%5===0){
     const now={best:s.runBest,chests:s.runMetrics.chestsOpened,first:s.runMetrics.firstRelicFinds,auto:s.autoBuy.purchases};
     windows.push({minute,bestGain:now.best-prior.best,chests:now.chests-prior.chests,first:now.first-prior.first,auto:now.auto-prior.auto});
     prior=now;
    }
   }
   assert.equal(windows.length,6);
   assert.ok(windows.every(w=>w.bestGain>=0&&w.chests>=0&&w.first>=0&&w.auto>=0));
   assert.ok(manual<=60);
   assert.equal(windows.reduce((a,w)=>a+w.chests,0),s.runMetrics.chestsOpened);
   assert.equal(windows.reduce((a,w)=>a+w.first,0),s.runMetrics.firstRelicFinds);
   results.push({intervention,policy,stage:s.runBest,firstRelics:s.runMetrics.firstRelicFinds,lateZeroChestWindows:windows.slice(4).filter(w=>w.chests===0).length,manualActions:manual,windows});
  }
 }
 assert.equal(results.length,12);
 console.log('LOW_TOUCH_30M_POLICY_SENSITIVITY '+JSON.stringify(results));
});
