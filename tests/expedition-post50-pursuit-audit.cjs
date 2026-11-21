'use strict';
/* Three voluntary expeditions, fixed seeds. The post-50 collectible has to
 * become available before the next boss, without distorting first return or
 * forcing automatic return. Synthetic elapsed times are not phone timings. */
const assert=require('node:assert/strict'),E=require('../site/expedition-engine.js');
const SEEDS=[123456789,987654321,20261118],MODES=['balanced','adaptive'];
function scenario(seed,mode,autoChest){
 const s=E.newState(1000);s.seed=seed;
 assert.equal(E.setAutoBuy(s,mode,true),true);
 assert.equal(E.setAutoChest(s,autoChest),true);
 const cycle=(target,maxSeconds)=>{
  let start60=null,found55=null;
  for(let t=1;t<=maxSeconds;t++){
   E.tick(s,1);
   if(!autoChest&&t%300===0)while(s.chests>0)assert.ok(E.openChest(s));
   if(start60===null&&s.stage===60)start60=t;
   if(found55===null&&E.relic(s,'pursuit')>0)found55=t;
   if(s.stage>target)
    return{seconds:t,boss60Seconds:start60===null?null:t-start60,
     discoverySeconds:found55,coreValor:s.coreUpgrades.valor,returnCount:s.rebirths,
     relicKinds:E.RELICS.filter(r=>E.relic(s,r.id)>0).length,
     first55:s.runMilestones[55]??null,first60:s.runMilestones[60]??null};
  }
  throw Error('distance '+target+' not cleared: '+JSON.stringify({seed,mode,stage:s.stage}));
 };
 const first=cycle(45,9000);
 assert.equal(first.coreValor,0,'no baseline early return power');
 assert.equal(first.discoverySeconds,null,'cannot find distance55 relic before first return');
 if(!autoChest)while(s.chests>0)assert.ok(E.openChest(s));
 assert.ok(E.rebirth(s)>0);
 while(E.buyCore(s,'valor')){}
 const second=cycle(50,9000);
 assert.equal(second.discoverySeconds,null,'cannot find distance55 relic by boss50');
 if(!autoChest)while(s.chests>0)assert.ok(E.openChest(s));
 assert.ok(E.rebirth(s)>0);
 while(E.buyCore(s,'valor')){}
 const third=cycle(60,11000);
 assert.equal(E.relic(s,'pursuit'),1,'first earned 55 chest must grant a new collectible');
 assert.ok(third.discoverySeconds>0,'55-depth first discovery time');
 assert.ok(third.first55>=0&&third.first60>third.first55,'55 and 60 progress must be archived');
 assert.ok(third.boss60Seconds>0&&third.boss60Seconds<=(autoChest?780:1000),
  'boss 60 reverted to a >13 minute HP sponge: '+JSON.stringify({seed,mode,third}));
 assert.equal(third.returnCount,2,'60 boss must never trigger automatic rebirth');
 return {seed,mode,autoChest,first45:first.seconds,second50:second.seconds,
  third60:third.seconds,boss60Seconds:third.boss60Seconds,
  found55At:third.discoverySeconds,relicKinds:third.relicKinds,
  valor:third.coreValor,returns:third.returnCount};
}
const results=MODES.flatMap(mode=>SEEDS.flatMap(seed=>[true,false].map(autoChest=>scenario(seed,mode,autoChest))));
console.log(JSON.stringify({experiment:'post50-frontier-pursuit',
 synthetic:true,n:results.length,
 note:'45→manual return/valor→50→manual return/valor→60. 3 seeds x two auto-buy modes x opt-in 60s automatic opening or 300s manual check-ins; no automatic return or invented chests.',
 results}));
