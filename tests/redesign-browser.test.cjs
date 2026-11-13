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
  const browser=await chromium.launch({headless:true,timeout:20000});
  let page;
  try{
    page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
    page.setDefaultTimeout(12000);
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('/favicon.ico'))errors.push('HTTP '+response.status()+' '+response.url())});
    await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'load'});
    await page.waitForFunction(()=>document.querySelector('#stage')?.textContent?.trim().length>0);
    assert.equal(await page.locator('[data-screen="battle"]:not(.view-hidden)').count(),1);
    assert.equal(await page.locator('#combatStage img:not([hidden])').count(),2);
    assert.equal(await page.locator('#heroImage').count(),1,'stable hero art slot');
    assert.equal(await page.locator('#heroArtRoot .hero-part[hidden]').count(),2,'future hair and coat art slots remain hidden until assets exist');
    const composition=await page.evaluate(()=>{
      const arena=document.getElementById('combatStage').getBoundingClientRect();
      const hero=document.getElementById('heroImage').getBoundingClientRect();
      const enemy=document.getElementById('enemyImage').getBoundingClientRect();
      return {arena:{x:arena.x,y:arena.y,width:arena.width,height:arena.height},hero:{x:hero.x,y:hero.y,width:hero.width,height:hero.height},enemy:{x:enemy.x,y:enemy.y,width:enemy.width,height:enemy.height}};
    });
    assert.ok(composition.arena.height>=280,'portrait arena must be tall enough');
    assert.ok(composition.hero.width/composition.arena.width<.65,'hero should leave room for enemies in portrait view');
    assert.ok(composition.enemy.width/composition.arena.width<.45,'enemy should not overwhelm the hero');
    assert.ok(composition.hero.x+composition.hero.width<composition.enemy.x+composition.enemy.width,'silhouettes must retain separate visual centers');

    assert.ok(composition.hero.height>composition.enemy.height,'hero art must dominate composition');
    assert.ok(composition.hero.width/composition.arena.width>.60,'legacy max-width must not shrink hero art');
    assert.ok(composition.hero.x>=composition.arena.x-1&&composition.enemy.x+composition.enemy.width<=composition.arena.x+composition.arena.width+1,'art must fit inside arena');
    const computed=await page.evaluate(()=>{
      const hero=document.getElementById('heroImage');
      const enemy=document.getElementById('enemyImage');
      const stage=document.getElementById('combatStage');
      return {heroPosition:getComputedStyle(hero).position,enemyPosition:getComputedStyle(enemy).position,stageOverflow:getComputedStyle(stage).overflow,heroMaxWidth:getComputedStyle(hero).maxWidth};
    });
    assert.equal(computed.heroPosition,'absolute','hero must use layered portrait positioning');
    assert.equal(computed.enemyPosition,'absolute','enemy must use layered portrait positioning');
    assert.equal(computed.stageOverflow,'hidden','battle composition must clip effect overflow');
    assert.equal(computed.heroMaxWidth,'none','legacy image max-width must not override hero layout');


    await page.waitForFunction(()=>[...document.querySelectorAll('#combatStage img:not([hidden])')].every(img=>img.complete&&img.naturalWidth>0));
    const assets=await page.locator('#combatStage img:not([hidden])').evaluateAll(images=>images.map(img=>({src:img.getAttribute('src'),width:img.naturalWidth,height:img.naturalHeight})));
    assert.ok(assets.every(img=>img.width>0&&img.height>0),'combat art must decode: '+JSON.stringify(assets));
    assert.equal(assets[0].src,'hero_swordswoman_219.webp','uploaded swordswoman must be used instead of legacy art');
    assert.ok(assets[0].width===219&&assets[0].height===220,'hero image is still a low-resolution upload probe: '+JSON.stringify(assets[0]));
    assert.equal(await page.locator('#battleGoal').textContent()!=='',true);
    // Verify that the new visual layer can animate without changing combat state.
    assert.equal(await page.locator('#heroAttackArc').count(),1,'sword arc layer exists');
    assert.equal(await page.locator('#combatStage .hero-ambient').count(),1,'independent ambient layer');
    assert.equal(await page.locator('#combatStage .hero-weapon-glint').count(),1,'independent weapon light layer');
    const visualLayers=await page.evaluate(()=>({
      ambient:getComputedStyle(document.querySelector('.hero-ambient')).animationName,
      glint:getComputedStyle(document.querySelector('.hero-weapon-glint')).animationName
    }));
    assert.notEqual(visualLayers.ambient,'none','ambient layer animates without touching combat');
    assert.notEqual(visualLayers.glint,'none','weapon light animates without touching combat');

    const animation=await page.evaluate(()=>{
      const arc=document.getElementById('heroAttackArc');
      const hero=document.querySelector('#heroImage');
      const before={stage:s.stage,credits:s.credits,kills:s.kills};
      lastImpact=-Infinity;
      combatImpact(performance.now());
      const active=arc.classList.contains('active');
      const running=hero.getAnimations().length>0;
      return {active,running,before,after:{stage:s.stage,credits:s.credits,kills:s.kills}};
    });
    assert.ok(animation.active,'attack arc activates on combat feedback');
    assert.ok(animation.running,'hero lunge animation starts');
    assert.deepEqual(animation.after,animation.before,'visual feedback must not change gameplay');
    // Visual-only throttling: rapid hits must not restart the hero animation every frame.
    const throttle=await page.evaluate(()=>{
      const before={stage:s.stage,credits:s.credits,kills:s.kills};
      visualAttack.lastHero=-Infinity;visualAttack.lastFx=-Infinity;
      const base=performance.now(),initialHero=visualAttack.heroCount,initialFx=visualAttack.fxCount;
      const originalProfile=visualAttackProfile;
      visualAttackProfile=()=>originalProfile(20); // Simulate rapid visual presentation without changing combat constants.
      try{for(let i=0;i<20;i++)combatImpact(base+i*10);}finally{visualAttackProfile=originalProfile;}
      return {hero:visualAttack.heroCount-initialHero,fx:visualAttack.fxCount-initialFx,
        before,after:{stage:s.stage,credits:s.credits,kills:s.kills},
        slow:visualAttackProfile(1),medium:visualAttackProfile(4),fast:visualAttackProfile(20)};
    });
    assert.ok(throttle.hero<=1,'rapid callbacks must not restart protagonist motion');
    assert.ok(throttle.fx<=1,'rapid callbacks must not flood hit effects');
    assert.deepEqual(throttle.after,throttle.before,'visual-only callbacks must not mutate combat state');
    assert.equal(throttle.slow.mode,'individual');
    assert.equal(throttle.medium.mode,'mixed');
    assert.equal(throttle.fast.mode,'rapid');
    assert.ok(throttle.fast.heroGap>throttle.medium.heroGap,'high speed must reduce motion density');
    const overlap=await page.evaluate(()=>{
      lastImpact=-Infinity;combatImpact(performance.now());
      const hero=document.querySelector('#combatStage img:first-of-type');
      return hero.getAnimations().filter(a=>a.id==='hero-attack-lunge').length;
    });
    assert.equal(overlap,1,'repeated hits must not stack sword lunge animations');

    await page.waitForTimeout(120);
    await page.screenshot({path:'test-results/battle-attack.png',fullPage:true});
    await page.emulateMedia({reducedMotion:'reduce'});
    const reduced=await page.evaluate(()=>{lastImpact=-Infinity;combatImpact(performance.now());return {arc:getComputedStyle(document.getElementById('heroAttackArc')).animationName,hero:document.getElementById('heroImage').getAnimations().filter(a=>a.id==='hero-attack-lunge').length};});
    assert.equal(reduced.arc,'none','reduced-motion disables sword arc');
    await page.emulateMedia({reducedMotion:'no-preference'});

    await page.screenshot({path:'test-results/battle-portrait.png',fullPage:true});
    fs.writeFileSync('test-results/browser-diagnostics.json',JSON.stringify({assets,viewport:{width:390,height:844},initialStage:await page.locator('#stage').textContent()},null,2));
    for(const tab of ['growth','reset','stats','battle']){
      await page.locator('[data-view="'+tab+'"]').click();
      assert.equal(await page.locator('[data-screen="'+tab+'"]:not(.view-hidden)').count()>0,true,'tab '+tab);
      assert.equal(await page.locator('#featureDrawer').evaluate(el=>el.hidden),tab==='battle','drawer visibility '+tab);
      assert.equal(await page.locator('[data-screen="battle"]:not(.view-hidden)').count(),1,'battle remains mounted behind menu');
    }
    // Capture the actual mobile drawer state and ensure combat remains visible above it.
    await page.locator('[data-view="growth"]').click();
    await page.screenshot({path:'test-results/growth-drawer-portrait.png',fullPage:false});
    const drawerLayout=await page.evaluate(()=>{
      const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,width:r.width}};
      return {drawer:rect('featureDrawer'),arena:rect('combatStage'),nav:document.querySelector('.nav').getBoundingClientRect().top,viewport:innerHeight};
    });
    assert.ok(drawerLayout.drawer.height<drawerLayout.viewport*.66,'drawer must not occupy the whole screen');
    assert.ok(drawerLayout.drawer.top>0,'drawer must leave some battle visible');
    assert.ok(drawerLayout.drawer.bottom<=drawerLayout.nav+3,'drawer must not cover bottom navigation');
    assert.ok(drawerLayout.arena.top<drawerLayout.drawer.top,'combat stage must remain visible behind drawer');
    await page.locator('[data-view="stats"]').click();
    await page.screenshot({path:'test-results/stats-drawer-portrait.png',fullPage:false});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#featureDrawer').evaluate(el=>el.hidden),true,'Escape closes drawer');
    await page.locator('[data-view="growth"]').click();
    await page.locator('#closeDrawer').click();
    assert.equal(await page.locator('#featureDrawer').evaluate(el=>el.hidden),true,'close button dismisses drawer');
    assert.equal(await page.locator('#battleSecondary').evaluate(el=>el.hidden),true,'secondary battle data hidden by default');
    await page.locator('#battleMetaToggle').click();
    assert.equal(await page.locator('#battleSecondary').evaluate(el=>el.hidden),false,'details expand');
    assert.equal(await page.locator('#battleMetaToggle').getAttribute('aria-expanded'),'true','expanded state announced');
    await page.locator('#battleMetaToggle').click();
    assert.equal(await page.locator('#battleSecondary').evaluate(el=>el.hidden),true,'details collapse');
    await page.screenshot({path:'test-results/battle-compact-portrait.png',fullPage:false});
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
  } catch(error){
    fs.writeFileSync('test-results/browser-failure.txt',String(error?.stack||error));
    if(page){try{await page.screenshot({path:'test-results/browser-failure.png',fullPage:true,timeout:5000})}catch(e){fs.writeFileSync('test-results/screenshot-failure.txt',String(e))}}
    throw error;
  } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.close());
