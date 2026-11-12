'use strict';
// Browser smoke test for the isolated redesign. Run from repository root.
// Requires: npm install --no-save playwright && npx playwright install chromium
const { chromium } = require('playwright');
const { once } = require('node:events');
const { strict: assert } = require('node:assert');
const { createServer } = require('node:http');
const fs = require('node:fs');
fs.mkdirSync('test-results',{recursive:true});
const path = require('node:path');
const root = path.resolve('site');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const server = createServer((req,res)=>{
  const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target = path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(target,(error,data)=>{
    if(error){res.writeHead(404).end();return}
    res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream'}).end(data);
  });
});
(async()=>{
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const port=server.address().port;
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))errors.push('HTTP '+response.status()+' '+response.url())});
    await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'load'});
    await page.waitForFunction(()=>document.querySelector('#stage')?.textContent?.trim().length>0);
    assert.equal(await page.locator('[data-screen="battle"]:not(.view-hidden)').count(),1);
    assert.equal(await page.locator('#combatStage img').count(),2);
    await page.waitForFunction(()=>[...document.querySelectorAll('#combatStage img')].every(img=>img.complete&&img.naturalWidth>0));
    const assets=await page.locator('#combatStage img').evaluateAll(images=>images.map(img=>({src:img.getAttribute('src'),width:img.naturalWidth,height:img.naturalHeight})));
    assert.ok(assets.every(img=>img.width>0&&img.height>0),'combat art must decode: '+JSON.stringify(assets));
    assert.equal(await page.locator('#battleGoal').textContent()!=='',true);
    // Verify that the new visual layer can animate without changing combat state.
    assert.equal(await page.locator('#heroAttackArc').count(),1,'sword arc layer exists');
    const animation=await page.evaluate(()=>{
      const arc=document.getElementById('heroAttackArc');
      const hero=document.querySelector('#combatStage img:first-of-type');
      const before={stage:s.stage,credits:s.credits,kills:s.kills};
      combatImpact(performance.now()+1000);
      const active=arc.classList.contains('active');
      const running=hero.getAnimations().length>0;
      return {active,running,before,after:{stage:s.stage,credits:s.credits,kills:s.kills}};
    });
    assert.ok(animation.active,'attack arc activates on combat feedback');
    assert.ok(animation.running,'hero lunge animation starts');
    assert.deepEqual(animation.after,animation.before,'visual feedback must not change gameplay');
    await page.screenshot({path:'test-results/battle-attack.png',fullPage:true});

    await page.screenshot({path:'test-results/battle-portrait.png',fullPage:true});
    fs.writeFileSync('test-results/browser-diagnostics.json',JSON.stringify({assets,viewport:{width:390,height:844},initialStage:await page.locator('#stage').textContent()},null,2));
    for(const tab of ['growth','reset','stats','battle']){
      await page.locator('[data-view="'+tab+'"]').click();
      assert.equal(await page.locator('[data-screen="'+tab+'"]:not(.view-hidden)').count()>0,true,'tab '+tab);
    }
    const size=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:window.innerWidth}));
    assert.ok(size.width<=size.viewport+1,'horizontal overflow: '+JSON.stringify(size));
    await page.waitForTimeout(1000);
    await page.locator('[data-view="stats"]').click();
    await page.locator('#save').click();
    const saveKey=await page.evaluate(()=>localStorage.getItem('neon_rework_07'));
    assert.ok(saveKey,'save must persist under original key');
    await page.reload({waitUntil:'load'});
    await page.waitForFunction(()=>document.querySelector('#stage')?.textContent?.trim().length>0);
    assert.ok(await page.evaluate(()=>localStorage.getItem('neon_rework_07')),'save must survive reload');
    fs.writeFileSync('test-results/browser-errors.json',JSON.stringify(errors,null,2));
    assert.deepEqual(errors,[],'browser runtime errors');
    console.log('PASS browser startup, auto battle, 4 tabs, sprites, goal, mobile width, no runtime errors');
  } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
