'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const clone=s=>JSON.parse(JSON.stringify(s));
function deepFight(stage=50){
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=stage;s.enemyHp=E.enemyMax(stage);
 for(const a of s.actors){a.hp=1e8;a.revive=0;a.progress=1;a.cooldown=1000;}
 return s;
}
test('long standing enemy records actual elapsed time, no automatic core or loot',()=>{
 const s=deepFight();
 E.tick(s,65);
 assert.equal(s.stage,50);
 assert.equal(s.engagement.stage,50);
 assert.equal(s.engagement.seconds,65);
 assert.equal(s.longEngagements,0,'nothing counted until actual victory');
 assert.equal(s.longestEncounter.seconds,0);
 assert.equal(s.chests,0);
 assert.equal(s.rebirths,0);
 for(const a of s.actors){a.cooldown=0;a.progress=1;}
 s.enemyHp=1;
 E.tick(s,1);
 assert.equal(s.stage,51);
 assert.equal(s.longEngagements,1);
 assert.deepEqual(s.longestEncounter,{stage:50,seconds:66});
 assert.equal(s.chests,1,'earned boss chest is unchanged');
 E.tick(s,1);
 assert.equal(s.engagement.stage,51);
 assert.equal(s.engagement.seconds,1);
 assert.equal(s.engagement.legacyResume,false);
});
test('engagements below one minute do not count and longest tracks only actually cleared enemies',()=>{
 const s=deepFight(20);
 E.tick(s,9);
 for(const a of s.actors){a.cooldown=0;a.progress=1;}
 s.enemyHp=1;E.tick(s,1);
 assert.equal(s.longEngagements,0);
 assert.deepEqual(s.longestEncounter,{stage:20,seconds:10});
 E.tick(s,1);
 assert.equal(s.engagement.stage,21);
});
test('current fight, past longest, and activation counts survive JSON reload',()=>{
 const s=deepFight(50);
 s.autoBuy.purchases=10;
 E.tick(s,62);
 s.autoBuy.purchases=13;
 const loaded=E.normalize(clone(s),2000);
 assert.equal(loaded.engagement.stage,50);
 assert.equal(loaded.engagement.seconds,62);
 assert.equal(loaded.engagement.autoBuyStart,10);
 assert.equal(loaded.autoBuy.purchases,13);
 assert.equal(loaded.engagement.legacyResume,false);
 assert.equal(loaded.longestEncounter.seconds,0);
 E.tick(loaded,3);
 assert.equal(loaded.engagement.seconds,65);
});
test('older saves do not fabricate prior boss time and clearly flag unknown duration',()=>{
 const old=deepFight(50);
 delete old.engagement;delete old.longestEncounter;delete old.longEngagements;
 const loaded=E.normalize(clone(old),2000);
 assert.equal(loaded.engagement.seconds,0);
 assert.equal(loaded.engagement.legacyResume,true);
 assert.equal(loaded.engagement.stage,50);
 assert.equal(loaded.longEngagements,0);
 assert.deepEqual(loaded.longestEncounter,{stage:0,seconds:0});
 E.tick(loaded,12);
 assert.equal(loaded.engagement.seconds,12);
 const after=E.normalize(clone(loaded),3000);
 assert.equal(after.engagement.legacyResume,true);
 assert.equal(after.engagement.seconds,12);
});
test('longest completed fight is saved in voluntary return and resets in next run',()=>{
 const s=deepFight(50);
 E.tick(s,65);
 for(const a of s.actors){a.cooldown=0;a.progress=1;}
 s.enemyHp=1;E.tick(s,1);
 const spent=s.longestEncounter.seconds;
 assert.ok(E.rebirth(s)>0);
 assert.deepEqual(s.longestEncounter,{stage:0,seconds:0});
 assert.equal(s.longEngagements,0);
 assert.equal(s.latestReturn.longestEncounter.stage,50);
 assert.equal(s.latestReturn.longestEncounter.seconds,spent);
 assert.equal(s.latestReturn.longEngagements,1);
 assert.equal(s.runHistory.at(-1).longestEncounter.seconds,spent);
 assert.equal(s.runHistory.at(-1).longEngagements,1);
 const restored=E.normalize(clone(s),2000);
 assert.equal(restored.latestReturn.longestEncounter.seconds,spent);
 assert.equal(restored.runHistory.at(-1).longEngagements,1);
});
test('no purchase is forced by reading battle time; only opt-in auto-buy increments',()=>{
 const s=deepFight();
 E.tick(s,180);
 assert.equal(s.autoBuy.purchases,0);
 assert.equal(s.engagement.autoBuyStart,0);
 assert.equal(s.training,0);
 assert.equal(s.rebirths,0);
});
