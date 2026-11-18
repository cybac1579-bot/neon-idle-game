'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const site=path.resolve(__dirname,'../site');
const server=http.createServer((req,res)=>{
 const filename=decodeURIComponent((req.url||'/').split('?')[0].replace(/^\/+/,''));
 if(!['expedition.html','expedition-engine.js','expedition-ui.css','expedition-ui.js','expedition-app.js','expedition-field.js'].includes(filename)){res.writeHead(404);res.end();return;}
 const name=path.join(site,filename);
 res.writeHead(200,{'Content-Type':filename.endsWith('.html')?'text/html; charset=utf-8':filename.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'});
 fs.createReadStream(name).pipe(res);
});
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port+'/expedition.html';
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [360,390,412]){
   const context=await browser.newContext({viewport:{width,height:800},deviceScaleFactor:1,acceptDownloads:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(url,{waitUntil:'networkidle'});
   assert.match(await page.title(),/용병단 탐사 원형/);
   assert.equal(await page.locator('#battleScreen').isVisible(),true);
   // A slow CI browser can finish the DOM navigation before field sprites
   // are placed. Allow startup rendering to complete, but keep hard failure
   // with diagnostic detail if a genuine JavaScript bootstrap error occurs.
   await page.waitForTimeout(300);
   const initialFighters=await page.locator('#squad .fighter').count();
   const boot=await page.evaluate(()=>({field:!!window.ExpeditionField,
    engine:!!window.ExpeditionEngine,ui:!!window.ExpeditionUI,
    stage:document.querySelector('#stage')?.textContent,
    scripts:[...document.scripts].map(x=>x.getAttribute('src')).filter(Boolean)}));
   assert.ok(initialFighters>=2,
    'no initial fighters: '+JSON.stringify({initialFighters,boot,pageErrors:errors}));
   const firstActor=await page.locator('#squad .fighter').first().getAttribute('style');
   await page.waitForTimeout(500);
   const movedActor=await page.locator('#squad .fighter').first().getAttribute('style');
   assert.notEqual(firstActor,movedActor,'fighter must advance visibly with engine state');
   assert.ok(await page.locator('#squad .fighter-health').count()>=2);
   const firstGuards=await page.locator('#squad .fighter.guard').evaluateAll(nodes=>nodes.slice(0,2).map(el=>el.getBoundingClientRect().top));
   assert.equal(firstGuards.length,2,'starting escort must display two frontline fighters');
   assert.ok(Math.abs(firstGuards[0]-firstGuards[1])>=20,
    'starting guards must be visually separated in the persistent viewport');
   assert.equal(await page.locator('[data-tab="squad"]').getAttribute('aria-current'),'page','growth is default and battle remains on top');
   const assertBattleFrame=async label=>{
    const boxes=await page.evaluate(()=>{
     const battle=document.querySelector('#battleScreen').getBoundingClientRect();
     const stage=document.querySelector('.arena').getBoundingClientRect();
     const navigation=document.querySelector('.tabs').getBoundingClientRect();
     const tray=document.querySelector('#workbench').getBoundingClientRect();
     return {battle:{top:battle.top,bottom:battle.bottom,height:battle.height},
      arena:{top:stage.top,bottom:stage.bottom,height:stage.height},
      nav:{top:navigation.top,bottom:navigation.bottom},
      tray:{top:tray.top,bottom:tray.bottom},screen:{width:innerWidth,height:innerHeight},
      scrollWidth:document.documentElement.scrollWidth};
    });
    assert.ok(boxes.arena.height>=110,'actual combat arena visible: '+label+' '+JSON.stringify(boxes));
    assert.ok(boxes.arena.top>=0&&boxes.arena.bottom<boxes.screen.height,'arena remains in viewport: '+label);
    assert.ok(boxes.battle.bottom<=boxes.nav.top+2,'command menu must not cover battlefield: '+label);
    assert.ok(boxes.nav.bottom<=boxes.tray.top+2,'scrolling tray begins below tabs: '+label);
    assert.ok(boxes.tray.bottom<=boxes.screen.height+1,'command tray fits portrait: '+label);
    assert.ok(boxes.scrollWidth<=boxes.screen.width+1,'no horizontal overflow: '+label);
   };
   await assertBattleFrame('fresh first run');
   await page.locator('[data-tab="squad"]').click();
   assert.equal(await page.locator('#squadScreen').isVisible(),true);
   await page.locator('#workbench').evaluate(el=>{el.scrollTop=el.scrollHeight;});
   assert.equal(await page.locator('#battleScreen').isVisible(),true,'battlefield must stay visible during long growth menu scroll');
   await assertBattleFrame('scrolled growth menu');
   await page.locator('#workbench').evaluate(el=>{el.scrollTop=0;});
   assert.match(await page.locator('#buyCountSquad').textContent(),/최대 5회/);
   await page.locator('#hire').click();
   assert.equal(await page.locator('#hire').isVisible(),true);
   assert.ok(await page.locator('#roleContribution').textContent());
   assert.equal(await page.locator('#autoMode').inputValue(),'balanced');
   assert.equal(await page.locator('#autoToggle').getAttribute('aria-pressed'),'false');
   await page.locator('#autoMode').selectOption('reserve');
   assert.equal(await page.locator('#autoMode').inputValue(),'reserve');
   await page.locator('#autoMode').selectOption('adaptive');
   assert.equal(await page.locator('#autoMode').inputValue(),'adaptive');
   await page.locator('#autoMode').selectOption('balanced');
   await page.locator('#autoMode').selectOption('recruit');
   await page.locator('#autoToggle').click();
   assert.equal(await page.locator('#autoToggle').getAttribute('aria-pressed'),'true');
   await page.waitForFunction(()=>/이번 탐사 자동 구매 [1-9]/.test(document.querySelector('#autoDetails')?.textContent||''),null,{timeout:8000});
   await page.locator('#autoToggle').click();
   assert.equal(await page.locator('#autoToggle').getAttribute('aria-pressed'),'false');
   const autoSaved=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')).autoBuy);
   assert.equal(autoSaved.mode,'recruit');
   assert.equal(autoSaved.enabled,false);
   assert.ok(autoSaved.purchases>=1);
   await page.locator('#buyCountSquad').click();
   assert.match(await page.locator('#buyCountSquad').textContent(),/최대 10회/);
   await page.locator('#buyCountSquad').click();
   assert.equal((await page.locator('#buyCountSquad').textContent()).trim(),'1회');
   await page.locator('[data-tab="supply"]').click();
   assert.equal(await page.locator('#supplyScreen').isVisible(),true);
   assert.equal(await page.locator('#battleScreen').isVisible(),true,'supply menu never hides combat');
   await assertBattleFrame('supply menu');
   assert.equal((await page.locator('#buyCountSupply').textContent()).trim(),'1회');
   await page.locator('#buyCountSupply').click();
   assert.match(await page.locator('#buyCountSupply').textContent(),/최대 5회/);
   await page.locator('[data-tab="archive"]').click();
   // Inject on the next document before expedition-app.js loads. Ordinary pagehide
   // saves the old game state; modifying storage immediately before reload loses the fixture.
   await page.addInitScript(()=>{
    const key='neon_expedition_prototype_v1',s=JSON.parse(localStorage.getItem(key));
    if(s&&s.rebirths===0){
     s.stage=11;s.best=11;s.runBest=11;s.enemyHp=1e9;s.chests=4;s.credits=5000;s.lastSaved=Date.now();
     s.playtest={offlineSeconds:90,snapshots:[{
      run:1,sec:60,stage:7,credits:750,training:1,heroLevel:2,
      recruits:3,chests:1,relicKinds:0,relicTotal:0,
      manualBuys:1,autoBuys:0,source:'foreground'
     }]};
     s.units={guard:5,ranger:4,medic:3};
     s.actors=['guard','ranger','guard','medic','ranger','guard','medic','guard','ranger','medic','guard','ranger']
      .map(id=>({id,hp:id==='guard'?48:id==='ranger'?17:25,revive:0,progress:.5,cooldown:1}));
     s.squadHp=5*48+4*17+3*25;
     localStorage.setItem(key,JSON.stringify(s));
    }
   });
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('#squad .fighter').count(),8,'mobile preview caps drawn actors');
   assert.equal(await page.locator('.roster-note').isVisible(),true,'hidden reserve members must be signaled');
   await page.locator('[data-tab="archive"]').click();
   assert.equal(await page.locator('#battleScreen').isVisible(),true,'relic collection must not hide combat');
   await assertBattleFrame('relic archive');
   assert.equal(await page.locator('#openArchiveChest').isVisible(),true);
   assert.equal(await page.locator('#openArchiveBatch').isVisible(),true);
   assert.match(await page.locator('#relicCollectionProgress').textContent(),/미개봉 4상자/);
   assert.equal(await page.locator('#relicList .relic').count(),17,'stage65 diagram appears alongside existing permanent relics in archive');
   assert.match(await page.locator('#milestoneSummary').textContent(),/10거리 보스/);
   const awaiting=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')));
   assert.equal(awaiting.chests,4,'chests remain unopened until explicitly clicked');
   assert.match(await page.locator('#openChest').textContent(),/첫 유물 확인 · 상자 1개 열기/,
    'first permanent discovery should be obvious on the live battle screen');
   await page.locator('#openArchiveChest').click();
   assert.equal(await page.locator('#relicPopup').isVisible(),true);
   assert.equal(await page.locator('#popupResults .reward-item').count(),1);
   assert.equal(await page.locator('#popupResults .reward-effect').count(),1,
    'new item explains its actual measured improvement');
   await page.locator('#popupClose').click();
   assert.equal(await page.locator('#relicPopup').isVisible(),false);
   assert.match(await page.locator('#openChest').textContent(),/상자 1개 열기 · 보유 3개/,
    'battle button opens one box while the archive remains the batch control');
   assert.match(await page.locator('#openArchiveBatch').textContent(),/3개 함께 열기/);
   await page.locator('#openArchiveBatch').click();
   assert.equal(await page.locator('#relicPopup').isVisible(),true);
   assert.equal(await page.locator('#popupResults .reward-item').count(),3);
   assert.equal(await page.locator('#popupResults .reward-effect').count(),3,
    'batch opening preserves separate improvements per awarded item');
   assert.match(await page.locator('#popupTitle').textContent(),/3개 상자 개봉/);
   assert.match(await page.locator('#popupImpact').textContent(),/주요 상시 효과 변화.*조건부 효과는 유물별 표시/);
   await page.locator('#popupClose').click();
   assert.equal(await page.locator('#relicPopup').isVisible(),false);
   assert.equal(await page.locator('#relicRecent .collection-log').count(),4);
   assert.equal(await page.locator('#openArchiveBatch').isVisible(),false);
   assert.match(await page.locator('#permanentBonusSummary').textContent(),/영구 성장 효과/);
   assert.match(await page.locator('#permanentBonusSummary').textContent(),/용병 소집 비용 절약/);
   assert.ok(await page.locator('#relicList .relic.owned .next-effect').count()>0,
    'collection archive shows real next-copy payoff only for owned relics');
   assert.match(await page.locator('#relicList .relic.owned .next-effect').first().textContent(),
    /다음 1개 효과/);
   const savedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')));
   assert.equal(Object.values(savedBefore.relics).reduce((a,b)=>a+b,0),4);
   assert.equal(savedBefore.relicHistory.length,4);
   assert.equal(savedBefore.runMetrics.chestsOpened,4);
   assert.equal(savedBefore.runMetrics.firstRelicFinds+
    savedBefore.runMetrics.duplicateRelics+savedBefore.runMetrics.relicExchanges,4,
    'every opened box has an observed discovery, duplicate or exchange');
   assert.match(await page.locator('#relicCollectionProgress').textContent(),/이번 탐사 첫 발견/);
   page.on('dialog',d=>d.accept());
   assert.equal(await page.locator('#returnQuick').isVisible(),true,'visible return cue must appear when available');
   assert.match(await page.locator('#returnBadge').textContent(),/\+/,'return tab signals available cores');
   await page.locator('#returnQuick').click();
   assert.equal(await page.locator('#returnScreen').isVisible(),true,'return is a dedicated discoverable tab');
   await assertBattleFrame('return menu');
   await page.locator('#rebirth').click();
   assert.equal(await page.locator('#battleScreen').isVisible(),true);
   assert.equal(await page.locator('#returnPopup').isVisible(),true,'return summary should appear without adding permanent HUD clutter');
   assert.match(await page.locator('#returnPopupSummary').textContent(),/이번 귀환 코어/);
   assert.match(await page.locator('#returnPopupSummary').textContent(),/지난 탐사 출발/);
   const savedAfter=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')));
   assert.equal(savedAfter.latestReturn.number,1);
   assert.equal(savedAfter.latestReturn.cores,savedAfter.runHistory.at(-1).cores);
   assert.equal(savedAfter.latestReturn.before.attack,3.3);
   assert.ok(savedAfter.latestReturn.after.attack>=savedAfter.latestReturn.before.attack);
   await page.locator('#returnPopupArchive').click();
   assert.equal(await page.locator('#returnPopup').isVisible(),false);
   assert.equal(await page.locator('#returnScreen').isVisible(),true);
   assert.equal(await page.locator('#returnReportPanel').isVisible(),true);
   assert.match(await page.locator('#returnReportContent').textContent(),/기본 부대 화력/);
   assert.equal(savedAfter.stage,1);
   assert.equal(Object.values(savedAfter.relics).reduce((a,b)=>a+b,0),4);
   assert.deepEqual(savedAfter.relicHistory,savedBefore.relicHistory,'journal must persist through rebirth');
   assert.equal(savedAfter.runMetrics.chestsOpened,0);
   assert.equal(savedAfter.playtest.snapshots.length,1);
   assert.equal(savedAfter.autoBuy.mode,'recruit');
   assert.equal(savedAfter.autoBuy.enabled,false);
   assert.equal(savedAfter.autoBuy.purchases,0);
   assert.equal(await page.evaluate(()=>localStorage.getItem('neon_rework_07')),null);
   await page.reload({waitUntil:'networkidle'});
   await page.locator('[data-tab="return"]').click();
   assert.equal(await page.locator('#returnReportPanel').isVisible(),true,'return report survives an actual browser reload');
   await assertBattleFrame('return report');
   const restoredReport=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')).latestReturn);
   assert.deepEqual(restoredReport,savedAfter.latestReturn,'saved results must stay unchanged after reload');
   assert.match(await page.locator('#returnReportContent').textContent(),/기본 부대 화력/);
   await page.locator('[data-tab="archive"]').click();
   assert.equal(await page.locator('#battleScreen').isVisible(),true,'export while the battle remains in view');
   assert.match(await page.locator('#playtestSummary').textContent(),/기록한 1분 단위 상태/);
   const [download]=await Promise.all([
    page.waitForEvent('download'),
    page.locator('#exportPlaytest').click()
   ]);
   assert.match(download.suggestedFilename(),/^neon-expedition-playtest-\d{4}-\d{2}-\d{2}\.json$/);
   const payload=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
   assert.equal(payload.schema,'neon-expedition-playtest-v1');
   assert.equal(payload.origin,'local-user-export');
   assert.equal(payload.currentRun.number,2);
   // exported chest telemetry uses the opt-in, never guessed
   assert.equal(payload.currentRun.autoChestEnabled,false);
   assert.equal(payload.currentRun.automaticChestsOpened,0);
   assert.equal(payload.currentRun.manuallyOpenedChests,
    Math.max(0,payload.currentRun.chestsOpened-payload.currentRun.automaticChestsOpened));
   assert.equal(payload.latestReturnComparison.autoChestOpened,0);
   assert.equal(payload.recentReturns[0].autoChestOpened,0);
   assert.equal(typeof payload.currentRun.milestoneClears,'object');
   assert.equal(payload.minuteSnapshots.length,1);
   assert.equal(payload.minuteSnapshots[0].stage,7);
   // Old recorded snapshots predate auto chest instrumentation.
   assert.equal(payload.minuteSnapshots[0].autoChestEnabled,null);
   assert.equal(payload.minuteSnapshots[0].autoChestOpened,null);
   assert.equal(payload.offlineSettledSeconds,90);
   assert.equal(payload.recentReturns.length,1);
   assert.deepEqual(payload.latestReturnComparison,savedAfter.latestReturn);
   assert.deepEqual(payload.currentRunOpening,savedAfter.runOpening);
   assert.equal(payload.lifetime.relics[Object.keys(savedBefore.relics).find(id=>savedBefore.relics[id]>0)],savedBefore.relics[Object.keys(savedBefore.relics).find(id=>savedBefore.relics[id]>0)]);
   assert.equal(Object.hasOwn(payload,'deviceId'),false);
   assert.equal(Object.hasOwn(payload,'account'),false);
   const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   assert.ok(bounds.scroll<=bounds.width+1,'mobile horizontal overflow: '+JSON.stringify(bounds));
   assert.deepEqual(errors,[],'browser runtime errors '+width);
   if(width===390){fs.mkdirSync('artifacts/expedition',{recursive:true});await page.screenshot({path:'artifacts/expedition/expedition-390.png',fullPage:true});}
   // Archive must show honest same-distance improvement and slowdown, including
   // the stage-50 boss, without requiring invented milestones on older saves.
   await page.addInitScript(()=>{
    const key='neon_expedition_prototype_v1',state=JSON.parse(localStorage.getItem(key));
    if(state&&state.rebirths===1&&state.runHistory?.length){
     state.runHistory[state.runHistory.length-1].milestones={40:3600,45:4000,50:6000};
     state.runMilestones={40:1800,45:6000,50:4500};
     state.lastSaved=Date.now();
     localStorage.setItem(key,JSON.stringify(state));
    }
   });
   await page.reload({waitUntil:'networkidle'});
   await page.locator('[data-tab="archive"]').click();
   const milestones=await page.locator('#milestoneSummary').textContent();
   assert.match(milestones,/40거리 보스/);
   assert.match(milestones,/50거리 보스/);
   assert.match(milestones,/직전 대비 50\.0% 단축/);
   assert.match(milestones,/직전 대비 50\.0% 증가/);
   const comparisonBounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   assert.ok(comparisonBounds.scroll<=comparisonBounds.width+1,
    'archive comparison horizontal overflow: '+JSON.stringify(comparisonBounds));
   // Activate a deep relic on a saved return and show its precise bonus only
   // in the archive. No permanent HUD numbers or manual combat input added.
   await page.addInitScript(()=>{
    const key='neon_expedition_prototype_v1',state=JSON.parse(localStorage.getItem(key));
    if(state?.rebirths===1){
     state.relics=state.relics||{};state.relics.chronicle=1;
     state.lastSaved=Date.now();
     localStorage.setItem(key,JSON.stringify(state));
    }
   });
   await page.reload({waitUntil:'networkidle'});
   await page.locator('[data-tab="return"]').click();
   assert.match(await page.locator('#permanentBonusSummary').textContent(),/원정 연대기 수집 효과/);
   assert.match(await page.locator('#permanentBonusSummary').textContent(),/피해량 \+\d+%/);
   const chronicleBounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   assert.ok(chronicleBounds.scroll<=chronicleBounds.width+1,
    'chronicle archive horizontal overflow: '+JSON.stringify(chronicleBounds));
   // An opt-in long-saving policy may be deliberately slow. Make that delay
   // visible in the squad tab only. Never replace the player's mode for them.
   await page.addInitScript(()=>{
    const key='neon_expedition_prototype_v1',state=JSON.parse(localStorage.getItem(key));
    if(state?.rebirths===1){
     state.stage=50;state.best=Math.max(50,state.best);state.runBest=50;
     state.enemyHp=1e8;state.credits=0;
     state.questLevels.contract=13;
     state.autoBuy={...state.autoBuy,enabled:true,mode:'reserve',cursor:2,elapsed:0};
     state.lastSaved=Date.now();
     localStorage.setItem(key,JSON.stringify(state));
    }
   });
   await page.reload({waitUntil:'networkidle'});
   await page.locator('[data-tab="squad"]').click();
   assert.equal(await page.locator('#autoMode').inputValue(),'reserve');
   assert.match(await page.locator('#autoDetails').textContent(),/보급 수익만 가정하면 약/);
   assert.match(await page.locator('#autoDetails').textContent(),/성장이 멈춘 것 같다면 균형\/유동형 전환 가능/);
   await page.locator('#autoMode').selectOption('balanced');
   assert.doesNotMatch(await page.locator('#autoDetails').textContent(),/보급 수익만 가정하면 약/);
   const adviceBounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   assert.ok(adviceBounds.scroll<=adviceBounds.width+1,
    'reserve advice horizontal overflow: '+JSON.stringify(adviceBounds));
   // The player gets an arithmetic milestone comparison, not a suggested
   // rebirth deadline or an invented time estimate. Remain in voluntary control.
   await page.locator('[data-tab="return"]').click();
   const returnView=await page.locator('#rebirthSummary').textContent();
   assert.match(returnView,/계속 탐사 시 귀환 예상/);
   assert.match(returnView,/거리 격파 가정 · 총 [0-9,]+코어/);
   assert.match(returnView,/격파 진척·첫 기록 보너스 기준, 소요 시간 미반영/);
   const returnBounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   assert.ok(returnBounds.scroll<=returnBounds.width+1,
    'return forecast horizontal overflow: '+JSON.stringify(returnBounds));
   // Optional chest automation lives only in the archive. It stays off for
   // old saves, persists through reload, and never takes away manual control.
   await page.locator('[data-tab="archive"]').click();
   assert.equal(await page.locator('#autoChestToggle').getAttribute('aria-pressed'),'false');
   assert.match(await page.locator('#autoChestStatus').textContent(),/자동 개봉 꺼짐/);
   await page.locator('#autoChestToggle').click();
   assert.equal(await page.locator('#autoChestToggle').getAttribute('aria-pressed'),'true');
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')).autoChest.enabled),true);
   await page.reload({waitUntil:'networkidle'});
   await page.locator('[data-tab="archive"]').click();
   assert.equal(await page.locator('#autoChestToggle').getAttribute('aria-pressed'),'true');
   assert.match(await page.locator('#autoChestStatus').textContent(),/오프라인 정산 포함/);
   assert.match(await page.locator('#history').textContent(),/상자 수동 .*개 \/ 자동 .*개/);
   assert.match(await page.locator('#playtestSummary').textContent(),/상자 자동 개봉/);
   // auto-enabled playtest JSON must report the toggled preference and counts.
   const [autoReport]=await Promise.all([
    page.waitForEvent('download'),page.locator('#exportPlaytest').click()
   ]);
   const autoPayload=JSON.parse(fs.readFileSync(await autoReport.path(),'utf8'));
   assert.equal(autoPayload.currentRun.autoChestEnabled,true);
   assert.ok(Number.isInteger(autoPayload.currentRun.automaticChestsOpened));
   assert.equal(autoPayload.currentRun.manuallyOpenedChests,
    autoPayload.currentRun.chestsOpened-autoPayload.currentRun.automaticChestsOpened);
   const chestBounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   assert.ok(chestBounds.scroll<=chestBounds.width+1,
    'chest automation portrait overflow: '+JSON.stringify(chestBounds));
   await page.locator('#autoChestToggle').click();
   assert.equal(await page.locator('#autoChestToggle').getAttribute('aria-pressed'),'false');
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')).autoChest.enabled),false);
   // Existing saves that already own these relics gain their tactical
   // behavior without any UI schema migration or new purchase button.
   await page.addInitScript(()=>{
    const key='neon_expedition_prototype_v1',state=JSON.parse(localStorage.getItem(key));
    if(state){
     state.relics.archer=2;state.relics.medkit=2;state.relics.scout=1;state.relics.relay=1;
     state.relicEffects={volleys:3,volleyBonusDamage:45,triages:2,triageCooldown:0,intelClears:1,intelFinds:1};
     if(!state.relicHistory.some(r=>r.source==='intel'))state.relicHistory.push({id:'bounty',duplicate:false,source:'intel',stack:1,credits:0,stage:35,depth:35,run:state.rebirths+1});
     state.lastSaved=Date.now();
     localStorage.setItem(key,JSON.stringify(state));
    }
   });
   await page.reload({waitUntil:'networkidle'});
   await page.locator('[data-tab="archive"]').click();
   assert.equal(await page.locator('#relicEffectSummary').isVisible(),true);
   assert.match(await page.locator('#relicEffectSummary').textContent(),/정밀 일제사격 3회/);
   assert.match(await page.locator('#relicEffectSummary').textContent(),/긴급 재합류 2회/);
   assert.match(await page.locator('#relicEffectSummary').textContent(),/탐사 정보망 1\/2회 자동 발견/);
   assert.match(await page.locator('#relicEffectSummary').textContent(),/정예 조사 1\/2/);
   assert.match(await page.locator('#relicRecent').textContent(),/정보망 자동 조사/);
   assert.match(await page.locator('#relicList').textContent(),/정밀 일제사격/);
   assert.match(await page.locator('#relicList').textContent(),/긴급 재합류/);
   assert.match(await page.locator('#relicList').textContent(),/작전 통신기와 함께 탐사 정보망/);
   assert.match(await page.locator('#relicList').textContent(),/탐사 일지와 함께 자동 유물 조사/);
   assert.equal(await page.locator('#battleScreen').isVisible(),true);
   // Exercise the actual replaceable field visualizer with a real engine
   // enemy-focus pattern. UI cannot fake it with a static CSS label.
   const tacticView=await page.evaluate(()=>{
    const E=window.ExpeditionEngine,field=window.ExpeditionField;
    const s=E.newState(Date.now());
    s.stage=s.best=s.runBest=15;s.enemyHp=1e10;
    s.relics.guard=1;s.relics.archer=1;s.units.ranger=1;
    s.actors.push({id:'ranger',hp:E.actorMaxHp(s,'ranger'),revive:0,progress:1,cooldown:100,shots:0});
    for(const a of s.actors){a.hp=E.actorMaxHp(s,a.id);a.progress=1;a.cooldown=100;}
    E.tick(s,3);field.sync(s);
    const intent=document.querySelector('.enemy-intent');
    const warning={visible:!intent.hidden,text:intent.textContent};
    E.tick(s,2);field.sync(s);
    const result={visible:!intent.hidden,text:intent.textContent,intercepts:s.relicEffects.intercepts,
      event:document.querySelector('.combat-cue')?.textContent};
    return {warning,result};
   });
   assert.equal(tacticView.warning.visible,true,'elite telegraph visible during growth or archive use');
   assert.match(tacticView.warning.text,/측면 조준/);
   assert.equal(tacticView.result.visible,true);
   assert.match(tacticView.result.text,/호위.*반격/);
   assert.equal(tacticView.result.intercepts,1);
   assert.match(tacticView.result.event,/호위 반격/);
   // The first escort contract redirects a real focused rear shot before
   // the player discovers a focus sight for the full escort-counter.
   const coverView=await page.evaluate(()=>{
    const E=window.ExpeditionEngine,field=window.ExpeditionField;
    const s=E.newState(Date.now());
    s.stage=s.best=s.runBest=15;s.enemyHp=1e10;s.battleCueSeq=2100;
    s.relics.guard=1;s.units.ranger=1;
    s.actors.push({id:'ranger',hp:20000,revive:0,progress:1,cooldown:100,shots:0});
    for(const a of s.actors){a.hp=20000;a.progress=1;a.cooldown=100;}
    E.tick(s,3);field.sync(s);
    const intent=document.querySelector('.enemy-intent');
    const warning={visible:!intent.hidden,text:intent.textContent};
    E.tick(s,2);field.sync(s);
    const saved=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
    return {warning,result:s.enemyTactic.result,partialCovers:s.relicEffects.partialCovers,
     fullInterceptions:s.relicEffects.intercepts,intent:intent.textContent,
     cue:document.querySelector('.combat-cue')?.textContent,
     savedResult:saved.enemyTactic.result,savedCue:saved.battleEvent?.type,
     savedCovers:saved.relicEffects.partialCovers};
   });
   assert.equal(coverView.warning.visible,true);
   assert.match(coverView.warning.text,/측면 조준/);
   assert.equal(coverView.result,'cover-step');
   assert.equal(coverView.partialCovers,1);
   assert.equal(coverView.fullInterceptions,0);
   assert.match(coverView.intent,/후열 절반 엄호/);
   assert.match(coverView.cue,/호위 계약서.*후열 공격 절반 엄호/);
   assert.equal(coverView.savedResult,'cover-step');
   assert.equal(coverView.savedCue,'cover-step');
   assert.equal(coverView.savedCovers,1);
   // New regular charging enemy must use the same always-visible field
   // renderer as elite telegraphs, even when the player has Archive open.
   const chargeView=await page.evaluate(()=>{
    const E=window.ExpeditionEngine,field=window.ExpeditionField;
    const s=E.newState(Date.now());
    s.stage=s.best=s.runBest=14;s.enemyHp=1e10;
    s.relics.shield=1;s.relics.swift=1;
    for(const a of s.actors){a.hp=E.actorMaxHp(s,a.id);a.progress=1;a.cooldown=100;}
    E.tick(s,3);field.sync(s);
    const intent=document.querySelector('.enemy-intent');
    const warning={visible:!intent.hidden,text:intent.textContent,kind:E.enemyKind(s.stage)};
    E.tick(s,2);field.sync(s);
    const result={visible:!intent.hidden,text:intent.textContent,braces:s.relicEffects.braces,
      event:document.querySelector('.combat-cue')?.textContent,
      guardProgress:s.actors[0].progress};
    return {warning,result};
   });
   assert.equal(chargeView.warning.kind,'charger');
   assert.equal(chargeView.warning.visible,true);
   assert.match(chargeView.warning.text,/돌격병 전열 돌진/);
   assert.equal(chargeView.result.visible,true);
   assert.match(chargeView.result.text,/철벽 진형/);
   assert.equal(chargeView.result.braces,1);
   assert.equal(chargeView.result.guardProgress,1);
   assert.match(chargeView.result.event,/철벽 진형/);
   assert.equal(await page.locator('#battleScreen').isVisible(),true);
   // First shield copy yields a smaller visible defense, not full auto-counter.
   const partialView=await page.evaluate(()=>{
    const E=window.ExpeditionEngine,field=window.ExpeditionField;
    const s=E.newState(Date.now());
    s.stage=s.best=s.runBest=14;s.enemyHp=1e10;s.battleCueSeq=1000;
    s.relics.shield=1;
    for(const a of s.actors){a.hp=E.actorMaxHp(s,a.id);a.progress=1;a.cooldown=100;}
    E.tick(s,5);field.sync(s);
    const intent=document.querySelector('.enemy-intent');
    const restored=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
    return {result:s.enemyTactic.result,partialBraces:s.relicEffects.partialBraces,
     fullBraces:s.relicEffects.braces,progress:s.actors[0].progress,
     text:intent.textContent,cue:document.querySelector('.combat-cue')?.textContent,
     savedEvent:restored.battleEvent?.type,savedCount:restored.relicEffects.partialBraces};
   });
   assert.equal(partialView.result,'brace-step');
   assert.equal(partialView.partialBraces,1);
   assert.equal(partialView.fullBraces,0);
   assert.equal(partialView.progress,.45);
   assert.match(partialView.text,/부분 버팀/);
   assert.match(partialView.cue,/합금 배지.*부분 버팀/);
   assert.equal(partialView.savedEvent,'brace-step');
   assert.equal(partialView.savedCount,1);
   // Live tactical warning and response, with the archive panel left open.
   const signalView=await page.evaluate(()=>{
    const E=window.ExpeditionEngine,field=window.ExpeditionField;
    const s=E.newState(Date.now());
    s.stage=s.best=s.runBest=16;s.enemyHp=1e10;
    s.relics.medkit=1;s.relics.relay=1;s.units.ranger=1;s.units.medic=1;
    s.actors.push({id:'ranger',hp:10000,revive:0,progress:1,cooldown:100,shots:0});
    s.actors.push({id:'medic',hp:10000,revive:0,progress:1,cooldown:100,shots:0});
    for(const a of s.actors){a.hp=10000;a.progress=1;a.cooldown=100;}
    E.tick(s,3);field.sync(s);
    const intent=document.querySelector('.enemy-intent');
    const warning={visible:!intent.hidden,text:intent.textContent,kind:E.enemyKind(s.stage)};
    E.tick(s,2);field.sync(s);
    const result={visible:!intent.hidden,text:intent.textContent,cleanses:s.relicEffects.cleanses,
      event:document.querySelector('.combat-cue')?.textContent};
    return {warning,result};
   });
   assert.equal(signalView.warning.kind,'disruptor');
   assert.equal(signalView.warning.visible,true);
   assert.match(signalView.warning.text,/교란 사수 원거리 조준/);
   assert.equal(signalView.result.visible,true);
   assert.match(signalView.result.text,/역통신 반격/);
   assert.equal(signalView.result.cleanses,1);
   assert.match(signalView.result.event,/역통신 반격/);
   assert.equal(await page.locator('#battleScreen').isVisible(),true);
   // First earned 55 collectible activates a visible second-phase boss cue.
   // The same encounter must keep the battle HUD uncluttered on portrait phones.
   const pursuitView=await page.evaluate(()=>{
    const E=window.ExpeditionEngine,field=window.ExpeditionField;
    const s=E.newState(Date.now());s.stage=s.best=s.runBest=60;
    s.enemyTactic.stage=60;s.relics.pursuit=1;
    s.enemyHp=E.enemyMax(60)*.5+1;
    for(const a of s.actors){a.hp=1e8;a.progress=1;a.cooldown=0;}
    E.tick(s,1);field.sync(s);
    const intent=document.querySelector('.enemy-intent');
    const persistentIntent={visible:!intent.hidden,text:intent.textContent};
    const saved=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
    field.sync(saved);
    return {cue:document.querySelector('.combat-cue')?.textContent,
     activated:s.enemyTactic.pursuitTriggered,boost:E.pursuitBoost(s),
     savedCue:saved.battleEvent?.type,savedBoost:E.pursuitBoost(saved),
     persistentIntent,restoredIntent:{visible:!intent.hidden,text:intent.textContent}};
   });
   // 65+ elite HP migration must preserve an ongoing browser save's
   // relative battle progress, and repeated reload must not shorten it again.
   const eliteMigration=await page.evaluate(()=>{
    const E=window.ExpeditionEngine;
    const old=E.newState(Date.now());old.stage=old.best=old.runBest=65;
    old.enemyHp=Math.round(E.enemyMax(65)*.5/.6);
    delete old.eliteHpBalanceVersion;
    const a=E.normalize(JSON.parse(JSON.stringify(old)),Date.now());
    const b=E.normalize(JSON.parse(JSON.stringify(a)),Date.now());
    const v1=E.newState(Date.now());v1.stage=v1.best=v1.runBest=65;
    v1.eliteHpBalanceVersion=1;
    v1.enemyHp=Math.round(E.enemyMax(65)*.5/.75);
    const c=E.normalize(JSON.parse(JSON.stringify(v1)),Date.now());
    const d=E.normalize(JSON.parse(JSON.stringify(c)),Date.now());
    return {ratio:a.enemyHp/E.enemyMax(65),stable:a.enemyHp===b.enemyHp,
     marker:a.eliteHpBalanceVersion,priorRatio:c.enemyHp/E.enemyMax(65),
     priorStable:c.enemyHp===d.enemyHp,priorMarker:c.eliteHpBalanceVersion};
   });
   assert.ok(Math.abs(eliteMigration.ratio-.5)<.00001);
   assert.equal(eliteMigration.stable,true);
   assert.equal(eliteMigration.marker,2);
   assert.ok(Math.abs(eliteMigration.priorRatio-.5)<.00001);
   assert.equal(eliteMigration.priorStable,true);
   assert.equal(eliteMigration.priorMarker,2);
   assert.equal(pursuitView.activated,true);
   assert.equal(pursuitView.boost,1.6);
   assert.match(pursuitView.cue,/추격 신호기/);
   assert.equal(pursuitView.savedCue,'pursuit');
   assert.equal(pursuitView.savedBoost,1.6);
   assert.equal(pursuitView.persistentIntent.visible,true);
   assert.match(pursuitView.persistentIntent.text,/추격 신호기 · 후반전 화력/);
   assert.deepEqual(pursuitView.restoredIntent,pursuitView.persistentIntent);
   // A depth65 elite now reuses the SAME earned pursuit clue and compact
   // tactical strip, with no new battle HUD buttons or forced action.
   const elite65View=await page.evaluate(()=>{
    const E=window.ExpeditionEngine,field=window.ExpeditionField;
    const s=E.newState(Date.now());s.stage=s.best=s.runBest=65;
    s.enemyTactic.stage=65;s.relics.pursuit=1;
    s.enemyHp=E.enemyMax(65)*.5+1;
    for(const a of s.actors){a.hp=1e8;a.progress=1;a.cooldown=0;}
    E.tick(s,1);field.sync(s);
    const intent=document.querySelector('.enemy-intent');
    const saved=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
    return {boost:E.pursuitBoost(s),trigger:s.enemyTactic.pursuitTriggered,
     cue:document.querySelector('.combat-cue')?.textContent,
     visible:!intent.hidden,details:intent.textContent,
     savedCue:saved.battleEvent?.type,savedBoost:E.pursuitBoost(saved)};
   });
   assert.equal(elite65View.boost,1.6);
   assert.equal(elite65View.trigger,true);
   assert.match(elite65View.cue,/추격 신호기/);
   assert.equal(elite65View.visible,true);
   assert.match(elite65View.details,/추격 신호기 · 후반전 화력/);
   assert.equal(elite65View.savedCue,'pursuit');
   assert.equal(elite65View.savedBoost,1.6);
   // A depth65 earned diagram shows one distinct strike at the NEXT
   // commander tier. It must still fit 360/390/412 portrait battle layouts.
   const diagramView=await page.evaluate(()=>{
    const E=window.ExpeditionEngine,field=window.ExpeditionField;
    const s=E.newState(Date.now());s.stage=s.best=s.runBest=70;
    s.enemyTactic.stage=70;s.enemyTactic.kind=E.enemyKind(70);
    s.relics.diagram=1;s.enemyHp=E.enemyMax(70)*.75+1;
    for(const a of s.actors){a.hp=1e8;a.progress=1;a.cooldown=0;}
    E.tick(s,1);
    // Independent synthetic battle fixtures can reuse small event sequence
    // numbers. Give this isolated preview a distinct number so the field's
    // real incremental-render guard does not suppress the next cue.
    s.battleCueSeq+=1000;s.battleEvent.seq=s.battleCueSeq;
    field.sync(s);
    const cue=document.querySelector('.combat-cue')?.textContent;
    const saved=E.normalize(JSON.parse(JSON.stringify(s)),Date.now());
    // A simultaneous guard retreat can replace the one-shot impact cue.
    // Its short-lived state must still be visible on the battlefield.
    s.battleEvent={seq:++s.battleCueSeq,type:'fallen',id:'guard',value:0};
    field.sync(s);
    const strip=document.querySelector('.enemy-intent');
    const retained={visible:!strip.hidden,text:strip.textContent};
    // A following enemy attack windup always overrides the retained notice.
    s.enemyTactic.phase='windup';s.enemyTactic.move='rush';s.enemyTactic.windup=1.5;
    field.sync(s);
    const warning={visible:!strip.hidden,text:strip.textContent};
    return {proc:s.relicEffects.diagrams,cue,retained,warning,
     flash:s.enemyTactic.diagramFlash,restoredFlash:saved.enemyTactic.diagramFlash,
     triggered:s.enemyTactic.diagramTriggered,
     persisted:saved.enemyTactic.diagramTriggered,
     savedCount:saved.relicEffects.diagrams,savedCue:saved.battleEvent?.type,
     damage:s.relicEffects.diagramDamage};
   });
   assert.equal(diagramView.proc,1);
   assert.equal(diagramView.triggered,true);
   assert.equal(diagramView.persisted,true);
   assert.equal(diagramView.savedCount,1);
   assert.equal(diagramView.savedCue,'diagram');
   assert.ok(diagramView.damage>0);
   assert.match(diagramView.cue,/전장 도해.*균열 타격/);
   assert.equal(diagramView.flash,4);
   assert.equal(diagramView.restoredFlash,4);
   assert.equal(diagramView.retained.visible,true);
   assert.match(diagramView.retained.text,/전장 도해.*균열 타격/);
   assert.equal(diagramView.warning.visible,true);
   assert.match(diagramView.warning.text,/지휘급 전열 압박/);
   assert.doesNotMatch(diagramView.warning.text,/전장 도해/);
   await assertBattleFrame('earned diagram cue at 70 boss');
   // At a real boss-only duplicate reward, generic DPS can remain 0%,
   // but each individual chest must explain the permanent conditional gain.
   if(width===390){
    const gainContext=await browser.newContext({viewport:{width,height:800},deviceScaleFactor:1});
    const gainPage=await gainContext.newPage();
    await gainPage.goto(url,{waitUntil:'networkidle'});
    const gainCatalog=require('../site/expedition-engine.js').RELICS
     .map(r=>({id:r.id,unlockStage:r.unlockStage,cap:r.cap}));
    await gainPage.addInitScript((catalog)=>{
     const key='neon_expedition_prototype_v1';
     const raw=localStorage.getItem(key);if(!raw)return;
     const s=JSON.parse(raw);
     // Init scripts execute before the engine script; pass the real catalog.
     for(const r of catalog)if(r.unlockStage<=25)s.relics[r.id]=r.cap;
     s.relics.boss=1;s.chests=2;s.chestDepths=[25,25];
     s.autoChest.enabled=false;s.lastSaved=Date.now();
     localStorage.setItem(key,JSON.stringify(s));
    },gainCatalog);
    await gainPage.reload({waitUntil:'networkidle'});
    await gainPage.locator('[data-tab="archive"]').click();
    assert.equal(await gainPage.locator('#openArchiveBatch').isVisible(),true);
    await gainPage.locator('#openArchiveBatch').click();
    assert.equal(await gainPage.locator('#popupResults .reward-effect').count(),2);
    const gainResults=await gainPage.locator('#popupResults .reward-effect').allTextContents();
    assert.match(gainResults[0],/지휘급 적 공격 보정 14% → 28%/);
    assert.match(gainResults[1],/지휘급 적 공격 보정 28% → 42%/);
    assert.match(await gainPage.locator('#popupImpact').textContent(),/조건부 효과는 유물별 표시/);
    const gainState=await gainPage.evaluate(()=>{
     const s=JSON.parse(localStorage.getItem('neon_expedition_prototype_v1'));
     return {chests:s.chests,boss:s.relics.boss,coreSpent:s.coreSpent};
    });
    assert.deepEqual(gainState,{chests:0,boss:3,coreSpent:0});
    assert.equal(await gainPage.locator('#battleScreen').isVisible(),true);
    const stackedVolleyCue=await gainPage.evaluate(()=>{
     const E=window.ExpeditionEngine,s=E.newState(1000);
     s.relics.archer=2;
     s.battleCueSeq=10001;
     s.battleEvent={seq:10001,type:'volley',id:'ranger',value:123};
     window.ExpeditionField.sync(s);
     return document.querySelector('.combat-cue')?.textContent;
    });
    assert.match(stackedVolleyCue,/정밀 사격 \+90% · -123/,
     'real third-shot feedback shows the extra damage of a second copy');
    // A mastered deep escort uses the real engine and retains its distinct
    // battle cue through a save round-trip. No additional field HUD is created.
    const duetField=await gainPage.evaluate(()=>{
     const E=window.ExpeditionEngine,s=E.newState(1000);
     s.stage=s.best=s.runBest=50;s.enemyHp=1e12;
     s.relics.guard=2;s.relics.archer=2;
     s.units.ranger=2;
     s.actors.push(...Array.from({length:2},()=>({
      id:'ranger',hp:1e8,revive:0,progress:1,cooldown:1e9,shots:0
     })));
     for(const a of s.actors){a.hp=1e8;a.progress=1;a.cooldown=1e9;}
     E.tick(s,5);
     window.ExpeditionField.sync(s);
     const restored=E.normalize(JSON.parse(JSON.stringify(s)),2000);
     return {duets:s.relicEffects.escortDuets,event:s.battleEvent?.type,
      cue:document.querySelector('.combat-cue')?.textContent,
      savedEvent:restored.battleEvent?.type};
    });
    assert.equal(duetField.duets,1);
    assert.equal(duetField.event,'intercept-duet');
    assert.equal(duetField.savedEvent,'intercept-duet');
    assert.match(duetField.cue,/호위 협공! 2인 연계/);
    assert.match(await gainPage.locator('#relicEffectSummary').textContent(),
     /호위 협공 0회.*준비 완료/);
    await gainContext.close();
   }
   // Actual 10-minute combat evidence is visible only in the detail tray.
   // Check reloaded state and user-triggered JSON export, without a fake HUD.
   if(width===390){
    const engagementContext=await browser.newContext({viewport:{width,height:800},deviceScaleFactor:1,acceptDownloads:true});
    const engagementPage=await engagementContext.newPage();
    await engagementPage.goto(url,{waitUntil:'networkidle'});
    await engagementPage.addInitScript(()=>{
     const key='neon_expedition_prototype_v1',raw=localStorage.getItem(key);
     // This reload fixture is installed for the current context's lifetime.
     // Only prepare it once, otherwise the later "16/16" reload is wiped.
     if(!raw||sessionStorage.getItem('__test_engagement_once')==='yes')return;
     sessionStorage.setItem('__test_engagement_once','yes');
     const state=JSON.parse(raw);
     state.stage=state.best=state.runBest=50;
     state.enemyHp=213787;state.lastSaved=Date.now();
     state.engagement={stage:50,seconds:645,autoBuyStart:7,legacyResume:false};
     state.autoBuy.purchases=12;
     state.longestEncounter={stage:40,seconds:550};
     state.longEngagements=3;
     // Both prerequisite kinds are known, but only 1/2 each so the
     // voluntary-return decision displays a truthful duplicate goal.
     state.relics.guard=1;state.relics.archer=1;
     state.runMetrics.firstRelicFinds=4;
     state.runMetrics.duplicateRelics=3;
     state.runMetrics.relicExchanges=2;
     state.relics.guard=1;state.relics.archer=1;
     localStorage.setItem(key,JSON.stringify(state));
    });
    await engagementPage.reload({waitUntil:'networkidle'});
    await engagementPage.locator('[data-tab="return"]').click();
    const report=await engagementPage.locator('#rebirthSummary').textContent();
    assert.match(report,/현재 적과 교전50거리 · 10분/);
    assert.match(report,/남음 · 자동 구매 5회/);
    assert.match(report,/1분 이상 교전 격파3회/);
    assert.match(report,/최장 격파 교전40거리 · 9분 10초/);
    assert.equal(await engagementPage.locator('#returnChoices .return-choice').count(),2,
     'return vs continue are separate notes in the existing detail tray');
    assert.equal(await engagementPage.locator('#battleScreen #returnChoices').count(),0,
     'battle HUD stays clear of return decisions');
    const choiceText=await engagementPage.locator('#returnChoices').textContent();
    assert.match(choiceText,/지금 귀환/);
    assert.match(choiceText,/계속 탐사/);
    assert.match(choiceText,/지금 귀환하면 이 적과의 교전 진행.*초기화돼/,
     'a long boss fight must explain the cost of returning now');
    assert.match(choiceText,/현재 50거리 교전 10분 이상 · 적 체력.*남음/,
     'engagement duration and remaining HP support the decision');
    assert.match(choiceText,/계속하면 이 적의 남은 체력과 성장 진행을 유지해/,
     'continuing must describe the preserved active-fight progress');
    assert.match(choiceText,/호위 계약서 1\/2 · 초점 조준기 1\/2/);
    assert.match(choiceText,/귀환 후에도 유물 보유 유지/);
    assert.match(choiceText,/귀환 후 다음 1회 강화 선택/);
    assert.match(choiceText,/미개봉 상자 없음/);
    assert.match(choiceText,/50거리 상자에서 새로운 유물군 개방/);
    const choiceProof=await engagementPage.evaluate(()=>{
     const raw=JSON.parse(localStorage.getItem('neon_expedition_prototype_v1'));
     const before=JSON.stringify(raw);
     const d=window.ExpeditionEngine.returnChoiceSnapshot(raw);
     return {untouched:JSON.stringify(raw)===before,available:d.returnCores,
      after:d.coresAfterReturn};
    });
    assert.equal(choiceProof.untouched,true,'read-only planning cannot spend currency');
    assert.ok(choiceProof.available>0);
    assert.ok(choiceProof.after>=choiceProof.available);

    const bounds=await engagementPage.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
    assert.ok(bounds.scroll<=bounds.width+1,'long-fight detail must not overflow on mobile');
    await engagementPage.locator('[data-tab="archive"]').click();
    assert.match(await engagementPage.locator('#milestoneSummary').textContent(),/55거리 정예/);
    assert.match(await engagementPage.locator('#milestoneSummary').textContent(),/60거리 보스/);
    const discoveryProgress=await engagementPage.locator('#relicCollectionProgress').textContent();
    assert.match(discoveryProgress,/이번 탐사 첫 발견 4종 \/ 중복 강화 3개 \/ 상한 교환 2상자/);
    const downloadEvent=engagementPage.waitForEvent('download');
    await engagementPage.locator('#exportPlaytest').click();
    const engagementExport=JSON.parse(fs.readFileSync(await (await downloadEvent).path(),'utf8'));
    assert.equal(engagementExport.currentRun.currentEngagement.stage,50);
    assert.ok(engagementExport.currentRun.currentEngagement.observedSeconds>=645);
    assert.equal(engagementExport.currentRun.currentEngagement.automaticPurchasesDuringFight,5);
    assert.deepEqual(engagementExport.currentRun.longestCompletedEngagement,{stage:40,seconds:550});
    assert.equal(engagementExport.currentRun.completedFightsOverOneMinute,3);
    assert.deepEqual(engagementExport.currentRun.relicDiscoveryThisRun,
     {first:4,duplicates:3,exchanges:2,partial:false});
    // Complete-catalog scenario is injected before engine startup, not via
    // live storage just before reload: the app's page-unload save can overwrite
    // a test-only localStorage mutation while the old in-memory run is active.
    const relicCatalog=require('../site/expedition-engine.js').RELICS.map(r=>({id:r.id,unlockStage:r.unlockStage}));
    await engagementPage.addInitScript((catalog)=>{
     const key='neon_expedition_prototype_v1',raw=localStorage.getItem(key);
     if(!raw)return;
     const state=JSON.parse(raw);
     for(const r of catalog)state.relics[r.id]=1;
     // All 16 kinds and both mastery stacks are specifically available.
     state.relics.guard=2;state.relics.archer=2;
     state.best=state.runBest=state.stage=Math.max(56,...catalog.map(r=>r.unlockStage+1));
     state.chests=2;state.chestDepths=[55,55];state.lastSaved=Date.now();
     localStorage.setItem(key,JSON.stringify(state));
    },relicCatalog);
    await engagementPage.reload({waitUntil:'networkidle'});
    await engagementPage.locator('[data-tab="return"]').click();
    const completedChoice=await engagementPage.locator('#returnChoices').textContent();
    assert.match(completedChoice,/현재 원형의 신규 종류 없음/);
    assert.match(completedChoice,/새 종류 후보 없음/);
    assert.match(completedChoice,/호위 협공 준비 완료/);
    await engagementPage.locator('[data-tab="archive"]').click();
    assert.match(await engagementPage.locator('#relicCollectionProgress').textContent(),/공개된 유물 종류 완성/);
    assert.equal(await engagementPage.locator('#relicList .relic.owned .next-effect').count(),
     require('../site/expedition-engine.js').RELICS.length,
     'every collected relic has a full-stack or next-copy archive label');
    assert.match(await engagementPage.locator('#relicList .next-effect').allTextContents().then(v=>v.join(' / ')),
     /고유 유물 수집 완료/);
    await engagementContext.close();
   }

   // Regression: after a 45-clear voluntary return, the low-level run stage
   // must NOT advertise relic tiers 15/25/40 as "new" a second time.
   const frontierContext=await browser.newContext({viewport:{width,height:800},deviceScaleFactor:1});
   const frontierPage=await frontierContext.newPage();
   await frontierPage.goto(url,{waitUntil:'networkidle'});
   await frontierPage.addInitScript(()=>{
    const key='neon_expedition_prototype_v1';
    const state=JSON.parse(localStorage.getItem(key));
    if(!state)return;
    state.best=46;state.runBest=1;state.stage=1;
    state.claimedBreakthroughDistance=45;state.rebirths=2;
    state.enemyHp=13;state.coreUpgrades.valor=3;
    state.heroLevel=8;state.traits.command=3;state.traits.supply=2;state.cores=11;
    state.relics.shield=1;state.relics.guard=1;
    state.relicEffects.guardPlateBlocks=12;state.lastSaved=Date.now();
    localStorage.setItem(key,JSON.stringify(state));
   });
   await frontierPage.reload({waitUntil:'networkidle'});
   await frontierPage.locator('[data-tab="return"]').click();
   const depthGoals=await frontierPage.locator('#rebirthSummary').textContent();
   assert.match(depthGoals,/아직 미개방 유물 등급3종 · 누적 최고 45거리 격파/,
    'legacy return depth 45 must offer chronicle unlock');
   assert.match(depthGoals,/다음 신규 유물 개방50거리 격파 · 원정 연대기/);
   const choiceAfterReturn=await frontierPage.locator('#returnChoices').textContent();
   assert.match(choiceAfterReturn,/현재 귀환 보상이 없어/);
   assert.match(choiceAfterReturn,/50거리 상자에서 새로운 유물군 개방/);
   assert.doesNotMatch(depthGoals,/15거리 격파 · 진군 북/,
    'return should never make a previously unlocked depth look new');
   // LV3 attack power shown accurately after a legacy save reload.
   assert.match(await frontierPage.locator('#coreSummary').textContent(),
    /전선 코어 화력 효과\+9\.0%/);
   // defensive guard formation archive readout is only in detailed tabs.
   await frontierPage.locator('[data-tab="archive"]').click();
   assert.match(await frontierPage.locator('#relicEffectSummary').textContent(),
    /심층 방벽 진형.*일격 방어 12회/);
   // Trait reallocation stays in the squad detail, never in battle.
   await frontierPage.locator('[data-tab="squad"]').click();
   assert.equal(await frontierPage.locator('#traitRespec').isDisabled(),false);
   assert.match(await frontierPage.locator('#heroSummary').textContent(),/미사용 특성 포인트2/);
   await frontierPage.locator('#traitRespec').click();
   assert.match(await frontierPage.locator('#heroSummary').textContent(),/미사용 특성 포인트7/);
   const respecResult=await frontierPage.evaluate(()=>{
    const stored=JSON.parse(localStorage.getItem('neon_expedition_prototype_v1'));
    const normalized=window.ExpeditionEngine.normalize(stored,Date.now());
    return {level:normalized.heroLevel,traits:normalized.traits,cores:normalized.cores,
     valor:normalized.coreUpgrades.valor,shield:window.ExpeditionEngine.relic(normalized,'shield'),
     guard:window.ExpeditionEngine.relic(normalized,'guard')};
   });
   assert.deepEqual(respecResult,{level:8,traits:{command:0,supply:0},cores:11,valor:3,shield:1,guard:1});
   await frontierPage.locator('#traitSupply').click();
   assert.match(await frontierPage.locator('#heroSummary').textContent(),/미사용 특성 포인트6/);
   assert.equal(await frontierPage.locator('#traitRespec').isDisabled(),false);
   const goalBounds=await frontierPage.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   assert.ok(goalBounds.scroll<=goalBounds.width+1,
    'next deep collectible goal portrait overflow: '+JSON.stringify(goalBounds));
   await frontierContext.close();
   await context.close();
   console.log('PASS expedition portrait',width,'recruit/relic/rebirth/save/overflow/milestone-comparison/chronicle');
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(err=>{console.error(err);server.close();process.exitCode=1;});
