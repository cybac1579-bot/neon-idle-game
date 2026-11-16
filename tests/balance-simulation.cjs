'use strict';
// Analysis only. Runs the exact current site/game.js; no production gameplay changes.
// node tests/balance-simulation.cjs
// Default: decisions every 10s. BALANCE_MODE=low-input: decisions every 60s,
// at most 3 purchases and 1 trait per visit, 8 seeded scenarios.
// It is NOT a human playtest and does not establish a globally optimal strategy.
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../site/game.js'),'utf8');
const LOW_INPUT=process.env.BALANCE_MODE==='low-input';
const SEEDS=LOW_INPUT?[20261114,20261116]:[20261114,20261115,20261116,20261117,20261118];
const POLICIES=LOW_INPUT?['value','cheapest']:['value','cheapest','attack-first','tier-first'];
const SKILL_IDS=LOW_INPUT?['chain','bountySkill']:['chain','overload','bountySkill','trainingSkill'];

function boot(seed){
 const nodes=new Map();
 function element(){
  return {
   dataset:{},style:{},children:[],classList:{toggle(){}},addEventListener(){},
   querySelectorAll(){return []},appendChild(n){this.children.push(n)},remove(){},
   set innerHTML(html){this.children=[...String(html).matchAll(/<(strong|small|button)\b[^>]*>/g)].map(()=>element())},
   get firstElementChild(){return this.children[0]||null},
   get lastElementChild(){return this.children[this.children.length-1]||null},
   set textContent(t){this._text=t},get textContent(){return this._text||''}
  };
 }
 const document={hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},
  createElement(){return element()},addEventListener(){}};
 let rng=seed>>>0;
 const math=Object.create(Math);
 math.random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296};
 const storage=new Map();
 const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const RealDate=Date;
 class FixedDate extends RealDate{static now(){return Date.UTC(2026,10,15,0,0,0)}}
 const context=vm.createContext({document,localStorage,Date:FixedDate,Math:math,JSON,Number,Object,Array,Set,
  performance:{now:()=>0},window:{addEventListener(){}},requestAnimationFrame(){},confirm:()=>true});
 vm.runInContext(source,context,{filename:'site/game.js',timeout:15000});
 return context;
}

