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

    // Real mobile UI: verify delayed chain feedback and target-to-target transfer.
    {
      const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
      const chainPage=await ctx.newPage();
      await chainPage.addInitScript(()=>{
        localStorage.setItem('neon_rework_07',JSON.stringify({stage:30,best:30,skillsOwned:['chain'],
          skillsEquipped:['chain'],skillLevels:{chain:1},lastSaved:Date.now()}));
      });
      await chainPage.goto(url,{waitUntil:'load'});
      await chainPage.waitForFunction(()=>document.querySelector('#stage')?.textContent?.trim().length>0);
      const chainCheck=await chainPage.evaluate(()=>{
        const starting=enemyHp;
        skillTick(6);render();
        const pending=s.chainPulses;
        const cueStart=document.getElementById('skillCue').textContent;
        enemyHp=power()*.45;
        skillTick(1);render();
        const afterKill={stage:s.stage,pulses:s.chainPulses};
        const hp=enemyHp;
        skillTick(1);render();
        return {starting,pending,cueStart,afterKill,hpAfterSecond:enemyHp,previousHp:hp,thirdCue:document.getElementById('skillCue').textContent};
      });
      assert.equal(chainCheck.pending,3);
      assert.match(chainCheck.cueStart,/연쇄 방전/);
      assert.equal(chainCheck.afterKill.stage,31);
      assert.equal(chainCheck.afterKill.pulses,2);
      assert.ok(chainCheck.hpAfterSecond<chainCheck.previousHp,'second pulse should hit the next stage');
      assert.match(chainCheck.thirdCue,/2\/3 타격/);
      await chainPage.locator('[data-screen="battle"]').screenshot({path:path.join(output,'chain-pulses-390.png')});
      summary.chain=chainCheck;
      console.log('PASS CHAIN_PULSE_UI '+JSON.stringify(chainCheck));
      await ctx.close();
    }

    // Existing-save fixture: let an actual defeated enemy unlock LV10 and auto-equip only the new slot.
    {
      const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
      const slotPage=await ctx.newPage();
      await slotPage.addInitScript(()=>{
        if(localStorage.getItem('neon_rework_07'))return;
        localStorage.setItem('neon_rework_07',JSON.stringify({stage:25,best:25,heroLevel:9,
          heroXp:0,skillsOwned:['chain','overload'],skillsEquipped:['chain'],
          skillLevels:{chain:1,overload:1},lastSaved:Date.now()}));
      });
      await slotPage.goto(url,{waitUntil:'load'});
      await slotPage.waitForFunction(()=>document.querySelector('#stage')?.textContent?.trim().length>0);
      await slotPage.locator('[data-view="growth"]').tap();
      const initial=await slotPage.evaluate(()=>({level:s.heroLevel,slots:skillSlotCount(),equipped:s.skillsEquipped.slice(),
        need:xpToNextSkillSlot(),text:document.getElementById('skillInfo').textContent}));
      assert.equal(initial.level,9);
      assert.equal(initial.slots,1);
      assert.match(initial.text,/남은 경험치/);
      const unlocked=await slotPage.evaluate(()=>{
        s.heroXp=xpNeeded(9)-1;
        enemyHp=0;resolveEnemyDefeat();render();save();
        return {level:s.heroLevel,slots:skillSlotCount(),equipped:s.skillsEquipped.slice(),
          reward:document.getElementById('rewardCue').textContent};
      });
      assert.equal(unlocked.level,10,'defeating an actual enemy must complete hero level 10');
      assert.equal(unlocked.slots,2);
      assert.deepEqual(unlocked.equipped,['chain','overload']);
      assert.match(unlocked.reward,/자동 장착/);
      const layoutChecks=[];
      for(const width of [360,390,412]){
        await slotPage.setViewportSize({width,height:844});
        const layout=await slotPage.evaluate(()=>{
          const cards=[...document.querySelectorAll('#skillList>[data-skill]')];
          const intersects=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>0.5&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>0.5;
          return cards.map((card,i)=>{
            const name=card.querySelector('strong'),buttons=[...card.querySelectorAll('button')];
            const title=name.getBoundingClientRect(),actions=buttons.map(b=>b.getBoundingClientRect());
            return {skill:card.dataset.skill,textOverButtons:actions.some(r=>intersects(title,r)),
              buttonOverlap:intersects(actions[0],actions[1]),
              nextCardOverlap:!!cards[i+1]&&intersects(card.getBoundingClientRect(),cards[i+1].getBoundingClientRect()),
              textClipped:name.scrollWidth>name.clientWidth+1,cardClipped:card.scrollWidth>card.clientWidth+1};
          });
        });
        assert.equal(layout.length,2,'two equipped/owned skill cards should render at width '+width);
        assert.ok(layout.every(card=>!card.textOverButtons&&!card.buttonOverlap&&!card.nextCardOverlap&&!card.textClipped&&!card.cardClipped),
          'skill descriptions/actions must not overlap or clip at width '+width+': '+JSON.stringify(layout));
        layoutChecks.push({width,pass:true,cards:layout.length});
      }
      await slotPage.setViewportSize({width:390,height:844});
      await slotPage.locator('[data-screen="growth"]').first().screenshot({path:path.join(output,'slot-unlock-390.png')});
      await slotPage.reload({waitUntil:'load'});
      const restored=await slotPage.evaluate(()=>({level:s.heroLevel,slots:skillSlotCount(),equipped:s.skillsEquipped.slice()}));
      assert.equal(restored.level,10);
      assert.equal(restored.slots,2);
      assert.deepEqual(restored.equipped,['chain','overload']);
      summary.slotUnlock={initial,unlocked,restored,layoutChecks};
      console.log('PASS HERO_SLOT_UNLOCK '+JSON.stringify(summary.slotUnlock));
      await ctx.close();
    }

    // Existing STAGE 60 fixture: actual touch support choice, non-blocking battle and save/reload.
    {
      const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
      const mid=await ctx.newPage();
      await mid.addInitScript(()=>{
        if(localStorage.getItem('neon_rework_07'))return;
        localStorage.setItem('neon_rework_07',JSON.stringify({stage:60,best:60,heroLevel:8,forge:5,
          atk:35,skillChoiceUsed:true,lastSaved:Date.now()}));
      });
      await mid.goto(url,{waitUntil:'load'});
      await mid.waitForFunction(()=>document.querySelector('#stage')?.textContent?.trim().length>0);
      const pre=await mid.evaluate(()=>({stage:s.stage,choice:s.frontlineSupport,forge:s.forge,goal:frontlineSupportGoal()}));
      assert.equal(pre.stage,60);
      assert.equal(pre.choice,null);
      assert.match(pre.goal,/선택 가능/);
      await mid.locator('[data-view="growth"]').tap();
      await mid.locator('#frontlineSupportChoices [data-frontline-support="industry"]').tap();
      const selected=await mid.evaluate(()=>({choice:s.frontlineSupport,forge:s.forge,goal:frontlineSupportGoal()}));
      assert.equal(selected.choice,'industry');
      assert.equal(selected.forge,7,'touch grants two free existing production upgrades');
      assert.match(selected.goal,/지원 완료/);
      assert.equal(await mid.locator('#frontlineSupportChoices button:enabled').count(),0);
      const chosen=mid.locator('#frontlineSupportChoices [data-frontline-support="industry"]');
      assert.equal(await chosen.evaluate(el=>el.classList.contains('support-selected')),true,'the picked support must be clearly highlighted');
      const layoutChecks=[];
      for(const width of [360,390,412]){
        await mid.setViewportSize({width,height:844});
        const cards=await mid.locator('#frontlineSupportChoices button').evaluateAll(buttons=>buttons.map(button=>{
          const r=button.getBoundingClientRect(),title=button.querySelector('strong')?.getBoundingClientRect(),
            desc=button.querySelector('small')?.getBoundingClientRect();
          const overlap=title&&desc?Math.min(title.right,desc.right)-Math.max(title.left,desc.left)>0.5&&
            Math.min(title.bottom,desc.bottom)-Math.max(title.top,desc.top)>0.5:false;
          return {type:button.dataset.frontlineSupport,clipped:button.scrollWidth>button.clientWidth+1,
            overlap,visible:r.width>=100,selected:button.classList.contains('support-selected')};
        }));
        assert.equal(cards.length,3);
        assert.ok(cards.every(x=>!x.clipped&&!x.overlap&&x.visible),'stage60 choices cannot clip/overlap: '+JSON.stringify({width,cards}));
        assert.equal(cards.filter(x=>x.selected).length,1);
        layoutChecks.push({width,cards:cards.length,pass:true});
      }
      await mid.setViewportSize({width:390,height:844});
      await mid.locator('#allocationPanel').screenshot({path:path.join(output,'stage60-support-390.png')});
      await mid.reload({waitUntil:'load'});
      const restored=await mid.evaluate(()=>({stage:s.stage,choice:s.frontlineSupport,forge:s.forge}));
      assert.equal(restored.choice,'industry');
      assert.equal(restored.forge,7);
      const preKill=await mid.evaluate(()=>s.kills);
      await mid.evaluate(()=>{enemyHp=0;resolveEnemyDefeat();render();save()});
      assert.equal(await mid.evaluate(()=>s.kills),preKill+1,'combat continues after optional support selection');
      summary.midgame={pre,selected,restored,layoutChecks};
      console.log('PASS STAGE60_SUPPORT_UI '+JSON.stringify(summary.midgame));
      await ctx.close();
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
    summary.captureCount=summary.viewportResults.length*2+4; // six viewport shots plus chain, slot, stage60 support and rebirth
    fs.writeFileSync(path.join(output,'playthrough-report.json'),JSON.stringify(summary,null,2));
    console.log('PASS MOBILE_TOUCH_PLAYTHROUGH '+JSON.stringify({
      widths:summary.viewportResults.map(x=>x.width),skillsChosen:true,questsClaimed:true,
      saveReload:true,rebirth:true,screenshots:summary.captureCount
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
