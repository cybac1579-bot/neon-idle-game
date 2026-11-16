'use strict';
// Three consecutive STAGE100 runs through the actual production site/game.js.
// Four spend paths, two seeded RNG streams, low-input human-style visits.
// No live gameplay mutations: this tool tests strategy and measures actions.
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../site/game.js'),'utf8');
const SEEDS=[20261114,20261116];
const ROUTES=['combat','economy','automation','automation-lite'];
const MAX_SECONDS=10800;
function boot(seed){
 const nodes=new Map();
 function element(){
  return {dataset:{},style:{},children:[],classList:{toggle(){}},addEventListener(){},
   querySelectorAll(){return []},appendChild(v){this.children.push(v)},remove(){},
   set innerHTML(html){this.children=[...String(html).matchAll(/<(strong|small|button)\b[^>]*>/g)].map(()=>element())},
   get firstElementChild(){return this.children[0]||null},
   get lastElementChild(){return this.children[this.children.length-1]||null},
   set textContent(v){this._text=v},get textContent(){return this._text||''}};
 }
 const document={hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},createElement(){return element()},addEventListener(){}};
 let rng=seed>>>0;
 const seededMath=Object.create(Math);
 seededMath.random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296};
 const memory=new Map();
 const localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
 class FixedDate extends Date{static now(){return Date.UTC(2026,10,16,0,0,0)}}
 const context=vm.createContext({document,localStorage,Math:seededMath,Date:FixedDate,JSON,Number,Object,Array,Set,
  performance:{now:()=>0},window:{addEventListener(){}},requestAnimationFrame(){},confirm:()=>true});
 vm.runInContext(source,context,{filename:'site/game.js',timeout:15000});
 return context;
}
// Stringified into the game's VM, so per-frame actions stay native/fast.
function campaign(route){
 const maxSeconds=10800;
 const upgrades=['atk','spd','gen','amp','relay','forge','reactor'];
 const finished=[];
 const routeCore=route==='combat'?'corePower':route==='economy'?'coreEconomy':'autoLevel';
 let cumulative=0,overallActions=0;
 for(let run=1;run<=3;run++){
  let claims=0,manualPurchases=0,manualLevels=0,autoLevels=0,traits=0,specials=0,allocationClicks=0,visits=0;
  const heroStart=s.heroLevel,levelBefore={corePower:s.corePower,coreEconomy:s.coreEconomy,autoLevel:s.autoLevel};
  const manualCadence=route==='automation-lite'&&run>=2?180:60;
  const boughtStart={atk:s.atk,spd:s.spd,gen:s.gen,amp:s.amp,relay:s.relay,forge:s.forge,reactor:s.reactor};
  const allowAuto=s.autoBuy;
  let at30=null,at60=null,at90=null,ready=null;
  function shop(){
   const available=upgrades.filter(k=>s.best>=unlockStage[k]&&!(k==='spd'&&s.spd>=50)&&s.credits>=cost(k));
   if(!available.length)return;
   const beforeDps=power()/attackInterval(),beforeIncome=creditRate();
   let picked='',bestScore=-Infinity;
   for(const k of available){
    const price=cost(k);s[k]++;
    const score=(Math.max(0,Math.log((power()/attackInterval())/beforeDps))+
       .25*Math.max(0,Math.log(creditRate()/beforeIncome)))/Math.sqrt(price);
    s[k]--;
    if(score>bestScore){picked=k;bestScore=score;}
   }
   const bought=purchaseBatch(picked,3);
   if(bought<=0)throw Error('purchase should succeed');
   manualPurchases++;manualLevels+=bought;
  }
  function visit(){
   visits++;
   if(s.stage>=20&&!s.skillChoiceUsed&&!s.skillsOwned.includes('chain')){
    if(chooseSkill('chain'))specials++;
   }
   if(s.skillsOwned.includes('chain')&&!s.skillsInherited.includes('chain')&&s.skillsInherited.length<inheritanceSlots()){
    if(toggleInheritSkill('chain'))specials++;
   }
   if(s.stage>=55&&s.allocation!=='assault'){s.allocation='assault';allocationClicks++;}
   if(s.stage>=60&&!s.frontlineSupport&&chooseFrontlineSupport('firepower'))specials++;
   if(s.stage>=75&&!s.breakthroughReward&&chooseBreakthroughReward('weapon'))specials++;
   const order=['precision','double','boss','haste','training','energy'];
   for(const kind of order)if(availablePoints()>0&&traitLevel(kind)<TRAITS.find(x=>x[0]===kind)[2]){
    if(buyTrait(kind))traits++;
    break;
   }
   if(!s.autoClaimQuests&&s.questCredits.some(x=>x>=1)&&claimCache())claims++;
   shop();
  }
  for(let tick=0;tick<=maxSeconds*4;tick++){
   const seconds=tick*.25;
   if(tick%(manualCadence*4)===0)visit();
   if(seconds>=1800&&at30===null)at30=s.stage;
   if(seconds>=3600&&at60===null)at60=s.stage;
   if(seconds>=5400&&at90===null)at90=s.stage;
   if(s.stage>=100){ready=seconds;break;}
   if(tick<maxSeconds*4)step(.25,false);
  }
  const actionCount=claims+manualPurchases+traits+specials+allocationClicks;
  overallActions+=actionCount;
  const outcome={run,readySec:ready,success:ready!==null,stageAt30:at30??s.stage,stageAt60:at60??s.stage,
    stageAt90:at90??s.stage,stageEnd:s.stage,cumulativeSec:ready===null?null:cumulative+ready,
    actions:actionCount,claims,manualPurchases,manualLevels,traits,specials,allocationClicks,visits,
    heroStart,heroEnd:s.heroLevel,coreBefore:levelBefore,autoBuy:s.autoBuy,
    autoClaim:s.autoClaimQuests,coreEarned:ready===null?0:gainCore(),coresUnspent:s.cores};
  if(s.stage<1||!Number.isFinite(s.credits)||!Number.isFinite(s.heroXp))throw Error('non-finite campaign');
  if(ready===null){finished.push(outcome);break;}
  cumulative+=ready;
  const beforeRebirth=s.rebirths,hero=s.heroLevel;
  const carried=s.skillsInherited.slice();
  if(!rebirth())throw Error('STAGE100 manual rebirth should be possible');
  if(s.rebirths!==beforeRebirth+1||s.heroLevel!==hero)throw Error('permanent hero/rebirth invariant');
  for(const skill of carried)if(!s.skillsOwned.includes(skill)||s.skillLevels[skill]!==1)throw Error('skill inheritance invariant');
  let coreClicks=0;
  while(s.cores>=coreCost(routeCore)&&coreClicks<6){
   const original=s[routeCore];buyCore(routeCore);
   if(s[routeCore]!==original+1)throw Error('core purchase failed');
   coreClicks++;overallActions++;
  }
  if(routeCore==='autoLevel'&&s.autoLevel>0)s.autoBuy=true;
  if(routeCore==='autoLevel'&&s.autoLevel>=2)s.autoClaimQuests=true;
  outcome.coreSpentActions=coreClicks;
  outcome.coreAfter={corePower:s.corePower,coreEconomy:s.coreEconomy,autoLevel:s.autoLevel,
   cores:s.cores,claim:s.autoClaimQuests};
  finished.push(outcome);
 }
 return {route,finished,cumulative:finished.every(x=>x.success)?cumulative:null,
  totalActions:overallActions,remainingStage:s.stage,hero:s.heroLevel,
  permanent:{corePower:s.corePower,coreEconomy:s.coreEconomy,autoLevel:s.autoLevel}};
}
const rows=[];
for(const route of ROUTES)for(const seed of SEEDS){
 const ctx=boot(seed);
 const outcome=vm.runInContext('('+campaign.toString()+')('+JSON.stringify(route)+')',ctx,{timeout:90000});
 assert.equal(outcome.route,route);
 assert.ok(outcome.finished.length<=3);
 for(const run of outcome.finished){
  assert.ok(run.stageEnd>=1&&run.stageEnd<=100);
  assert.ok(run.readySec===null||run.readySec>=0);
  assert.ok(run.claims<=run.visits);
  assert.ok(run.manualPurchases<=run.visits);
 }
 rows.push({seed,...outcome});
 console.log('CAMPAIGN '+JSON.stringify({seed,route,runs:outcome.finished.map(x=>({run:x.run,seconds:x.readySec,stageAt60:x.stageAt60,actions:x.actions,claims:x.claims,purchases:x.manualPurchases,coreBefore:x.coreBefore,coreAfter:x.coreAfter})),totalActions:outcome.totalActions,cumulative:outcome.cumulative}));
}
const summary=ROUTES.map(route=>{
 const scenarios=rows.filter(x=>x.route===route);
 const rounds=[1,2,3].map(run=>{
  const a=scenarios.map(x=>x.finished[run-1]).filter(Boolean);
  const all=a.length===SEEDS.length&&a.every(x=>x.success);
  const avg=key=>+(a.reduce((n,x)=>n+x[key],0)/a.length).toFixed(2);
  return {run,completions:a.filter(x=>x.success).length,seedCount:SEEDS.length,
   meanReadySec:all?avg('readySec'):null,meanActions:avg('actions'),
   meanClaims:avg('claims'),meanPurchases:avg('manualPurchases'),
   meanStage60:avg('stageAt60')};
 });
 return {route,rounds,meanTotalActions:+(scenarios.reduce((n,x)=>n+x.totalActions,0)/scenarios.length).toFixed(2),
  meanCumulativeSec:scenarios.every(x=>x.cumulative!==null)?+
   (scenarios.reduce((n,x)=>n+x.cumulative,0)/scenarios.length).toFixed(2):null};
});
const output={experiment:'first three manual STAGE100 reconstructions with actual saved-in-run core purchases',
 note:'Scripted 60-second visit/click policy. Automation-lite visits every 180 seconds after first reset, while auto-buy continues. One visit buys 3 levels of ONE upgrade. Not human play or a globally optimal policy.',
 sourceCommit:process.env.GITHUB_SHA||null,seeds:SEEDS,routes:ROUTES,summary,scenarios:rows};
const out=path.resolve(__dirname,'../artifacts/balance/three-rebirth-core-routes.json');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(output,null,2)+'\n');
for(const item of summary)console.log('CORE_ROUTE '+JSON.stringify(item));
console.log('CORE_ROUTES_DONE routes='+ROUTES.length+' seeds='+SEEDS.length+' campaigns='+rows.length);
