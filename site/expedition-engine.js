/* 네온 방치단: 독립 용병단 원형 — 기존 game.js 및 저장 데이터와 무관한 엔진.
   Node tests + browser share these rules. Original mechanics, names and assets are not imported. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ExpeditionEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=1;
const MAX_ACTORS=120; // protect save size and two-hour offline ticks
const AUTO_BUY_INTERVAL=4; // seconds between optional single-step purchases
const AUTO_MODES=['balanced','train','recruit','supply'];
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
 {id:'ember',name:'용광로 문장',desc:'용병단 피해량이 수집 수마다 8% 증가',cap:5},
 {id:'shield',name:'합금 배지',desc:'용병단 체력이 수집 수마다 10% 증가',cap:5},
 {id:'income',name:'교역 인장',desc:'자동 보급 수익이 수집 수마다 12% 증가',cap:5},
 {id:'swift',name:'진군 북',desc:'용병단 피해량이 수집 수마다 5% 증가',cap:5},
 {id:'medkit',name:'재생 결속선',desc:'정비사의 회복력이 수집 수마다 18% 증가',cap:4},
 {id:'boss',name:'균열 렌즈',desc:'지휘급 적에게 주는 피해가 수집 수마다 14% 증가',cap:5},
 {id:'bounty',name:'현상금 표식',desc:'전투 크레딧 보상이 수집 수마다 12% 증가',cap:5},
 {id:'guard',name:'호위 계약서',desc:'방벽병 체력이 수집 수마다 20% 증가',cap:4},
 {id:'archer',name:'초점 조준기',desc:'척후사수의 피해량이 수집 수마다 15% 증가',cap:4},
 {id:'scout',name:'탐사 일지',desc:'지휘관 전투 경험치가 수집 수마다 15% 증가',cap:4},
 {id:'fortune',name:'중복 해체권',desc:'중복 유물 발견 시 수집 수마다 추가 크레딧 획득',cap:3},
 {id:'relay',name:'작전 통신기',desc:'전체 병종의 피해량이 수집 수마다 5% 증가',cap:5}
];
const num=(n,min=0,max=1e14)=>Number.isFinite(n)?Math.max(min,Math.min(max,n)):min;
const integer=(n,min=0,max=100000)=>Math.floor(num(n,min,max));
const total=s=>UNITS.reduce((n,u)=>n+s.units[u.id],0);
const emptyContribution=()=>({damage:{guard:0,ranger:0,medic:0},healing:{guard:0,ranger:0,medic:0},taken:{guard:0,ranger:0,medic:0},falls:{guard:0,ranger:0,medic:0},attacks:{guard:0,ranger:0,medic:0}});
const initialAutoBuy=()=>({enabled:false,mode:'balanced',elapsed:0,cursor:0,purchases:0,spent:0});

const isBoss=stage=>stage%10===0;
const isElite=stage=>stage%5===0;
const relic=(s,id)=>integer(s.relics[id],0,RELICS.find(x=>x.id===id)?.cap||0);
const newState=(now=Date.now())=>({
 version:VERSION,lastSaved:now,seed:123456789,clock:0,credits:65,stage:1,best:1,runBest:1,
 units:{guard:2,ranger:0,medic:0},training:0,questLevels:{dispatch:0,salvage:0,contract:0},
 questClocks:{dispatch:0,salvage:0,contract:0},enemyHp:13,squadHp:96,respawn:0,
 actors:[{id:'guard',hp:48,revive:0,progress:0,cooldown:.6},{id:'guard',hp:48,revive:0,progress:0,cooldown:1.2}],battleEvent:null,battleCueSeq:0,
 kills:0,runKills:0,heroLevel:1,heroXp:0,traitPoints:0,traits:{command:0,supply:0},
 relics:{},chests:0,chestsOpened:0,cores:0,coreSpent:0,coreUpgrades:{valor:0,trade:0},
 rebirths:0,contribution:emptyContribution(),autoBuy:initialAutoBuy(),events:['첫 번째 탐사를 시작했어.']
});
function normalize(raw,now=Date.now()){
 const base=newState(now);if(!raw||raw.version!==VERSION||typeof raw!=='object')return base;
 const s={...base};
 for(const k of ['credits','stage','best','runBest','training','enemyHp','squadHp','respawn','kills','runKills','heroLevel','heroXp','traitPoints','chests','chestsOpened','cores','coreSpent','rebirths','clock','lastSaved','seed','battleCueSeq'])s[k]=num(raw[k],0,k==='credits'?1e14:1e9);
 for(const k of ['stage','best','runBest','heroLevel'])s[k]=integer(s[k],1,100000);
 for(const k of ['training','kills','runKills','traitPoints','chests','chestsOpened','cores','coreSpent','rebirths','seed'])s[k]=integer(s[k]);
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
   cooldown:a?num(a.cooldown,0,3):attackInterval(id)*(.55+(i%3)*.2)};
 });
 s.battleEvent=raw.battleEvent&&typeof raw.battleEvent==='object'
  ?{seq:integer(raw.battleEvent.seq),type:['hit','heal','fallen','returned','clear','rally'].includes(raw.battleEvent.type)?raw.battleEvent.type:'hit',
     id:UNITS.some(u=>u.id===raw.battleEvent.id)?raw.battleEvent.id:'guard',value:num(raw.battleEvent.value,0,1e14)}:null;
 s.battleCueSeq=integer(raw.battleCueSeq);
 updateSquadHealth(s);
 s.enemyHp=s.enemyHp||enemyMax(s.stage);
 return s;
}
function rand(s){let x=(s.seed>>>0)||123456789;x^=x<<13;x^=x>>>17;x^=x<<5;s.seed=x>>>0;return s.seed/4294967296;}
function note(s,m){s.events.push(m);if(s.events.length>8)s.events.shift();}
function enemyMax(stage){return Math.min(1e13,Math.round((isBoss(stage)?3.8:isElite(stage)?2:1)*13*Math.pow(1.235,Math.min(stage-1,100))));}
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
function partyDps(s){return UNITS.reduce((sum,u)=>sum+s.units[u.id]*u.dps*(u.id==='ranger'?1+.15*relic(s,'archer'):1),0)*(1+.23*s.training)*(1+.08*relic(s,'ember')+.05*relic(s,'swift')+.05*relic(s,'relay'))*(1+.06*s.traits.command)*(1+.08*s.coreUpgrades.valor);}
function healDps(s){return s.units.medic*2.7*(1+.18*relic(s,'medkit'))*(1+.08*s.training);}
function questIncome(s,q){return q.income*(1+1.1*s.questLevels[q.id])*(1+.12*relic(s,'income'))*(1+.08*s.traits.supply)*(1+.09*s.coreUpgrades.trade);}
function hireCost(s){return Math.round(25*Math.pow(1.22,Math.max(0,total(s)-2)));}
function trainCost(s){return Math.round(46*Math.pow(1.51,s.training));}
function questCost(s,q){return Math.round(q.upgradeCost*Math.pow(1.63,s.questLevels[q.id]));}
function coreCost(s,id){return 1+Math.floor(s.coreUpgrades[id]/2);}
function traitRemaining(s){return Math.max(0,s.heroLevel-1-s.traits.command-s.traits.supply);}
function xpNeeded(level){return Math.round(30+35*Math.pow(level,1.28));}
function heroXp(s,amount){
 s.heroXp+=amount*(1+.15*relic(s,'scout'));
 while(s.heroXp>=xpNeeded(s.heroLevel)&&s.heroLevel<500){s.heroXp-=xpNeeded(s.heroLevel);s.heroLevel++;note(s,'지휘관 레벨 '+s.heroLevel+' · 특성 포인트 획득');}
}
function victory(s){
 const cleared=s.stage;
 const reward=Math.round((8+cleared*2.6)*Math.pow(1.105,Math.min(cleared,110))*(1+.12*relic(s,'bounty')));
 s.credits=Math.min(1e14,s.credits+reward);s.kills++;s.runKills++;
 heroXp(s,5+cleared*.7+(isBoss(cleared)?20:0));
 if(isElite(cleared)){s.chests++;note(s,(isBoss(cleared)?'지휘급 목표 격파!':'정예 목표 격파!')+' 보급 상자 1개 확보');}
 s.stage++;s.runBest=Math.max(s.runBest,s.stage);s.best=Math.max(s.best,s.stage);
 s.enemyHp=enemyMax(s.stage);
 // New wave: units regroup behind the front line, survivors recover a little.
 for(const a of s.actors){a.progress=Math.max(0,a.progress-.75);if(a.revive===0)a.hp=Math.min(actorMaxHp(s,a.id),a.hp+actorMaxHp(s,a.id)*.15);}
 updateSquadHealth(s);battleCue(s,'clear','guard',cleared);
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
 const boss=isBoss(s.stage);
 const cueBeforeAttacks=s.battleCueSeq;
 let damage=0;
 for(const a of living){
  a.cooldown-=dt;
  if(a.progress<attackRange(a.id)||a.cooldown>0)continue;
  const u=UNITS.find(u=>u.id===a.id);
  const multiplier=(1+.23*s.training)*(1+.08*relic(s,'ember')+.05*relic(s,'swift')+.05*relic(s,'relay'))*
   (1+.06*s.traits.command)*(1+.08*s.coreUpgrades.valor)*
   (a.id==='ranger'?1+.15*relic(s,'archer'):1)*(boss?1+.14*relic(s,'boss'):1);
  const amount=u.dps*attackInterval(a.id)*multiplier;
  // Exclude overkill from useful damage statistics; retain original combat damage.
  const dealt=Math.min(Math.max(0,s.enemyHp-damage),amount);
  s.contribution.damage[a.id]+=dealt;
  s.contribution.attacks[a.id]++;
  damage+=amount;
  a.cooldown+=attackInterval(a.id);battleCue(s,'hit',a.id,amount);
 }
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
 const frontline=living.filter(a=>a.progress>.25).sort((a,b)=>
  (a.id==='guard'?0:a.id==='ranger'?1:2)-(b.id==='guard'?0:b.id==='ranger'?1:2)||
  b.progress-a.progress)[0];
 if(frontline){
  const taken=Math.min(frontline.hp,enemyDps*dt);
  s.contribution.taken[frontline.id]+=taken;
  frontline.hp=Math.max(0,frontline.hp-taken);
  if(frontline.hp<=0){s.contribution.falls[frontline.id]++;frontline.revive=6;frontline.progress=0;frontline.cooldown=.5;
   battleCue(s,'fallen',frontline.id);note(s,(UNITS.find(u=>u.id===frontline.id)||UNITS[0]).name+' 후퇴 · 재합류 대기');}
 }
 updateSquadHealth(s);
 if(s.squadHp<=0){s.enemyHp=enemyMax(s.stage);battleCue(s,'rally','guard');note(s,'부대 전원 후퇴 · 적 전선 재정비');}
}
function tick(s,seconds){
 const duration=num(seconds,0,7200);
 let remaining=duration;
 while(remaining>0){
  const dt=Math.min(1,remaining);remaining-=dt;s.clock+=dt;
  for(const q of QUESTS){if(s.stage<q.unlock)continue;s.questClocks[q.id]+=dt;const cycles=Math.floor((s.questClocks[q.id]+1e-9)/q.interval);if(cycles){s.questClocks[q.id]-=cycles*q.interval;s.credits=Math.min(1e14,s.credits+cycles*questIncome(s,q));}}
  fight(s,dt);
  if(s.autoBuy.enabled){
   s.autoBuy.elapsed+=dt;
   if(s.autoBuy.elapsed>=AUTO_BUY_INTERVAL-1e-8){
    s.autoBuy.elapsed=Math.max(0,s.autoBuy.elapsed-AUTO_BUY_INTERVAL);
    autoPurchaseOnce(s);
   }
  }
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
 s.units[chosen.id]++;s.actors.push({id:chosen.id,hp:actorMaxHp(s,chosen.id),revive:0,progress:0,cooldown:.6});
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
 if(count>1)note(s,(kind==='recruit'?'용병 소집':kind==='train'?'부대 훈련':'보급 의뢰')+' '+count+'회 연속 구매');
 return {count,spent};
}
// Explicit player-selected automation: only existing run-credit purchases.
// Never opens collectible chests, spends permanent cores, invests traits, or rebirths.
// In balanced mode, one successful transaction moves to the next category.
// An unaffordable chosen upgrade is saved for, not bypassed by cheaper purchases.
function autoTarget(s){
 const mode=s.autoBuy.mode;
 const order=mode==='balanced'?['train','recruit','supply']: [mode];
 const start=mode==='balanced'?s.autoBuy.cursor:0;
 for(let i=0;i<order.length;i++){
  const kind=order[(start+i)%order.length];
  if(kind==='recruit'){
   if(total(s)<MAX_ACTORS)return {kind,cost:hireCost(s),id:null};
  }else if(kind==='train'){
   const cost=trainCost(s);
   if(Number.isFinite(cost)&&cost<=1e14)return {kind,cost,id:null};
  }else if(kind==='supply'){
   // Higher-unlock contracts are higher grade, even if cheaper contracts
   // are affordable. Preserve savings for the selected grade.
   const q=QUESTS.slice().reverse().find(x=>s.stage>=x.unlock&&s.questLevels[x.id]<100&&Number.isFinite(questCost(s,x))&&questCost(s,x)<=1e14);
   if(q)return {kind,id:q.id,cost:questCost(s,q)};
  }
 }
 return null;
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
 if(s.autoBuy.mode==='balanced')s.autoBuy.cursor=(s.autoBuy.cursor+1)%3;
 return {kind:target.kind,id:target.id,spent:before-s.credits};
}
function permanentBonuses(s){
 const noPermanent={...s,relics:{},traits:{command:0,supply:0},coreUpgrades:{valor:0,trade:0}};
 const q=QUESTS[0];
 return {
  attack:partyDps(s)/Math.max(.00001,partyDps(noPermanent)),
  hp:maxHp(s)/Math.max(.00001,maxHp(noPermanent)),
  income:questIncome(s,q)/Math.max(.00001,questIncome(noPermanent,q))
 };
}
function openChest(s){
 if(s.chests<1)return null;s.chests--;s.chestsOpened++;
 const eligible=RELICS.filter(r=>relic(s,r.id)<r.cap);
 if(!eligible.length){const credits=300+50*s.best;s.credits+=credits;note(s,'유물 수집 상한 · '+credits+' 크레딧으로 교환');return {id:null,duplicate:true,credits};}
 const missing=eligible.filter(r=>relic(s,r.id)===0);
 const pool=missing.length&&rand(s)<.7?missing:eligible;
 const found=pool[Math.floor(rand(s)*pool.length)];
 const duplicate=relic(s,found.id)>0;
 s.relics[found.id]=(s.relics[found.id]||0)+1;
 let bonus=0;
 if(duplicate){bonus=75*relic(s,'fortune');s.credits+=bonus;}
 note(s,(duplicate?'유물 중복 수집: ':'새 유물 발견! ')+found.name+(bonus?' · +'+bonus+' 크레딧':''));
 return {id:found.id,duplicate,credits:bonus};
}
function buyTrait(s,id){if(!['command','supply'].includes(id)||traitRemaining(s)<1||s.traits[id]>=10)return false;s.traits[id]++;return true;}
function buyCore(s,id){if(!['valor','trade'].includes(id)||s.cores<coreCost(s,id)||s.coreUpgrades[id]>=30)return false;const cost=coreCost(s,id);s.cores-=cost;s.coreSpent+=cost;s.coreUpgrades[id]++;return true;}
function rebirthGain(s){return s.runBest<10?0:Math.max(1,Math.floor(Math.sqrt((s.runBest-5)/5)));}
function rebirth(s){
 const gain=rebirthGain(s);if(!gain)return false;
 const keep={seed:s.seed,heroLevel:s.heroLevel,heroXp:s.heroXp,traits:{...s.traits},relics:{...s.relics},cores:s.cores+gain,coreSpent:s.coreSpent,coreUpgrades:{...s.coreUpgrades},rebirths:s.rebirths+1,best:s.best,chests:s.chests,chestsOpened:s.chestsOpened,kills:s.kills,autoBuy:{...initialAutoBuy(),enabled:s.autoBuy.enabled,mode:s.autoBuy.mode}};
 Object.assign(s,newState(s.lastSaved),keep);s.enemyHp=enemyMax(1);
 s.actors.forEach(a=>a.hp=actorMaxHp(s,a.id));updateSquadHealth(s);
 note(s,'탐사 귀환 · 코어 '+gain+'개 획득. 영구 유물/레벨 유지');
 return gain;
}
function offline(s,now=Date.now()){
 const elapsed=Math.min(7200,Math.max(0,(now-num(s.lastSaved,0,now))/1000));
 if(elapsed>=1)tick(s,Math.floor(elapsed));
 s.lastSaved=now;return Math.floor(elapsed);
}
return {VERSION,SAVE_KEY,MAX_ACTORS,AUTO_BUY_INTERVAL,AUTO_MODES,UNITS,QUESTS,RELICS,newState,normalize,tick,offline,recruit,train,upgradeQuest,purchase,setAutoBuy,autoTarget,autoPurchaseOnce,permanentBonuses,openChest,buyTrait,buyCore,rebirth,rebirthGain,traitRemaining,enemyMax,maxHp,actorMaxHp,partyDps,healDps,questIncome,hireCost,trainCost,questCost,coreCost,xpNeeded,relic,isBoss,isElite};
});
