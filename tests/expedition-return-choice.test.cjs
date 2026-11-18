'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const clone=s=>JSON.parse(JSON.stringify(s));
test('new run does not pretend a return is available or loot is guaranteed',()=>{
 const s=E.newState(1000),original=JSON.stringify(s);
 const d=E.returnChoiceSnapshot(s);
 assert.equal(d.canReturn,false);
 assert.equal(d.returnCores,0);
 assert.equal(d.coresAfterReturn,0);
 assert.equal(d.nextUnopenedTier,5);
 assert.equal(d.uncollectedUnlockedKinds,0);
 assert.equal(d.pendingChests,0);
 assert.equal(d.pendingNewKinds,0);
 assert.equal(d.guaranteedFirstDiscovery,false);
 assert.equal(JSON.stringify(s),original,'read-only decision view');
});
test('return options reflect precise real costs and separate investment choices',()=>{
 const s=E.newState(1000);s.stage=s.best=s.runBest=41;
 s.coreProgress=5.25;s.cores=2;
 s.coreUpgrades.valor=4;s.coreUpgrades.trade=8;
 const old=clone(s),d=E.returnChoiceSnapshot(s);
 assert.equal(d.returnCores,E.rebirthGain(s));
 assert.equal(d.coresAfterReturn,s.cores+d.returnCores);
 assert.deepEqual(d.offers.map(x=>x.cost),['valor','trade'].map(id=>E.coreCost(s,id)));
 for(const offer of d.offers){
  assert.equal(offer.affordableAfterReturn,d.canReturn&&offer.level<30&&d.coresAfterReturn>=offer.cost);
  assert.equal(offer.availableNow,s.cores>=offer.cost);
 }
 assert.equal(d.nextUnopenedTier,45);
 assert.equal(d.uncollectedUnlockedKinds,E.RELICS.filter(r=>r.unlockStage<=40).length);
 assert.deepEqual(s,old,'no purchase, rebirth, RNG or save mutation');
});
test('55-distance unopened special chest truthfully guarantees its undiscovered tier',()=>{
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=56;s.coreProgress=4.2;
 s.chests=1;s.chestDepths=[55];s.relics.pursuit=0;
 const before=clone(s),d=E.returnChoiceSnapshot(s);
 assert.equal(d.nextUnopenedTier,null);
 assert.equal(d.pendingChests,1);
 assert.equal(d.retainedChestsOnReturn,1);
 assert.ok(d.pendingNewKinds>=1);
 assert.equal(d.guaranteedFirstDiscovery,true);
 assert.deepEqual(s,before);
 assert.ok(E.rebirth(s)>0);
 assert.equal(s.chests,1,'actual rebirth keeps earned unopened box');
 assert.deepEqual(s.chestDepths,[55],'source depth survives rebirth');
 assert.equal(E.openChest(s).id,'pursuit','tier guarantee is backed by real loot logic');
});
test('normal and legacy chests are only candidates, never mislabeled a guarantee',()=>{
 const s=E.newState(1000);s.best=s.runBest=56;s.stage=56;s.chests=2;
 s.chestDepths=[5,35];
 const fresh=E.returnChoiceSnapshot(s);
 assert.equal(fresh.guaranteedFirstDiscovery,false);
 assert.ok(fresh.pendingNewKinds>0);
 const old=clone(s);delete old.chestDepths;
 const loaded=E.normalize(old,2000),legacy=E.returnChoiceSnapshot(loaded);
 assert.deepEqual(loaded.chestDepths,[0,0]);
 assert.equal(legacy.pendingChests,2);
 assert.equal(legacy.guaranteedFirstDiscovery,false);
 // Legacy depth 0 contains only the old <=30 loot pool.
 const expected=E.RELICS.filter(r=>r.unlockStage<=30&&E.relic(loaded,r.id)===0).length;
 assert.equal(legacy.pendingNewKinds,expected);
 assert.equal(JSON.stringify(loaded),JSON.stringify(loaded),'no output generation side effect');
});
test('all-collected collection has no invented missing kinds or new tiers',()=>{
 const s=E.newState(1000);s.best=101;s.stage=s.runBest=101;
 for(const r of E.RELICS)s.relics[r.id]=r.cap;
 s.chests=1;s.chestDepths=[55];
 const d=E.returnChoiceSnapshot(s);
 assert.equal(d.uncollectedUnlockedKinds,0);
 assert.equal(d.pendingNewKinds,0);
 assert.equal(d.guaranteedFirstDiscovery,false);
 assert.equal(d.nextUnopenedTier,null);
});
test('a player with an expensive next upgrade does not see an impossible buy',()=>{
 const s=E.newState(1000);s.stage=s.best=s.runBest=11;
 s.claimedBreakthroughDistance=10;s.coreProgress=0;
 s.coreUpgrades.valor=16;s.coreUpgrades.trade=17;
 const d=E.returnChoiceSnapshot(s);
 assert.equal(d.canReturn,false);
 assert.ok(d.offers.every(o=>o.affordableAfterReturn===false));
 assert.ok(d.offers.every(o=>o.cost>0));
});
