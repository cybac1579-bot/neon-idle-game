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
console.log('PASS expedition UI interchange contract: '+shellIds.size+
 ' shell IDs, '+new Set(allBindings).size+' bindings, 4 panel ports, engine/save isolated');
