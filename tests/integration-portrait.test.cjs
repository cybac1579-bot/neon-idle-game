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
   // Exercise real portrait DOM clicks, not just purchaseBatch() in a VM fixture.
   const batchSeed=await page.evaluate(()=>{
    const previous={credits:s.credits,atk:s.atk};
    s.credits=1000000;
    render();
    return previous;
   });
   const batchButton=page.locator('#batchPurchase');
   assert.equal(await batchButton.getAttribute('aria-pressed'),'false','single-buy must be default at '+width);
   await batchButton.click();
   assert.equal(await batchButton.getAttribute('aria-pressed'),'true','three-buy mode must announce selection at '+width);
   assert.match(await batchButton.textContent(),/최대 3회/,'batch label must say maximum at '+width);
    assert.match(await batchButton.evaluate(el=>el.nextElementSibling.textContent),/선택한 강화 1종만 최대 3단계/,'copy must explain one upgrade type per click at '+width);
   // Freeze foreground simulation while measuring purchase cost; otherwise passive credits
   // accrue between the browser click and read-back, making the accounting assertion flaky.
   await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:true}));
   const beforeBatch=await page.evaluate(()=>({atk:s.atk,credits:s.credits,
     expected:(()=>{let total=0;const oldAtk=s.atk;for(let i=0;i<3;i++){total+=cost('atk');s.atk++}s.atk=oldAtk;return total})()}));
   await page.locator('#upgrades [data-buy="atk"]').click();
   const afterBatch=await page.evaluate(()=>({atk:s.atk,credits:s.credits}));
   assert.equal(afterBatch.atk,beforeBatch.atk+3,'one actual button click must buy three levels at '+width);
   assert.equal(afterBatch.credits,beforeBatch.credits-beforeBatch.expected,'each rising price must be paid at '+width);
   await page.evaluate(()=>{delete document.hidden});
   await batchButton.click();
   assert.equal(await batchButton.getAttribute('aria-pressed'),'false','single-buy mode must be restorable at '+width);
   await page.evaluate(previous=>{s.credits=previous.credits;s.atk=previous.atk;render();save()},batchSeed);
   assert.equal(await page.evaluate(()=>s.atk),batchSeed.atk,'batch smoke must not contaminate later checks at '+width);
   const questClaim=await page.evaluate(()=>{
    s.best=Math.max(s.best,3);
    s.questClocks=[0,0,0];
    s.questCredits=[0,0,0];
    questTick(120);
    render();
    const before=s.credits;
    const pending=s.questCredits.reduce((a,b)=>a+b,0);
    const rows=[...document.querySelectorAll('#cacheTimer .quest-row')].map(x=>x.textContent);
    const claimEnabled=!document.getElementById('claimCache').disabled;
    const first=transferCacheCredits();
    const second=transferCacheCredits();
    render();
    return {before,pending,first,second,after:s.credits,claimEnabled,rows,
      disabledAfter:document.getElementById('claimCache').disabled};
   });
   assert.ok(questClaim.pending>0&&questClaim.claimEnabled,'quest claim must be available at '+width);
   assert.equal(questClaim.first,questClaim.pending,'quest claim must transfer all pending rewards at '+width);
   assert.equal(questClaim.second,0,'quest claim must not duplicate rewards at '+width);
   assert.equal(questClaim.after,questClaim.before+questClaim.pending,'quest credits must reach wallet at '+width);
   assert.equal(questClaim.disabledAfter,true,'claim button must disable after collection at '+width);
   assert.equal(questClaim.rows.length,3,'quest statuses must survive reward collection at '+width);
   // Real stage55 strategic choices via actual portrait button taps; existing growth tab only.
   const allocSeed=await page.evaluate(()=>{
    const previous={state:JSON.parse(JSON.stringify(s)),enemyHp,attackClock};
    s.stage=55;s.best=Math.max(s.best,55);s.allocation='balanced';s.atk=16;s.forge=5;s.energy=1000;
    spawn();render();return previous;
   });
   assert.equal(await page.locator('#allocationPanel').isVisible(),true,'STAGE55 panel not visible at '+width);
   const allocSamples=[];
   for(const [mode,index] of [['assault',1],['supply',2],['balanced',0]]){
    await page.locator('#allocationPanel [data-allocation="'+mode+'"]').click();
    const actual=await page.evaluate(()=>({
     mode:s.allocation,power:power(),income:creditRate(),preview:allocationComparison(),
     status:document.getElementById('allocationStatus').textContent,
     overflow:document.documentElement.scrollWidth>innerWidth+1
    }));
    assert.equal(actual.mode,mode,'allocation tap failed '+mode+' at '+width);
    assert.equal(actual.overflow,false,'allocation horizontal overflow at '+width);
    assert.ok(Math.abs(actual.power/actual.preview[index][1]-1)<1e-9,'combat preview mismatch '+mode+' at '+width);
    assert.ok(Math.abs(actual.income/actual.preview[index][2]-1)<1e-9,'production preview mismatch '+mode+' at '+width);
    allocSamples.push(actual);
   }
   assert.match(allocSamples[0].status,/×2\.2.*×0\.75/,'assault loss must be disclosed at '+width);
   assert.match(allocSamples[1].status,/×0\.8.*×2\.5/,'supply loss must be disclosed at '+width);
   assert.ok(allocSamples[0].power>allocSamples[2].power &&
      allocSamples[0].income<allocSamples[2].income,'assault must trade credits for power at '+width);
   assert.ok(allocSamples[1].power<allocSamples[2].power &&
      allocSamples[1].income>allocSamples[2].income,'supply must trade power for credits at '+width);
   await page.evaluate(prev=>{s=prev.state;spawn();enemyHp=prev.enemyHp;attackClock=prev.attackClock;render();save()},allocSeed);
   assert.equal(await page.locator('#allocationPanel').isVisible(),false,'stage55 fixture not cleaned at '+width);
   // Real STAGE65 fifth-skill reward and full five-card layout on portrait.
   const stage65Seed=await page.evaluate(()=>{
    const previous={state:JSON.parse(JSON.stringify(s)),enemyHp,attackClock};
    s.stage=64;s.best=64;s.heroLevel=60;s.traitPointsEarned=Math.max(s.traitPointsEarned,59);
    s.skillsOwned=['overload','chain','bountySkill','trainingSkill'];
    s.skillsEquipped=s.skillsOwned.slice();s.skillsInherited=[];
    s.skillLevels={overload:1,chain:1,bountySkill:1,trainingSkill:1};
    s.skillXp={overload:0,chain:0,bountySkill:0,trainingSkill:0};
    s.skillBuffCapacitor=0;spawn();enemyHp=0;resolveEnemyDefeat();render();return previous;
   });
   const gained=await page.evaluate(()=>({
    stage:s.stage,owned:s.skillsOwned.slice(),equipped:s.skillsEquipped.slice(),
    overflow:document.documentElement.scrollWidth>innerWidth+1,
    cardCount:document.querySelectorAll('#skillList [data-skill]').length
   }));
   assert.equal(gained.stage,65,'milestone should unlock at stage65 '+width);
   assert.equal(gained.owned.length,5,'STAGE65 must award the fifth skill at '+width);
   assert.equal(gained.equipped.length,5,'new skill should use fifth unlocked slot at '+width);
   assert.equal(gained.cardCount,5,'all five skill cards visible on mobile at '+width);
   assert.equal(gained.overflow,false,'five skill cards must not overflow at '+width);
   const capacitorButton=page.locator('#skillList [data-equip="capacitor"]');
   await capacitorButton.click();
   assert.equal(await page.evaluate(()=>s.skillsEquipped.includes('capacitor')),false,'unequip tap should work at '+width);
   await capacitorButton.click();
   assert.equal(await page.evaluate(()=>s.skillsEquipped.includes('capacitor')),true,'re-equip tap should work at '+width);
   const capacitorActivation=await page.evaluate(()=>{
    s.skillsEquipped=['capacitor'];s['cd_capacitor']=0;s.skillBuffCapacitor=0;
    const initial=energyRate();skillTick(18);render();
    return {active:s.skillBuffCapacitor,rateFactor:energyRate()/initial,
      label:document.querySelector('#skillList [data-skill="capacitor"] strong').textContent};
   });
   assert.equal(capacitorActivation.active,10,'energy skill timer should start at '+width);
   assert.equal(capacitorActivation.rateFactor,2,'new skill should double energy production at '+width);
   assert.match(capacitorActivation.label,/전력 순환/);
   // Both skills coexist: charged Chain pulses show a visible combat combo cue.
   const chargedDuo=await page.evaluate(()=>{
    s.skillsEquipped=['capacitor','chain'];s.skillBuffCapacitor=8;s.chainPulses=1;s.chainPulseClock=0;
    enemyHp=1e7;const expected=power()*.6*skillScale('chain')*(1+resonanceBonus('chain'))*2;
    skillTick(1);render();
    return {damage:1e7-enemyHp,expected,cue:document.getElementById('skillCue').textContent,
     multiplier:chargedChainMultiplier(),overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   assert.equal(chargedDuo.multiplier,2,'both equipped skills must charge chain at '+width);
   assert.ok(Math.abs(chargedDuo.damage-chargedDuo.expected)<Math.max(1e-4,chargedDuo.expected*1e-6),'charged pulse mismatch at '+width);
   assert.match(chargedDuo.cue,/충전 연쇄/,'combo must show in combat cue at '+width);
   assert.equal(chargedDuo.overflow,false,'combo cue must not cause overflow at '+width);
   await page.evaluate(previous=>{
    s=previous.state;spawn();enemyHp=previous.enemyHp;attackClock=previous.attackClock;render();save();
   },stage65Seed);
   assert.equal(await page.evaluate(()=>s.skillsOwned.includes('capacitor')),false,'STAGE65 test fixture must be restored at '+width);
   // Real portrait touch check of optional stage-75 reward; restore current-run state afterwards.
   const stage75Seed=await page.evaluate(()=>{
    const prev={state:JSON.parse(JSON.stringify(s)),enemyHp,attackClock};
    s.stage=75;s.best=Math.max(s.best,75);s.breakthroughReward=null;s.weapon={tier:1,stage:70};
    spawn();render();return prev;
   });
   const stage75Button=page.locator('#breakthroughChoices [data-breakthrough="weapon"]');
   assert.equal(await page.locator('#breakthroughPanel').isVisible(),true,'STAGE75 choice hidden at '+width);
   const beforeStage75=await page.evaluate(()=>power());
   await stage75Button.click();
   const afterStage75=await page.evaluate(()=>({
    chosen:s.breakthroughReward,power:power(),status:document.getElementById('breakthroughInfo').textContent,
    buttons:[...document.querySelectorAll('#breakthroughChoices button')].map(b=>({
     disabled:b.disabled,scrollWidth:b.scrollWidth,clientWidth:b.clientWidth,
     selected:b.classList.contains('support-selected')})),
    overflow:document.documentElement.scrollWidth>innerWidth+1
   }));
   assert.equal(afterStage75.chosen,'weapon','real touch did not select reward at '+width);
   assert.ok(afterStage75.power>beforeStage75*1.19,'STAGE75 weapon bonus missing at '+width);
   assert.match(afterStage75.status,/보급 완료/);
   assert.ok(afterStage75.buttons.every(b=>b.disabled&&b.scrollWidth<=b.clientWidth+1),'STAGE75 options overflow at '+width);
   assert.equal(afterStage75.buttons[0].selected,true,'choice not highlighted at '+width);
   assert.equal(afterStage75.overflow,false,'STAGE75 growth overflow at '+width);
   await page.evaluate(prev=>{s=prev.state;spawn();enemyHp=prev.enemyHp;attackClock=prev.attackClock;render();save()},stage75Seed);
   assert.equal(await page.locator('#breakthroughPanel').isVisible(),false,'STAGE75 fixture contamination at '+width);
   // Real growth-tab interaction: the STAGE85 passive resonance reacts to loadout changes.
   // Restore the entire scenario so previous-stage and persistence tests are isolated.
   const resonanceSeed=await page.evaluate(()=>{
    const previous={state:JSON.parse(JSON.stringify(s)),enemyHp,attackClock};
    s.stage=85;s.best=Math.max(s.best,85);s.weapon={tier:1,stage:82};
    s.heroLevel=10;s.traitPointsEarned=Math.max(s.traitPointsEarned,9);
    s.skillsOwned=['overload','chain'];s.skillsEquipped=['overload'];s.skillsInherited=[];
    s.skillLevels={overload:1,chain:1};s.skillXp={overload:0,chain:0};
    spawn();render();return previous;
   });
   const resonancePanel=page.locator('#resonanceInfo');
   assert.match(await resonancePanel.textContent(),/과부하 사격 피해 \+15%/,'uncommon weapon should boost equipped skill at '+width);
   assert.equal(await page.evaluate(()=>resonanceBonus('chain')),0,'un-equipped chain must not receive resonance at '+width);
   await page.locator('#skillList [data-equip="overload"]').click();
   assert.match(await resonancePanel.textContent(),/스킬을 장착해/,'unequip should disable resonance at '+width);
   await page.locator('#skillList [data-equip="chain"]').click();
   assert.match(await resonancePanel.textContent(),/연쇄 방전 피해 \+15%/,'switching skill should change resonance at '+width);
   const resonanceLayout=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth>innerWidth+1,
    status:document.getElementById('resonanceInfo').textContent,
    weapon:document.getElementById('weaponInfo').textContent
   }));
   assert.equal(resonanceLayout.overflow,false,'resonance growth overflow at '+width);
   assert.match(resonanceLayout.weapon,/희귀/);
   await page.evaluate(previous=>{
    s=previous.state;spawn();enemyHp=previous.enemyHp;attackClock=previous.attackClock;
    render();save();
   },resonanceSeed);
   assert.match(await resonancePanel.textContent(),/STAGE 85/,'STAGE85 smoke must restore earlier player state at '+width);
   // Real touch opt-in: research Lv2 allows quest claiming without enabling auto-buy.
   const claimModeSeed=await page.evaluate(()=>{
    const prior=JSON.parse(JSON.stringify(s));
    s.autoLevel=2;s.autoBuy=false;s.autoClaimQuests=false;s.autoClaimClock=0;
    render();return prior;
   });
   await page.locator('[data-view="reset"]').first().click();
   const claimToggle=page.locator('#autoClaimQuests');
   assert.equal(await claimToggle.isDisabled(),false,'Lv2 quest claim must be unlocked at '+width);
   assert.equal(await claimToggle.isChecked(),false,'old saves must default to opt-out at '+width);
   await claimToggle.check();
   assert.equal(await claimToggle.isChecked(),true,'touch should enable quest claim at '+width);
   const claimResult=await page.evaluate(()=>{
    s.autoClaimClock=29.75;s.questClocks=[0,0,0];s.questCredits=[3,7,11];
    const previous=s.credits;step(.25,false);
    return {earned:s.credits-previous,remaining:s.questCredits.reduce((a,b)=>a+b,0),
      selected:s.autoClaimQuests,autoBuy:s.autoBuy,clock:s.autoClaimClock};
   });
   assert.equal(claimResult.selected,true);
   assert.equal(claimResult.autoBuy,false,'claim preference must not activate buying at '+width);
   assert.equal(claimResult.remaining,0,'auto claim must consume reserves at '+width);
   assert.ok(claimResult.earned>=21,'timed quest transfer was not paid at '+width);
   await page.evaluate(prior=>{s=prior;spawn();render();save()},claimModeSeed);
   await page.locator('[data-view="growth"]').first().click();
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
     // Fixed PRNG keeps economic tuning comparisons reproducible across CI runs.
     let rng=20261114;
     Math.random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296};
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
    // Compare several purchase policies under the same deterministic RNG.
    // This is a bounded strategy sweep, not a claim of mathematically optimal play.
    const strategies=await balancePage.evaluate(()=>{
     const policies={
      highestTier:(a,b)=>unlockStage[b]-unlockStage[a],
      cheapest:(a,b)=>cost(a)-cost(b),
      attackFirst:(a,b)=>(a==='atk'?-1:b==='atk'?1:cost(a)-cost(b)),
      economyFirst:(a,b)=>(a==='gen'?-1:b==='gen'?1:cost(a)-cost(b)),
      attackWithTraits:(a,b)=>(a==='atk'?-1:b==='atk'?1:cost(a)-cost(b)),
      economyWithTraits:(a,b)=>(a==='gen'?-1:b==='gen'?1:cost(a)-cost(b)),
      attackWithSkillChoice:(a,b)=>(a==='atk'?-1:b==='atk'?1:cost(a)-cost(b))
     };
     const output={};
     for(const [name,compare] of Object.entries(policies)){
      let rng=20261114;
      Math.random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296};
      s=initial();pendingOffline=0;enemyHp=enemyMax=0;attackClock=enemyClock=0;spawn();
      let first=null;
      const milestones={};
      const unlocks={weaponAt:null,skillAt:null,skillEquippedAt:null,hero10At:null,traitAt:null};
      for(let t=1;t<=3600;t++){
       step(1,false);
       if(t%10===0){
        if(name.endsWith('WithTraits')||name==='attackWithSkillChoice'){
         const priority=name!=='economyWithTraits'?['precision','double','boss','haste','bounty','training','energy','loot']:['bounty','energy','training','precision','double','boss','haste','loot'];
         for(const id of priority){const cap=TRAITS.find(t=>t[0]===id)[2];while(availablePoints()>0&&traitLevel(id)<cap){s.traits[id]=traitLevel(id)+1;s.traitPointsSpent++;}}
        }
        if(name==='attackWithSkillChoice'){
         const priority=['overload','chain','bountySkill'];
         s.skillsEquipped=priority.filter(id=>s.skillsOwned.includes(id)).slice(0,skillSlotCount());
        }
        transferCacheCredits();
        for(let n=0;n<30;n++){
         const available=Object.keys(costs).filter(k=>s.best>=unlockStage[k]&&(k!=='spd'||s.spd<50)&&s.credits>=cost(k)).sort(compare);
         if(!available.length)break;
         purchase(available[0]);
        }
       }
       if(unlocks.weaponAt===null&&s.weapon)unlocks.weaponAt=t;
       if(unlocks.skillAt===null&&s.skillsOwned.length)unlocks.skillAt=t;
       if(unlocks.skillEquippedAt===null&&s.skillsEquipped.length)unlocks.skillEquippedAt=t;
       if(unlocks.hero10At===null&&s.heroLevel>=10)unlocks.hero10At=t;
       if(unlocks.traitAt===null&&s.traitPointsSpent>0)unlocks.traitAt=t;
       for(const stage of [40,55,65,70,80,90,100])if(milestones[stage]===undefined&&s.stage>=stage)milestones[stage]=t;
       if(first===null&&gainCore()>0)first=t;
      }
      output[name]={firstReconstructionAt:first,milestones,unlocks,finalStage:s.stage,upgrades:{atk:s.atk,spd:s.spd,gen:s.gen,amp:s.amp,relay:s.relay,forge:s.forge,reactor:s.reactor},heroLevel:s.heroLevel,weapon:!!s.weapon,skills:s.skillsOwned.length,equipped:[...s.skillsEquipped],skillLevels:{...s.skillLevels},traits:{...s.traits},traitPointsSpent:s.traitPointsSpent};
     }
     return output;
    });
    // Counterfactual: quantify the contribution of gear, skills and traits
    // under the same seeded strategy, without changing production balance.
    const contributions=await balancePage.evaluate(()=>{
     const modes=['full','noGear','noSkills','noTraits','noGearOrSkills'];
     const seeds=[20261114,20261115,20261116];
     const results={};
     for(const mode of modes){
      const samples=[];
      for(const seed of seeds){
      let rng=seed;
      Math.random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296};
      s=initial();pendingOffline=0;enemyHp=enemyMax=0;attackClock=enemyClock=0;spawn();
      let first=null;
      // Global const bindings cannot be reassigned; use state-level interventions.
      for(let t=1;t<=3600;t++){
       if(mode==='noGear'||mode==='noGearOrSkills')s.weapon=null;
       if(mode==='noSkills'||mode==='noGearOrSkills')s.skillsEquipped=[];
       if(mode==='noTraits'){s.traits={};s.traitPointsSpent=0;}
       step(1,false);
       if(t%10===0){
        if(mode!=='noTraits'){
         const priority=['precision','double','boss','haste','bounty','training','energy','loot'];
         for(const id of priority){const cap=TRAITS.find(x=>x[0]===id)[2];while(availablePoints()>0&&traitLevel(id)<cap){s.traits[id]=traitLevel(id)+1;s.traitPointsSpent++;}}
        }
        if(mode!=='noSkills'&&mode!=='noGearOrSkills')s.skillsEquipped=['overload','chain','bountySkill'].filter(id=>s.skillsOwned.includes(id)).slice(0,skillSlotCount());
        transferCacheCredits();
        for(let n=0;n<30;n++){
         const affordable=Object.keys(costs).filter(k=>s.best>=unlockStage[k]&&(k!=='spd'||s.spd<50)&&s.credits>=cost(k)).sort((a,b)=>(a==='atk'?-1:b==='atk'?1:cost(a)-cost(b)));
         if(!affordable.length)break;
         purchase(affordable[0]);
        }
       }
       if(first===null&&gainCore()>0)first=t;
      }
      samples.push({seed,firstReconstructionAt:first,finalStage:s.stage,weapon:!!s.weapon,skillsEquipped:s.skillsEquipped.length,traitsSpent:s.traitPointsSpent});
      }
      const times=samples.map(x=>x.firstReconstructionAt).filter(Number.isFinite);
      results[mode]={samples,meanFirstRebirthSeconds:times.length===seeds.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):null};
     }
     return results;
    });
    assert.equal(Object.keys(contributions).length,5,'system contribution comparison incomplete');
    assert.ok(Object.values(contributions).every(x=>x.samples.length===3),'multi-seed system contribution comparison incomplete');
    console.log('BALANCE_SYSTEM_CONTRIBUTIONS '+JSON.stringify(contributions));
    // Diagnostic: the first-rebirth target is about 3600s for an efficient
    // full-system policy. This is telemetry, not a pass/fail hard time gate.
    const fullSamples=contributions.full.samples;
    const fullTimes=fullSamples.map(x=>x.firstReconstructionAt);
    console.log('BALANCE_FIRST_REBIRTH_TARGET '+JSON.stringify({
     targetSeconds:3600,
     observedSeconds:fullTimes,
     meanSeconds:contributions.full.meanFirstRebirthSeconds,
     gapToTargetSeconds:contributions.full.meanFirstRebirthSeconds===null?null:3600-contributions.full.meanFirstRebirthSeconds,
     coverage:{gear:true,skills:true,traits:true,questClaim:true,heroLevels:true},
     note:'Scripted attack-first policy, not proven global optimum'
    }));
    // Multi-rebirth economy: spend only earned cores; no automatic per-rebirth bonus.
    const repeatedRebirths=await balancePage.evaluate(()=>{
     const policies={
      combat:['corePower','coreEconomy','autoLevel'],
      economy:['coreEconomy','corePower','autoLevel'],
      automation:['autoLevel','corePower','coreEconomy']
     };
     const output={};
     for(const [policy,priority] of Object.entries(policies)){
      let rng=20261114;
      Math.random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296};
      s=initial();pendingOffline=0;enemyHp=enemyMax=0;attackClock=enemyClock=0;spawn();
      const times=[],spending=[];
      let previous=0;
      for(let t=1;t<=18000&&times.length<5;t++){
       step(1,false);
       if(t%10===0){
        transferCacheCredits();
        for(let n=0;n<30;n++){
         const affordable=Object.keys(costs).filter(k=>s.best>=unlockStage[k]&&(k!=='spd'||s.spd<50)&&s.credits>=cost(k)).sort((a,b)=>(a==='atk'?-1:b==='atk'?1:cost(a)-cost(b)));
         if(!affordable.length)break;
         purchase(affordable[0]);
        }
        const traits=['precision','double','boss','haste','bounty','training','energy','loot'];
        for(const id of traits){const cap=TRAITS.find(x=>x[0]===id)[2];while(availablePoints()>0&&traitLevel(id)<cap){s.traits[id]=traitLevel(id)+1;s.traitPointsSpent++;}}
        s.skillsEquipped=['overload','chain','bountySkill'].filter(id=>s.skillsOwned.includes(id)).slice(0,skillSlotCount());
       }
       if(gainCore()>0){
        const earned=gainCore();
        rebirth(false);
        for(let n=0;n<30;n++){
         const chosen=priority.find(id=>s.cores>=coreCost(id));
         if(!chosen)break;
         const costPaid=coreCost(chosen);
         s.cores-=costPaid;s[chosen]++;
        }
        times.push({rebirth:times.length+1,atSeconds:t,runSeconds:t-previous,coresEarned:earned,corePower:s.corePower,coreEconomy:s.coreEconomy,autoLevel:s.autoLevel,unspentCores:s.cores});
        previous=t;
       }
      }
      output[policy]={runs:times,completed:times.length};
     }
     return output;
    });
    assert.equal(Object.keys(repeatedRebirths).length,3,'rebirth investment policies missing');
    assert.ok(Object.values(repeatedRebirths).every(x=>x.runs.every(y=>y.runSeconds>0&&y.coresEarned>0)),'invalid repeated rebirth economy');
    console.log('BALANCE_REPEAT_REBIRTH_5 '+JSON.stringify(repeatedRebirths));
    // Experimental attack-cost sensitivity: restore the production formula after
    // each seeded run. Do not change live balance before measuring the tradeoff.
    const sensitivity=await balancePage.evaluate(()=>{
     const originalCostGrowth=costs.atk[1];
     const results={};
     for(const growth of [1.31,1.35,1.37,1.39,1.41]){
      costs.atk[1]=growth;
      let rng=20261114;
      Math.random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296};
      s=initial();pendingOffline=0;enemyHp=enemyMax=0;attackClock=enemyClock=0;spawn();
      let first=null;
      for(let t=1;t<=3600;t++){
       step(1,false);
       if(t%10===0){
        transferCacheCredits();
        for(let n=0;n<30;n++){
         const affordable=Object.keys(costs).filter(k=>s.best>=unlockStage[k]&&(k!=='spd'||s.spd<50)&&s.credits>=cost(k)).sort((a,b)=>(a==='atk'?-1:b==='atk'?1:cost(a)-cost(b)));
         if(!affordable.length)break;
         purchase(affordable[0]);
        }
       }
       if(first===null&&gainCore()>0)first=t;
      }
      results[growth]={firstReconstructionAt:first,finalStage:s.stage};
     }
     costs.atk[1]=originalCostGrowth;
     return results;
    });
    assert.equal(Object.keys(sensitivity).length,5,'attack-cost sensitivity incomplete');
    console.log('BALANCE_ATTACK_COST_SENSITIVITY '+JSON.stringify(sensitivity));
    assert.equal(Object.keys(strategies).length,7,'strategy sweep incomplete');
    assert.ok(Object.values(strategies).every(x=>x.finalStage>=1&&Number.isFinite(x.finalStage)),'invalid strategy telemetry');
    console.log('BALANCE_GROWTH_MILESTONES '+JSON.stringify(Object.fromEntries(Object.entries(strategies).map(([name,x])=>[name,x.unlocks]))));
    assert.ok(Object.values(strategies).every(x=>x.unlocks.skillAt!==null),'skill unlock missing in strategy sweep');
    assert.ok(strategies.attackWithSkillChoice.unlocks.traitAt!==null,'trait allocation was not exercised');
    const rebirthBenefits=await balancePage.evaluate(()=>{
     s=initial();
     const base={power:coreMultiplier(),credits:startingCredits()};
     s.rebirths=5;s.totalCores=500;
     const passive={power:coreMultiplier(),credits:startingCredits()};
     s.corePower=4;s.coreEconomy=3;
     const invested={power:coreMultiplier(),creditRate:creditRate()};
     return {base,passive,invested};
    });
    assert.deepEqual(rebirthBenefits.passive,rebirthBenefits.base,'rebirth count or lifetime cores still grant passive benefits');
    assert.ok(rebirthBenefits.invested.power>rebirthBenefits.base.power,'purchased core attack upgrade must improve power');
    console.log('REBIRTH_REWARD_ONLY '+JSON.stringify(rebirthBenefits));
    const automationCap=await balancePage.evaluate(()=>{
     s=initial();s.autoLevel=5;s.cores=1000000;
     const atCap={cost:coreCost('autoLevel'),interval:autoPurchaseInterval(),level:s.autoLevel};
     buyCore('autoLevel');
     return {atCap,after:{level:s.autoLevel,cores:s.cores},powerCost:coreCost('corePower'),economyCost:coreCost('coreEconomy')};
    });
    assert.equal(automationCap.atCap.interval,3,'automation max level must have 3s purchase interval');
    assert.equal(automationCap.after.level,5,'automation must not spend cores past useful level 5');
    assert.equal(automationCap.after.cores,1000000,'capped automation must not consume cores');
    assert.ok(Number.isFinite(automationCap.powerCost)&&Number.isFinite(automationCap.economyCost),'other core investments must remain available');
    console.log('AUTOMATION_INVESTMENT_CAP '+JSON.stringify(automationCap));
    assert.ok(strategies.attackWithSkillChoice.equipped.every(id=>strategies.attackWithSkillChoice.skillLevels[id]>=1),'selected skill levels must be tracked');
    const firstTimes=Object.values(strategies).map(x=>x.firstReconstructionAt).filter(Number.isFinite);
    const strategySpread=Math.max(...firstTimes)-Math.min(...firstTimes);
    console.log('BALANCE_SYSTEM_COVERAGE '+JSON.stringify({strategyCount:Object.keys(strategies).length,fastestFirstRebirthSeconds:Math.min(...firstTimes),slowestFirstRebirthSeconds:Math.max(...firstTimes),strategySpreadSeconds:strategySpread,skillSelectionImpactSeconds:strategies.attackWithSkillChoice.firstReconstructionAt-strategies.attackWithTraits.firstReconstructionAt,weaponFirstDropSeconds:Object.fromEntries(Object.entries(strategies).map(([name,x])=>[name,x.unlocks.weaponAt]))}));
    console.log('BALANCE_STRATEGIES_60M '+JSON.stringify(strategies));
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
