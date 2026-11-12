'use strict';
// Run with: node tests/redesign-static.test.cjs
// Structural smoke checks only; does not replace browser/device tests.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('site/index.html','utf8');
const js=fs.readFileSync('site/game.js','utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const refs=[...js.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
const checks=[
 ['JavaScript parses',()=>new vm.Script(js,{filename:'site/game.js'})],
 ['HTML ids are unique',()=>assert.equal(new Set(ids).size,ids.length)],
 ['All direct DOM references exist',()=>assert.deepEqual([...new Set(refs)].filter(id=>!ids.includes(id)),[])],
 ['Combat stage exists',()=>assert.ok(ids.includes('combatStage'))],
 ['Enemy animation targets enemy image',()=>assert.match(html,/#enemyImage\{animation:enemy-hover/)],
 ['Skill flash is present',()=>assert.ok(ids.includes('battleSkillFlash'))],
 ['Reduced-motion skill fallback exists',()=>assert.match(html,/prefers-reduced-motion:reduce\)\{\.battle-skill-flash\{display:none/)],
 ['Growth details exist',()=>assert.ok(ids.includes('heroGrowthDetails'))],
 ['Existing save key remains unchanged',()=>assert.match(js,/const KEY='neon_rework_07'/)],
 ['Offline settlement avoids automatic rebirth',()=>assert.match(js,/step\(dt,false\)/)],
 ['No tap-required combat handlers',()=>assert.doesNotMatch(js,/addEventListener\(['"](?:touchstart|pointerdown)['"]/)]
];
let failed=0;
for(const [name,check] of checks){try{check();console.log('PASS '+name)}catch(error){failed++;console.error('FAIL '+name+' — '+error.message)}}
console.log((checks.length-failed)+'/'+checks.length+' checks passed');
if(failed)process.exitCode=1;
