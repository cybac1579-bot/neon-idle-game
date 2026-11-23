'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const copy=x=>JSON.parse(JSON.stringify(x));
function encounter(stage=50,{guardCopies=1,archerCopies=1,rangers=2,liveRangers=rangers}={}){
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=stage;s.enemyHp=1e12;
 s.relics.guard=guardCopies;s.relics.archer=archerCopies;
 s.units.ranger=rangers;s.units.medic=0;
 s.actors=s.actors.concat(Array.from({length:rangers},(_,i)=>({
  id:'ranger',hp:1e8,revive:i<liveRangers?0:999,progress:1,cooldown:1e9,shots:0
 })));
 for(const a of s.actors){a.hp=1e8;a.progress=1;a.cooldown=1e9;}
 s.enemyTactic.stage=stage;s.enemyTactic.kind=E.enemyKind(stage);
 return s;
}
test('second copy of both relics and two alive rangers upgrades a deep flank response',()=>{
 const regular=encounter(),master=encounter(50,{guardCopies:2,archerCopies:2});
 E.tick(regular,5);E.tick(master,5);
 assert.equal(regular.relicEffects.flankShots,1);
 assert.equal(master.relicEffects.flankShots,1);
 assert.equal(regular.relicEffects.intercepts,1);
 assert.equal(master.relicEffects.intercepts,1);
 assert.equal(regular.relicEffects.escortDuets,0);
 assert.equal(master.relicEffects.escortDuets,1);
 assert.equal(regular.battleEvent.type,'intercept');
 assert.equal(master.battleEvent.type,'intercept-duet');
 assert.ok(master.relicEffects.counterDamage>regular.relicEffects.counterDamage);
 assert.ok(Math.abs(master.relicEffects.counterDamage/regular.relicEffects.counterDamage-1.5)<1e-8,
  'the extra shot is at most .25x against the existing .5x answer');
 assert.equal(master.relicEffects.volleys,regular.relicEffects.volleys);
 assert.equal(master.relicEffects.commandMoves,regular.relicEffects.commandMoves);
 assert.equal(master.enemyTactic.result,'intercept');
});
test('one missing partner copy or second living ranger disables duet',()=>{
 const states=[
  encounter(50,{guardCopies:1,archerCopies:2}),
  encounter(50,{guardCopies:2,archerCopies:1}),
  encounter(50,{guardCopies:2,archerCopies:2,rangers:1}),
  encounter(50,{guardCopies:2,archerCopies:2,rangers:2,liveRangers:1})
 ];
 for(const s of states){E.tick(s,5);
  assert.equal(s.relicEffects.intercepts,1);
  assert.equal(s.relicEffects.escortDuets,0);
  assert.equal(s.battleEvent.type,'intercept');
 }
});
test('pre-40 and non-elite distance has no new deep duet',()=>{
 const early=encounter(35,{guardCopies:2,archerCopies:2});
 E.tick(early,5);
 assert.equal(early.relicEffects.intercepts,1);
 assert.equal(early.relicEffects.escortDuets,0);
 const regular=encounter(41,{guardCopies:2,archerCopies:2});
 E.tick(regular,5);
 assert.equal(regular.relicEffects.flankShots,0);
 assert.equal(regular.relicEffects.escortDuets,0);
});
test('40+ commander repeat cycle makes duet a reusable tactic without repeated free attacks',()=>{
 const s=encounter(50,{guardCopies:2,archerCopies:2});
 E.tick(s,5);assert.equal(s.relicEffects.escortDuets,1);
 E.tick(s,38);assert.equal(s.relicEffects.commandSurges,1);
 assert.equal(s.relicEffects.escortDuets,1,'front surge is not an escort duet');
 E.tick(s,38);
 assert.equal(s.relicEffects.escortDuets,2,'second flank is a genuine second reaction');
 assert.equal(s.relicEffects.flankShots,2);
 assert.equal(s.relicEffects.intercepts,2);
});
test('save, restore and return preserve cue and engagement counters without inventing old activations',()=>{
 const s=encounter(50,{guardCopies:2,archerCopies:2});
 E.tick(s,5);
 const restored=E.normalize(copy(s),2000);
 assert.equal(restored.battleEvent.type,'intercept-duet');
 assert.equal(restored.relicEffects.escortDuets,1);
 assert.equal(restored.enemyTactic.used,true);
 const legacy=copy(s);delete legacy.relicEffects.escortDuets;
 const old=E.normalize(legacy,2000);
 assert.equal(old.relicEffects.escortDuets,0);
 const count=s.relicEffects.escortDuets;
 assert.ok(E.rebirth(s)>0);
 assert.equal(s.relicEffects.escortDuets,0);
 assert.equal(s.latestReturn.relicEffects.escortDuets,count);
 assert.equal(s.runHistory.at(-1).relicEffects.escortDuets,count);
 const loaded=E.normalize(copy(s),2000);
 assert.equal(loaded.latestReturn.relicEffects.escortDuets,count);
});
test('last copy unlock preview is honest and read-only',()=>{
 const s=E.newState(1000);s.relics.guard=1;s.relics.archer=2;
 const before=copy(s),ready=E.nextRelicCopyPreview(s,'guard');
 assert.match(ready.context,/40거리 이후 사수 2인 호위 협공 해금/);
 assert.equal(ready.from,+E.maxHp(s).toFixed(2));
 const next=copy(s);next.relics.guard=2;
 assert.equal(ready.to,+E.maxHp(next).toFixed(2));
 const withoutPartner=E.newState(1000);withoutPartner.relics.guard=1;withoutPartner.relics.archer=1;
 assert.doesNotMatch(E.nextRelicCopyPreview(withoutPartner,'guard').context||'',/호위 협공 해금/);
 assert.deepEqual(s,before);
});
