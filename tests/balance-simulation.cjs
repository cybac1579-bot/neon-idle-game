'use strict';
// Analysis only. Runs the exact current site/game.js; no production gameplay changes.
// node tests/balance-simulation.cjs
// Default: decisions every 10s. BALANCE_MODE=low-input: decisions every 60s,
// one upgrade type per visit, up to 3 levels per click, optional STAGE75 reward and 5 seeded scenarios.
// It is NOT a human playtest and does not establish a globally optimal strategy.
const fs=require('node:fs');
const crypto=require('node:crypto');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.resolve(__dirname,'../site/game.js'),'utf8');
const gameSourceSha256=crypto.createHash('sha256').update(source).digest('hex');
const LOW_INPUT=['low-input','one-buy','two-minute'].includes(process.env.BALANCE_MODE);
const TWO_MINUTE=process.env.BALANCE_MODE==='two-minute';
const ONE_BUY=process.env.BALANCE_MODE==='one-buy';
const BALANCE_DIAGNOSTIC=process.env.BALANCE_DIAGNOSTIC==='1';
const LOADOUT_DIAGNOSTIC=process.env.BALANCE_SKILL_LOADOUT!==undefined;
// Optional controlled experiment: postpone the first skill decision until STAGE35 or 40.
const SKILL_CHOICE_STAGE=[20,35,40].includes(Number(process.env.BALANCE_SKILL_CHOICE_STAGE))?Number(process.env.BALANCE_SKILL_CHOICE_STAGE):20;
const DELAYED_SKILL_DIAGNOSTIC=process.env.BALANCE_SKILL_CHOICE_STAGE!==undefined;
const LOADOUT_POLICY=['natural','chain','capacitor','pair'].includes(process.env.BALANCE_SKILL_LOADOUT)
  ?process.env.BALANCE_SKILL_LOADOUT:'natural';
