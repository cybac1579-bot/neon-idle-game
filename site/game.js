'use strict';
const KEY='neon_rework_07', $=id=>document.getElementById(id);
const initial=()=>({credits:30,cacheCredits:0,cacheClock:0,questClocks:[0,0,0],questCredits:[0,0,0],energy:0,stage:1,best:1,hp:0,kills:0,atk:0,spd:0,gen:0,amp:0,relay:0,forge:0,reactor:0,rebirths:0,cores:0,totalCores:0,corePower:0,coreEconomy:0,autoLevel:0,autoBuy:false,autoClaimQuests:false,autoClaimClock:0,autoRebirth:false,phaseFocus:false,allocation:"balanced",frontlineSupport:null,breakthroughReward:null,phases:0,phaseTokens:0,phaseFlux:0,phaseEngine:0,knownUnlocks:[],heroLevel:1,heroXp:0,traitPointsEarned:0,traitPointsSpent:0,traits:{},weapon:null,skillsOwned:[],skillsEquipped:[],skillsInherited:[],skillLevels:{},skillXp:{},skillClock:0,skillBuffTraining:0,skillBuffCapacitor:0,skillChoiceUsed:false,chainPulses:0,chainPulseClock:0,lastSaved:Date.now()});
let s=initial(),batchPurchaseCount=1,enemyHp=0,enemyMax=0,attackClock=0,enemyClock=0,saveClock=0,resetArmed=false,logText='첫 장벽을 향해 성장해 봐.',skillNotice='',skillNoticeTime=0,rewardNotice='',rewardNoticeTime=0;
function showSkillNotice(message){skillNotice=message;skillNoticeTime=2.2;}
function showRewardNotice(message){rewardNotice=message;rewardNoticeTime=4;}
function safeNumber(v,min=0,max=1e100){return Number.isFinite(v)?Math.max(min,Math.min(max,v)):min}
let pendingOffline=0,hiddenAt=null;
function load(){try{const v=JSON.parse(localStorage.getItem(KEY));if(!v||typeof v!=='object')return;s={...initial(),...v};for(const k of ['credits','cacheCredits','energy','cores','totalCores','phaseTokens','phaseFlux'])s[k]=safeNumber(s[k]);for(const k of ['stage','best','atk','spd','gen','amp','relay','forge','reactor','rebirths','corePower','coreEconomy','autoLevel','phases','phaseEngine','kills'])s[k]=Math.floor(safeNumber(s[k],k==='stage'||k==='best'?1:0,1e7));s.cacheClock=safeNumber(s.cacheClock,0,60);s.questClocks=Array.from({length:3},(_,i)=>safeNumber(Array.isArray(v.questClocks)?v.questClocks[i]:i===1?v.cacheClock:0,0,[6,30,120][i]));s.questCredits=Array.from({length:3},(_,i)=>safeNumber(Array.isArray(v.questCredits)?v.questCredits[i]:i===1?v.cacheCredits:0));s.cacheCredits=0;s.cacheClock=0;s.heroLevel=Math.max(1,Math.floor(safeNumber(s.heroLevel,1,100000)));s.heroXp=safeNumber(s.heroXp);s.traitPointsEarned=Math.max(s.heroLevel-1,Math.floor(safeNumber(s.traitPointsEarned)));normalizeTraits();normalizeGearSkills();s.knownUnlocks=Array.isArray(s.knownUnlocks)?s.knownUnlocks.filter(x=>typeof x==='string'):[];s.autoLevel=Math.min(5,s.autoLevel);s.autoBuy=!!s.autoBuy;s.autoClaimQuests=!!s.autoClaimQuests;s.autoClaimClock=safeNumber(s.autoClaimClock,0,30);s.autoRebirth=!!s.autoRebirth;s.phaseFocus=!!s.phaseFocus;s.allocation=['balanced','assault','supply'].includes(s.allocation)?s.allocation:'balanced';s.frontlineSupport=['firepower','industry','training'].includes(s.frontlineSupport)?s.frontlineSupport:null;s.breakthroughReward=['weapon','skill','credits'].includes(s.breakthroughReward)?s.breakthroughReward:null;const savedAt=Number.isFinite(v.lastSaved)&&v.lastSaved>0?v.lastSaved:Date.now();pendingOffline=Math.min(7200,Math.max(0,(Date.now()-savedAt)/1000));enemyHp=safeNumber(s.savedEnemyHp,0);attackClock=safeNumber(s.savedAttackClock,0,0.85);logText='저장 데이터 복원 완료';}catch(e){s=initial();pendingOffline=0;logText='저장 데이터를 읽지 못해 새 게임으로 시작했어.'}}

