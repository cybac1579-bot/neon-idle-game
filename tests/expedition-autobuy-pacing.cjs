'use strict';
/* Simulated 30-minute low-touch play, no claims about real users.
 * One deliberate player check-in each 5 minutes opens stored chests.
 * All run-credit purchases happen only when the selected opt-in mode is enabled. */
const assert=require('node:assert/strict');
const E=require('../site/expedition-engine.js');
const modes=['off','balanced','train','recruit','supply'];
const summaries=[];
for(const mode of modes){
 const s=E.normalize(E.newState(1000000),1000000);
 if(mode!=='off')assert.equal(E.setAutoBuy(s,mode,true),true);
 let chestClicks=0,newRelics=0,duplicates=0,checkIns=0;
 const checkpoints={};
 for(let sec=1;sec<=1800;sec++){
  E.tick(s,1);
  if(sec%300===0){
   checkIns++;
   while(s.chests>0){
    const opened=E.openChest(s);chestClicks++;
    if(opened&&opened.id){if(opened.duplicate)duplicates++;else newRelics++;}
   }
  }
  if([300,900,1800].includes(sec)){
   checkpoints[sec]={stage:s.stage,roster:s.actors.length,training:s.training,
    credits:Math.floor(s.credits),relics:newRelics,autoPurchases:s.autoBuy.purchases};
  }
 }
 const result={mode,checkIns,chestClicks,manualGrowthClicks:0,autoPurchases:s.autoBuy.purchases,
  autoSpent:Math.floor(s.autoBuy.spent),newRelics,duplicates,checkpoints,
  final:{stage:s.stage,training:s.training,units:s.actors.length,
  quests:{...s.questLevels},credits:Math.floor(s.credits),coreGain:E.rebirthGain(s)},
  remainingChests:s.chests};
 assert.equal(s.rebirths,0);
 assert.equal(s.chestsOpened,chestClicks);
 assert.equal(s.autoBuy.enabled,mode!=='off');
 assert.equal(s.autoBuy.mode,mode==='off'?'balanced':mode);
 assert.ok(s.autoBuy.purchases>=0);
 if(mode==='off')assert.equal(s.autoBuy.purchases,0);
 if(mode==='train'){assert.equal(s.actors.length,2);assert.deepEqual(s.questLevels,{dispatch:0,salvage:0,contract:0});}
 if(mode==='recruit'){assert.equal(s.training,0);assert.deepEqual(s.questLevels,{dispatch:0,salvage:0,contract:0});}
 if(mode==='supply'){assert.equal(s.training,0);assert.equal(s.actors.length,2);}
 summaries.push(result);
}
console.log(JSON.stringify({experiment:'30-minute low-touch selected auto-buy',evidence:'Deterministic engine simulation only, not human playing',notes:'Up to six player check-ins, every 300 sec, to open all earned relic chests. Manual growth purchases = 0; all purchases require opt-in. Under a no-check-in scenario chests remain unopened and growth is weaker.',summaries}));
