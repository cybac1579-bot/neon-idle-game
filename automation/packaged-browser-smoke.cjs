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
  // Simulate GitHub Pages project hosting at /neon-idle-game/ as well as root hosting.
  const mapped=pathname.startsWith('/neon-idle-game/')?pathname.slice('/neon-idle-game'.length):pathname;
  const file=path.resolve(root,'.'+mapped);
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
   // Interactive usability gate: no clipped visible controls, minimum touch targets,
   // and exactly one visible panel group after each tab selection.
   const audit=async label=>{
    const result=await page.evaluate(()=>{
     const visible=el=>{const r=el.getBoundingClientRect(),style=getComputedStyle(el);return style.display!=='none'&&style.visibility!=='hidden'&&r.width>0&&r.height>0&&!!el.getClientRects().length};
     const controls=[...document.querySelectorAll('button,[role="button"]')].filter(visible);
     const clipped=controls.filter(el=>{const r=el.getBoundingClientRect();return r.left < -1||r.right>innerWidth+1}).map(el=>el.id||el.textContent.trim().slice(0,35));
     const tiny=controls.filter(el=>{const r=el.getBoundingClientRect();return r.height<40||r.width<40}).map(el=>({id:el.id||el.textContent.trim().slice(0,25),height:Math.round(el.getBoundingClientRect().height)}));
     return {clipped,tiny,controls:controls.length,overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    assert.equal(result.overflow,false,label+' horizontal overflow');
    assert.deepEqual(result.clipped,[],label+' clipped controls');
    assert.deepEqual(result.tiny,[],label+' undersized touch controls');
    assert.ok(result.controls>=5,label+' interactive controls visible');
   };
   await audit('battle '+width);
   // Check every player-facing tab, not only battle and dungeon. Switching tabs
   // must expose the requested screen and leave all visible controls reachable.
   for(const view of ['growth','reset','deep','stats','battle']){
    await page.locator('[data-view="'+view+'"]').click();
    assert.equal(await page.locator('[data-view="'+view+'"]').getAttribute('aria-pressed'),'true',view+' tab selected');
    assert.ok(await page.locator('[data-screen="'+view+'"]:visible').count()>0,view+' screen visible');
    assert.equal(await page.locator('[data-screen]:visible:not([data-screen="'+view+'"])').count(),0,view+' must hide other tabs');
    await audit(view+' '+width);
    // Keep review evidence for every player-facing tab, not only battle/deep.
    const screenshotDir=path.resolve(__dirname,'../dist/preview-screenshots');
    fs.mkdirSync(screenshotDir,{recursive:true});
    await page.screenshot({path:path.join(screenshotDir,view+'-'+width+'.png'),fullPage:true});
   }
   // CI visual evidence of the exact distribution at both portrait sizes.
   const screenshots=path.resolve(__dirname,'../dist/preview-screenshots');
   fs.mkdirSync(screenshots,{recursive:true});
   // Battle screenshot already captured during the five-tab audit above.
   await page.locator('[data-view="growth"]').click();
   await page.locator('#upgrades [data-buy="atk"]').click();
   assert.equal(await page.evaluate(()=>s.atk),1,'packaged first purchase');
   await page.evaluate(()=>save());
   await page.reload();
   assert.equal(await page.evaluate(()=>s.atk),1,'packaged save/reload');
   await page.locator('[data-view="deep"]').click();
   await audit('deep '+width);
   assert.ok(await page.locator('#deepFloor').isVisible(),'packaged dungeon view');
   // Deep screenshot already captured before the purchase/reload smoke above.
   // Validate visual artifacts before CI publishes them for review.
   for(const view of ['battle','growth','reset','deep','stats']){
    const filename=path.join(screenshots,view+'-'+width+'.png');
    const png=fs.readFileSync(filename);
    assert.ok(png.length>1000,'nonempty screenshot '+view+' '+width);
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG screenshot signature');
    assert.equal(png.readUInt32BE(16),width*2,'screenshot pixel width matches viewport times deviceScaleFactor');
    assert.ok(png.readUInt32BE(20)>=850*2,'full-page screenshot pixel height');
   }
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
  // Project-site subdirectory hosting must not break relative game assets, icons or saves.
  const nested=await browser.newPage({viewport:{width:412,height:915},isMobile:true,hasTouch:true});
  try{
   const failures=[];
   nested.on('pageerror',e=>failures.push('JS '+e.message));
   nested.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))failures.push('HTTP '+r.status()+' '+r.url())});
   const base=origin+'/neon-idle-game/';
   await nested.goto(base+'index.html');
   assert.equal(await nested.evaluate(()=>typeof s),'object','nested deployment starts');
   assert.equal(await nested.locator('link[rel="manifest"]').getAttribute('href'),'manifest.webmanifest');
   const nestedManifest=await (await nested.request.get(base+'manifest.webmanifest')).json();
   assert.equal(new URL(nestedManifest.start_url,base).href,base+'index.html','manifest start URL stays in project path');
   assert.equal(new URL(nestedManifest.scope,base).href,base,'manifest scope stays in project path');
   for(const icon of nestedManifest.icons){
    const response=await nested.request.get(new URL(icon.src,base).href);
    assert.equal(response.status(),200,'nested icon reachable');
   }
   await nested.locator('[data-view="growth"]').click();
   await nested.locator('#upgrades [data-buy="atk"]').click();
   assert.equal(await nested.evaluate(()=>s.atk),1,'nested deployment purchase');
   await nested.evaluate(()=>save());
   await nested.reload();
   assert.equal(await nested.evaluate(()=>s.atk),1,'nested deployment saved progress');
   assert.deepEqual(failures,[],'nested deployment assets and scripts');
   console.log('Packaged nested-path static hosting smoke passed');
  }finally{await nested.close()}
  // Browser-process restart with the same persistent profile, rather than a simple reload.
  // Models the common Android Chrome close/reopen path (not OS force-stop or storage eviction).
  const os=require('node:os');
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'neon-idle-profile-'));
  let persistent;
  try{
   const config={headless:true,viewport:{width:412,height:915},deviceScaleFactor:2.625,isMobile:true,hasTouch:true,args:['--no-sandbox']};
   persistent=await chromium.launchPersistentContext(profile,config);
   let page=persistent.pages()[0]||await persistent.newPage();
   await page.goto(origin+'/index.html');
   await page.locator('[data-view="growth"]').tap();
   await page.locator('#upgrades [data-buy="atk"]').tap();
   assert.equal(await page.evaluate(()=>s.atk),1,'persistent profile initial upgrade');
   await page.evaluate(()=>save());
   const saved=await page.evaluate(()=>({atk:s.atk,credits:s.credits,stage:s.stage}));
   await persistent.close();
   persistent=null;
   persistent=await chromium.launchPersistentContext(profile,config);
   page=persistent.pages()[0]||await persistent.newPage();
   await page.goto(origin+'/index.html');
   const restored=await page.evaluate(()=>({atk:s.atk,credits:s.credits,stage:s.stage}));
   assert.equal(restored.atk,saved.atk,'browser restart retains upgrade');
   assert.ok(restored.credits>=saved.credits,'browser restart retains and may settle idle credits');
   assert.ok(restored.stage>=saved.stage,'browser restart retains stage');
   console.log('Packaged browser profile close/reopen persistent save passed');
  }finally{
   if(persistent)await persistent.close();
   fs.rmSync(profile,{recursive:true,force:true});
  }
 }finally{
  if(browser)await browser.close();
  await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));
 }
})().catch(err=>{console.error(err);process.exitCode=1});
