'use strict';
/* Initial pacing probes, NOT a substitute for human play. Three different buying styles. */
const E=require('../site/expedition-engine.js');
const summaries=[];
function run(name,policy){
 const s=E.normalize(E.newState(1000000),1000000);
 const milestones={};let discoveries=0,duplicates=0,spendActions=0;
 const checkpoints=new Set([300,600,1200,1800]);
 for(let t=1;t<=1800;t++){
  E.tick(s,1);
  while(s.chests>0){
   const found=E.openChest(s);
   if(found?.id){if(found.duplicate)duplicates++;else discoveries++;}
  }
  if(t%12===0){
   for(let count=0;count<5;count++){
    const before=s.credits,action=policy(s);
    if(!action||s.credits>=before)break;
    spendActions++;
   }
  }
  if(checkpoints.has(t))milestones[t]={distance:s.stage,best:s.best,heroLevel:s.heroLevel,uniqueRelics:discoveries,duplicates,units:E.UNITS.reduce((a,u)=>a+s.units[u.id],0),training:s.training,credits:Math.floor(s.credits),rebirthGain:E.rebirthGain(s)};
 }
 summaries.push({name,spendActions,milestones,final:{stage:s.stage,chests:s.chests,coresIfReturn:E.rebirthGain(s),unique:discoveries,duplicates}});
}
function buyWithPriority(s,ops){for(const op of ops)if(op())return true;return false;}
function hire(s,max){return E.UNITS.reduce((n,u)=>n+s.units[u.id],0)<max&&!!E.recruit(s);}
function train(s,max){return s.training<max&&E.train(s);}
function quest(s,id,max){return s.questLevels[id]<max&&E.upgradeQuest(s,id);}
run('passive-no-input',()=>false);
run('frontline-first',s=>buyWithPriority(s,[()=>train(s,14),()=>hire(s,10),()=>quest(s,'dispatch',6),()=>quest(s,'salvage',4),()=>quest(s,'contract',3)]));
run('balanced-recruit-and-income',s=>buyWithPriority(s,[()=>hire(s,7),()=>quest(s,'dispatch',4),()=>train(s,9),()=>quest(s,'salvage',5),()=>hire(s,12),()=>train(s,15),()=>quest(s,'contract',3)]));
for(const row of summaries){console.log(JSON.stringify(row));}
if(summaries.some(r=>!Number.isFinite(r.final.stage)||r.final.stage<1))throw Error('invalid expedition progress');
