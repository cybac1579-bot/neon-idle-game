'use strict';
// Launch the generated one-file HTML from file:// with network disabled.
// This proves desktop Chromium behavior, not a physical Galaxy S25+ test.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const packaged=path.resolve(__dirname,'../artifacts/expedition-standalone/neon-expedition-offline.html');
// Battlefield intentionally renders only three guards; extras are counted
// in the rear-line summary. Test full roster, not DOM fighter count alone.
const renderedRosterCount=page=>page.evaluate(()=>{
 const visible=document.querySelectorAll('#squad .fighter').length;
 const rearLabel=document.querySelector('.roster-note')?.textContent||'';
 const rear=Number(rearLabel.match(/후방\s+(\d+)명/)?.[1]||0);
 return visible+rear;
});
async function main(){
 assert.ok(fs.existsSync(packaged),'build the offline HTML first');
 const file=fs.readFileSync(packaged,'utf8');
 assert.ok(file.includes('data-inline-source="expedition-engine.js"'));
 assert.ok(file.includes('data-inline-source="expedition-field.js"'));
 assert.ok(file.includes('data-inline-source="expedition-ui.js"'));
 assert.ok(file.includes('data-inline-skin="prototype-v1"'));
 assert.ok(file.includes('data-inline-source="expedition-app.js"'));
 assert.ok(!/<script[^>]+src=/.test(file),'no script network dependency');
 assert.ok(!/<link[^>]+href=/.test(file),'no stylesheet network dependency');
 const skin=fs.readFileSync(path.resolve(__dirname,'../site/expedition-ui.css'),'utf8');
 assert.ok(file.includes('<style data-inline-skin="prototype-v1">'+skin+'</style>'),
  'standalone package must embed the current replaceable visual skin');

 // Artifact provenance: the packaged executable must embed the current checkout's
 // exact scripts, not just scripts with the expected filenames.
 for(const name of ['expedition-engine.js','expedition-field.js','expedition-ui.js','expedition-app.js']){
  const source=fs.readFileSync(path.resolve(__dirname,'../site',name),'utf8').replace(/<\/script/gi,'<\\/script');
  assert.ok(file.includes('<script data-inline-source="'+name+'">\n'+source+'\n</script>'),
   'standalone package must embed current source: '+name);
 }
 const expectedSha=(process.env.GITHUB_SHA||'local-source').replace(/[^a-z0-9]/gi,'').slice(0,12);
 assert.ok(file.includes('<meta name="neon-expedition-build" content="'+expectedSha+'">'),
  'standalone package build SHA must match current checkout');
 const readme=fs.readFileSync(path.resolve(__dirname,'../artifacts/expedition-standalone/README-KO.txt'),'utf8');
 assert.ok(readme.includes('기준 커밋: '+expectedSha),'artifact README must match build SHA');
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [360,390,412]){
   const ctx=await browser.newContext({viewport:{width,height:800},acceptDownloads:true});
   await ctx.setOffline(true);
   const page=await ctx.newPage(),errors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
   await page.goto(pathToFileURL(packaged).href,{waitUntil:'load'});
   assert.equal(await page.locator('#battleScreen').isVisible(),true);
   assert.ok(await page.locator('#squad .fighter').count()>=2);
   // Spectator feedback must reflect the *engine's* battle cue, never generate
   // extra hits or rewards. Probe a separate engine state without touching
   // the live autosave and check cue replay protection in the real file:// page.
   if(width===390){
    const combatVisual=await page.evaluate(()=>{
     const E=window.ExpeditionEngine,view=window.ExpeditionField;
     const sample=E.newState();
     sample.enemyHp=1e7; // prevent a victory while probing a real guard strike
     sample.actors.forEach(a=>{a.progress=1;a.cooldown=0;});
     E.tick(sample,.25);
     const engineEvent=sample.battleEvent?.type;
     view.sync(sample);
     const effects=document.querySelector('#battleMotion');
     const guardMeleeHasTrail=!!effects.querySelector('.battle-trail');
     const guardImpact=!!effects.querySelector('.battle-burst.normal');
     const first=effects.firstElementChild;
     view.sync(sample);
     const replayed=effects.firstElementChild!==first;
     sample.training=8;view.sync(sample);
     const growthTraining=document.querySelector('#battleGrowth')?.textContent||'';
     // Movement transitions follow each saved actor progress, not an idle loop.
     sample.actors[0].progress=.4;view.sync(sample);
     const marching=document.querySelector('.fighter.guard').classList.contains('advance');
     sample.actors[0].progress=1;view.sync(sample);
     const deployed=document.querySelector('.fighter.guard').classList.contains('engaged')&&
       !document.querySelector('.fighter.guard').classList.contains('advance');
     sample.actors[0].hp=E.actorMaxHp(sample,'guard')*.2;view.sync(sample);
     const injured=document.querySelector('.fighter.guard').classList.contains('wounded');
     sample.actors[0].hp=E.actorMaxHp(sample,'guard');view.sync(sample);
     const healed=!document.querySelector('.fighter.guard').classList.contains('wounded');
     sample.actors.push({id:'guard',hp:E.actorMaxHp(sample,'guard'),
       revive:0,progress:.5,cooldown:0,shots:0});
     sample.units.guard=3;view.sync(sample);
     const compactThreeGuards=document.querySelector('.arena').classList.contains('formation-dense');
     const shouldCompactThreeGuards=document.querySelector('#squad').clientHeight<210;
     const trainingTier=document.querySelector('.arena').dataset.trainingTier;

     sample.units.ranger=1;
     sample.actors.push({id:'ranger',hp:17,revive:0,progress:1,cooldown:0,shots:0});
     sample.battleCueSeq++;
     sample.battleEvent={seq:sample.battleCueSeq,type:'volley',id:'ranger',value:20};
     view.sync(sample);
     // Normal ranger fire is a projectile, unlike an authentic guard hit.
     sample.battleCueSeq++;
     sample.battleEvent={seq:sample.battleCueSeq,type:'hit',id:'ranger',value:5};
     view.sync(sample);
     const rangerShot=!!effects.querySelector('.battle-trail.normal');
     sample.battleCueSeq++;
     sample.battleEvent={seq:sample.battleCueSeq,type:'volley',id:'ranger',value:20};
     view.sync(sample);
     const volley=!!effects.querySelector('.battle-trail.volley');
     const growthReinforcement=document.querySelector('#battleGrowth')?.textContent||'';
     sample.units.medic=1;
     sample.actors.push({id:'medic',hp:25,revive:0,progress:1,cooldown:0,shots:0});
     sample.battleCueSeq++;
     sample.battleEvent={seq:sample.battleCueSeq,type:'heal',id:'guard',value:2};
     view.sync(sample);
     const heal=!!effects.querySelector('.battle-trail.heal');
     sample.battleCueSeq++;
     sample.battleEvent={seq:sample.battleCueSeq,type:'brace',id:'guard',value:3};
     view.sync(sample);
     const shieldEl=effects.querySelector('.battle-burst.shield');
     const shield=!!shieldEl;
     const guardRect=document.querySelector('.fighter.guard').getBoundingClientRect();
     const arenaRect=document.querySelector('.arena').getBoundingClientRect();
     const guardCenter=guardRect.left-arenaRect.left+guardRect.width/2;
     const shieldOnGuard=shield&&Math.abs(Number.parseFloat(shieldEl.style.left)-guardCenter)<2;
     // The actual 2-ranger escort has two visible counters, a guard shield
     // and a distinct shared impact; it must not display fake third actors.
     sample.units.ranger=2;
     sample.actors.push({id:'ranger',hp:17,revive:0,progress:1,cooldown:0,shots:0});
     sample.battleCueSeq++;
     sample.battleEvent={seq:sample.battleCueSeq,type:'intercept-duet',id:'guard',value:8};
     view.sync(sample);
     const duetTrails=effects.querySelectorAll('.battle-trail.counter').length;
     const duetShield=!!effects.querySelector('.battle-burst.shield');
     const duetBurst=!!effects.querySelector('.battle-burst.duet');
     // Long fights show damage wear only after crossing actual HP ratios.
     sample.stage=40;
     sample.enemyHp=E.enemyMax(40)*.7;
     view.sync(sample);
     const worn=document.querySelector('.arena').classList.contains('boss-worn');
     sample.enemyHp=E.enemyMax(40)*.2;
     view.sync(sample);
     const critical=document.querySelector('.arena').classList.contains('boss-critical');
     sample.enemyHp=E.enemyMax(40)*.9;
     view.sync(sample);
     const healedBoss=!document.querySelector('.arena').classList.contains('boss-worn')&&
      !document.querySelector('.arena').classList.contains('boss-critical');
     sample.battleCueSeq++;
     sample.battleEvent={seq:sample.battleCueSeq,type:'clear',id:'guard',value:5};
     view.sync(sample);
     const milestone=!!effects.querySelector('.battle-burst.reward.breakthrough');
     const chestNotice=document.querySelector('#battleFx')?.textContent||'';
     const previousEffect=effects.firstElementChild;
     sample.battleCueSeq++;
     sample.battleEvent=null;view.sync(sample);
     const fabricated=effects.firstElementChild!==previousEffect;
     return {engineEvent,guardMeleeHasTrail,guardImpact,rangerShot,shieldOnGuard,
      duetTrails,duetShield,duetBurst,worn,critical,healedBoss,marching,deployed,injured,healed,compactThreeGuards,shouldCompactThreeGuards,visibleMiniatures:
      document.querySelectorAll('.actor-head').length>=2,
      volley,heal,shield,trainingTier,growthTraining,growthReinforcement,milestone,chestNotice,replayed,fabricated};
    });
    assert.equal(combatVisual.engineEvent,'hit','visual probe must start from a real engine attack');
    assert.equal(combatVisual.guardMeleeHasTrail,false,'guard melee may not fire fake projectiles');
    assert.equal(combatVisual.guardImpact,true,'guard melee contact is shown at enemy');
    assert.equal(combatVisual.rangerShot,true,'ranger attack has a real projectile');
    assert.equal(combatVisual.visibleMiniatures,true,'role miniatures render instead of lone glyphs');
    assert.equal(combatVisual.trainingTier,'2','real training value changes visual tier');
    assert.equal(combatVisual.marching,true,'unfinished actor visually advances');
    assert.equal(combatVisual.deployed,true,'deployed actor stops marching animation');
    assert.equal(combatVisual.injured,true,'real low HP marks a unit injured');
    assert.equal(combatVisual.healed,true,'restored HP removes the injury appearance');
    assert.equal(combatVisual.compactThreeGuards,combatVisual.shouldCompactThreeGuards,
      'three guards compact only when actual battlefield height requires it');
    assert.match(combatVisual.growthTraining,/부대 훈련/);
    assert.match(combatVisual.growthReinforcement,/증원 · \+1명/);
    assert.equal(combatVisual.replayed,false,'same battle cue must not replay the visual effect');
    assert.equal(combatVisual.volley,true,'precision volley gets a distinct projectile');
    assert.equal(combatVisual.heal,true,'field healing gets a distinct support effect');
    assert.equal(combatVisual.shield,true,'brace gets a visible shield effect');
    assert.equal(combatVisual.shieldOnGuard,true,'brace shield must appear on the defending guard');
    assert.equal(combatVisual.duetTrails,2,'two living rangers show two counter trails');
    assert.equal(combatVisual.duetShield,true,'escort duet still shields guard');
    assert.equal(combatVisual.duetBurst,true,'escort duet distinguishes combined impact');
    assert.equal(combatVisual.worn,true,'boss wear follows actual HP below 75%');
    assert.equal(combatVisual.critical,true,'boss critical wear follows HP below 25%');
    assert.equal(combatVisual.healedBoss,true,'wounds disappear when boss is not injured');
    assert.equal(combatVisual.milestone,true,'only real 5-distance clear gets milestone burst');
    assert.match(combatVisual.chestNotice,/보급 상자 획득/);
    assert.equal(combatVisual.fabricated,false);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.battle-burst')).display),'none',
      'reduced motion disables bright combat animations without hiding the combat HUD');
    await page.emulateMedia({reducedMotion:'no-preference'});
    console.log('PASS visual combat cues: engine attack, volley, heal, brace, tier and reduced motion');
   }
   assert.equal(await page.locator('#squadScreen [data-storage-warning]').isVisible(),false,
    'ordinary file:// play must never display a false persistence warning');
   assert.match(await page.locator('footer').textContent(),/오프라인 단일 HTML/);
   await page.locator('[data-tab="archive"]').click();
   assert.equal(await page.locator('#archiveScreen [data-storage-warning]').isVisible(),false,
    'ordinary archive remains uncluttered when autosave is usable');
   assert.equal(await page.locator('#exportSave').isVisible(),true);
   const [dl]=await Promise.all([page.waitForEvent('download'),page.locator('#exportSave').click()]);
   const backup=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
   assert.equal(backup.schema,'neon-expedition-full-save-v1');
   assert.equal(backup.saveKey,'neon_expedition_prototype_v1');
   assert.equal(backup.state.version,1);
   backup.state.credits=7777;
   backup.state.relics.ember=1;
   backup.state.runBest=backup.state.best=backup.state.stage=15;
   backup.state.lastSaved=Date.now();
   const data=Buffer.from(JSON.stringify(backup));
   page.on('dialog',dialog=>dialog.accept());
   await page.locator('#importSaveFile').setInputFiles({
    name:'verified-neon-expedition-backup.json',mimeType:'application/json',buffer:data
   });
   await page.waitForFunction(()=>document.querySelector('#credits')?.textContent==='7,777',{timeout:10000});
   assert.equal(await page.locator('#battleScreen').isVisible(),true);
   // Imported backups must never modify the existing/legacy save key.
   assert.equal(await page.evaluate(()=>localStorage.getItem('neon_rework_07')),null);
   const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')||'null'));
   assert.ok(stored,'file URL storage is available on the tested Chromium build');
   assert.equal(stored.credits,7777);
   assert.equal(stored.relics.ember,1);
   await page.reload({waitUntil:'load'});
   assert.equal(await page.locator('#credits').textContent(),'7,777');
   if(width===390){
    // Simulate a browser-start recovery after a 92-second background gap.
    // The resume must be recorded separately from the existing total.
    await page.addInitScript(()=>{
     const key='neon_expedition_prototype_v1',saved=JSON.parse(localStorage.getItem(key));
     if(saved){saved.lastSaved=Date.now()-92000;localStorage.setItem(key,JSON.stringify(saved));}
    });
    await page.reload({waitUntil:'load'});
    await page.locator('[data-tab="archive"]').click();
    const [resumeDownload]=await Promise.all([
     page.waitForEvent('download'),page.locator('#exportPlaytest').click()
    ]);
    const report=JSON.parse(fs.readFileSync(await resumeDownload.path(),'utf8'));
    const resumed=report.offlineResumeHistory.at(-1);
    assert.ok(resumed,'mobile playtest JSON must record startup recovery events');
    assert.equal(resumed.source,'startup');
    assert.ok(resumed.requestedSeconds>=91&&resumed.requestedSeconds<=95);
    assert.ok(resumed.settledSeconds>=91&&resumed.settledSeconds<=95);
    assert.ok(report.offlineSettledSeconds>=resumed.settledSeconds);
    assert.deepEqual(report.saveDiagnostics,{
     storageAvailableAtExport:true,blockedAtStartup:false,
     failedSaveAttempts:0,verifiedSaveRecoveries:0,originKind:'offline-file'
    });
    assert.equal(Object.hasOwn(report,'deviceId'),false);
   }
   assert.deepEqual(requests,[],'network must not be requested by the standalone build');
   assert.deepEqual(errors,[],'browser runtime errors');
   console.log('PASS standalone file:// offline',width,'export/import/reload/network=0');
   await ctx.close();
  }
  // Actual 2026-11-18 play history: 12/17 kinds owned, depth40 reached
  // but boss not defeated. A new kind requires a newly earned deep chest;
  // old shallow chests cannot mysteriously upgrade when opened later.
  const tierContext=await browser.newContext({viewport:{width:390,height:800}});
  await tierContext.setOffline(true);
  const tierPage=await tierContext.newPage(),tierErrors=[];
  tierPage.on('pageerror',e=>tierErrors.push(e.message));
  await tierPage.goto(pathToFileURL(packaged).href,{waitUntil:'load'});
  await tierPage.locator('[data-tab="archive"]').click();
  assert.equal(await tierPage.locator('#relicNextDiscovery').isVisible(),false,
   'a new player should not receive an irrelevant locked-tier message');
  // Seed via the real user-visible backup restore flow. Writing directly to
  // localStorage then reloading is unsafe: pagehide correctly saves the old
  // in-memory session and overwrites an injected external value.
  tierPage.on('dialog',dialog=>dialog.accept());
  const importTierSave=async state=>{
   const payload={schema:'neon-expedition-full-save-v1',
    saveKey:'neon_expedition_prototype_v1',state};
   await tierPage.locator('#importSaveFile').setInputFiles({
    name:'tier-acceptance-save.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(payload))
   });
   await tierPage.waitForFunction(expected=>{
    const saved=JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')||'null');
    return saved?.stage===expected.stage&&saved?.best===expected.best &&
     saved?.chests===expected.chests;
   },state,{timeout:10000});
  };
  const firstTierSave=await tierPage.evaluate(()=>{
   const E=window.ExpeditionEngine,s=E.newState(Date.now());
   s.stage=s.best=s.runBest=40;s.enemyHp=E.enemyMax(40);
   for(const r of E.RELICS)if(r.unlockStage<=30)s.relics[r.id]=1;
   s.chests=2;s.chestDepths=[5,35];
   return s;
  });
  await importTierSave(firstTierSave);
  await tierPage.reload({waitUntil:'load'});
  await tierPage.locator('[data-tab="archive"]').click();
  const depth40Hint=tierPage.locator('#relicNextDiscovery');
  const archiveEvidence=await tierPage.evaluate(()=>{
   const E=window.ExpeditionEngine,s=JSON.parse(localStorage.getItem(E.SAVE_KEY)||'null');
   const note=document.querySelector('#relicNextDiscovery');
   return {stage:s?.stage,best:s?.best,visibleTab:document.querySelector('#archiveScreen')?.hidden,
    discovered:E.RELICS.filter(r=>(s?.relics||{})[r.id]>0).map(r=>r.id),
    currentUnlocked:E.RELICS.filter(r=>r.unlockStage<=(s?.best||1)-1).map(r=>r.id),
    noteHidden:note?.hidden,noteText:note?.textContent,
    generatedByEngine:E.returnChoiceSnapshot(s)};
  });
  assert.equal(await depth40Hint.isVisible(),true,
   'depth40 user should see next discovery hint: '+JSON.stringify({archiveEvidence,tierErrors}));
  const depth40Text=await depth40Hint.textContent();
  assert.match(depth40Text,/유물 12종을 모두 발견했어/);
  assert.match(depth40Text,/40거리 보스 격파 후 획득한 상자에서 선발권 묶음/);
  assert.match(depth40Text,/기존 상자는 획득한 거리의 보상만/);
  assert.match(depth40Text,/미개봉 상자 2개는 새 종류 후보가 없어/);
  // Clearing the boss without opening the new-depth chest leaves a real
  // discoverable kind, so the all-discovered banner must disappear.
  const secondTierSave=await tierPage.evaluate(()=>{
   const key=window.ExpeditionEngine.SAVE_KEY,s=JSON.parse(localStorage.getItem(key));
   s.stage=s.best=s.runBest=41;s.chests=3;s.chestDepths=[5,35,40];
   s.enemyHp=window.ExpeditionEngine.enemyMax(41);
   return s;
  });
  await importTierSave(secondTierSave);
  await tierPage.reload({waitUntil:'load'});
  await tierPage.locator('[data-tab="archive"]').click();
  assert.equal(await tierPage.locator('#relicNextDiscovery').isVisible(),false,
   'a newly earned depth40 chest can discover enlist before a deeper gate');
  const thirdTierSave=await tierPage.evaluate(()=>{
   const key=window.ExpeditionEngine.SAVE_KEY,s=JSON.parse(localStorage.getItem(key));
   s.relics.enlist=1;s.chests=0;s.chestDepths=[];
   return s;
  });
  await importTierSave(thirdTierSave);
  await tierPage.reload({waitUntil:'load'});
  await tierPage.locator('[data-tab="archive"]').click();
  assert.match(await tierPage.locator('#relicNextDiscovery').textContent(),
   /45거리 정예 격파 후 획득한 상자에서 훈련 규정집/,
   'discovering the 40-tier moves the truthful next goal to 45');
  assert.deepEqual(tierErrors,[]);
  await tierContext.close();
  console.log('PASS real playtest 12/17 collectible tier and next earned depth 40/45 chest guidance');
  // Android file:// browsers may block localStorage or exhaust its quota.
  // The game must warn persistently and still permit a complete local JSON
  // backup containing the *current in-memory* progress (not a stale save).
  const blocked=await browser.newContext({viewport:{width:390,height:800},acceptDownloads:true});
  await blocked.setOffline(true);
  const blockedPage=await blocked.newPage(),blockedErrors=[];
  blockedPage.on('pageerror',e=>blockedErrors.push(e.message));
  await blockedPage.addInitScript(()=>{
   const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(key,value){
    if(String(key).startsWith('neon_expedition_prototype_v1'))
     throw new DOMException('persistent storage blocked','QuotaExceededError');
    return original.call(this,key,value);
   };
  });
  await blockedPage.goto(pathToFileURL(packaged).href,{waitUntil:'load'});
  assert.equal(await blockedPage.locator('#battleScreen').isVisible(),true);
  assert.equal(await blockedPage.locator('#squadScreen [data-storage-warning]').isVisible(),true,
   'a first-run blocked browser must immediately reveal the persistent warning');
  assert.match(await blockedPage.locator('#squadScreen [data-storage-warning]').textContent(),/전체 저장 백업/);
  await blockedPage.locator('#hire').click();
  const afterHire=await blockedPage.locator('#credits').textContent();
  assert.notEqual(afterHire,'65','live gameplay must remain usable without automatic saving');
  assert.equal(await blockedPage.locator('#squadScreen [data-storage-warning]').isVisible(),true);
  await blockedPage.locator('[data-tab="archive"]').click();
  assert.equal(await blockedPage.locator('#archiveScreen [data-storage-warning]').isVisible(),true,
   'the reminder remains accessible beside the backup action');
  const [blockedDownload]=await Promise.all([
   blockedPage.waitForEvent('download'),blockedPage.locator('#exportSave').click()
  ]);
  const blockedBackup=JSON.parse(fs.readFileSync(await blockedDownload.path(),'utf8'));
  assert.equal(blockedBackup.schema,'neon-expedition-full-save-v1');
  const backupActorCount=Object.values(blockedBackup.state.units).reduce((a,b)=>a+b,0);
  assert.ok(backupActorCount>2&&backupActorCount<=7,
   'failed local save must export the actual batch recruitment, not the original roster');
  assert.equal(backupActorCount,await renderedRosterCount(blockedPage),
   'backup must include visible fighters AND rear-line reserves after a batch purchase');
  assert.equal(blockedBackup.state.credits<65,true);
  const [blockedReportDownload]=await Promise.all([
   blockedPage.waitForEvent('download'),blockedPage.locator('#exportPlaytest').click()
  ]);
  const blockedReport=JSON.parse(fs.readFileSync(await blockedReportDownload.path(),'utf8'));
  assert.equal(blockedReport.saveDiagnostics.storageAvailableAtExport,false);
  assert.equal(blockedReport.saveDiagnostics.blockedAtStartup,true);
  assert.ok(blockedReport.saveDiagnostics.failedSaveAttempts>=1);
  assert.equal(blockedReport.saveDiagnostics.verifiedSaveRecoveries,0);
  assert.equal(blockedReport.saveDiagnostics.originKind,'offline-file');
  assert.equal(Object.hasOwn(blockedReport,'deviceId'),false);
  assert.equal(await blockedPage.locator('#archiveScreen [data-storage-warning]').isVisible(),true);
  assert.equal(await blockedPage.evaluate(()=>localStorage.getItem('neon_expedition_prototype_v1')),null,
   'failed storage cannot be reported as a successful persisted save');
  assert.deepEqual(blockedErrors,[],'storage failure should not crash the browser');
  await blocked.close();
  console.log('PASS standalone file:// storage-denied warning, continued growth and fresh JSON backup');
  // A transient quota/write failure must clear its warning only AFTER an
  // actually verified save succeeds. Prove the saved upgrade survives reload.
  const recovered=await browser.newContext({viewport:{width:390,height:800},acceptDownloads:true});
  await recovered.setOffline(true);
  const recoveredPage=await recovered.newPage();
  await recoveredPage.goto(pathToFileURL(packaged).href,{waitUntil:'load'});
  assert.equal(await recoveredPage.locator('#squadScreen [data-storage-warning]').isVisible(),false);
  await recoveredPage.evaluate(()=>{
   const original=Storage.prototype.setItem;
   window.__originalStorageWrite=original;
   Storage.prototype.setItem=function(key,value){
    if(key==='neon_expedition_prototype_v1')return; // fail silently
    return original.call(this,key,value);
   };
  });
  await recoveredPage.locator('#hire').click();
  const recruitedActorCount=await renderedRosterCount(recoveredPage);
  assert.ok(recruitedActorCount>2&&recruitedActorCount<=7,
   'batch recruitment must happen during the simulated write failure');
  assert.equal(await recoveredPage.locator('#squadScreen [data-storage-warning]').isVisible(),true,
   'a silently discarded save must be caught by readback');
  await recoveredPage.evaluate(()=>{
   Storage.prototype.setItem=window.__originalStorageWrite;
  });
  await recoveredPage.locator('[data-tab="archive"]').click();
  await recoveredPage.locator('#saveNow').click();
  assert.equal(await recoveredPage.locator('#archiveScreen [data-storage-warning]').isVisible(),false,
   'warning clears only after the browser can persist again');
  const storedAfter=await recoveredPage.evaluate(()=>JSON.parse(
   localStorage.getItem('neon_expedition_prototype_v1')||'null'
  ));
  assert.equal(Object.values(storedAfter.units).reduce((a,b)=>a+b,0),recruitedActorCount,
   'recovery should persist the exact number recruited, not assume a one-unit purchase');
  const [recoverReportDownload]=await Promise.all([
   recoveredPage.waitForEvent('download'),recoveredPage.locator('#exportPlaytest').click()
  ]);
  const recoverReport=JSON.parse(fs.readFileSync(await recoverReportDownload.path(),'utf8'));
  assert.equal(recoverReport.saveDiagnostics.storageAvailableAtExport,true);
  assert.equal(recoverReport.saveDiagnostics.blockedAtStartup,false);
  assert.equal(recoverReport.saveDiagnostics.failedSaveAttempts,1);
  assert.equal(recoverReport.saveDiagnostics.verifiedSaveRecoveries,1);
  await recoveredPage.reload({waitUntil:'load'});
  const afterReload=await recoveredPage.evaluate(()=>JSON.parse(
   localStorage.getItem('neon_expedition_prototype_v1')||'null'
  ));
  assert.equal(Object.values(afterReload.units).reduce((a,b)=>a+b,0),recruitedActorCount,
   'a recovered persistent store keeps the entire batch purchase after reload');
  assert.equal(await recoveredPage.locator('#squadScreen [data-storage-warning]').isVisible(),false);
  await recovered.close();
  console.log('PASS standalone file:// silent save failure detection and durable recovery');
  // The mobile browser may emit visibilitychange(hidden), then pagehide
  // minutes later. The second event must NOT move the offline time anchor.
  // BFCache can restore via pageshow(persisted) without visibilitychange.
  const transitions=await browser.newContext({viewport:{width:390,height:800},acceptDownloads:true});
  await transitions.setOffline(true);
  const lifecyclePage=await transitions.newPage(),lifecycleErrors=[];
  lifecyclePage.on('pageerror',e=>lifecycleErrors.push(e.message));
  await lifecyclePage.goto(pathToFileURL(packaged).href,{waitUntil:'load'});
  const life=await lifecyclePage.evaluate(()=>{
   const originalNow=Date.now;
   let now=originalNow(),hidden=false;
   Date.now=()=>now;
   Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden});
   const key='neon_expedition_prototype_v1';
   const read=()=>JSON.parse(localStorage.getItem(key));
   // App was playing until departure. Simulate actual visibilitychange.
   hidden=true;
   document.dispatchEvent(new Event('visibilitychange'));
   const departed=read();
   now+=190000;
   window.dispatchEvent(new Event('pagehide'));
   const lateHide=read();
   hidden=false;
   document.dispatchEvent(new Event('visibilitychange'));
   const resumed=read();
   // BFCache: pagehide can occur while visible; freeze FIRST, then time
   // advances while the page is suspended, then pageshow restores it.
   window.dispatchEvent(new Event('pagehide'));
   const cached=read();
   now+=90000;
   window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
   const bfcache=read();
   window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
   const duplicate=read();
   Date.now=originalNow;
   return {
    hiddenAnchor:departed.lastSaved,
    latePageHideAnchor:lateHide.lastSaved,
    resumedClock:resumed.clock,
    resumedOffline:resumed.playtest.offlineSeconds,
    resumedEvents:resumed.playtest.offlineEvents,
    bfcacheAnchor:cached.lastSaved,
    bfcacheClock:bfcache.clock,
    bfcacheOffline:bfcache.playtest.offlineSeconds,
    bfcacheEvents:bfcache.playtest.offlineEvents,
    duplicateClock:duplicate.clock,
    duplicateEvents:duplicate.playtest.offlineEvents
   };
  });
  assert.equal(life.latePageHideAnchor,life.hiddenAnchor,
   'a delayed pagehide must not erase 190 seconds of offline time');
  assert.equal(life.resumedOffline,190);
  assert.equal(life.resumedEvents.length,1);
  assert.equal(life.resumedEvents[0].settledSeconds,190);
  assert.equal(life.resumedEvents[0].source,'resume');
  assert.equal(life.bfcacheOffline,280);
  assert.equal(life.bfcacheClock,life.resumedClock+90);
  assert.equal(life.bfcacheEvents.length,2);
  assert.equal(life.bfcacheEvents[1].settledSeconds,90);
  assert.equal(life.duplicateClock,life.bfcacheClock,
   'duplicate BFCache pageshow cannot double-count an offline return');
  assert.equal(life.duplicateEvents.length,2);
  assert.deepEqual(lifecycleErrors,[]);
  await transitions.close();
  console.log('PASS offline file:// delayed pagehide and BFCache resume exactly once');
 }finally{await browser.close();}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
