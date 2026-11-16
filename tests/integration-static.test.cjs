'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('site/index.html','utf8');
const js=fs.readFileSync('site/game.js','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const refs=[...js.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
const tests=[
 ['game JavaScript parses',()=>new vm.Script(js)],
 ['portrait browser regression file parses before Chromium setup',()=>{
   new vm.Script(fs.readFileSync('tests/integration-portrait.test.cjs','utf8'),{filename:'tests/integration-portrait.test.cjs'});
 }],
 ['inline navigation parses',()=>{for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1])}],
 ['unique DOM IDs',()=>assert.equal(new Set(ids).size,ids.length)],
 ['game DOM bindings exist',()=>assert.deepEqual([...new Set(refs)].filter(x=>!ids.includes(x)),[])],
 ['four existing navigation tabs',()=>assert.deepEqual([...html.matchAll(/<button data-view="([^"]+)"/g)].map(x=>x[1]),['battle','growth','reset','stats'])],
 ['save button is inside stats screen',()=>{
   const save=html.indexOf('id="save"');
   const stats=html.lastIndexOf('<section data-screen="stats"',save);
   const sectionEnd=html.indexOf('</section>',stats);
   assert.ok(save>=0&&stats>=0&&save<sectionEnd,'save must be inside a stats section');
 }],
 ['browser smoke opens stats immediately before save',()=>{
   const smoke=fs.readFileSync('tests/integration-portrait.test.cjs','utf8');
   const save=smoke.indexOf("await page.locator('#save').click()");
   const stats=smoke.lastIndexOf(`await page.locator('[data-view="stats"]').first().click()`,save);
   assert.ok(save>=0&&stats>=0&&stats<save,'save click must follow stats navigation');
 }],
 ['batch purchase mode is accessible without changing save schema',()=>{assert.match(html,/id="batchPurchase"[^>]*aria-pressed="false"/);assert.match(js,/button\.setAttribute\('aria-pressed',String\(batchPurchaseCount===3\)\)/);assert.match(js,/button\.setAttribute\('aria-label','강화 구매 '/);assert.match(js,/batchPurchaseCount=1/)}],
 ['batch purchase copy distinguishes maximum from guaranteed purchases',()=>{assert.match(js,/batchPurchaseCount===3\?'최대 3회':'1회'/);assert.match(html,/1회 \/ 최대 3회 선택/);assert.match(html,/한 번 클릭하면 선택한 강화 1종만 최대 3단계까지 연속 구매해/)}],
 ['STAGE75 optional reward and lean combat HUD preserve source/state boundaries',()=>{
   assert.match(html,/id="breakthroughPanel"/);
   assert.match(html,/data-breakthrough="weapon"/);
   assert.match(html,/data-breakthrough="skill"/);
   assert.match(html,/data-breakthrough="credits"/);
   assert.match(html,/id="heroDetails"/);
   assert.match(html,/id="heroStats"/);
   assert.match(js,/breakthroughReward:null/);
   assert.match(js,/function chooseBreakthroughReward/);
   assert.match(js,/s\.breakthroughReward=null/);
   assert.doesNotMatch(js,/스킬 구현 전 효과 대기/);
 }],
 ['optional Lv2 quest claim toggle retains manual quest rewards',()=>{
   assert.match(html,/id="autoClaimQuests" disabled/);
   assert.match(html,/연구 Lv\.2 해금 · 30초마다/);
   assert.match(js,/autoClaimQuests:false,autoClaimClock:0/);
   assert.match(js,/function autoQuestClaimTick\(dt\)/);
   assert.match(js,/if\(!s\.autoClaimQuests\|\|s\.autoLevel<2\)return 0/);
   assert.match(js,/return transferCacheCredits\(\)/);
   assert.match(js,/\$\('autoClaimQuests'\)\.onchange=/);
 }],
 ['STAGE85 resonance uses equipped skill + weapon tier without adding controls or save keys',()=>{
   assert.match(html,/id="resonanceInfo" aria-live="off"/);
   assert.match(js,/const RESONANCE_UNLOCK_STAGE=85/);
   assert.match(js,/weaponScore\(candidate\)>weaponScore\(s\.weapon\)/);
   assert.match(js,/function resonanceBonus\(id\)/);
   assert.match(js,/function resonanceStatus\(\)/);
   assert.match(js,/s\.skillsEquipped\.includes\(id\)/);
   assert.match(js,/\$\('resonanceInfo'\)\.textContent=resonanceStatus\(\)/);
   assert.doesNotMatch(html,/data-view="resonance"/,'must reuse existing growth tab');
 }],
 ['milestone goals accurately identify existing strategic choices',()=>{assert.match(js,/next===55\?'전선 배분 선택/);assert.match(js,/next===75\?'후반 보급 선택/);assert.match(js,/function chooseBreakthroughReward/);assert.match(js,/function renderFrontlineSupport/)}],
 ['original save key',()=>assert.match(js,/const KEY='neon_rework_07'/)],
 ['save and load storage',()=>{assert.match(js,/localStorage\.getItem\(KEY\)/);assert.match(js,/localStorage\.setItem\(KEY/)}],
 ['offline simulation excludes automatic rebirth',()=>assert.match(js,/step\(dt,false\)/)],
 ['reconstruction and auto-buy state retained',()=>{assert.match(js,/rebirths:0/);assert.match(js,/autoBuy:false/)}],
 ['existing battle images retained',()=>{assert.match(html,/src="seha_portrait\.webp"/);assert.match(html,/id="enemyImage"/)}],
 ['portrait CSS transplant present',()=>assert.match(html,/Integration v1: visual-only portrait combat hierarchy/)],
 ['no cross-project D-day or quest panel',()=>assert.doesNotMatch(html,/D-1 다음 사건|카페 실종 사건/)]
];
let fail=0;for(const [name,fn] of tests){try{fn();console.log('PASS',name)}catch(e){fail++;console.error('FAIL',name,e.message)}}
console.log(tests.length-fail+'/'+tests.length);if(fail)process.exitCode=1;
