'use strict';
// Local-only opt-in export of practical playtest observations.
// This file deliberately does not transmit, fingerprint, or modify gameplay/save state.
(function(){
 const KEY='neon_playtest_log_v1',VERSION=1,MAX_EVENTS=1200,MAX_SECONDS=2*3600;
 const $=id=>document.getElementById(id);
 const types=['atk','spd','gen','amp','relay','forge','reactor'];
 const safeNumber=(v,limit=1e100)=>Number.isFinite(v)?Math.max(0,Math.min(limit,v)):0;
 const sample=()=>({
  stage:s.stage,best:s.best,rebirths:s.rebirths,heroLevel:s.heroLevel,kills:s.kills,
  credits:safeNumber(s.credits),energy:safeNumber(s.energy),cores:safeNumber(s.cores),
  weaponTier:s.weapon?s.weapon.tier:null,skillsEquipped:s.skillsEquipped.slice(0,5),
  levels:Object.fromEntries(types.map(k=>[k,s[k]])),allocation:s.allocation
 });
 const makeLog=()=>({
  version:VERSION,startedAtMs:Date.now(),endElapsedSec:0,
  counters:{manualUpgradeClicks:0,manualUpgradeLevels:0,autoUpgradeLevels:0,
   manualQuestClaims:0,autoQuestClaims:0,manualQuestCredits:0,autoQuestCredits:0,
   kills:0,stageAdvances:0,coreInvestments:0,traitInvestments:0,
   equipChanges:0,inheritChanges:0,firstSkillChoices:0,allocationChanges:0,
   foregroundSeconds:0,backgroundSeconds:0},
  upgradeLevels:{manual:{},auto:{}},creditFromKillsAndMilestones:0,
  events:[],discardedEvents:0,sessionLoads:0,errors:0
 });
 let log;
 try{
  const raw=JSON.parse(localStorage.getItem(KEY));
  log=raw&&raw.version===VERSION&&Number.isFinite(raw.startedAtMs)&&raw.counters&&
      raw.upgradeLevels&&Array.isArray(raw.events)?raw:makeLog();
 }catch{log=makeLog();}
 let lastForegroundMs=Date.now(),backgroundStartMs=null,lastSnapshotSec=-1,manualPurchaseDepth=0,offlineDepth=0;
 const elapsed=()=>Math.max(0,Math.floor((Date.now()-log.startedAtMs)/1000));
 const flush=()=>{
  try{log.endElapsedSec=elapsed();localStorage.setItem(KEY,JSON.stringify(log));return true}
  catch{log.errors++;return false}
 };
 const count=(k,amount=1)=>{log.counters[k]=(log.counters[k]||0)+amount};
 const record=(type,details={})=>{
  log.events.push({sec:elapsed(),type,stage:s.stage,...details});
  if(log.events.length>MAX_EVENTS){
   const over=log.events.length-MAX_EVENTS;
   log.events.splice(0,over);log.discardedEvents+=over;
  }
  flush();
 };
 const addUpgrade=(origin,type,costPaid)=>{
  count(origin==='manual'?'manualUpgradeLevels':'autoUpgradeLevels');
  const map=log.upgradeLevels[origin];
  map[type]=(map[type]||0)+1;
  // Automatic upgrades are aggregated to avoid excessive storage writes.
  if(origin==='manual')return;
  if((log.counters.autoUpgradeLevels%25)===0)record('automatic_upgrade_checkpoint',{
   totalLevels:log.counters.autoUpgradeLevels,latest:type
  });
 };
 const basePurchase=purchase;
 purchase=function(type){
  const paid=s.credits,level=s[type],ok=basePurchase(type);
  if(ok&&types.includes(type)&&s[type]===level+1)
   addUpgrade(manualPurchaseDepth?'manual':'auto',type,Math.max(0,paid-s.credits));
  return ok;
 };
 const baseBatch=purchaseBatch;
 purchaseBatch=function(type,n){
  manualPurchaseDepth++;
  const before=s.credits,level=s[type];
  let bought=0;
  try{bought=baseBatch(type,n)}finally{manualPurchaseDepth--}
  if(bought>0){count('manualUpgradeClicks');record('manual_upgrade',{
   upgrade:type,levels:bought,level:s[type],cost:safeNumber(before-s.credits)
  });}
  return bought;
 };
 const baseDefeat=resolveEnemyDefeat;
 resolveEnemyDefeat=function(){
  const before={kills:s.kills,stage:s.stage,credits:s.credits,weapon:s.weapon&&s.weapon.tier,
   skills:s.skillsOwned.slice()};
  const result=baseDefeat();
  if(s.kills>before.kills){
   count('kills',s.kills-before.kills);
   log.creditFromKillsAndMilestones+=safeNumber(s.credits-before.credits);
  }
  if(s.stage!==before.stage){
   count('stageAdvances',Math.max(0,s.stage-before.stage));
   record('stage',{from:before.stage,to:s.stage,mode:offlineDepth?'offline':'active',
    heroLevel:s.heroLevel,credits:safeNumber(s.credits),
    ownedSkillCount:s.skillsOwned.length,weaponTier:s.weapon?s.weapon.tier:null});
  }
  if(s.weapon&&s.weapon.tier!==before.weapon)
   record('weapon_upgrade',{tier:s.weapon.tier,stageFound:s.weapon.stage});
  for(const id of s.skillsOwned)if(!before.skills.includes(id))
   record('skill_acquired',{skill:id});
  return result;
 };
 const wrapAction=(name,type,counter,field)=>{
  const original=({chooseSkill,toggleEquipSkill,toggleInheritSkill,buyTrait,
    buyCore,chooseFrontlineSupport,chooseBreakthroughReward})[name];
  if(typeof original!=='function')return;
  const make=(value)=>function(...args){
   const before=field==='core'?s[args[0]]:null;
   const outcome=original(...args);
   if(field==='core'?s[args[0]]>before:outcome===true){
    if(counter)count(counter);
    record(type,{choice:args[0]});
   }
   return outcome;
  };
  const wrapped=make();
  switch(name){
   case 'chooseSkill':chooseSkill=wrapped;break;
   case 'toggleEquipSkill':toggleEquipSkill=wrapped;break;
   case 'toggleInheritSkill':toggleInheritSkill=wrapped;break;
   case 'buyTrait':buyTrait=wrapped;break;
   case 'buyCore':buyCore=wrapped;break;
   case 'chooseFrontlineSupport':chooseFrontlineSupport=wrapped;break;
   case 'chooseBreakthroughReward':chooseBreakthroughReward=wrapped;break;
  }
 };
 wrapAction('chooseSkill','first_skill_choice','firstSkillChoices');
 wrapAction('toggleEquipSkill','equip_change','equipChanges');
 wrapAction('toggleInheritSkill','inherit_change','inheritChanges');
 wrapAction('buyTrait','trait_investment','traitInvestments');
 wrapAction('buyCore','core_investment','coreInvestments','core');
 wrapAction('chooseFrontlineSupport','frontline_support',null);
 wrapAction('chooseBreakthroughReward','stage75_choice',null);
 const baseClaim=claimCache;
 claimCache=function(){const before=s.questCredits.reduce((a,b)=>a+b,0),ok=baseClaim();
  if(ok){count('manualQuestClaims');count('manualQuestCredits',before);
   record('manual_quest_claim',{credits:before});}return ok;
 };
 const baseAutoClaim=autoQuestClaimTick;
 autoQuestClaimTick=function(dt){
  const earned=baseAutoClaim(dt);
  if(earned>0){count('autoQuestClaims');count('autoQuestCredits',earned);
   if(log.counters.autoQuestClaims%10===0)record('automatic_quest_checkpoint',{claims:log.counters.autoQuestClaims});}
  return earned;
 };
 const baseRebirth=rebirth;
 rebirth=function(automatic=false){
  const gained=gainCore(),before=s.rebirths,stage=s.stage;
  const ok=baseRebirth(automatic);
  if(ok&&s.rebirths>before)record('rebirth',{automatic:!!automatic,fromStage:stage,coresEarned:gained});
  return ok;
 };
 const basePhase=phase;
 phase=function(){const from=s.phases,stage=s.stage;const amount=gainPhase();const r=basePhase();
  if(s.phases>from)record('phase',{fromStage:stage,tokensEarned:amount});return r;
 };
 const baseSettle=settleElapsed;
 settleElapsed=function(seconds){offlineDepth++;const before=s.stage;let applied=0;
  try{applied=baseSettle(seconds)}finally{offlineDepth--}
  if(applied>0)record('offline_settlement',{seconds:Math.floor(applied),fromStage:before,toStage:s.stage});
  return applied;
 };
 function foregroundTime(){
  if(backgroundStartMs!==null)return;
  const now=Date.now();count('foregroundSeconds',Math.max(0,(now-lastForegroundMs)/1000));lastForegroundMs=now;
 }
 const status=()=>{
  const duration=Math.round((log.counters.foregroundSeconds+(backgroundStartMs===null?(Date.now()-lastForegroundMs)/1000:0))/60);
  const node=$('playtestStatus');
  if(node)node.textContent='기록 중 · 실제 전면 사용 약 '+duration+'분 · 이벤트 '+log.events.length+
   '개 · 강화 '+log.counters.manualUpgradeClicks+'회 · 퀘스트 수령 '+log.counters.manualQuestClaims+'회';
 };
 const takeSnapshot=()=>{
  if(backgroundStartMs!==null)return;
  foregroundTime();
  const nowSec=elapsed();
  if(nowSec-lastSnapshotSec>=60){
   lastSnapshotSec=nowSec;
   record('snapshot',{state:sample(),counters:{...log.counters}});
  }else flush();
  status();
 };
 const exportData=()=>{
  foregroundTime();record('export',{});
  return {schema:'neon-playtest-v1',notice:'Local-only playtest metrics. No device identifiers, accounts or network transmission.',
   exportedAtElapsedSec:elapsed(),...log,snapshot:sample()};
 };
 const download=()=>{
  const blob=new Blob([JSON.stringify(exportData(),null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='neon-playtest-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  const node=$('playtestExportStatus');
  if(node)node.textContent='JSON 파일을 저장했어. 이 대화에 파일을 첨부하면 분석할 수 있어.';
 };
 const erase=()=>{
  if(!confirm('플레이 기록만 초기화할까? 게임 저장 데이터는 그대로 유지돼.'))return;
  log=makeLog();lastForegroundMs=Date.now();backgroundStartMs=null;lastSnapshotSec=-1;
  record('session_start',{state:sample()});status();
 };
 $('playtestExport').addEventListener('click',download);
 $('playtestClear').addEventListener('click',erase);
 document.addEventListener('visibilitychange',()=>{
  const now=Date.now();
  if(document.hidden){foregroundTime();backgroundStartMs=now;record('background_enter');}
  else if(backgroundStartMs!==null){
   const seconds=Math.max(0,(now-backgroundStartMs)/1000);
   count('backgroundSeconds',seconds);backgroundStartMs=null;lastForegroundMs=now;
   record('foreground_return',{backgroundSeconds:Math.floor(seconds)});status();
  }
 });
 window.addEventListener('pagehide',()=>{foregroundTime();flush();});
 // Tracking is deliberately independent of the game's autosave cadence.
 window.setInterval(takeSnapshot,30000);
 log.sessionLoads++;
 record('session_start',{state:sample(),startupOfflineSeconds:Math.floor(Math.max(0,pendingOffline))});
 status();
 window.playtestTelemetry={exportData,clear:erase,status,flush}; // for local diagnostics; never network.
})();
