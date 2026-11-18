'use strict';
/* Comparable first-return policies: both the no-return control and early
 * return treatment open their own earned chests at every five-clear milestone.
 * This audit must not hide relic effects by calling them "core effects".
 * Player manually chooses return and (optional) investment. */
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118],MODES=['balanced','adaptive'];
const ROUTES=[{label:'no-return',returnAfter:0,invest:false},
 {label:'return15-no-core',returnAfter:15,invest:false},
 {label:'return15-invest',returnAfter:15,invest:true},
 {label:'return25-no-core',returnAfter:25,invest:false},
 {label:'return25-invest',returnAfter:25,invest:true}];
function run(seed,mode,route){
 const s=E.newState(1000000);s.seed=seed;
 assert.equal(E.setAutoBuy(s,mode,true),true);
 let priorCleared=0,firstReturnSeconds=null,paidCores=0,opened=0;
 for(let sec=1;sec<=10000;sec++){
  E.tick(s,1);
  const cleared=s.stage-1;
  const milestone=cleared!==priorCleared&&cleared>=5&&cleared%5===0;
  priorCleared=cleared;
  const chooseReturn=route.returnAfter>0&&firstReturnSeconds===null&&cleared>=route.returnAfter&&E.rebirthGain(s)>0;
  // Every alternative gets the same manual opportunity to open earned
  // chests: each 5-clear milestone, plus each 5-minute check-in.
  if(milestone||sec%300===0||chooseReturn){
   while(s.chests>0){assert.ok(E.openChest(s));opened++;}
  }
  if(chooseReturn){
   paidCores=E.rebirth(s);assert.ok(paidCores>0);
   firstReturnSeconds=sec;
   if(route.invest)while(E.buyCore(s,'valor')){}
   priorCleared=0;
  }
  if(s.stage>45){
   while(s.chests>0){assert.ok(E.openChest(s));opened++;}
   return {seed,mode,route:route.label,firstReturnSeconds,
    cleared45AtSeconds:sec,paidCores,unclaimedCores:E.rebirthGain(s),
    totalEarnedOrUnclaimedCores:paidCores+E.rebirthGain(s),
    spentCores:s.coreSpent,combatCoreLevel:s.coreUpgrades.valor,
    openedChests:opened,relicKinds:E.RELICS.filter(r=>E.relic(s,r.id)>0).length,
    relicCopies:E.RELICS.reduce((total,r)=>total+E.relic(s,r.id),0),
    returns:s.rebirths};
  }
 }
 throw Error('clear45 not reached: '+JSON.stringify({seed,mode,route}));
}
const rows=MODES.flatMap(mode=>SEEDS.flatMap(seed=>ROUTES.map(route=>run(seed,mode,route))));
for(const mode of MODES)for(const seed of SEEDS){
 const group=rows.filter(r=>r.seed===seed&&r.mode===mode);
 const baseline=group.find(x=>x.route==='no-return');
 assert.equal(baseline.firstReturnSeconds,null);
 assert.equal(baseline.returns,0);
 assert.equal(baseline.openedChests,9,'depth5..45 gives exactly 9 boxes');
 for(const stage of [15,25]){
  const untouched=group.find(x=>x.route===`return${stage}-no-core`);
  const invested=group.find(x=>x.route===`return${stage}-invest`);
  assert.equal(untouched.returns,1);
  assert.equal(invested.returns,1);
  assert.equal(untouched.firstReturnSeconds,invested.firstReturnSeconds,
   'invest/no-invest controls need identical first return time');
  assert.equal(untouched.paidCores,invested.paidCores);
  assert.equal(untouched.spentCores,0);
  assert.ok(invested.spentCores>0);
  assert.ok(invested.combatCoreLevel>0);
  assert.equal(untouched.openedChests,baseline.openedChests+stage/5,
   'early return adds exactly one repeat batch of earned chests');
  assert.equal(invested.openedChests,untouched.openedChests);
  assert.equal(invested.totalEarnedOrUnclaimedCores,untouched.totalEarnedOrUnclaimedCores,
   'spending combat cores must not mint extra reward cores');
 }
}
// The optimum is not forced. Report the magnitude and source of the
// advantage before choosing whether to rebalance core prices or relic odds.
const routeComparison=MODES.flatMap(mode=>SEEDS.map(seed=>{
 const r=label=>rows.find(x=>x.mode===mode&&x.seed===seed&&x.route===label);
 const base=r('no-return'),noCore=r('return25-no-core'),invest=r('return25-invest');
 const shortcutPercent=+(100*(base.cleared45AtSeconds-invest.cleared45AtSeconds)/
  base.cleared45AtSeconds).toFixed(1);
 // This is a regression ceiling, not a promise that earliest return should
 // be optimal. Earlier experiments found a 25-26% shortcut in some seeds.
 assert.ok(shortcutPercent<=35,
  'early return 25 has become a >35% mandatory shortcut: '+mode+'/'+seed);
 return {mode,seed,firstReturnSeconds:invest.firstReturnSeconds,
  direct45Seconds:base.cleared45AtSeconds,
  return25NoCoreSeconds:noCore.cleared45AtSeconds,
  return25InvestedSeconds:invest.cleared45AtSeconds,
  extraChestOpens:invest.openedChests-base.openedChests,
  incrementalCoreInvestmentSavedSeconds:noCore.cleared45AtSeconds-invest.cleared45AtSeconds,
  measuredShortcutPercent:shortcutPercent};
}));
console.log(JSON.stringify({experiment:'controlled-first-return-vs-extra-relic-chests',synthetic:true,
 note:'First clear45 elapsed time. 5-min manual checkins PLUS every five-clear milestone chest opening in *both* direct and returned runs. Early return is manually chosen; core investment is separately controlled. No forced first-rebirth time, no hidden timer.',
 rows,routeComparison}));
