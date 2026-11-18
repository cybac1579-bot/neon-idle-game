'use strict';
/* Deterministic duplicate-copy value audit, not a prediction of player behavior.
 * Same full squad and growth investments for every relic level. Compare
 * ordinary/elite/boss/half-HP contexts, economy, and real battle strikes.
 * An ability unlocked by first ownership may stay binary even when passive
 * copy value increases. No production balance is changed by this script. */
const E=require('../site/expedition-engine.js');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const clone=s=>JSON.parse(JSON.stringify(s));
const rel=(a,b)=>b===0?null:+((a/b-1)*100).toFixed(3);
const round=v=>+Number(v).toFixed(5);
const make=(stage=45)=>{
 const s=E.newState(1000);
 s.stage=s.best=s.runBest=stage;s.training=7;s.heroLevel=15;s.heroXp=0;
 s.questLevels={dispatch:6,salvage:4,contract:3};s.cores=0;
 s.units={guard:4,ranger:3,medic:2};
 s.actors=['guard','guard','guard','guard','ranger','ranger','ranger','medic','medic']
  .map(id=>({id,hp:1e8,revive:0,progress:1,cooldown:0,shots:0}));
 s.enemyHp=E.enemyMax(stage);
 return s;
};
function state(id,copies,stage=45){
 const s=make(stage);if(copies>0)s.relics[id]=copies;
 return s;
}
function metrics(id,copies){
 const ordinary=state(id,copies,45),boss=state(id,copies,50),second=state(id,copies,60);
 second.enemyHp=E.enemyMax(60)*.4;
 const q=Object.fromEntries(E.QUESTS.map(item=>[item.id,round(E.questIncome(ordinary,item))]));
 const data={
  normalDps:round(E.partyDps(ordinary)),
  bossFullDps:round(E.partyDps(boss)),
  bossHalfDps:round(E.partyDps(second)),
  squadHp:round(E.maxHp(ordinary)),
  guardHp:round(E.actorMaxHp(ordinary,'guard')),
  rangerHp:round(E.actorMaxHp(ordinary,'ranger')),
  healDps:round(E.healDps(ordinary)),
  questIncome:q,
  recruitCost:E.hireCost(ordinary),trainingCost:E.trainCost(ordinary)
 };
 // Full-ranged squad shot vs boss, where the boss-only multiplier actually
 // enters fighter damage rather than the general DPS description.
 const combat=state(id,copies,50);
 const before=combat.enemyHp;E.tick(combat,1);
 data.bossOpeningDamage=round(before-combat.enemyHp);
 data.volleyCount=combat.relicEffects.volleys;
 // Force each ranger to its third shot for a reproducible volley bonus.
 const burst=state(id,copies,35);
 burst.actors.filter(a=>a.id==='ranger').forEach(a=>a.shots=2);
 burst.enemyHp=1e11;
 E.tick(burst,1);data.thirdShotBonus=round(burst.relicEffects.volleyBonusDamage);
 // One actual earned shallow clear for hero XP and combat bounty.
 const clear=state(id,copies,2);
 clear.enemyHp=1;
 clear.actors.forEach(a=>{a.progress=1;a.cooldown=0;});
 const oldCredits=clear.credits;
 E.tick(clear,1);
 assert.equal(clear.stage,3);
 data.clearCredits=round(clear.credits-oldCredits);
 data.clearHeroXp=round(clear.heroXp);
 // A known duplicate, not a random kind, isolates fortune's payout.
 const duplicate=state(id,copies,5);
 for(const r of E.RELICS)if(r.unlockStage<=5)duplicate.relics[r.id]=r.cap;
 duplicate.relics.ember=1;
 duplicate.chests=1;duplicate.chestDepths=[5];
 const oldDupCredits=duplicate.credits;
 const award=E.openChest(duplicate);
 assert.equal(award.id,'ember');
 assert.equal(award.duplicate,true);
 data.duplicateCreditBonus=round(duplicate.credits-oldDupCredits);
 return data;
}
function flatten(o,prefix='',out={}){
 for(const [key,v] of Object.entries(o)){
  if(v&&typeof v==='object')flatten(v,prefix+key+'.',out);
  else out[prefix+key]=v;
 }
 return out;
}
function diff(base,other){
 const a=flatten(base),b=flatten(other);
 return Object.keys(a).filter(k=>a[k]!==b[k]).map(k=>({metric:k,
  from:a[k],to:b[k],percent:rel(b[k],a[k])}));
}
const rows=E.RELICS.map(r=>{
 const zero=metrics(r.id,0),one=metrics(r.id,1),two=metrics(r.id,Math.min(2,r.cap)),maximum=metrics(r.id,r.cap);
 const first=diff(zero,one),additional=r.cap>1?diff(one,two):[],maxGain=diff(one,maximum);
 const result={id:r.id,name:r.name,unlockStage:r.unlockStage,cap:r.cap,
  oneCopyFirstMetrics:first,secondCopyChanges:additional,oneToCapChanges:maxGain,
  firstDistinct:first.length,secondDistinct:additional.length,
  additionalObservable:additional.length>0,fullyMaxedObservable:maxGain.length>0,
  observed:{zero,one,two,maximum}};
 if(r.cap>1)assert.ok(maxGain.length>0||additional.length===0,
  'isolated duplicate metric only, not a universal usefulness guarantee');
 assert.ok(r.cap===1||r.cap>1);
 assert.ok(first.length>0,'first copy should have an observable effect: '+r.id);
 return result;
});
assert.equal(rows.length,E.RELICS.length);
const repeated=rows.filter(x=>x.cap>1);
const summary={
 firstCopiesObservable:rows.filter(x=>x.firstDistinct>0).length,
 repeatedKinds:repeated.length,
 repeatedKindsWithDirectChange:repeated.filter(x=>x.additionalObservable).length,
 repeatedKindsWithoutDirectChange:repeated.filter(x=>!x.additionalObservable).map(x=>x.id),
 uniqueKinds:rows.filter(x=>x.cap===1).map(x=>x.id),
 limitedScope:'No units missing, no HP loss and no time delay. Other tactical bonuses may be binary/conditional even when these metrics increase.',
 samples:rows.map(x=>({id:x.id,name:x.name,cap:x.cap,
  secondObserved:x.additionalObservable,
  first:x.oneCopyFirstMetrics.map(y=>y.metric),
  second:x.secondCopyChanges.map(y=>y.metric),
  oneToCap:x.oneToCapChanges.map(y=>y.metric)}))
};
const report={experiment:'permanent-relic-copy-impact-by-condition',
 synthetic:true,rootEngine:'site/expedition-engine.js',summary,rows};
const outfile=path.join(__dirname,'..','artifacts','expedition','relic-copy-impact.json');
fs.mkdirSync(path.dirname(outfile),{recursive:true});
fs.writeFileSync(outfile,JSON.stringify(report,null,2)+'\n');
console.log('RELIC_COPY_SUMMARY '+JSON.stringify(summary));
for(const row of rows)console.log('RELIC_COPY_ROW '+JSON.stringify({id:row.id,first:row.oneCopyFirstMetrics,second:row.secondCopyChanges,cap:row.oneToCapChanges}));
console.log('RELIC_COPY_OUTPUT '+outfile);
