'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');

test('original game has an isolated save key and exactly three prototype roles',()=>{
 assert.notEqual(E.SAVE_KEY,'neon_rework_07');
 assert.equal(E.UNITS.length,3);
 assert.equal(E.RELICS.length,15);
 assert.equal(E.QUESTS.length,3);
});

test('new run restores a nonzero enemy and a viable squad',()=>{
 const s=E.normalize(E.newState(100000),100000);
 assert.equal(s.stage,1);
 assert.ok(s.enemyHp>0);
 assert.equal(s.squadHp,E.maxHp(s));
 assert.ok(E.partyDps(s)>0);
});

test('combat advances by itself, without tap attack',()=>{
 const s=E.normalize(E.newState(),Date.now());
 E.tick(s,10);
 assert.ok(s.stage>1);
 assert.ok(s.kills>0);
});

test('first quest rewards are collected automatically',()=>{
 const s=E.normalize(E.newState(),Date.now());
 const before=s.credits;
 // No monsters are needed to exercise the timed income clock.
 s.units={guard:0,ranger:0,medic:0};
 E.tick(s,13);
 assert.ok(s.credits>=before+18);
});

test('recruitment costs credits and growing roster improves damage',()=>{
 const s=E.normalize(E.newState(),Date.now());
 const cost=E.hireCost(s),dps=E.partyDps(s);
 const chosen=E.recruit(s);
 assert.equal(chosen,'guard');
 assert.equal(s.credits,65-cost);
 assert.ok(E.partyDps(s)>dps);
 assert.ok(E.hireCost(s)>cost);
});

test('unlock distance governs the recruitment pool',()=>{
 const s=E.normalize(E.newState(),Date.now());
 s.best=6;s.credits=100000;
 const available=new Set();
 for(let i=0;i<22;i++)available.add(E.recruit(s));
 assert.ok(available.has('ranger'));
 assert.ok(available.has('medic'));
});

test('battle upgrades are priced and consume run credits',()=>{
 const s=E.normalize(E.newState(),Date.now());
 const before=E.partyDps(s),cost=E.trainCost(s);
 assert.equal(E.train(s),true);
 assert.equal(s.credits,65-cost);
 assert.equal(s.training,1);
 assert.ok(E.partyDps(s)>before);
});

test('quest upgrades increase passive rewards',()=>{
 const s=E.normalize(E.newState(),Date.now());
 const before=E.questIncome(s,E.QUESTS[0]);
 assert.ok(E.upgradeQuest(s,'dispatch'));
 assert.ok(E.questIncome(s,E.QUESTS[0])>before);
});

test('elite and boss victories award chests and advance progression',()=>{
 const s=E.normalize(E.newState(),Date.now());
 for(const stage of [5,10]){
  s.stage=stage;s.runBest=stage;s.best=stage;s.enemyHp=1;s.squadHp=E.maxHp(s);
  // New formation combat first moves units into attack range.
  s.actors.forEach(a=>{a.progress=1;a.cooldown=0;});
  const before=s.chests;E.tick(s,1);
  assert.equal(s.stage,stage+1);
  assert.equal(s.chests,before+1);
 }
});

test('opening a chest awards a permanent collectible, never a negative balance',()=>{
 const s=E.normalize(E.newState(),Date.now());s.chests=1;
 const result=E.openChest(s);
 assert.ok(result&&result.id);
 assert.equal(s.chests,0);
 assert.equal(E.relic(s,result.id),1);
 assert.equal(E.openChest(s),null);
 assert.ok(s.credits>=0);
});

test('unknown artifact IDs cannot be equipped or inherited',()=>{
 const s=E.normalize({...E.newState(),relics:{hacked:9999,ember:9999}},Date.now());
 assert.equal(s.relics.hacked,undefined);
 assert.equal(E.relic(s,'ember'),5);
 assert.equal(E.relic(s,'hacked'),0);
});

test('chest collection never exceeds catalog cap',()=>{
 const s=E.normalize(E.newState(),Date.now());
 for(const r of E.RELICS)s.relics[r.id]=r.cap;
 s.chests=2;s.best=30;
 const result=E.openChest(s);
 assert.equal(result.id,null);
 assert.equal(s.chests,1);
 assert.ok(s.credits>65);
});

test('player level is permanent and traits consume only earned points',()=>{
 const s=E.normalize(E.newState(),Date.now());
 assert.equal(E.buyTrait(s,'command'),false);
 s.heroLevel=3;
 assert.equal(E.traitRemaining(s),2);
 assert.equal(E.buyTrait(s,'command'),true);
 assert.equal(E.traitRemaining(s),1);
});

