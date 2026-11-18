/* 네온 방치단: 독립 용병단 원형 — 기존 game.js 및 저장 데이터와 무관한 엔진.
   Node tests + browser share these rules. Original mechanics, names and assets are not imported. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ExpeditionEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=1;
const MAX_ACTORS=120; // protect save size and two-hour offline ticks
const AUTO_BUY_INTERVAL=4; // seconds between optional single-step purchases
const AUTO_CHEST_INTERVAL=60; // opt-in automatic batch opening, also in offline settlement
const BALANCED_SAVING_HORIZON_SECONDS=240;
const BALANCED_FALLBACK_BUDGET_RATIO=.35;
// Earn fractional return progress by defeating enemies, not by pushing
// the return button. This is NOT spendable currency until a return.
const CORE_PROGRESS_PER_CLEAR=0.025;
const CORE_PROGRESS_GROWTH=1.18;
const AUTO_MODES=['balanced','reserve','adaptive','train','recruit','supply'];
// One-time first-clear exploration cores. Repeat rebirths have no inherent multiplier.
const BREAKTHROUGHS=[{stage:10,cores:1},{stage:15,cores:1},{stage:25,cores:2},{stage:35,cores:3},{stage:50,cores:5},{stage:75,cores:8},{stage:100,cores:13}];
const SAVE_KEY='neon_expedition_prototype_v1';
const UNITS=[
 {id:'guard',name:'방벽병',symbol:'🛡',dps:1.65,hp:48,heal:0,unlock:1},
 {id:'ranger',name:'척후사수',symbol:'⌁',dps:4.4,hp:17,heal:0,unlock:3},
 {id:'medic',name:'현장정비사',symbol:'✚',dps:0.85,hp:25,heal:2.7,unlock:6}
];
const QUESTS=[
 {id:'dispatch',name:'근거리 보급',interval:6,income:9,unlock:1,upgradeCost:42},
 {id:'salvage',name:'잔해 회수',interval:20,income:54,unlock:5,upgradeCost:190},
 {id:'contract',name:'호송 계약',interval:60,income:270,unlock:12,upgradeCost:780}
];
const RELICS=[
 {id:'ember',name:'용광로 문장',desc:'용병단 피해량이 수집 수마다 8% 증가',cap:5,unlockStage:5},
 {id:'shield',name:'합금 배지',desc:'용병단 체력이 수집 수마다 10% 증가',cap:5,unlockStage:5},
 {id:'income',name:'교역 인장',desc:'자동 보급 수익이 수집 수마다 12% 증가',cap:5,unlockStage:5},
 {id:'swift',name:'진군 북',desc:'용병단 피해량이 수집 수마다 5% 증가',cap:5,unlockStage:15},
 {id:'medkit',name:'재생 결속선',desc:'정비사 회복력 +18%/개 · 살아 있는 정비사가 방벽병 긴급 재합류를 지원 (18초마다 최대 1회)',cap:4,unlockStage:15},
 {id:'boss',name:'균열 렌즈',desc:'지휘급 적에게 주는 피해가 수집 수마다 14% 증가',cap:5,unlockStage:25},
 {id:'bounty',name:'현상금 표식',desc:'전투 크레딧 보상이 수집 수마다 12% 증가',cap:5,unlockStage:5},
 {id:'guard',name:'호위 계약서',desc:'방벽병 체력이 수집 수마다 20% 증가',cap:4,unlockStage:5},
 {id:'archer',name:'초점 조준기',desc:'사수 3번째 사격마다 정밀 일제사격 발동 (수집 수마다 강화 · 평균 화력 +15%/개)',cap:4,unlockStage:15},
 {id:'scout',name:'탐사 일지',desc:'지휘관 전투 경험치 +15%/개 · 작전 통신기와 함께 탐사 정보망 활성화',cap:4,unlockStage:25},
 {id:'fortune',name:'중복 해체권',desc:'중복 유물 발견 시 수집 수마다 추가 크레딧 획득',cap:3,unlockStage:30},
 {id:'relay',name:'작전 통신기',desc:'전체 피해량 +5%/개 · 탐사 일지와 함께 자동 유물 조사 보상 해금',cap:5,unlockStage:30},
 // Only deep-earned chests can reveal these permanent run-economy options.
 {id:'enlist',name:'선발권 묶음',desc:'용병 소집 비용이 수집 수마다 6% 감소',cap:3,unlockStage:40},
 {id:'drill',name:'훈련 규정집',desc:'부대 훈련 비용이 수집 수마다 6% 감소',cap:3,unlockStage:45},
 // A unique depth-50 collection reward, not a hidden bonus per rebirth.
 {id:'chronicle',name:'원정 연대기',desc:'서로 다른 유물 1종마다 용병단 피해량 2% 증가 (최대 30%)',cap:1,unlockStage:50}
];
const num=(n,min=0,max=1e14)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):min;
const integer=(n,min=0,max=100000)=>Math.floor(num(n,min,max));
const total=s=>UNITS.reduce((n,u)=>n+s.units[u.id],0);
const emptyContribution=()=>({damage:{guard:0,ranger:0,medic:0},healing:{guard:0,ranger:0,medic:0},taken:{guard:0,ranger:0,medic:0},falls:{guard:0,ranger:0,medic:0},attacks:{guard:0,ranger:0,medic:0}});
const initialAutoBuy=()=>({enabled:false,mode:'balanced',elapsed:0,cursor:0,purchases:0,spent:0});
const initialAutoChest=()=>({enabled:false,elapsed:0,opened:0});
const initialRunMetrics=()=>({manualPurchases:0,manualSpent:0,chestsOpened:0});
// Per-run relic action telemetry; old saves default to no past activations.
const initialRelicEffects=()=>({volleys:0,volleyBonusDamage:0,triages:0,triageCooldown:0,intelClears:0,intelFinds:0});
const combatEffectReport=raw=>raw&&typeof raw==='object'?{
 volleys:integer(raw.volleys,0,1e9),
 volleyBonusDamage:num(raw.volleyBonusDamage,0,1e14),
 triages:integer(raw.triages,0,1e9),
 intelFinds:integer(raw.intelFinds,0,2)
}:null;
const MAX_PLAYTEST_SNAPSHOTS=360;
const initialPlaytest=()=>({snapshots:[],offlineSeconds:0});
// Bounded in-run boss/elite clear timestamps: 60-second snapshots miss the opening.
const MILESTONE_STAGES=[5,10,15,20,25,30,35,40,45,50,75,100];
function normalizedMilestones(raw){
 const out={};if(!raw||typeof raw!=='object')return out;
 for(const stage of MILESTONE_STAGES){
  const value=raw[stage];
  if(Number.isFinite(value)&&value>=0)out[stage]=Math.round(Math.min(value,1e9)*10)/10;
 }
 return out;
}
// Record only the two-guard, untrained *opening* formation. New saves use
// the actual engine-derived values; old saves without an opening snapshot
// never receive an invented historic comparison.
const initialRunOpening=()=>({
 attack:UNITS[0].dps*2,hp:UNITS[0].hp*2,income:QUESTS[0].income
});
const validOpening=x=>x&&typeof x==='object'&&
 ['attack','hp','income'].every(k=>Number.isFinite(x[k])&&x[k]>0)?{
  attack:num(x.attack,0,1e14),hp:num(x.hp,0,1e14),
  income:num(x.income,0,1e14)
 }:null;

const isBoss=stage=>stage%10===0;
const isElite=stage=>stage%5===0;
const relic=(s,id)=>integer(s.relics[id],0,RELICS.find(x=>x.id===id)?.cap||0);
const intelNetworkActive=s=>relic(s,'scout')>0&&relic(s,'relay')>0;
// Owning the single stage-50 chronicle makes collecting *different* relics
// valuable. A hard 15-kind ceiling prevents later catalog expansion from
// silently scaling combat forever. Copies of existing relics do not count.
const collectionBoost=s=>relic(s,'chronicle')?
 1+.02*Math.min(15,RELICS.filter(r=>relic(s,r.id)>0).length):1;
const newState=(now=Date.now())=>({
 version:VERSION,lastSaved:now,seed:123456789,clock:0,credits:65,stage:1,best:1,runBest:1,
 units:{guard:2,ranger:0,medic:0},training:0,questLevels:{dispatch:0,salvage:0,contract:0},
 questClocks:{dispatch:0,salvage:0,contract:0},enemyHp:13,bossHpBalanceVersion:2,squadHp:96,respawn:0,
 actors:[{id:'guard',hp:48,revive:0,progress:0,cooldown:.6,shots:0},{id:'guard',hp:48,revive:0,progress:0,cooldown:1.2,shots:0}],battleEvent:null,battleCueSeq:0,
 kills:0,runKills:0,heroLevel:1,heroXp:0,traitPoints:0,traits:{command:0,supply:0},
 relics:{},chests:0,chestDepths:[],chestsOpened:0,cores:0,coreSpent:0,coreUpgrades:{valor:0,trade:0},
 rebirths:0,claimedBreakthroughDistance:0,coreProgress:0,coreReserve:0,contribution:emptyContribution(),relicEffects:initialRelicEffects(),autoBuy:initialAutoBuy(),autoChest:initialAutoChest(),runMetrics:initialRunMetrics(),runMilestones:{},runHistory:[],relicHistory:[],playtest:initialPlaytest(),runOpening:initialRunOpening(),latestReturn:null,events:['첫 번째 탐사를 시작했어.']
});
function normalize(raw,now=Date.now()){
 const base=newState(now);if(!raw||raw.version!==VERSION||typeof raw!=='object')return base;
 const s={...base};
 for(const k of ['credits','stage','best','runBest','training','enemyHp','squadHp','respawn','kills','runKills','heroLevel','heroXp','traitPoints','chests','chestsOpened','cores','coreSpent','rebirths','clock','lastSaved','seed','battleCueSeq'])s[k]=num(raw[k],0,k==='credits'?1e14:1e9);
 for(const k of ['stage','best','runBest','heroLevel'])s[k]=integer(s[k],1,100000);
 for(const k of ['training','kills','runKills','traitPoints','chests','chestsOpened','cores','coreSpent','rebirths','seed'])s[k]=integer(s[k]);
 // Saved legacy chests have no known source distance: preserve their old full-pool odds (depth 0).
 // Newer chests use their earned distance, never the distance when opened.
 const depths=Array.isArray(raw.chestDepths)?raw.chestDepths.slice(0,s.chests).map(x=>integer(x,0,100000)):[];
 s.chestDepths=Array(Math.max(0,s.chests-depths.length)).fill(0).concat(depths);
 // Old saves have no provenance for earlier first-clears. Treat historic best as
 // already accounted for rather than silently adding retroactive core rewards.
 s.claimedBreakthroughDistance=integer(raw.claimedBreakthroughDistance===undefined?Math.max(0,integer(raw.best,1,100000)-1):raw.claimedBreakthroughDistance,0,100000);
 s.lastSaved=num(raw.lastSaved,0,now)||now;s.best=Math.max(s.stage,s.best);s.runBest=Math.max(s.stage,s.runBest);
 for(const kind of ['units','questLevels','questClocks','traits','relics','coreUpgrades'])s[kind]={};
 UNITS.forEach(u=>s.units[u.id]=integer(raw.units?.[u.id],0,MAX_ACTORS));
 // Older prototype saves held only aggregate health. Reconstruct individual fighters safely.
 let spaces=MAX_ACTORS;for(const u of UNITS){s.units[u.id]=Math.min(s.units[u.id],spaces);spaces-=s.units[u.id];}
 if(!total(s))s.units.guard=2;
 QUESTS.forEach(q=>{s.questLevels[q.id]=integer(raw.questLevels?.[q.id],0,100);s.questClocks[q.id]=num(raw.questClocks?.[q.id],0,q.interval);});
 for(const id of ['command','supply'])s.traits[id]=integer(raw.traits?.[id],0,10);
 RELICS.forEach(r=>s.relics[r.id]=integer(raw.relics?.[r.id],0,r.cap));
 for(const id of ['valor','trade'])s.coreUpgrades[id]=integer(raw.coreUpgrades?.[id],0,30);
 // Control preferences are part of the prototype save, but missing legacy preferences
 // are always OFF rather than silently activating automation.
 s.autoBuy=initialAutoBuy();
 if(raw.autoBuy&&typeof raw.autoBuy==='object'){
  s.autoBuy.enabled=raw.autoBuy.enabled===true;
  s.autoBuy.mode=AUTO_MODES.includes(raw.autoBuy.mode)?raw.autoBuy.mode:'balanced';
  s.autoBuy.elapsed=num(raw.autoBuy.elapsed,0,AUTO_BUY_INTERVAL);
  s.autoBuy.cursor=integer(raw.autoBuy.cursor,0,2);
  s.autoBuy.purchases=integer(raw.autoBuy.purchases,0,1e9);
  s.autoBuy.spent=num(raw.autoBuy.spent,0,1e14);
 }
 // Collection automation is strictly opt-in. Older saves default OFF.
 s.autoChest=initialAutoChest();
 if(raw.autoChest&&typeof raw.autoChest==='object'){
  s.autoChest.enabled=raw.autoChest.enabled===true;
  s.autoChest.elapsed=num(raw.autoChest.elapsed,0,AUTO_CHEST_INTERVAL);
  s.autoChest.opened=integer(raw.autoChest.opened,0,1e9);
 }
 s.runMetrics=initialRunMetrics();
 for(const k of ['manualPurchases','chestsOpened'])s.runMetrics[k]=integer(raw.runMetrics?.[k],0,1e9);
 s.runMetrics.manualSpent=num(raw.runMetrics?.manualSpent,0,1e14);
 s.relicEffects=initialRelicEffects();
 for(const k of ['volleys','triages'])s.relicEffects[k]=integer(raw.relicEffects?.[k],0,1e9);
 s.relicEffects.intelClears=integer(raw.relicEffects?.intelClears,0,1);
 s.relicEffects.intelFinds=integer(raw.relicEffects?.intelFinds,0,2);
 s.relicEffects.volleyBonusDamage=num(raw.relicEffects?.volleyBonusDamage,0,1e14);
 s.relicEffects.triageCooldown=num(raw.relicEffects?.triageCooldown,0,18);
 s.runOpening=validOpening(raw.runOpening);
 const report=raw.latestReturn;
 s.latestReturn=report&&typeof report==='object'&&Number.isFinite(report.cleared)&&Number.isFinite(report.cores)?{
  number:integer(report.number,1,1e9),cleared:integer(report.cleared,10,100000),
  duration:integer(report.duration,0,1e9),cores:integer(report.cores,0,1e9),
  earned:integer(report.earned,0,1e9),firstClear:integer(report.firstClear,0,1e9),
  relicKinds:integer(report.relicKinds,0,RELICS.length),
  relicCopies:integer(report.relicCopies,0,1000),
  chests:integer(report.chests,0,1e9),
  autoChestOpened:Number.isFinite(report.autoChestOpened)?integer(report.autoChestOpened,0,1e9):null,
  before:validOpening(report.before),after:validOpening(report.after),
  relicEffects:combatEffectReport(report.relicEffects)
 }:null;
 s.runMilestones=normalizedMilestones(raw.runMilestones);
 s.runHistory=Array.isArray(raw.runHistory)?raw.runHistory.slice(-5).filter(x=>x&&typeof x==='object').map(x=>({
  duration:integer(x.duration,0,1e9),best:integer(x.best,1,100000),
  kills:integer(x.kills,0,1e9),cores:integer(x.cores,0,1e9),
  manualPurchases:integer(x.manualPurchases,0,1e9),
  autoPurchases:integer(x.autoPurchases,0,1e9),
  chestsOpened:integer(x.chestsOpened,0,1e9),
  autoChestOpened:Number.isFinite(x.autoChestOpened)?integer(x.autoChestOpened,0,1e9):null,
  milestones:normalizedMilestones(x.milestones),
  relicEffects:combatEffectReport(x.relicEffects)
 })):[];
 // Bound the lifetime discovery journal. No historical reroll or reward is granted
 // when migrating a save made before this field existed.
 s.relicHistory=Array.isArray(raw.relicHistory)?raw.relicHistory.slice(-24).filter(x=>x&&typeof x==='object'&&(x.id===null||RELICS.some(r=>r.id===x.id))).map(x=>({
  id:x.id===null?null:x.id,duplicate:x.duplicate===true,
  stack:integer(x.stack,0,5),credits:num(x.credits,0,1e14),
  stage:integer(x.stage,1,100000),depth:integer(x.depth,0,100000),run:integer(x.run,1,1e9)
 })):[];
 // Local-only playtest time series, never sent anywhere by the engine.
 // Validate old or malformed saved snapshots and impose a fixed size ceiling.
 s.coreProgress=num(raw.coreProgress,0,1e9);
 s.coreReserve=num(raw.coreReserve,0,1);
 s.playtest=initialPlaytest();
 s.playtest.offlineSeconds=num(raw.playtest?.offlineSeconds,0,1e9);
 if(Array.isArray(raw.playtest?.snapshots)){
  s.playtest.snapshots=raw.playtest.snapshots.slice(-MAX_PLAYTEST_SNAPSHOTS)
   .filter(x=>x&&typeof x==='object').map(x=>({
    run:integer(x.run,1,1e9),sec:integer(x.sec,0,1e9),
    stage:integer(x.stage,1,100000),credits:num(x.credits,0,1e14),
    training:integer(x.training,0,100000),heroLevel:integer(x.heroLevel,1,500),
    recruits:integer(x.recruits,0,MAX_ACTORS),
    chests:integer(x.chests,0,1e9),
    relicKinds:integer(x.relicKinds,0,RELICS.length),
    relicTotal:integer(x.relicTotal,0,1000),
    manualBuys:integer(x.manualBuys,0,1e9),
    autoBuys:integer(x.autoBuys,0,1e9),
    // Missing history is UNKNOWN: don't fabricate past OFF/0 from old saves.
    autoChestEnabled:typeof x.autoChestEnabled==='boolean'?x.autoChestEnabled:null,
    autoChestOpened:Number.isFinite(x.autoChestOpened)?integer(x.autoChestOpened,0,1e9):null,
    source:x.source==='offline'?'offline':'foreground'
   }));
 }
 s.contribution=emptyContribution();
 for(const kind of ['damage','healing','taken','falls','attacks'])for(const u of UNITS)
  s.contribution[kind][u.id]=kind==='falls'||kind==='attacks'?integer(raw.contribution?.[kind]?.[u.id],0,1e9):num(raw.contribution?.[kind]?.[u.id],0,1e14);
 s.events=Array.isArray(raw.events)?raw.events.filter(x=>typeof x==='string').slice(-8):base.events.slice();
 const expected=UNITS.flatMap(u=>Array(s.units[u.id]).fill(u.id));
 // Recruitment orders can interleave types, so validate counts rather than sorting actors.
 const rawActors=Array.isArray(raw.actors)?raw.actors:[];
 const usable=rawActors.length===expected.length&&
  UNITS.every(u=>rawActors.filter(a=>a&&a.id===u.id).length===s.units[u.id]);
 const roster=usable?rawActors:expected.map(id=>({id}));
 const ratio=usable?1:Math.min(1,s.squadHp/maxHp(s));
 s.actors=roster.map((a,i)=>{
  const id=a.id;
  a=usable?a:null;
  const hp=a?num(a.hp,0,actorMaxHp(s,id)):actorMaxHp(s,id)*ratio;
  const revive=a?num(a.revive,0,60):s.respawn;
  return {id,hp,
   revive:hp===0&&revive===0?4:revive,
   progress:a?num(a.progress,0,1):0,
   cooldown:a?num(a.cooldown,0,3):attackInterval(id)*(.55+(i%3)*.2),
   shots:a?integer(a.shots,0,2):0};
 });
 s.battleEvent=raw.battleEvent&&typeof raw.battleEvent==='object'
  ?{seq:integer(raw.battleEvent.seq),type:['hit','heal','fallen','returned','clear','rally','volley','triage','intel'].includes(raw.battleEvent.type)?raw.battleEvent.type:'hit',
     id:UNITS.some(u=>u.id===raw.battleEvent.id)?raw.battleEvent.id:'guard',value:num(raw.battleEvent.value,0,1e14)}:null;
 s.battleCueSeq=integer(raw.battleCueSeq);
 updateSquadHealth(s);
 // Legacy saves may be in the middle of a 50+ boss fight. Preserve the
 // fraction of boss health left after the HP reduction, once only. Earlier
 // stages and already-migrated saves retain their exact saved HP.
 if(raw.bossHpBalanceVersion!==2&&isBoss(s.stage)&&s.stage>=50&&s.enemyHp>0){
  const early=Math.min(s.stage-1,39),late=Math.max(0,Math.min(s.stage-40,60));
  const oldBossMax=Math.min(1e13,Math.round(3.8*13*Math.pow(1.235,early)*Math.pow(1.18,late)));
  const newBossMax=enemyMax(s.stage);
  s.enemyHp=Math.max(1,Math.min(newBossMax,Math.round(s.enemyHp/oldBossMax*newBossMax)));
 }
 s.enemyHp=s.enemyHp||enemyMax(s.stage);
 return s;
}
function rand(s){let x=(s.seed>>>0)||123456789;x^=x<<13;x^=x>>>17;x^=x<<5;s.seed=x>>>0;return s.seed/4294967296;}
function note(s,m){s.events.push(m);if(s.events.length>8)s.events.shift();}
function enemyMax(stage){
 // Keep stages 1..40 exactly as before. After 40, slow exponential HP
 // growth without hiding a boss or eliminating progressive combat difficulty.
 const early=Math.min(stage-1,39),late=Math.max(0,Math.min(stage-40,60));
 // From distance 50 onward, boss HP previously ran for 15-17 minutes
 // with essentially linear health-bar drain. Keep a distinct boss tier
 // (2.2x versus the regular enemy), but avoid a prolonged stationary wall.
 const rankMultiplier=isBoss(stage)?(stage>=50?2.2:3.8):isElite(stage)?2:1;
 return Math.min(1e13,Math.round(rankMultiplier*
  13*Math.pow(1.235,early)*Math.pow(1.18,late)));
}
function actorMaxHp(s,id){
 const unit=UNITS.find(u=>u.id===id)||UNITS[0];
 return unit.hp*(1+.16*s.training)*(1+.10*relic(s,'shield'))*(1+.06*s.coreUpgrades.valor)*(id==='guard'?1+.20*relic(s,'guard'):1);
}
function maxHp(s){return Math.max(1,UNITS.reduce((sum,u)=>sum+s.units[u.id]*actorMaxHp(s,u.id),0));}
function attackInterval(id){return id==='guard'?1.35:id==='ranger'?1.65:1.9;}
function actorSpeed(id){return id==='guard'?.51:id==='ranger'?.70:.56;}
function attackRange(id){return id==='guard'?.83:.36;}
function updateSquadHealth(s){
 s.squadHp=s.actors.reduce((sum,a)=>sum+(a.revive>0?0:a.hp),0);
 const waits=s.actors.filter(a=>a.revive>0).map(a=>a.revive);
 s.respawn=s.squadHp<=0&&waits.length?Math.min(...waits):0;
}
function battleCue(s,type,id,value=0){s.battleCueSeq++;s.battleEvent={seq:s.battleCueSeq,type,id,value:Math.max(0,value)};}
function partyDps(s){return UNITS.reduce((sum,u)=>sum+s.units[u.id]*u.dps*(u.id==='ranger'?1+.15*relic(s,'archer'):1),0)*(1+.23*s.training)*(1+.08*relic(s,'ember')+.05*relic(s,'swift')+.05*relic(s,'relay'))*(1+.06*s.traits.command)*(1+.08*s.coreUpgrades.valor)*collectionBoost(s);}
function healDps(s){return s.units.medic*2.7*(1+.18*relic(s,'medkit'))*(1+.08*s.training);}
function questIncome(s,q){return q.income*(1+1.1*s.questLevels[q.id])*(1+.12*relic(s,'income'))*(1+.08*s.traits.supply)*(1+.09*s.coreUpgrades.trade);}
function hireCost(s){return Math.max(1,Math.round(25*Math.pow(1.22,Math.max(0,total(s)-2))*(1-.06*relic(s,'enlist'))));}
function trainCost(s){return Math.max(1,Math.round(46*Math.pow(1.51,s.training)*(1-.06*relic(s,'drill'))));}
function questCost(s,q){return Math.round(q.upgradeCost*Math.pow(1.63,s.questLevels[q.id]));}
// Cubic cumulative investment costs temper acceleration from later returns.
function coreCost(s,id){
 const level=s.coreUpgrades[id];
 return 1+Math.floor(level/2)+Math.floor(level*level/8);
}
function coreProgressForClear(stage){
 // Beyond this distance cap the per-clear yield, preventing overflow in
 // very long saves while keeping deeper victories worth more.
 const exponent=Math.max(-9,Math.min(35,integer(stage,1,100000)-10));
 return CORE_PROGRESS_PER_CLEAR*Math.pow(CORE_PROGRESS_GROWTH,exponent);
}
function traitRemaining(s){return Math.max(0,s.heroLevel-1-s.traits.command-s.traits.supply);}
function xpNeeded(level){return Math.round(30+35*Math.pow(level,1.28));}
function heroXp(s,amount){
 s.heroXp+=amount*(1+.15*relic(s,'scout'));
 while(s.heroXp>=xpNeeded(s.heroLevel)&&s.heroLevel<500){s.heroXp-=xpNeeded(s.heroLevel);s.heroLevel++;note(s,'지휘관 레벨 '+s.heroLevel+' · 특성 포인트 획득');}
}
function victory(s){
 const cleared=s.stage;
 if(MILESTONE_STAGES.includes(cleared)&&!Object.prototype.hasOwnProperty.call(s.runMilestones,cleared))
  s.runMilestones[cleared]=Math.round(s.clock*10)/10;
 const reward=Math.round((8+cleared*2.6)*Math.pow(1.105,Math.min(cleared,110))*(1+.12*relic(s,'bounty')));
 s.credits=Math.min(1e14,s.credits+reward);s.kills++;s.runKills++;
 s.coreProgress=Math.min(1e9,s.coreProgress+coreProgressForClear(cleared));
 heroXp(s,5+cleared*.7+(isBoss(cleared)?20:0));
 let networkFind=false;
 if(isElite(cleared)){
  s.chests++;s.chestDepths.push(cleared);
  note(s,(isBoss(cleared)?'지휘급 목표 격파!':'정예 목표 격파!')+' 보급 상자 1개 확보');
  // Both permanent relics convert repeated deep elite victories into a
  // separate automatic discovery. Never drain a queued chest or add taps.
  // Two finds per expedition; rebirth resets only this run's counters.
  if(cleared>=30&&intelNetworkActive(s)&&s.relicEffects.intelFinds<2){
   s.relicEffects.intelClears++;
   if(s.relicEffects.intelClears>=2){
    s.relicEffects.intelClears=0;
    const find=rollRelic(s,cleared,true);
    s.relicEffects.intelFinds++;
    networkFind=true;
    note(s,find.id?'탐사 정보망 자동 발견 · '+RELICS.find(r=>r.id===find.id).name:
     '탐사 정보망 조사 완료 · 추가 크레딧 회수');
   }
  }
 }
 s.stage++;s.runBest=Math.max(s.runBest,s.stage);s.best=Math.max(s.best,s.stage);
 s.enemyHp=enemyMax(s.stage);
 // New wave: units regroup behind the front line, survivors recover a little.
 for(const a of s.actors){a.progress=Math.max(0,a.progress-.75);if(a.revive===0)a.hp=Math.min(actorMaxHp(s,a.id),a.hp+actorMaxHp(s,a.id)*.15);}
 updateSquadHealth(s);battleCue(s,networkFind?'intel':'clear','guard',cleared);
}
function fight(s,dt){
 // Individual fighters move to the clash; guards engage up close, rangers attack
 // from the rear, and medics heal the most injured living squad member.
 let returned=false;
 for(const a of s.actors){
  if(a.revive>0){
   a.revive=Math.max(0,a.revive-dt);
   if(a.revive===0){a.hp=actorMaxHp(s,a.id);a.progress=0;a.cooldown=.5;returned=true;battleCue(s,'returned',a.id);}
  }else a.progress=Math.min(1,a.progress+actorSpeed(a.id)*dt);
 }
 if(returned)note(s,'후퇴한 용병이 전선에 재합류했어.');
 const living=s.actors.filter(a=>a.revive===0&&a.hp>0);
 if(!living.length){updateSquadHealth(s);return;}
 const boss=isBoss(s.stage),collection=collectionBoost(s);
 s.relicEffects.triageCooldown=Math.max(0,s.relicEffects.triageCooldown-dt);
 const cueBeforeAttacks=s.battleCueSeq;
 let damage=0,precisionCue=null;
 for(const a of living){
  a.cooldown-=dt;
  if(a.progress<attackRange(a.id)||a.cooldown>0)continue;
  const u=UNITS.find(u=>u.id===a.id);
  const multiplier=(1+.23*s.training)*(1+.08*relic(s,'ember')+.05*relic(s,'swift')+.05*relic(s,'relay'))*
   (1+.06*s.traits.command)*(1+.08*s.coreUpgrades.valor)*
   (boss?1+.14*relic(s,'boss'):1)*collection;
  // Previous +15%/copy to every shot is now a +45%/copy volley on
  // every third shot: same nominal average DPS, a different battle rhythm.
  const baseAmount=u.dps*attackInterval(a.id)*multiplier;
  if(a.id==='ranger')a.shots=((a.shots||0)+1)%3;
  const volley=a.id==='ranger'&&a.shots===0&&relic(s,'archer')>0;
  const amount=baseAmount*(volley?1+.45*relic(s,'archer'):1);
  if(volley){
   s.relicEffects.volleys++;
   const remaining=Math.max(0,s.enemyHp-damage);
   s.relicEffects.volleyBonusDamage=Math.min(1e14,s.relicEffects.volleyBonusDamage+
    Math.max(0,Math.min(remaining,amount)-Math.min(remaining,baseAmount)));
   precisionCue=amount;
  }
  // Exclude overkill from useful damage statistics; retain original combat damage.
  const dealt=Math.min(Math.max(0,s.enemyHp-damage),amount);
  s.contribution.damage[a.id]+=dealt;
  s.contribution.attacks[a.id]++;
  damage+=amount;
  a.cooldown+=attackInterval(a.id);battleCue(s,'hit',a.id,amount);
 }
 // Ordinary hits must not overwrite this special cue in the same tick.
 if(precisionCue!==null)battleCue(s,'volley','ranger',precisionCue);
 s.enemyHp-=damage;
 if(s.enemyHp<=0){victory(s);return;}
 // Medics work only while alive; injury persists on individual actors.
 for(const medic of living.filter(a=>a.id==='medic'&&a.progress>=.25)){
  const patient=living.filter(a=>a.hp<actorMaxHp(s,a.id)-.001)
   .sort((a,b)=>a.hp/actorMaxHp(s,a.id)-b.hp/actorMaxHp(s,b.id))[0];
  if(patient){
   const amount=Math.min(actorMaxHp(s,patient.id)-patient.hp,2.7*(1+.18*relic(s,'medkit'))*(1+.08*s.training)*dt);
   if(amount>0){patient.hp+=amount;s.contribution.healing.medic+=amount;if(s.battleCueSeq===cueBeforeAttacks)battleCue(s,'heal',patient.id,amount);}
  }
 }
 const enemyDps=.4*Math.pow(1.17,Math.min(s.stage-1,100))*(boss?2.2:isElite(s.stage)?1.4:1);
 // Guards anchor the front, but ordinary flank shots and elite/boss splash
 // reach rear fighters too. Split existing enemy DPS: never create extra
 // enemy damage merely because the player recruited a ranger or medic.
 const frontline=living.filter(a=>a.progress>.25).sort((a,b)=>
  (a.id==='guard'?0:a.id==='ranger'?1:2)-(b.id==='guard'?0:b.id==='ranger'?1:2)||
  b.progress-a.progress)[0];
 const rear=living.filter(a=>a.id!=='guard'&&a.progress>.25&&a!==frontline);
 const pierce=rear.length?(boss?.22:isElite(s.stage)?.14:.08):0;
 function hit(actor,amount){
  if(!actor||amount<=0)return;
  const taken=Math.min(actor.hp,amount);
  s.contribution.taken[actor.id]+=taken;
  actor.hp=Math.max(0,actor.hp-taken);
  if(actor.hp<=0){
   s.contribution.falls[actor.id]++;actor.revive=6;actor.progress=0;actor.cooldown=.5;
   // Field triage never prevents defeat or revives the guard instantly.
   // It only reduces one existing return timer per 18-second interval.
   const kits=relic(s,'medkit');
   const triage=actor.id==='guard'&&kits>0&&s.relicEffects.triageCooldown<=0&&
    living.some(a=>a.id==='medic'&&a.hp>0&&a.revive===0&&a.progress>=.25);
   if(triage){
    actor.revive=Math.max(1.2,6-1.2*kits);
    s.relicEffects.triageCooldown=18;s.relicEffects.triages++;
    battleCue(s,'triage',actor.id,6-actor.revive);
    note(s,'재생 결속선 · 방벽병 긴급 회수 · '+actor.revive.toFixed(1)+'초 후 복귀');
   }else{
    battleCue(s,'fallen',actor.id);
    note(s,(UNITS.find(u=>u.id===actor.id)||UNITS[0]).name+' 후퇴 · 재합류 대기');
   }
  }
 }
 // The rear can be clipped, but must not be shredded by the exponential
 // enemy damage curve past stage 40. Cap rear pressure per fighter HP per
 // second and give the unused attack strength back to the guarded front.
 const target=pierce?rear[Math.floor(s.clock/3)%rear.length]:null;
 const rearShot=target?Math.min(enemyDps*dt*pierce,
  actorMaxHp(s,target.id)*(boss?.08:isElite(s.stage)?.06:.04)*dt):0;
 hit(frontline,enemyDps*dt-rearShot);
 if(target)hit(target,rearShot);
 updateSquadHealth(s);
 if(s.squadHp<=0){s.enemyHp=enemyMax(s.stage);battleCue(s,'rally','guard');note(s,'부대 전원 후퇴 · 적 전선 재정비');}
}
function recordPlaytestMinute(s,source){
 const count=RELICS.reduce((sum,r)=>sum+relic(s,r.id),0);
 s.playtest.snapshots.push({
  run:s.rebirths+1,sec:Math.floor(s.clock),stage:s.stage,
  credits:Math.floor(s.credits),training:s.training,heroLevel:s.heroLevel,
  recruits:total(s),chests:s.chests,
  relicKinds:RELICS.filter(r=>relic(s,r.id)>0).length,relicTotal:count,
  manualBuys:s.runMetrics.manualPurchases,autoBuys:s.autoBuy.purchases,
  autoChestEnabled:s.autoChest.enabled,autoChestOpened:s.autoChest.opened,
  source:source==='offline'?'offline':'foreground'
 });
 if(s.playtest.snapshots.length>MAX_PLAYTEST_SNAPSHOTS)s.playtest.snapshots.shift();
}
function tick(s,seconds,source='foreground'){
 const duration=num(seconds,0,7200);
 let remaining=duration;
 while(remaining>0){
  const dt=Math.min(1,remaining);remaining-=dt;
  const previousMinute=Math.floor((s.clock+1e-8)/60);s.clock+=dt;
  for(const q of QUESTS){if(s.stage<q.unlock)continue;s.questClocks[q.id]+=dt;const cycles=Math.floor((s.questClocks[q.id]+1e-9)/q.interval);if(cycles){s.questClocks[q.id]-=cycles*q.interval;s.credits=Math.min(1e14,s.credits+cycles*questIncome(s,q));}}
  fight(s,dt);
  if(s.autoChest.enabled){
   s.autoChest.elapsed+=dt;
   if(s.autoChest.elapsed>=AUTO_CHEST_INTERVAL-1e-8){
    s.autoChest.elapsed=Math.max(0,s.autoChest.elapsed-AUTO_CHEST_INTERVAL);
    // Open earned boxes only, in the original FIFO depth order using
    // exactly the same drop rules and RNG as manual opening.
    if(s.chests>0){
     const batch=openChestBatch(s,20);
     s.autoChest.opened+=batch.results.length;
    }
   }
  }
  if(s.autoBuy.enabled){
   s.autoBuy.elapsed+=dt;
   if(s.autoBuy.elapsed>=AUTO_BUY_INTERVAL-1e-8){
    s.autoBuy.elapsed=Math.max(0,s.autoBuy.elapsed-AUTO_BUY_INTERVAL);
    autoPurchaseOnce(s);
   }
  }
  if(Math.floor((s.clock+1e-8)/60)>previousMinute)recordPlaytestMinute(s,source);
 }
 return s;
}
function recruit(s){
 const options=UNITS.filter(u=>s.best>=u.unlock);const cost=hireCost(s);if(s.credits<cost||total(s)>=MAX_ACTORS)return false;
 s.credits-=cost;
 // Choice-pool biased toward lower-population roles; unlocked types can join during any run.
 const weights=options.map(u=>1/(1+s.units[u.id]*.45));const sum=weights.reduce((a,b)=>a+b,0);let roll=rand(s)*sum;
 let chosen=options[options.length-1];for(let i=0;i<options.length;i++){roll-=weights[i];if(roll<=0){chosen=options[i];break;}}
 if(total(s)>=MAX_ACTORS)return false;
 s.units[chosen.id]++;s.actors.push({id:chosen.id,hp:actorMaxHp(s,chosen.id),revive:0,progress:0,cooldown:.6,shots:0});
 updateSquadHealth(s);note(s,chosen.name+' 소집');return chosen.id;
}
function train(s){const cost=trainCost(s);if(s.credits<cost)return false;
 const oldMax=s.actors.map(a=>actorMaxHp(s,a.id));s.credits-=cost;s.training++;
 s.actors.forEach((a,i)=>{if(a.revive===0)a.hp=Math.min(actorMaxHp(s,a.id),a.hp+actorMaxHp(s,a.id)-oldMax[i]);});
 updateSquadHealth(s);return true;}
function upgradeQuest(s,id){const q=QUESTS.find(x=>x.id===id);if(!q||s.stage<q.unlock||s.credits<questCost(s,q))return false;s.credits-=questCost(s,q);s.questLevels[id]++;return true;}
// A bounded multi-buy performs exactly the same cost and RNG sequence as repeated singles.
// No auto strategy is hidden here: the player still chooses what to invest in.
function purchase(s,kind,amount=1,id=null){
 const limit=[1,5,10].includes(amount)?amount:1;
 let count=0,spent=0;
 for(let i=0;i<limit;i++){
  const before=s.credits;
  const result=kind==='recruit'?recruit(s):kind==='train'?train(s):kind==='quest'?upgradeQuest(s,id):false;
  if(!result)break;
  count++;spent+=Math.max(0,before-s.credits);
 }
 s.runMetrics.manualPurchases+=count;s.runMetrics.manualSpent+=spent;
 if(count>1)note(s,(kind==='recruit'?'용병 소집':kind==='train'?'부대 훈련':'보급 의뢰')+' '+count+'회 연속 구매');
 return {count,spent};
}
// Explicit player-selected automation: only existing run-credit purchases.
// Never opens collectible chests, spends permanent cores, invests traits, or rebirths.
// Balanced: save up to four minutes of passive income for the selected upgrade;
// when the short-term target is unrealistic, buy small affordable upgrades in
// the other categories. The reserve mode preserves the original unlimited
// saving behavior; both always choose the highest unlocked supply grade.
function autoTarget(s){
 const mode=s.autoBuy.mode,flexible=mode==='adaptive';
 const order=mode==='balanced'||mode==='reserve'||flexible?['train','recruit','supply']:[mode];
 const start=mode==='balanced'||mode==='reserve'||flexible?s.autoBuy.cursor:0;
 let preferred=null;
 for(let i=0;i<order.length;i++){
  const kind=order[(start+i)%order.length];
  let candidate=null;
  if(kind==='recruit'){
   if(total(s)<MAX_ACTORS)candidate={kind,cost:hireCost(s),id:null};
  }else if(kind==='train'){
   const cost=trainCost(s);
   if(Number.isFinite(cost)&&cost<=1e14)candidate={kind,cost,id:null};
  }else if(kind==='supply'){
   // The selected supply target remains the highest unlocked grade, even
   // when unaffordable. Adaptive mode changes category, not quest grade.
   const q=QUESTS.slice().reverse().find(x=>s.stage>=x.unlock&&s.questLevels[x.id]<100&&Number.isFinite(questCost(s,x))&&questCost(s,x)<=1e14);
   if(q)candidate={kind,id:q.id,cost:questCost(s,q)};
  }
  if(!candidate)continue;
  if(mode==='balanced'){
   if(i===0){
    preferred=candidate;
    if(s.stage<30||s.credits>=candidate.cost)return candidate;
    const passivePerSecond=QUESTS.filter(q=>s.stage>=q.unlock)
     .reduce((income,q)=>income+questIncome(s,q)/q.interval,0);
    if(candidate.cost-s.credits<=passivePerSecond*BALANCED_SAVING_HORIZON_SECONDS)
     return candidate;
    continue;
   }
   // Spend at most 35% of the preferred target's cost on an alternative,
   // with no fall back to a lower grade within the supply category.
   if(s.credits>=candidate.cost&&candidate.cost<=preferred.cost*BALANCED_FALLBACK_BUDGET_RATIO)
    return candidate;
   continue;
  }
  if(!flexible)return candidate;
  if(!preferred)preferred=candidate;
  if(s.credits>=candidate.cost)return candidate;
 }
 // If nothing is affordable, save towards the original category.
 return preferred;
}
function setAutoChest(s,enabled){
 if(typeof enabled!=='boolean')return false;
 s.autoChest.enabled=enabled;
 s.autoChest.elapsed=0;
 note(s,'유물 상자 자동 개봉 '+(enabled?'작동':'중단')+' · 60초마다 최대 20개');
 return true;
}
function setAutoBuy(s,mode,enabled){
 if(!AUTO_MODES.includes(mode)||typeof enabled!=='boolean')return false;
 s.autoBuy.mode=mode;s.autoBuy.enabled=enabled;s.autoBuy.elapsed=0;
 s.autoBuy.cursor=0;
 note(s,'성장 자동 구매 '+(enabled?'작동':'중단')+' · '+mode);
 return true;
}
function autoPurchaseOnce(s){
 if(!s.autoBuy.enabled)return null;
 const target=autoTarget(s);
 if(!target||s.credits<target.cost)return null;
 const before=s.credits;
 const result=target.kind==='train'?train(s):target.kind==='recruit'?recruit(s):upgradeQuest(s,target.id);
 if(!result)return null;
 s.autoBuy.purchases++;
 s.autoBuy.spent+=Math.max(0,before-s.credits);
 if(s.autoBuy.mode==='adaptive'||s.autoBuy.mode==='balanced'){
  s.autoBuy.cursor=(['train','recruit','supply'].indexOf(target.kind)+1)%3;
 }else if(s.autoBuy.mode==='reserve')s.autoBuy.cursor=(s.autoBuy.cursor+1)%3;
 return {kind:target.kind,id:target.id,spent:before-s.credits};
}
function permanentBonuses(s){
 const noPermanent={...s,relics:{},traits:{command:0,supply:0},coreUpgrades:{valor:0,trade:0}};
 const q=QUESTS[0];
 return {
  attack:partyDps(s)/Math.max(.00001,partyDps(noPermanent)),
  hp:maxHp(s)/Math.max(.00001,maxHp(noPermanent)),
  income:questIncome(s,q)/Math.max(.00001,questIncome(noPermanent,q)),
  hireCost:hireCost(s)/Math.max(1,hireCost(noPermanent)),
  trainCost:trainCost(s)/Math.max(1,trainCost(noPermanent))
 };
}
function rememberRelic(s,result){
 s.relicHistory.push({id:result.id,duplicate:result.duplicate===true,
  stack:result.stack||0,credits:result.credits||0,stage:s.stage,depth:result.depth||0,run:s.rebirths+1});
 if(s.relicHistory.length>24)s.relicHistory.shift();
}
function rollRelic(s,depth,forceNew=false){
 // Shared roll for ordinary earned chests and the optional scouting network.
 // Source depth always determines the loot pool. Only network finds force a
 // missing kind when any remain; ordinary chest odds remain unchanged.
 const eligible=RELICS.filter(r=>relic(s,r.id)<r.cap&&
  (depth===0?r.unlockStage<=30:r.unlockStage<=depth));
 if(!eligible.length){
  const credits=300+50*s.best;s.credits=Math.min(1e14,s.credits+credits);
  const result={id:null,duplicate:true,credits,stack:0,depth};
  rememberRelic(s,result);note(s,(RELICS.every(r=>relic(s,r.id)>=r.cap)?'모든 유물 수집 상한':'이 상자 깊이의 유물 수집 상한')+' · '+credits+' 크레딧으로 교환');return result;
 }
 const missing=eligible.filter(r=>relic(s,r.id)===0);
 // First chest at a new depth guarantees a first discovery in that newly
 // reached tier, if there are still undiscovered relics from the milestone.
 const milestoneMissing=[15,25,30,40,45,50].includes(depth)?
  missing.filter(r=>r.unlockStage===depth):[];
 const pool=milestoneMissing.length?milestoneMissing:
  forceNew&&missing.length?missing:missing.length&&rand(s)<.7?missing:eligible;
 const found=pool[Math.floor(rand(s)*pool.length)];
 const duplicate=relic(s,found.id)>0;
 s.relics[found.id]=(s.relics[found.id]||0)+1;
 let bonus=0;
 if(duplicate){bonus=75*relic(s,'fortune');s.credits=Math.min(1e14,s.credits+bonus);}
 const result={id:found.id,duplicate,credits:bonus,stack:s.relics[found.id],depth};
 rememberRelic(s,result);
 note(s,(duplicate?'유물 중복 수집: ':'새 유물 발견! ')+found.name+(bonus?' · +'+bonus+' 크레딧':''));
 return result;
}
function openChest(s){
 if(s.chests<1)return null;
 const depth=s.chestDepths.length?s.chestDepths.shift():0;
 s.chests--;s.chestsOpened++;s.runMetrics.chestsOpened++;
 return rollRelic(s,depth,false);
}
// One deliberate collection action can reveal multiple rewards, but the
// exact sequence and relic odds match one-by-one opening. No auto chest claims.
function openChestBatch(s,count=20){
 const limit=[1,5,20].includes(count)?count:1;
 const size=Math.min(s.chests,limit);
 const before=permanentBonuses(s),results=[];
 for(let i=0;i<size;i++)results.push(openChest(s));
 const after=permanentBonuses(s);
 return {results,first:results.filter(x=>x.id&&!x.duplicate).length,
  duplicates:results.filter(x=>x.id&&x.duplicate).length,
  exchanges:results.filter(x=>!x.id).length,
  credits:results.reduce((sum,x)=>sum+x.credits,0),
  before,after};
}
function buyTrait(s,id){if(!['command','supply'].includes(id)||traitRemaining(s)<1||s.traits[id]>=10)return false;s.traits[id]++;return true;}
function buyCore(s,id){if(!['valor','trade'].includes(id)||s.cores<coreCost(s,id)||s.coreUpgrades[id]>=30)return false;const cost=coreCost(s,id);s.cores-=cost;s.coreSpent+=cost;s.coreUpgrades[id]++;return true;}
function rebirthRewards(s){
 const stage=integer(s.runBest,1,100000);
 // Current distance is the current enemy; stage 10 must be defeated first.
 if(stage<=10)return {base:0,recordBonus:0,total:0,newMilestones:[],pending:0,fraction:0};
 const cleared=stage-1,progress=num(s.coreReserve+s.coreProgress,0,1e9);
 const base=Math.floor(progress+1e-9);
 const claimed=integer(s.claimedBreakthroughDistance,0,100000);
 const newMilestones=BREAKTHROUGHS.filter(b=>b.stage>claimed&&b.stage<=cleared);
 const recordBonus=newMilestones.reduce((sum,b)=>sum+b.cores,0);
 return {base,recordBonus,total:base+recordBonus,newMilestones,
  pending:progress,fraction:Math.max(0,progress-base)};
}
// Deterministic planning estimate, not a prediction of time to reach a boss.
// Only enemy-clear core progress and first-clear milestones count; no invented
// future relic/credit/hero gains. Does not mutate the live expedition state.
function projectedRebirthRewards(s,targetCleared){
 const current=integer(s.runBest,1,100000)-1;
 if(!Number.isInteger(targetCleared)||targetCleared<=current||targetCleared>100000)return null;
 let progress=num(s.coreReserve+s.coreProgress,0,1e9);
 for(let stage=current+1;stage<=targetCleared;stage++)
  progress=Math.min(1e9,progress+coreProgressForClear(stage));
 const base=Math.floor(progress+1e-9);
 const claimed=integer(s.claimedBreakthroughDistance,0,100000);
 const recordBonus=BREAKTHROUGHS
  .filter(b=>b.stage>claimed&&b.stage<=targetCleared)
  .reduce((total,b)=>total+b.cores,0);
 const currentReturn=rebirthRewards(s).total;
 return {targetCleared,clearsRemaining:targetCleared-current,base,
  recordBonus,total:base+recordBonus,additional:base+recordBonus-currentReturn};
}
function rebirthGain(s){return rebirthRewards(s).total;}
function runOpeningSnapshot(s){
 return {attack:partyDps(s),hp:maxHp(s),income:questIncome(s,QUESTS[0])};
}
function rebirth(s){
 const reward=rebirthRewards(s),gain=reward.total;if(!gain)return false;
 const before=validOpening(s.runOpening);
 const previous={number:s.rebirths+1,cleared:s.runBest-1,
  duration:Math.floor(s.clock),cores:gain,earned:reward.base,firstClear:reward.recordBonus,
  relicKinds:RELICS.filter(r=>relic(s,r.id)>0).length,
  relicCopies:RELICS.reduce((sum,r)=>sum+relic(s,r.id),0),
  chests:s.chests,before,autoChestOpened:s.autoChest.opened,relicEffects:combatEffectReport(s.relicEffects)};
 const summary={duration:Math.floor(s.clock),best:s.runBest,kills:s.runKills,cores:gain,
  manualPurchases:s.runMetrics.manualPurchases,autoPurchases:s.autoBuy.purchases,
  chestsOpened:s.runMetrics.chestsOpened,
  autoChestOpened:s.autoChest.opened,milestones:{...s.runMilestones},
  relicEffects:combatEffectReport(s.relicEffects)};
 const history=[...(s.runHistory||[]),summary].slice(-5);
 const keep={claimedBreakthroughDistance:Math.max(s.claimedBreakthroughDistance,s.runBest-1),
  coreReserve:Math.min(1,Math.max(0,reward.fraction)),chestDepths:s.chestDepths.slice(),runHistory:history,relicHistory:s.relicHistory.map(x=>({...x})),playtest:{snapshots:s.playtest.snapshots.map(x=>({...x})),offlineSeconds:s.playtest.offlineSeconds},seed:s.seed,heroLevel:s.heroLevel,heroXp:s.heroXp,traits:{...s.traits},relics:{...s.relics},cores:s.cores+gain,coreSpent:s.coreSpent,coreUpgrades:{...s.coreUpgrades},rebirths:s.rebirths+1,best:s.best,chests:s.chests,chestsOpened:s.chestsOpened,kills:s.kills,autoBuy:{...initialAutoBuy(),enabled:s.autoBuy.enabled,mode:s.autoBuy.mode},autoChest:{...initialAutoChest(),enabled:s.autoChest.enabled}};
 Object.assign(s,newState(s.lastSaved),keep);s.enemyHp=enemyMax(1);
 s.actors.forEach(a=>a.hp=actorMaxHp(s,a.id));updateSquadHealth(s);
 s.runOpening=runOpeningSnapshot(s);
 s.latestReturn={...previous,after:{...s.runOpening}};
 note(s,'탐사 귀환 · 코어 '+gain+'개 획득'+(reward.recordBonus?' (최초 기록 +'+reward.recordBonus+')':'')+'. 영구 유물/레벨 유지');
 return gain;
}
function offline(s,now=Date.now()){
 const elapsed=Math.min(7200,Math.max(0,(now-num(s.lastSaved,0,now))/1000));
 if(elapsed>=1){tick(s,Math.floor(elapsed),'offline');s.playtest.offlineSeconds+=Math.floor(elapsed);}
 s.lastSaved=now;return Math.floor(elapsed);
}
return {VERSION,SAVE_KEY,MAX_ACTORS,MAX_PLAYTEST_SNAPSHOTS,MILESTONE_STAGES,AUTO_BUY_INTERVAL,AUTO_CHEST_INTERVAL,BALANCED_SAVING_HORIZON_SECONDS,BALANCED_FALLBACK_BUDGET_RATIO,AUTO_MODES,BREAKTHROUGHS,CORE_PROGRESS_PER_CLEAR,CORE_PROGRESS_GROWTH,coreProgressForClear,UNITS,QUESTS,RELICS,newState,normalize,tick,offline,recruit,train,upgradeQuest,purchase,setAutoBuy,setAutoChest,autoTarget,autoPurchaseOnce,permanentBonuses,openChest,openChestBatch,buyTrait,buyCore,rebirth,rebirthGain,rebirthRewards,projectedRebirthRewards,traitRemaining,enemyMax,maxHp,actorMaxHp,partyDps,healDps,questIncome,hireCost,trainCost,questCost,coreCost,xpNeeded,relic,isBoss,isElite};
});
