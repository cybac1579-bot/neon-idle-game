'use strict';
/* Lock only the DOM port between the replaceable prototype UI and the
 * controller. Neither engine nor the on-disk save needs to know about skins.
 * This is intentionally structural, not a snapshot of the current art. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const site=path.resolve(__dirname,'../site');
const read=name=>fs.readFileSync(path.join(site,name),'utf8');
const html=read('expedition.html'),css=read('expedition-ui.css');
const view=read('expedition-ui.js'),app=read('expedition-app.js');
const field=read('expedition-field.js'),engine=read('expedition-engine.js');
const shellIds=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const allBindings=[...view.matchAll(/\$\('([^']+)'\)/g),...app.matchAll(/\$\('([^']+)'\)/g),
 ...field.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
const absent=[...new Set(allBindings)].filter(id=>!shellIds.has(id));
assert.deepEqual(absent,[],'view/controller reference missing required IDs in the new HTML shell');
const required=['battleScreen','workbench','squadScreen','supplyScreen','archiveScreen','returnScreen',
 'squad','foe','partyHp','enemyHp','hire','train','questList','returnQuick','rebirth','returnPopup',
 'openArchiveChest','exportSave','importSaveFile','exportPlaytest'];
for(const id of required)assert.ok(shellIds.has(id),'public screen contract lost: '+id);
for(const tab of ['squad','supply','archive','return'])
 assert.ok(html.includes('data-tab="'+tab+'"'),'missing expected command panel '+tab);
assert.ok(html.indexOf('id="battleScreen"')<html.indexOf('id="workbench"'),
 'combat must remain outside the scrollable command panel');
assert.ok(html.indexOf('id="workbench"')<html.indexOf('id="squadScreen"'),
 'interactive panels must be inside the scrolling command region');
assert.match(html,/<link rel="stylesheet" href="\.\/expedition-ui\.css" data-expedition-skin="prototype-v1">/);
const order=['expedition-engine.js','expedition-field.js','expedition-ui.js','expedition-app.js'];
const at=order.map(n=>html.indexOf('<script src="./'+n+'"></script>'));
assert.ok(at.every(i=>i>0)&&at.every((i,j)=>j===0||i>at[j-1]),'runtime load order must be stable');
assert.ok(!/<style[\s>]/i.test(html),'no skin CSS should be hardcoded in layout shell');
assert.ok(css.length>1000,'prototype skin must be an independent nonempty asset');
assert.match(view,/root\.ExpeditionUI=\{create,version:/,'replaceable UI adapter export');
assert.match(app,/window\.ExpeditionUI/,'controller must depend on adapter interface');
assert.ok(!/function renderBattle\(/.test(app)&&!/function renderArchive\(/.test(app),
 'controller must not implement the replaceable visual rendering itself');
assert.ok(!/localStorage|SAVE_KEY|JSON\.stringify\(s\)|E\.tick\(/.test(view),
 'UI adapter must not own persistence, engine simulation or schema');
assert.ok(!/document\.|window\.|querySelector|localStorage/.test(engine),
 'game logic must stay independent of browser view and storage');
assert.ok(!/\b(?:function|const|let)\s+(?:fight|tick|rebirth)\b/.test(view),
 'UI adapter must not redefine simulation operations');
// Return core preview must distinguish marginal gain from cumulative gain, and show affordability.
assert.match(view,/E\.valorMultiplier\(\{\.\.\.s,coreUpgrades:/,
 'next-level core preview must calculate from a cloned state');
assert.match(view,/E\.valorMultiplier\(s\)-1\)\*100/,
 'current cumulative core bonus must remain visible');
assert.ok(view.includes('현재 대비 +')&&view.includes('강화 후 누적 +'),
 'marginal and cumulative core effects must be separately labelled');
assert.ok(view.includes('지금 구매 가능')&&view.includes('개 부족'),
 'core preview must disclose whether the next upgrade is affordable');
// Long core-preview values must wrap without pushing the portrait command deck sideways.
assert.match(css, /#coreSummary \.statline\s*\{[^}]*grid-template-columns:minmax\(88px,38%\) minmax\(0,1fr\)/,
 'core investment preview must reserve a shrinkable value column');
assert.match(css, /#coreSummary \.statline b\s*\{[^}]*overflow-wrap:anywhere/,
 'core preview must wrap long marginal/cumulative/affordability text');
// Nonvisual metadata must not erase a still-visible combat cue or trail.
assert.match(field,/if\(!visibleKinds\.has\(evt\.type\)\)return;/,
 'nonvisual events must leave the current combat label intact');
assert.ok(field.indexOf('if(!visibleKinds.has(evt.type))return;')<field.indexOf('fx.replaceChildren();'),
 'ignore metadata before clearing the current battle cue');
// Reduced-motion users still need transient cues to expire; disabling the
// animation entirely leaves the last battle label stuck until another event.
assert.match(css, /@keyframes combat-flash-reduced\s*\{[\s\S]*?100%\s*\{opacity:0;/,
 'reduced-motion combat label must expire without movement');
assert.match(css, /\.combat-cue\s*\{animation:combat-flash-reduced\s+1\.2s/,
 'reduced-motion cue must use a finite non-moving expiry');
// It is OK to replace all CSS and markup, but not to silently drop a
// controller binding or to alter the user's old or current save keys.
assert.ok(engine.includes('neon_expedition_prototype_v1'),'stable prototype save key');

// Combat visibility regression: fallen early recruits must not conceal
// healthy reserves, and original actor indices must survive selection.
const selectSource=field.match(/const selected=s=>\{[\s\S]*?\n\};\nfunction sync\(s\)/);
assert.ok(selectSource,'combat roster selection must remain inspectable');
const selectRoster=Function('return ('+selectSource[0].slice(0,-'\nfunction sync(s)'.length).replace(/^const selected=/,'') .replace(/;\s*$/,'')+')')();
const sample={actors:[
 {id:'guard',hp:0,revive:4},{id:'guard',hp:0,revive:3},
 {id:'guard',hp:0,revive:2},{id:'guard',hp:50,revive:0},
 {id:'ranger',hp:20,revive:0},{id:'medic',hp:10,revive:0}]};
const shown=selectRoster(sample);
assert.ok(shown.some(x=>x.index===3),'healthy reserve guard must be visible');
assert.equal(shown.filter(x=>x.a.id==='guard').length,3,'guard display cap unchanged');
assert.equal(shown.filter(x=>x.a.id==='guard'&&x.a.hp>0).length,1,
 'healthy guard must be prioritized over fallen guards');
assert.deepEqual(selectRoster({actors:[]}),[],'empty squad remains safe');

// Full-wipe visibility must reflect real engine revive timers without adding
// an extra permanent battle HUD or changing combat/reward state.
assert.match(field,/const allDown=\(s\.actors\|\|\[\]\)\.length>0&&s\.actors\.every\(a=>a\.hp<=0\|\|a\.revive>0\)/,
 'full-wipe notice must require a nonempty roster with no living actors');
assert.match(field,/Math\.ceil\(nextRevive\)/,
 'automatic rejoin countdown must use the real shortest revival timer');
assert.ok(field.includes('부대 전멸 · 자동 재합류')&&field.includes('rosterNote.hidden=!allDown&&extra===0'),
 'wipe notice must be visible even with no hidden reserves');

console.log('PASS expedition UI interchange contract: '+shellIds.size+
 ' shell IDs, '+new Set(allBindings).size+' bindings, 4 panel ports, engine/save isolated');