test('rebirth requires progress and grants cores, not a free rebirth-count multiplier',()=>{
 const s=E.normalize(E.newState(),Date.now());
 assert.equal(E.rebirth(s),false);
 s.runBest=15;s.best=15;s.stage=15;s.relics.ember=2;s.heroLevel=4;
 s.units.ranger=4;s.training=6;s.questLevels.dispatch=3;
 const gain=E.rebirthGain(s);
 assert.equal(E.rebirth(s),gain);
 assert.equal(s.stage,1);
 assert.equal(s.units.ranger,0);
 assert.equal(s.training,0);
 assert.equal(s.questLevels.dispatch,0);
 assert.equal(s.heroLevel,4);
 assert.equal(s.relics.ember,2);
 assert.equal(s.cores,gain);
 assert.equal(s.rebirths,1);
 const dps=E.partyDps(s);
 // Returned expedition is stronger through relics, not a free +rebirths stat.
 s.rebirths=99;assert.equal(E.partyDps(s),dps);
});

test('core investment consumes currency and boosts next runs',()=>{
 const s=E.normalize(E.newState(),Date.now());
 s.cores=3;
 const prior=E.partyDps(s);
 assert.equal(E.buyCore(s,'valor'),true);
 assert.ok(s.cores<3);
 assert.ok(E.partyDps(s)>prior);
});

test('off-line catch-up uses elapsed wall time and is capped to two hours',()=>{
 const now=10000000;
 const s=E.normalize(E.newState(now),now);
 s.lastSaved=now-12*3600*1000;
 const credited=E.offline(s,now);
 assert.equal(credited,7200);
 assert.equal(s.lastSaved,now);
 assert.ok(s.credits>65);
});

test('malformed legacy and unrelated save objects start a separate expedition',()=>{
 const s=E.normalize({version:999,stage:88,credits:9e10},100);
 assert.equal(s.stage,1);
 assert.equal(s.credits,65);
});

test('save/load restores permanent rewards, enemy progress and bounded event log',()=>{
 const s=E.normalize(E.newState(),Date.now());
 s.heroLevel=12;s.stage=6;s.best=19;s.chests=3;s.relics.ember=1;
 s.events=Array(30).fill('기록');
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
 assert.equal(loaded.heroLevel,12);
 assert.equal(loaded.stage,6);
 assert.equal(loaded.best,19);
 assert.equal(loaded.relics.ember,1);
 assert.equal(loaded.events.length,8);
});


test('each role has an individual living fighter and a persisted march position',()=>{
 const s=E.normalize(E.newState(100000),100000);
 assert.equal(s.actors.length,2);
 E.tick(s,.5);
 assert.ok(s.actors[0].progress>0);
 const restored=E.normalize(JSON.parse(JSON.stringify(s)),100500);
 assert.equal(restored.actors.length,2);
 assert.equal(restored.actors[0].progress,s.actors[0].progress);
 assert.equal(restored.squadHp,s.squadHp);
});

test('ranger attacks from behind the guard, and receives no free tank priority',()=>{
 const s=E.normalize(E.newState(),Date.now());
 s.credits=100000;s.best=s.stage=6;
 for(let n=0;n<20 && s.units.ranger===0;n++)E.recruit(s);
 assert.ok(s.units.ranger>0,'recruitment pool must contain rangers');
 s.actors.forEach(a=>{a.progress=a.id==='ranger'?.5:0;a.cooldown=0;});
 s.enemyHp=1e8;
 const before=s.enemyHp;E.tick(s,.5);
 assert.ok(s.enemyHp<before,'ranged attacks should fire at half-way range');
});

test('guard is targeted before rear units and fallen fighters recover independently',()=>{
 const s=E.normalize(E.newState(),Date.now());
 s.stage=s.best=60;s.enemyHp=E.enemyMax(60);
 s.actors.forEach(a=>{a.progress=1;a.cooldown=3;});
 s.actors[0].hp=.0001;
 E.tick(s,1);
 assert.ok(s.actors[0].revive>0,'a damaged front-line guard should fall');
 assert.equal(s.actors[1].revive,0,'other guards continue standing');
 const firstFall=s.actors[0].revive;
 E.tick(s,Math.min(firstFall+.1,7));
 assert.equal(s.actors[0].revive,0);
 assert.ok(s.actors[0].hp>0);
});

test('medics heal living wounded fighters and do not magically revive fallen ones',()=>{
 const s=E.normalize(E.newState(),Date.now());
 s.credits=1e9;s.stage=s.best=6;
 for(let n=0;n<30&&s.units.medic===0;n++)E.recruit(s);
 assert.ok(s.units.medic>0);
 s.actors.forEach(a=>{a.progress=1;a.cooldown=10;});
 s.actors[0].hp=5;
 const prior=s.actors[0].hp;
 E.tick(s,.5);
 assert.ok(s.actors[0].hp>prior,'medic heals front line');
});

test('interleaved recruit order survives save/load without resetting HP or progress',()=>{
 const s=E.normalize(E.newState(),Date.now());
 s.credits=1e9;s.best=10;
 for(let i=0;i<20;i++)E.recruit(s);
 s.actors[3].hp=3.5;s.actors[3].progress=.71;
 const ids=s.actors.map(a=>a.id);
 const restored=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
 assert.deepEqual(restored.actors.map(a=>a.id),ids);
 assert.equal(restored.actors[3].hp,3.5);
 assert.equal(restored.actors[3].progress,.71);
});


