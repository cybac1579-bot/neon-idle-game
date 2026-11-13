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
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no horizontal overflow');
   assert.deepEqual(errors,[],'browser JS exceptions');
   await page.close();
   console.log('Chromium portrait smoke passed at '+width+'px');
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
