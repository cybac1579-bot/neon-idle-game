/* 독립 용병단 원형의 DOM 연결. game.js 상태/저장/배포 흐름과 공유하지 않는다. */
(function(){
'use strict';
const E=window.ExpeditionEngine;
if(!E){document.body.textContent='용병단 엔진을 불러오지 못했어.';return;}
const $=id=>document.getElementById(id);
const fmt=n=>{n=Number(n)||0;if(n>=1e12)return (n/1e12).toFixed(1)+'조';if(n>=1e8)return (n/1e8).toFixed(1)+'억';if(n>=1e4)return (n/1e4).toFixed(1)+'만';return Math.floor(n).toLocaleString('ko-KR');};
const safe=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let loaded=null;
try{loaded=JSON.parse(localStorage.getItem(E.SAVE_KEY)||'null');}catch(err){loaded=null;}
const s=E.normalize(loaded||E.newState(),Date.now());
const startup=loaded?E.offline(s,Date.now()):0;
let buyCount=5;
let tab='battle',saveAt=Date.now(),lastFrame=performance.now(),toast=startup?'오프라인 '+Math.floor(startup/60)+'분 '+(startup%60)+'초 정산 완료':'',toastUntil=Date.now()+5000;
function notify(message){toast=message;toastUntil=Date.now()+4000;}
function save(){try{s.lastSaved=Date.now();localStorage.setItem(E.SAVE_KEY,JSON.stringify(s));saveAt=Date.now();return true;}catch(err){notify('저장 오류: 브라우저 저장 공간을 확인해 줘');return false;}}
function row(label,value){return '<div class="statline"><span>'+safe(label)+'</span><b>'+safe(value)+'</b></div>';}
function ratio(x,max){return Math.max(0,Math.min(100,100*x/Math.max(1,max)))+'%';}
function screen(name){
 tab=name;
 for(const n of ['battle','squad','supply','archive'])$(n+'Screen').hidden=n!==name;
 document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);b.setAttribute('aria-current',b.dataset.tab===name?'page':'false');});
 render();
}
function renderBattle(){
 $('stage').textContent=fmt(s.stage);
 $('credits').textContent=fmt(s.credits);
 $('best').textContent=fmt(s.best);
 const boss=E.isBoss(s.stage),elite=E.isElite(s.stage);
 $('battleType').textContent=boss?'⚠ 지휘급 교전':elite?'◆ 정예 전선':'일반 전선';
 $('foe').classList.toggle('boss',boss);
 $('foe').querySelector('.silhouette').textContent=boss?'♛':elite?'◆':'♜';
 $('enemyLabel').textContent=boss?'지휘급 적 · '+fmt(s.stage):elite?'정예 적 · '+fmt(s.stage):'전선 적 · '+fmt(s.stage);
 // Keep DOM nodes stable between renders so march/hit animations are not restarted.
 if(window.ExpeditionField)window.ExpeditionField.sync(s);
 $('partyBar').style.width=ratio(s.squadHp,E.maxHp(s));
 $('enemyBar').style.width=ratio(s.enemyHp,E.enemyMax(s.stage));
 $('partyHp').textContent=fmt(s.squadHp)+' / '+fmt(E.maxHp(s));
 $('enemyHp').textContent=fmt(s.enemyHp)+' / '+fmt(E.enemyMax(s.stage));
 $('event').textContent=Date.now()<toastUntil?toast:(s.events[s.events.length-1]||'자동 전진 중…');
 $('openChest').hidden=s.chests<1;
 $('openChest').textContent='✦ 보급 상자 '+fmt(s.chests)+'개 열기';
 $('goal').textContent=fmt(s.stage+((5-s.stage%5)%5))+'거리';
 $('frontSummary').innerHTML=row('지휘관 레벨','LV.'+fmt(s.heroLevel))+
   row('용병 총원',fmt(E.UNITS.reduce((sum,u)=>sum+s.units[u.id],0))+'명')+
   row('이번 탐사 격파',fmt(s.runKills)+'회')+
   row('부대 화력',fmt(E.partyDps(s))+'/초')+
   row('전열 현황',fmt(s.actors.filter(a=>a.revive===0&&a.hp>0).length)+'명 활동 / '+fmt(s.actors.length)+'명')+
   (s.respawn>0?row('재정비 중',s.respawn.toFixed(1)+'초'):'');
}
function updateBuyCount(){
 for(const id of ['buyCountSquad','buyCountSupply'])$(id).textContent=buyCount===1?'1회':'최대 '+buyCount+'회';
}
function doPurchase(kind,id=null){
 const result=E.purchase(s,kind,buyCount,id);
 if(result.count===0){notify('구매 가능한 단계가 없어. 크레딧이나 해금 상태를 확인해 줘.');}
 else{
  save();
  if(result.count>1)notify(result.count+'회 구매 · '+fmt(result.spent)+' 크레딧 사용');
 }
 render();
}
function renderAutoBuy(){
 const a=s.autoBuy,target=E.autoTarget(s);
 $('autoMode').value=a.mode;
 $('autoToggle').textContent=a.enabled?'자동 구매 끄기':'자동 구매 켜기';
 $('autoToggle').classList.toggle('active',a.enabled);
 $('autoToggle').setAttribute('aria-pressed',a.enabled?'true':'false');
 const label=target?(target.kind==='train'?'부대 훈련':target.kind==='recruit'?'용병 소집':
    (E.QUESTS.find(q=>q.id===target.id)?.name||'보급 의뢰')):'구매 가능한 종류 없음';
 $('autoStatus').textContent=a.enabled?'작동 중 · '+E.AUTO_BUY_INTERVAL+'초마다 구매 판단':'자동 구매 꺼짐';
 $('autoDetails').textContent='다음 대상: '+label+(target?' · '+fmt(target.cost)+' 크레딧':'')+
   ' / 이번 탐사 자동 구매 '+fmt(a.purchases)+'회 · '+fmt(a.spent)+' 크레딧 사용';
}
function renderSquad(){
 updateBuyCount();
 renderAutoBuy();
 $('unitList').innerHTML=E.UNITS.map(u=>{
  const locked=s.best<u.unlock;
  return '<div class="action"><div><strong>'+safe(u.symbol)+' '+safe(u.name)+(locked?' · 미해금':' ×'+fmt(s.units[u.id]))+'</strong><p>'+safe(locked?u.unlock+'거리 도달 시 모집 가능':u.id==='guard'?'전열 유지 · 높은 내구력':u.id==='ranger'?'강력한 단일 화력':'부대 체력 회복')+'</p></div><span class="sub">'+safe(locked?'잠김':'소집 풀')+'</span></div>';
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
 const c=s.contribution;
 $('roleContribution').innerHTML=E.UNITS.map(u=>{
  const id=u.id;
  return '<div class="statline"><span>'+safe(u.name)+'</span><b>피해 '+fmt(c.damage[id])+
   ' · 회복 '+fmt(c.healing[id])+' · 방어 '+fmt(c.taken[id])+
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
function renderArchive(){
 let found=0,copies=0;E.RELICS.forEach(r=>{if(E.relic(s,r.id))found++;copies+=E.relic(s,r.id);});
 $('relicSummary').textContent=found+'/'+E.RELICS.length+' 발견 · '+copies+'개 수집';
 const capped=E.RELICS.reduce((sum,r)=>sum+r.cap,0);
 $('relicCollectionProgress').textContent='발견한 종류 '+found+'/'+E.RELICS.length+
   ' · 보유 '+copies+'/'+capped+'개 (중복 강화 포함) · 미개봉 '+fmt(s.chests)+'상자';
 $('relicList').innerHTML=E.RELICS.map(r=>{
  const n=E.relic(s,r.id);
  return '<div class="relic '+(n?'owned':'')+'"><div class="glyph" aria-hidden="true">'+(n?'✦':'◇')+'</div>'+
   '<strong>'+safe(n?r.name:'아직 발견하지 않은 유물')+'</strong><small>'+safe(n?r.desc:'다음 탐사에서 새로운 유물을 찾아보자')+'</small>'+
   '<div class="count">'+(n?'보유 '+n+' / 상한 '+r.cap:'미발견 · '+r.unlockStage+'거리 상자에서 등장')+'</div></div>';
 }).join('');
 $('openArchiveChest').hidden=s.chests<1;
 $('openArchiveChest').textContent='상자 1개 열기';
 $('openArchiveBatch').hidden=s.chests<2;
 $('openArchiveBatch').textContent='상자 '+fmt(Math.min(20,s.chests))+'개 함께 열기'+(s.chests>20?' (나머지 보관)':'');
 $('relicRecent').innerHTML=s.relicHistory.length?s.relicHistory.slice(-8).reverse().map(r=>{
  const data=E.RELICS.find(x=>x.id===r.id);
  const label=(data?(r.duplicate?'중복 · ':'첫 발견 · ')+data.name:'해당 상자 등급 수집 완료 · 크레딧 보상')+(r.depth?' · '+r.depth+'거리 상자':'');
  return '<div class="collection-log"><span>'+safe(label)+'</span><strong>'+
   safe(r.id?'×'+r.stack:'+'+fmt(r.credits)+' 크레딧')+'</strong></div>';
 }).join(''):'아직 발견한 유물이 없어.';
 const gain=E.rebirthGain(s);
 const nextDeep=[15,25,30].find(distance=>distance>=s.stage);
 $('rebirthSummary').innerHTML=row('이번 탐사 최고 거리',fmt(s.runBest))+
  row('다음 새 유물 등급',nextDeep?nextDeep+'거리 목표 격파 시 상자':'현재 공개된 모든 깊이 개방')+
  row('귀환 시 코어 획득',fmt(gain)+'개')+row('누적 귀환 횟수',fmt(s.rebirths)+'회')+
  row('보유 영구 코어',fmt(s.cores)+'개');
 $('rebirth').disabled=gain<1;
 $('rebirth').textContent=gain?'귀환하고 코어 '+fmt(gain)+'개 받기':'10거리 이상 도달하면 귀환 가능';
 $('coreSummary').innerHTML=row('전선 코어 · 전투 강화','LV.'+fmt(s.coreUpgrades.valor))+
  row('보급 코어 · 경제 강화','LV.'+fmt(s.coreUpgrades.trade));
 const b=E.permanentBonuses(s);
 const pct=n=>'+'+Math.max(0,(n-1)*100).toFixed(1)+'%';
 $('permanentBonusSummary').innerHTML='<h3>현재 편성 기준 영구 성장 효과</h3>'+
  row('전체 전투 화력',pct(b.attack))+row('부대 최대 체력',pct(b.hp))+
  row('자동 보급 수익',pct(b.income));
 $('coreValor').textContent='전선 강화 · '+E.coreCost(s,'valor')+'코어';
 $('coreTrade').textContent='보급 강화 · '+E.coreCost(s,'trade')+'코어';
 $('coreValor').disabled=s.cores<E.coreCost(s,'valor')||s.coreUpgrades.valor>=30;
 $('coreTrade').disabled=s.cores<E.coreCost(s,'trade')||s.coreUpgrades.trade>=30;
 const duration=seconds=>{const n=Math.floor(seconds||0);return Math.floor(n/3600)+'시간 '+Math.floor(n%3600/60)+'분 '+n%60+'초';};
 $('history').innerHTML='<div class="sub" style="margin:4px 0 10px">이번 탐사: '+safe(duration(s.clock))+
  ' · 수동 구매 '+fmt(s.runMetrics.manualPurchases)+'회 · 자동 구매 '+fmt(s.autoBuy.purchases)+'회 · 상자 개봉 '+fmt(s.runMetrics.chestsOpened)+'개</div>'+
  (s.runHistory.length?'<h3 style="font-size:13px;color:#d6f4ed">최근 귀환 5회</h3>'+s.runHistory.slice().reverse().map((r,i)=>
   '<div class="statline"><span>'+safe('거리 '+r.best+' · '+duration(r.duration))+'</span><b>'+
   safe('수동 '+r.manualPurchases+' / 자동 '+r.autoPurchases+' · 코어 '+r.cores)+'</b></div>').join(''):'')+
  s.events.slice().reverse().map(m=>'<div class="sub" style="padding:5px 0;border-bottom:1px solid #304359">'+safe(m)+'</div>').join('');
 const samples=s.playtest.snapshots.length;
 $('playtestSummary').innerHTML=row('기록한 1분 단위 상태',fmt(samples)+'개')+
  row('지난 오프라인 정산',fmt(Math.floor(s.playtest.offlineSeconds/60))+'분')+
  row('기록된 귀환',fmt(s.runHistory.length)+'회')+
  row('현재 자동 성장',s.autoBuy.enabled?'켜짐 · '+s.autoBuy.mode:'꺼짐');
}
function render(){
 renderBattle();
 if(tab==='squad')renderSquad();
 if(tab==='supply')renderSupply();
 if(tab==='archive')renderArchive();
}
function act(fn,fail){const result=fn();if(result===false||result===null){notify(fail||'아직 실행할 수 없어.');}else save();render();return result;}
let chestOpener=null;
function openChestWithCount(count,source){
 if(s.chests<1){notify('아직 모은 상자가 없어.');render();return;}
 // Reward draws are always sequential and exactly match one-by-one opening.
 const opened=E.openChestBatch(s,count);
 if(!opened.results.length)return;
 chestOpener=source||null;
 save();render();
 const n=opened.results.length;
 $('popupTitle').textContent=n===1?
   (opened.first?'새 유물 발견!':opened.exchanges?'상자 보상 교환':'유물 강화 획득!'):
   n+'개 상자 개봉 · 새 유물 '+opened.first+'종';
 $('popupDesc').textContent=n===1?
   '상자에서 나온 보상은 환생 후에도 남아.':
   '첫 발견 '+opened.first+'개 · 중복 강화 '+opened.duplicates+'개 · 상한 교환 '+opened.exchanges+'개';
 $('popupResults').innerHTML=opened.results.map(r=>{
  const data=E.RELICS.find(x=>x.id===r.id);
  const isNew=data&&!r.duplicate;
  const title=data?data.name:'수집 완료 보상';
  const detail=data?data.desc:'이 상자의 발견 가능 유물이 모두 상한에 도달해서 크레딧으로 교환했어.';
  const countLabel=data?' · '+r.stack+'/'+data.cap+'개 보유':'';
  const depthLabel=r.depth?' · 획득 '+r.depth+'거리 상자':' · 기존 저장 상자';
  const tag=isNew?'첫 발견':data?'중복 강화':'크레딧 교환';
  return '<div class="reward-item'+(isNew?' first':'')+'"><div class="reward-glyph" aria-hidden="true">'+(isNew?'✦':'◇')+
   '</div><div><strong>'+safe(tag+' · '+title)+'</strong><small>'+safe(detail+countLabel+depthLabel+
   (r.credits?' · +'+fmt(r.credits)+' 크레딧':''))+'</small></div></div>';
 }).join('');
 const pct=n=>Math.max(0,(n-1)*100).toFixed(1);
 const delta=(before,after)=>Math.max(0,(after-before)*100).toFixed(1);
 $('popupImpact').textContent='이번 개봉의 영구 효과 변화 · 화력 +'+
  delta(opened.before.attack,opened.after.attack)+'%p · 체력 +'+
  delta(opened.before.hp,opened.after.hp)+'%p · 보급 +'+
  delta(opened.before.income,opened.after.income)+'%p'+
  (opened.credits?' · 크레딧 '+fmt(opened.credits)+' 획득':'')+
  ' (현재 편성 기준)';
 $('relicPopup').hidden=false;
 $('popupClose').focus();
}
function exportPlaytest(){
 // User-initiated local download. No analytics endpoint, device ID or credentials.
 save();
 const data={
  schema:'neon-expedition-playtest-v1',
  exportedAt:new Date().toISOString(),
  origin:'local-user-export',game:'네온 방치단 독립 용병단 탐사 원형',
  note:'자동 전송되지 않은 사용자 기기의 플레이 관찰 기록',
  currentRun:{
   number:s.rebirths+1,seconds:Math.floor(s.clock),distance:s.stage,
   best:s.runBest,credits:s.credits,heroLevel:s.heroLevel,
   training:s.training,units:{...s.units},questLevels:{...s.questLevels},
   chests:s.chests,kills:s.runKills,
   manualGrowthPurchases:s.runMetrics.manualPurchases,
   manualGrowthSpent:s.runMetrics.manualSpent,
   automaticPurchases:s.autoBuy.purchases,
   automaticSpent:s.autoBuy.spent,chestsOpened:s.runMetrics.chestsOpened,
   autoMode:s.autoBuy.enabled?s.autoBuy.mode:'off'
  },
  lifetime:{
   bestDistance:s.best,commanderLevel:s.heroLevel,
   relics:{...s.relics},cores:s.cores,coreUpgrades:{...s.coreUpgrades},
   returns:s.rebirths
  },
  recentReturns:s.runHistory.map(x=>({...x})),
  minuteSnapshots:s.playtest.snapshots.map(x=>({...x})),
  offlineSettledSeconds:s.playtest.offlineSeconds
 };
 const json=JSON.stringify(data,null,2);
 const blob=new Blob([json],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');
 link.href=url;
 link.download='neon-expedition-playtest-'+new Date().toISOString().slice(0,10)+'.json';
 document.body.appendChild(link);
 link.click();
 link.remove();
 // Delay revocation for Android Chrome and other browsers that start downloads asynchronously.
 setTimeout(()=>URL.revokeObjectURL(url),30000);
 notify('플레이 기록 JSON 파일을 생성했어. 기기 다운로드를 확인해 줘.');
 render();
}
function closeRelicPopup(){
 $('relicPopup').hidden=true;
 render();
 const target=chestOpener&&!chestOpener.hidden?chestOpener:document.querySelector('[data-tab="archive"]');
 if(target)target.focus();
 chestOpener=null;
}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>screen(b.dataset.tab)));
function cyclePurchaseCount(){buyCount=buyCount===1?5:buyCount===5?10:1;updateBuyCount();render();}
$('autoMode').addEventListener('change',e=>{
 if(E.setAutoBuy(s,e.target.value,s.autoBuy.enabled)){save();render();}
});
$('autoToggle').addEventListener('click',()=>{
 E.setAutoBuy(s,s.autoBuy.mode,!s.autoBuy.enabled);
 save();render();
});
$('buyCountSquad').addEventListener('click',cyclePurchaseCount);
$('buyCountSupply').addEventListener('click',cyclePurchaseCount);
$('hire').addEventListener('click',()=>doPurchase('recruit'));
$('train').addEventListener('click',()=>doPurchase('train'));
$('questList').addEventListener('click',e=>{const b=e.target.closest('[data-quest]');if(b)doPurchase('quest',b.dataset.quest);});
$('traitCommand').addEventListener('click',()=>act(()=>E.buyTrait(s,'command'),'사용할 특성 포인트가 없어.'));
$('traitSupply').addEventListener('click',()=>act(()=>E.buyTrait(s,'supply'),'사용할 특성 포인트가 없어.'));
$('coreValor').addEventListener('click',()=>act(()=>E.buyCore(s,'valor'),'코어가 부족해.'));
$('coreTrade').addEventListener('click',()=>act(()=>E.buyCore(s,'trade'),'코어가 부족해.'));
$('openChest').addEventListener('click',e=>openChestWithCount(1,e.currentTarget));
$('openArchiveChest').addEventListener('click',e=>openChestWithCount(1,e.currentTarget));
$('openArchiveBatch').addEventListener('click',e=>openChestWithCount(20,e.currentTarget));
$('popupClose').addEventListener('click',closeRelicPopup);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('relicPopup').hidden)closeRelicPopup();});
$('rebirth').addEventListener('click',()=>{
 const gain=E.rebirthGain(s);
 if(!gain)return;
 if(!confirm('이번 탐사 병력·훈련·의뢰 레벨이 초기화돼. 유물과 지휘관 레벨은 남아. '+gain+'코어를 얻고 귀환할까?'))return;
 act(()=>E.rebirth(s));screen('battle');
});
$('saveNow').addEventListener('click',()=>{if(save())notify('탐사 기록 저장 완료');render();});
$('exportPlaytest').addEventListener('click',exportPlaytest);
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){save();}
 else{const elapsed=E.offline(s,Date.now());if(elapsed>1)notify('복귀 정산: '+fmt(elapsed)+'초 탐사');lastFrame=performance.now();save();render();}
});
window.addEventListener('pagehide',save);
setInterval(()=>{
 if(document.hidden)return;
 const now=performance.now(),elapsed=Math.min(2,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
 E.tick(s,elapsed);
 if(Date.now()-saveAt>5000)save();
 render();
},350);
render();
})();