test('simultaneous medic healing does not hide the attack cue',()=>{
 const s=E.normalize(E.newState(),Date.now());
 s.units.medic=1;s.actors.push({id:'medic',hp:25,revive:0,progress:1,cooldown:3});
 s.actors.forEach(a=>{a.progress=1;a.cooldown=a.id==='guard'?0:3;});
 s.actors[0].hp=10;s.enemyHp=1e9;
 const hp=s.actors[0].hp,enemy=s.enemyHp;
 E.tick(s,.5);
 assert.ok(s.actors[0].hp>hp,'medic still heals');
 assert.ok(s.enemyHp<enemy,'guards still attack');
 assert.equal(s.battleEvent.type,'hit','attack feedback remains visible');
});


test('bounded bulk purchases match exact individual recruit RNG, credits, and roster',()=>{
 const create=()=>{const s=E.normalize(E.newState(1000),1000);s.credits=10000;s.best=12;return s;};
 const bulk=create(),single=create(),before=bulk.credits;
 const result=E.purchase(bulk,'recruit',5);
 let count=0;while(count<5&&E.recruit(single))count++;
 assert.equal(result.count,count);
 assert.equal(result.spent,before-bulk.credits);
 assert.equal(bulk.credits,single.credits);
 assert.equal(bulk.seed,single.seed);
 assert.deepEqual(bulk.units,single.units);
 assert.deepEqual(bulk.actors,single.actors);
});

test('bulk training and quests preserve sequential prices and stop at unaffordable next level',()=>{
 for(const [kind,id] of [['train',null],['quest','dispatch']]){
  const create=()=>{const s=E.normalize(E.newState(1000),1000);s.credits=350;return s;};
  const a=create(),b=create(),before=a.credits;
  const result=E.purchase(a,kind,10,id);
  let count=0;
  for(let n=0;n<10;n++){const ok=kind==='train'?E.train(b):E.upgradeQuest(b,id);if(!ok)break;count++;}
  assert.equal(result.count,count);
  assert.equal(result.spent,before-a.credits);
  assert.equal(a.credits,b.credits);
  assert.equal(a.training,b.training);
  assert.deepEqual(a.questLevels,b.questLevels);
  assert.ok(a.credits>=0);
 }
});

test('bulk calls cannot bypass locked quests, actor cap, or unknown purchases',()=>{
 const s=E.normalize(E.newState(),Date.now()),originalCredits=s.credits;
 assert.equal(E.purchase(s,'quest',10,'contract').count,0);
 assert.equal(E.purchase(s,'invalid',10).count,0);
 assert.equal(s.credits,originalCredits);
 s.credits=1e14;s.best=10;
 for(let n=0;n<15;n++)E.purchase(s,'recruit',10);
 assert.equal(s.actors.length,E.MAX_ACTORS);
 assert.equal(E.purchase(s,'recruit',10).count,0);
});

test('role contribution tracks actual damage, healing and tanking without counting overkill',()=>{
 const s=E.normalize(E.newState(),Date.now());
 s.stage=s.best=7;s.enemyHp=1e8;
 s.units.medic=1;
 s.actors.push({id:'medic',hp:25,revive:0,progress:1,cooldown:3});
 s.actors.forEach(a=>{a.progress=1;a.cooldown=a.id==='guard'?0:3;});
 s.actors[0].hp=12;
 E.tick(s,.5);
 assert.ok(s.contribution.damage.guard>0);
 assert.ok(s.contribution.healing.medic>0);
 assert.ok(s.contribution.taken.guard>0);
 assert.equal(s.contribution.damage.ranger,0);
 const restored=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
 assert.deepEqual(restored.contribution,s.contribution);
 s.enemyHp=1;
 s.actors.forEach(a=>{a.cooldown=0;a.progress=1;});
 const before=s.contribution.damage.guard;
 E.tick(s,.5);
 assert.ok(s.contribution.damage.guard-before<=1.0001,'overkill is not useful contribution');
});

test('contribution is per-run while relic and player investments persist across rebirth',()=>{
 const s=E.normalize(E.newState(),Date.now());
 s.relics.ember=2;s.heroLevel=3;s.traits.command=1;s.runBest=15;s.best=15;s.stage=15;
 s.contribution.damage.guard=100;s.contribution.taken.guard=40;
 const before=E.permanentBonuses(s);
 assert.ok(before.attack>1);
 const gain=E.rebirth(s);
 assert.ok(gain>0);
 assert.equal(s.contribution.damage.guard,0);
 assert.equal(s.contribution.taken.guard,0);
 assert.equal(s.relics.ember,2);
 assert.equal(s.heroLevel,3);
 assert.equal(s.traits.command,1);
 assert.ok(E.permanentBonuses(s).attack>1);
 const fresh=E.normalize(E.newState(),Date.now());
 assert.equal(E.permanentBonuses(fresh).attack,1);
 assert.equal(E.permanentBonuses(fresh).hp,1);
 assert.equal(E.permanentBonuses(fresh).income,1);
});

