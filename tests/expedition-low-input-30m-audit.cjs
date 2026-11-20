'use strict';
// Real expedition engine, 30-minute low-input observation; no forced drops or returns.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../site/expedition-engine.js');
const seeds=[123456789,987654321,20261118];
const modes=['balanced','adaptive'];
const chestCadences=[60,300];
const results=[];
for(const mode of modes)for(const seed of seeds)for(const chestEvery of chestCadences){
 const s=E.newState(1000);s.seed=seed;
 assert.equal(E.setAutoBuy(s,mode,true),true);
 assert.equal(s.autoChest.enabled,false);
 let opened=0,manualActions=0,firstChest=null,firstRelic=null;
 const checkpoints=[];
 const milestones=[];
 let lastStage=s.stage,lastRelicCount=0,lastAdvanceAt=0,lastRewardAt=0;
 let longestStageWait=0,longestRewardWait=0,stageWaitAt=null,rewardWaitAt=null;
 const rewardEvents=[];
 for(let second=1;second<=1800;second++){
  E.tick(s,1);
  if(s.stage>lastStage){
   if(second-lastAdvanceAt>longestStageWait){longestStageWait=second-lastAdvanceAt;stageWaitAt=lastStage;}
   milestones.push({second,stage:s.stage});lastStage=s.stage;lastAdvanceAt=second;
  }
  if(s.chests>0&&firstChest===null)firstChest=second;
  if(second%chestEvery===0){
   if(s.chests>0)manualActions++;
   while(s.chests>0){assert.ok(E.openChest(s));opened++;
    if(second-lastRewardAt>longestRewardWait){longestRewardWait=second-lastRewardAt;rewardWaitAt=second;}
    rewardEvents.push({second,kind:'chest-open'});lastRewardAt=second;
   }
  }
  const count=E.RELICS.filter(r=>E.relic(s,r.id)>0).length;
  if(count>lastRelicCount&&firstRelic===null)firstRelic=second;
  lastRelicCount=count;
  if(second%300===0)checkpoints.push({minute:second/60,stage:s.stage,credits:s.credits,chests:s.chests,opened,uniqueRelics:count,manualActions});
 }
 if(1800-lastAdvanceAt>longestStageWait){longestStageWait=1800-lastAdvanceAt;stageWaitAt=lastStage;}
 if(1800-lastRewardAt>longestRewardWait){longestRewardWait=1800-lastRewardAt;rewardWaitAt=1800;}
 assert.equal(checkpoints.length,6);
 assert.ok(manualActions<=1800/chestEvery,'manual chest batches cannot exceed scheduled checks');
 assert.ok(milestones.every((x,i)=>i===0||x.second>=milestones[i-1].second));
 results.push({mode,seed,chestEvery,firstChest,firstRelic,opened,manualActions,
  finalStage:s.stage,uniqueRelics:lastRelicCount,longestStageWait,stageWaitAt,longestRewardWait,rewardWaitAt,rewardEvents,stageMilestones:milestones,checkpoints});
}
assert.equal(results.length,12);
const output={experiment:'expedition-30m-low-input-cadence',synthetic:true,
 methodology:'Actual expedition engine, 1-second ticks, auto-buy enabled, chest batch every 60s or 300s, no forced drops/returns, 3 seeds x 2 auto-buy modes.',
 caveats:['No human or mobile device observations','Engine ticks are not frame-rate or offline lifecycle evidence','Chest opening is a scheduled manual action; no tapping combat','Milestones represent stage advancement, not subjective enjoyment'],
 results};
const target=path.join(__dirname,'..','artifacts','expedition','low-input-30m.json');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify(output,null,2)+'
');
console.log('LOW_INPUT_30M_SUMMARY '+JSON.stringify(results.map(({mode,seed,chestEvery,firstChest,firstRelic,opened,manualActions,finalStage,uniqueRelics,longestStageWait,stageWaitAt,longestRewardWait,checkpoints})=>({mode,seed,chestEvery,firstChest,firstRelic,opened,manualActions,finalStage,uniqueRelics,longestStageWait,stageWaitAt,longestRewardWait,checkpoints}))));
console.log('LOW_INPUT_30M_OUTPUT '+target);
