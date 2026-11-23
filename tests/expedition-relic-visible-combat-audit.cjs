'use strict';
/* Deterministic real-combat perception proxy: not a human playability claim.
 * Compare one vs two vs maximum copies at the same depth, starting party,
 * HP, XP, and time; observe damage, fighter defeats, and visible cues.
 * Never add combat power to compensate for an invisible bonus. */
const E=require('../site/expedition-engine.js');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const copy=s=>JSON.parse(JSON.stringify(s));
const SAMPLE_SECONDS=180;
const ITEMS=['ember','archer','boss','shield','guard','medkit','income','scout','fortune'];
const FIGHTS=[
 {name:'elite35',stage:35,hpRatio:1},
 {name:'boss50',stage:50,hpRatio:1},
 {name:'boss60-second-phase',stage:60,hpRatio:.45}
];
const observed={};
function scene(id,copies,fight){
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=fight.stage;
 s.training=7;s.heroLevel=15;s.traits.command=3;s.coreUpgrades.valor=6;
 s.units={guard:4,ranger:3,medic:2};
 for(const r of E.RELICS)s.relics[r.id]=1;
 s.relics[id]=copies;
 s.actors=E.UNITS.flatMap(u=>Array(s.units[u.id]).fill(0).map(()=>({
  id:u.id,hp:E.actorMaxHp(s,u.id),revive:0,progress:0,cooldown:.6,shots:0
 })));
 s.squadHp=s.actors.reduce((a,b)=>a+b.hp,0);
 s.enemyHp=E.enemyMax(fight.stage)*fight.hpRatio;
 return s;
}
function run(id,copies,fight){
 const s=scene(id,copies,fight),initialHp=s.enemyHp,
  initialCues=s.battleCueSeq,visible={},secondsAlive={guard:0,ranger:0,medic:0};
 let endedAt=null,lastSeq=initialCues;
 for(let t=1;t<=SAMPLE_SECONDS;t++){
  E.tick(s,1);
  for(const u of E.UNITS)secondsAlive[u.id]+=
   s.actors.filter(a=>a.id===u.id&&a.hp>0&&a.revive===0).length;
  if(s.battleCueSeq>lastSeq&&s.battleEvent){
   const type=s.battleEvent.type;
   visible[type]=(visible[type]||0)+1;lastSeq=s.battleCueSeq;
  }
  if(s.stage>fight.stage){endedAt=t;break;}
 }
 const dealt=Object.values(s.contribution.damage).reduce((a,b)=>a+b,0);
 const result={item:id,copies,scenario:fight.name,stage:fight.stage,
  initialEnemyHp:Math.round(initialHp),startDps:+E.partyDps(scene(id,copies,fight)).toFixed(2),
  observedSeconds:endedAt||SAMPLE_SECONDS,cleared:endedAt!==null,
  damageDealt:+dealt.toFixed(2),estimatedRemainingHp:endedAt?0:+Math.max(0,s.enemyHp).toFixed(2),
  attacks:{...s.contribution.attacks},falls:{...s.contribution.falls},
  fighterAliveSeconds:secondsAlive,volleys:s.relicEffects.volleys,
  volleyBonusDamage:+s.relicEffects.volleyBonusDamage.toFixed(2),
  triages:s.relicEffects.triages,guardPlateBlocks:s.relicEffects.guardPlateBlocks,
  intercepts:s.relicEffects.intercepts,braces:s.relicEffects.braces,
  visibleCueCounts:visible,allCues:s.battleCueSeq-initialCues,
  seedAfter:s.seed};
 assert.ok(result.damageDealt>=0&&result.allCues>=0);
 assert.equal(s.autoBuy.purchases,0,'no forced automation in comparison');
 return result;
}
for(const id of ITEMS){
 const item=E.RELICS.find(r=>r.id===id);
 assert.ok(item?.cap>=2);
 observed[id]=FIGHTS.map(fight=>{
  const samples=[1,2,item.cap].map(n=>run(id,n,fight));
  const first=samples[0],second=samples[1];
  const changedEvents=JSON.stringify(first.visibleCueCounts)!==JSON.stringify(second.visibleCueCounts);
  const changedDamage=Math.abs(first.damageDealt-second.damageDealt)>.01;
  const changedSurvival=JSON.stringify(first.falls)!==JSON.stringify(second.falls)||
   JSON.stringify(first.fighterAliveSeconds)!==JSON.stringify(second.fighterAliveSeconds);
  const returnData={scenario:fight.name,samples,changedDamage,changedSurvival,
   changedVisibleEventCounts:changedEvents,
   secondVsFirstDamagePercent:first.damageDealt>0?
    +((second.damageDealt/first.damageDealt-1)*100).toFixed(3):null};
  if(id==='income'||id==='scout'||id==='fortune'){
   // Without purchase/relic draws/levels, these cannot directly alter battle.
   assert.equal(second.damageDealt,first.damageDealt,id+' should not fake combat damage');
   assert.deepEqual(second.visibleCueCounts,first.visibleCueCounts,id+' should not fake combat cues');
  }
  return returnData;
 });
}
const summary={seconds:SAMPLE_SECONDS,
 fights:FIGHTS,items:ITEMS,
 noNewActionPromise:true,
 interpretation:'A displayed hit/precision cue may change in amount without any new cue event. A repeated stat increase is not itself a new combat mechanic.',
 perItem:ITEMS.map(id=>({id,scenarios:observed[id].map(x=>({name:x.scenario,
  damaged:x.changedDamage,survival:x.changedSurvival,
  cueCountChanged:x.changedVisibleEventCounts,
  damagePct:x.secondVsFirstDamagePercent,
  firstClear:x.samples[0].cleared?x.samples[0].observedSeconds:null,
  secondClear:x.samples[1].cleared?x.samples[1].observedSeconds:null}))}))};
const output={experiment:'duplicate-relic-180s-combat-observation',synthetic:true,summary,observed};
const target=path.join(__dirname,'..','artifacts','expedition','relic-visible-combat.json');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify(output,null,2)+'\n');
console.log('RELIC_VISIBLE_COMBAT_SUMMARY '+JSON.stringify(summary));
console.log('RELIC_VISIBLE_COMBAT_OUTPUT '+target);
