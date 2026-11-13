// Verify the exact packaged output, not source site/, on a real HTTP origin.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const root=path.resolve(__dirname,'../dist/neon-idle');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
(async()=>{
 const server=http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);res.end();return}
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  fs.readFile(file,(err,body)=>{
   if(err){res.writeHead(404);res.end();return}
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(body);
  });
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const origin='http://127.0.0.1:'+server.address().port;
  for(const width of [360,412]){
   const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:2,isMobile:true,hasTouch:true});
   const errors=[];
   page.on('pageerror',e=>errors.push('JS '+e.message));
   page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push('HTTP '+r.status()+' '+r.url())});
   await page.goto(origin+'/index.html');
   assert.equal(await page.evaluate(()=>typeof s),'object','packaged game initialized');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'no horizontal overflow');
   const manifest=await (await page.request.get(origin+'/manifest.webmanifest')).json();
   assert.equal(manifest.display,'standalone');
   assert.equal(manifest.orientation,'portrait');
   assert.deepEqual(manifest.icons.map(x=>x.sizes),['192x192','512x512']);
   for(const icon of manifest.icons){
    const response=await page.request.get(new URL(icon.src,origin+'/index.html').href);
    assert.equal(response.status(),200,'packaged icon HTTP 200');
    assert.match(response.headers()['content-type'],/image\/png/);
    const png=await response.body();
    const size=Number.parseInt(icon.sizes,10);
    assert.equal(png.readUInt32BE(16),size,'PNG width');
    assert.equal(png.readUInt32BE(20),size,'PNG height');
   }
   await page.locator('[data-view="growth"]').click();
   await page.locator('#upgrades [data-buy="atk"]').click();
   assert.equal(await page.evaluate(()=>s.atk),1,'packaged first purchase');
   await page.evaluate(()=>save());
   await page.reload();
   assert.equal(await page.evaluate(()=>s.atk),1,'packaged save/reload');
   await page.locator('[data-view="deep"]').click();
   assert.ok(await page.locator('#deepFloor').isVisible(),'packaged dungeon view');
   assert.deepEqual(errors,[],'packaged browser JS and HTTP errors');
   await page.close();
   console.log('Packaged HTTP browser smoke passed at '+width+'px');
  }
  // Android Chrome-like context: device UA, touch, DPR and mobile viewport.
  // This is emulation, not a physical Galaxy or an actual APK installation.
  const android=await browser.newContext({
   viewport:{width:412,height:915},deviceScaleFactor:2.625,isMobile:true,hasTouch:true,
   userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
  });
  try{
   const page=await android.newPage();
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/index.html');
   assert.match(await page.evaluate(()=>navigator.userAgent),/Android/,'Android mobile UA');
   assert.equal(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches),true,'touch pointer');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Android mobile layout fits');
   await page.locator('[data-view="growth"]').tap();
   await page.locator('#upgrades [data-buy="atk"]').tap();
   assert.equal(await page.evaluate(()=>s.atk),1,'Android emulation touch purchase');
   await page.goto(origin+'/index.html'); // triggers pagehide and reload-like navigation
   assert.equal(await page.evaluate(()=>s.atk),1,'Android navigation retains purchase');
   await page.locator('[data-view="deep"]').tap();
   assert.ok(await page.locator('#deepFloor').isVisible(),'Android touch dungeon navigation');
   assert.deepEqual(errors,[],'Android emulation no JS exceptions');
   await page.close();
   console.log('Packaged Android mobile emulation touch and pagehide save passed');
  }finally{await android.close()}
 }finally{
  if(browser)await browser.close();
  await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
 }
})().catch(err=>{console.error(err);process.exitCode=1});
