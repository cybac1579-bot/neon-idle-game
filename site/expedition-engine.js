/* 네온 방치단: 독립 용병단 원형 — 기존 game.js 및 저장 데이터와 무관한 엔진.
   Node tests + browser share these rules. Original mechanics, names and assets are not imported. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ExpeditionEngine=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VERSION=1;
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
const isBoss=stage=>stage%10===0;
const isElite=stage=>stage%5===0;
const relic=(s,id)=>integer(s.relics[id],0,RELICS.find(x=>x.id===id)?.cap||0);
const newState=(now=Date.now())=>({
 version:VERSION,lastSaved:now,seed:123456789,clock:0,credits:65,stage:1,best:1,runBest:1,
 units:{guard:2,ranger:0,medic:0},training:0,questLevels:{dispatch:0,salvage:0,contract:0},
 questClocks:{dispatch:0,salvage:0,contract:0},enemyHp:0,squadHp:96,respawn:0,
 kills:0,runKills:0,heroLevel:1,heroXp:0,traitPoints:0,traits:{command:0,supply:0},
 relics:{},chests:0,chestsOpened:0,cores:0,coreSpent:0,coreUpgrades:{valor:0,trade:0},
 rebirths:0,events:['첫 번째 탐사를 시작했어.']
});
function normalize(raw,now=Date.now()){
 const base=newState(now);if(!raw||raw.version!==VERSION||typeof raw!=='object')return base;
 const s={...base};
 for(const k of ['credits','stage','best','runBest','training','enemyHp','squadHp','respawn','kills','runKills','heroLevel','heroXp','traitPoints','chests','chestsOpened','cores','coreSpent','rebirths','clock','lastSaved','seed'])s[k]=num(raw[k],0,k==='credits'?1e14:1e9);
 for(const k of ['stage','best','runBest','heroLevel'])s[k]=integer(s[k],1,100000);
 for(const k of ['training','kills','runKills','traitPoints','chests','chestsOpened','cores','coreSpent','rebirths','seed'])s[k]=integer(s[k]);
 s.lastSaved=num(raw.lastSaved,0,now)||now;s.best=Math.max(s.stage,s.best);s.runBest=Math.max(s.stage,s.runBest);
 for(const kind of ['units','questLevels','questClocks','traits','relics','coreUpgrades'])s[kind]={};
 UNITS.forEach(u=>s.units[u.id]=integer(raw.units?.[u.id],0,500));
 if(!total(s))s.units.guard=2;
 QUESTS.forEach(q=>{s.questLevels[q.id]=integer(raw.questLevels?.[q.id],0,100);s.questClocks[q.id]=num(raw.questClocks?.[q.id],0,q.interval);});
 for(const id of ['command','supply'])s.traits[id]=integer(raw.traits?.[id],0,10);
 RELICS.forEach(r=>s.relics[r.id]=integer(raw.relics?.[r.id],0,r.cap));
 for(const id of ['valor','trade'])s.coreUpgrades[id]=integer(raw.coreUpgrades?.[id],0,30);
 s.events=Array.isArray(raw.events)?raw.events.filter(x=>typeof x==='string').slice(-8):base.events.slice();
 s.squadHp=Math.min(s.squadHp,maxHp(s));if(s.squadHp===0&&s.respawn===0)s.respawn=4;
 s.enemyHp=s.enemyHp||enemyMax(s.stage);
 return s;
}
function rand(s){let x=(s.seed>>>0)||123456789;x^=x<<13;x^=x>>>17;x^=x<<5;s.seed=x>>>0;return s.seed/4294967296;}
function note(s,m){s.events.push(m);if(s.events.length>8)s.events.shift();}
function enemyMax(stage){return Math.min(1e13,Math.round((isBoss(stage)?3.8:isElite(stage)?2:1)*13*Math.pow(1.235,Math.min(stage-1,100))));}
function maxHp(s){return Math.max(1,UNITS.reduce((sum,u)=>sum+s.units[u.id]*u.hp*(u.id==='guard'?1+.20*relic(s,'guard'):1),0)*(1+.16*s.training)*(1+.10*relic(s,'shield'))*(1+.06*s.coreUpgrades.valor));}
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
 s.squadHp=Math.min(maxHp(s),s.squadHp+Math.max(4,maxHp(s)*.15));
}
function fight(s,dt){
 if(s.respawn>0){s.respawn=Math.max(0,s.respawn-dt);if(s.respawn===0){s.squadHp=maxHp(s);s.enemyHp=enemyMax(s.stage);note(s,'부대 재정비 완료');}return;}
 const damage=partyDps(s)*(isBoss(s.stage)?1+.14*relic(s,'boss'):1)*dt;
 s.enemyHp-=damage;
 if(s.enemyHp<=0){victory(s);return;}
 const enemyDps=.4*Math.pow(1.17,Math.min(s.stage-1,100))*(isBoss(s.stage)?2.2:isElite(s.stage)?1.4:1);
 s.squadHp=Math.min(maxHp(s),s.squadHp+(healDps(s)-enemyDps)*dt);
 if(s.squadHp<=0){s.squadHp=0;s.respawn=5;note(s,'부대 후퇴 · 5초 후 재정비');}
}
function tick(s,seconds){
 const duration=num(seconds,0,7200);
 let remaining=duration;
 while(remaining>0){
  const dt=Math.min(1,remaining);remaining-=dt;s.clock+=dt;
  for(const q of QUESTS){if(s.stage<q.unlock)continue;s.questClocks[q.id]+=dt;const cycles=Math.floor((s.questClocks[q.id]+1e-9)/q.interval);if(cycles){s.questClocks[q.id]-=cycles*q.interval;s.credits=Math.min(1e14,s.credits+cycles*questIncome(s,q));}}
  fight(s,dt);
 }
 return s;
}
function recruit(s){
 const options=UNITS.filter(u=>s.best>=u.unlock);const cost=hireCost(s);if(s.credits<cost)return false;
 s.credits-=cost;
 // Choice-pool biased toward lower-population roles; unlocked types can join during any run.
 const weights=options.map(u=>1/(1+s.units[u.id]*.45));const sum=weights.reduce((a,b)=>a+b,0);let roll=rand(s)*sum;
 let chosen=options[options.length-1];for(let i=0;i<options.length;i++){roll-=weights[i];if(roll<=0){chosen=options[i];break;}}
 s.units[chosen.id]++;s.squadHp=Math.min(maxHp(s),s.squadHp+chosen.hp);
 note(s,chosen.name+' 소집');return chosen.id;
}
function train(s){const cost=trainCost(s);if(s.credits<cost)return false;s.credits-=cost;s.training++;s.squadHp=Math.min(maxHp(s),s.squadHp+18);return true;}
function upgradeQuest(s,id){const q=QUESTS.find(x=>x.id===id);if(!q||s.best<q.unlock||s.credits<questCost(s,q))return false;s.credits-=questCost(s,q);s.questLevels[id]++;return true;}
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
 const keep={seed:s.seed,heroLevel:s.heroLevel,heroXp:s.heroXp,traits:{...s.traits},relics:{...s.relics},cores:s.cores+gain,coreSpent:s.coreSpent,coreUpgrades:{...s.coreUpgrades},rebirths:s.rebirths+1,best:s.best,chests:s.chests,chestsOpened:s.chestsOpened,kills:s.kills};
 Object.assign(s,newState(s.lastSaved),keep);s.enemyHp=enemyMax(1);s.squadHp=maxHp(s);
 note(s,'탐사 귀환 · 코어 '+gain+'개 획득. 영구 유물/레벨 유지');
 return gain;
}
function offline(s,now=Date.now()){
 const elapsed=Math.min(7200,Math.max(0,(now-num(s.lastSaved,0,now))/1000));
 if(elapsed>=1)tick(s,Math.floor(elapsed));
 s.lastSaved=now;return Math.floor(elapsed);
}
return {VERSION,SAVE_KEY,UNITS,QUESTS,RELICS,newState,normalize,tick,offline,recruit,train,upgradeQuest,openChest,buyTrait,buyCore,rebirth,rebirthGain,traitRemaining,enemyMax,maxHp,partyDps,healDps,questIncome,hireCost,trainCost,questCost,coreCost,xpNeeded,relic,isBoss,isElite};
});
