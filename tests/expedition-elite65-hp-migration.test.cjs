'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),E=require('../site/expedition-engine.js');
const maxOld=stage=>{
 const early=Math.min(stage-1,39),late=Math.max(0,Math.min(stage-40,60));
 const tier=E.isBoss(stage)?(stage>=60?1.9:stage>=50?2.2:3.8):E.isElite(stage)?2:1;
 return Math.min(1e13,Math.round(tier*13*Math.pow(1.235,early)*Math.pow(1.18,late)));
};
test('all fights up to 64 except deliberately trimmed boss40 remain unchanged',()=>{
 for(let stage=1;stage<=64;stage++)if(stage!==40)assert.equal(E.enemyMax(stage),maxOld(stage),'stage'+stage);
 for(const stage of [70,80,90,100])assert.equal(E.enemyMax(stage),maxOld(stage),'boss'+stage);
});
test('late elite health decreases 40% from the original tier but remains elite',()=>{
 for(const stage of [65,75,85,95]){
  assert.ok(Math.abs(E.enemyMax(stage)-Math.round(maxOld(stage)*.6))<=1,'round once from base');
  assert.ok(E.enemyMax(stage)>E.enemyMax(stage-1)*1.4);
 }
 assert.equal(E.enemyMax(65),3674397);
});
test('old 65 elite saves preserve remaining HP fraction exactly once',()=>{
 for(const p of [.13,.37,.85,1]){
  const s=E.newState(1000);s.stage=s.best=s.runBest=65;
  s.enemyHp=Math.round(maxOld(65)*p);delete s.eliteHpBalanceVersion;
  const a=E.normalize(s,2000);
  assert.equal(a.eliteHpBalanceVersion,2);
  assert.ok(Math.abs(a.enemyHp/E.enemyMax(65)-p)<.000001);
  assert.equal(E.normalize(JSON.parse(JSON.stringify(a)),3000).enemyHp,a.enemyHp);
 }
});
test('already migrated v1 deep-elite fights retain exactly their HP percentage under v2',()=>{
 for(const stage of [65,75,85,95])for(const fraction of [.13,.5,.87]){
  const s=E.newState(1000);s.stage=s.best=s.runBest=stage;
  s.eliteHpBalanceVersion=1;
  const v1Max=Math.round(1.6*13*Math.pow(1.235,Math.min(stage-1,39))*
   Math.pow(1.18,Math.max(0,Math.min(stage-40,60))));
  s.enemyHp=Math.round(v1Max*fraction);
  const original=s.enemyHp;
  const normalized=E.normalize(JSON.parse(JSON.stringify(s)),2000);
  assert.equal(normalized.eliteHpBalanceVersion,2);
  assert.ok(Math.abs(normalized.enemyHp/E.enemyMax(stage)-original/v1Max)<.000001,
   'v1 save must retain already dealt damage fraction at stage '+stage);
  const again=E.normalize(JSON.parse(JSON.stringify(normalized)),3000);
  assert.equal(again.enemyHp,normalized.enemyHp,'v2 migration must not repeat');
 }
});
test('already migrated stage65 save HP is retained exactly',()=>{
 const s=E.newState(1000);s.stage=s.best=s.runBest=65;s.enemyHp=1234567;
 assert.equal(E.normalize(s,2000).enemyHp,1234567);
});
test('earlier and boss fights do not receive an elite health migration',()=>{
 for(const stage of [15,50,55,60,64,70]){
  const s=E.newState(1000);s.stage=s.best=s.runBest=stage;
  s.enemyHp=Math.round(E.enemyMax(stage)*.31);delete s.eliteHpBalanceVersion;
  assert.equal(E.normalize(s,2000).enemyHp,s.enemyHp);
 }
});
test('migration preserves credits, cores, discovered relics and return history',()=>{
 const s=E.newState(1000);s.stage=s.best=s.runBest=65;s.enemyHp=Math.round(maxOld(65)*.4);
 s.relics.pursuit=1;s.cores=12;s.credits=900;s.rebirths=3;s.seed=7812;
 const raw=JSON.parse(JSON.stringify(s));delete raw.eliteHpBalanceVersion;
 const a=E.normalize(raw,2000);
 for(const k of ['cores','credits','rebirths','seed','stage'])assert.equal(a[k],s[k],k);
 for(const relic of E.RELICS)assert.equal(E.relic(a,relic.id),E.relic(s,relic.id),relic.id);
 assert.equal(a.chests,s.chests);
});
test('all newly started and reborn runs contain the new migration marker',()=>{
 const s=E.newState(1000);assert.equal(s.eliteHpBalanceVersion,2);
 s.stage=s.best=s.runBest=45;s.coreProgress=12;
 assert.ok(E.rebirth(s)>0);assert.equal(s.eliteHpBalanceVersion,2);
 assert.equal(E.normalize(JSON.parse(JSON.stringify(s)),2000).eliteHpBalanceVersion,2);
});
