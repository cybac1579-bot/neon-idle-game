/* 교체 가능한 UI 어댑터 v1. 게임 규칙·시간 진행·저장 처리는 expedition-app.js / engine 담당. */
(function(root){
'use strict';
function create(ctx){
 const E=ctx.engine,s=ctx.state,$=ctx.byId;
 const {fmt,safe,row,ratio}=ctx;
 const getBuyCount=ctx.getBuyCount,getNotice=ctx.getNotice;
 let tab='squad';
function screen(name){
 if(!['squad','supply','archive','return'].includes(name))name='squad';
 const changed=tab!==name;
 tab=name;
 // Combat is never tabbed out: only the independently scrolling command tray
 // changes panels. Preserve live formation, enemy HP and motion continuously.
 $('battleScreen').hidden=false;
 for(const n of ['squad','supply','archive','return'])$(n+'Screen').hidden=n!==name;
 document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);b.setAttribute('aria-current',b.dataset.tab===name?'page':'false');});
 if(changed)$('workbench').scrollTop=0;
 render();
}
function renderBattle(){
 $('stage').textContent=fmt(s.stage);
 $('credits').textContent=fmt(s.credits);
 $('best').textContent=fmt(s.best);
 const kind=E.enemyKind(s.stage),boss=kind==='boss',elite=kind==='elite',charger=kind==='charger',disruptor=kind==='disruptor';
 $('battleType').textContent=boss?'⚠ 지휘급 교전':elite?'◆ 정예 전선':charger?'↗ 돌격형 적':disruptor?'◎ 원거리 교란':'일반 전선';
 $('foe').classList.toggle('boss',boss);
 $('foe').classList.toggle('charger',charger);
 $('foe').classList.toggle('disruptor',disruptor);
 $('foe').querySelector('.silhouette').textContent=boss?'♛':elite?'◆':charger?'♞':disruptor?'◎':'♜';
 $('enemyLabel').textContent=(boss?'지휘급 적':elite?'정예 적':charger?'돌격병':disruptor?'교란 사수':'전선 적')+' · '+fmt(s.stage);
 // Keep DOM nodes stable between renders so march/hit animations are not restarted.
 if(window.ExpeditionField)window.ExpeditionField.sync(s);
 $('partyBar').style.width=ratio(s.squadHp,E.maxHp(s));
 $('enemyBar').style.width=ratio(s.enemyHp,E.enemyMax(s.stage));
 $('partyHp').textContent=fmt(s.squadHp)+' / '+fmt(E.maxHp(s));
 $('enemyHp').textContent=fmt(s.enemyHp)+' / '+fmt(E.enemyMax(s.stage));
 $('event').textContent=Date.now()<getNotice().until?getNotice().text:(s.events[s.events.length-1]||'자동 전진 중…');
 $('openChest').hidden=s.chests<1;
 // The battle-screen control opens exactly one box; keep batch opening in
 // the archive and make the very first permanent discovery unmistakable.
 const hasDiscoveredRelic=E.RELICS.some(r=>E.relic(s,r.id)>0);
 $('openChest').textContent=!hasDiscoveredRelic?
  '✦ 첫 유물 확인 · 상자 1개 열기':
  '✦ 상자 1개 열기 · 보유 '+fmt(s.chests)+'개';
 // Show the actual next chest milestone, including whether it is a boss chest.
 // The current elite/boss stage still awards its chest on victory.
 const nextChest=s.stage+((5-s.stage%5)%5);
 // A prolonged encounter must show observable progress without another HUD row.
 // Use actual current enemy HP, not a guessed time-to-kill or new reward.
 const longEncounter=s.engagement?.stage===s.stage&&s.engagement.seconds>=60;
 const hpLeft=Math.max(0,Math.min(100,100*s.enemyHp/E.enemyMax(s.stage)));
 $('goal').textContent=fmt(nextChest)+'거리 · '+(E.isBoss(nextChest)?'지휘급':'정예')+' 격파 시 상자 +1'+
  (longEncounter?' · 현재 적 HP '+(s.enemyHp>0&&hpLeft<1?'<1':hpLeft.toFixed(0))+'%':'')+
  (s.stage===40&&s.engagement?.stage===40&&s.engagement.seconds>=120?
   ' · 교전 중 자동 강화 '+fmt(Math.max(0,s.autoBuy.purchases-(s.engagement.autoBuyStart||0)))+'회':'');
 const availableCores=E.rebirthGain(s),ready=availableCores>0;
 $('returnQuick').hidden=!ready;
 $('returnQuick').textContent='↻ 귀환 가능 · +'+fmt(availableCores)+'코어';
 $('returnTab').classList.toggle('available',ready);
 $('returnBadge').hidden=!ready;
 $('returnBadge').textContent='+'+fmt(availableCores);
 $('frontSummary').innerHTML=row('지휘관 레벨','LV.'+fmt(s.heroLevel))+
   row('용병 총원',fmt(E.UNITS.reduce((sum,u)=>sum+s.units[u.id],0))+'명')+
   row('이번 탐사 격파',fmt(s.runKills)+'회')+
   row('부대 화력',fmt(E.partyDps(s))+'/초')+
   row('전열 현황',fmt(s.actors.filter(a=>a.revive===0&&a.hp>0).length)+'명 활동 / '+fmt(s.actors.length)+'명')+
   (s.respawn>0?row('재정비 중',s.respawn.toFixed(1)+'초'):'');
}
function updateBuyCount(){
 for(const id of ['buyCountSquad','buyCountSupply'])$(id).textContent=getBuyCount()===1?'1회':'최대 '+getBuyCount()+'회';
}

