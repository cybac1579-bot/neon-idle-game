'use strict';
// Integration smoke: verifies the actual latest-main game loads after visual transplant.
// Run: npm install --no-save playwright@1.56.1 && npx playwright install chromium
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {once}=require('node:events');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve('site');
const server=createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(target,(err,data)=>{
  if(err){res.writeHead(404).end();return}
  const type={'.html':'text/html','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'}[path.extname(target)]||'application/octet-stream';
  res.writeHead(200,{'content-type':type}).end(data);
 });
});
(async()=>{
 let browser;
 try{
  server.listen(0,'127.0.0.1');await once(server,'listening');
  browser=await chromium.launch({headless:true});
  for(const width of [360,390,412]){
   const page=await browser.newPage({viewport:{width,height:844}});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(r.status()+' '+r.url())});
   await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
   await page.waitForFunction(()=>document.querySelector('#stage')?.textContent?.trim().length>0,null,{timeout:12000});
   assert.equal(await page.locator('[data-screen="battle"]:not(.view-hidden)').count(),1);
   const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,arena:document.querySelector('[data-screen="battle"] .fight').getBoundingClientRect().height,images:[...document.querySelectorAll('[data-screen="battle"] .fight img')].map(i=>({ok:i.complete&&i.naturalWidth>0,src:i.getAttribute('src')}))}));
   assert.equal(layout.overflow,false,'horizontal overflow at '+width);
   assert.ok(layout.arena>=205,'combat arena too short at '+width);
   assert.ok(layout.images.length>=2&&layout.images.every(i=>i.ok),'battle images missing at '+width+': '+JSON.stringify(layout.images));
   assert.deepEqual(errors,[],'browser errors at '+width);
   await page.locator('[data-view="growth"]').first().click();
   const questLayout=await page.evaluate(()=>{
    const list=document.getElementById('cacheTimer');
    const rows=[...list.querySelectorAll('.quest-row')];
    return {count:rows.length,overflow:document.documentElement.scrollWidth>innerWidth+1,
     rowOverflow:rows.some(row=>row.scrollWidth>row.clientWidth+1),
     text:rows.map(row=>row.textContent.trim())};
   });
   assert.equal(questLayout.count,3,'three independent quest rows must render at '+width);
   assert.equal(questLayout.overflow,false,'growth view horizontal overflow at '+width);
   assert.equal(questLayout.rowOverflow,false,'quest row text overflow at '+width);
   assert.ok(questLayout.text.every(x=>x.length>0),'quest status missing at '+width);
   for(const view of ['growth','reset','stats','battle']){
    await page.locator('[data-view="'+view+'"]').first().click();
    assert.ok(await page.locator('[data-screen="'+view+'"]:not(.view-hidden)').count()>0,'navigation failed '+view);
   }
   // Persistence smoke: the existing save button must create a readable state,
   // and a fresh document load must restore it without runtime errors.
   await page.locator('[data-view="stats"]').first().click();
   await page.locator('#save').click();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_rework_07')||'null'));
   assert.ok(saved&&Number.isFinite(saved.credits)&&Number.isFinite(saved.stage),'save state missing at '+width);
   assert.ok(saved.stage>=1&&saved.credits>=0,'invalid saved progression at '+width);
   await page.reload({waitUntil:'load'});
   await page.waitForFunction(()=>document.querySelector('#stage')?.textContent?.trim().length>0,null,{timeout:12000});
   const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_rework_07')||'null'));
   assert.ok(restored&&restored.best>=saved.best&&restored.rebirths===saved.rebirths,'save restoration failed at '+width);
   // The game's pagehide handler saves a fresh timestamp during reload.
   // Seed stale storage at document start, AFTER pagehide but BEFORE game.js loads.
   const offlineSeed=await page.evaluate(()=>{
    const state=JSON.parse(localStorage.getItem('neon_rework_07'));
    return {rebirths:state.rebirths,stage:state.stage};
   });
   await page.addInitScript(()=>{
    const key='neon_rework_07';
    const state=JSON.parse(localStorage.getItem(key));
    if(!state)return;
    state.lastSaved=Date.now()-30000;
    state.autoRebirth=true;
    state.autoLevel=Math.max(3,state.autoLevel);
    localStorage.setItem(key,JSON.stringify(state));
   });
   await page.reload({waitUntil:'load'});
   await page.waitForFunction(()=>document.querySelector('#stage')?.textContent?.trim().length>0,null,{timeout:12000});
   const offline=await page.evaluate(()=>{
    const state=JSON.parse(localStorage.getItem('neon_rework_07'));
    return {rebirths:state.rebirths,stage:state.stage,log:document.querySelector('#log').textContent};
   });
   assert.equal(offline.rebirths,offlineSeed.rebirths,'offline auto-rebirth occurred at '+width);
   assert.ok(offline.stage>=offlineSeed.stage,'offline stage regressed at '+width);
   assert.match(offline.log,/방치 진행/,'offline settlement missing at '+width);
   const settledSeconds=Number(offline.log.match(/방치 진행 (\d+)초/)?.[1]);
   assert.ok(settledSeconds>=25&&settledSeconds<=120,'unexpected offline duration at '+width+': '+offline.log);
   assert.deepEqual(errors,[],'browser errors after save/reload at '+width);
   // Reconstruction smoke: a seeded eligible save must reset temporary progress
   // while preserving permanent hero growth and granting the expected cores.
   const resetPage=await browser.newPage({viewport:{width,height:844}});
   const resetErrors=[];
   resetPage.on('pageerror',e=>resetErrors.push(e.message));
   await resetPage.addInitScript(()=>{
    localStorage.setItem('neon_rework_07',JSON.stringify({
     stage:100,best:100,credits:1000,atk:3,spd:2,gen:2,
     heroLevel:12,traitPointsEarned:11,traits:{precision:2},
     traitPointsSpent:2,rebirths:0,cores:0,totalCores:0,
     weapon:{tier:1,stage:95},skillsOwned:['overload','chain'],
     skillsEquipped:['overload','chain'],skillsInherited:['chain'],
     skillLevels:{overload:8,chain:6},skillXp:{overload:3,chain:5},
     lastSaved:Date.now()
    }));
   });
   resetPage.on('dialog',dialog=>dialog.accept());
   await resetPage.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
   await resetPage.locator('[data-view="reset"]').first().click();
   assert.equal(await resetPage.locator('#rebirth').isDisabled(),false,'eligible reconstruction disabled at '+width);
   await resetPage.locator('#rebirth').click();
   const reconstructed=await resetPage.evaluate(()=>JSON.parse(localStorage.getItem('neon_rework_07')));
   assert.equal(reconstructed.rebirths,1,'reconstruction count at '+width);
   assert.equal(reconstructed.stage,1,'stage not reset at '+width);
   assert.equal(reconstructed.atk,0,'temporary attack upgrade retained at '+width);
   assert.equal(reconstructed.heroLevel,12,'permanent hero level lost at '+width);
   assert.equal(reconstructed.traits.precision,2,'permanent trait lost at '+width);
   assert.ok(reconstructed.cores>=5,'reconstruction core reward missing at '+width);
   assert.equal(reconstructed.weapon,null,'weapon carried across reconstruction at '+width);
   assert.deepEqual(reconstructed.skillsOwned,['chain'],'wrong inherited skill set at '+width);
   assert.deepEqual(reconstructed.skillsEquipped,['chain'],'inherited skill not equipped at '+width);
   assert.deepEqual(reconstructed.skillsInherited,['chain'],'inheritance selection lost at '+width);
   assert.equal(reconstructed.skillLevels.chain,1,'inherited skill level not reset at '+width);
   assert.ok(!('overload' in reconstructed.skillLevels),'non-inherited skill level retained at '+width);
   assert.deepEqual(resetErrors,[],'reconstruction browser errors at '+width);
   await resetPage.close();
   // Timed quests accrue independently, then transfer rewards exactly once.
   if(width===390){
    const questPage=await browser.newPage({viewport:{width,height:844}});
    const questErrors=[];
    questPage.on('pageerror',e=>questErrors.push(e.message));
    await questPage.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
    const questResult=await questPage.evaluate(()=>{
     s.best=3;s.questClocks=[5.9,29.9,119.9];
     const before=s.questCredits.slice();
     step(.2,false);
     const accrued=s.questCredits.map((x,i)=>x-before[i]);
     const creditsBeforeClaim=s.credits;
     const first=transferCacheCredits();
     const creditsAfterClaim=s.credits;
     const second=transferCacheCredits();
     return {accrued,first,second,creditsBeforeClaim,creditsAfterClaim,remaining:s.questCredits.reduce((a,b)=>a+b,0)};
    });
    assert.ok(questResult.accrued.every(x=>x>0),'timed quest reward did not accrue');
    assert.equal(questResult.first,questResult.accrued.reduce((a,b)=>a+b,0),'claimed amount differs from quest accrual');
    assert.equal(questResult.creditsAfterClaim,questResult.creditsBeforeClaim+questResult.first,'quest claim did not credit balance');
    assert.equal(questResult.second,0,'quest reward double-claimed');
    assert.equal(questResult.remaining,0,'quest rewards remained after claim');
    assert.deepEqual(questErrors,[],'timed quest browser errors');
    await questPage.close();
    // Automated purchases must be gated by research and obey their cadence.
    const autoPage=await browser.newPage({viewport:{width,height:844}});
    const autoErrors=[];
    autoPage.on('pageerror',e=>autoErrors.push(e.message));
    await autoPage.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
    const automation=await autoPage.evaluate(()=>{
     s.credits=1e8;s.best=1;s.autoBuy=true;s.autoLevel=0;
     const before=s.atk+s.spd+s.gen;
     step(31,false);
     const locked=s.atk+s.spd+s.gen;
     s.autoLevel=1;s.autoPurchaseClock=0;
     step(9,false);
     const beforeInterval=s.atk+s.spd+s.gen;
     step(1.1,false);
     const afterInterval=s.atk+s.spd+s.gen;
     return {before,locked,beforeInterval,afterInterval};
    });
    assert.equal(automation.locked,automation.before,'auto purchase bypassed research');
    assert.equal(automation.beforeInterval,automation.locked,'auto purchase fired before research interval');
    assert.ok(automation.afterInterval>automation.beforeInterval,'auto purchase failed after interval');
    assert.deepEqual(autoErrors,[],'auto purchase browser errors');
    await autoPage.close();
    // Baseline balance telemetry (NOT a 60-minute pass criterion yet).
    // Virtual-time simulation includes enemy kills, passive income, and purchases.
    // It intentionally does not assume unimplemented timed quests or optimal skill play.
    const balancePage=await browser.newPage({viewport:{width,height:844}});
    const balanceErrors=[];
    balancePage.on('pageerror',e=>balanceErrors.push(e.message));
    await balancePage.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
    const balance=await balancePage.evaluate(()=>{
     const checkpoints=[];
     let firstReconstructionAt=null;
     for(let t=1;t<=3600;t++){
      step(1,false);
      if(t%10===0){
       transferCacheCredits();
       for(let n=0;n<30;n++){
        const affordable=Object.keys(costs).filter(k=>s.best>=unlockStage[k]&&(k!=='spd'||s.spd<50)&&s.credits>=cost(k))
          .sort((a,b)=>unlockStage[b]-unlockStage[a]);
        if(!affordable.length)break;
        purchase(affordable[0]);
       }
      }
      if(firstReconstructionAt===null&&gainCore()>0)firstReconstructionAt=t;
      if(t%600===0)checkpoints.push({minute:t/60,stage:s.stage,best:s.best,heroLevel:s.heroLevel,credits:Math.floor(s.credits),kills:s.kills,weapon:!!s.weapon,skills:s.skillsOwned.length});
     }
     return {firstReconstructionAt,checkpoints,finalStage:s.stage,rebirthReady:gainCore()>0};
    });
    assert.equal(balance.checkpoints.length,6,'balance checkpoints missing');
    assert.ok(balance.finalStage>=1&&Number.isFinite(balance.finalStage),'invalid simulated stage');
    assert.ok(balance.checkpoints.every(c=>Number.isFinite(c.credits)&&Number.isFinite(c.heroLevel)),'non-finite simulated credits or hero level');
    assert.deepEqual(balanceErrors,[],'balance simulation browser errors');
    console.log('BALANCE_QUEST_CLAIM_60M '+JSON.stringify(balance));
    await balancePage.close();


   }

   // Permanent hero level determines equipped skill slots (1, 10, 25, 40, 60).
   // The level-60 inheritance trait expands the inherited-skill limit to two.
   if(width===390){
    for(const [level,expectedSlots,expectedInheritance] of [[1,1,1],[9,1,1],[10,2,1],[24,2,1],[25,3,1],[39,3,1],[40,4,1],[59,4,1],[60,5,2]]){
     const slotPage=await browser.newPage({viewport:{width,height:844}});
     const slotErrors=[];
     slotPage.on('pageerror',e=>slotErrors.push(e.message));
     await slotPage.addInitScript(level=>{
      localStorage.setItem('neon_rework_07',JSON.stringify({
       heroLevel:level,traitPointsEarned:level,traits:level>=60?{inherit:1}:{},
       skillsOwned:['overload','chain','bountySkill'],
       skillsEquipped:['overload','chain','bountySkill'],
       skillsInherited:['overload','chain'],
       lastSaved:Date.now()
      }));
     },level);
     await slotPage.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
     const actual=await slotPage.evaluate(()=>({
      slots:skillSlotCount(),inheritance:inheritanceSlots(),
      state:{skillsEquipped:[...s.skillsEquipped],skillsInherited:[...s.skillsInherited]}
     }));
     assert.equal(actual.slots,expectedSlots,'equipped skill slots at hero level '+level);
     assert.equal(actual.inheritance,expectedInheritance,'inheritance slots at hero level '+level);
     assert.ok(actual.state.skillsEquipped.length<=expectedSlots,'equipped skill overflow at '+level);
     assert.ok(actual.state.skillsInherited.length<=expectedInheritance,'inherited skill overflow at '+level);
     assert.deepEqual(slotErrors,[],'skill-slot browser errors at level '+level);
     await slotPage.close();
    }
   }

   console.log('PASS portrait + save/reload '+width,JSON.stringify(layout));
   await page.close();
  }
 }catch(e){console.error(e);process.exitCode=1}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})();
