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
 ['inline navigation parses',()=>{for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(m[1].trim())new vm.Script(m[1])}],
 ['unique DOM IDs',()=>assert.equal(new Set(ids).size,ids.length)],
 ['game DOM bindings exist',()=>assert.deepEqual([...new Set(refs)].filter(x=>!ids.includes(x)),[])],
 ['four existing navigation tabs',()=>assert.deepEqual([...html.matchAll(/<button data-view="([^"]+)"/g)].map(x=>x[1]),['battle','growth','reset','stats'])],
 ['save button is inside stats screen',()=>{
   const stats=html.indexOf('<section data-screen="stats"');
   const save=html.indexOf('id="save"');
   assert.ok(stats>=0&&save>stats&&save<html.indexOf('</section>',stats));
 }],
 ['browser smoke opens stats immediately before save',()=>{
   const smoke=fs.readFileSync('tests/integration-portrait.test.cjs','utf8');
   const save=smoke.indexOf("await page.locator('#save').click()");
   const stats=smoke.lastIndexOf(`await page.locator('[data-view="stats"]').first().click()`,save);
   assert.ok(save>=0&&stats>=0&&stats<save,'save click must follow stats navigation');
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