test('old prototype saves without contribution telemetry migrate to zeros',()=>{
 const raw=E.newState();delete raw.contribution;
 const s=E.normalize(JSON.parse(JSON.stringify(raw)),Date.now());
 assert.equal(s.contribution.damage.guard,0);
 assert.equal(s.contribution.healing.medic,0);
 assert.equal(s.contribution.falls.guard,0);
});


test('auto buying is opt-in and legacy saves never silently activate it',()=>{
 const s=E.normalize(E.newState(1000),1000);
 assert.equal(s.autoBuy.enabled,false);
 E.tick(s,180);
 assert.equal(s.training,0);
 assert.equal(s.units.guard,2);
 assert.equal(s.autoBuy.purchases,0);
 const old=E.newState(1000);delete old.autoBuy;
 const loaded=E.normalize(JSON.parse(JSON.stringify(old)),2000);
 assert.equal(loaded.autoBuy.enabled,false);
 assert.equal(loaded.autoBuy.mode,'balanced');
});

test('explicit training mode saves credits and buys only once each four seconds',()=>{
 const s=E.normalize(E.newState(1000),1000);
 assert.equal(E.setAutoBuy(s,'train',true),true);
 E.tick(s,3.9);
 assert.equal(s.training,0);
 E.tick(s,.1);
 assert.equal(s.training,1);
 assert.equal(s.units.guard,2);
 assert.equal(s.autoBuy.purchases,1);
 assert.equal(s.autoBuy.spent,E.trainCost(E.newState()));
 // One expensive training step is not affordable yet, so lower-cost recruit is NOT a fallback.
 // Hold the enemy so combat rewards cannot unexpectedly fund the target.
 // Existing 6-second quest income may still arrive, but remains below training price.
 s.credits=E.hireCost(s)+1;
 s.stage=1;s.enemyHp=1e13;
 const units=s.units.guard;
 E.tick(s,4);
 assert.equal(s.training,1);
 assert.equal(s.units.guard,units);
 assert.equal(s.autoBuy.purchases,1);
});

test('auto recruitment consumes the same RNG and prices as one manual recruit',()=>{
 const s=E.normalize(E.newState(1000),1000);
 const manual=E.normalize(E.newState(1000),1000);
 s.credits=manual.credits=10000;s.best=manual.best=12;
 assert.ok(E.setAutoBuy(s,'recruit',true));
 const picked=E.recruit(manual);
 E.tick(s,4);
 assert.ok(picked);
 assert.deepEqual(s.units,manual.units);
 assert.equal(s.seed,manual.seed);
 assert.equal(s.autoBuy.purchases,1);
 assert.equal(s.autoBuy.spent,25);
 assert.equal(s.autoBuy.mode,'recruit');
});

test('auto supply always targets highest unlocked contract grade, not cheap lower grade',()=>{
 const s=E.normalize(E.newState(1000),1000);
 s.stage=s.best=12;s.enemyHp=E.enemyMax(s.stage);s.credits=20000;
 assert.ok(E.setAutoBuy(s,'supply',true));
 assert.equal(E.autoTarget(s).id,'contract');
 E.tick(s,4);
 assert.equal(s.questLevels.contract,1);
 assert.equal(s.questLevels.salvage,0);
 assert.equal(s.questLevels.dispatch,0);
 assert.equal(s.autoBuy.purchases,1);
 s.credits=E.questCost(s,E.QUESTS[2])-1000;
 E.tick(s,4);
 assert.equal(s.questLevels.contract,1);
 assert.equal(s.questLevels.dispatch,0);
});

test('balanced mode runs training, recruitment, highest grade quest in turn',()=>{
 const s=E.normalize(E.newState(1000),1000);
 s.stage=s.best=12;s.enemyHp=E.enemyMax(12);s.credits=100000;
 assert.ok(E.setAutoBuy(s,'balanced',true));
 assert.equal(E.autoTarget(s).kind,'train');
 const before=s.units.guard+s.units.ranger+s.units.medic;
 E.tick(s,4);assert.equal(s.training,1);
 assert.equal(E.autoTarget(s).kind,'recruit');
 E.tick(s,4);
 assert.equal(s.units.guard+s.units.ranger+s.units.medic,before+1);
 assert.equal(E.autoTarget(s).id,'contract');
 E.tick(s,4);
 assert.equal(s.questLevels.contract,1);
 assert.equal(s.autoBuy.cursor,0);
 assert.equal(s.autoBuy.purchases,3);
});

test('automated buying never opens chests, spends cores or performs rebirth',()=>{
 const s=E.normalize(E.newState(1000),1000);
 s.credits=10000;s.cores=10;s.chests=3;s.best=15;s.runBest=15;
 assert.ok(E.setAutoBuy(s,'train',true));
 E.tick(s,32);
 assert.ok(s.autoBuy.purchases>0);
 assert.ok(s.chests>=3,'automatic buying must not consume any chest, even if combat earns more');
 assert.equal(s.chestsOpened,0);
 assert.equal(s.cores,10);
 assert.equal(s.rebirths,0);
 assert.equal(s.coreUpgrades.valor,0);
 assert.equal(s.coreUpgrades.trade,0);
});

