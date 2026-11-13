// Browser-level smoke test: actual Chromium DOM, CSS, navigation, and dungeon actions.
// Run from repo root after installing playwright and Chromium.
const {chromium}=require('playwright');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const width of [360,412]){
   const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:2,isMobile:true,hasTouch:true});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('file://'+path.resolve(__dirname,'../site/index.html'));
   await page.waitForLoadState('load');
   const status=await page.evaluate(()=>({auto:document.querySelector('#deepAuto')?.getAttribute('aria-pressed'),script:typeof window.s,gameScript:[...document.scripts].map(x=>x.src||'inline')}));
   if(status.auto!=='false')throw new Error('Deep auto UI did not initialize: '+JSON.stringify(status)+'; page errors: '+JSON.stringify(errors));

   // Real wall-clock progression: no step() calls, clock mocking or injected resources.
   const liveBefore=await page.evaluate(()=>({clock:s.cacheClock,credits:s.credits,stage:s.stage}));
   await page.waitForTimeout(2200);
   const liveAfter=await page.evaluate(()=>({clock:s.cacheClock,credits:s.credits,stage:s.stage}));
   assert.ok(liveAfter.clock-liveBefore.clock>1.5,'foreground game clock advances without test acceleration');
   assert.ok(liveAfter.clock-liveBefore.clock<4,'foreground clock does not jump excessively');
   assert.ok(liveAfter.credits>=liveBefore.credits,'foreground resource production is nonnegative');
   assert.ok(liveAfter.stage>=liveBefore.stage,'foreground stage does not regress');
   // First-session player journey with no injected money or simulated game time.
   assert.match(await page.locator('#battleGoal').innerText(),/STAGE|스테이지|재구성/,'battle goal is visible');
   await page.locator('[data-view="reset"]').click();
   assert.equal(await page.locator('#rebirth').isDisabled(),true,'rebirth unavailable before stage 100');
   await page.locator('[data-view="growth"]').click();
   assert.match(await page.locator('#growthNext').innerText(),/구매 가능|크레딧 부족/,'growth panel explains next purchase');
   assert.ok((await page.locator('#growthNext').innerText()).length<100,'growth hint stays short');
   assert.ok((await page.locator('#upgrades [data-buy="atk"]').boundingBox()).height>=58,'growth upgrade tap target');
   const firstAtk=await page.evaluate(()=>s.atk);
   const firstCredits=await page.evaluate(()=>s.credits);
   assert.ok(firstCredits>=18,'starting player can afford first attack upgrade');
   await page.locator('#upgrades [data-buy="atk"]').click();
   assert.equal(await page.evaluate(()=>s.atk),firstAtk+1,'real starting credits purchase attack');
   assert.ok((await page.evaluate(()=>s.credits))<firstCredits,'first upgrade spends actual credits');
   assert.match(await page.locator('#growthNext').innerText(),/크레딧 부족|구매 가능/,'growth guidance updates after spending');
   await page.locator('[data-view="battle"]').click();
   await page.waitForTimeout(8000);
   assert.ok(await page.locator('#battleGoal').innerText(),'battle objective stays visible during live play');
   assert.ok((await page.evaluate(()=>s.cacheClock))>=9,'real game clock keeps running through first purchase');
   for(const tab of ['growth','reset','deep','stats','battle']){
    await page.locator('[data-view="'+tab+'"]').click();
    assert.equal(await page.locator('[data-view="'+tab+'"]').getAttribute('aria-pressed'),'true');
    assert.ok(await page.locator('[data-screen="'+tab+'"]').first().isVisible(),tab+' visible');
    for(const other of ['growth','reset','deep','stats','battle'].filter(x=>x!==tab))
     assert.equal(await page.locator('[data-screen="'+other+'"]').first().isVisible(),false,other+' hidden');
   }
   await page.locator('[data-view="deep"]').click();
   const auto=page.locator('#deepAuto');
   assert.ok((await auto.boundingBox()).height>=48,'auto tap height');
   await auto.click();
   assert.equal(await auto.getAttribute('aria-pressed'),'true');
   assert.match(await page.locator('#deepMessage').innerText(),/탐험 전투/);
   await auto.click();
   assert.equal(await auto.getAttribute('aria-pressed'),'false');
   assert.ok(await page.locator('#deepLeave').isEnabled());
   await page.locator('#deepLeave').click();
   assert.ok(await page.locator('#deepLeave').isDisabled());
   // A real browser reload must preserve progress, including dungeon state.
   await page.evaluate(()=>{
    s.deepFloor=4;
    s.deepShards=17;
    s.deepAuto=false;
    s.deepAutoClock=0;
    save();
   });
   await page.reload();
   await page.locator('[data-view="deep"]').click();
   assert.match(await page.locator('#deepFloor').innerText(),/4/,'saved dungeon floor restored');
   assert.match(await page.locator('#deepShards').innerText(),/17/,'saved dungeon shards restored');
   assert.equal(await page.locator('#deepAuto').getAttribute('aria-pressed'),'false');
   await page.locator('#deepAuto').click();
   assert.equal(await page.locator('#deepAuto').getAttribute('aria-pressed'),'true');
   await page.reload();
   await page.locator('[data-view="deep"]').click();
   assert.equal(await page.locator('#deepAuto').getAttribute('aria-pressed'),'true','auto choice survives reload');
   assert.ok(await page.locator('#deepLeave').isEnabled(),'active encounter survives reload');
   await page.locator('#deepAuto').click();
   await page.locator('#deepLeave').click();
   // Exercise a real growth button, then the confirmed rebirth and permanent core UI.
   await page.locator('[data-view="growth"]').click();
   const before=await page.evaluate(()=>({atk:s.atk,credits:s.credits}));
   const buy=page.locator('#upgrades [data-buy="atk"]');
   assert.ok(await buy.count(),'attack upgrade exists');
   await page.evaluate(()=>{s.credits=1000;render()});
   await buy.click();
   assert.equal(await page.evaluate(()=>s.atk),before.atk+1,'growth click increases attack');
   await page.evaluate(()=>{s.stage=110;s.best=Math.max(s.best,110);s.deepFloor=7;s.deepShards=29;render()});
   await page.locator('[data-view="reset"]').click();
   assert.ok(await page.locator('#rebirth').isEnabled());
   page.once('dialog',dialog=>dialog.accept());
   await page.locator('#rebirth').click();
   const rebirthState=await page.evaluate(()=>({stage:s.stage,rebirths:s.rebirths,cores:s.cores,deepFloor:s.deepFloor,shards:s.deepShards,atk:s.atk}));
   assert.equal(rebirthState.stage,1,'rebirth resets stage');
   assert.equal(rebirthState.rebirths,1,'rebirth count increases');
   assert.ok(rebirthState.cores>=5,'rebirth grants permanent cores');
   assert.equal(rebirthState.deepFloor,7,'rebirth preserves deep floor');
   assert.equal(rebirthState.shards,29,'rebirth preserves deep shards');
   assert.equal(rebirthState.atk,0,'rebirth resets normal upgrades');
   const core=page.locator('#coreUpgrades [data-core="corePower"]');
   assert.ok(await core.count(),'core upgrade button exists');
   await core.click();
   assert.equal(await page.evaluate(()=>s.corePower),1,'permanent core upgrade works');
   await page.reload();
   assert.equal(await page.evaluate(()=>s.corePower),1,'core upgrade survives reload');
   assert.equal(await page.evaluate(()=>s.deepFloor),7,'dungeon depth survives rebirth and reload');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no horizontal overflow');
   assert.deepEqual(errors,[],'browser JS exceptions');
   await page.close();
   console.log('Chromium portrait smoke passed at '+width+'px');
  }
  // A full unaccelerated minute validates the first timed idle payout in a real browser.
  const longPage=await browser.newPage({viewport:{width:360,height:850},isMobile:true,hasTouch:true});
  const longErrors=[];
  longPage.on('pageerror',e=>longErrors.push(e.message));
  await longPage.goto('file://'+path.resolve(__dirname,'../site/index.html'));
  const start=await longPage.evaluate(()=>({clock:s.cacheClock,credits:s.credits,stage:s.stage}));
  await longPage.waitForTimeout(62000);
  const end=await longPage.evaluate(()=>({clock:s.cacheClock,cache:s.cacheCredits,credits:s.credits,stage:s.stage}));
  assert.ok(end.clock>=0&&end.clock<10,'60-second timed cache clock rolls over');
  assert.ok(end.cache>0,'real minute creates claimable credits without injected state');
  assert.ok(end.credits>=start.credits,'passive currency does not fall');
  assert.ok(end.stage>=start.stage,'passive stage does not regress');
  await longPage.locator('[data-view="growth"]').click();
  assert.ok(await longPage.locator('#claimCache').isEnabled(),'timed payout can be claimed');
  const claimBefore=await longPage.evaluate(()=>({credits:s.credits,cache:s.cacheCredits}));
  await longPage.locator('#claimCache').click();
  const claimAfter=await longPage.evaluate(()=>({credits:s.credits,cache:s.cacheCredits}));
  assert.ok(claimAfter.credits>claimBefore.credits,'claim grants credits');
  assert.ok(claimAfter.cache<claimBefore.cache,'claim consumes accumulated payout');
  await longPage.reload();
  assert.ok(await longPage.evaluate(()=>s.credits)>=claimAfter.credits,'claimed payout survives reload');
  assert.deepEqual(longErrors,[],'long-running browser has no JS exceptions');
  await longPage.close();
  console.log('Chromium unaccelerated 62-second idle payout and claim passed');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
