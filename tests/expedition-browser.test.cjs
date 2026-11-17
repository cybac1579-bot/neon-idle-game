'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const site=path.resolve(__dirname,'../site');
const server=http.createServer((req,res)=>{
 const filename=decodeURIComponent((req.url||'/').split('?')[0].replace(/^\/+/,''));
 if(!['expedition.html','expedition-engine.js','expedition-app.js'].includes(filename)){res.writeHead(404);res.end();return;}
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
   assert.ok(await page.locator('#squad .unit').count()>=1);
   await page.locator('[data-tab="squad"]').click();
   assert.equal(await page.locator('#squadScreen').isVisible(),true);
   await page.locator('#hire').click();
   assert.equal(await page.locator('#hire').isVisible(),true);
   await page.locator('[data-tab="supply"]').click();
   assert.equal(await page.locator('#supplyScreen').isVisible(),true);
   await page.locator('[data-tab="archive"]').click();
   // Inject on the next document before expedition-app.js loads. Ordinary pagehide
   // saves the old game state; modifying storage immediately before reload loses the fixture.
   await page.addInitScript(()=>{
    const key='neon_expedition_prototype_v1',s=JSON.parse(localStorage.getItem(key));
    if(s){s.stage=10;s.best=10;s.runBest=10;s.enemyHp=100;s.chests=1;s.credits=5000;s.lastSaved=Date.now();localStorage.setItem(key,JSON.stringify(s));}
   });
   await page.reload({waitUntil:'networkidle'});
   await page.locator('[data-tab="archive"]').click();
   assert.equal(await page.locator('#openArchiveChest').isVisible(),true);
   await page.locator('#openArchiveChest').click();
   assert.equal(await page.locator('#relicPopup').isVisible(),true);
   await page.locator('#popupClose').click();
   assert.equal(await page.locator('#relicPopup').isVisible(),false);
   const savedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')));
   assert.equal(Object.values(savedBefore.relics).reduce((a,b)=>a+b,0),1);
   page.on('dialog',d=>d.accept());
   await page.locator('#rebirth').click();
   assert.equal(await page.locator('#battleScreen').isVisible(),true);
   const savedAfter=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_expedition_prototype_v1')));
   assert.equal(savedAfter.stage,1);
   assert.equal(Object.values(savedAfter.relics).reduce((a,b)=>a+b,0),1);
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
