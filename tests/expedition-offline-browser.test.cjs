'use strict';
// Launch the generated one-file HTML from file:// with network disabled.
// This proves desktop Chromium behavior, not a physical Galaxy S25+ test.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const packaged=path.resolve(__dirname,'../artifacts/expedition-standalone/neon-expedition-offline.html');
async function main(){
 assert.ok(fs.existsSync(packaged),'build the offline HTML first');
 const file=fs.readFileSync(packaged,'utf8');
 assert.ok(file.includes('data-inline-source="expedition-engine.js"'));
 assert.ok(file.includes('data-inline-source="expedition-field.js"'));
 assert.ok(file.includes('data-inline-source="expedition-app.js"'));
 assert.ok(!/<script[^>]+src=/.test(file),'no script network dependency');
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
   assert.match(await page.locator('footer').textContent(),/오프라인 단일 HTML/);
   await page.locator('[data-tab="archive"]').click();
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
   assert.deepEqual(requests,[],'network must not be requested by the standalone build');
   assert.deepEqual(errors,[],'browser runtime errors');
   console.log('PASS standalone file:// offline',width,'export/import/reload/network=0');
   await ctx.close();
  }
 }finally{await browser.close();}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
