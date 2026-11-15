'use strict';
// Real Chromium mobile-touch playthrough of the production site; not a simulated DOM.
// Exercises user-facing navigation, purchase, stage-20 skill selection, quest claim,
// skill inheritance, save/reload, rebirth and responsive touch targets.
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {once}=require('node:events');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const root=path.resolve('site');
const output=path.resolve('artifacts/playthrough');
fs.mkdirSync(output,{recursive:true});
const server=createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return}
  fs.readFile(target,(err,data)=>{
    if(err){res.writeHead(404).end();return}
    const type={'.html':'text/html','.js':'text/javascript','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(target)]||'application/octet-stream';
    res.writeHead(200,{'content-type':type}).end(data);
  });
});
(async()=>{
  let browser;
  const summary={environment:'Chromium mobile emulation (NOT physical Android)',checkpoints:[],issues:[],viewportResults:[]};
  try{
    server.listen(0,'127.0.0.1');
    await once(server,'listening');
    browser=await chromium.launch({headless:true});
    const url='http://127.0.0.1:'+server.address().port+'/';
    for(const width of [360,390,412]){
      const context=await browser.newContext({
        viewport:{width,height:844},screen:{width,height:844},
        deviceScaleFactor:2,isMobile:true,hasTouch:true,
      });
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('response',resp=>{if(resp.status()>=400&&!resp.url().endsWith('/favicon.ico'))errors.push('HTTP '+resp.status()+' '+resp.url())});
      await page.goto(url,{waitUntil:'load'});
      await page.waitForFunction(()=>document.querySelector('#stage')?.textContent?.trim().length>0);
      assert.equal(await page.locator('[data-screen="battle"]:not(.view-hidden)').count(),1);
      const before=await page.evaluate(()=>({stage:s.stage,best:s.best,atk:s.atk,hero:s.heroLevel,credits:s.credits}));
      assert.equal(before.stage,1,'playthrough must start with a clean save');
      await page.locator('[data-view="growth"]').tap();
      const atkButton=page.locator('[data-buy="atk"]');
      assert.equal(await atkButton.count(),1,'real upgrade control must exist');
      await atkButton.tap();
      assert.equal(await page.evaluate(()=>s.atk),before.atk+1,'touch purchase must apply a real upgrade');

      const reached=await page.evaluate(()=>{
        let ticks=0,purchases=0,claimRuns=0;
        for(;ticks<2400;ticks++){
          step(.25,false);
          if(ticks%40===39){
            transferCacheCredits();claimRuns++;
            for(let i=0;i<30;i++){
              const affordable=Object.keys(costs).filter(id=>s.best>=unlockStage[id]&&(id!=='spd'||s.spd<50)&&s.credits>=cost(id))
                 .sort((a,b)=>(a==='atk'?-1:b==='atk'?1:cost(a)-cost(b)));
              if(!affordable.length)break;
              if(purchase(affordable[0]))purchases++;
            }
          }
          if(s.stage>=20)break;
        }
        render();save();
        return {stage:s.stage,best:s.best,ticks,simulatedSeconds:(ticks+1)*.25,purchases,claimRuns,
          choices:s.skillsOwned.slice(),hero:s.heroLevel};
      });
      assert.ok(reached.stage>=20,'actual game logic must reach skill unlock within 10 simulated minutes: '+JSON.stringify(reached));
      const option=page.locator('#skillChoice [data-skill-choice="trainingSkill"]');
      assert.equal(await option.count(),1,'STAGE 20 must expose optional XP skill in actual browser');
      const choicePanel=page.locator('#skillChoice');
      await choicePanel.screenshot({path:path.join(output,'stage20-choices-'+width+'.png')});
      await option.tap();
      const selected=await page.evaluate(()=>({used:s.skillChoiceUsed,owned:s.skillsOwned.includes('trainingSkill'),
        equipped:s.skillsEquipped.includes('trainingSkill'),slots:skillSlotCount()}));
      assert.equal(selected.used,true,'touch skill choice must persist the once-per-run flag');
      assert.equal(selected.owned,true,'chosen skill should be owned');
      assert.equal(await page.locator('#skillChoice button').count(),0,'choices must disappear after one selection');
      assert.match(await page.locator('#skillChoiceInfo').innerText(),/선택 완료/);
      if(selected.slots>0)assert.equal(selected.equipped,true,'first skill should auto-equip in open slot');
      const inherit=page.locator('[data-inherit="trainingSkill"]');
      assert.equal(await inherit.count(),1,'in-game inheritance button must exist');
      await inherit.tap();
      assert.equal(await page.evaluate(()=>s.skillsInherited.includes('trainingSkill')),true,'inheritance selection must work by touch');
      await page.evaluate(()=>{step(14,false);render()});
      const buff=await page.evaluate(()=>({duration:s.skillBuffTraining,owned:s.skillsOwned.includes('trainingSkill')}));
      assert.ok(buff.duration>0,'equipped training skill must activate during actual browser play');

      await page.evaluate(()=>{step(12,false);render()});
      const pending=await page.evaluate(()=>s.questCredits.reduce((a,b)=>a+b,0));
      assert.ok(pending>0,'time quest must have pending rewards');
      const beforeClaim=await page.evaluate(()=>s.credits);
      await page.locator('#claimCache').tap();
      const claim=await page.evaluate(()=>({credits:s.credits,reserve:s.questCredits.reduce((a,b)=>a+b,0)}));
      assert.equal(claim.reserve,0,'touch claim should empty quest reserve');
      assert.ok(claim.credits>=beforeClaim,'touch claim should not lose currency');

      await page.locator('[data-view="battle"]').tap();
      assert.equal(await page.locator('[data-screen="battle"]:not(.view-hidden)').count(),1);
      const battle=await page.evaluate(()=>({
        horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
        arenaHeight:document.querySelector('[data-screen="battle"] .fight').getBoundingClientRect().height,
        images:[...document.querySelectorAll('[data-screen="battle"] .fight img')].map(img=>img.complete&&img.naturalWidth>0)
      }));
      assert.equal(battle.horizontalOverflow,false,'actual mobile viewport must not overflow');
      assert.ok(battle.arenaHeight>=205,'battle area should stay visible');
      assert.ok(battle.images.every(Boolean),'the actual combat portraits must load');
      await page.locator('[data-screen="battle"]').screenshot({path:path.join(output,'battle-'+width+'.png')});
      await page.locator('[data-view="stats"]').tap();
      await page.locator('#save').tap();
      await page.reload({waitUntil:'load'});
      const restored=await page.evaluate(()=>({chosen:s.skillChoiceUsed,owned:s.skillsOwned.includes('trainingSkill'),
        inherited:s.skillsInherited.includes('trainingSkill'),stage:s.stage,atk:s.atk}));
      assert.equal(restored.chosen,true,'skill choice persists through real reload');
      assert.equal(restored.owned,true,'skill ownership persists through real reload');
      assert.equal(restored.inherited,true,'inheritance choice persists through real reload');
      assert.ok(restored.atk>=1,'upgrade purchase persists through real reload');
      assert.ok(restored.stage>=20,'stage progress persists through real reload');
      assert.deepEqual(errors,[],'Chromium script/http errors at '+width);
      const result={width,initial:before,reached,selected,claim,pending,battle,restored,
        pointer:'Playwright tap() with isMobile+hasTouch',errorCount:errors.length};
      summary.viewportResults.push(result);
      console.log('PASS TOUCH_PLAYTHROUGH '+JSON.stringify(result));
      await context.close();
    }

    // Separate save-state fixture: exercise actual reset UI and confirm persistence.
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    const page=await context.newPage();
    page.on('dialog',dialog=>dialog.accept());
    await page.addInitScript(()=>{
      if(localStorage.getItem('neon_rework_07'))return;
      localStorage.setItem('neon_rework_07',JSON.stringify({
        stage:100,best:100,heroLevel:11,traitPointsEarned:10,
        skillsOwned:['trainingSkill'],skillsEquipped:['trainingSkill'],skillsInherited:['trainingSkill'],
        skillLevels:{trainingSkill:7},skillXp:{trainingSkill:10},skillChoiceUsed:true,lastSaved:Date.now()
      }));
    });
    await page.goto(url,{waitUntil:'load'});
    await page.waitForFunction(()=>document.querySelector('#stage')?.textContent?.trim().length>0);
    await page.locator('[data-view="reset"]').tap();
    assert.equal(await page.locator('#rebirth').isDisabled(),false,'stage100 should permit a real rebirth');
    await page.locator('#rebirth').tap();
    const reborn=await page.evaluate(()=>({stage:s.stage,hero:s.heroLevel,owned:s.skillsOwned.slice(),
      inherited:s.skillsInherited.slice(),level:s.skillLevels.trainingSkill,chosen:s.skillChoiceUsed}));
    assert.equal(reborn.stage,1);
    assert.equal(reborn.hero,11,'permanent hero level survives');
    assert.equal(reborn.level,1,'inherited skill resets to level1');
    assert.equal(reborn.chosen,false,'first-skill choice refreshes after rebirth');
    assert.ok(reborn.owned.includes('trainingSkill'),'inherited skill ownership survives');
    await page.reload({waitUntil:'load'});
    const rebornSaved=await page.evaluate(()=>({stage:s.stage,hero:s.heroLevel,chosen:s.skillChoiceUsed}));
    assert.equal(rebornSaved.hero,11);
    assert.equal(rebornSaved.chosen,false);
    await page.locator('[data-view="reset"]').tap();
    await page.locator('[data-screen="reset"]').first().screenshot({path:path.join(output,'rebirth-controls-390.png')});
    summary.rebirth={reborn,rebornSaved};
    console.log('PASS TOUCH_REBIRTH '+JSON.stringify(summary.rebirth));
    await context.close();
    fs.writeFileSync(path.join(output,'playthrough-report.json'),JSON.stringify(summary,null,2));
    console.log('PASS MOBILE_TOUCH_PLAYTHROUGH '+JSON.stringify({
      widths:summary.viewportResults.map(x=>x.width),skillsChosen:true,questsClaimed:true,
      saveReload:true,rebirth:true,screenshots:summary.viewportResults.length*2+1
    }));
  }catch(e){
    summary.issues.push(String(e.stack||e));
    fs.writeFileSync(path.join(output,'playthrough-report.json'),JSON.stringify(summary,null,2));
    console.error(e);
    process.exitCode=1;
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})();