function renderAutoBuy(){
 const a=s.autoBuy,target=E.autoTarget(s);
 $('autoMode').value=a.mode;
 $('autoToggle').textContent=a.enabled?'자동 구매 끄기':'자동 구매 켜기';
 $('autoToggle').classList.toggle('active',a.enabled);
 $('autoToggle').setAttribute('aria-pressed',a.enabled?'true':'false');
 const label=target?(target.kind==='train'?'부대 훈련':target.kind==='recruit'?'용병 소집':
    (E.QUESTS.find(q=>q.id===target.id)?.name||'보급 의뢰')):'구매 가능한 종류 없음';
 // The strict old saving mode is intentionally allowed to wait. Explain the
 // cost to the player in the squad detail panel; never silently change their
 // selected upgrade or clutter the battle HUD. This is a passive-only estimate
 // (kills/chests can reduce it), not a promised completion time.
 let reserveWait='';
 if(a.enabled&&a.mode==='reserve'&&target&&target.cost>s.credits){
  const passiveRate=E.QUESTS.filter(q=>s.stage>=q.unlock)
   .reduce((sum,q)=>sum+E.questIncome(s,q)/q.interval,0);
  if(passiveRate>0){
   const passiveMinutes=Math.ceil((target.cost-s.credits)/passiveRate/60);
   if(passiveMinutes>=10)reserveWait=' · 보급 수익만 가정하면 약 '+fmt(passiveMinutes)+
    '분 대기(전투 보상 제외) · 성장이 멈춘 것 같다면 균형/유동형 전환 가능';
  }
 }
 // On a passive first expedition, unspent credits can leave the army at
 // distance 14 for the whole session. Explain the available voluntary choice
 // without secretly enabling purchases or adding an always-on battle HUD tip.
 const hasAffordableGrowth=s.credits>=E.trainCost(s)||
  (s.actors.length<E.MAX_ACTORS&&s.credits>=E.hireCost(s));
 const firstRunIdleHelp=!a.enabled&&s.rebirths===0&&s.clock>=180&&
  s.runMetrics.manualPurchases===0&&hasAffordableGrowth?
  '첫 탐사 성장 안내 · 크레딧이 모여 있어도 강화는 자동으로 구매되지 않아. 위에서 직접 소집·훈련하거나, 원하면 성장 자동 구매를 켜줘. / ':'';
 const narrowPolicyStall=a.enabled&&['train','recruit','supply'].includes(a.mode)&&
  s.engagement?.stage===s.stage&&s.engagement.seconds>=300&&
  s.autoBuy.purchases===s.engagement.autoBuyStart;
 const stallAdvice=narrowPolicyStall?
  '현재 교전 5분 이상 · 이 전투 중 자동 구매가 없어. 단일 분야만 구매하는 설정이 원인일 수 있어. 균형으로 바꾸거나 다른 강화를 직접 선택할 수 있어. / ':'';
 $('autoStatus').textContent=a.enabled?'작동 중 · '+E.AUTO_BUY_INTERVAL+'초마다 구매 판단':'자동 구매 꺼짐';
 $('autoDetails').textContent=firstRunIdleHelp+stallAdvice+(a.mode==='adaptive'?'유동형 균형 · 현재 구매 가능 항목 확인 / ':a.mode==='reserve'?'장기 저축 · 현재 항목 완료까지 구매 대기 / ':a.mode==='balanced'?'균형 · 장기 대기 시 부담 적은 성장으로 전환 / ':'')+
   '다음 대상: '+label+(target?' · '+fmt(target.cost)+' 크레딧'+(s.credits>=target.cost?' · 구매 가능':' · 크레딧 축적 중'):'')+
   reserveWait+
   ' / 이번 탐사 자동 구매 '+fmt(a.purchases)+'회 · '+fmt(a.spent)+' 크레딧 사용';
}
function renderSquad(){
 updateBuyCount();
 renderAutoBuy();
 $('unitList').innerHTML=E.UNITS.map(u=>{
  const locked=s.best<u.unlock;
  return '<div class="action"><div><strong>'+safe(u.symbol)+' '+safe(u.name)+(locked?' · 미해금':' ×'+fmt(s.units[u.id]))+'</strong><p>'+safe(locked?u.unlock+'거리 도달 시 모집 가능':u.id==='guard'?'전열 방어 · 대부분의 피해 흡수':u.id==='ranger'?'후열 화력 · 측면 피격 가능':'후열 회복 · 측면 피격 가능')+'</p></div><span class="sub">'+safe(locked?'잠김':'소집 풀')+'</span></div>';
 }).join('');
 const recruitCost=E.hireCost(s);
 $('hire').textContent='용병 소집 · 다음 1명 '+fmt(recruitCost)+' 크레딧';
 $('hire').disabled=s.credits<recruitCost||(s.actors||[]).length>=E.MAX_ACTORS;
 $('trainingSummary').innerHTML='<span>공통 훈련 LV.'+fmt(s.training)+'</span><b>피해·내구 상승</b>';
 $('train').textContent='훈련 강화 · 다음 1단계 '+fmt(E.trainCost(s))+' 크레딧';
 $('train').disabled=s.credits<E.trainCost(s);
 const remaining=E.traitRemaining(s);
 $('heroSummary').innerHTML=row('지휘관 레벨 / 누적 경험치','LV.'+fmt(s.heroLevel)+' / '+fmt(s.heroXp))+
  row('다음 레벨 필요 경험치',fmt(E.xpNeeded(s.heroLevel)))+row('미사용 특성 포인트',fmt(remaining))+
  row('전술 통솔 / 보급 지휘',fmt(s.traits.command)+' / '+fmt(s.traits.supply));
 $('traitCommand').textContent='전술 통솔 +6% (LV.'+s.traits.command+')';
 $('traitSupply').textContent='보급 지휘 +8% (LV.'+s.traits.supply+')';
 $('traitCommand').disabled=remaining<1||s.traits.command>=10;
 $('traitSupply').disabled=remaining<1||s.traits.supply>=10;
 $('traitRespec').disabled=(s.traits.command+s.traits.supply)===0;
 const c=s.contribution;
 $('roleContribution').innerHTML=E.UNITS.map(u=>{
  const id=u.id;
  return '<div class="statline"><span>'+safe(u.name)+'</span><b>피해 '+fmt(c.damage[id])+
   ' · 회복 '+fmt(c.healing[id])+' · 피격 '+fmt(c.taken[id])+
   (c.falls[id]?' · 후퇴 '+fmt(c.falls[id]):'')+'</b></div>';
 }).join('');
}
function renderSupply(){
 updateBuyCount();
 $('questList').innerHTML=E.QUESTS.map(q=>{
  const unlocked=s.stage>=q.unlock;
  const value=E.questIncome(s,q);
  const cost=E.questCost(s,q);
  return '<div class="action"><div><strong>'+safe(q.name)+(unlocked?' · LV.'+s.questLevels[q.id]:' · '+q.unlock+'거리 해금')+'</strong><p>'+
   (unlocked?fmt(value)+' 크레딧 / '+q.interval+'초 · 자동 정산':'해당 거리에 도달하면 자동 가동')+'</p></div><button data-quest="'+safe(q.id)+'" '+(!unlocked||s.credits<cost?'disabled':'')+'>'+fmt(cost)+'<small>수익 강화</small></button></div>';
 }).join('');
 $('incomeSummary').innerHTML=row('자동 수익 / 분',fmt(E.QUESTS.filter(q=>s.stage>=q.unlock).reduce((n,q)=>n+60*E.questIncome(s,q)/q.interval,0)))+
  row('전투 격파',fmt(s.runKills)+'회')+row('정예 상자 보유',fmt(s.chests)+'개');
}
function returnReportHtml(r){
 if(!r)return '';
 const precise=n=>Number(n)<100?Number(n).toFixed(2):fmt(n);
 let comparison='';
 if(r.before&&r.after){
  const compare=(label,oldValue,newValue)=>{
   const percent=((newValue/Math.max(.00001,oldValue)-1)*100);
   const sign=percent>=0?'+':'';
   return row(label,precise(oldValue)+' → '+precise(newValue)+' ('+sign+percent.toFixed(1)+'%)');
  };
  comparison='<div class="return-comparison"><h3>지난 탐사 출발 ↔ 이번 탐사 출발</h3>'+
   compare('기본 부대 화력/초',r.before.attack,r.after.attack)+
   compare('기본 체력',r.before.hp,r.after.hp)+
   compare('기본 보급/회',r.before.income,r.after.income)+'</div>';
 }else{
  comparison='<div class="sub" style="margin:11px 0">이전 탐사 출발 수치는 과거 저장에 없어서 비교하지 않았어. 다음 귀환부터 실제 출발 전투력을 비교할 수 있어.</div>';
 }
 return row('완료한 탐사',fmt(r.number)+'회차 · '+fmt(r.cleared)+'거리까지 격파')+
  row('이번 귀환 코어',fmt(r.cores)+'개 (격파 적립 '+fmt(r.earned)+' · 첫 기록 '+fmt(r.firstClear)+')')+
  row('영구 유물 수집',fmt(r.relicKinds)+'종 · 총 '+fmt(r.relicCopies)+'개')+
  (r.relicFindCounts?row('이번 탐사 첫 발견 / 중복 / 교환',
   fmt(r.relicFindCounts.first)+'종 / '+fmt(r.relicFindCounts.duplicates)+'개 / '+
   fmt(r.relicFindCounts.exchanges)+'상자'+(r.relicFindCounts.partial?' · 이전 수집 기록 일부 제외':'')):'')+
  (Number.isFinite(r.autoChestOpened)?row('지난 탐사 자동 개봉',fmt(r.autoChestOpened)+'개'):'')+
  (r.longestEncounter?.stage?row('최장 적 격파 교전',fmt(r.longestEncounter.stage)+'거리 · '+Math.floor(r.longestEncounter.seconds/60)+'분 '+Math.floor(r.longestEncounter.seconds%60)+'초'):'')+
  (Number.isFinite(r.longEngagements)?row('1분 이상 걸린 격파',fmt(r.longEngagements)+'회'):'')+
  (r.relicEffects?row('이번 탐사 유물 전술','정밀 사격 '+fmt(r.relicEffects.volleys)+'회 · 긴급 회수 '+fmt(r.relicEffects.triages)+'회 · 정보망 '+fmt(r.relicEffects.intelFinds||0)+'회 · 측면 공격 '+fmt(r.relicEffects.flankShots||0)+'회 · 후열 절반 엄호 '+fmt(r.relicEffects.partialCovers||0)+'회 · 호위 반격 '+fmt(r.relicEffects.intercepts||0)+'회 · 돌격 저지 '+fmt(r.relicEffects.braces||0)+'회 · 부분 버팀 '+fmt(r.relicEffects.partialBraces||0)+'회 · 원거리 교란 '+fmt(r.relicEffects.jams||0)+'회 · 역통신 반격 '+fmt(r.relicEffects.cleanses||0)+'회 · 지휘 전술 전환 '+fmt(r.relicEffects.commandMoves||0)+'회 · 방벽 일격 방어 '+fmt(r.relicEffects.guardPlateBlocks||0)+'회 · 2인 호위 협공 '+fmt(r.relicEffects.escortDuets||0)+'회 · 전장 도해 균열 타격 '+fmt(r.relicEffects.diagrams||0)+'회'):'')+
  comparison;
}
function renderArchive(){
 let found=0,copies=0;E.RELICS.forEach(r=>{if(E.relic(s,r.id))found++;copies+=E.relic(s,r.id);});
 $('relicSummary').textContent=found+'/'+E.RELICS.length+' 발견 · '+copies+'개 수집';
 const capped=E.RELICS.reduce((sum,r)=>sum+r.cap,0);
 const cm=s.runMetrics;
 $('relicCollectionProgress').textContent='발견한 종류 '+found+'/'+E.RELICS.length+
   ' · 보유 '+copies+'/'+capped+'개 (중복 강화 포함) · 미개봉 '+fmt(s.chests)+'상자'+
   ' · 이번 탐사 첫 발견 '+fmt(cm.firstRelicFinds)+'종 / 중복 강화 '+fmt(cm.duplicateRelics)+
   '개 / 상한 교환 '+fmt(cm.relicExchanges)+'상자'+
   (cm.legacyRelicCounter?' (과거 저장분 집계 제외)':'')+
   (found===E.RELICS.length?' · 공개된 유물 종류 완성 · 남은 중복 강화 슬롯 '+fmt(capped-copies)+'개':'');
 // The first real three-expedition playtest reached depth40 after finding
 // all twelve <=30-tier kinds, but never killed the depth40 boss. Explain
 // why repeat shallow chests only produced copies. Never change loot odds.
 const clearedDistance=Math.max(0,s.best-1);
 const earnedTierRelics=E.RELICS.filter(r=>r.unlockStage<=clearedDistance);
 const undiscoveredEarned=earnedTierRelics.filter(r=>!E.relic(s,r.id));
 const nextDiscoveryDepth=Math.min(Infinity,...E.RELICS.map(r=>r.unlockStage)
  .filter(depth=>depth>clearedDistance));
 const showDiscoveryGoal=earnedTierRelics.length>0&&
  undiscoveredEarned.length===0&&Number.isFinite(nextDiscoveryDepth);
 const hint=$('relicNextDiscovery');
 hint.hidden=!showDiscoveryGoal;
 if(showDiscoveryGoal){
  const nextNames=E.RELICS.filter(r=>r.unlockStage===nextDiscoveryDepth).map(r=>r.name);
  const tierEnemy=E.isBoss(nextDiscoveryDepth)?'보스':E.isElite(nextDiscoveryDepth)?'정예':'적';
  const snapshot=E.returnChoiceSnapshot(s);
  const oldChestWarning=snapshot.pendingChests&&snapshot.pendingNewKinds===0?
   ' 현재 미개봉 상자 '+fmt(snapshot.pendingChests)+'개는 새 종류 후보가 없어.':'';
  hint.textContent='현재까지 격파한 거리에서 발견 가능한 유물 '+fmt(earnedTierRelics.length)+
   '종을 모두 발견했어. 다음 첫 발견 목표: '+nextDiscoveryDepth+'거리 '+tierEnemy+
   ' 격파 후 획득한 상자에서 '+nextNames.join(' 또는 ')+
   ' 중 새 종류 1종 확정. 기존 상자는 획득한 거리의 보상만 나오며, 나중에 열어도 깊은 거리의 유물로 바뀌지 않아.'+
   oldChestWarning+' 귀환은 자유롭게 선택할 수 있어.';
 }
 // The battle HUD remains lean; collectors can confirm that an owned relic
 // changed combat behavior rather than merely inflating base damage.
 const effects=s.relicEffects||{volleys:0,volleyBonusDamage:0,triages:0,intelClears:0,intelFinds:0};
 const scoutOwned=E.relic(s,'scout')>0,relayOwned=E.relic(s,'relay')>0;
 const intelActive=scoutOwned&&relayOwned;
 const intelPieces=Number(scoutOwned)+Number(relayOwned);
 const guardOwned=E.relic(s,'guard')>0,archerOwned=E.relic(s,'archer')>0;
 const escortPieces=Number(guardOwned)+Number(archerOwned);
 const escortActive=guardOwned&&archerOwned;
 const shieldOwned=E.relic(s,'shield')>0,swiftOwned=E.relic(s,'swift')>0;
 const bracePieces=Number(shieldOwned)+Number(swiftOwned);
 const braceActive=shieldOwned&&swiftOwned;
 const medkitOwned=E.relic(s,'medkit')>0;
 const signalPieces=Number(medkitOwned)+Number(relayOwned),signalActive=medkitOwned&&relayOwned;
 const platePieces=Number(shieldOwned)+Number(guardOwned),plateActive=shieldOwned&&guardOwned;
 const hasTactics=archerOwned||E.relic(s,'medkit')>0||intelPieces>0||escortPieces>0||bracePieces>0||platePieces>0||E.relic(s,'diagram')>0;
 $('relicEffectSummary').hidden=!hasTactics;
 $('relicEffectSummary').textContent=hasTactics?
  '이번 탐사 전술 발동 · 지휘 전술 전환 '+fmt(effects.commandMoves||0)+'회 (전열 압박 '+fmt(effects.commandSurges||0)+'회) · 정밀 일제사격 '+fmt(effects.volleys)+'회 (추가 유효 피해 '+fmt(effects.volleyBonusDamage)+
  ') · 긴급 재합류 '+fmt(effects.triages)+'회'+
  (intelActive?' · 탐사 정보망 '+fmt(effects.intelFinds)+'/2회 자동 발견'+
    ((effects.intelFinds||0)<2?' · 30거리 이후 정예 조사 '+fmt(effects.intelClears||0)+'/2':' · 이번 귀환 보상 완료'):
    intelPieces===1?' · 조합 목표 · 탐사 정보망 1/2 (미발견: '+(scoutOwned?'작전 통신기':'탐사 일지')+')':'')+
  (escortActive?' · 호위 역습 · 적 측면 타격 '+fmt(effects.flankShots||0)+'회 중 차단 '+fmt(effects.intercepts||0)+'회'+
    ' · 반격 유효 피해 '+fmt(effects.counterDamage||0)+
    ' · 호위 협공 '+fmt(effects.escortDuets||0)+'회'+
    (E.relic(s,'guard')>=2&&E.relic(s,'archer')>=2?
      ' (준비 완료 · 40거리 이상/사수 2명 생존 시)':
      ' (숙련 목표 · 호위 계약서 '+E.relic(s,'guard')+'/2 · 초점 조준기 '+E.relic(s,'archer')+'/2)'):
    escortPieces===1?(guardOwned?' · 호위 계약서 · 후열 절반 엄호 '+fmt(effects.partialCovers||0)+'회 · 초점 조준기 획득 시 완전 호위·반격':' · 조합 목표 · 호위 역습 1/2 (미발견: 호위 계약서)'):'')+
  (braceActive?' · 철벽 진형 · 돌격 저지 '+fmt(effects.braces||0)+'/'+fmt(effects.rushes||0)+'회'+
    ' · 반격 유효 피해 '+fmt(effects.braceDamage||0):
    bracePieces===1?(shieldOwned?' · 합금 배지 · 돌진 부분 버팀 '+fmt(effects.partialBraces||0)+'회 · 완전 돌격 저지는 진군 북 필요':' · 조합 목표 · 철벽 진형 1/2 (미발견: 합금 배지)'):'')+
  (plateActive?' · 심층 방벽 진형 · 55거리 이상 일격 방어 '+fmt(effects.guardPlateBlocks||0)+'회':
   platePieces===1?' · 조합 목표 · 심층 방벽 진형 1/2 (미발견: '+(shieldOwned?'호위 계약서':'합금 배지')+')':'')+
  (E.relic(s,'diagram')>0?' · 심층 전장 도해 · 균열 타격 '+fmt(effects.diagrams||0)+'회 · 유효 피해 '+fmt(effects.diagramDamage||0)+' (70거리 이상 지휘급/75거리 이상 정예)':'')+
  (signalActive?' · 역통신 반격 · 교란 저지 '+fmt(effects.cleanses||0)+'/'+fmt(effects.jams||0)+'회 · 유효 반격 피해 '+fmt(effects.cleanseDamage||0):
   signalPieces===1?' · 조합 목표 · 역통신 반격 1/2 (미발견: '+(medkitOwned?'작전 통신기':'재생 결속선')+')':'')+
  ' · 추가 조작 없이 자동 발동':'';

 $('relicList').innerHTML=E.RELICS.map(r=>{
  const n=E.relic(s,r.id),next=n?E.nextRelicCopyPreview(s,r.id):null;
  const preview=next?(next.capped?
   (next.unique?'고유 유물 수집 완료 · 중복 불가':'수집 상한 달성 · 같은 유물 중복 효과는 여기까지'):
   next.unique?'고유 유물 · 동일 종류 중복 수집 불가':
   '다음 1개 효과 · '+next.label+' '+next.from+next.unit+' → '+next.to+next.unit+
   (next.context?' · '+next.context:'')):'';
  return '<div class="relic '+(n?'owned':'')+'"><div class="glyph" aria-hidden="true">'+(n?'✦':'◇')+'</div>'+
   '<strong>'+safe(n?r.name:'아직 발견하지 않은 유물')+'</strong><small>'+safe(n?r.desc:'다음 탐사에서 새로운 유물을 찾아보자')+'</small>'+
   '<div class="count">'+(n?'보유 '+n+' / 상한 '+r.cap:'미발견 · '+r.unlockStage+'거리 상자에서 등장')+'</div>'+
   (preview?'<div class="next-effect">'+safe(preview)+'</div>':'')+'</div>';
 }).join('');
 $('openArchiveChest').hidden=s.chests<1;
 $('openArchiveChest').textContent='상자 1개 열기';
 $('openArchiveBatch').hidden=s.chests<2;
 $('openArchiveBatch').textContent='상자 '+fmt(Math.min(20,s.chests))+'개 함께 열기'+(s.chests>20?' (나머지 보관)':'');
 $('autoChestToggle').textContent=s.autoChest.enabled?'상자 자동 개봉 끄기':'상자 자동 개봉 켜기';
 $('autoChestToggle').setAttribute('aria-pressed',s.autoChest.enabled?'true':'false');
 $('autoChestToggle').classList.toggle('active',s.autoChest.enabled);
 $('autoChestStatus').textContent=(s.autoChest.enabled?'자동 개봉 작동 중':'자동 개봉 꺼짐')+
  ' · 60초마다 최대 20개 (오프라인 정산 포함) · 이번 탐사 자동 개봉 '+
  fmt(s.autoChest.opened)+'개 · 귀환/코어 투자는 수동';
 $('relicRecent').innerHTML=s.relicHistory.length?s.relicHistory.slice(-8).reverse().map(r=>{
  const data=E.RELICS.find(x=>x.id===r.id);
  const label=(r.source==='intel'?'정보망 자동 조사 · ':'')+
   (data?(r.duplicate?'중복 · ':'첫 발견 · ')+data.name:'해당 깊이 유물 수집 완료 · 크레딧 보상')+
   (r.depth?' · '+r.depth+'거리'+(r.source==='intel'?' 발견':' 상자'):'');
  return '<div class="collection-log"><span>'+safe(label)+'</span><strong>'+
   safe(r.id?'×'+r.stack:'+'+fmt(r.credits)+' 크레딧')+'</strong></div>';
 }).join(''):'아직 발견한 유물이 없어.';
 const last=s.latestReturn;
 $('returnReportPanel').hidden=!last;
 if(last)$('returnReportContent').innerHTML=returnReportHtml(last);
 const choice=E.returnChoiceSnapshot(s);
 const unlockGoal=choice.nextUnopenedTier?
  choice.nextUnopenedTier+'거리 상자에서 새로운 유물군 개방':
  choice.ownedRelicKinds===E.RELICS.length?
   '공개된 유물 '+fmt(E.RELICS.length)+'종 모두 발견 · 현재 원형의 신규 종류 없음 · 중복 강화는 계속 가능':
   '공개된 유물 깊이 모두 해금 · 미수집 유물 탐색 가능';
 const investable=choice.offers.filter(o=>o.affordableAfterReturn);
 const investLabel=investable.length?investable.map(o=>
  (o.id==='valor'?'전선 강화':'보급 강화')+' LV.'+(o.level+1)+' (각 '+fmt(o.cost)+'코어)'
 ).join(' 또는 '):'현재 보유량으로 다음 코어 강화 불가';
 const returnText=choice.canReturn?
  '지금 귀환하면 '+fmt(choice.returnCores)+'코어 확정 · 기존 보유분 포함 '+
  fmt(choice.coresAfterReturn)+'코어 · 투자 여부와 방향은 직접 선택':
  '현재 귀환 보상이 없어 · 10거리 보스 격파와 코어 적립 이후 선택 가능';
 const chestText=choice.pendingChests?
  '미개봉 '+fmt(choice.pendingChests)+'상자 (귀환 후에도 유지) · 첫 발견 후보 '+
  fmt(choice.pendingNewKinds)+'종'+
  (choice.guaranteedFirstDiscovery?' · 아직 미발견인 깊이 전용 유물 확정 상자 포함':
   choice.pendingNewKinds?' · 발견 여부는 확률로 결정':' · 새 종류 후보 없음, 중복 강화 또는 상한 교환'):
  '미개봉 상자 없음 · 5거리 단위 정예/보스 격파로 새 상자 확보';
 // Reveal the named two-copy goal only once BOTH relics have been found;
 // this is a multi-run option, not a guaranteed future random chest result.
 const escortGuard=E.relic(s,'guard'),escortArcher=E.relic(s,'archer');
 const longFightSeconds=s.engagement?.stage===s.stage?Math.floor(s.engagement.seconds):0;
 const longFight=longFightSeconds>=300;
 const longFightHp=Math.max(0,Math.min(100,100*s.enemyHp/E.enemyMax(s.stage))).toFixed(1);
 // The active enemy resets on voluntary return; clarify that tradeoff
 // only in the detailed return panel, not on the uncluttered battle HUD.
 const abandonFight=longFight?
  '지금 귀환하면 이 적과의 교전 진행(남은 체력 '+longFightHp+'%)은 초기화돼. 유물·지휘관 레벨·획득 코어는 유지돼.':'';
 const persistFight=longFight?
  '현재 '+fmt(s.stage)+'거리 교전 '+Math.floor(longFightSeconds/60)+'분 이상 · 적 체력 '+longFightHp+'% 남음. 계속하면 이 적의 남은 체력과 성장 진행을 유지해.':'';
 const duetGoal=escortGuard>0&&escortArcher>0?
  (escortGuard>=2&&escortArcher>=2?
   '호위 협공 준비 완료 · 40거리 이상 정예/보스 측면 공격 때 살아 있는 사수 2명으로 자동 발동':
   '장기 수집 목표 · 호위 협공: 호위 계약서 '+Math.min(2,escortGuard)+'/2 · 초점 조준기 '+
   Math.min(2,escortArcher)+'/2 (상자 획득은 확률)')+
  ' · 귀환 후에도 유물 보유 유지':'';
 $('returnChoices').innerHTML=
  '<div class="return-choice"><strong>↻ 지금 귀환</strong><p>'+safe(returnText)+'</p>'+
  '<p>'+safe(choice.canReturn?'귀환 후 다음 1회 강화 선택: '+investLabel:
   '이미 보유한 코어는 귀환하지 않아도 영구 강화에 사용 가능')+'</p>'+
  (abandonFight?'<p>'+safe(abandonFight)+'</p>':'')+'</div>'+
  '<div class="return-choice"><strong>↗ 계속 탐사</strong><p>'+safe(chestText)+'</p>'+
  '<p>'+safe('현재 깊이까지 해금됐지만 미발견 유물 '+fmt(choice.uncollectedUnlockedKinds)+
   '종 · '+unlockGoal)+'</p>'+
  (persistFight?'<p>'+safe(persistFight)+'</p>':'')+
  (duetGoal?'<p>'+safe(duetGoal)+'</p>':'')+'</div>';
 const rewards=E.rebirthRewards(s),gain=rewards.total;
 const nextRecord=E.BREAKTHROUGHS.find(b=>b.stage>Math.max(s.claimedBreakthroughDistance,s.runBest-1));
 const nextReturnForecast=nextRecord?E.projectedRebirthRewards(s,nextRecord.stage):null;
 // New-depth unlocks are lifetime progress, not the current stage after a
 // voluntary return. Otherwise veterans are incorrectly told that distance15
 // is a fresh tier after already unlocking distance40.
 const lifetimeCleared=Math.max(0,s.best-1);
 const nextDeep=Math.min(Infinity,...E.RELICS.map(r=>r.unlockStage).filter(depth=>depth>lifetimeCleared));
 const nextDepthRelics=Number.isFinite(nextDeep)?E.RELICS.filter(r=>r.unlockStage===nextDeep):[];
 const lockedKinds=E.RELICS.filter(r=>r.unlockStage>lifetimeCleared).length;
 const currentEngagement=s.engagement?.stage===s.stage?s.engagement:null;
 const elapsed=Math.floor(currentEngagement?.seconds||0);
 const fighting=elapsed>=1;
 const fightClock=Math.floor(elapsed/60)+'분 '+elapsed%60+'초';
 const enemyRemaining=Math.max(0,Math.min(100,100*s.enemyHp/E.enemyMax(s.stage)));
 const sinceLoad=currentEngagement?.legacyResume?' · 이전 저장 데이터의 과거 교전 시간은 미포함':'';
 const growthDuringFight=Math.max(0,s.autoBuy.purchases-(currentEngagement?.autoBuyStart||0));
 $('rebirthSummary').innerHTML=row('이번 탐사 최고 거리',fmt(s.runBest))+
  (fighting?row('현재 적과 교전',fmt(s.stage)+'거리 · '+fightClock+sinceLoad):'')+
  (fighting?row('현재 적 체력 / 교전 중 자동 강화',enemyRemaining.toFixed(1)+'% 남음 · 자동 구매 '+fmt(growthDuringFight)+'회'):'')+
  row('이번 탐사 1분 이상 교전 격파',fmt(s.longEngagements||0)+'회')+
  (s.longestEncounter?.stage?row('이번 탐사 최장 격파 교전',fmt(s.longestEncounter.stage)+'거리 · '+
   Math.floor(s.longestEncounter.seconds/60)+'분 '+Math.floor(s.longestEncounter.seconds%60)+'초'):'')+
  row('아직 미개방 유물 등급',fmt(lockedKinds)+'종 · 누적 최고 '+fmt(lifetimeCleared)+'거리 격파')+
  row('다음 신규 유물 개방',nextDepthRelics.length?
   nextDeep+'거리 격파 · '+nextDepthRelics.map(r=>r.name).join(' · '):
   '공개된 유물 '+fmt(E.RELICS.length)+'종 모두 깊이 개방 · 미수집 유물은 도감 확인')+
  row('격파 성과로 적립한 코어',fmt(rewards.base)+'개')+
  row('다음 코어 적립 진행',Math.min(99.9,Math.max(0,rewards.fraction*100)).toFixed(1)+'% · 다음 탐사로 이월')+
  row('이번 첫 기록 보너스',fmt(rewards.recordBonus)+'개')+
  row('귀환 시 총 코어',fmt(gain)+'개')+
  row('다음 최초 돌파 보너스',nextRecord?nextRecord.stage+'거리 보스 격파 · +'+nextRecord.cores+'코어':'공개된 돌파 보너스 모두 획득')+
  (nextReturnForecast?row('계속 탐사 시 귀환 예상',nextRecord.stage+'거리 격파 가정 · 총 '+
   fmt(nextReturnForecast.total)+'코어 (현재보다 +'+fmt(nextReturnForecast.additional)+
   '개) · 격파 진척·첫 기록 보너스 기준, 소요 시간 미반영'):'')+
  row('누적 귀환 횟수',fmt(s.rebirths)+'회')+
  row('보유 영구 코어',fmt(s.cores)+'개');
 $('rebirth').disabled=gain<1;
 $('rebirth').textContent=gain?'귀환하고 코어 '+fmt(gain)+'개 받기':s.runBest<=10?'10거리 보스를 격파해야 귀환 가능':'코어 적립 중 · 더 깊이 탐사해 줘';
 $('coreSummary').innerHTML=row('전선 코어 · 전투 강화','LV.'+fmt(s.coreUpgrades.valor))+
  row('전선 코어 화력 효과','+'+((E.valorMultiplier(s)-1)*100).toFixed(1)+'% · 9레벨부터 기존 배율')+
  (s.coreUpgrades.valor<30?row('다음 전선 강화 효과',
   '현재 대비 +'+((E.valorMultiplier({...s,coreUpgrades:{...s.coreUpgrades,valor:s.coreUpgrades.valor+1}})/E.valorMultiplier(s)-1)*100).toFixed(1)+
   '% · 강화 후 누적 +'+((E.valorMultiplier({...s,coreUpgrades:{...s.coreUpgrades,valor:s.coreUpgrades.valor+1}})-1)*100).toFixed(1)+
   '% · 코어 '+fmt(E.coreCost(s,'valor'))+'개 필요'+(s.cores<E.coreCost(s,'valor')?' (현재 '+fmt(E.coreCost(s,'valor')-s.cores)+'개 부족)':' (지금 구매 가능)')):'')+
  row('보급 코어 · 경제 강화','LV.'+fmt(s.coreUpgrades.trade));
 const b=E.permanentBonuses(s);
 const pct=n=>'+'+Math.max(0,(n-1)*100).toFixed(1)+'%';
 $('permanentBonusSummary').innerHTML='<h3>현재 편성 기준 영구 성장 효과</h3>'+
  row('전체 전투 화력',pct(b.attack))+row('부대 최대 체력',pct(b.hp))+
  (E.relic(s,'chronicle')?row('원정 연대기 수집 효과',found+'종 발견 · 피해량 +'+Math.min(30,found*2)+'%'):'')+
  row('자동 보급 수익',pct(b.income))+
  row('용병 소집 비용 절약',Math.max(0,(1-b.hireCost)*100).toFixed(1)+'%')+
  row('부대 훈련 비용 절약',Math.max(0,(1-b.trainCost)*100).toFixed(1)+'%');
 $('coreValor').textContent='전선 강화 · '+E.coreCost(s,'valor')+'코어';
 $('coreTrade').textContent='보급 강화 · '+E.coreCost(s,'trade')+'코어';
 $('coreValor').disabled=s.cores<E.coreCost(s,'valor')||s.coreUpgrades.valor>=30;
 $('coreTrade').disabled=s.cores<E.coreCost(s,'trade')||s.coreUpgrades.trade>=30;
 const duration=seconds=>{const n=Math.floor(seconds||0);return Math.floor(n/3600)+'시간 '+Math.floor(n%3600/60)+'분 '+n%60+'초';};
 // Exact boss/elite clear timing stays here in the archive, not on the battle HUD.
 const milestoneTime=seconds=>seconds===undefined?'미격파':
  Math.floor(seconds/60)+'분 '+(seconds%60).toFixed(1)+'초';
 const former=s.runHistory.at(-1)?.milestones||{};
 const relativeClear=(current,previous)=>{
  if(!Number.isFinite(current)||!Number.isFinite(previous)||previous<=0||current<=0)return '';
  const change=(previous-current)/previous*100;
  if(Math.abs(change)<.05)return ' · 이전과 같은 속도';
  return ' · 직전 대비 '+Math.abs(change).toFixed(1)+'% '+(change>0?'단축':'증가');
 };
 $('milestoneSummary').innerHTML='<p class="sub">해당 거리 적 격파 시각 · 직전 탐사와 비교 (미격파 시 비교 없음)</p>'+
  [5,10,15,25,35,40,45,50,55,60,75,100].map(stage=>row(
   stage+'거리 '+(stage%10===0?'보스':'정예'),
   '이번 '+milestoneTime(s.runMilestones[stage])+
   (former[stage]!==undefined?' · 직전 '+milestoneTime(former[stage]):'')+
   relativeClear(s.runMilestones[stage],former[stage])
  )).join('');
 $('history').innerHTML='<div class="sub" style="margin:4px 0 10px">이번 탐사: '+safe(duration(s.clock))+
  ' · 수동 구매 '+fmt(s.runMetrics.manualPurchases)+'회 · 자동 구매 '+fmt(s.autoBuy.purchases)+
  '회 · 상자 수동 '+fmt(Math.max(0,s.runMetrics.chestsOpened-s.autoChest.opened))+
  '개 / 자동 '+fmt(s.autoChest.opened)+'개</div>'+
  (s.runHistory.length?'<h3 style="font-size:13px;color:#d6f4ed">최근 귀환 5회</h3>'+s.runHistory.slice().reverse().map((r,i)=>
   '<div class="statline"><span>'+safe('거리 '+r.best+' · '+duration(r.duration))+'</span><b>'+
   safe('수동 '+r.manualPurchases+' / 자동 '+r.autoPurchases+' · 코어 '+r.cores+
    (Number.isFinite(r.autoChestOpened)?' · 상자 자동 '+r.autoChestOpened+'개':'')+
    (r.relicEffects?' · 정밀 '+r.relicEffects.volleys+'회 · 긴급 '+r.relicEffects.triages+'회 · 정보망 '+(r.relicEffects.intelFinds||0)+'회 · 호위 반격 '+(r.relicEffects.intercepts||0)+'회 · 호위 협공 '+(r.relicEffects.escortDuets||0)+'회 · 돌격 저지 '+(r.relicEffects.braces||0)+'회 · 부분 버팀 '+(r.relicEffects.partialBraces||0)+'회 · 역통신 '+(r.relicEffects.cleanses||0)+'회 · 지휘 전술 '+(r.relicEffects.commandMoves||0)+'회':''))+'</b></div>').join(''):'')+
  s.events.slice().reverse().map(m=>'<div class="sub" style="padding:5px 0;border-bottom:1px solid #304359">'+safe(m)+'</div>').join('');
 const samples=s.playtest.snapshots.length;
 $('playtestSummary').innerHTML=row('기록한 1분 단위 상태',fmt(samples)+'개')+
  row('지난 오프라인 정산',fmt(Math.floor(s.playtest.offlineSeconds/60))+'분')+
  row('기록된 귀환',fmt(s.runHistory.length)+'회')+
  row('현재 자동 성장',s.autoBuy.enabled?'켜짐 · '+s.autoBuy.mode:'꺼짐')+
  row('상자 자동 개봉','이번 탐사 '+fmt(s.autoChest.opened)+'개 · '+(s.autoChest.enabled?'켜짐':'꺼짐'));
}

function renderPanel(){
 if(tab==='squad')renderSquad();
 else if(tab==='supply')renderSupply();
 else if(tab==='archive'||tab==='return')renderArchive();
}
function render(){
 renderBattle();
 renderPanel();
}

 return {screen,renderBattle,renderPanel,render,updateBuyCount,returnReportHtml};
}
root.ExpeditionUI={create,version:'prototype-v1'};
})(window);
