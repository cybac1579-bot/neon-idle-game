'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
function frozen(seed=123456789){
 const s=E.newState(1000);s.seed=seed;s.enemyHp=1e13;return s;
}
function preload(s,depths){s.chests=depths.length;s.chestDepths=[...depths];return s;}
test('default and legacy save remain OFF',()=>{
 const s=frozen();assert.equal(E.AUTO_CHEST_INTERVAL,60);assert.equal(s.autoChest.enabled,false);
 const old=JSON.parse(JSON.stringify(s));delete old.autoChest;
 assert.equal(E.normalize(old,2000).autoChest.enabled,false);
});
test('reject nonboolean switches and malformed old controls',()=>{
 const s=frozen();assert.equal(E.setAutoChest(s,'true'),false);assert.equal(s.autoChest.enabled,false);
 const old=JSON.parse(JSON.stringify(s));old.autoChest={enabled:'true',elapsed:-100,opened:-10};
 const n=E.normalize(old,2000);
 assert.deepEqual(n.autoChest,{enabled:false,elapsed:0,opened:0});
});
test('every 60s only, no invented chests',()=>{
 const s=preload(frozen(),[5]);E.setAutoChest(s,true);
 E.tick(s,59);assert.equal(s.chests,1);assert.equal(s.autoChest.opened,0);
 E.tick(s,1);assert.equal(s.chests,0);assert.equal(s.autoChest.opened,1);
 E.tick(s,60);assert.equal(s.autoChest.opened,1);
 assert.equal(s.runMetrics.chestsOpened,1);
});
test('same 60 seconds and manual FIFO chest batch produce identical loot RNG/stacks',()=>{
 const initial=preload(frozen(20261118),[5,10,15,20,25,30,35,40,45,50]);
 const auto=JSON.parse(JSON.stringify(initial)),manual=JSON.parse(JSON.stringify(initial));
 E.setAutoChest(auto,true);E.tick(auto,60);
 E.tick(manual,60);const opened=E.openChestBatch(manual,20);
 assert.equal(opened.results.length,10);
 for(const k of ['relics','seed','credits','chests','chestDepths','chestsOpened','relicHistory','runMetrics'])
  assert.deepEqual(auto[k],manual[k],k);
 assert.equal(auto.relics.chronicle,1);assert.equal(auto.autoChest.opened,10);
});
test('one interval opens at most 20 previously earned boxes',()=>{
 const s=preload(frozen(),Array(23).fill(5));E.setAutoChest(s,true);
 E.tick(s,60);assert.equal(s.chests,3);assert.equal(s.autoChest.opened,20);
 E.tick(s,60);assert.equal(s.chests,0);assert.equal(s.autoChest.opened,23);
});
test('default OFF never opens held chests even during two-hour offline',()=>{
 const s=preload(frozen(),[5,10,15]);s.lastSaved=1000;
 assert.equal(E.offline(s,7201000),7200);
 assert.equal(s.chestsOpened,0);assert.equal(s.autoChest.opened,0);
 assert.deepEqual(s.chestDepths.slice(0,3),[5,10,15]);
 assert.ok(s.chests>=3,'battle may earn additional chests; none can be auto-opened while OFF');
});
test('offline and foreground automated draws agree for the same elapsed seconds',()=>{
 const initial=preload(frozen(987654321),[5,10,15,20,25]);
 const a=JSON.parse(JSON.stringify(initial)),b=JSON.parse(JSON.stringify(initial));
 E.setAutoChest(a,true);E.setAutoChest(b,true);
 E.tick(a,180);b.lastSaved=1000;assert.equal(E.offline(b,181000),180);
 for(const k of ['relics','chests','chestDepths','seed','credits','autoChest','relicHistory','coreUpgrades'])
  assert.deepEqual(a[k],b[k],k);
});
test('disable/re-enable never causes instant chest collection',()=>{
 const s=preload(frozen(),[5]);E.setAutoChest(s,true);E.tick(s,35);
 E.setAutoChest(s,false);E.tick(s,100);assert.equal(s.chests,1);
 E.setAutoChest(s,true);E.tick(s,59);assert.equal(s.chests,1);
 E.tick(s,1);assert.equal(s.chests,0);
});
test('saved preference survives manual rebirth without spending cores',()=>{
 const s=preload(frozen(),[5,10]);s.runBest=s.best=26;s.coreProgress=4;s.cores=11;
 E.setAutoChest(s,true);E.tick(s,60);
 assert.equal(s.cores,11);assert.equal(s.rebirths,0);
 assert.equal(s.coreUpgrades.valor,0);
 const restore=E.normalize(JSON.parse(JSON.stringify(s)),3000);
 assert.equal(restore.autoChest.enabled,true);assert.equal(restore.autoChest.opened,2);
 assert.ok(E.rebirth(restore)>0);
 assert.equal(restore.autoChest.enabled,true);assert.equal(restore.autoChest.opened,0);
 assert.equal(restore.coreUpgrades.valor,0);assert.equal(restore.rebirths,1);
 assert.equal(E.normalize(JSON.parse(JSON.stringify(restore)),4000).autoChest.enabled,true);
});
test('manual opening still works while auto selected and is separately counted',()=>{
 const s=preload(frozen(),[5,10,15]);E.setAutoChest(s,true);
 assert.equal(E.openChestBatch(s,5).results.length,3);
 assert.equal(s.autoChest.opened,0);
 E.tick(s,60);assert.equal(s.autoChest.opened,0);
});