test('automation preference persists across save and rebirth but purchase counters reset',()=>{
 const s=E.normalize(E.newState(1000),1000);
 s.credits=10000;
 assert.ok(E.setAutoBuy(s,'recruit',true));
 E.tick(s,8);
 assert.ok(s.autoBuy.purchases>=2);
 const reloaded=E.normalize(JSON.parse(JSON.stringify(s)),10000);
 assert.equal(reloaded.autoBuy.enabled,true);
 assert.equal(reloaded.autoBuy.mode,'recruit');
 assert.equal(reloaded.autoBuy.purchases,s.autoBuy.purchases);
 reloaded.runBest=15;reloaded.best=15;reloaded.stage=15;
 const gained=E.rebirth(reloaded);
 assert.ok(gained>0);
 assert.equal(reloaded.autoBuy.enabled,true);
 assert.equal(reloaded.autoBuy.mode,'recruit');
 assert.equal(reloaded.autoBuy.elapsed,0);
 assert.equal(reloaded.autoBuy.purchases,0);
 assert.equal(reloaded.autoBuy.spent,0);
 E.tick(reloaded,4);
 assert.equal(reloaded.autoBuy.purchases,1);
});

test('malformed automation config and calls cannot activate unsafe behavior',()=>{
 const raw=E.newState(1000);
 raw.autoBuy={enabled:'yes',mode:'hack',elapsed:999,cursor:999,purchases:-1,spent:Infinity};
 const s=E.normalize(raw,1000);
 assert.equal(s.autoBuy.enabled,false);
 assert.equal(s.autoBuy.mode,'balanced');
 assert.equal(s.autoBuy.elapsed,E.AUTO_BUY_INTERVAL);
 assert.equal(s.autoBuy.cursor,2);
 assert.equal(s.autoBuy.purchases,0);
 assert.equal(s.autoBuy.spent,0);
 assert.equal(E.setAutoBuy(s,'hacked',true),false);
 assert.equal(E.setAutoBuy(s,'train','true'),false);
 assert.equal(s.autoBuy.enabled,false);
 assert.equal(E.autoPurchaseOnce(s),null);
});

test('offline catchup follows active selection without extra purchases or unlimited time',()=>{
 const initial=1000000;
 const s=E.normalize(E.newState(initial),initial);
 const direct=E.normalize(E.newState(initial),initial);
 s.credits=direct.credits=10000;
 E.setAutoBuy(s,'train',true);E.setAutoBuy(direct,'train',true);
 s.lastSaved=initial;
 const elapsed=E.offline(s,initial+60*1000);
 E.tick(direct,60);
 assert.equal(elapsed,60);
 assert.equal(s.training,direct.training);
 assert.equal(s.autoBuy.purchases,direct.autoBuy.purchases);
 assert.equal(s.autoBuy.spent,direct.autoBuy.spent);
 assert.equal(s.stage,direct.stage);
 assert.equal(s.credits,direct.credits);
});


test('batch relic reveal matches one-by-one RNG, reward order, and permanent buffs exactly',()=>{
 const a=E.normalize(E.newState(1000),1000),b=E.normalize(E.newState(1000),1000);
 a.chests=b.chests=12;a.best=b.best=30;
 const batched=E.openChestBatch(a,20);
 const sequential=[];
 while(b.chests)sequential.push(E.openChest(b));
 assert.equal(batched.results.length,12);
 assert.deepEqual(batched.results,sequential);
 assert.equal(batched.first,sequential.filter(x=>x.id&&!x.duplicate).length);
 assert.equal(batched.duplicates,sequential.filter(x=>x.id&&x.duplicate).length);
 assert.deepEqual(a.relics,b.relics);
 assert.equal(a.credits,b.credits);
 assert.equal(a.seed,b.seed);
 assert.equal(a.chests,0);
 assert.equal(a.chestsOpened,12);
 assert.equal(a.runMetrics.chestsOpened,12);
 assert.deepEqual(a.relicHistory,b.relicHistory);
 assert.ok(batched.after.attack>=batched.before.attack);
});

test('batch opening is bounded to 20 and never creates rewards from empty storage',()=>{
 const s=E.normalize(E.newState(1000),1000);
 s.chests=31;
 const result=E.openChestBatch(s,20);
 assert.equal(result.results.length,20);
 assert.equal(s.chests,11);
 assert.equal(E.openChestBatch(s,5).results.length,5);
 assert.equal(s.chests,6);
 const without=s.chestsOpened;
 assert.equal(E.openChestBatch(s,0).results.length,1,'invalid count falls back to a single open');
 assert.equal(s.chestsOpened,without+1);
 s.chests=0;
 const before=JSON.stringify(s.relics),seed=s.seed;
 const empty=E.openChestBatch(s,20);
 assert.deepEqual(empty.results,[]);
 assert.equal(s.seed,seed);
 assert.equal(JSON.stringify(s.relics),before);
});