const ALLOCATION_POLICY=['assault','balanced','supply','supply-pivot'].includes(process.env.BALANCE_ALLOCATION)?process.env.BALANCE_ALLOCATION:'assault';
// Controlled STAGE75 reward comparison: same purchase strategy, skill and RNG seed.
const REWARD_POLICY=['weapon','skill','credits','none'].includes(process.env.BALANCE_STAGE75_REWARD)?process.env.BALANCE_STAGE75_REWARD:null;
const SEEDS=BALANCE_DIAGNOSTIC?[20261114,20261115,20261116]:[20261114,20261115,20261116,20261117,20261118];
const POLICIES=BALANCE_DIAGNOSTIC?['value']:LOW_INPUT?['value','cheapest']:['value','cheapest','attack-first','tier-first'];
const SKILL_IDS=LOADOUT_DIAGNOSTIC?['chain']:BALANCE_DIAGNOSTIC?['chain','bountySkill']:LOW_INPUT?['chain','bountySkill']:['chain','overload','bountySkill','trainingSkill'];

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
function runPolicy(policy,skill,lowInput,oneBuy,twoMinute,allocationPolicy,loadoutPolicy,skillChoiceStage,rewardPolicy){
 const kinds=['atk','spd','gen','amp','relay','forge','reactor'];
 const unlock={atk:1,spd:1,gen:1,amp:15,relay:25,forge:45,reactor:65};
 const attackOrder=['atk','spd','amp','reactor','gen','forge','relay'];
 const checkpoints={},milestones=[20,45,55,60,65,70,75,85,95,100];
 const purchases=Object.fromEntries(kinds.map(k=>[k,0]));
 let firstSkillDecision=null,firstSkillAlreadyOwnedAtDecision=false,firstSkillPreownedAtSec=null,firstSkillPreownedAtStage=null;
 let visitBursts=[],actionsBreakdownAt30=null,firstSlot=null,manualBuys=0,manualPurchaseActions=0,manualClaims=0,manualTraitBuys=0,allocationActions=0,loadoutActions=0,visits=0,stageAt30=null,stageAt60=null,actionsAt30=null,actionsAt60=null,purchaseActionsAt30=null,purchaseActionsAt60=null,purchaseCountAt30=null,purchaseCountAt60=null,skillSnapshot30=null,skillSnapshot60=null;
 const tmax=5400, steps=Math.round(tmax/.25);
 function chooseUpgrade(choices){
  if(policy==='cheapest')return choices.sort((a,b)=>cost(a)-cost(b))[0];
  if(policy==='attack-first')return choices.sort((a,b)=>attackOrder.indexOf(a)-attackOrder.indexOf(b))[0];
  if(policy==='tier-first')return choices.sort((a,b)=>unlock[b]-unlock[a])[0];
  if(policy==='value'){
   const dps=power()/attackInterval(),income=creditRate();
   let chosen=null,score=-Infinity;
   for(const k of choices){
    const price=cost(k);s[k]++;
    const newDps=power()/attackInterval(),newIncome=creditRate();
    s[k]--;
    const result=(Math.max(0,Math.log(newDps/dps))+.25*Math.max(0,Math.log(newIncome/income)))/Math.sqrt(price);
    if(result>score){score=result;chosen=k}
   }
   return chosen;
  }
  throw Error('Unknown policy '+policy);
 }
 function shop(){
  const limit=lowInput?(oneBuy?1:3):75;
  if(lowInput){
   // Match the real UI: one upgrade button per visit; a 3-buy click only raises that same upgrade.
   const choices=kinds.filter(k=>s.best>=unlock[k]&&!(k==='spd'&&s.spd>=50)&&s.credits>=cost(k));
   if(!choices.length)return;
   const chosen=chooseUpgrade(choices),bought=purchaseBatch(chosen,limit);
   if(bought<1)throw Error('Batch purchase rejected '+chosen);
   purchases[chosen]+=bought;manualBuys+=bought;manualPurchaseActions++;
   return;
  }
  let loops=0;
  while(loops++<limit){
   const choices=kinds.filter(k=>s.best>=unlock[k]&&!(k==='spd'&&s.spd>=50)&&s.credits>=cost(k));
   if(!choices.length)break;
   const chosen=chooseUpgrade(choices);
   if(!purchase(chosen))throw Error('Purchase candidate rejected '+chosen);
   purchases[chosen]++;manualBuys++;manualPurchaseActions++;
  }
 }
 const actionCount=()=>manualPurchaseActions+manualClaims+manualTraitBuys+allocationActions+loadoutActions+Number(s.skillChoiceUsed)+Number(s.frontlineSupport!==null)+Number(s.breakthroughReward!==null);
 for(let tick=0;tick<=steps;tick++){
  const seconds=tick*.25;
  if(tick%(twoMinute?480:lowInput?240:40)===0){
   visits++;
   const actionsBeforeVisit=actionCount();
   if(s.stage>=skillChoiceStage&&!s.skillChoiceUsed){
    if(s.skillsOwned.includes(skill)){firstSkillAlreadyOwnedAtDecision=true;if(firstSkillPreownedAtSec===null){firstSkillPreownedAtSec=seconds;firstSkillPreownedAtStage=s.stage;}}
    else if(chooseSkill(skill))firstSkillDecision={seconds,stage:s.stage,skill};
   }
   if(s.stage>=55){
     // A realistic two-decision experiment: finance reactor unlock (55-64), then push.
     const target=allocationPolicy==='supply-pivot'?(s.stage<65?'supply':'assault'):allocationPolicy;
     if(s.allocation!==target){s.allocation=target;allocationActions++;}
    }
   if(s.stage>=60&&!s.frontlineSupport)chooseFrontlineSupport('firepower');
   // Deliberate loadouts for controlled late-stage comparison. Standard equip actions only.
   if(loadoutPolicy!=='natural'&&s.stage>=65&&s.skillsOwned.includes('capacitor')){
    const desired=loadoutPolicy==='chain'?['chain']:loadoutPolicy==='capacitor'?['capacitor']:['chain','capacitor'];
    for(const id of s.skillsEquipped.slice())if(!desired.includes(id)){
     if(!toggleEquipSkill(id))throw Error('Could not unequip '+id);
     loadoutActions++;
    }
    for(const id of desired)if(s.skillsOwned.includes(id)&&!s.skillsEquipped.includes(id)&&s.skillsEquipped.length<skillSlotCount()){
     if(!toggleEquipSkill(id))throw Error('Could not equip '+id);
     loadoutActions++;
    }
   }
   // One optional STAGE75 choice at the next real visit, not a free background grant.
   if(s.stage>=75&&!s.breakthroughReward&&rewardPolicy!=='none')chooseBreakthroughReward(rewardPolicy|| (policy==='cheapest'?'credits':policy==='tier-first'?'skill':'weapon'));
   const traitOrder=[['precision',5],['double',5],['boss',3],['haste',5],['training',5],['energy',5]];
   let traitBudget=lowInput?1:Infinity;
   for(const pair of traitOrder)while(traitBudget>0&&s.traitPointsEarned>s.traitPointsSpent&&(s.traits[pair[0]]||0)<pair[1]){
    if(!buyTrait(pair[0]))throw Error('Trait purchase failed '+pair[0]);manualTraitBuys++;traitBudget--;
   }
   if(s.questCredits.some(x=>x>=1)&&claimCache())manualClaims++;
   shop();
   visitBursts.push({seconds,actions:actionCount()-actionsBeforeVisit});
  }
  if(s.heroLevel>=10&&firstSlot===null)firstSlot=seconds;
  for(const n of milestones)if(s.stage>=n&&checkpoints[n]===undefined)checkpoints[n]=seconds;
  if(seconds>=1800&&stageAt30===null){stageAt30=s.stage;actionsAt30=actionCount();actionsBreakdownAt30={purchases:manualPurchaseActions,claims:manualClaims,traits:manualTraitBuys,allocation:allocationActions,loadout:loadoutActions,oneTime:actionCount()-manualPurchaseActions-manualClaims-manualTraitBuys-allocationActions-loadoutActions};purchaseActionsAt30=manualPurchaseActions;purchaseCountAt30=manualBuys;skillSnapshot30={owned:s.skillsOwned.slice(),equipped:s.skillsEquipped.slice(),levels:{...s.skillLevels}}}
  if(seconds>=3600&&stageAt60===null){stageAt60=s.stage;actionsAt60=actionCount();purchaseActionsAt60=manualPurchaseActions;purchaseCountAt60=manualBuys;skillSnapshot60={owned:s.skillsOwned.slice(),equipped:s.skillsEquipped.slice(),levels:{...s.skillLevels}}}
  if(s.stage>=100)break;
  if(tick<steps)step(.25);
 }
 if(s.stage<1||s.rebirths!==0||s.cores!==0||!Number.isFinite(s.credits))throw Error('First-run invariant failed');
 const manualActions=actionCount();
 if(lowInput){const maxPerVisit=oneBuy?1:3;if(manualPurchaseActions>visits)throw Error('Purchase clicks exceeded low-input visits');if(manualBuys>manualPurchaseActions*maxPerVisit)throw Error('One visit bought more levels than the actual selector permits');}
 return {firstSkillDecision,firstSkillAlreadyOwnedAtDecision,firstSkillPreownedAtSec,firstSkillPreownedAtStage,readySec:checkpoints[100]??null,stageAt30,stageAt60,actionsAt30,actionsAt60,stageAt90:s.stage,
  heroLevel:s.heroLevel,heroLv10Sec:firstSlot,stageTimes:checkpoints,
  actionsBreakdownAt30,visitBurstsAt30:visitBursts.filter(v=>v.seconds<=1800&&v.actions>0),maxActionsPerVisitAt30:Math.max(0,...visitBursts.filter(v=>v.seconds<=1800).map(v=>v.actions)),multiActionVisitsAt30:visitBursts.filter(v=>v.seconds<=1800&&v.actions>1).length,manualActions,purchaseCount:manualBuys,purchaseActions:manualPurchaseActions,visitCount:visits,loadoutActions,
  purchaseActionsAt30,purchaseActionsAt60,purchaseCountAt30,purchaseCountAt60,skillSnapshot30,skillSnapshot60,claimCount:manualClaims,traitCount:manualTraitBuys,
  upgrades:purchases,weapon:s.weapon?{tier:s.weapon.tier,stage:s.weapon.stage}:null,
  skillEquipped:s.skillsEquipped.slice(),skillOwned:s.skillsOwned.slice(),frontlineSupport:s.frontlineSupport,breakthroughReward:s.breakthroughReward,
  balanceFlags:{creditRate:creditRate(),power:power(),speed:attackInterval(),cores:gainCore()}};
}
function median(a){const b=[...a].sort((x,y)=>x-y);return b[Math.floor(b.length/2)]}
function avg(a){return +(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2)}
const detailed=[],summary=[];
for(const policy of POLICIES)for(const skill of SKILL_IDS){
 const runs=[];
 for(const seed of SEEDS){
  const context=boot(seed);
  const result=vm.runInContext('('+runPolicy.toString()+')('+JSON.stringify(policy)+','+JSON.stringify(skill)+','+LOW_INPUT+','+ONE_BUY+','+TWO_MINUTE+','+JSON.stringify(ALLOCATION_POLICY)+','+JSON.stringify(LOADOUT_POLICY)+','+SKILL_CHOICE_STAGE+','+JSON.stringify(REWARD_POLICY)+')',context,{timeout:60000});
  assert.equal(result.stageAt90>=1&&result.stageAt90<=100,true);
  assert.equal(result.readySec===null||result.readySec>=0,true);
  runs.push({seed,...result});
 }
 const finish=runs.map(r=>r.readySec).filter(t=>t!==null);
 const walls=runs.filter(r=>r.stageTimes[55]!==undefined&&r.stageTimes[65]!==undefined)
   .map(r=>r.stageTimes[65]-r.stageTimes[55]);
 const stages30=runs.map(r=>r.stageAt30??100);
 const row={policy,skill,loadoutPolicy:LOADOUT_POLICY,skillChoiceStage:SKILL_CHOICE_STAGE,rewardPolicy:REWARD_POLICY||'default',successCount:finish.length,seedCount:SEEDS.length, 
  scriptedChoiceCount:runs.filter(r=>r.firstSkillDecision!==null).length,preownedChoiceCount:runs.filter(r=>r.firstSkillAlreadyOwnedAtDecision).length,
  noChoiceCount:runs.filter(r=>r.firstSkillDecision===null&&!r.firstSkillAlreadyOwnedAtDecision).length,
  meanReadySec:finish.length===SEEDS.length?avg(finish):null,
  minReadySec:finish.length?Math.min(...finish):null,
  maxReadySec:finish.length?Math.max(...finish):null,
  meanStage55to65Sec:walls.length?avg(walls):null,
  meanStageAt30:avg(stages30),meanStageAt60:avg(runs.map(r=>r.stageAt60??100)),
  meanActionsAt30:avg(runs.map(r=>r.actionsAt30??r.manualActions)),meanMaxActionsPerVisitAt30:avg(runs.map(r=>r.maxActionsPerVisitAt30)),meanMultiActionVisitsAt30:avg(runs.map(r=>r.multiActionVisitsAt30)),meanClaimsAt30:avg(runs.map(r=>r.actionsBreakdownAt30.claims)),meanTraitsAt30:avg(runs.map(r=>r.actionsBreakdownAt30.traits)),
  meanActionsAt60:avg(runs.map(r=>r.actionsAt60??r.manualActions)),
  meanPurchaseActionsAt30:avg(runs.map(r=>r.purchaseActionsAt30??r.purchaseActions)),
  meanPurchaseLevelsAt30:avg(runs.map(r=>r.purchaseCountAt30??r.purchaseCount)),
  meanPurchaseActionsAt60:avg(runs.map(r=>r.purchaseActionsAt60??r.purchaseActions)),
  meanPurchaseLevelsAt60:avg(runs.map(r=>r.purchaseCountAt60??r.purchaseCount)),
  meanManualActions:avg(runs.map(r=>r.manualActions)),meanLoadoutActions:avg(runs.map(r=>r.loadoutActions)),
  meanHeroLv10Sec: runs.every(r=>r.heroLv10Sec!==null)?avg(runs.map(r=>r.heroLv10Sec)):null};
 summary.push(row);detailed.push({policy,skill,runs});
 console.log('SIM_POLICY '+JSON.stringify(row));
}
const payload={title:LOW_INPUT?'Constrained-input first reconstruction; decisions every '+(TWO_MINUTE?120:60)+'s, at most '+(ONE_BUY?1:3)+' purchases and 1 trait per visit; not human play':'First reconstruction baseline; simulated 0.25s ticks, manual decisions every 10s, not human play',
 observedAtUtc:new Date().toISOString(),gameSourceSha256,simulatorMode:{lowInput:LOW_INPUT,oneBuy:ONE_BUY,twoMinute:TWO_MINUTE,decisionIntervalSec:TWO_MINUTE?120:LOW_INPUT?60:10},seeds:SEEDS,allocationPolicy:ALLOCATION_POLICY,loadoutPolicy:LOADOUT_POLICY,rewardPolicy:REWARD_POLICY||'default',diagnostic:BALANCE_DIAGNOSTIC,skillChoiceStage:SKILL_CHOICE_STAGE,policies:POLICIES,skills:SKILL_IDS,summary,detailed};
fs.mkdirSync(path.resolve(__dirname,'../artifacts/balance'),{recursive:true});
const allocationFile=REWARD_POLICY?'../artifacts/balance/stage75-reward-'+REWARD_POLICY+'.json':DELAYED_SKILL_DIAGNOSTIC?'../artifacts/balance/skill-choice-stage-'+SKILL_CHOICE_STAGE+'.json':LOADOUT_DIAGNOSTIC?'../artifacts/balance/skill-loadout-'+LOADOUT_POLICY+'.json':BALANCE_DIAGNOSTIC?'../artifacts/balance/allocation-'+ALLOCATION_POLICY+'.json':
 LOW_INPUT?(ONE_BUY?'../artifacts/balance/first-rebirth-one-buy.json':TWO_MINUTE?'../artifacts/balance/first-rebirth-two-minute.json':'../artifacts/balance/first-rebirth-low-input.json'):'../artifacts/balance/first-rebirth-baseline.json';
fs.writeFileSync(path.resolve(__dirname,allocationFile),JSON.stringify(payload,null,2)+'\n');
console.log('SIM_DONE policies='+summary.length+' scenarios='+detailed.reduce((a,x)=>a+x.runs.length,0));
