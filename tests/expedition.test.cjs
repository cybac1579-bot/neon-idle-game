'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');

test('original game has an isolated save key and exactly three prototype roles',()=>{
 assert.notEqual(E.SAVE_KEY,'neon_rework_07');
 assert.equal(E.UNITS.length,3);
 assert.equal(E.RELICS.length,17);
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
 assert.equal(s.playtest.offlineEvents.length,1);
 assert.deepEqual(s.playtest.offlineEvents[0],{
  run:1,runSecBefore:0,stageBefore:1,stageAfter:s.stage,
  requestedSeconds:10800,settledSeconds:7200,source:'resume'
 });
 assert.equal(E.offline(s,now+3*3600*1000),0,'same resume cannot be recorded twice');
 assert.equal(s.playtest.offlineEvents.length,1);
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
 assert.deepEqual(s.playtest.offlineEvents,[],'no prior offline settlements were made');
});

test('offline resume history is bounded, sanitized, idempotent and survives return',()=>{
 const start=100000,raw=E.newState(start);
 let now=start;
 for(let i=0;i<30;i++){
  now+=1000;
  assert.equal(E.offline(raw,now,i===0?'startup':'resume'),1);
 }
 assert.equal(raw.playtest.offlineEvents.length,E.MAX_OFFLINE_EVENTS);
 assert.equal(raw.playtest.offlineEvents[0].runSecBefore,6);
 assert.equal(raw.playtest.offlineEvents.at(-1).runSecBefore,29);
 assert.equal(raw.playtest.offlineEvents.at(-1).source,'resume');
 assert.equal(E.offline(raw,now),0);
 assert.equal(raw.playtest.offlineEvents.length,E.MAX_OFFLINE_EVENTS);
 raw.playtest.offlineEvents[0].injected='private-data';
 raw.playtest.offlineEvents[0].source='not-a-source';
 raw.playtest.offlineEvents[0].settledSeconds=Infinity;
 const cleaned=E.normalize(JSON.parse(JSON.stringify(raw)),now);
 assert.equal(cleaned.playtest.offlineEvents[0].source,'resume');
 assert.equal(cleaned.playtest.offlineEvents[0].settledSeconds,0);
 assert.ok(cleaned.playtest.offlineEvents.every(x=>!Object.hasOwn(x,'injected')));
 cleaned.stage=cleaned.best=cleaned.runBest=15;
 const earned=E.rebirth(cleaned);assert.ok(earned>0);
 assert.equal(cleaned.playtest.offlineEvents.length,E.MAX_OFFLINE_EVENTS);
 assert.equal(cleaned.playtest.offlineEvents.at(-1).run,1);
 E.offline(cleaned,now+5000,'startup');
 assert.equal(cleaned.playtest.offlineEvents.at(-1).run,2);
 assert.equal(cleaned.playtest.offlineEvents.at(-1).source,'startup');
 const roundtrip=E.normalize(JSON.parse(JSON.stringify(cleaned)),now+5000);
 assert.deepEqual(roundtrip.playtest.offlineEvents,cleaned.playtest.offlineEvents);
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
 assert.deepEqual(E.normalize(old).playtest,{snapshots:[],offlineSeconds:0,offlineEvents:[]});
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
  assert.ok(actualShare>0&&actualShare<=share*(stage>=15?1.25:1)+1e-9,
   'telegraphed elite strike can concentrate, but cannot create unbounded rear damage at stage '+stage);
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

// Fix for unaffordable growth targets causing late-stage empty waits.
require('./expedition-late-pacing-fix.test.cjs');

// In-progress legacy boss saves must survive the 50-distance HP pacing fix.
require('./expedition-boss50-pacing.test.cjs');

// Early vs deep returns: do not fabricate future cores or gate voluntary returns.
require('./expedition-return-forecast.test.cjs');


test('focus-sight relic changes ranger from steady damage to deterministic every-third-shot volley',()=>{
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=25;s.enemyHp=1e10;s.relics.archer=2;
 s.units.ranger=1;s.actors.push({id:'ranger',hp:17,revive:0,progress:1,cooldown:0,shots:0});
 s.actors.forEach(a=>{a.progress=1;a.cooldown=a.id==='ranger'?0:100;});
 const ranger=s.actors.find(a=>a.id==='ranger'),shots=[];
 const baseline=E.partyDps(s);
 const before=s.contribution.damage.ranger;
 for(let n=0;n<3;n++){
  ranger.cooldown=0;
  const prev=s.contribution.damage.ranger;
  E.tick(s,.01);
  shots.push(s.contribution.damage.ranger-prev);
 }
 assert.equal(s.relicEffects.volleys,1,'one real volley per three ranger attacks');
 assert.ok(shots[0]>0);
 assert.ok(Math.abs(shots[0]-shots[1])<1e-9,'first two shots remain ordinary');
 assert.ok(Math.abs(shots[2]/shots[0]-(1+.45*2))<1e-9,'third hit is an actual burst');
 assert.ok(Math.abs((shots[0]+shots[1]+shots[2])/3-shots[0]*(1+.15*2))<1e-9,
  'three-shot mean retains prior +15% per copy');
 assert.ok(s.relicEffects.volleyBonusDamage>0);
 assert.equal(s.battleEvent.type,'volley','visible effect is not overwritten by ordinary guards');
 assert.ok(E.partyDps(s)===baseline,'average DPS shown to the player remains stable');
 assert.equal(ranger.shots,0);
 const saved=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
 assert.deepEqual(saved.relicEffects,s.relicEffects,'current run effect counters persist after reload');
 assert.equal(saved.actors.find(a=>a.id==='ranger').shots,0);
 assert.ok(s.contribution.damage.ranger-before>0);
});

test('volley cadence survives save mid-cycle, and no relic means no invented volleys',()=>{
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=25;s.enemyHp=1e10;s.relics.archer=1;
 s.units.ranger=1;s.actors.push({id:'ranger',hp:17,revive:0,progress:1,cooldown:0,shots:0});
 s.actors.forEach(a=>{a.progress=1;a.cooldown=a.id==='ranger'?0:100;});
 const ranger=s.actors.at(-1);
 for(let i=0;i<2;i++){ranger.cooldown=0;E.tick(s,.01);}
 assert.equal(ranger.shots,2);
 const restored=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
 assert.equal(restored.actors.at(-1).shots,2);
 restored.actors.at(-1).cooldown=0;E.tick(restored,.01);
 assert.equal(restored.relicEffects.volleys,1,'third attack after reload remains enhanced');
 const noRelic=E.newState(1000);
 noRelic.stage=noRelic.best=noRelic.runBest=25;noRelic.enemyHp=1e10;
 noRelic.units.ranger=1;noRelic.actors.push({id:'ranger',hp:17,revive:0,progress:1,cooldown:0});
 noRelic.actors.forEach(a=>{a.progress=1;a.cooldown=a.id==='ranger'?0:100;});
 for(let i=0;i<4;i++){noRelic.actors.at(-1).cooldown=0;E.tick(noRelic,.01);}
 assert.equal(noRelic.relicEffects.volleys,0,'no proc is granted before collecting the relic');
 assert.equal(noRelic.relicEffects.volleyBonusDamage,0);
});

test('medkit relic enables rare, medically assisted guard return without instant revival',()=>{
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=25;s.enemyHp=1e10;s.relics.medkit=2;
 s.units.medic=1;
 s.actors.push({id:'medic',hp:E.actorMaxHp(s,'medic'),revive:0,progress:1,cooldown:100});
 s.actors.forEach(a=>{a.progress=1;a.cooldown=100;});
 s.actors[0].hp=.01;
 E.tick(s,.5);
 assert.equal(s.relicEffects.triages,1);
 assert.ok(Math.abs(s.actors[0].revive-3.6)<1e-9,'two medkits shorten this guard return timer from 6 to 3.6 seconds');
 assert.equal(s.actors[0].hp,0,'field triage never prevents the guard from falling');
 assert.equal(s.battleEvent.type,'triage','the medical action has a visible battle cue');
 assert.ok(s.relicEffects.triageCooldown>17);
 // A second casualty before the shared 18-second cooldown expires gets the
 // ordinary six seconds, avoiding unlimited rescue loops.
 s.actors[1].hp=.01;
 E.tick(s,.5);
 assert.equal(s.relicEffects.triages,1);
 assert.equal(s.actors[1].revive,6);
 const old=E.newState(1000);delete old.relicEffects;
 for(const actor of old.actors)delete actor.shots;
 const normalized=E.normalize(old,Date.now());
 assert.equal(normalized.relicEffects.triages,0);
 assert.equal(normalized.relicEffects.triageCooldown,0);
 assert.ok(normalized.actors.every(a=>a.shots===0));
});

test('relic mechanics persist through rebirth but activation counters do not',()=>{
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=15;s.relics.archer=2;s.relics.medkit=3;
 s.relicEffects.volleys=14;s.relicEffects.volleyBonusDamage=300;
 s.relicEffects.triages=2;s.relicEffects.triageCooldown=10;
 assert.ok(E.rebirth(s)>0);
 assert.equal(E.relic(s,'archer'),2);
 assert.equal(E.relic(s,'medkit'),3);
 assert.deepEqual(s.relicEffects,{volleys:0,volleyBonusDamage:0,triages:0,triageCooldown:0,intelClears:0,intelFinds:0,flankShots:0,intercepts:0,partialCovers:0,counterDamage:0,rushes:0,braces:0,partialBraces:0,braceDamage:0,jams:0,cleanses:0,cleanseDamage:0,commandMoves:0,commandSurges:0,guardPlateBlocks:0,escortDuets:0,diagrams:0,diagramDamage:0});
 assert.deepEqual(s.runHistory.at(-1).relicEffects,{volleys:14,volleyBonusDamage:300,triages:2,intelFinds:0,flankShots:0,intercepts:0,partialCovers:0,counterDamage:0,rushes:0,braces:0,partialBraces:0,braceDamage:0,jams:0,cleanses:0,cleanseDamage:0,commandMoves:0,commandSurges:0,guardPlateBlocks:0,escortDuets:0,diagrams:0,diagramDamage:0},
  'completed return keeps evidence of tactical relic activation');
 assert.deepEqual(s.latestReturn.relicEffects,s.runHistory.at(-1).relicEffects);
 const normalized=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
 assert.deepEqual(normalized.runHistory.at(-1).relicEffects,s.runHistory.at(-1).relicEffects);
 assert.deepEqual(normalized.latestReturn.relicEffects,s.latestReturn.relicEffects);
 assert.ok(s.actors.every(a=>a.shots===0));
});


function clearIntelFixture(s,stage){
 s.stage=stage;s.best=Math.max(s.best,stage);s.runBest=Math.max(s.runBest,stage);
 s.enemyHp=.01;
 for(const a of s.actors){a.progress=1;a.cooldown=0;a.revive=0;a.hp=48;}
 E.tick(s,.1);
 assert.equal(s.stage,stage+1,'the fixture clears only one intended elite stage');
}

test('scout and relay together automatically discover an eligible relic after every two deep elite clears',()=>{
 const s=E.newState(1000);s.relics.scout=1;s.relics.relay=1;
 assert.equal(s.chests,0);assert.equal(s.relicEffects.intelFinds,0);
 clearIntelFixture(s,30);
 assert.equal(s.relicEffects.intelClears,1);
 assert.equal(s.relicEffects.intelFinds,0);
 assert.equal(s.chests,1);
 assert.deepEqual(s.chestDepths,[30]);
 clearIntelFixture(s,35);
 assert.equal(s.relicEffects.intelClears,0);
 assert.equal(s.relicEffects.intelFinds,1);
 assert.equal(s.chests,2,'network discovery is a separate reward and does not consume ordinary chests');
 assert.deepEqual(s.chestDepths,[30,35],'oldest queued boxes retain their original depth');
 assert.equal(s.runMetrics.chestsOpened,0,'automatic network reward is not a manual chest open');
 assert.equal(s.relicHistory.length,1);
 assert.equal(s.relicHistory[0].source,'intel');
 assert.equal(s.relicHistory[0].depth,35);
 assert.equal(s.relicHistory[0].duplicate,false,'a missing kind is guaranteed whenever possible');
 assert.equal(s.battleEvent.type,'intel','network discovery has an explicit combat cue');
 assert.equal(s.relicEffects.volleys,0);
 assert.equal(s.relicEffects.triages,0);
 const saved=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
 assert.deepEqual(saved.chestDepths,[30,35]);
 assert.equal(saved.relicEffects.intelFinds,1);
 assert.equal(saved.relicHistory[0].source,'intel');
});

test('a lone scout or lone relay cannot activate the network',()=>{
 for(const have of ['scout','relay','neither']){
  const s=E.newState(1000);
  if(have!=='neither')s.relics[have]=1;
  for(const distance of [30,35,40])clearIntelFixture(s,distance);
  assert.equal(s.relicEffects.intelFinds,0,have+' has no combination');
  assert.equal(s.relicHistory.length,0);
  assert.equal(s.chests,3,'regular boss and elite rewards are unchanged');
 }
});

test('network guarantees a still-missing relic from the earned distance without reaching into future pools',()=>{
 const s=E.newState(1000);
 for(const r of E.RELICS)if(r.unlockStage<=35&&r.id!=='bounty')s.relics[r.id]=1;
 assert.ok(s.relics.scout>0&&s.relics.relay>0);
 clearIntelFixture(s,30);clearIntelFixture(s,35);
 assert.equal(s.relicHistory.length,1);
 assert.equal(s.relicHistory[0].id,'bounty');
 assert.equal(s.relicHistory[0].duplicate,false);
 assert.ok(!s.relics.enlist&&!s.relics.drill&&!s.relics.chronicle,'deep reward tiers remain locked');
 const ordinary=E.openChest(s);
 assert.equal(ordinary.source,'chest');
 assert.equal(ordinary.depth,30,'next ordinary chest keeps its original depth and FIFO draw');
 assert.equal(s.chests,1);
});

test('network is capped at two auto finds per run and save reload keeps half-completed progress',()=>{
 const s=E.newState(1000);
 s.relics.scout=s.relics.relay=1;
 clearIntelFixture(s,30);
 let restored=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
 assert.equal(restored.relicEffects.intelClears,1);
 for(const distance of [35,40,45,50,55,60,65])clearIntelFixture(restored,distance);
 assert.equal(restored.relicEffects.intelFinds,2);
 assert.equal(restored.relicEffects.intelClears,0);
 assert.equal(restored.relicHistory.filter(x=>x.source==='intel').length,2);
 assert.equal(restored.chests,8,'normal 5-distance boxes remain available even after reward cap');
 assert.equal(restored.runMetrics.manualPurchases,0);
 assert.equal(restored.runMetrics.chestsOpened,0);
});

test('network progress resets on return, discoveries and completed-run count persist',()=>{
 const s=E.newState(1000);
 s.relics.scout=s.relics.relay=1;
 for(const distance of [30,35,40])clearIntelFixture(s,distance);
 assert.equal(s.relicEffects.intelFinds,1);
 assert.equal(s.relicEffects.intelClears,1);
 const kept=s.relicHistory.map(x=>({...x}));
 const got=E.rebirth(s);
 assert.ok(got>0);
 assert.equal(s.relicEffects.intelFinds,0);
 assert.equal(s.relicEffects.intelClears,0);
 assert.equal(s.relics.scout,1);assert.equal(s.relics.relay,1);
 assert.deepEqual(s.relicHistory,kept);
 assert.equal(s.runHistory.at(-1).relicEffects.intelFinds,1);
 assert.equal(s.latestReturn.relicEffects.intelFinds,1);
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
 assert.equal(loaded.latestReturn.relicEffects.intelFinds,1);
 assert.equal(loaded.relicEffects.intelFinds,0);
});

test('pre-network backups migrate without invented network progress or earlier auto finds',()=>{
 const old=E.newState(1000);
 old.relics.scout=old.relics.relay=1;
 delete old.relicEffects.intelClears;
 delete old.relicEffects.intelFinds;
 old.relicHistory=[{id:'scout',duplicate:false,stack:1,credits:0,stage:31,depth:30,run:1}];
 const s=E.normalize(old,Date.now());
 assert.equal(s.relicEffects.intelFinds,0);
 assert.equal(s.relicEffects.intelClears,0);
 assert.equal(s.relicHistory[0].source,'chest','old ordinary chest journal is not marked network');
 assert.ok(s.relics.scout&&s.relics.relay,'old relic ownership remains');
});



function setFlankFixture(s,stage=15,{combo=false,medic=true}={}){
 s.stage=stage;s.best=Math.max(stage,s.best);s.runBest=Math.max(stage,s.runBest);
 s.enemyHp=1e10;
 s.units.ranger=1;s.actors.push({id:'ranger',hp:17000,revive:0,progress:1,cooldown:100,shots:0});
 if(medic){s.units.medic=1;s.actors.push({id:'medic',hp:25000,revive:0,progress:1,cooldown:100,shots:0});}
 for(const a of s.actors){a.progress=1;a.cooldown=100;a.hp=a.id==='guard'?48000:a.hp;a.revive=0;}
 if(combo){s.relics.guard=1;s.relics.archer=1;}
 return s;
}
test('elite telegraphs a focused rear-line attack for two full seconds',()=>{
 const s=setFlankFixture(E.newState(1000));
 for(let sec=1;sec<=3;sec++)E.tick(s,1);
 assert.equal(s.enemyTactic.phase,'windup');
 assert.equal(s.enemyTactic.windup,2);
 assert.equal(s.battleEvent.type,'aim');
 E.tick(s,1);
 assert.equal(s.enemyTactic.windup,1);
 const old=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
 assert.equal(old.enemyTactic.phase,'windup','telegraph survives a real save/reload');
 assert.equal(old.enemyTactic.windup,1);
 E.tick(old,1);
 assert.equal(old.enemyTactic.phase,'fired');
 assert.equal(old.enemyTactic.used,true);
 assert.equal(old.relicEffects.flankShots,1);
 assert.equal(old.relicEffects.intercepts,0);
 assert.equal(old.battleEvent.type,'flank');
 assert.ok(old.contribution.taken.ranger+old.contribution.taken.medic>0);
 E.tick(old,8);
 assert.equal(old.relicEffects.flankShots,1,'only one focus strike per enemy');
});

test('one escort contract redirects half an actual focused rear attack; sight upgrades to full counter',()=>{
 const ordinary=setFlankFixture(E.newState(1000));
 const partial=setFlankFixture(E.newState(1000));partial.relics.guard=1;
 const full=setFlankFixture(E.newState(1000),15,{combo:true});
 const rearDamage=x=>x.contribution.taken.ranger+x.contribution.taken.medic;
 for(let i=0;i<4;i++){E.tick(ordinary,1);E.tick(partial,1);E.tick(full,1);}
 const rearBefore=rearDamage(ordinary),guardBefore=ordinary.contribution.taken.guard;
 assert.equal(rearDamage(partial),rearBefore,'no coverage before the actual focus shot');
 E.tick(ordinary,1);E.tick(partial,1);E.tick(full,1);
 const fullRear=rearDamage(ordinary)-rearBefore;
 const guardedRear=rearDamage(partial)-rearBefore;
 assert.ok(fullRear>0,'an elite focus shot must truly target a living rear unit');
 assert.ok(Math.abs(guardedRear-fullRear/2)<1e-7,'single contract splits the real rear shot evenly');
 assert.ok(Math.abs((partial.contribution.taken.guard-guardBefore)-
  ((ordinary.contribution.taken.guard-guardBefore)+fullRear/2))<1e-7,
  'the guard receives the diverted shot instead of deleting enemy damage');
 assert.equal(partial.relicEffects.partialCovers,1);
 assert.equal(partial.relicEffects.intercepts,0);
 assert.equal(partial.relicEffects.counterDamage,0,'partial cover never grants a free counterattack');
 assert.equal(partial.enemyTactic.result,'cover-step');
 assert.equal(partial.battleEvent.type,'cover-step');
 assert.equal(full.relicEffects.partialCovers,0,'two-relic full escort takes precedence');
 assert.equal(full.relicEffects.intercepts,1);
 E.tick(partial,7);
 assert.equal(partial.relicEffects.partialCovers,1,'elite focus must not repeat for free');
 const saved=E.normalize(JSON.parse(JSON.stringify(partial)),Date.now());
 assert.equal(saved.relicEffects.partialCovers,1);
 assert.equal(saved.enemyTactic.result,'cover-step');
 assert.equal(saved.battleEvent.type,'cover-step');
 saved.coreProgress=4;
 assert.ok(E.rebirth(saved)>0);
 assert.equal(saved.relics.guard,1,'the original relic remains after return');
 assert.equal(saved.relicEffects.partialCovers,0);
 assert.equal(saved.runHistory.at(-1).relicEffects.partialCovers,1);
 assert.equal(saved.latestReturn.relicEffects.partialCovers,1);
 const legacy=E.newState(1000);delete legacy.relicEffects.partialCovers;
 assert.equal(E.normalize(legacy,Date.now()).relicEffects.partialCovers,0,
  'old saves never invent a historical cover');
});

test('guard plus focus sight cancels rear-targeted strike and creates real ranger counterattack',()=>{
 const base=setFlankFixture(E.newState(1000));
 const combo=setFlankFixture(E.newState(1000),15,{combo:true});
 for(let i=0;i<5;i++){E.tick(base,1);E.tick(combo,1);}
 assert.equal(base.relicEffects.flankShots,1);
 assert.equal(combo.relicEffects.flankShots,1);
 assert.equal(base.relicEffects.intercepts,0);
 assert.equal(combo.relicEffects.intercepts,1);
 assert.equal(combo.battleEvent.type,'intercept');
 assert.ok(combo.relicEffects.counterDamage>0);
 assert.equal(combo.enemyHp,base.enemyHp-combo.relicEffects.counterDamage,
  'counterattack applies actual combat damage, not merely a cosmetic cue');
 const baseRear=base.contribution.taken.ranger+base.contribution.taken.medic;
 const comboRear=combo.contribution.taken.ranger+combo.contribution.taken.medic;
 assert.ok(baseRear>comboRear,'combination redirects focused rear damage onto the tank');
 assert.ok(combo.contribution.taken.guard>base.contribution.taken.guard,
  'tank absorbs damage that would have hit the rear');
 const total=x=>Object.values(x.contribution.taken).reduce((a,b)=>a+b,0);
 assert.ok(Math.abs(total(base)-total(combo))<1e-8,
  'same total enemy attack power, only target allocation changes');
 const loaded=E.normalize(JSON.parse(JSON.stringify(combo)),Date.now());
 assert.equal(loaded.relicEffects.intercepts,1);
 assert.equal(loaded.relicEffects.counterDamage,combo.relicEffects.counterDamage);
 assert.equal(loaded.enemyTactic.result,'intercept');
});
test('countering requires both relics and living frontline guard and active ranger',()=>{
 for(const what of ['guardOnly','archerOnly','noGuard','noRanger']){
  const s=setFlankFixture(E.newState(1000),20,{combo:true});
  if(what==='guardOnly')s.relics.archer=0;
  if(what==='archerOnly')s.relics.guard=0;
  if(what==='noGuard'){for(const a of s.actors.filter(a=>a.id==='guard')){a.hp=0;a.revive=100;a.progress=0;}}
  if(what==='noRanger'){for(const a of s.actors.filter(a=>a.id==='ranger')){a.hp=0;a.revive=100;a.progress=0;}}
  for(let i=0;i<5;i++)E.tick(s,1);
  assert.equal(s.relicEffects.intercepts,0,what+' does not produce a free combo counter');
  assert.equal(s.relicEffects.counterDamage,0);
 }
});
test('regular distance and short enemy encounters do not gain extra flank damage',()=>{
 const normal=setFlankFixture(E.newState(1000),13,{combo:true});
 E.tick(normal,9);
 assert.equal(normal.relicEffects.flankShots,0);
 assert.equal(normal.relicEffects.intercepts,0);
 assert.equal(normal.enemyTactic.phase,'idle');
 const quick=E.newState(1000);
 quick.stage=quick.best=quick.runBest=15;quick.enemyHp=.01;
 for(const a of quick.actors){a.cooldown=0;a.progress=1;}
 E.tick(quick,.1);
 assert.equal(quick.stage,16);
 assert.equal(quick.enemyTactic.stage,16);
 assert.equal(quick.enemyTactic.used,false);
});
test('flank and counter counters reset on rebirth while preserving last expedition report',()=>{
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=15;s.relics.guard=1;s.relics.archer=1;
 s.relicEffects.flankShots=6;s.relicEffects.intercepts=4;s.relicEffects.counterDamage=62;
 assert.ok(E.rebirth(s)>0);
 assert.equal(s.relicEffects.flankShots,0);
 assert.equal(s.relicEffects.intercepts,0);
 assert.equal(s.relicEffects.counterDamage,0);
 assert.equal(s.runHistory.at(-1).relicEffects.intercepts,4);
 assert.equal(s.latestReturn.relicEffects.counterDamage,62);
 assert.equal(E.normalize(JSON.parse(JSON.stringify(s)),Date.now()).latestReturn.relicEffects.flankShots,6);
 const older=E.newState(1000);delete older.enemyTactic;delete older.relicEffects;
 const restored=E.normalize(older,Date.now());
 assert.equal(restored.relicEffects.flankShots,0);
 assert.equal(restored.enemyTactic.phase,'idle');
});

// Optional automated collection must preserve manual loot and existing saved preferences.
require('./expedition-auto-chest.test.cjs');

// Auto chest collection is optional, observable, and not a forced strategy.
require('./expedition-auto-chest-telemetry.test.cjs');



function chargeFixture({brace=false,guard=true}={}){
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=14;s.enemyHp=1e9;
 s.actors.forEach(a=>{a.hp=1e7;a.revive=0;a.progress=guard?1:0;a.cooldown=100;});
 if(brace){s.relics.shield=1;s.relics.swift=1;}
 return s;
}
test('regular enemy archetype alternates deterministic chargers without replacing boss or elite tiers',()=>{
 for(const [stage,kind] of [[1,'regular'],[7,'regular'],[8,'charger'],[10,'boss'],
  [13,'regular'],[14,'charger'],[15,'elite'],[16,'disruptor'],[20,'boss'],
  [26,'charger'],[32,'charger'],[40,'boss'],[44,'charger']]){
  assert.equal(E.enemyKind(stage),kind,'enemy role by progression stage '+stage);
 }
});
test('ordinary charger telegraphs, knocks a guard back exactly once, and persists through save/reload',()=>{
 const s=chargeFixture();
 E.tick(s,3);
 assert.equal(s.enemyTactic.kind,'charger');
 assert.equal(s.enemyTactic.phase,'windup');
 assert.equal(s.enemyTactic.windup,1.5);
 assert.equal(s.battleEvent.type,'rush-aim');
 E.tick(s,1);
 assert.equal(s.enemyTactic.windup,.5,'windup persists as an actual half-second');
 const restored=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
 assert.equal(restored.enemyTactic.phase,'windup');
 assert.equal(restored.enemyTactic.windup,.5);
 E.tick(restored,1);
 assert.equal(restored.enemyTactic.phase,'fired');
 assert.equal(restored.enemyTactic.result,'rush');
 assert.equal(restored.relicEffects.rushes,1);
 assert.equal(restored.relicEffects.braces,0);
 assert.equal(restored.battleEvent.type,'rush');
 assert.ok(restored.actors[0].progress<=.22);
 assert.ok(restored.actors[0].cooldown>=.6);
 assert.equal(restored.chests,0,'no bonus chest, core or action expense for the new enemy type');
 E.tick(restored,15);
 assert.equal(restored.relicEffects.rushes,1,'one rush per ordinary enemy even during a long fight');
});
test('shield and march drum combination keeps formation and auto-counters the same regular rush',()=>{
 const plain=chargeFixture(),prepared=chargeFixture({brace:true});
 for(let sec=0;sec<5;sec++){E.tick(plain,1);E.tick(prepared,1);}
 assert.equal(plain.relicEffects.rushes,1);
 assert.equal(prepared.relicEffects.rushes,1);
 assert.equal(plain.relicEffects.braces,0);
 assert.equal(prepared.relicEffects.braces,1);
 assert.equal(prepared.enemyTactic.result,'brace');
 assert.equal(prepared.battleEvent.type,'brace');
 assert.ok(plain.actors[0].progress<=.22);
 assert.equal(prepared.actors[0].progress,1,'active shield plus drum prevents guard displacement');
 assert.ok(prepared.relicEffects.braceDamage>0);
 assert.ok(Math.abs(prepared.enemyHp-(plain.enemyHp-prepared.relicEffects.braceDamage))<1e-6,
  'brace actually damages the enemy; not only a combat visual effect');
 assert.ok(prepared.contribution.damage.guard>plain.contribution.damage.guard);
 assert.equal(prepared.contribution.taken.guard,plain.contribution.taken.guard,
  'guard position counter adds no enemy HP damage');
 const loaded=E.normalize(JSON.parse(JSON.stringify(prepared)),Date.now());
 assert.equal(loaded.relicEffects.braces,1);
 assert.equal(loaded.relicEffects.braceDamage,prepared.relicEffects.braceDamage);
 assert.equal(loaded.enemyTactic.result,'brace');
});
test('one shield copy partially resists a charge and retains it through save and return',()=>{
 const plain=chargeFixture(),partial=chargeFixture({brace:true}),full=chargeFixture({brace:true});
 partial.relics.swift=0;
 for(let i=0;i<5;i++){E.tick(plain,1);E.tick(partial,1);E.tick(full,1);}
 assert.equal(plain.enemyTactic.result,'rush');
 assert.equal(partial.enemyTactic.result,'brace-step');
 assert.equal(full.enemyTactic.result,'brace');
 assert.equal(partial.battleEvent.type,'brace-step');
 assert.equal(partial.relicEffects.partialBraces,1);
 assert.equal(partial.relicEffects.braces,0);
 assert.equal(partial.relicEffects.braceDamage,0);
 assert.equal(plain.actors[0].progress,.22);
 assert.equal(partial.actors[0].progress,.45);
 assert.equal(full.actors[0].progress,1);
 assert.equal(partial.enemyHp,plain.enemyHp,'partial defense grants no extra damage');
 assert.equal(partial.relicEffects.rushes,1,'original enemy rush count is unchanged');
 const loaded=E.normalize(JSON.parse(JSON.stringify(partial)),Date.now());
 assert.equal(loaded.relicEffects.partialBraces,1);
 assert.equal(loaded.enemyTactic.result,'brace-step');
 assert.equal(loaded.battleEvent.type,'brace-step');
 E.tick(partial,20);
 assert.equal(partial.relicEffects.partialBraces,1,'one partial brace per regular charger');
 assert.ok(E.rebirth(partial)>0);
 assert.equal(partial.relicEffects.partialBraces,0);
 assert.equal(partial.latestReturn.relicEffects.partialBraces,1);
 const older=chargeFixture();delete older.relicEffects.partialBraces;
 assert.equal(E.normalize(older,Date.now()).relicEffects.partialBraces,0);
});
test('charger defense needs both relics and a living deployed guard',()=>{
 for(const cond of ['none','shieldOnly','swiftOnly','guardDown']){
  const s=chargeFixture({brace:true});
  if(cond==='none'){s.relics.shield=0;s.relics.swift=0;}
  if(cond==='shieldOnly')s.relics.swift=0;
  if(cond==='swiftOnly')s.relics.shield=0;
  if(cond==='guardDown')for(const a of s.actors){a.revive=100;a.hp=0;a.progress=0;}
  E.tick(s,5);
  assert.equal(s.relicEffects.braces,0,cond);
  assert.equal(s.relicEffects.braceDamage,0,cond);
  if(cond==='guardDown'){
   assert.equal(s.enemyTactic.phase,'idle','no guard means no fake charge');
   assert.equal(s.relicEffects.rushes,0);
  }else{
   assert.equal(s.relicEffects.rushes,1);
   assert.equal(s.enemyTactic.result,cond==='shieldOnly'?'brace-step':'rush');
  }
 }
});
test('charger run counters reset on rebirth but prior report keeps observed tactics',()=>{
 const s=chargeFixture({brace:true});
 E.tick(s,5);
 assert.equal(s.relicEffects.rushes,1);
 assert.equal(s.relicEffects.braces,1);
 assert.ok(E.rebirth(s)>0);
 assert.equal(s.relicEffects.rushes,0);
 assert.equal(s.relicEffects.braces,0);
 assert.equal(s.relicEffects.braceDamage,0);
 assert.equal(s.enemyTactic.stage,1);
 assert.equal(s.runHistory.at(-1).relicEffects.rushes,1);
 assert.equal(s.latestReturn.relicEffects.braces,1);
 const loaded=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
 assert.equal(loaded.latestReturn.relicEffects.braces,1);
 assert.equal(loaded.enemyTactic.kind,'regular');
 const older=E.newState(1000);delete older.enemyTactic;delete older.relicEffects;
 const migrated=E.normalize(older,Date.now());
 assert.equal(migrated.relicEffects.rushes,0);
 assert.equal(migrated.enemyTactic.kind,'regular');
});

// Ranged enemy variant and relic-assisted signal response.
require('./expedition-disruptor.test.cjs');

// A five-core first return must not instantly yield a +24% attack spike.
require('./expedition-valor-first-return-balance.test.cjs');

// Late enemy tactics and pursuit are real combat/collection features, not orphaned tests.
require('./expedition-commander-cycles.test.cjs');
// Duplicate collection creates a genuinely different 40+ escort response, but no early buff.
require('./expedition-escort-duet.test.cjs');
require('./expedition-stage55-pursuit.test.cjs');

// Long-fight observation reports evidence only; no extra damage or free rewards.
require('./expedition-engagement-evidence.test.cjs');
// Core purchase choices and held-chest discovery must be grounded, read-only.
require('./expedition-return-choice.test.cjs');

// Report actual per-expedition collection progress instead of inventing new drops.
require('./expedition-relic-run-count.test.cjs');
// Exact first-vs-second copy payoff in the archive must match the real engine.
require('./expedition-relic-copy-preview.test.cjs');
// The reward popup uses real per-copy conditional stats, not misleading generic DPS.
require('./expedition-reward-impact.test.cjs');

// Deep shield+escort combination must allow melee participation, no free rewards.
require('./expedition-deep-guard-formation.test.cjs');

// New tactical events must retain their identity through persisted saves.
require('./expedition-battle-event-save-contract.test.cjs');

// Manual hero trait reallocation must retain permanent XP, cores, and loot.
require('./expedition-trait-respec.test.cjs');

// Late elite HP tiers must never reset in-progress saved battles.
require('./expedition-elite65-hp-migration.test.cjs');
// A depth65 earned relic adds one late-boss tactic without changing early runs.
require('./expedition-stage65-diagram.test.cjs');

// Nonvisual metadata must not prematurely erase a genuine battle motion.
test('spectator motion survives nonvisual combat events',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync(require.resolve('../site/expedition-field.js'),'utf8');
 const start=source.indexOf('function showMotion(evt){');
 const end=source.indexOf('const fighter=id=>',start);
 assert.ok(start>=0&&end>start,'battle motion renderer exists');
 const body=source.slice(start,end);
 assert.ok(body.indexOf('motion.replaceChildren();')>body.indexOf("includes(kind))return;"),
  'only drawable combat events may replace active motion');
});

// The permanent chest target must identify the next real elite/boss encounter.
test('portrait next-chest objective distinguishes elite and boss milestones',()=>{
 const fs=require('node:fs');
 const ui=fs.readFileSync(require.resolve('../site/expedition-ui.js'),'utf8');
 assert.match(ui,/const nextChest=s\.stage\+\(\(5-s\.stage%5\)%5\)/);
 assert.match(ui,/E\.isBoss\(nextChest\)\?'지휘급':'정예'/);
 for(const stage of [1,5,6,10,11,15,16]){
  const target=stage+((5-stage%5)%5);
  assert.equal(target%5,0);
  assert.ok(target>=stage&&target-stage<5);
  assert.equal(E.isBoss(target),target%10===0);
 }
});