test('collection at all caps converts each chest to credits and records the exchange',()=>{
 const s=E.normalize(E.newState(1000),1000);
 for(const r of E.RELICS)s.relics[r.id]=r.cap;
 s.chests=3;s.best=20;
 const prior=s.credits,opened=E.openChestBatch(s,5);
 assert.equal(opened.first,0);
 assert.equal(opened.duplicates,0);
 assert.equal(opened.exchanges,3);
 assert.equal(opened.credits,3*(300+50*s.best));
 assert.equal(s.credits,prior+opened.credits);
 assert.ok(opened.results.every(x=>x.id===null));
 assert.equal(s.relicHistory.length,3);
 assert.ok(s.relicHistory.every(x=>x.id===null&&x.credits>0));
});

test('relic collection journal remains bounded, validated on load and persistent after rebirth',()=>{
 const s=E.normalize(E.newState(1000),1000);
 s.best=s.runBest=15;s.stage=15;s.chests=40;
 E.openChestBatch(s,20);
 E.openChestBatch(s,20);
 assert.equal(s.relicHistory.length,24);
 const previous=s.relicHistory.map(x=>({...x}));
 const reloaded=E.normalize(JSON.parse(JSON.stringify(s)),1000);
 assert.deepEqual(reloaded.relicHistory,previous);
 const count=Object.values(s.relics).reduce((sum,n)=>sum+n,0);
 assert.ok(E.rebirth(reloaded)>0);
 assert.deepEqual(reloaded.relicHistory,previous);
 assert.equal(reloaded.relicHistory.length,24);
 assert.equal(Object.values(reloaded.relics).reduce((sum,n)=>sum+n,0),count);
 assert.equal(reloaded.runMetrics.chestsOpened,0);
});

test('old saves have no invented relic journal and malformed IDs are never displayed',()=>{
 const raw=E.newState(1000);
 delete raw.relicHistory;
 assert.deepEqual(E.normalize(raw,1000).relicHistory,[]);
 raw.relicHistory=[{id:'unknown',duplicate:false,credits:10},{id:'ember',duplicate:false,stack:1,credits:0,stage:12,run:1},{id:null,duplicate:true,credits:500,stage:15,run:2}];
 const s=E.normalize(raw,1000);
 assert.equal(s.relicHistory.length,2);
 assert.deepEqual(s.relicHistory.map(x=>x.id),['ember',null]);
});


test('playtest checkpoints sample each simulated minute without changing combat outcome',()=>{
 const a=E.normalize(E.newState(1000),1000);
 const b=E.normalize(E.newState(1000),1000);
 E.tick(a,59);
 assert.equal(a.playtest.snapshots.length,0);
 E.tick(a,1);
 assert.equal(a.playtest.snapshots.length,1);
 assert.equal(a.playtest.snapshots[0].sec,60);
 assert.equal(a.playtest.snapshots[0].source,'foreground');
 E.tick(a,120);
 E.tick(b,180);
 assert.equal(a.playtest.snapshots.length,3);
 assert.deepEqual(a.playtest.snapshots.map(x=>x.sec),[60,120,180]);
 assert.equal(a.stage,b.stage);
 assert.equal(a.seed,b.seed);
 assert.deepEqual(a.relics,b.relics);
 assert.equal(a.credits,b.credits);
 assert.equal(a.runBest,b.runBest);
 assert.equal(a.playtest.snapshots[0].run,1);
});

test('offline time is marked separately and 2-hour cap remains in place',()=>{
 const now=8*3600*1000;
 const s=E.normalize(E.newState(now),now);
 s.lastSaved=now;
 const elapsed=E.offline(s,now+3*3600*1000);
 assert.equal(elapsed,7200);
 assert.equal(s.playtest.offlineSeconds,7200);
 assert.equal(s.playtest.snapshots.length,120);
 assert.ok(s.playtest.snapshots.every(x=>x.source==='offline'));
 assert.equal(s.clock,7200);
 const restored=E.normalize(JSON.parse(JSON.stringify(s)),now);
 assert.deepEqual(restored.playtest,s.playtest);
});

test('minute snapshots persist across rebirth while the new run receives a new run ID',()=>{
 const s=E.normalize(E.newState(1000),1000);
 E.tick(s,120);
 assert.equal(s.playtest.snapshots.length,2);
 s.stage=s.best=s.runBest=15;
 assert.ok(E.rebirth(s)>0);
 assert.equal(s.clock,0);
 assert.equal(s.playtest.snapshots.length,2);
 E.tick(s,60);
 assert.deepEqual(s.playtest.snapshots.map(x=>x.run),[1,1,2]);
 assert.deepEqual(s.playtest.snapshots.map(x=>x.sec),[60,120,60]);
 assert.equal(s.playtest.offlineSeconds,0);
});

