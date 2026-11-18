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
let saveAt=Date.now(),lastFrame=performance.now(),toast=startup?'오프라인 '+Math.floor(startup/60)+'분 '+(startup%60)+'초 정산 완료':'',toastUntil=Date.now()+5000;
function notify(message){toast=message;toastUntil=Date.now()+4000;}
function save(){try{s.lastSaved=Date.now();localStorage.setItem(E.SAVE_KEY,JSON.stringify(s));saveAt=Date.now();return true;}catch(err){notify('저장 오류: 브라우저 저장 공간을 확인해 줘');return false;}}
function row(label,value){return '<div class="statline"><span>'+safe(label)+'</span><b>'+safe(value)+'</b></div>';}
function ratio(x,max){return Math.max(0,Math.min(100,100*x/Math.max(1,max)))+'%';}
// The controller knows only the UI interface, not its markup or visual skin.
const view=window.ExpeditionUI;
if(!view||typeof view.create!=='function')throw Error('Missing replaceable expedition UI adapter');
const UI=view.create({engine:E,state:s,byId:$,fmt,safe,row,ratio,
 getBuyCount:()=>buyCount,getNotice:()=>({text:toast,until:toastUntil})});
const {screen,renderBattle,renderPanel,render,updateBuyCount,returnReportHtml}=UI;
function doPurchase(kind,id=null){
 const result=E.purchase(s,kind,buyCount,id);
 if(result.count===0){notify('구매 가능한 단계가 없어. 크레딧이나 해금 상태를 확인해 줘.');}
 else{
  save();
  if(result.count>1)notify(result.count+'회 구매 · '+fmt(result.spent)+' 크레딧 사용');
 }
 render();
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
  delta(opened.before.income,opened.after.income)+'%p · 소집 비용 절약 +'+
  delta(opened.after.hireCost,opened.before.hireCost)+'%p · 훈련 비용 절약 +'+
  delta(opened.after.trainCost,opened.before.trainCost)+'%p'+
  (opened.credits?' · 크레딧 '+fmt(opened.credits)+' 획득':'')+
  ' (현재 편성 기준)';
 $('relicPopup').hidden=false;
 $('popupClose').focus();
}
function downloadJson(name,data){
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=name;
 document.body.appendChild(a);a.click();a.remove();
 // Android browsers can defer download start.
 setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function exportFullSave(){
 // This is deliberately a human-requested backup, never an auto-upload.
 save();
 downloadJson('neon-expedition-full-save-'+new Date().toISOString().slice(0,10)+'.json',{
  schema:'neon-expedition-full-save-v1',saveKey:E.SAVE_KEY,
  exportedAt:new Date().toISOString(),state:JSON.parse(JSON.stringify(s))
 });
 notify('용병단 저장 백업 파일을 만들었어. 다운로드 폴더에서 확인해 줘.');
 render();
}
async function importFullSave(file){
 if(!file)return;
 if(file.size>4*1024*1024){notify('저장 파일이 4MB를 초과해서 가져올 수 없어.');render();return;}
 let decoded;
 try{
  const input=JSON.parse(await file.text());
  if(input?.schema!=='neon-expedition-full-save-v1'||
     input.saveKey!==E.SAVE_KEY||input.state?.version!==E.VERSION)throw Error('unsupported-backup');
  decoded=E.normalize(input.state,Date.now());
 }catch(err){
  notify('올바른 용병단 전체 저장 백업 JSON 파일이 아니야.');
  render();return;
 }
 const relicKinds=E.RELICS.filter(r=>E.relic(decoded,r.id)>0).length;
 if(!confirm('가져올 저장: 최고 '+fmt(decoded.best)+'거리 · 유물 '+relicKinds+'종 · 환생 '+fmt(decoded.rebirths)+'회. 현재 용병단 저장을 덮어쓸까?'))return;
 // Import is a new session event, not an offline catch-up from the old file's
 // export time. Prevent credit/reward duplication on stale backups.
 Object.assign(s,decoded);s.lastSaved=Date.now();
 const persistent=save();
 screen('squad');
 notify(persistent?'백업을 복원했어.':'임시 복원했어. 이 브라우저는 자동 저장이 불가능하므로 전체 저장 백업을 다시 내려받아 줘.');
 render();
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
   autoMode:s.autoBuy.enabled?s.autoBuy.mode:'off',
   pendingReturnProgress:s.coreProgress,carryReturnFraction:s.coreReserve,
   milestoneClears:{...s.runMilestones}
  },
  lifetime:{
   bestDistance:s.best,commanderLevel:s.heroLevel,
   relics:{...s.relics},cores:s.cores,coreUpgrades:{...s.coreUpgrades},
   returns:s.rebirths
  },
  recentReturns:s.runHistory.map(x=>({...x})),
  latestReturnComparison:s.latestReturn?{...s.latestReturn,before:s.latestReturn.before?{...s.latestReturn.before}:null,after:s.latestReturn.after?{...s.latestReturn.after}:null}:null,
  currentRunOpening:s.runOpening?{...s.runOpening}:null,
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
function showReturnPopup(){
 if(!s.latestReturn)return;
 $('returnPopupSummary').innerHTML=returnReportHtml(s.latestReturn);
 $('returnPopup').hidden=false;
 $('returnPopupClose').focus();
}
function closeReturnPopup(destination){
 $('returnPopup').hidden=true;
 if(destination==='return'){
  screen('return');
  $('returnReportPanel').focus();
 }else{
  screen('squad');
  document.querySelector('[data-tab="squad"]').focus();
 }
}
$('returnPopupClose').addEventListener('click',()=>closeReturnPopup('battle'));
$('returnPopupArchive').addEventListener('click',()=>closeReturnPopup('return'));
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!$('returnPopup').hidden)closeReturnPopup('battle');
});
$('returnQuick').addEventListener('click',()=>screen('return'));
$('rebirth').addEventListener('click',()=>{
 const gain=E.rebirthGain(s);
 if(!gain)return;
 if(!confirm('이번 탐사 병력·훈련·의뢰 레벨이 초기화돼. 유물과 지휘관 레벨은 남아. 기본 '+E.rebirthRewards(s).base+'코어 + 최초 기록 '+E.rebirthRewards(s).recordBonus+'코어 = 총 '+gain+'코어를 얻고 귀환할까?'))return;
 const returned=act(()=>E.rebirth(s));if(!returned)return;
 screen('squad');showReturnPopup();
});
$('saveNow').addEventListener('click',()=>{if(save())notify('탐사 기록 저장 완료');render();});
$('exportPlaytest').addEventListener('click',exportPlaytest);
$('exportSave').addEventListener('click',exportFullSave);
$('importSave').addEventListener('click',()=>$('importSaveFile').click());
$('importSaveFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];e.target.value='';
 await importFullSave(file);
});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){save();}
 else{const elapsed=E.offline(s,Date.now());if(elapsed>1)notify('복귀 정산: '+fmt(elapsed)+'초 탐사');lastFrame=performance.now();save();render();}
});
window.addEventListener('pagehide',save);
let lastPassiveRender=0;
setInterval(()=>{
 if(document.hidden)return;
 const now=performance.now(),elapsed=Math.min(2,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
 E.tick(s,elapsed);
 if(Date.now()-saveAt>5000)save();
 // Always draw the live battlefield at 350ms even while the player scrolls
 // growth, supply, relics or return. Only the scrollable menu is throttled.
 renderBattle();
 if(now-lastPassiveRender>=1200){lastPassiveRender=now;renderPanel();}
},350);
render();
})();