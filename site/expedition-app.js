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
 $('squad').innerHTML=E.UNITS.filter(u=>s.units[u.id]>0).map(u=>'<div class="unit '+u.id+'"><div class="silhouette" aria-hidden="true">'+safe(u.symbol)+'</div><small>'+safe(u.name)+' ×'+fmt(s.units[u.id])+'</small></div>').join('');
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
   (s.respawn>0?row('재정비 중',s.respawn.toFixed(1)+'초'):'');
}
function renderSquad(){
 $('unitList').innerHTML=E.UNITS.map(u=>{
  const locked=s.best<u.unlock;
  return '<div class="action"><div><strong>'+safe(u.symbol)+' '+safe(u.name)+(locked?' · 미해금':' ×'+fmt(s.units[u.id]))+'</strong><p>'+safe(locked?u.unlock+'거리 도달 시 모집 가능':u.id==='guard'?'전열 유지 · 높은 내구력':u.id==='ranger'?'강력한 단일 화력':'부대 체력 회복')+'</p></div><span class="sub">'+safe(locked?'잠김':'소집 풀')+'</span></div>';
 }).join('');
 const recruitCost=E.hireCost(s);
 $('hire').textContent='용병 1명 소집 · '+fmt(recruitCost)+' 크레딧';
 $('hire').disabled=s.credits<recruitCost;
 $('trainingSummary').innerHTML='<span>공통 훈련 LV.'+fmt(s.training)+'</span><b>피해·내구 상승</b>';
 $('train').textContent='훈련 강화 · '+fmt(E.trainCost(s))+' 크레딧';
 $('train').disabled=s.credits<E.trainCost(s);
 const remaining=E.traitRemaining(s);
 $('heroSummary').innerHTML=row('지휘관 레벨 / 누적 경험치','LV.'+fmt(s.heroLevel)+' / '+fmt(s.heroXp))+
  row('다음 레벨 필요 경험치',fmt(E.xpNeeded(s.heroLevel)))+row('미사용 특성 포인트',fmt(remaining))+
  row('전술 통솔 / 보급 지휘',fmt(s.traits.command)+' / '+fmt(s.traits.supply));
 $('traitCommand').textContent='전술 통솔 +6% (LV.'+s.traits.command+')';
 $('traitSupply').textContent='보급 지휘 +8% (LV.'+s.traits.supply+')';
 $('traitCommand').disabled=remaining<1||s.traits.command>=10;
 $('traitSupply').disabled=remaining<1||s.traits.supply>=10;
}
function renderSupply(){
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
 $('relicList').innerHTML=E.RELICS.map(r=>{
  const n=E.relic(s,r.id);
  return '<div class="relic '+(n?'owned':'')+'"><div class="glyph" aria-hidden="true">'+(n?'✦':'◇')+'</div>'+
   '<strong>'+safe(n?r.name:'아직 발견하지 않은 유물')+'</strong><small>'+safe(n?r.desc:'다음 탐사에서 새로운 유물을 찾아보자')+'</small>'+
   '<div class="count">'+(n?'보유 '+n+' / 상한 '+r.cap:'미발견')+'</div></div>';
 }).join('');
 $('openArchiveChest').hidden=s.chests<1;
 $('openArchiveChest').textContent='보급 상자 '+fmt(s.chests)+'개 열기';
 const gain=E.rebirthGain(s);
 $('rebirthSummary').innerHTML=row('이번 탐사 최고 거리',fmt(s.runBest))+
  row('귀환 시 코어 획득',fmt(gain)+'개')+row('누적 귀환 횟수',fmt(s.rebirths)+'회')+
  row('보유 영구 코어',fmt(s.cores)+'개');
 $('rebirth').disabled=gain<1;
 $('rebirth').textContent=gain?'귀환하고 코어 '+fmt(gain)+'개 받기':'10거리 이상 도달하면 귀환 가능';
 $('coreSummary').innerHTML=row('전선 코어 · 전투 강화','LV.'+fmt(s.coreUpgrades.valor))+
  row('보급 코어 · 경제 강화','LV.'+fmt(s.coreUpgrades.trade));
 $('coreValor').textContent='전선 강화 · '+E.coreCost(s,'valor')+'코어';
 $('coreTrade').textContent='보급 강화 · '+E.coreCost(s,'trade')+'코어';
 $('coreValor').disabled=s.cores<E.coreCost(s,'valor')||s.coreUpgrades.valor>=30;
 $('coreTrade').disabled=s.cores<E.coreCost(s,'trade')||s.coreUpgrades.trade>=30;
 $('history').innerHTML=s.events.slice().reverse().map(m=>'<div class="sub" style="padding:5px 0;border-bottom:1px solid #304359">'+safe(m)+'</div>').join('');
}
function render(){
 renderBattle();
 if(tab==='squad')renderSquad();
 if(tab==='supply')renderSupply();
 if(tab==='archive')renderArchive();
}
function act(fn,fail){const result=fn();if(result===false||result===null){notify(fail||'아직 실행할 수 없어.');}else save();render();return result;}
function openChest(){
 const result=act(()=>E.openChest(s),'보급 상자가 없어.');
 if(result&&result.id){
  const data=E.RELICS.find(r=>r.id===result.id);
  $('popupTitle').textContent=(result.duplicate?'중복 발견 · ':'첫 발견! ')+data.name;
  $('popupDesc').textContent=data.desc+' · 누적 '+E.relic(s,result.id)+'개';
  $('relicPopup').hidden=false;
  $('popupClose').focus();
 }
}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>screen(b.dataset.tab)));
$('hire').addEventListener('click',()=>act(()=>E.recruit(s),'크레딧이 부족해.'));
$('train').addEventListener('click',()=>act(()=>E.train(s),'크레딧이 부족해.'));
$('questList').addEventListener('click',e=>{const b=e.target.closest('[data-quest]');if(b)act(()=>E.upgradeQuest(s,b.dataset.quest),'의뢰를 강화할 수 없어.');});
$('traitCommand').addEventListener('click',()=>act(()=>E.buyTrait(s,'command'),'사용할 특성 포인트가 없어.'));
$('traitSupply').addEventListener('click',()=>act(()=>E.buyTrait(s,'supply'),'사용할 특성 포인트가 없어.'));
$('coreValor').addEventListener('click',()=>act(()=>E.buyCore(s,'valor'),'코어가 부족해.'));
$('coreTrade').addEventListener('click',()=>act(()=>E.buyCore(s,'trade'),'코어가 부족해.'));
$('openChest').addEventListener('click',openChest);
$('openArchiveChest').addEventListener('click',openChest);
$('popupClose').addEventListener('click',()=>{$('relicPopup').hidden=true;render();});
$('rebirth').addEventListener('click',()=>{
 const gain=E.rebirthGain(s);
 if(!gain)return;
 if(!confirm('이번 탐사 병력·훈련·의뢰 레벨이 초기화돼. 유물과 지휘관 레벨은 남아. '+gain+'코어를 얻고 귀환할까?'))return;
 act(()=>E.rebirth(s));screen('battle');
});
$('saveNow').addEventListener('click',()=>{if(save())notify('탐사 기록 저장 완료');render();});
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