test('playtest snapshots are save-bounded and corrupted records normalized safely',()=>{
 const raw=E.newState();
 raw.playtest={offlineSeconds:Infinity,snapshots:Array.from({length:500},(_,i)=>({
  run:1,sec:i*60,stage:5,credits:30,recruits:2,
  source:i%2?'offline':'malicious',heroLevel:9,
  injected:'private',relicKinds:99
 }))};
 const s=E.normalize(raw,1234);
 assert.equal(s.playtest.snapshots.length,E.MAX_PLAYTEST_SNAPSHOTS);
 assert.equal(s.playtest.offlineSeconds,0);
 assert.ok(s.playtest.snapshots.every(x=>x.relicKinds<=E.RELICS.length));
 assert.ok(s.playtest.snapshots.every(x=>!Object.hasOwn(x,'injected')));
 assert.ok(s.playtest.snapshots.some(x=>x.source==='foreground'));
 const old=E.newState();delete old.playtest;
 assert.deepEqual(E.normalize(old).playtest,{snapshots:[],offlineSeconds:0});
});

// Run depth-bound treasure, legacy-save and batch parity checks in the existing CI workflow.
require('./expedition-depth-relic.test.cjs');

// First-clear reward never depends on rebirth count and never duplicates after reload.
require('./expedition-breakthrough.test.cjs');


test('return report compares exact before/after untrained two-guard opening power',()=>{
 const s=E.newState(1000),initial={...s.runOpening};
 assert.equal(initial.attack,E.partyDps(s));
 assert.equal(initial.hp,E.maxHp(s));
 assert.equal(initial.income,E.questIncome(s,E.QUESTS[0]));
 s.stage=s.runBest=s.best=26;s.clock=1200;
 s.coreProgress=2.4;s.relics.ember=2;s.relics.shield=1;s.relics.income=1;
 const result=E.rebirth(s);
 assert.ok(result>0);
 assert.equal(s.latestReturn.number,1);
 assert.equal(s.latestReturn.cleared,25);
 assert.equal(s.latestReturn.cores,result);
 assert.deepEqual(s.latestReturn.before,initial);
 assert.deepEqual(s.latestReturn.after,s.runOpening);
 assert.ok(s.runOpening.attack>initial.attack);
 assert.ok(s.runOpening.hp>initial.hp);
 assert.ok(s.runOpening.income>initial.income);
 assert.equal(s.runOpening.attack,E.partyDps(s));
 assert.equal(s.runOpening.hp,E.maxHp(s));
 assert.equal(s.runOpening.income,E.questIncome(s,E.QUESTS[0]));
 assert.ok(Math.abs(s.coreReserve-.4)<1e-9);
 const restored=E.normalize(JSON.parse(JSON.stringify(s)),2000);
 assert.deepEqual(restored.latestReturn,s.latestReturn);
 assert.deepEqual(restored.runOpening,s.runOpening);
 const startAttack=restored.runOpening.attack;
 if(E.buyCore(restored,'valor'))assert.equal(restored.runOpening.attack,startAttack,'opening snapshot must not change after subsequent investment');
});

test('legacy saves without opening snapshots never invent a historical power comparison',()=>{
 const old=E.newState(1000);
 old.stage=old.runBest=old.best=26;old.rebirths=3;
 delete old.runOpening;delete old.latestReturn;
 const loaded=E.normalize(JSON.parse(JSON.stringify(old)),2000);
 assert.equal(loaded.runOpening,null);
 assert.equal(loaded.latestReturn,null);
 loaded.coreProgress=1.25;
 assert.ok(E.rebirth(loaded)>0);
 assert.equal(loaded.latestReturn.before,null,'unknown old-run opening stats stay unknown');
 assert.ok(loaded.latestReturn.after.attack>0);
 assert.deepEqual(loaded.runOpening,loaded.latestReturn.after);
});

test('malformed return reports and opening values are sanitized on load',()=>{
 const raw=E.newState(1000);
 raw.runOpening={attack:'overwritten',hp:96,income:9};
 raw.latestReturn={
  number:1,cleared:35,cores:2,earned:1,firstClear:1,
  relicKinds:9999,relicCopies:4,duration:120,chests:0,
  before:{attack:-10,hp:96,income:9},
  after:{attack:4.5,hp:100,income:10},
  inventedDeviceId:'not part of the schema'
 };
 const cleaned=E.normalize(JSON.parse(JSON.stringify(raw)),2000);
 assert.equal(cleaned.runOpening,null);
 assert.equal(cleaned.latestReturn.before,null);
 assert.equal(cleaned.latestReturn.relicKinds,E.RELICS.length);
 assert.deepEqual(cleaned.latestReturn.after,{attack:4.5,hp:100,income:10});
 assert.equal(Object.hasOwn(cleaned.latestReturn,'inventedDeviceId'),false);
});

// Exact early clear timestamps are tracked independently of 60-second snapshots.
require('./expedition-milestones.test.cjs');

