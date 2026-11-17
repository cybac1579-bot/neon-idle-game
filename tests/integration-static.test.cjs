'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('site/index.html','utf8');
const js=fs.readFileSync('site/game.js','utf8');
const playtest=fs.readFileSync('site/playtest.js','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const refs=[...js.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
const tests=[
 ['game JavaScript parses',()=>new vm.Script(js)],
 ['local telemetry JavaScript parses',()=>new vm.Script(playtest)],
 ['playtest metrics remain local-only, bounded and export explicitly to JSON',()=>{
  assert.match(html,/<script src="game\.js"><\/script><script src="playtest\.js"><\/script>/);
  for(const id of ['playtestStatus','playtestExport','playtestClear','playtestExportStatus'])
   assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(playtest,/const KEY='neon_playtest_log_v1'/);
  assert.match(playtest,/MAX_EVENTS=1200/);
  assert.match(playtest,/localStorage\.setItem\(KEY,JSON\.stringify\(log\)\)/);
  assert.match(playtest,/new Blob\(\[JSON\.stringify\(exportData\(\),null,2\)\]/);
  assert.doesNotMatch(playtest,/\b(fetch|sendBeacon|XMLHttpRequest|WebSocket)\s*\(/);
  assert.doesNotMatch(js,/neon_playtest_log_v1/,'game save and telemetry are independent');
  assert.doesNotMatch(html,/data-view="playtest"/,'do not add a navigation tab');
 }],
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
 ['STAGE55 allocation controls have visible kill-income tradeoffs but no separate mechanics tab',()=>{
   assert.match(js,/const ALLOCATION_MULTIPLIERS=\{balanced:\[1,1,1\],assault:\[2\.2,\.75,\.8\],supply:\[\.8,2\.5,1\.5\]\}/);
   assert.match(js,/enemyReward\(s\.stage\)[^\n]*allocationEffects\(\)\[2\]/);
   assert.match(js,/처치 크레딧 ×/);
   assert.match(html,/data-allocation="balanced"/);
   assert.match(html,/data-allocation="assault"/);
   assert.match(html,/data-allocation="supply"/);
   assert.doesNotMatch(html,/data-view="allocation"/);
 }],
 ['research-level automatic purchases grow gradually rather than burst 11+ purchases at LV1',()=>{
   assert.match(js,/const autoPurchaseLimit=\(\)=>\[0,1,1,2,3,5\]/);
   assert.match(js,/while\(attempts\+\+<autoPurchaseLimit\(\)\)/);
   assert.doesNotMatch(js,/3\+s\.autoLevel\*8/,'old 11+ per-tick buy budget must not reappear');
   assert.match(js,/\[30,10,8,6,4,3\]/,'existing research-based purchase interval must be preserved');
 }],
 ['STAGE65 grants fifth stored-energy skill with no new button or currency',()=>{
   assert.match(js,/capacitor:\['전력 순환'/);
   assert.match(js,/function grantStage65Skill\(\)/);
   assert.match(js,/if\(previousStage<35&&s\.stage>=35\)grantStage35Support\(\);grantStage65Skill\(\)/);
   assert.match(js,/id==='capacitor'&&s\.stage<65/);
   assert.match(js,/s\.skillBuffCapacitor=safeNumber\(s\.skillBuffCapacitor,0,10\)/);
   assert.match(js,/const capacitorPowerBonus=/);
   assert.match(js,/s\.skillBuffCapacitor=10/);
   assert.match(js,/s\.skillBuffBounty=s\.skillBuffTraining=s\.skillBuffCapacitor=0/);
   assert.doesNotMatch(html,/data-view="capacitor"/,'reuses the existing growth screen');
 }],
 ['STAGE35 skill catch-up and quick quest reserve improve first 30-minute pacing',()=>{assert.match(js,/function grantStage35Support\(\)/);assert.match(js,/STAGE35_EARLY_PARTNERS/);assert.match(js,/q\[4\]/);assert.match(js,/\['긴급 배송',6,1,3,10\]/);}],
 ['late first-skill selection receives the missed STAGE35 support once',()=>{assert.match(js,/function chooseSkill\(id\)\{[^\n]*s\.skillChoiceUsed=true;if\(s\.stage>=35\)grantStage35Support\(\)/);assert.match(js,/if\(s\.skillsOwned\.length===1\)/);assert.match(js,/if\(previousStage<35&&s\.stage>=35\)grantStage35Support\(\)/);}],
 ['STAGE35 delayed-choice runtime: one partner, no repeat, early path unchanged',()=>{
   // Execute the production functions, not a reimplementation of their decisions.
   const extract=(name)=>{
     const start=js.indexOf('function '+name+'(');
     assert.ok(start>=0,'missing '+name);
     const end=js.indexOf('\nfunction ',start+1);
     assert.ok(end>start,'function boundary missing for '+name);
     return js.slice(start,end);
   };
   for(const stage of [20,35,40])for(const [first,partner] of Object.entries({chain:'bountySkill',overload:'trainingSkill',bountySkill:'chain',trainingSkill:'overload'})){
     const state={stage,skillsOwned:[],skillsEquipped:[],skillLevels:{},skillXp:{},skillChoiceUsed:false};
     const notices=[];
     const context=vm.createContext({
       s:state,SKILLS:{chain:['연쇄 방전'],bountySkill:['현상금 추적'],overload:['과부하 사격'],trainingSkill:['전술 훈련']},
       STAGE35_EARLY_PARTNERS:{chain:'bountySkill',overload:'trainingSkill',bountySkill:'chain',trainingSkill:'overload'},
       skillSlotCount:()=>stage===40?1:2,showRewardNotice:m=>notices.push(m),addSkillXp:(id,n)=>{state.skillXp[id]=(state.skillXp[id]||0)+n},
       save(){},render(){}
     });
     vm.runInContext(extract('grantStage35Support')+'\n'+extract('chooseSkill'),context);
     assert.equal(vm.runInContext("chooseSkill("+JSON.stringify(first)+")",context),true);
     assert.deepEqual([...state.skillsOwned],stage>=35?[first,partner]:[first]);
     assert.equal(vm.runInContext("chooseSkill("+JSON.stringify(first)+")",context),false,'second first-choice must be rejected');
     assert.equal(state.skillsOwned.length,stage>=35?2:1);
     if(stage===20){
       assert.equal(vm.runInContext('grantStage35Support()',context),'skill');
       assert.deepEqual([...state.skillsOwned],[first,partner]);
     }
     assert.equal(notices.filter(m=>m.includes('STAGE 35 전술 보급')).length,1);
     if(stage===40)assert.deepEqual([...state.skillsEquipped],[first],'full skill slots must preserve chosen equipment');
   }
 }],
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
