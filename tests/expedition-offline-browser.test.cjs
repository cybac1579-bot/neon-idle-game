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
  assert.equal(Object.values(blockedBackup.state.units).reduce((a,b)=>a+b,0),3,
   'failed local save must never prevent export of the new recruitment');
  assert.equal(blockedBackup.state.credits<65,true);
  assert.equal(await blockedPage.locator('#archiveScreen [data-storage-warning]').isVisible(),true);
  assert.equal(await blockedPage.evaluate(()=>localStorage.getItem('neon_expedition_prototype_v1')),null,
   'failed storage cannot be reported as a successful persisted save');
  assert.deepEqual(blockedErrors,[],'storage failure should not crash the browser');
  await blocked.close();
  console.log('PASS standalone file:// storage-denied warning, continued growth and fresh JSON backup');
 }finally{await browser.close();}
}
main().catch(err=>{console.error(err);process.exitCode=1;});