// Serializes this function into the same V8 context as game.js to avoid
// 20,000 costly cross-context calls and preserve the game's own exact rules.
function runPolicy(policy,skill,lowInput){
 const kinds=['atk','spd','gen','amp','relay','forge','reactor'];
 const unlock={atk:1,spd:1,gen:1,amp:15,relay:25,forge:45,reactor:65};
 const attackOrder=['atk','spd','amp','reactor','gen','forge','relay'];
 const checkpoints={},milestones=[20,45,55,60,65,70,75,85,95,100];
 const purchases=Object.fromEntries(kinds.map(k=>[k,0]));
 let firstSlot=null,manualBuys=0,manualClaims=0,manualTraitBuys=0,autoBuyTicks=0,stageAt30=null;
 const tmax=5400, steps=Math.round(tmax/.25);
 function shop(){
  let loops=0;
  while(loops++<(lowInput?3:75)){
   const choices=kinds.filter(k=>s.best>=unlock[k]&&!(k==='spd'&&s.spd>=50)&&s.credits>=cost(k));
   if(!choices.length)break;
   let chosen;
   if(policy==='cheapest')chosen=choices.sort((a,b)=>cost(a)-cost(b))[0];
   else if(policy==='attack-first')chosen=choices.sort((a,b)=>attackOrder.indexOf(a)-attackOrder.indexOf(b))[0];
   else if(policy==='tier-first')chosen=choices.sort((a,b)=>unlock[b]-unlock[a])[0];
   else if(policy==='value'){
    const dps=power()/attackInterval(),income=creditRate();
    let score=-Infinity;
    for(const k of choices){
     const price=cost(k);s[k]++;
     const newDps=power()/attackInterval(),newIncome=creditRate();
     s[k]--;
     const result=(Math.max(0,Math.log(newDps/dps))+.25*Math.max(0,Math.log(newIncome/income)))/Math.sqrt(price);
     if(result>score){score=result;chosen=k}
    }
   }else throw Error('Unknown policy '+policy);
   if(!purchase(chosen))throw Error('Purchase candidate rejected '+chosen);
   purchases[chosen]++;manualBuys++;
  }
 }
 for(let tick=0;tick<=steps;tick++){
  const seconds=tick*.25;
  if(tick%(lowInput?240:40)===0){
   if(s.stage>=20&&!s.skillChoiceUsed&&!s.skillsOwned.includes(skill))chooseSkill(skill);
   if(s.stage>=55)s.allocation='assault';
   if(s.stage>=60&&!s.frontlineSupport)chooseFrontlineSupport('firepower');
   const traitOrder=[['precision',5],['double',5],['boss',3],['haste',5],['training',5],['energy',5]];
   let traitBudget=lowInput?1:Infinity;
   for(const pair of traitOrder)while(traitBudget>0&&s.traitPointsEarned>s.traitPointsSpent&&(s.traits[pair[0]]||0)<pair[1]){
    if(!buyTrait(pair[0]))throw Error('Trait purchase failed '+pair[0]);manualTraitBuys++;traitBudget--;
   }
   if(s.questCredits.some(x=>x>=1)&&claimCache())manualClaims++;
   shop();
  }
  if(s.heroLevel>=10&&firstSlot===null)firstSlot=seconds;
  for(const n of milestones)if(s.stage>=n&&checkpoints[n]===undefined)checkpoints[n]=seconds;
  if(seconds>=1800&&stageAt30===null)stageAt30=s.stage;
  if(s.stage>=100)break;
  if(tick<steps)step(.25);
 }
 if(s.stage<1||s.rebirths!==0||s.cores!==0||!Number.isFinite(s.credits))throw Error('First-run invariant failed');
 return {readySec:checkpoints[100]??null,stageAt30,stageAt90:s.stage,
  heroLevel:s.heroLevel,heroLv10Sec:firstSlot,stageTimes:checkpoints,
  manualActions:manualBuys+manualClaims+manualTraitBuys+Number(s.skillChoiceUsed)+Number(s.frontlineSupport!==null)+Number(s.stage>=55),
  purchaseCount:manualBuys,claimCount:manualClaims,traitCount:manualTraitBuys,
  upgrades:purchases,weapon:s.weapon?{tier:s.weapon.tier,stage:s.weapon.stage}:null,
  skillEquipped:s.skillsEquipped.slice(),skillOwned:s.skillsOwned.slice(),frontlineSupport:s.frontlineSupport,
  balanceFlags:{creditRate:creditRate(),power:power(),speed:attackInterval(),cores:gainCore()}};
}
function median(a){const b=[...a].sort((x,y)=>x-y);return b[Math.floor(b.length/2)]}
function avg(a){return +(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2)}
const detailed=[],summary=[];
for(const policy of POLICIES)for(const skill of SKILL_IDS){
 const runs=[];
 for(const seed of SEEDS){
  const context=boot(seed);
  const result=vm.runInContext('('+runPolicy.toString()+')('+JSON.stringify(policy)+','+JSON.stringify(skill)+','+LOW_INPUT+')',context,{timeout:60000});
  assert.equal(result.stageAt90>=1&&result.stageAt90<=100,true);
  assert.equal(result.readySec===null||result.readySec>=0,true);
  runs.push({seed,...result});
 }
 const finish=runs.map(r=>r.readySec).filter(t=>t!==null);
 const walls=runs.filter(r=>r.stageTimes[55]!==undefined&&r.stageTimes[65]!==undefined)
   .map(r=>r.stageTimes[65]-r.stageTimes[55]);
 const stages30=runs.map(r=>r.stageAt30??100);
 const row={policy,skill,successCount:finish.length,seedCount:SEEDS.length,
  meanReadySec:finish.length===SEEDS.length?avg(finish):null,
  minReadySec:finish.length?Math.min(...finish):null,
  maxReadySec:finish.length?Math.max(...finish):null,
  meanStage55to65Sec:walls.length?avg(walls):null,
  meanStageAt30:avg(stages30),meanManualActions:avg(runs.map(r=>r.manualActions)),
  meanHeroLv10Sec: runs.every(r=>r.heroLv10Sec!==null)?avg(runs.map(r=>r.heroLv10Sec)):null};
 summary.push(row);detailed.push({policy,skill,runs});
 console.log('SIM_POLICY '+JSON.stringify(row));
}
const payload={title:LOW_INPUT?'Constrained-input first reconstruction; decisions every 60s, at most 3 purchases and 1 trait per visit; not human play':'First reconstruction baseline; simulated 0.25s ticks, manual decisions every 10s, not human play',
 observedAtUtc:new Date().toISOString(),seeds:SEEDS,policies:POLICIES,skills:SKILL_IDS,summary,detailed};
fs.mkdirSync(path.resolve(__dirname,'../artifacts/balance'),{recursive:true});
fs.writeFileSync(path.resolve(__dirname,LOW_INPUT?'../artifacts/balance/first-rebirth-low-input.json':'../artifacts/balance/first-rebirth-baseline.json'),JSON.stringify(payload,null,2)+'\n');
console.log('SIM_DONE policies='+summary.length+' scenarios='+detailed.reduce((a,x)=>a+x.runs.length,0));