// 12차 임시 특성: 사용자 승인 하에 테스트용. 미구현 스킬/장비 특성은 투자 차단.
const TRAITS=[
 ['precision','정밀 타격',5,'기본 공격 피해 +4%/단계'],
 ['double','연속 사격',5,'추가 타격 확률 +3%p/단계'],
 ['haste','스킬 가속',5,'장착 스킬 재사용 대기시간 -3%/단계'],
 ['boss','약점 분석',3,'10단계마다 등장하는 보스 피해 +8%/단계'],
 ['bounty','현장 수당',5,'처치 크레딧 +5%/단계'],
 ['training','숙련 훈련',5,'처치 경험치 +5%/단계'],
 ['loot','장비 탐색',5,'무기 드롭 확률 상대 +6%/단계'],
 ['energy','에너지 최적화',5,'에너지 생산 +4%/단계'],
 ['inherit','계승 확장',1,'LV.60부터 스킬 계승 슬롯 +1 (최대 2칸)',60],
 ['restart','재기동 지원',3,'재구성 직후 시작 크레딧 +20%/단계']
];
// 1차 플레이 검증: 초기 4종 + STAGE65 보상 전력 순환. 기존 무기 1칸과 스킬 슬롯 최대 5칸 유지.
const SKILLS={overload:['과부하 사격','기본 공격 3배 피해',9],chain:['연쇄 방전','1초 간격 3회 방전 · 적 처치 후 다음 적까지 이어짐',6],bountySkill:['현상금 추적','발동 후 12초 동안 처치 크레딧 +25%',20],trainingSkill:['전술 훈련','발동 후 12초 동안 주인공 처치 경험치 ×2',14],capacitor:['전력 순환','18초마다 10초간 에너지 생산 ×2 · 축적 에너지에 따라 전투력 증가',18]};
const WEAPON_TIERS=[['일반',1.12],['희귀',1.28],['영웅',1.55]];
function normalizeGearSkills(){
 s.weapon=s.weapon&&typeof s.weapon==='object'&&Number.isInteger(s.weapon.tier)&&s.weapon.tier>=0&&s.weapon.tier<3&&Number.isInteger(s.weapon.stage)&&s.weapon.stage>=1?{tier:s.weapon.tier,stage:Math.min(10000,s.weapon.stage)}:null;
 // 저장 데이터의 중첩 스킬 맵이 배열·문자열·null이어도 복원을 중단하지 않는다.
 for(const key of ['skillLevels','skillXp'])if(!s[key]||typeof s[key]!=='object'||Array.isArray(s[key]))s[key]={};
 // 기존 가속 스킬은 현상금 추적 스킬로 변환해 보유/계승을 유지한다.
 for(const key of ['skillsOwned','skillsEquipped','skillsInherited'])if(Array.isArray(s[key]))s[key]=s[key].map(id=>id==='hasteSkill'?'bountySkill':id);
 if(s.skillLevels?.hasteSkill){s.skillLevels.bountySkill=Math.max(s.skillLevels.bountySkill||1,s.skillLevels.hasteSkill);delete s.skillLevels.hasteSkill;}
 if(s.skillXp?.hasteSkill){s.skillXp.bountySkill=Math.max(s.skillXp.bountySkill||0,s.skillXp.hasteSkill);delete s.skillXp.hasteSkill;}
 s.skillsOwned=Array.isArray(s.skillsOwned)?[...new Set(s.skillsOwned.filter(k=>SKILLS[k]))]:[];
 s.skillsEquipped=Array.isArray(s.skillsEquipped)?[...new Set(s.skillsEquipped.filter(k=>s.skillsOwned.includes(k)))].slice(0,skillSlotCount()):[];
 s.skillsInherited=Array.isArray(s.skillsInherited)?[...new Set(s.skillsInherited.filter(k=>s.skillsOwned.includes(k)))].slice(0,inheritanceSlots()):[];
 s.skillLevels=s.skillLevels&&typeof s.skillLevels==='object'?Object.fromEntries(s.skillsOwned.map(k=>[k,Math.max(1,Math.min(20,Math.floor(safeNumber(s.skillLevels[k],1,100))))])):{};
 s.skillXp=Object.fromEntries(s.skillsOwned.map(k=>[k,s.skillLevels[k]>=20?0:safeNumber(s.skillXp&&s.skillXp[k],0,1e9)]));
 s.skillClock=safeNumber(s.skillClock,0,100);s.skillBuffBounty=safeNumber(s.skillBuffBounty,0,12);s.skillBuffTraining=safeNumber(s.skillBuffTraining,0,12);s.skillBuffCapacitor=safeNumber(s.skillBuffCapacitor,0,10);s.skillChoiceUsed=!!s.skillChoiceUsed;s.chainPulses=Math.floor(safeNumber(s.chainPulses,0,3));s.chainPulseClock=safeNumber(s.chainPulseClock,0,1);if(!s.skillsEquipped.includes('chain')){s.chainPulses=0;s.chainPulseClock=0;}s.skillBuffHaste=0;
 // Legacy/corrupted cooldown fields must never become strings or NaN during += dt.
 for(const id of Object.keys(SKILLS))s['cd_'+id]=safeNumber(s['cd_'+id],0,SKILLS[id][2]);
 s.autoPurchaseClock=safeNumber(s.autoPurchaseClock,0,30);
}
const weaponScore=w=>w?WEAPON_TIERS[w.tier][1]*(1+Math.min(100,w.stage)*.003):1;
const weaponMultiplier=()=>weaponScore(s.weapon)*(s.breakthroughReward==='weapon'?1.20:1);
// STAGE85 field resonance: equipped skill + current weapon tier, with no extra inputs/currency.
// A build's first skill choice and later equip changes therefore affect its late-run playstyle.
const RESONANCE_UNLOCK_STAGE=85;
const RESONANCE_BY_TIER=[.10,.15,.20];
const RESONANCE_EFFECTS={
 overload:'과부하 사격 피해',chain:'연쇄 방전 피해',
 bountySkill:'현상금 추적 크레딧 보너스',trainingSkill:'전술 훈련 경험치 효과',capacitor:'전력 순환 전투력 효과'
};
function resonanceBonus(id){
 return s.stage>=RESONANCE_UNLOCK_STAGE&&s.weapon&&s.skillsEquipped.includes(id)&&Object.hasOwn(RESONANCE_EFFECTS,id)
  ?RESONANCE_BY_TIER[s.weapon.tier]||0:0;
}
function resonanceStatus(){
 if(s.stage<RESONANCE_UNLOCK_STAGE)return 'STAGE 85에서 전술 공명 해금 · 장착 무기 등급에 따라 스킬 효과가 달라져';
 if(!s.weapon)return '전술 공명 대기 · 무기를 얻으면 장착 스킬과 자동 연동돼';
 const active=s.skillsEquipped.filter(id=>resonanceBonus(id)>0);
 if(!active.length)return '전술 공명 대기 · 성장 탭에서 스킬을 장착해';
 return '전술 공명 작동 · '+WEAPON_TIERS[s.weapon.tier][0]+' 무기 · '+active.map(id=>RESONANCE_EFFECTS[id]+' +'+Math.round(resonanceBonus(id)*100)+'%').join(' / ');
}
function grantDrop(){
 // 첫 드롭 목표는 STAGE 15 이후. 과도한 랜덤 보상으로 전투 경제를 무너뜨리지 않도록 낮은 확률 사용.
 if(s.stage>=15&&Math.random()<.045*(1+traitLevel('loot')*.06)){
  const r=Math.random(),tier=r<.72?0:r<.94?1:2;
  const candidate={tier,stage:s.stage};
  if(!s.weapon||weaponScore(candidate)>weaponScore(s.weapon)){s.weapon=candidate;logText='무기 획득 · '+WEAPON_TIERS[tier][0]+' (STAGE '+s.stage+')';showRewardNotice('새 무기 · '+WEAPON_TIERS[tier][0]+' 등급');}
 }
 if(s.stage>=20&&Math.random()<.075){const available=Object.keys(SKILLS).filter(k=>!s.skillsOwned.includes(k)&&(k!=='capacitor'||s.stage>=65));if(available.length){const id=available[Math.floor(Math.random()*available.length)];s.skillsOwned.push(id);s.skillLevels[id]=1;s.skillXp[id]=0;if(s.skillsEquipped.length<skillSlotCount())s.skillsEquipped.push(id);logText='스킬 획득 · '+SKILLS[id][0];showRewardNotice('새 스킬 · '+SKILLS[id][0]);}else{const eligible=s.skillsEquipped.filter(k=>s.skillsOwned.includes(k)&&(s.skillLevels[k]||1)<20);if(eligible.length){const id=eligible[Math.floor(Math.random()*eligible.length)];addSkillXp(id,3);logText='중복 스킬 변환 · '+SKILLS[id][0]+' 경험치 +3';}}}
}
function chooseSkill(id){if(s.stage<20||s.skillChoiceUsed||!SKILLS[id]||id==='capacitor'&&s.stage<65||s.skillsOwned.includes(id))return false;s.skillsOwned.push(id);s.skillLevels[id]=1;s.skillXp[id]=0;if(s.skillsEquipped.length<skillSlotCount())s.skillsEquipped.push(id);s.skillChoiceUsed=true;logText='첫 스킬 선택 · '+SKILLS[id][0];showRewardNotice('첫 스킬 선택 · '+SKILLS[id][0]);save();render();return true;}
function toggleEquipSkill(id){if(!s.skillsOwned.includes(id))return false;const index=s.skillsEquipped.indexOf(id);if(index>=0){s.skillsEquipped.splice(index,1);if(id==='chain'){s.chainPulses=0;s.chainPulseClock=0;}}else if(s.skillsEquipped.length<skillSlotCount())s.skillsEquipped.push(id);else return false;save();render();return true;}
function toggleInheritSkill(id){if(!s.skillsOwned.includes(id))return false;const index=s.skillsInherited.indexOf(id);if(index>=0)s.skillsInherited.splice(index,1);else if(s.skillsInherited.length<inheritanceSlots())s.skillsInherited.push(id);else return false;save();render();return true;}
const skillXpNeeded=level=>Math.ceil(8*Math.pow(level,1.25));
function addSkillXp(id,amount){if(!s.skillsOwned.includes(id))return;let level=s.skillLevels[id]||1;if(level>=20)return;s.skillXp[id]=(s.skillXp[id]||0)+amount;while(level<20&&s.skillXp[id]>=skillXpNeeded(level)){s.skillXp[id]-=skillXpNeeded(level);level++;}s.skillLevels[id]=level;if(level>=20)s.skillXp[id]=0;}
function grantSkillXp(){for(const id of s.skillsEquipped)addSkillXp(id,1);}
// Guaranteed STAGE65 discovery. Old saves beyond 65 receive it on their next kill.
function grantStage65Skill(){
 if(s.stage<65||s.skillsOwned.includes('capacitor'))return false;
 s.skillsOwned.push('capacitor');s.skillLevels.capacitor=1;s.skillXp.capacitor=0;
 if(s.skillsEquipped.length<skillSlotCount())s.skillsEquipped.push('capacitor');
 logText='STAGE 65 보상 · 전력 순환 스킬 획득';
 showRewardNotice('새 스킬 · 전력 순환 · 축적 에너지 활용');
 return true;
}
const skillScale=id=>1+Math.max(0,(s.skillLevels[id]||1)-1)*.04;
const bountySkillBonus=()=>.25*skillScale('bountySkill')*(1+resonanceBonus('bountySkill'));
const attackInterval=()=>.85*Math.pow(.1/.85,Math.min(50,s.spd)/50);
function skillTick(dt){skillNoticeTime=Math.max(0,skillNoticeTime-dt);rewardNoticeTime=Math.max(0,rewardNoticeTime-dt);s.skillBuffBounty=Math.max(0,(s.skillBuffBounty||0)-dt);s.skillBuffTraining=Math.max(0,(s.skillBuffTraining||0)-dt);s.skillBuffCapacitor=Math.max(0,(s.skillBuffCapacitor||0)-dt);s.skillClock+=dt;if(s.chainPulses>0){s.chainPulseClock+=dt;let pulses=0;while(s.chainPulses>0&&s.chainPulseClock>=1&&pulses++<3){s.chainPulseClock-=1;s.chainPulses--;enemyHp-=power()*.6*skillScale('chain')*(1+resonanceBonus('chain'));showSkillNotice('연쇄 방전 · '+(3-s.chainPulses)+'/3 타격');resolveEnemyDefeat();}if(!s.chainPulses)s.chainPulseClock=0;}for(const id of s.skillsEquipped){const cooldown=SKILLS[id][2]*(1-traitLevel('haste')*.03);const key='cd_'+id;s[key]=(s[key]||0)+dt;if(s[key]<cooldown)continue;s[key]=0;if(id==='bountySkill'){s.skillBuffBounty=12;showSkillNotice('현상금 추적 · 처치 크레딧 증가');}else if(id==='trainingSkill'){s.skillBuffTraining=12;showSkillNotice('전술 훈련 · 주인공 경험치 증가');}else if(id==='capacitor'){s.skillBuffCapacitor=10;showSkillNotice('전력 순환 · 에너지 생산과 지속 화력 강화');}else if(id==='overload'){enemyHp-=power()*3*skillScale(id)*(1+resonanceBonus('overload'));showSkillNotice('과부하 사격 · 강력한 일격');}else if(id==='chain'){s.chainPulses=3;s.chainPulseClock=0;showSkillNotice('연쇄 방전 · 3회 연속 방전 준비');}}}
function resetGearSkills(){const kept=s.skillsInherited.filter(k=>s.skillsOwned.includes(k)).slice(0,inheritanceSlots());s.weapon=null;s.skillsOwned=[...kept];s.skillsEquipped=kept.slice(0,skillSlotCount());s.skillsInherited=[...kept];s.skillLevels=Object.fromEntries(kept.map(k=>[k,1]));s.skillXp=Object.fromEntries(kept.map(k=>[k,0]));s.skillClock=0;s.skillBuffBounty=s.skillBuffTraining=s.skillBuffCapacitor=0;s.skillChoiceUsed=false;s.chainPulses=0;s.chainPulseClock=0;skillNoticeTime=rewardNoticeTime=0;s.skillBuffHaste=0;for(const k of Object.keys(SKILLS))s['cd_'+k]=0;}
const traitLevel=id=>Math.max(0,Math.floor(s.traits?.[id]||0));
const availablePoints=()=>s.traitPointsEarned-s.traitPointsSpent;
function normalizeTraits(){const raw=s.traits&&typeof s.traits==='object'&&!Array.isArray(s.traits)?s.traits:{};s.traits={};let remaining=s.traitPointsEarned;for(const [id,,cap,,requirement] of TRAITS){let n=Math.min(cap,Math.floor(safeNumber(raw[id],0,cap)));if(requirement===0||requirement>0&&s.heroLevel<requirement)n=0;n=Math.min(n,remaining);s.traits[id]=n;remaining-=n;}s.traitPointsSpent=s.traitPointsEarned-remaining;}
function buyTrait(id){const def=TRAITS.find(t=>t[0]===id);if(!def||def[4]===0||def[4]>0&&s.heroLevel<def[4]||availablePoints()<1||traitLevel(id)>=def[2])return false;s.traits[id]=traitLevel(id)+1;s.traitPointsSpent++;save();render();return true;}
function resetTraits(){s.traits={};s.traitPointsSpent=0;save();render();}
const inheritanceSlots=()=>1+traitLevel('inherit');
const skillSlotCount=()=>1+[10,25,40,60].filter(level=>s.heroLevel>=level).length;
// 경험치 곡선은 플레이 테스트 전 임시값. 특성 종류/효과는 승인 전 미구현.
const xpNeeded=level=>Math.ceil(10*Math.pow(level,1.45)*(level<10?.6:1));
const nextSkillSlotLevel=()=>[10,25,40,60].find(level=>s.heroLevel<level);
const xpToNextSkillSlot=()=>{const target=nextSkillSlotLevel();if(!target)return 0;let remaining=-s.heroXp;for(let lv=s.heroLevel;lv<target;lv++)remaining+=xpNeeded(lv);return Math.max(0,Math.ceil(remaining));};
function equipNewSkillSlots(before){let extra=Math.max(0,skillSlotCount()-before),equipped=[];for(const id of s.skillsOwned){if(extra<=0)break;if(s.skillsEquipped.includes(id))continue;s.skillsEquipped.push(id);equipped.push(id);extra--;}return equipped;}
function gainHeroXp(amount){if(s.heroLevel>=100000){s.heroXp=0;return;}const oldSlots=skillSlotCount(),oldLevel=s.heroLevel;s.heroXp+=Math.max(0,amount);let leveled=0;while(s.heroLevel<100000&&s.heroXp>=xpNeeded(s.heroLevel)&&leveled<1000){s.heroXp-=xpNeeded(s.heroLevel);s.heroLevel++;s.traitPointsEarned++;leveled++;}if(leveled){logText='주인공 레벨 '+s.heroLevel+' 달성 · 특성 포인트 '+s.traitPointsEarned+' (특성 투자 가능)';const slot=[10,25,40,60].filter(n=>s.heroLevel>=n&&oldLevel<n).at(-1);if(slot){const equipped=equipNewSkillSlots(oldSlots);showRewardNotice('스킬 슬롯 해금 · '+skillSlotCount()+'칸 (영웅 LV'+slot+')'+(equipped.length?' · '+equipped.map(id=>SKILLS[id][0]).join(', ')+' 자동 장착':' · 성장 탭에서 스킬 장착 가능'));}}}
const fmt=n=>{if(!Number.isFinite(n))return '—';if(n<1e4)return Math.floor(n).toLocaleString('ko-KR');let e=Math.floor(Math.log10(n)/3)*3;return (n/10**e).toFixed(2)+'e'+e};
const coreMultiplier=()=>(1+s.corePower*.35);
const phaseMultiplier=()=>1+s.phaseTokens*.6;
// 위상 전환 후에만 작동하는 독립 생산 계층: 위상 흐름은 시간에 따라 생산되고,
// 압축 연구를 통해 하위 재구성 보상과 시작 조건을 바꾼다.
const fluxRate=()=>s.phases>0?(0.12+s.phases*.08)*(1+s.phaseEngine*.35):0;
const phaseEngineCost=()=>Math.ceil(12*Math.pow(2.4,s.phaseEngine));
const startingCredits=()=> 30*(1+s.phaseEngine*2)*(1+traitLevel('restart')*.2);
function buyPhaseEngine(){const c=phaseEngineCost();if(s.phaseFlux<c)return false;s.phaseFlux-=c;s.phaseEngine++;save();render();return true;}
// Provisional STAGE55 choice: combat and passive resource production genuinely trade off.
// Enemy kill credits also gain a route-specific multiplier; timed quest payouts,
// permanent upgrades and other currencies are unaffected.
const ALLOCATION_MULTIPLIERS={balanced:[1,1,1],assault:[2.2,.75,.8],supply:[.8,2.5,1.5]};
const allocationEffects=()=>s.stage>=55?(ALLOCATION_MULTIPLIERS[s.allocation]||ALLOCATION_MULTIPLIERS.balanced):ALLOCATION_MULTIPLIERS.balanced;
const creditRate=()=> (.8+s.forge*3.5*Math.pow(1.23,s.forge))*(1+Math.min(2,s.gen*.08))*(1+s.coreEconomy*.6)*phaseMultiplier()*allocationEffects()[1];
// 9차: 전선 선택 전 효과를 수치로 비교한다. 실제 배율 공식과 동일한 계산을 사용한다.
const FRONTLINE_SUPPORT={firepower:['전투 지원','전투 엔진 +2단계'],industry:['보급 지원','크레딧 주조기 +2단계'],training:['훈련 지원','현재 주인공 다음 레벨 필요 XP의 100%']};
function frontlineSupportGoal(){if(s.stage<55)return '';if(s.stage<60)return ' · STAGE 60 전선 지원까지 '+(60-s.stage)+'단계';if(!s.frontlineSupport)return ' · 전선 지원 1회 선택 가능 (성장 탭)';return s.stage<65?' · 지원 완료: '+FRONTLINE_SUPPORT[s.frontlineSupport][0]:'';}
function chooseFrontlineSupport(kind){if(s.stage<60||s.frontlineSupport||!FRONTLINE_SUPPORT[kind])return false;
 s.frontlineSupport=kind;if(kind==='firepower')s.atk+=2;else if(kind==='industry')s.forge+=2;else gainHeroXp(xpNeeded(s.heroLevel));
 const label=FRONTLINE_SUPPORT[kind][0];logText='STAGE 60 전선 지원 선택 · '+label;showRewardNotice(label+' · '+FRONTLINE_SUPPORT[kind][1]);save();render();return true;
}
function renderFrontlineSupport(){const ready=s.stage>=60,chosen=s.frontlineSupport; $('frontlineSupportPanel').classList.toggle('hide',!ready);
 $('frontlineSupportInfo').textContent=!ready?'STAGE 60 도달 후 선택 가능':chosen?'이번 회차 지원 완료 · '+FRONTLINE_SUPPORT[chosen][0]+' (재구성 후 다시 선택 가능)':'이번 회차 무료 지원 1회 · 세 가지 중 선택 (선택하지 않아도 자동 전투 계속)';
 for(const b of $('frontlineSupportChoices').querySelectorAll('[data-frontline-support]')){b.disabled=!!chosen;b.classList.toggle('support-selected',b.dataset.frontlineSupport===chosen);}
}
// Optional STAGE75 bridge: one existing-system reward, no new currency or forced click.
const BREAKTHROUGH_REWARDS={weapon:['무기 보급','무기가 없으면 지급 · 이번 회차 무기 전투력 +20%'],skill:['스킬 집중','장착 스킬마다 다음 레벨 경험치 지급'],credits:['회수 작전','STAGE 75 적 처치 크레딧 4회분 즉시 지급']};
function breakthroughGoal(){if(s.stage<75)return '';if(!s.breakthroughReward)return ' · STAGE 75 후반 보급 선택 가능 (성장 탭)';return '';}
function chooseBreakthroughReward(kind){if(s.stage<75||s.breakthroughReward||!BREAKTHROUGH_REWARDS[kind])return false;
 if(kind==='skill'&&!s.skillsEquipped.some(id=>(s.skillLevels[id]||1)<20))return false;
 if(kind==='weapon'&&!s.weapon)s.weapon={tier:0,stage:s.stage};
 if(kind==='skill'){for(const id of s.skillsEquipped)if((s.skillLevels[id]||1)<20)addSkillXp(id,skillXpNeeded(s.skillLevels[id]||1));}
 if(kind==='credits')s.credits=Math.min(1e100,s.credits+enemyReward(75)*4);
 s.breakthroughReward=kind;logText='STAGE 75 후반 보급 · '+BREAKTHROUGH_REWARDS[kind][0];showRewardNotice('후반 보급 · '+BREAKTHROUGH_REWARDS[kind][0]);save();render();return true;
}
function renderBreakthroughReward(){const ready=s.stage>=75,chosen=s.breakthroughReward;$('breakthroughPanel').classList.toggle('hide',!ready);
 $('breakthroughInfo').textContent=chosen?'이번 회차 보급 완료 · '+BREAKTHROUGH_REWARDS[chosen][0]+' (재구성 후 다시 선택 가능)':'무료 보급 1회 · 무기/스킬/경제 중 선택 (미선택해도 전투 진행)';
 for(const b of $('breakthroughChoices').querySelectorAll('[data-breakthrough]')){b.disabled=!!chosen||(b.dataset.breakthrough==='skill'&&!s.skillsEquipped.some(id=>(s.skillLevels[id]||1)<20));b.classList.toggle('support-selected',b.dataset.breakthrough===chosen);}
}
function allocationComparison(){
 const baseCredits=(.8+s.forge*3.5*Math.pow(1.23,s.forge))*(1+Math.min(2,s.gen*.08))*(1+s.coreEconomy*.6)*phaseMultiplier();
 const basePower=(5+s.atk*4)*Math.pow(1.10,s.atk)*(1+Math.log10(1+s.energy)*(.14+s.amp*.09))*(1+s.gen*.015)*reactorMultiplier()*coreMultiplier()*phaseMultiplier()*(1+traitLevel('precision')*.04)*(s.stage%10===0?1+traitLevel('boss')*.08:1)*weaponMultiplier();
 return [
  ['균형',basePower*ALLOCATION_MULTIPLIERS.balanced[0],baseCredits*ALLOCATION_MULTIPLIERS.balanced[1],ALLOCATION_MULTIPLIERS.balanced[2]],
  ['공격 집중',basePower*ALLOCATION_MULTIPLIERS.assault[0],baseCredits*ALLOCATION_MULTIPLIERS.assault[1],ALLOCATION_MULTIPLIERS.assault[2]],
  ['보급 집중',basePower*ALLOCATION_MULTIPLIERS.supply[0],baseCredits*ALLOCATION_MULTIPLIERS.supply[1],ALLOCATION_MULTIPLIERS.supply[2]]
 ];
}
// The first two reactor purchases remain exciting; later levels have diminishing returns.
const reactorMultiplier=()=>Math.pow(1.8,Math.min(2,s.reactor))*Math.pow(1.30,Math.max(0,s.reactor-2));
const energyRate=()=> (1+s.gen*1.7)*Math.pow(1.16,s.gen)*(1+s.relay*.65)*(1+s.coreEconomy*.12)*phaseMultiplier()*(1+traitLevel('energy')*.04)*(s.skillBuffCapacitor>0?2:1);
// Sustained-energy skill instead of another instant-damage pulse.
const capacitorPowerBonus=()=>s.skillBuffCapacitor>0?Math.min(.45,Math.log10(1+s.energy)*.06)*skillScale('capacitor')*(1+resonanceBonus('capacitor')):0;
const power=()=> Math.min(1e100,(5+s.atk*4)*Math.pow(1.10,s.atk)*(1+Math.log10(1+s.energy)*(.14+s.amp*.09))*(1+s.gen*.015)*reactorMultiplier()*coreMultiplier()*phaseMultiplier()*allocationEffects()[0]*(1+traitLevel('precision')*.04)*(s.stage%10===0?1+traitLevel('boss')*.08:1)*weaponMultiplier()*(1+capacitorPowerBonus()));
const enemyHealth=stage=>Math.min(1e100,Math.round(48*Math.pow(1.26,stage-1)*Math.pow(1.30,Math.floor((stage-1)/20))*Math.pow(1.4,Math.max(0,stage-100))*Math.pow(1.045,Math.max(0,Math.min(stage,100)-70)))); // 첫 재구성 전 70~100단계 구간만 완만하게 강화
const enemyReward=stage=>Math.min(1e100,Math.round(16*Math.pow(1.19,stage-1)));
const unlockStage={atk:1,spd:1,gen:1,amp:15,relay:25,forge:45,reactor:65};
const costs={atk:[18,1.31],spd:[28,1.36],gen:[22,1.29],amp:[130,1.43],relay:[1200,1.55],forge:[6500,1.48],reactor:[75000,1.66]};
const cost=type=>Math.ceil(costs[type][0]*Math.pow(costs[type][1],s[type]));
function save(){// Preserve the start of an unsettled hidden interval across pagehide/eviction.
s.lastSaved=hiddenAt===null?Date.now():hiddenAt;s.savedEnemyHp=enemyHp;s.savedAttackClock=attackClock;try{localStorage.setItem(KEY,JSON.stringify(s));return true;}catch(e){logText='⚠ 저장 실패 · 브라우저 저장 공간과 개인정보 보호 설정을 확인해 줘. 현재 진행은 화면을 닫으면 사라질 수 있어.';return false;}}
function spawn(){enemyMax=Math.round(enemyHealth(s.stage));enemyHp=enemyMax;const img=$('enemyImage');img.src=s.stage%20===0?'boss_overheat.webp':s.stage%10===0?'boss_guardian.webp':s.stage%5===0?'enemy_armor.svg':s.stage%3===0?'enemy_agile.svg':'enemy_scout.svg';}
function unlock(key,msg){if(!s.knownUnlocks.includes(key)){s.knownUnlocks.push(key);logText='✨ 최초 해금 · '+msg;}}
function purchase(type){if(s.best<unlockStage[type])return false;if(type==='spd'&&s.spd>=50)return false;const c=cost(type);if(s.credits<c)return false;s.credits-=c;s[type]++;return true;}
// Manual batching buys the same upgrades at their rising individual prices; never grants auto-buy.
function purchaseBatch(type,count){let bought=0;for(let i=0;i<count;i++){if(!purchase(type))break;bought++;}return bought;}
const AUTO_LEVEL_CAP=5; // 구매 간격은 5레벨에서 3초에 도달하며 이후 추가 효과가 없음
function coreCost(type){if(type==='autoLevel'&&s.autoLevel>=AUTO_LEVEL_CAP)return Infinity;return Math.ceil((type==='corePower'?1:type==='coreEconomy'?2:3)*Math.pow(1.85,s[type]));}
function buyCore(type){const c=coreCost(type);if(!Number.isFinite(c)||s.cores<c)return;s.cores-=c;s[type]++;if(type==='autoLevel')unlock('auto','자동 구매 해금');save();render();}
function gainCore(){return s.stage<100?0:Math.max(5,Math.floor(Math.pow((s.stage-95)/5,1.25)*(1+s.phaseEngine*.3)));}
function gainPhase(){return s.stage>=180&&s.rebirths>=2?Math.max(1,Math.floor((s.stage-175)/5)):0;}
function rebirth(automatic=false){const gain=gainCore();if(!gain)return false;s.cores+=gain;s.totalCores+=gain;s.rebirths++;resetGearSkills();s.stage=1;s.cacheCredits=0;s.cacheClock=0;s.questCredits=[0,0,0];s.questClocks=[0,0,0];s.autoClaimClock=0;s.credits=startingCredits();s.energy=0;s.allocation='balanced';s.frontlineSupport=null;s.breakthroughReward=null;s.atk=s.spd=s.gen=s.amp=s.relay=s.forge=s.reactor=0;attackClock=enemyClock=0;spawn();unlock('rebirth','재구성 완료');logText=(automatic?'자동 ':'')+'재구성! 영구 코어 +'+fmt(gain);save();return true;}
function phase(){const gain=gainPhase();if(!gain)return;s.phaseTokens+=gain;s.phases++;resetGearSkills();s.stage=1;s.cacheCredits=0;s.cacheClock=0;s.questCredits=[0,0,0];s.questClocks=[0,0,0];s.autoClaimClock=0;s.credits=startingCredits();s.energy=0;s.allocation='balanced';s.frontlineSupport=null;s.breakthroughReward=null;s.atk=s.spd=s.gen=s.amp=s.relay=s.forge=s.reactor=0;s.cores=0;s.totalCores=0;s.corePower=s.coreEconomy=s.autoLevel=0;s.autoBuy=s.autoClaimQuests=s.autoRebirth=false;s.rebirths=0;spawn();unlock('phase','위상 전환 완료');logText='위상 전환! 영구 위상 토큰 +'+fmt(gain);save();render();}
const milestoneTargets=[10,15,25,35,45,55,65,75,85,100,120,150,180];
const milestoneLabels={10:'초기 전선 확보',15:'에너지 증폭 해금',25:'에너지 중계기 해금',35:'중계망 정비',45:'크레딧 주조기 해금',55:'전선 배분 해금',65:'전투 반응로 해금',75:'반응로 안정화',85:'전술 공명 가동',100:'재구성 해금',120:'재구성 보상 확대',150:'고밀도 전선',180:'위상 전환 조건'};
function actionableGoal(){
 const options=Object.keys(costs).filter(k=>s.best>=unlockStage[k]&&(k!=='spd'||s.spd<50)).map(k=>({k,price:cost(k)}));
 if(!options.length)return '현재 구매 가능한 강화가 없어.';
 const automated=s.autoBuy&&s.autoLevel>0;
 // Match the current game policy: newest unlocked tier first and stable ties.
 options.sort(automated?(a,b)=>unlockStage[b.k]-unlockStage[a.k]:(a,b)=>a.price-b.price);
 const next=options.find(o=>s.credits>=o.price)||options[0];
 const names={atk:'전투 엔진',spd:'공격속도',gen:'에너지 발전기',amp:'에너지 증폭기',relay:'에너지 중계기',forge:'크레딧 주조기',reactor:'전투 반응로'};
 const deficit=Math.max(0,next.price-s.credits),rate=creditRate(),estimate=rate>0?Math.ceil(deficit/rate):null;
 const label=automated?'자동 구매 목표 (해금 등급 우선)':deficit===0?'현재 구매 가능한 최저가 강화':'다음 최저가 강화';
 return `${label}: ${names[next.k]} · ${fmt(next.price)} 크레딧 / 보유 ${fmt(s.credits)} · ${deficit===0?'구매 가능':rate>0?`기본 생산 기준 약 ${estimate}초 (전투 보상으로 단축 가능)`:'크레딧 생산을 강화해'}`;
}
function milestoneGoal(){const next=milestoneTargets.find(n=>s.stage<n);if(!next)return s.phases>0?'위상 전환 달성 · 다음 성장 목표를 자유롭게 선택해':s.rebirths<2?'STAGE 180 달성 · 위상 전환에는 재구성 누적 2회가 필요해':'STAGE 180 달성 · 위상 전환 가능 (위상 전환 메뉴 확인)';const unlocks={15:'에너지 증폭기',25:'에너지 중계기',45:'크레딧 주조기',55:'전선 배분',65:'전투 반응로 + 전력 순환 스킬',85:'무기·스킬 공명',100:'재구성'};const reward=next===55?'전선 배분 선택 · 달성 보너스':next===75?'후반 보급 선택 · 달성 보너스':unlocks[next]?`새 기능: ${unlocks[next]} · 달성 보너스`:'달성 보너스 크레딧';return `다음 목표: STAGE ${next} · ${milestoneLabels[next]} (${s.stage}/${next}) · ${reward}`;}
function resolveEnemyDefeat(){if(!Number.isFinite(enemyHp)||enemyHp>0)return false;s.kills++;grantDrop();grantSkillXp();gainHeroXp(Math.max(1,Math.floor(2*Math.pow(1.035,Math.min(200,s.stage)-1)*(1+traitLevel('training')*.05)*(s.skillBuffTraining>0?2*skillScale('trainingSkill')*(1+resonanceBonus('trainingSkill')):1))));s.credits=Math.min(1e100,s.credits+enemyReward(s.stage)*(1+s.coreEconomy*.6)*(1+traitLevel('bounty')*.05)*(s.skillBuffBounty>0?1+bountySkillBonus():1)*allocationEffects()[2]);const previousStage=s.stage;const jump=1;const nextBoss=Math.ceil((previousStage+1)/10)*10;s.stage=Math.min(previousStage+jump,nextBoss);s.best=Math.max(s.best,s.stage);grantStage65Skill();if(milestoneTargets.some(n=>n>previousStage&&n<=s.stage)){const crossed=milestoneTargets.filter(n=>n>previousStage&&n<=s.stage);for(const n of crossed){const bonus=Math.ceil(enemyReward(n)*2);s.credits=Math.min(1e100,s.credits+bonus);unlock('milestone-'+n,`STAGE ${n} 달성 · ${milestoneLabels[n]} · 보너스 ${fmt(bonus)} 크레딧`);}}if(previousStage<20&&s.stage>=20&&!s.skillChoiceUsed)showRewardNotice('STAGE 20 · 성장 탭에서 첫 스킬 선택 가능');if(previousStage<55&&s.stage>=55)showRewardNotice('전선 배분 해금 · 성장 탭에서 공격/보급 선택');if(previousStage<60&&s.stage>=60&&!s.frontlineSupport)showRewardNotice('STAGE 60 전선 지원 도착 · 성장 탭에서 무료 지원 선택');if(previousStage<75&&s.stage>=75&&!s.breakthroughReward)showRewardNotice('STAGE 75 · 성장 탭에서 후반 보급 선택 가능');if(s.stage>=100)unlock('core','재구성 가능');if(s.stage>=180)unlock('phase-access','위상 전환 조건 확인');spawn();return true;}
// 전투/주조기와 독립적인 정기 회수 보상. 5회분까지만 축적한다.
const QUESTS=[['긴급 배송',6,1,3],['부품 회수',30,12,1],['장거리 운송',120,40,1]];
function questPayout(i){const q=QUESTS[i];return Math.max(1,Math.floor(q[2]*Math.pow(1.11,Math.min(60,s.best)-1)));}
function questTick(dt){for(let i=0;i<QUESTS.length;i++){const q=QUESTS[i];if(s.best<q[3])continue;const total=s.questClocks[i]+dt;const cycles=Math.floor((total+1e-7)/q[1]);s.questClocks[i]=total-cycles*q[1];if(cycles>0){const cap=questPayout(i)*5;const previous=s.questCredits[i];s.questCredits[i]=Math.max(previous,Math.min(cap,previous+cycles*questPayout(i)));}}}
// UI와 무관한 공통 회수 처리: 향후 자동 회수도 이 함수를 호출한다.
function transferCacheCredits(){const amount=s.questCredits.reduce((a,b)=>a+b,0);if(amount<1)return 0;s.credits=Math.min(1e100,s.credits+amount);s.questCredits=[0,0,0];return amount;}
function claimCache(){const amount=transferCacheCredits();if(!amount)return false;logText='시간제 퀘스트 보상 +'+fmt(amount);save();render();return true;}
const autoPurchaseInterval=()=>[30,10,8,6,4,3][Math.min(5,Math.max(0,s.autoLevel))];
// Provisional stage-based automation: interval and batch size grow with core research,
// rather than granting up to 11 purchases on the very first research level.
const autoPurchaseLimit=()=>[0,1,1,2,3,5][Math.min(5,Math.max(0,s.autoLevel))];
// Provisional research LV2 reward: reuse the manual claim transfer logic, every 30 seconds.
// The three time-based quests and five-payout reserve caps remain unchanged.
const autoQuestClaimInterval=30;
function autoQuestClaimTick(dt){if(!s.autoClaimQuests||s.autoLevel<2)return 0;
 s.autoClaimClock=(s.autoClaimClock||0)+dt;
 if(s.autoClaimClock<autoQuestClaimInterval)return 0;
 s.autoClaimClock%=autoQuestClaimInterval;
 return transferCacheCredits();
}
const autoRebirthThreshold=()=>Math.max(3,Math.ceil(s.totalCores*.15));
const phaseFocusHolding=()=>s.phaseFocus&&s.rebirths>=2;
function step(dt,allowAutoRebirth=true){questTick(dt);s.energy=Math.min(1e100,s.energy+energyRate()*dt);s.phaseFlux=Math.min(1e100,s.phaseFlux+fluxRate()*dt);s.credits=Math.min(1e100,s.credits+creditRate()*dt);skillTick(dt);resolveEnemyDefeat();attackClock+=dt;enemyClock+=dt;let hits=0;while(attackClock>=attackInterval()&&hits++<30){attackClock-=attackInterval();enemyHp-=power()*(Math.random()<traitLevel('double')*.03?2:1);resolveEnemyDefeat();}
autoQuestClaimTick(dt);if(s.autoBuy&&s.autoLevel>0){s.autoPurchaseClock=(s.autoPurchaseClock||0)+dt;if(s.autoPurchaseClock>=autoPurchaseInterval()){s.autoPurchaseClock%=autoPurchaseInterval();let attempts=0;while(attempts++<autoPurchaseLimit()){const choices=Object.keys(costs).filter(k=>s.best>=unlockStage[k]&&(k!=='spd'||s.spd<50)&&s.credits>=cost(k)).sort((a,b)=>unlockStage[b]-unlockStage[a]);if(!choices.length)break;purchase(choices[0]);}}}
if(allowAutoRebirth&&s.autoRebirth&&s.autoLevel>=3&&!phaseFocusHolding()&&gainCore()>=autoRebirthThreshold())rebirth(true);
}
// 버튼 노드를 유지해 터치 시작과 클릭 사이에 DOM이 교체되지 않도록 한다.
function updateButtons(containerId,entries,attribute){
 const container=$(containerId);
 const keys=entries.map(e=>e[0]);
 for(const node of Array.from(container.children))if(!keys.includes(node.dataset[attribute]))node.remove();
 for(const [key,title,desc,price,available] of entries){
  let button=Array.from(container.children).find(n=>n.dataset[attribute]===key);
  if(!button){button=document.createElement('button');button.dataset[attribute]=key;button.innerHTML='<strong></strong><small></small>';container.appendChild(button);}
  const label=title+' Lv.'+s[key], detail=attribute==='core'&&key==='autoLevel'&&s.autoLevel>=AUTO_LEVEL_CAP?desc+'\n최대 레벨 달성':desc+'\n'+(attribute==='buy'?'비용 ':'코어 ')+fmt(price)+(attribute==='buy'?' 크레딧':'개');
  if(button.firstElementChild.textContent!==label)button.firstElementChild.textContent=label;
  if(button.lastElementChild.textContent!==detail)button.lastElementChild.textContent=detail;
  button.disabled=!available;
 }
}
function renderTraits(){const panel=$('traits');const ids=TRAITS.map(t=>t[0]);for(const node of Array.from(panel.children))if(!ids.includes(node.dataset.trait))node.remove();for(const [id,name,cap,desc,requirement] of TRAITS){let b=Array.from(panel.children).find(n=>n.dataset.trait===id);if(!b){b=document.createElement('button');b.dataset.trait=id;b.innerHTML='<strong></strong><small></small>';panel.appendChild(b);}const lv=traitLevel(id);b.firstElementChild.textContent=name+' '+lv+'/'+cap;b.lastElementChild.textContent=desc+(requirement===0?' · 미구현 대기':requirement>0?' · LV.'+requirement+' 해금':'');b.disabled=lv>=cap||availablePoints()<1||requirement===0||requirement>0&&s.heroLevel<requirement;}$('traitPoints').textContent='사용 가능 '+availablePoints()+'포인트 · 투자 '+s.traitPointsSpent+'포인트';}
function renderSkillChoice(){const info=$('skillChoiceInfo'),panel=$('skillChoice');const choices=Object.keys(SKILLS).filter(id=>!s.skillsOwned.includes(id)&&(id!=='capacitor'||s.stage>=65));for(const node of Array.from(panel.children))if(s.stage<20||s.skillChoiceUsed||!choices.includes(node.dataset.skillChoice))node.remove();if(s.stage>=20&&!s.skillChoiceUsed){for(const id of choices){let button=Array.from(panel.children).find(n=>n.dataset.skillChoice===id);if(!button){button=document.createElement('button');button.dataset.skillChoice=id;button.innerHTML='<strong></strong><small></small>';panel.appendChild(button);}button.firstElementChild.textContent='선택 · '+SKILLS[id][0];button.lastElementChild.textContent=SKILLS[id][1];}}info.textContent=s.stage<20?'STAGE 20에서 이번 회차의 첫 스킬을 선택할 수 있어':s.skillChoiceUsed?'이번 회차 첫 스킬 선택 완료':choices.length?'첫 스킬 선택 가능 · 무료 1회 (선택하지 않아도 자동 전투/드롭은 계속돼)':'모든 스킬을 보유했어';}
function renderGearSkills(){const w=$('weaponInfo');w.textContent=s.weapon?'무기: '+WEAPON_TIERS[s.weapon.tier][0]+' · 획득 STAGE '+s.weapon.stage+' · 공격력 ×'+weaponMultiplier().toFixed(2):'무기 없음 · STAGE 15부터 획득 가능';$('resonanceInfo').textContent=resonanceStatus();$('skillInfo').textContent='보유 '+s.skillsOwned.length+'/'+Object.keys(SKILLS).length+' · 장착 '+s.skillsEquipped.length+'/'+skillSlotCount()+' · 계승 지정 '+s.skillsInherited.length+'/'+inheritanceSlots()+(skillSlotCount()<5?' · 다음 슬롯: 영웅 LV'+nextSkillSlotLevel()+' (남은 경험치 '+fmt(xpToNextSkillSlot())+')':' · 모든 슬롯 해금');const panel=$('skillList');for(const n of Array.from(panel.children))if(!s.skillsOwned.includes(n.dataset.skill))n.remove();for(const id of s.skillsOwned){let n=Array.from(panel.children).find(x=>x.dataset.skill===id);if(!n){n=document.createElement('div');n.dataset.skill=id;n.innerHTML='<strong></strong><button data-equip="'+id+'"></button><button data-inherit="'+id+'"></button>';panel.appendChild(n);}n.children[0].textContent=SKILLS[id][0]+' · LV.'+(s.skillLevels[id]||1)+' ('+Math.floor(s.skillXp[id]||0)+'/'+(s.skillLevels[id]>=20?'MAX':skillXpNeeded(s.skillLevels[id]||1))+') · '+SKILLS[id][1];n.children[1].textContent=s.skillsEquipped.includes(id)?'장착 해제':'장착';n.children[1].disabled=!s.skillsEquipped.includes(id)&&s.skillsEquipped.length>=skillSlotCount();n.children[2].textContent=s.skillsInherited.includes(id)?'계승 해제':'계승 지정';n.children[2].disabled=!s.skillsInherited.includes(id)&&s.skillsInherited.length>=inheritanceSlots();}}
function render(){if(!enemyMax)spawn();renderGearSkills();renderSkillChoice();const heroDetail='주인공 LV.'+fmt(s.heroLevel)+' · 경험치 '+fmt(s.heroXp)+'/'+fmt(xpNeeded(s.heroLevel))+' · 사용 가능 특성 '+fmt(availablePoints())+' · 스킬 슬롯 '+skillSlotCount()+'/5 · 계승 '+inheritanceSlots()+'/2';$('heroGrowth').textContent='주인공 LV.'+fmt(s.heroLevel)+' · 장착 스킬 '+s.skillsEquipped.length+'/'+skillSlotCount();$('heroDetails').textContent=heroDetail;$('heroStats').textContent=heroDetail;renderTraits();$('stage').textContent=fmt(s.stage);$('best').textContent=fmt(s.best);$('rebirths').textContent=fmt(s.rebirths);$('credits').textContent=fmt(s.credits);$('cacheAmount').textContent=fmt(s.questCredits.reduce((a,b)=>a+b,0));$('cacheAutoStatus').textContent=s.autoLevel>=2?(s.autoClaimQuests?'자동 수령 중 · 다음 회수까지 '+Math.max(0,Math.ceil(autoQuestClaimInterval-s.autoClaimClock))+'초':'자동 수령 가능 · 재구성 탭에서 켤 수 있어'):'';$('cacheTimer').innerHTML=QUESTS.map((q,i)=>'<div class="quest-row"><span>'+q[0]+'</span><strong>'+(s.best<q[3]?'STAGE '+q[3]+' 해금':Math.max(0,Math.ceil(q[1]-s.questClocks[i]))+'초 · +'+fmt(questPayout(i)))+'</strong></div>').join('');$('claimCache').disabled=s.questCredits.every(x=>x<1);$('energyRate').textContent=fmt(energyRate());$('power').textContent=fmt(power());$('hpBar').style.width=Math.max(0,100*enemyHp/enemyMax)+'%';$('battleInfo').textContent='적 체력 '+fmt(Math.max(0,enemyHp))+' / '+fmt(enemyMax)+' · '+attackInterval().toFixed(2)+'초마다 공격 · 에너지 '+fmt(s.energy);$('skillCue').textContent=skillNoticeTime>0?skillNotice:'';$('rewardCue').textContent=rewardNoticeTime>0?rewardNotice:'';$('log').textContent=logText;
$('battleGoal').textContent=milestoneGoal()+frontlineSupportGoal()+breakthroughGoal();const goal=s.best<100?'첫 재구성을 위해 STAGE 100 도달 · 현재 '+s.stage+'/100':s.rebirths<1?'재구성으로 영구 코어를 얻어 이전 구간을 더 빠르게 돌파해':s.autoLevel<1?'영구 코어로 자동 구매를 해금해':s.best<180?'STAGE 180 돌파 및 재구성 2회 달성 · 새로운 성장 계층을 향해':s.rebirths<2?'위상 전환 조건: 누적 재구성 2회 필요':'위상 전환으로 상위 성장 계층에 진입해';$('goal').textContent=goal+' · '+milestoneGoal()+frontlineSupportGoal()+breakthroughGoal()+' · '+actionableGoal();$('allocationPanel').classList.toggle('hide',s.stage<55);$('allocationStatus').textContent=s.allocation==='assault'?'공격 집중: 전투력 ×2.2 · 생산 ×0.75 · 처치 크레딧 ×0.8 (돌파 우선)':s.allocation==='supply'?'보급 집중: 전투력 ×0.8 · 생산 ×2.5 · 처치 크레딧 ×1.5 (축적 우선)':'균형 운용: 전투력 ×1 · 생산 ×1 · 처치 크레딧 ×1 (손실 없는 안정형)';renderFrontlineSupport();renderBreakthroughReward();for(const b of $('allocationPanel').querySelectorAll('[data-allocation]'))b.disabled=s.allocation===b.dataset.allocation;$('allocationCompare').textContent=allocationComparison().map(([name,p,c,kill])=>name+' · 전투력 '+fmt(p)+' / 크레딧 초당 '+fmt(c)+' / 처치 크레딧 ×'+kill.toFixed(2)).join('\n');
updateButtons('upgrades',[['atk','⚔ 전투 엔진','기본 공격력 성장'],['spd','➤ 공격속도','Lv.50에서 0.10초 · 최대 10회/초'],['gen','⚡ 에너지 발전기','초당 에너지 생산'],['amp','✦ 에너지 증폭기','축적 에너지의 전투력 전환'],['relay','⌁ 에너지 중계기','발전기 생산량 증폭'],['forge','◇ 크레딧 주조기','시간당 크레딧 생산'],['reactor','✹ 전투 반응로','처음 2단계 ×1.8, 이후 단계마다 ×1.3 전투력']].filter(([k])=>s.best>=unlockStage[k]).map(([k,n,d])=>[k,n,d,k==='spd'&&s.spd>=50?0:cost(k),s.credits>=cost(k)&&(k!=='spd'||s.spd<50)]),'buy');
$('cores').textContent=fmt(s.cores);$('coreGain').textContent='+'+fmt(gainCore());$('coreBoost').textContent='×'+coreMultiplier().toFixed(2);$('rebirth').disabled=!gainCore();updateButtons('coreUpgrades',[['corePower','코어 출력','영구 전투 효율'],['coreEconomy','코어 경제','영구 자원 생산'],['autoLevel','자동화 연구','자동 구매·퀘스트 수령·조건부 환생']].map(([k,n,d])=>[k,n,d,coreCost(k),s.cores>=coreCost(k)]),'core');$('autoLocked').classList.toggle('hide',s.autoLevel>0);$('autoControls').classList.toggle('hide',s.autoLevel===0);$('autoBuy').checked=s.autoBuy;$('autoClaimQuests').checked=s.autoClaimQuests;$('autoClaimQuests').disabled=s.autoLevel<2;$('autoRebirth').checked=s.autoRebirth;$('autoRebirth').disabled=s.autoLevel<3;$('phaseFocus').checked=s.phaseFocus;$('phaseFocus').disabled=s.autoLevel<3;$('autoDetails').textContent=s.autoLevel<3?'자동화 Lv.3부터 조건부 재구성 가능':(phaseFocusHolding()?'위상 목표 우선 · 자동 환생 보류 중 (STAGE 180 달성 후 직접 위상 전환 가능) · ':'자동 재구성 · ')+'획득 예정 '+fmt(gainCore())+'코어 / 필요 '+fmt(autoRebirthThreshold())+'코어 (최소 3개와 누적 획득 코어의 15% 이상 모두 충족)';$('phaseTokens').textContent=fmt(s.phaseTokens);$('phaseGain').textContent='+'+fmt(gainPhase());$('phases').textContent=fmt(s.phases);$('phase').disabled=!gainPhase();$('phaseFlux').textContent=fmt(s.phaseFlux);$('fluxRate').textContent=fluxRate().toFixed(2);$('phaseEngine').textContent='위상 압축 Lv.'+s.phaseEngine+' · 흐름 '+fmt(phaseEngineCost())+' 필요';$('phaseEngine').disabled=s.phaseFlux<phaseEngineCost();$('phaseLayer').classList.toggle('hide',s.phases===0);}
load();const restoredEnemyHp=enemyHp;spawn();if(restoredEnemyHp>0)enemyHp=Math.min(enemyMax,restoredEnemyHp);
// 오프라인 정산은 로드/탭 복귀 모두 같은 전투·생산 계산식을 사용한다.
// 0.85초 단위로 처리하여 프레임당 최대 30회 공격 제한에 걸리지 않게 한다.
function settleElapsed(seconds){const duration=Math.min(7200,Math.max(0,seconds));if(duration<0.01)return 0;let remaining=duration;while(remaining>0.000001){const dt=Math.min(.85,remaining);step(dt,false);remaining-=dt;}logText='방치 진행 '+Math.floor(duration)+'초 반영';save();return duration;}
if(pendingOffline>=0.01)settleElapsed(pendingOffline);
$('skillChoice').addEventListener('click',e=>{const b=e.target.closest('[data-skill-choice]');if(b)chooseSkill(b.dataset.skillChoice)});$('skillList').addEventListener('click',e=>{const equip=e.target.closest('[data-equip]'),inherit=e.target.closest('[data-inherit]');if(equip)toggleEquipSkill(equip.dataset.equip);if(inherit)toggleInheritSkill(inherit.dataset.inherit)});$('traits').addEventListener('click',e=>{const b=e.target.closest('[data-trait]');if(b)buyTrait(b.dataset.trait)});$('traitReset').onclick=()=>{if(s.traitPointsSpent&&confirm('투자한 특성 포인트를 모두 돌려받고 다시 배분할까?'))resetTraits()};$('batchPurchase').onclick=()=>{batchPurchaseCount=batchPurchaseCount===1?3:1;const button=$('batchPurchase');button.textContent='강화 구매: '+(batchPurchaseCount===3?'최대 3회':'1회');button.setAttribute('aria-pressed',String(batchPurchaseCount===3));button.setAttribute('aria-label','강화 구매 '+batchPurchaseCount+'회 선택됨. 누르면 '+(batchPurchaseCount===3?'1':'3')+'회로 변경');};$('upgrades').addEventListener('click',e=>{const b=e.target.closest('[data-buy]');if(b&&purchaseBatch(b.dataset.buy,batchPurchaseCount)>0){render();save()}});$('coreUpgrades').addEventListener('click',e=>{const b=e.target.closest('[data-core]');if(b)buyCore(b.dataset.core)});$('rebirth').onclick=()=>{if(gainCore()&&confirm('기본 성장과 현재 스테이지를 초기화하고 코어 '+gainCore()+'개를 받을까?')){rebirth();render()}};$('phase').onclick=()=>{if(gainPhase()&&confirm('재구성 강화까지 초기화하고 위상 토큰을 얻을까?'))phase()};$('autoBuy').onchange=e=>{s.autoBuy=e.target.checked;save()};$('autoClaimQuests').onchange=e=>{s.autoClaimQuests=e.target.checked&&s.autoLevel>=2;s.autoClaimClock=0;save();render()};$('autoRebirth').onchange=e=>{s.autoRebirth=e.target.checked;save()};$('phaseFocus').onchange=e=>{s.phaseFocus=e.target.checked;save();render()};$('phaseEngine').onclick=buyPhaseEngine;$('frontlineSupportChoices').addEventListener('click',e=>{const b=e.target.closest('[data-frontline-support]');if(b)chooseFrontlineSupport(b.dataset.frontlineSupport)});$('breakthroughChoices').addEventListener('click',e=>{const b=e.target.closest('[data-breakthrough]');if(b)chooseBreakthroughReward(b.dataset.breakthrough)});$('allocationPanel').addEventListener('click',e=>{const b=e.target.closest('[data-allocation]');if(b&&s.stage>=55){s.allocation=b.dataset.allocation;showRewardNotice('전선 배분 변경 · '+(s.allocation==='assault'?'공격 집중':s.allocation==='supply'?'보급 집중':'균형 운용'));render();save()}});$('claimCache').onclick=claimCache;$('save').onclick=()=>{const saved=save();if(saved)logText='저장 완료';render()};$('reset').onclick=()=>{if(!resetArmed){resetArmed=true;$('reset').textContent='정말 초기화할까? 다시 눌러 확정';return;}if(confirm('모든 개편 1차 저장 데이터를 삭제할까?')){localStorage.removeItem(KEY);s=initial();spawn();render()}resetArmed=false;$('reset').textContent='저장 데이터 초기화 (2회 확인)'};
let last=performance.now(),lastImpact=-Infinity;
// Foreground-only, throttled damage feedback; never animate during offline settlement.
function combatImpact(now){const img=$('enemyImage');if(now-lastImpact<180||typeof img.animate!=='function'||(typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches))return;lastImpact=now;img.animate([{filter:'brightness(1.75) drop-shadow(0 0 14px #ffe17e)'},{filter:'brightness(1)'}],{duration:170,easing:'ease-out'});}
function loop(now){let dt=Math.min(.25,Math.max(0,(now-last)/1000));last=now;if(!document.hidden){const before=enemyHp;step(dt);if(enemyHp<before)combatImpact(now);render();saveClock+=dt;if(saveClock>=5){saveClock=0;save()}}requestAnimationFrame(loop)}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(hiddenAt===null){save();hiddenAt=Date.now();}}else if(hiddenAt!==null){const now=Date.now();const elapsed=Math.max(0,(now-hiddenAt)/1000);hiddenAt=null;settleElapsed(elapsed);render();}last=performance.now()});
// Mobile browsers can discard a background tab without firing beforeunload.
// Persist on pagehide as an additional lifecycle checkpoint; foreground settlement remains unchanged.
window.addEventListener('pagehide',save);
window.addEventListener('beforeunload',save);render();requestAnimationFrame(loop);
