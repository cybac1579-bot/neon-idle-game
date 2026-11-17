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
   const context=await browser.newContext({viewport:{width,height:800},deviceScaleFactor:1});
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
    if(s){
     s.stage=10;s.best=10;s.runBest=10;s.enemyHp=100;s.chests=1;s.credits=5000;s.lastSaved=Date.now();
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
   await page.locator('#openArchiveChest').click();
   assert.equal(await page.locator('#relicPopup').isVisible(),true);
   await page.locator('#popupClose').click();
   assert.equal(await page.locator('#relicPopup').isVisible(),false);
   assert.match(await page.locator('#permanentBonusSummary').textContent(),/영구 성장 효과/);
   const savedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')));
   assert.equal(Object.values(savedBefore.relics).reduce((a,b)=>a+b,0),1);
   page.on('dialog',d=>d.accept());
   await page.locator('#rebirth').click();
   assert.equal(await page.locator('#battleScreen').isVisible(),true);
   const savedAfter=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')));
   assert.equal(savedAfter.stage,1);
   assert.equal(Object.values(savedAfter.relics).reduce((a,b)=>a+b,0),1);
   assert.equal(savedAfter.autoBuy.mode,'recruit');
   assert.equal(savedAfter.autoBuy.enabled,false);
   assert.equal(savedAfter.autoBuy.purchases,0);
   assert.equal(await page.evaluate(()=>localStorage.getItem('neon_rework_07')),null);
   const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
   assert.ok(bounds.scroll<=bounds.width+1,'mobile horizontal overflow: '+JSON.stringify(bounds));
   assert.deepEqual(errors,[],'browser runtime errors '+width);
   if(width===390){fs.mkdirSync('artifacts/expedition',{recursive:true});await page.screenshot({path:'artifacts/expedition/expedition-390.png',fullPage:true});}
   await context.close();
   console.log('PASS expedition portrait',width,'recruit/relic/rebirth/save/overflow');
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(err=>{console.error(err);server.close();process.exitCode=1;});