test('adaptive mode skips unaffordable high-grade supply without changing fixed balanced policy',()=>{
 const fixed=E.newState(1000),adaptive=E.newState(1000);
 for(const s of [fixed,adaptive]){s.stage=s.best=s.runBest=12;s.credits=100;}
 assert.equal(E.setAutoBuy(fixed,'balanced',true),true);
 assert.equal(E.setAutoBuy(adaptive,'adaptive',true),true);
 fixed.autoBuy.cursor=adaptive.autoBuy.cursor=2;
 assert.equal(E.autoTarget(fixed).id,'contract','fixed mode saves for highest-grade supply');
 assert.equal(E.autoTarget(adaptive).kind,'train','adaptive mode can use affordable growth');
 E.tick(fixed,4);E.tick(adaptive,4);
 assert.equal(fixed.autoBuy.purchases,0);
 assert.equal(adaptive.autoBuy.purchases,1);
 assert.equal(adaptive.training,1);
 assert.equal(adaptive.autoBuy.cursor,1);
 const loaded=E.normalize(JSON.parse(JSON.stringify(adaptive)),2000);
 assert.equal(loaded.autoBuy.mode,'adaptive');
 assert.equal(loaded.autoBuy.enabled,true);
 assert.equal(loaded.autoBuy.purchases,1);
 assert.equal(loaded.autoBuy.cursor,1);
 assert.equal(loaded.coreSpent,0);
 assert.equal(loaded.chestsOpened,0);
});

// Optional adaptive strategy must preserve legacy purchase constraints.
require('./expedition-adaptive-buy.test.cjs');

// Late-expedition relic rewards and pre-upgrade save compatibility.
require('./expedition-deep-relic-economy.test.cjs');

// First stage-50 chest is a capped collection-synergy reward, never a free return bonus.
require('./expedition-stage50-chronicle.test.cjs');

// No post-50 core explosion; no automatic rebirth-count benefits.
require('./expedition-post50-core-guard.test.cjs');


test('guard remains primary target but normal/elite/boss flank blows reach both rear professions',()=>{
 const percentages=[{stage:14,share:.08},{stage:15,share:.14},{stage:20,share:.22}];
 for(const {stage,share} of percentages){
  const s=E.newState(1000);
  s.stage=s.best=s.runBest=stage;s.enemyHp=1e12;
  // Give the fixed roster enough HP to measure distribution without deaths.
  s.training=10;s.actors.forEach(a=>a.hp=E.actorMaxHp(s,a.id));
  s.units.ranger=1;s.units.medic=1;
  s.actors.push({id:'ranger',hp:E.actorMaxHp(s,'ranger'),revive:0,progress:1,cooldown:100});
  s.actors.push({id:'medic',hp:E.actorMaxHp(s,'medic'),revive:0,progress:1,cooldown:100});
  s.actors.forEach(a=>{a.progress=1;a.cooldown=100});
  E.tick(s,9);
  const hit=s.contribution.taken;
  assert.ok(hit.guard>hit.ranger+hit.medic,'frontline must still absorb most pressure');
  assert.ok(hit.ranger>0,'ranger is no longer invulnerable behind living guards');
  assert.ok(hit.medic>0,'medic is no longer invulnerable behind living guards');
  const total=hit.guard+hit.ranger+hit.medic;
  const actualShare=(hit.ranger+hit.medic)/total;
  assert.ok(actualShare>0&&actualShare<=share+1e-9,'rear side damage remains positive and bounded at stage '+stage);
  // Damage is divided, not duplicated, even when the rear HP safety cap
  // diverts some elite/boss attack back to the front line.
  const expectedDps=.4*Math.pow(1.17,stage-1)*(E.isBoss(stage)?2.2:E.isElite(stage)?1.4:1);
  assert.ok(Math.abs(total-expectedDps*9)<.00001,'total enemy attack strength is conserved');
  assert.ok(s.actors.every(a=>a.revive===0),'smoke case must not introduce artificial deaths');
  assert.equal(s.stage,stage,'target must not be defeated by test fixture');
 }
});

test('enemy damage is not multiplied by having a rear line and guard-only formations take full damage',()=>{
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=15;s.enemyHp=1e12;
 s.actors.forEach(a=>{a.progress=1;a.cooldown=100});
 const expected=.4*Math.pow(1.17,14)*1.4*5;
 E.tick(s,5);
 assert.ok(Math.abs(s.contribution.taken.guard-expected)<.00001,'all damage still lands on the guard when no rear can be hit');
 assert.equal(s.contribution.taken.ranger,0);
 assert.equal(s.contribution.taken.medic,0);
});

test('living rear squad members can be struck when all guards are down',()=>{
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=15;s.enemyHp=1e12;
 s.units.ranger=1;s.units.medic=1;
 s.actors.push({id:'ranger',hp:17,revive:0,progress:1,cooldown:100});
 s.actors.push({id:'medic',hp:25,revive:0,progress:1,cooldown:100});
 for(const a of s.actors){a.progress=1;a.cooldown=100;if(a.id==='guard'){a.hp=0;a.revive=5;a.progress=0;}}
 E.tick(s,1);
 assert.equal(s.contribution.taken.guard,0);
 assert.ok(s.contribution.taken.ranger>0);
 assert.ok(s.contribution.taken.medic>0);
 assert.ok(s.squadHp>0);
});
