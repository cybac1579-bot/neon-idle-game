/* 실제 엔진 개별 용병 상태를 전장에 투영. CSS 자리표시 그래픽이며 별도 전투 시뮬레이션은 하지 않는다. */
(function(root){
'use strict';
const E=root.ExpeditionEngine;
if(!E)return;
const $=id=>document.getElementById(id);
const field=$('squad'),arena=document.querySelector('.arena');
if(!field||!arena)return;
const fx=document.createElement('div');fx.id='battleFx';fx.setAttribute('aria-hidden','true');arena.appendChild(fx);
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
  const lane=a.id==='guard'?i%3:a.id==='ranger'?(i%3):i%2;
  const x=a.id==='guard'?7+safe(a.progress)*.58:a.id==='ranger'?3+safe(a.progress)*.35:2+safe(a.progress)*.25;
  el.style.left=x+'%';
  el.style.bottom=(a.id==='guard'?8+lane*8:a.id==='ranger'?38+lane*7:68+lane*7)+'%';
  const down=a.revive>0||a.hp<=0;
  el.classList.toggle('down',down);
  el.classList.toggle('advance',!down&&a.progress<.83);
  const bar=el.querySelector('.fighter-health>div');
  if(bar)bar.style.width=(down?0:safe(a.hp/E.actorMaxHp(s,a.id)*100))+'%';
  el.title=a.id+' HP '+Math.floor(a.hp)+' / '+Math.floor(E.actorMaxHp(s,a.id))+(down?' · 재합류 '+a.revive.toFixed(1)+'초':'');
 });
 const extra=Math.max(0,(s.actors||[]).length-shown.length);
 arena.dataset.reserve=extra>0?'+'+extra:'';
 arena.classList.toggle('arena-boss',E.isBoss(s.stage));
 if(s.battleCueSeq===lastCue||!s.battleEvent)return;
 lastCue=s.battleCueSeq;
 const evt=s.battleEvent,unit=E.UNITS.find(u=>u.id===evt.id);
 fx.replaceChildren();
 const cue=document.createElement('span');
 cue.className='combat-cue '+evt.type;
 if(evt.type==='hit')cue.textContent='-'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='heal')cue.textContent='+'+Math.max(1,Math.round(evt.value));
 else if(evt.type==='fallen')cue.textContent=(unit?.name||'용병')+' 후퇴';
 else if(evt.type==='returned')cue.textContent=(unit?.name||'용병')+' 재합류';
 else if(evt.type==='clear')cue.textContent='전선 돌파!';
 else if(evt.type==='rally')cue.textContent='부대 재정비';
 fx.appendChild(cue);
 arena.classList.remove('combat-impact');void arena.offsetWidth;
 if(evt.type==='hit'||evt.type==='clear')arena.classList.add('combat-impact');
}
root.ExpeditionField={sync};
})(window);
