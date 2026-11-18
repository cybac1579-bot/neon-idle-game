/* 실제 엔진 개별 용병 상태를 전장에 투영. CSS 자리표시 그래픽이며 별도 전투 시뮬레이션은 하지 않는다. */
(function(root){
'use strict';
const E=root.ExpeditionEngine;
if(!E)return;
const $=id=>document.getElementById(id);
const field=$('squad'),arena=document.querySelector('.arena');
if(!field||!arena)return;
const fx=document.createElement('div');fx.id='battleFx';fx.setAttribute('aria-hidden','true');arena.appendChild(fx);
const rosterNote=document.createElement('div');rosterNote.className='roster-note';rosterNote.hidden=true;arena.appendChild(rosterNote);
const enemyIntent=document.createElement('div');enemyIntent.className='enemy-intent';enemyIntent.hidden=true;enemyIntent.setAttribute('aria-live','off');arena.appendChild(enemyIntent);
let visibleKey='',lastCue=-1;
const safe=n=>Math.max(0,Math.min(100,Number(n)||0));
const selected=s=>{
 const pick=[],counts={guard:0,ranger:0,medic:0},limits={guard:3,ranger:3,medic:2};
 (s.actors||[]).forEach((a,index)=>{
  if(counts[a.id]<limits[a.id]){pick.push({a,index});counts[a.id]++;}
 });
 return pick;
};
function sync(s){
 const shown=selected(s);
 const key=shown.map(x=>x.index+':'+x.a.id).join('|');
 if(key!==visibleKey){
  field.replaceChildren();
  for(const {a,index} of shown){
   const u=E.UNITS.find(u=>u.id===a.id);
   const node=document.createElement('div');
   node.className='fighter '+a.id;
   node.dataset.actorIndex=String(index);
   node.innerHTML='<div class="fighter-symbol" aria-hidden="true">'+u.symbol+'</div><div class="fighter-health"><div></div></div><span class="fighter-name">'+u.name+'</span>';
   field.appendChild(node);
  }
  visibleKey=key;
 }
 shown.forEach(({a,index},i)=>{
  const el=field.querySelector('[data-actor-index="'+index+'"]');if(!el)return;
  const lane=a.id==='guard'?i%3:a.id==='ranger'?i%3:i%2;
  // Formation lanes are deliberately separated by roughly a full fighter
  // height in the compact persistent arena. The former 7–8% lane gaps
  // stacked duplicate names/health bars directly on top of each other.
  const x=a.id==='guard'?7+safe(a.progress)*55+lane*2:
   a.id==='ranger'?3+safe(a.progress)*33+lane*4:
   2+safe(a.progress)*24+lane*5;
  el.style.left=x+'%';
  el.style.bottom=(a.id==='guard'?5+lane*31:
   a.id==='ranger'?12+lane*28:
   16+lane*30)+'%';
  const down=a.revive>0||a.hp<=0;
  el.classList.toggle('down',down);
  el.classList.toggle('advance',!down&&a.progress<.83);
  const bar=el.querySelector('.fighter-health>div');
  if(bar)bar.style.width=(down?0:safe(a.hp/E.actorMaxHp(s,a.id)*100))+'%';
  el.title=a.id+' HP '+Math.floor(a.hp)+' / '+Math.floor(E.actorMaxHp(s,a.id))+(down?' · 재합류 '+a.revive.toFixed(1)+'초':'');
 });
 const extra=Math.max(0,(s.actors||[]).length-shown.length);
 rosterNote.hidden=extra===0;
 if(extra)rosterNote.textContent='전투원 '+shown.length+'명 표시 · 후방 '+extra+'명';
 arena.classList.toggle('arena-boss',E.isBoss(s.stage));
 const intent=s.enemyTactic;
 const aiming=intent?.stage===s.stage&&intent.phase==='windup';
 const last=intent?.stage===s.stage&&intent.phase==='fired'&&intent.flash>0;
 const rushing=intent?.kind==='charger';
 enemyIntent.hidden=!(aiming||last);
 enemyIntent.classList.toggle('aiming',!!aiming);
 enemyIntent.classList.toggle('charging',!!rushing);
 enemyIntent.classList.toggle('intercepted',!!last&&(intent?.result==='intercept'||intent?.result==='brace'));
 if(aiming)enemyIntent.textContent=rushing?'⚠ 돌격병 전열 돌진 · '+Math.ceil(intent.windup)+'초':'⚠ 적 측면 조준 · '+Math.ceil(intent.windup)+'초';
 else if(last)enemyIntent.textContent=rushing?
   (intent.result==='brace'?'🛡 철벽 진형 · 돌진 저지':'↗ 돌격 충격 · 방벽병 밀려남'):
   (intent.result==='intercept'?'🛡 방벽 호위 · 사수 반격 성공':'⚡ 적 후열 집중 타격');
 else enemyIntent.textContent='';
 if(s.battleCueSeq===lastCue||!s.battleEvent)return;
 lastCue=s.battleCueSeq;
 const evt=s.battleEvent,unit=E.UNITS.find(u=>u.id===evt.id);
 fx.replaceChildren();
 const cue=document.createElement('span');
 cue.className='combat-cue '+evt.type;
 if(evt.type==='hit')cue.textContent='-'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='volley')cue.textContent='정밀 사격! -'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='triage')cue.textContent='긴급 회수! · 복귀 '+evt.value.toFixed(1)+'초 단축';
 else if(evt.type==='intel')cue.textContent='탐사 정보망 · 새 조사 보상!';
 else if(evt.type==='aim')cue.textContent='적 측면 조준 · 후열 경계!';
 else if(evt.type==='flank')cue.textContent='측면 타격! 후열 -'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='intercept')cue.textContent='호위 반격! -'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='rush-aim')cue.textContent='돌격 예고! 전열 경계';
 else if(evt.type==='rush')cue.textContent='돌격 충격! 방벽병 밀려남';
 else if(evt.type==='brace')cue.textContent='철벽 진형! 자동 반격 -'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='heal')cue.textContent='+'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='fallen')cue.textContent=(unit?.name||'용병')+' 후퇴';
 else if(evt.type==='returned')cue.textContent=(unit?.name||'용병')+' 재합류';
 else if(evt.type==='clear')cue.textContent='전선 돌파!';
 else if(evt.type==='rally')cue.textContent='부대 재정비';
 fx.appendChild(cue);
 arena.classList.remove('combat-impact');void arena.offsetWidth;
 if(evt.type==='hit'||evt.type==='clear'||evt.type==='flank'||evt.type==='intercept'||evt.type==='rush'||evt.type==='brace')arena.classList.add('combat-impact');
}
root.ExpeditionField={sync};
})(window);
