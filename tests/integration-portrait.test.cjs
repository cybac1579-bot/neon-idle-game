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
   for(const view of ['growth','reset','stats','battle']){
    await page.locator('[data-view="'+view+'"]').first().click();
    assert.ok(await page.locator('[data-screen="'+view+'"]:not(.view-hidden)').count()>0,'navigation failed '+view);
   }
   // Persistence smoke: the existing save button must create a readable state,
   // and a fresh document load must restore it without runtime errors.
   await page.locator('#save').click();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_rework_07')||'null'));
   assert.ok(saved&&Number.isFinite(saved.credits)&&Number.isFinite(saved.stage),'save state missing at '+width);
   assert.ok(saved.stage>=1&&saved.credits>=0,'invalid saved progression at '+width);
   await page.reload({waitUntil:'load'});
   await page.waitForFunction(()=>document.querySelector('#stage')?.textContent?.trim().length>0,null,{timeout:12000});
   const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon_rework_07')||'null'));
   assert.ok(restored&&restored.best>=saved.best&&restored.rebirths===saved.rebirths,'save restoration failed at '+width);
   assert.deepEqual(errors,[],'browser errors after save/reload at '+width);
   console.log('PASS portrait + save/reload '+width,JSON.stringify(layout));
   await page.close();
  }
 }catch(e){console.error(e);process.exitCode=1}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})();
