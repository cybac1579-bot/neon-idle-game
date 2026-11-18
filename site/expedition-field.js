/* 실제 엔진 개별 용병 상태를 전장에 투영. CSS 자리표시 그래픽이며 별도 전투 시뮬레이션은 하지 않는다. */
(function(root){
'use strict';
const E=root.ExpeditionEngine;
if(!E)return;
const $=id=>document.getElementById(id);
const field=$('squad'),arena=document.querySelector('.arena');
if(!field||!arena)return;
const fx=document.createElement('div');fx.id='battleFx';fx.setAttribute('aria-hidden','true');arena.appendChild(fx);
// This layer mirrors real battleEvent cues. It neither ticks the game nor
// invents combat attacks, rewards or relic activations for decoration.
const motion=document.createElement('div');motion.id='battleMotion';motion.setAttribute('aria-hidden','true');arena.appendChild(motion);
const rosterNote=document.createElement('div');rosterNote.className='roster-note';rosterNote.hidden=true;arena.appendChild(rosterNote);
const enemyIntent=document.createElement('div');enemyIntent.className='enemy-intent';enemyIntent.hidden=true;enemyIntent.setAttribute('aria-live','off');arena.appendChild(enemyIntent);
let visibleKey='',lastCue=-1;
const offensive=new Set(['hit','volley','intercept','intercept-duet','diagram','brace','unjam']);
const incoming=new Set(['flank','rush','jam']);
const warning=new Set(['aim','rush-aim','jam-aim']);
const defense=new Set(['cover-step','brace-step']);
const support=new Set(['heal','triage','returned']);
const centerOf=node=>{
 if(!node)return null;
 const base=arena.getBoundingClientRect(),rect=node.getBoundingClientRect();
 return {x:rect.left-base.left+rect.width/2,y:rect.top-base.top+rect.height/2};
};
function showMotion(evt){
 motion.replaceChildren();
 const kind=evt.type;
 // Every effect must come from a committed battle cue. A repeated UI render
 // never replays the animation, and unknown events leave the layer empty.
 if(!offensive.has(kind)&&!incoming.has(kind)&&!warning.has(kind)&&
    !defense.has(kind)&&!support.has(kind)&&
    !['clear','intel','pursuit','fallen','rally'].includes(kind))return;
 const fighter=id=>field.querySelector('.fighter.'+id+':not(.down)')||
   field.querySelector('.fighter.'+id);
 const foe=arena.querySelector('.foe .silhouette');
 const guard=fighter('guard'),ranger=fighter('ranger'),medic=fighter('medic');
 const from=offensive.has(kind)?(kind==='intercept'||kind==='intercept-duet'?ranger||guard:fighter(evt.id)):
    incoming.has(kind)||warning.has(kind)?foe:support.has(kind)?medic:null;
 const target=offensive.has(kind)?foe:
   (incoming.has(kind)||warning.has(kind))?fighter(evt.id):
   support.has(kind)?fighter(evt.id):defense.has(kind)?guard:null;
 const p1=centerOf(from),p2=centerOf(target);
 const emphasis=kind==='volley'?'volley':
  kind==='diagram'?'diagram':
  kind==='intercept'||kind==='intercept-duet'?'counter':
  kind==='brace'||kind==='cover-step'||kind==='brace-step'?'shield':
  kind==='heal'||kind==='triage'||kind==='returned'?'heal':
  kind==='rush'||kind==='rush-aim'?'rush':
  kind==='jam'||kind==='jam-aim'?'jam':
  kind==='aim'||kind==='flank'?'danger':kind==='clear'||kind==='intel'?'reward':'normal';
 if(p1&&p2&&p1.x!==p2.x){
  const trail=document.createElement('span'),dx=p2.x-p1.x,dy=p2.y-p1.y;
  trail.className='battle-trail '+emphasis+(warning.has(kind)?' telegraph':'');
  trail.style.left=p1.x+'px';trail.style.top=p1.y+'px';
  trail.style.width=Math.hypot(dx,dy)+'px';
  trail.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';
  motion.appendChild(trail);
 }
 const focus=p2||centerOf(foe)||{x:arena.clientWidth/2,y:arena.clientHeight/2};
 const burst=document.createElement('span');
 burst.className='battle-burst '+emphasis+
  (kind==='clear'&&E.isElite(evt.value)?' breakthrough':'');
 burst.style.left=focus.x+'px';burst.style.top=focus.y+'px';
 motion.appendChild(burst);
}
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
   node.innerHTML='<div class="fighter-symbol" aria-hidden="true"><span class="actor-head"></span><span class="actor-body"></span><span class="actor-tool"></span><span class="actor-emblem">'+u.symbol+'</span></div><div class="fighter-health"><div></div></div><span class="fighter-name">'+u.name+'</span>';
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
 const rushing=intent?.kind==='charger'||intent?.move==='rush'&&intent?.kind!=='disruptor';
 const commanderSurge=rushing&&intent?.kind!=='charger';
 const disrupting=intent?.kind==='disruptor';
 // Second-phase status reuses the existing narrow intent strip.
 const chasing=E.pursuitBoost(s)>1;
 // Keep a real, one-shot diagram hit legible when a normal battle event
 // overwrites its tiny combat cue. Attack windups always take priority.
 const diagramNotice=intent?.stage===s.stage&&intent.diagramFlash>0&&!aiming;
 enemyIntent.hidden=!(aiming||last||chasing||diagramNotice);
 enemyIntent.classList.toggle('aiming',!!aiming);
 enemyIntent.classList.toggle('charging',!!rushing&&!diagramNotice);
 enemyIntent.classList.toggle('disrupting',!!disrupting&&!diagramNotice);
 enemyIntent.classList.toggle('intercepted',!!last&&!diagramNotice&&(intent?.result==='intercept'||intent?.result==='cover-step'||intent?.result==='brace'||intent?.result==='unjam'));
 if(aiming)enemyIntent.textContent=rushing?(commanderSurge?'⚠ 지휘급 전열 압박 · ':'⚠ 돌격병 전열 돌진 · ')+Math.ceil(intent.windup)+'초':disrupting?'⚠ 교란 사수 원거리 조준 · '+Math.ceil(intent.windup)+'초':'⚠ 적 측면 조준 · '+Math.ceil(intent.windup)+'초';
 else if(diagramNotice)enemyIntent.textContent='✦ 전장 도해 · 약점 균열 타격 발동';
 else if(last)enemyIntent.textContent=rushing?
   (intent.result==='brace'?'🛡 철벽 진형 · 돌진 저지':intent.result==='brace-step'?'🛡 합금 배지 · 돌진 부분 버팀':commanderSurge?'↗ 지휘급 전열 압박 · 방벽병 밀려남':'↗ 돌격 충격 · 방벽병 밀려남'):
   disrupting?(intent.result==='unjam'?'✚ 역통신 반격 · 교란 무효':'◎ 교란 사격 · 사수 공격 지연'):
   (intent.result==='intercept'?'🛡 방벽 호위 · 사수 반격 성공':intent.result==='cover-step'?'🛡 호위 계약서 · 후열 절반 엄호':'⚡ 적 후열 집중 타격');
 else if(chasing)enemyIntent.textContent='⚡ 추격 신호기 · 후반전 화력 +60%';
 else enemyIntent.textContent='';
 if(s.battleCueSeq===lastCue||!s.battleEvent)return;
 lastCue=s.battleCueSeq;
 const evt=s.battleEvent,unit=E.UNITS.find(u=>u.id===evt.id);
 // Distinct event-linked motion is a presentation of the combat engine only.
 showMotion(evt);
 fx.replaceChildren();
 const cue=document.createElement('span');
 cue.className='combat-cue '+evt.type;
 if(evt.type==='hit')cue.textContent='-'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='volley')cue.textContent='정밀 사격 +'+(45*E.relic(s,'archer'))+'% · -'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='pursuit')cue.textContent='추격 신호기! 지휘급 적 후반 화력 +60%';
 else if(evt.type==='diagram')cue.textContent='전장 도해! 균열 타격 -'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='triage')cue.textContent='긴급 회수! · 복귀 '+evt.value.toFixed(1)+'초 단축';
 else if(evt.type==='intel')cue.textContent='탐사 정보망 · 새 조사 보상!';
 else if(evt.type==='aim')cue.textContent='적 측면 조준 · 후열 경계!';
 else if(evt.type==='flank')cue.textContent='측면 타격! 후열 -'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='cover-step')cue.textContent='호위 계약서! 후열 공격 절반 엄호';
 else if(evt.type==='intercept')cue.textContent='호위 반격! -'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='intercept-duet')cue.textContent='호위 협공! 2인 연계 -'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='rush-aim')cue.textContent='돌격 예고! 전열 경계';
 else if(evt.type==='rush')cue.textContent='돌격 충격! 방벽병 밀려남';
 else if(evt.type==='brace')cue.textContent='철벽 진형! 자동 반격 -'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='brace-step')cue.textContent='합금 배지! 돌진 부분 버팀';
 else if(evt.type==='jam-aim')cue.textContent='원거리 교란 조준! 사수 경계';
 else if(evt.type==='jam')cue.textContent='교란 사격! 다음 사격 +'+evt.value.toFixed(2)+'초';
 else if(evt.type==='unjam')cue.textContent='역통신 반격! -'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='heal')cue.textContent='+'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='fallen')cue.textContent=(unit?.name||'용병')+' 후퇴';
 else if(evt.type==='returned')cue.textContent=(unit?.name||'용병')+' 재합류';
 else if(evt.type==='clear')cue.textContent=E.isElite(evt.value)?
  (E.isBoss(evt.value)?'지휘급 격파 · 보급 상자 획득!':'정예 격파 · 보급 상자 획득!'):'전선 돌파!';
 else if(evt.type==='rally')cue.textContent='부대 재정비';
 fx.appendChild(cue);
 arena.classList.remove('combat-impact');void arena.offsetWidth;
 if(evt.type==='hit'||evt.type==='volley'||evt.type==='clear'||evt.type==='flank'||evt.type==='intercept'||evt.type==='cover-step'||evt.type==='intercept-duet'||evt.type==='diagram'||evt.type==='rush'||evt.type==='brace'||evt.type==='brace-step'||evt.type==='jam'||evt.type==='unjam')arena.classList.add('combat-impact');
}
root.ExpeditionField={sync};
})(window);
