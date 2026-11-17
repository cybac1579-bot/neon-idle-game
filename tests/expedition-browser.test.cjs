'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const site=path.resolve(__dirname,'../site');
const server=http.createServer((req,res)=>{
 const filename=decodeURIComponent((req.url||'/').split('?')[0].replace(/^\/+/,''));
 if(!['expedition.html','expedition-engine.js','expedition-app.js','expedition-field.js'].includes(filename)){res.writeHead(404);res.end();return;}
 const name=path.join(site,filename);
 res.writeHead(200,{'Content-Type':filename.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8'});
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
   assert.ok(await page.locator('#squad .fighter').count()>=2);
   const firstActor=await page.locator('#squad .fighter').first().getAttribute('style');
   await page.waitForTimeout(500);
   const movedActor=await page.locator('#squad .fighter').first().getAttribute('style');
   assert.notEqual(firstActor,movedActor,'fighter must advance visibly with engine state');
   assert.ok(await page.locator('#squad .fighter-health').count()>=2);
   await page.locator('[data-tab="squad"]').click();
   assert.equal(await page.locator('#squadScreen').isVisible(),true);
   assert.match(await page.locator('#buyCountSquad').textContent(),/최대 5회/);
   await page.locator('#hire').click();
   assert.equal(await page.locator('#hire').isVisible(),true);
   assert.ok(await page.locator('#roleContribution').textContent());
   assert.equal(await page.locator('#autoMode').inputValue(),'balanced');
   assert.equal(await page.locator('#autoToggle').getAttribute('aria-pressed'),'false');
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
   assert.equal(await page.locator('#openArchiveChest').isVisible(),true);
   assert.equal(await page.locator('#openArchiveBatch').isVisible(),true);
   assert.match(await page.locator('#relicCollectionProgress').textContent(),/미개봉 4상자/);
   assert.equal(await page.locator('#relicList .relic').count(),15,'new tier relics appear in the collection archive');
   assert.match(await page.locator('#milestoneSummary').textContent(),/10거리 보스/);
   const awaiting=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')));
   assert.equal(awaiting.chests,4,'chests remain unopened until explicitly clicked');
   await page.locator('#openArchiveChest').click();
   assert.equal(await page.locator('#relicPopup').isVisible(),true);
   assert.equal(await page.locator('#popupResults .reward-item').count(),1);
   await page.locator('#popupClose').click();
   assert.equal(await page.locator('#relicPopup').isVisible(),false);
   assert.match(await page.locator('#openArchiveBatch').textContent(),/3개 함께 열기/);
   await page.locator('#openArchiveBatch').click();
   assert.equal(await page.locator('#relicPopup').isVisible(),true);
   assert.equal(await page.locator('#popupResults .reward-item').count(),3);
   assert.match(await page.locator('#popupTitle').textContent(),/3개 상자 개봉/);
   assert.match(await page.locator('#popupImpact').textContent(),/영구 효과 변화/);
   await page.locator('#popupClose').click();
   assert.equal(await page.locator('#relicPopup').isVisible(),false);
   assert.equal(await page.locator('#relicRecent .collection-log').count(),4);
   assert.equal(await page.locator('#openArchiveBatch').isVisible(),false);
   assert.match(await page.locator('#permanentBonusSummary').textContent(),/영구 성장 효과/);
   assert.match(await page.locator('#permanentBonusSummary').textContent(),/용병 소집 비용 절약/);
   const savedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')));
   assert.equal(Object.values(savedBefore.relics).reduce((a,b)=>a+b,0),4);
   assert.equal(savedBefore.relicHistory.length,4);
   assert.equal(savedBefore.runMetrics.chestsOpened,4);
   page.on('dialog',d=>d.accept());
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
   assert.equal(await page.locator('#archiveScreen').isVisible(),true);
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
   await page.locator('[data-tab="archive"]').click();
   assert.equal(await page.locator('#returnReportPanel').isVisible(),true,'return report survives an actual browser reload');
   const restoredReport=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')).latestReturn);
   assert.deepEqual(restoredReport,savedAfter.latestReturn,'saved results must stay unchanged after reload');
   assert.match(await page.locator('#returnReportContent').textContent(),/기본 부대 화력/);
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
   assert.equal(typeof payload.currentRun.milestoneClears,'object');
   assert.equal(payload.minuteSnapshots.length,1);
   assert.equal(payload.minuteSnapshots[0].stage,7);
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
   await page.locator('[data-tab="archive"]').click();
   assert.match(await page.locator('#permanentBonusSummary').textContent(),/원정 연대기 수집 효과/);
   assert.match(await page.locator('#permanentBonusSummary').textContent(),/피해량 \+\d+%/);
   const chronicleBounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   assert.ok(chronicleBounds.scroll<=chronicleBounds.width+1,
    'chronicle archive horizontal overflow: '+JSON.stringify(chronicleBounds));
   await context.close();
   console.log('PASS expedition portrait',width,'recruit/relic/rebirth/save/overflow/milestone-comparison/chronicle');
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(err=>{console.error(err);server.close();process.exitCode=1;});
