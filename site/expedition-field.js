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
const growth=document.createElement('div');growth.id='battleGrowth';growth.className='battle-growth';
growth.setAttribute('aria-hidden','true');arena.appendChild(growth);
// Keep actual elite/boss chest milestones independent of automatic growth cues.
const reward=document.createElement('div');reward.id='battleReward';reward.className='battle-growth';
reward.setAttribute('aria-hidden','true');arena.appendChild(reward);
let previousRoster=null,previousTraining=null;
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
 const kind=evt.type;
 // Unrecognised/metadata events must not erase an ongoing real combat cue.
 // Only a new drawable event replaces the previous transient motion.
 if(!offensive.has(kind)&&!incoming.has(kind)&&!warning.has(kind)&&
    !defense.has(kind)&&!support.has(kind)&&
    !['clear','intel','pursuit','fallen','rally'].includes(kind))return;
 motion.replaceChildren();
 const fighter=id=>field.querySelector('.fighter.'+id+':not(.down)')||
   field.querySelector('.fighter.'+id);
 const foe=arena.querySelector('.foe .silhouette');
 const guard=fighter('guard'),ranger=fighter('ranger'),medic=fighter('medic');
 const target=fighter(evt.id);
 const point=node=>centerOf(node);
 const trail=(origin,destination,style,telegraph=false)=>{
  const a=point(origin),b=point(destination);
  if(!a||!b||Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<1)return;
  const el=document.createElement('span'),dx=b.x-a.x,dy=b.y-a.y;
  el.className='battle-trail '+style+(telegraph?' telegraph':'');
  el.style.left=a.x+'px';el.style.top=a.y+'px';
  el.style.width=Math.hypot(dx,dy)+'px';
  el.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';
  motion.appendChild(el);
 };
 const burst=(node,style,extra='')=>{
  const p=point(node)||{x:arena.clientWidth/2,y:arena.clientHeight/2};
  const el=document.createElement('span');
  el.className='battle-burst '+style+(extra?' '+extra:'');
  el.style.left=p.x+'px';el.style.top=p.y+'px';
  motion.appendChild(el);
 };
 // A guard's ordinary strike is a melee contact, never a projectile.
 // Special interception protects the front guard while two real rear
 // rangers may counterattack: the animation must reflect both actions.
 field.querySelectorAll('.battle-acting').forEach(el=>el.classList.remove('battle-acting'));
 const pose=node=>{
  const actor=node?.closest('.fighter');
  if(actor){void actor.offsetWidth;actor.classList.add('battle-acting');}
 };
 switch(kind){
 case 'hit':
  pose(target);
  if(evt.id==='ranger')trail(target,foe,'normal');
  if(evt.id==='medic')trail(target,foe,'normal');
  burst(foe,'normal');
  break;
 case 'volley':
  pose(ranger);trail(ranger,foe,'volley');burst(foe,'volley');
  break;
 case 'intercept':
 case 'intercept-duet':{
  burst(guard,'shield');
  const rangers=Array.from(field.querySelectorAll('.fighter.ranger:not(.down)')).slice(0,kind==='intercept-duet'?2:1);
  for(const shot of rangers){pose(shot);trail(shot,foe,'counter');}
  // One displayed ranger can be joined by a non-rendered rear fighter.
  // Never fabricate the absent model as a second on-screen projectile.
  burst(foe,'counter',kind==='intercept-duet'?'duet':'');
  break;
 }
 case 'brace':
  pose(guard);burst(guard,'shield');trail(guard,foe,'counter');burst(foe,'counter');
  break;
 case 'cover-step':
 case 'brace-step':
  burst(guard,'shield');break;
 case 'diagram':
  pose(ranger);trail(ranger,foe,'diagram');burst(foe,'diagram');break;
 case 'unjam':
  pose(ranger);trail(ranger,foe,'counter');burst(foe,'counter');break;
 case 'heal':
 case 'triage':
  pose(medic);trail(medic,target,'heal');burst(target,'heal');break;
 case 'returned':
  burst(target,'heal');break;
 case 'aim':
 case 'rush-aim':
 case 'jam-aim':
  trail(foe,target,kind==='jam-aim'?'jam':'danger',true);
  burst(target,'danger','warning');break;
 case 'flank':
 case 'rush':
 case 'jam':
  trail(foe,target,kind==='jam'?'jam':'danger');
  burst(target,'danger');break;
 case 'pursuit':
  // Reveal a genuine enemy weakness without inventing additional damage.
  burst(foe,'power');break;
 case 'clear':
 case 'intel':
  burst(foe,'reward',kind==='clear'&&E.isElite(evt.value)?'breakthrough':'');
  // A real elite/boss victory grants a chest. Reinforce that milestone in
  // the existing arena growth layer, without inventing drops or extra HUD.
  if(kind==='clear'&&E.isElite(evt.value)){
   reward.textContent=E.isBoss(evt.value)?'✦ 지휘급 격파 · 상자 +1':'✦ 정예 격파 · 상자 +1';
   reward.classList.remove('playing');void reward.offsetWidth;
   reward.classList.add('playing');
  }
  break;
 case 'fallen':
  burst(target,'danger');break;
 case 'rally':
  burst(guard,'danger');break;
 }
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
 const roster=(s.actors||[]).length;
 const training=Math.max(0,Number(s.training)||0);
 const growthParts=[];
 if(previousRoster!==null&&roster>previousRoster)
  growthParts.push('✦ 용병 증원 · +'+(roster-previousRoster)+'명');
 if(previousTraining!==null&&training>previousTraining)
  growthParts.push('▲ 부대 훈련 · LV.'+training);
 // Auto-buy may recruit and train between two renders; show both real
 // improvements rather than silently discarding the second one.
 const growthText=growthParts.join(' / ');
 if(growthText){
  growth.textContent=growthText;
  growth.classList.remove('playing');void growth.offsetWidth;
  growth.classList.add('playing');
  // A combined recruit/training cue can wrap on narrow portrait screens.
  // Keep the independent chest reward below its measured height instead
  // of assuming the growth cue always fits on one line.
  reward.style.top=Math.max(94,43+growth.offsetHeight+8)+'px';
 }
 previousRoster=roster;previousTraining=training;
 const shown=selected(s);
 // A crowded roster or three of one role in a short field needs
 // compact silhouettes to keep every head within the actual arena.
 // The actual unit counts and backline reserves remain unchanged.
 const displayedByRole={guard:0,ranger:0,medic:0};
 shown.forEach(({a})=>{displayedByRole[a.id]++;});
 const needsRows=Object.values(displayedByRole).some(count=>count>=3);
 arena.classList.toggle('formation-dense',shown.length>=6||
  (needsRows&&field.clientHeight<210));
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
 // Role-specific slots are stable by *role*, not the mixed roster index.
 // In narrow portrait layouts the old 5/36/67% heights clipped the top
 // fighters, while rear gunners could overlap medics and appear to march
 // endlessly even after reaching their firing position.
 const slots={guard:0,ranger:0,medic:0};
 const rowLimits={guard:3,ranger:3,medic:2};
 shown.forEach(({a,index})=>{
  const el=field.querySelector('[data-actor-index="'+index+'"]');if(!el)return;
  const lane=slots[a.id]++;
  const progress=Math.max(0,Math.min(1,Number(a.progress)||0));
  // Three separated deployment zones: rear support, rear shooters, front.
  // In all zones horizontal progress remains driven by the *real* actor.
  const x=a.id==='guard'?50+progress*12+lane*2:
   a.id==='ranger'?23+progress*9+lane*2:
   3+progress*6+lane*3;
  el.style.left=x+'%';
  // Reserve extra headroom for subpixel field scaling in the fixed-height
  // command deck (360px Chromium: clientHeight can exceed visual bounds).
  const room=Math.max(0,field.clientHeight-el.offsetHeight-14);
  el.style.bottom=(room*lane/Math.max(1,rowLimits[a.id]-1))+'px';
  const down=a.revive>0||a.hp<=0;
  const hpMax=E.actorMaxHp(s,a.id),hpRatio=down?0:a.hp/Math.max(1,hpMax);
  const active=!down&&a.progress>=.95;
  el.classList.toggle('down',down);
  el.classList.toggle('advance',!down&&!active);
  el.classList.toggle('engaged',active);
  el.classList.toggle('wounded',!down&&hpRatio<=.35);
  const bar=el.querySelector('.fighter-health>div');
  if(bar)bar.style.width=(down?0:safe(hpRatio*100))+'%';
  el.title=a.id+' HP '+Math.floor(a.hp)+' / '+Math.floor(hpMax)+(down?' · 재합류 '+a.revive.toFixed(1)+'초':'');
 });
 const extra=Math.max(0,(s.actors||[]).length-shown.length);
 rosterNote.hidden=extra===0;
 if(extra)rosterNote.textContent='전투원 '+shown.length+'명 표시 · 후방 '+extra+'명';
 const bossActive=E.isBoss(s.stage);
 arena.classList.toggle('arena-boss',bossActive);
 // Purely cosmetic damage wear: these stages follow the actual boss HP
 // ratio, not an invented boss phase, attack speed or extra loot.
 const bossHpFraction=Math.max(0,Math.min(1,s.enemyHp/Math.max(1,E.enemyMax(s.stage))));
 arena.classList.toggle('boss-worn',bossActive&&bossHpFraction<=.75&&bossHpFraction>0);
 arena.classList.toggle('boss-critical',bossActive&&bossHpFraction<=.25&&bossHpFraction>0);
 // Training changes only the presentation tier; combat damage stays in the engine.
 arena.dataset.trainingTier=String(Math.min(3,Math.floor(s.training/4)));
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
 // Ignore unknown/metadata-only cues without clearing a visible combat label.
 // The engine sequence is still consumed so the same event is not retried.
 const visibleKinds=new Set(['hit','volley','pursuit','diagram','triage','intel','aim','flank','cover-step','intercept','intercept-duet','rush-aim','rush','brace','brace-step','jam-aim','jam','unjam','heal','fallen','returned','clear','rally']);
 if(!visibleKinds.has(evt.type))return;
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
