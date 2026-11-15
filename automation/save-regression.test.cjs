// Run: node --test automation/save-regression.test.cjs
// No external dependencies. Executes actual site/game.js with fake browser objects.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../site/game.js'),'utf8');
function boot(saved,now=Date.UTC(2026,10,12,0,0,0),seed=null){
  const values=new Map();
  if(saved!==undefined)values.set('neon_rework_07',JSON.stringify(saved));
  const listeners={};
  const nodes=new Map();
  function element(){
    return {style:{},dataset:{},children:[],classList:{toggle(){}},addEventListener(){},
      querySelectorAll(){return []},appendChild(n){this.children.push(n)},
      remove(){},
      set innerHTML(html){this.children=[...String(html).matchAll(/<(strong|small|button)\b[^>]*>/g)].map(()=>element())},
      get firstElementChild(){return this.children[0]||null},
      get lastElementChild(){return this.children[this.children.length-1]||null},
      set textContent(v){this._text=v},get textContent(){return this._text||''}};
  }
  const document={hidden:false,getElementById(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)},
    createElement(){return element()},addEventListener(name,cb){listeners[name]=cb}};
  let denyWrites=false;
  const localStorage={getItem(k){return values.get(k)||null},setItem(k,v){if(denyWrites)throw new Error('QuotaExceededError');values.set(k,v)},removeItem(k){values.delete(k)}};
  const RealDate=Date;
  class FakeDate extends RealDate{static now(){return now}}
  let rng=(seed===null?null:(seed>>>0));
  const seededMath=Object.create(Math);
  if(rng!==null)seededMath.random=()=>{rng=(Math.imul(1664525,rng)+1013904223)>>>0;return rng/4294967296};
  const ctx=vm.createContext({document,localStorage,Date:FakeDate,Math:seededMath,JSON,Number,Object,Array,Set,
    performance:{now:()=>0},window:{addEventListener(name,cb){listeners['window:'+name]=cb}},requestAnimationFrame(){},confirm:()=>true});
  vm.runInContext(source,ctx,{filename:'site/game.js',timeout:15000});
  return {ctx,document,listeners,values,now,setNow(n){now=n},denyWrites(v){denyWrites=v},get(expr){return vm.runInContext(expr,ctx)}};
}
test('invalid timestamp does not award phantom offline progress',()=>{
  const b=boot({stage:1,lastSaved:null,credits:30});
  assert.equal(b.get('s.credits'),30);
  assert.equal(b.get('s.stage'),1);
});
test('corrupted skill maps with legacy migration do not reset saved progression',()=>{
  const b=boot({stage:25,best:25,credits:1234,heroLevel:60,traitPointsEarned:59,
    traits:{inherit:1},skillsOwned:['hasteSkill'],skillsEquipped:['hasteSkill'],
    skillsInherited:['hasteSkill'],skillLevels:'broken',skillXp:['bad'],lastSaved:Date.UTC(2026,10,12,0,0,0)});
  assert.equal(b.get('s.stage'),25);
  assert.equal(b.get('s.credits'),1234);
  assert.equal(b.get('s.skillsOwned.includes("bountySkill")'),true);
  assert.equal(b.get('s.skillsInherited.includes("bountySkill")'),true);
  assert.equal(b.get('s.skillLevels.bountySkill'),1);
});
test('auto-rebirth requires BOTH minimum three cores and 15 percent of total cores',()=>{
  const stamp=Date.UTC(2026,10,12,0,0,0);
  const b=boot({stage:100,best:100,rebirths:2,totalCores:100,autoLevel:3,autoRebirth:true,lastSaved:stamp},stamp);
  assert.equal(b.get('autoRebirthThreshold()'),15);
  assert.equal(b.get('gainCore()'),5);
  assert.match(b.document.getElementById('autoDetails').textContent,/모두 충족/);
  b.get('step(0,true)');
  assert.equal(b.get('s.rebirths'),2,'five cores are insufficient with total core 100');
  b.get('s.stage=139;spawn()');
  assert.ok(b.get('gainCore()')>=15);
  b.get('step(0,true)');
  assert.equal(b.get('s.rebirths'),3,'reconstruction occurs when both conditions are met');
});
test('phase focus is opt-in and guards STAGE 180 from automatic rebirth',()=>{
  const stamp=Date.UTC(2026,10,12,0,0,0);
  const b=boot({stage:179,best:179,rebirths:2,totalCores:20,autoLevel:3,autoBuy:true,autoRebirth:true,phaseFocus:true,lastSaved:stamp},stamp);
  assert.equal(b.get('phaseFocusHolding()'),true);
  assert.equal(b.document.getElementById('phaseFocus').checked,true);
  assert.match(b.document.getElementById('autoDetails').textContent,/자동 환생 보류 중/);
  b.get('enemyHp=0;step(0,true)');
  assert.equal(b.get('s.stage'),180);
  assert.equal(b.get('s.rebirths'),2,'automatic rebirth must not steal a phase target');
  assert.equal(b.get('s.autoBuy'),true,'phase focus must preserve automatic purchasing');
  assert.ok(b.get('gainPhase()')>0);
  b.get('save();load()');
  assert.equal(b.get('s.phaseFocus'),true,'phase target persists across reload');
  b.get('phase()');
  assert.equal(b.get('s.phases'),1);
  assert.equal(b.get('s.phaseFocus'),true,'a chosen long-term target stays selected');
  assert.equal(b.get('s.autoRebirth'),false,'phase reset retains prior automation reset policy');
});
test('without phase focus auto rebirth remains unchanged and can be manually overridden',()=>{
  const stamp=Date.UTC(2026,10,12,0,0,0);
  const normal=boot({stage:179,best:179,rebirths:2,totalCores:20,autoLevel:3,autoRebirth:true,lastSaved:stamp},stamp);
  assert.equal(normal.get('s.phaseFocus'),false,'existing saves default to normal auto-rebirth');
  normal.get('enemyHp=0;step(0,true)');
  assert.equal(normal.get('s.stage'),1);
  assert.equal(normal.get('s.rebirths'),3);
  const manual=boot({stage:179,best:179,rebirths:2,totalCores:20,autoLevel:3,autoRebirth:true,phaseFocus:true,lastSaved:stamp},stamp);
  manual.get('s.autoRebirth=false;enemyHp=0;step(0,true)');
  assert.equal(manual.get('s.stage'),180);
  assert.ok(manual.get('gainCore()')>0);
  assert.equal(manual.get('rebirth()'),true,'manual reconstruction remains possible during phase focus');
  assert.equal(manual.get('s.stage'),1);
  assert.equal(manual.get('s.rebirths'),3);
});
test('phase goal focus pauses only after two reconstructions and can be toggled off',()=>{
  const stamp=Date.UTC(2026,10,12,0,0,0);
  const b=boot({stage:100,best:100,rebirths:1,totalCores:0,autoLevel:3,autoRebirth:true,phaseFocus:true,lastSaved:stamp},stamp);
  b.get('step(0,true)');
  assert.equal(b.get('s.rebirths'),2,'second reconstruction still happens automatically');
  assert.equal(b.get('s.phaseFocus'),true);
  b.get('s.stage=100;spawn();step(0,true)');
  assert.equal(b.get('s.rebirths'),2,'auto rebirth paused after second reconstruction');
  b.document.getElementById('phaseFocus').onchange({target:{checked:false}});
  assert.equal(b.get('s.phaseFocus'),false);
  b.get('step(0,true)');
  assert.equal(b.get('s.rebirths'),3,'turning focus off restores the automatic policy');
});

test('offline settlement never auto-rebirths even when threshold is reached',()=>{
  const b=boot({stage:100,best:100,autoLevel:3,autoRebirth:true,rebirths:0,totalCores:0,
    lastSaved:Date.UTC(2026,10,12,0,0,0)});
  b.get('settleElapsed(2)');
  assert.equal(b.get('s.rebirths'),0);
});
test('hidden-tab resume settles elapsed time once and remains stable on immediate repeat',()=>{
  const b=boot({lastSaved:Date.UTC(2026,10,12,0,0,0)});
  b.document.hidden=true;b.listeners.visibilitychange();
  b.setNow(Date.UTC(2026,10,12,0,0,10));
  b.document.hidden=false;b.listeners.visibilitychange();
  const first=b.get('s.energy');
  assert.ok(first>=10);
  b.listeners.visibilitychange();
  assert.equal(b.get('s.energy'),first);
});

test('boss stage selects boss art and increases boss-trait damage',()=>{
  const b=boot({stage:10,best:10,heroLevel:30,traitPointsEarned:29,traits:{boss:2},lastSaved:Date.UTC(2026,10,12,0,0,0)});
  assert.equal(b.document.getElementById('enemyImage').src,'boss_guardian.webp');
  const withTrait=b.get('power()');
  b.get('s.traits.boss=0');
  const withoutTrait=b.get('power()');
  assert.ok(withTrait>withoutTrait,'boss trait must increase damage on stage 10');
  b.get('s.stage=11;spawn()');
  assert.notEqual(b.document.getElementById('enemyImage').src,'boss_guardian.webp');
});
test('combat skill damages enemy and respects cooldown',()=>{
  const b=boot({stage:20,best:20,skillsOwned:['overload'],skillsEquipped:['overload'],skillLevels:{overload:1},lastSaved:Date.UTC(2026,10,12,0,0,0)});
  const before=b.get('enemyHp');
  b.get('skillTick(9)');
  assert.ok(b.get('enemyHp')<before,'overload should damage enemy');
  const after=b.get('enemyHp');
  b.get('skillTick(1)');
  assert.equal(b.get('enemyHp'),after,'skill must not fire again before cooldown');
});
test('overload remains a single immediate burst instead of a chain pulse',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:55,best:55,skillsOwned:['overload'],skillsEquipped:['overload'],lastSaved:stamp},stamp);
 const oldHp=b.get('enemyHp'),strike=b.get('power()');
 b.get('skillTick(9);render()');
 assert.ok(Math.abs(b.get('enemyHp')-(oldHp-3*strike))<1e-7,'overload must do 3x immediate damage');
 assert.equal(b.get('s.chainPulses'),0);
 assert.match(b.document.getElementById('skillCue').textContent,/과부하 사격/);
});
test('chain schedules three separate pulses and transfers remaining hits to the next enemy',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:30,best:30,skillsOwned:['chain'],skillsEquipped:['chain'],lastSaved:stamp},stamp);
 const before=b.get('enemyHp');
 b.get('skillTick(6)');
 assert.equal(b.get('s.chainPulses'),3);
 assert.equal(b.get('enemyHp'),before,'chain starts a timed sequence, not instant damage');
 b.get('enemyHp=power()*.45');
 b.get('skillTick(1)');
 assert.equal(b.get('s.stage'),31,'first pulse defeats the previous enemy');
 assert.equal(b.get('s.chainPulses'),2);
 const nextHp=b.get('enemyHp');
 const nextPower=b.get('power()');
 b.get('skillTick(1)');
 assert.equal(b.get('s.chainPulses'),1);
 assert.equal(b.get('s.stage'),31);
 assert.ok(Math.abs(b.get('enemyHp')-(nextHp-nextPower*.6))<1e-7,'remaining pulse damages the new enemy');
 b.get('skillTick(1);render()');
 assert.equal(b.get('s.chainPulses'),0);
 assert.match(b.document.getElementById('skillCue').textContent,/3\/3 타격/);
});
test('chain pulse progress survives reload and is cleared on unequip or rebirth',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:100,best:100,skillsOwned:['chain'],skillsEquipped:['chain'],skillsInherited:['chain'],lastSaved:stamp},stamp);
 b.get('skillTick(6);skillTick(1.5)');
 assert.equal(b.get('s.chainPulses'),2);
 b.get('save();load()');
 assert.equal(b.get('s.chainPulses'),2);
 assert.ok(b.get('s.chainPulseClock')>=0.5,'partial tick is saved');
 b.get('toggleEquipSkill("chain")');
 assert.equal(b.get('s.chainPulses'),0,'unequip stops pending pulses');
 b.get('toggleEquipSkill("chain");skillTick(6)');
 assert.equal(b.get('s.chainPulses'),3);
 assert.equal(b.get('rebirth()'),true);
 assert.equal(b.get('s.chainPulses'),0,'chain does not carry in-flight pulses across rebirth');
 assert.equal(b.get('s.skillLevels.chain'),1);
 const legacy=boot({stage:25,best:25,skillsOwned:['chain'],skillsEquipped:['chain'],lastSaved:stamp},stamp);
 assert.equal(legacy.get('s.chainPulses'),0,'old saves without pulse state remain compatible');
});
test('combat reward and skill cue text is transient, but earned weapon and skills persist',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:20,best:20,lastSaved:stamp},stamp);
 assert.equal(b.get('chooseSkill("chain")'),true);
 assert.match(b.document.getElementById('rewardCue').textContent,/첫 스킬 선택/);
 b.get('skillTick(6);render()');
 assert.match(b.document.getElementById('skillCue').textContent,/연쇄 방전/);
 b.get('toggleEquipSkill("chain");skillTick(5);render()');
 assert.equal(b.document.getElementById('rewardCue').textContent,'','temporary reward notice must expire');
 assert.equal(b.document.getElementById('skillCue').textContent,'','temporary skill cue must expire');
 assert.equal(b.get('s.skillsOwned.includes("chain")'),true,'earned ownership must remain');
});

test('STAGE 60 frontline support provides one nonblocking per-run choice and no new currency',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:59,best:59,atk:35,forge:4,lastSaved:stamp},stamp);
 assert.equal(b.get("chooseFrontlineSupport('firepower')"),false,'cannot claim before STAGE60');
 assert.equal(b.get('s.frontlineSupport'),null);
 b.get('s.stage=60;spawn();render()');
 const initial=b.get('s.atk');
 assert.equal(b.get("chooseFrontlineSupport('firepower')"),true);
 assert.equal(b.get('s.atk'),initial+1);
 assert.equal(b.get('s.frontlineSupport'),'firepower');
 assert.equal(b.get("chooseFrontlineSupport('industry')"),false,'one reward only');
 assert.equal(b.get("chooseFrontlineSupport('training')"),false);
 assert.ok(b.get('frontlineSupportGoal()').includes('지원 완료'));
 b.get('save();load()');
 assert.equal(b.get('s.frontlineSupport'),'firepower');
 assert.equal(b.get('s.atk'),initial+1);
});
test('frontline support alternatives reward only the existing economy or permanent hero XP',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const econ=boot({stage:60,best:60,forge:7,credits:5000,lastSaved:stamp},stamp);
 assert.equal(econ.get("chooseFrontlineSupport('industry')"),true);
 assert.equal(econ.get('s.forge'),8);
 assert.equal(econ.get('s.credits'),5000,'free upgrade spends no credits');
 assert.equal(econ.get("chooseFrontlineSupport('industry')"),false);
 const training=boot({stage:60,best:60,heroLevel:9,heroXp:0,lastSaved:stamp},stamp);
 const xp=training.get('xpNeeded(s.heroLevel)');
 assert.equal(training.get("chooseFrontlineSupport('training')"),true);
 assert.ok(training.get('s.heroXp')>=xp*.5 || training.get('s.heroLevel')>=10);
 assert.equal(training.get('s.frontlineSupport'),'training');
 assert.equal(training.get('s.traitPointsEarned'),training.get('s.heroLevel')-1);
});
test('new choice remains optional for idle combat and resets on rebirth and phase without duplicate payouts',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:60,best:60,atk:30,lastSaved:stamp},stamp);
 const oldStage=b.get('s.stage'),kills=b.get('s.kills');
 b.get('enemyHp=0;step(.25,false)');
 assert.equal(b.get('s.kills'),kills+1);
 assert.equal(b.get('s.stage'),oldStage+1);
 assert.equal(b.get('s.frontlineSupport'),null,'idle combat does not silently choose');
 b.get("chooseFrontlineSupport('industry')");
 b.get('s.stage=100;spawn()');
 assert.equal(b.get('rebirth()'),true);
 assert.equal(b.get('s.frontlineSupport'),null,'next reconstruction gets a fresh choice');
 assert.equal(b.get('s.forge'),0,'temporary upgrade cleared by rebirth');
 b.get('s.stage=180;s.rebirths=2;spawn()');
 b.get("chooseFrontlineSupport('firepower')");
 assert.equal(b.get('s.frontlineSupport'),'firepower');
 b.get('phase()');
 assert.equal(b.get('s.frontlineSupport'),null,'phase transition cannot preserve transient free reward');
});
test('frontline support input is sanitized, keeps allocation independent and never adds a rebirth-count bonus',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:60,best:60,allocation:'assault',frontlineSupport:'invalid',rebirths:5,lastSaved:stamp},stamp);
 assert.equal(b.get('s.frontlineSupport'),null);
 assert.equal(b.get('s.allocation'),'assault');
 assert.ok(b.get('frontlineSupportGoal()').includes('선택 가능'));
 assert.equal(b.get("chooseFrontlineSupport('invalid')"),false);
 assert.equal(b.get("chooseFrontlineSupport('firepower')"),true);
 assert.equal(b.get('s.allocation'),'assault','support must not force permanent allocation');
 assert.equal(b.get('s.atk'),1,'free single upgrade rather than repeated rebirth-count scaling');
 const old=boot({stage:60,best:60,lastSaved:stamp},stamp);
 assert.equal(old.get('s.frontlineSupport'),null,'legacy saves get a fresh opt-in');
});

test('early hero XP requirement is discounted until level ten, but later thresholds remain unchanged',()=>{
 const b=boot({stage:20,best:20,heroLevel:1,heroXp:0,lastSaved:Date.UTC(2026,10,12)});
 assert.equal(b.get('xpNeeded(1)'),6);
 assert.equal(b.get('xpNeeded(9)'),Math.ceil(10*Math.pow(9,1.45)*.6));
 assert.equal(b.get('xpNeeded(10)'),Math.ceil(10*Math.pow(10,1.45)));
 assert.equal(b.get('xpNeeded(25)'),Math.ceil(10*Math.pow(25,1.45)));
 assert.equal(b.get('skillSlotCount()'),1);
 assert.equal(b.get('nextSkillSlotLevel()'),10);
 assert.ok(b.get('xpToNextSkillSlot()')<1017);
});
test('hero level ten automatically fills only newly opened slot with a pre-owned unequipped skill',()=>{
 const stamp=Date.UTC(2026,10,12);
 const b=boot({stage:25,best:25,heroLevel:9,heroXp:0,skillsOwned:['chain','overload'],skillsEquipped:['chain'],
  skillLevels:{chain:2,overload:3},lastSaved:stamp},stamp);
 assert.equal(b.get('skillSlotCount()'),1);
 assert.deepEqual(Array.from(b.get('s.skillsEquipped')),['chain']);
 const prior=b.get('s.traitPointsEarned');
 b.get('gainHeroXp(xpNeeded(9));render()');
 assert.equal(b.get('s.heroLevel'),10);
 assert.equal(b.get('s.traitPointsEarned'),prior+1,'trait point gained normally');
 assert.equal(b.get('skillSlotCount()'),2,'unchanged LV10 slot threshold');
 assert.equal(b.get('s.skillsEquipped.length'),2);
 assert.equal(b.get('s.skillsEquipped[1]'),'overload');
 assert.match(b.document.getElementById('rewardCue').textContent,/자동 장착/);
 b.get('save();load()');
 assert.equal(b.get('s.skillsEquipped.length'),2);
 assert.equal(b.get('s.skillLevels.overload'),3,'skill experience remains');
});
test('slot opening never invents skills, clears manual emptiness only on a new slot, or overfills',()=>{
 const stamp=Date.UTC(2026,10,12);
 const b=boot({stage:25,best:25,heroLevel:9,skillsOwned:['chain'],skillsEquipped:['chain'],lastSaved:stamp},stamp);
 b.get('gainHeroXp(xpNeeded(9));render()');
 assert.equal(b.get('s.heroLevel'),10);
 assert.equal(b.get('s.skillsEquipped.length'),1);
 assert.match(b.document.getElementById('rewardCue').textContent,/스킬 장착 가능/);
 const another=boot({stage:25,best:25,heroLevel:9,skillsOwned:['chain','overload','bountySkill'],skillsEquipped:['chain'],lastSaved:stamp},stamp);
 another.get('gainHeroXp(xpNeeded(9))');
 assert.equal(another.get('s.skillsEquipped.length'),2);
 assert.equal(another.get('s.skillsEquipped[1]'),'overload');
 assert.equal(another.get('s.skillsOwned.length'),3);
 another.get('gainHeroXp(0)');
 assert.equal(another.get('s.skillsEquipped.length'),2,'no further automatic equipping outside milestone');
});
test('old partial hero experience loads safely into new early curve and permanent progress survives rebirth',()=>{
 const stamp=Date.UTC(2026,10,12);
 const b=boot({stage:100,best:100,heroLevel:9,heroXp:200,traitPointsEarned:8,skillsOwned:['chain','overload'],
  skillsEquipped:['chain'],skillsInherited:['chain'],lastSaved:stamp},stamp);
 assert.equal(b.get('s.heroLevel'),9,'save load never downgrades a hero');
 assert.equal(b.get('s.heroXp'),200,'old accumulated XP not silently lost');
 b.get('gainHeroXp(0);render()');
 assert.ok(b.get('s.heroLevel')>=10);
 assert.equal(b.get('s.skillsEquipped.length'),2);
 assert.equal(b.get('rebirth()'),true);
 assert.ok(b.get('s.heroLevel')>=10,'permanent level retained');
 assert.equal(b.get('skillSlotCount()'),2);
 assert.equal(b.get('s.skillsEquipped.length'),1,'only inherited skills survive a rebirth, as before');
});

test('STAGE 20 grants one optional skill choice and never stops idle combat',()=>{
 const b=boot({stage:19,best:19,lastSaved:Date.UTC(2026,10,12,0,0,0)});
 assert.equal(b.get("chooseSkill('trainingSkill')"),false,'choice locked before stage20');
 assert.equal(b.get("s.skillsOwned.length"),0);
 b.get('s.stage=20;spawn();render()');
 assert.equal(b.get('Object.keys(SKILLS).length'),4);
 assert.equal(b.document.getElementById('skillChoice').children.length,4);
 assert.equal(b.get("chooseSkill('trainingSkill')"),true);
 assert.equal(b.get('s.skillsOwned.includes("trainingSkill")'),true);
 assert.equal(b.get('s.skillsEquipped.includes("trainingSkill")'),true);
 assert.equal(b.get('s.skillChoiceUsed'),true);
 assert.equal(b.get("chooseSkill('overload')"),false,'one selection per run');
 assert.match(b.document.getElementById('skillChoiceInfo').textContent,/선택 완료/,'choice confirmation is shown');
 const prior=b.get('s.kills');b.get('enemyHp=0;resolveEnemyDefeat()');
 assert.equal(b.get('s.kills'),prior+1,'automated combat continues after selection');
});
test('skill-choice save, normal reset, inherited skill and legacy save remain compatible',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:100,best:100,skillsOwned:['trainingSkill'],skillsEquipped:['trainingSkill'],skillsInherited:['trainingSkill'],
  skillLevels:{trainingSkill:12},skillBuffTraining:9,skillChoiceUsed:true,lastSaved:stamp},stamp);
 assert.equal(b.get('s.skillChoiceUsed'),true);
 assert.equal(b.get('s.skillBuffTraining'),9);
 b.get('save();load()');
 assert.equal(b.get('s.skillChoiceUsed'),true);
 assert.equal(b.get('rebirth()'),true);
 assert.equal(b.get('s.skillChoiceUsed'),false,'a new run permits another starter choice');
 assert.equal(b.get('s.skillsOwned.includes("trainingSkill")'),true,'inherited skill survives');
 assert.equal(b.get('s.skillLevels.trainingSkill'),1,'inherited level resets to one');
 assert.equal(b.get('s.skillBuffTraining'),0,'temporary buff does not carry across runs');
 assert.equal(b.get("chooseSkill('overload')"),false,'must reach stage20 again');
 b.get('s.stage=20;spawn();render()');
 assert.equal(b.get("chooseSkill('overload')"),true);
 const legacy=boot({stage:20,best:20,lastSaved:stamp},stamp);
 assert.equal(legacy.get('s.skillChoiceUsed'),false,'existing saves without flag can opt in');
});
test('training skill gives hero XP without changing attack interval or credit income',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:35,best:35,skillsOwned:['trainingSkill'],skillsEquipped:['trainingSkill'],
  skillLevels:{trainingSkill:1},lastSaved:stamp},stamp);
 const beforeInterval=b.get('attackInterval()'),credits=b.get('creditRate()');
 assert.equal(b.get('s.skillBuffTraining'),0);
 b.get('skillTick(14)');
 assert.equal(b.get('s.skillBuffTraining'),12);
 assert.equal(b.get('attackInterval()'),beforeInterval);
 assert.equal(b.get('creditRate()'),credits);
 const base=b.get('Math.floor(2*Math.pow(1.035,Math.min(200,s.stage)-1)*(1+traitLevel("training")*.05))');
 b.get('enemyHp=0;resolveEnemyDefeat()');
 assert.ok(b.get('s.heroXp')>=base*2 || b.get('s.heroLevel')>1,'active training must boost hero XP');
 b.get('skillTick(1)');
 assert.equal(b.get('s.skillBuffTraining'),11);
});
test('skill choice does not override full equip slots and remains optional when all known',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:25,best:25,skillsOwned:['overload'],skillsEquipped:['overload'],lastSaved:stamp},stamp);
 assert.equal(b.get('skillSlotCount()'),1);
 assert.equal(b.get("chooseSkill('trainingSkill')"),true);
 assert.equal(b.get('s.skillsOwned.length'),2);
 assert.equal(b.get('s.skillsEquipped.length'),1,'equipped slot limit is preserved');
 assert.equal(b.get('s.skillsEquipped.includes("overload")'),true);
 const all=boot({stage:25,best:25,skillsOwned:['overload','chain','bountySkill','trainingSkill'],lastSaved:stamp},stamp);
 assert.equal(all.get('s.skillChoiceUsed'),false);
 assert.equal(all.document.getElementById('skillChoice').children.length,0);
});

test('timed quests accumulate independently and claim exactly once',()=>{
  const b=boot({stage:1,best:3,lastSaved:Date.UTC(2026,10,12,0,0,0)});
  b.get('step(360,false)');
  const rewards=b.get('s.questCredits.slice()');
  assert.ok(rewards.every(x=>x>0),'all unlocked quests should accumulate rewards');
  const before=b.get('s.credits');
  const amount=rewards.reduce((a,x)=>a+x,0);
  assert.equal(b.get('transferCacheCredits()'),amount);
  assert.equal(b.get('s.credits'),before+amount);
  assert.equal(b.get('transferCacheCredits()'),0);
});

test('timed quest reserves cap across repeated ticks and claim without duplication',()=>{
 const b=boot({stage:3,best:3,lastSaved:Date.UTC(2026,10,12,0,0,0)});
 for(let n=0;n<30;n++)b.get('step(120,false)');
 assert.ok(b.get('s.questCredits.every((x,i)=>x<=questPayout(i)*5)'),'each quest must cap at five payouts');
 const reserved=b.get('s.questCredits.reduce((a,x)=>a+x,0)');
 const before=b.get('s.credits');
 assert.equal(b.get('transferCacheCredits()'),reserved);
 assert.equal(b.get('transferCacheCredits()'),0);
 assert.equal(b.get('s.credits'),before+reserved);
});
test('legacy credit cache migrates into timed quest reserves',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:3,best:3,cacheCredits:123,cacheClock:12,lastSaved:stamp},stamp);
 assert.equal(b.get('s.questCredits[1]'),123);
 assert.equal(b.get('s.questClocks[1]'),12);
 assert.equal(b.get('s.cacheCredits'),0);
 assert.equal(b.get('transferCacheCredits()'),123);
});

test('high-stage legacy credit cache survives payout ticks, save and load without duplication',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const oldCache=917105;
 const b=boot({stage:60,best:60,cacheCredits:oldCache,cacheClock:0,lastSaved:stamp},stamp);
 assert.equal(b.get('s.questCredits[1]'),oldCache);
 assert.ok(b.get('questPayout(1)*5')<oldCache,'legacy reserve must exceed the new quest cap');
 b.get('questTick(30)');
 assert.equal(b.get('s.questCredits[1]'),oldCache,'earning a new payout must not delete old saved credit');
 b.get('save()');
 b.get('load()');
 assert.equal(b.get('s.questCredits[1]'),oldCache,'legacy credit must survive a second restore');
 const creditsBefore=b.get('s.credits');
 const credited=b.get('transferCacheCredits()');
 assert.ok(credited>=oldCache,'claim must include at least all legacy credit');
 assert.equal(b.get('s.credits'),creditsBefore+credited);
 assert.equal(b.get('transferCacheCredits()'),0,'claim must not duplicate saved credit');
});
test('previously migrated oversized quest reserve is not clamped by the next payout',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:60,best:60,questCredits:[0,917105,0],lastSaved:stamp},stamp);
 b.get('questTick(30)');
 assert.equal(b.get('s.questCredits[1]'),917105);
});
test('loaded skill levels above the real cap normalize to twenty without resetting progress',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:72,best:90,heroLevel:12,skillsOwned:['overload'],
  skillsEquipped:['overload'],skillLevels:{overload:80},skillXp:{overload:999},lastSaved:stamp},stamp);
 assert.equal(b.get('s.stage'),72);
 assert.equal(b.get('s.heroLevel'),12);
 assert.equal(b.get('s.skillLevels.overload'),20);
 assert.equal(b.get('s.skillXp.overload'),0);
 assert.ok(Math.abs(b.get("skillScale('overload')")-1.76)<1e-10);
 b.get('save()');
 b.get('load()');
 assert.equal(b.get('s.skillLevels.overload'),20);
 const old=boot({stage:25,best:25,skillsOwned:['hasteSkill'],skillsEquipped:['hasteSkill'],
  skillLevels:{hasteSkill:100},lastSaved:stamp},stamp);
 assert.equal(old.get('s.skillLevels.bountySkill'),20,'legacy haste-skill migration must obey the same cap');
});

test('phase transition clears timed quest clocks and reserves',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:180,best:180,rebirths:2,questCredits:[11,22,33],questClocks:[2,3,4],lastSaved:stamp},stamp);
 assert.ok(b.get('gainPhase()')>0);
 b.get('phase()');
 assert.equal(b.get('s.questCredits.reduce((a,x)=>a+x,0)'),0);
 assert.equal(b.get('s.questClocks.reduce((a,x)=>a+x,0)'),0);
});
test('upgrade purchase respects unlock, price and speed cap',()=>{
  const b=boot({stage:1,best:1,credits:1000,lastSaved:Date.UTC(2026,10,12,0,0,0)});
  assert.equal(b.get('purchase("amp")'),false,'locked upgrade must be unavailable');
  assert.equal(b.get('s.amp'),0);
  const cost=b.get('cost("atk")');
  const before=b.get('s.credits');
  assert.equal(b.get('purchase("atk")'),true);
  assert.equal(b.get('s.credits'),before-cost);
  assert.equal(b.get('s.atk'),1);
  b.get('s.spd=50');
  assert.equal(b.get('purchase("spd")'),false,'speed cap must hold');
  b.get('s.credits=0');
  assert.equal(b.get('purchase("atk")'),false,'cannot purchase without funds');
});
test('rebirth requires stage 100 and preserves permanent upgrades',()=>{
  const b=boot({stage:99,best:99,credits:500,cores:3,corePower:2,rebirths:0,
    lastSaved:Date.UTC(2026,10,12,0,0,0)});
  assert.equal(b.get('rebirth()'),false);
  b.get('s.stage=100');
  const gain=b.get('gainCore()');
  assert.ok(gain>0);
  assert.equal(b.get('rebirth()'),true);
  assert.equal(b.get('s.stage'),1);
  assert.equal(b.get('s.rebirths'),1);
  assert.equal(b.get('s.cores'),3+gain);
  assert.equal(b.get('s.corePower'),2);
  assert.equal(b.get('s.atk'),0);
});

test('rebirth count never grants free stage skips and bosses are visited in order',()=>{
  const b=boot({stage:8,best:8,rebirths:3,lastSaved:Date.UTC(2026,10,12,0,0,0)});
  b.get('enemyHp=0;resolveEnemyDefeat()');
  assert.equal(b.get('s.stage'),9,'STAGE 8 advances exactly one stage despite earlier rebirths');
  assert.equal(b.document.getElementById('enemyImage').src,'enemy_agile.svg');
  b.get('enemyHp=0;resolveEnemyDefeat()');
  assert.equal(b.get('s.stage'),10,'STAGE 10 boss must be fought, not skipped');
  assert.equal(b.document.getElementById('enemyImage').src,'boss_guardian.webp');
  b.get('enemyHp=0;resolveEnemyDefeat()');
  assert.equal(b.get('s.stage'),11,'defeating a boss still advances one stage only');
});
test('sequential progression awards STAGE 10 milestone exactly once',()=>{
  const b=boot({stage:8,best:8,rebirths:3,credits:0,lastSaved:Date.UTC(2026,10,12,0,0,0)});
  b.get('enemyHp=0;resolveEnemyDefeat()');
  assert.equal(b.get('s.stage'),9);
  assert.equal(b.get('s.knownUnlocks.filter(k=>k==="milestone-10").length'),0);
  b.get('enemyHp=0;resolveEnemyDefeat()');
  assert.equal(b.get('s.stage'),10);
  assert.equal(b.get('s.knownUnlocks.filter(k=>k==="milestone-10").length'),1);
  b.get('enemyHp=0;resolveEnemyDefeat()');
  assert.equal(b.get('s.stage'),11);
  assert.equal(b.get('s.knownUnlocks.filter(k=>k==="milestone-10").length'),1);
});
test('auto-buy spends available credits only when enabled and unlocked',()=>{
  const stamp=Date.UTC(2026,10,12,0,0,0);
  const disabled=boot({stage:1,best:1,credits:10000,autoLevel:1,autoBuy:false,lastSaved:stamp});
  disabled.get('step(11,false)');
  assert.equal(disabled.get('s.atk'),0);
  assert.equal(disabled.get('s.spd'),0);
  const enabled=boot({stage:1,best:1,credits:10000,autoLevel:1,autoBuy:true,lastSaved:stamp});
  enabled.get('step(11,false)');
  assert.ok(enabled.get('s.atk+s.spd+s.gen')>0,'enabled auto-buy should purchase an unlocked upgrade');
  assert.ok(enabled.get('s.credits')<10000,'auto-buy should pay for upgrades');
  assert.equal(enabled.get('s.amp'),0,'locked upgrades must remain unavailable');
});
test('short portrait combat keeps a minimum canvas without hiding combat',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
  assert.match(html,/name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/);
  assert.match(html,/\[data-screen="battle"\] \.fight\{min-height:clamp\(250px,43svh,420px\)/);
  assert.match(html,/@media\(max-height:620px\)\{\[data-screen="battle"\] \.fight\{min-height:205px\}/);
  assert.match(html,/<nav class="nav" aria-label="화면 이동">/);
});

test('30-minute simulated idle economy stays finite and auto-buy progresses without forced rebirth',()=>{
  const stamp=Date.UTC(2026,10,12,0,0,0);
  const b=boot({stage:1,best:1,credits:30,autoLevel:1,autoBuy:true,autoRebirth:false,lastSaved:stamp});
  const checkpoints=[];
  for(const seconds of [60,240,600,900]){
    b.get('settleElapsed('+seconds+')');
    checkpoints.push({elapsed:checkpoints.reduce((sum,p)=>sum+p.segment,0)+seconds,segment:seconds,stage:b.get('s.stage'),credits:b.get('s.credits')});
  }
  const metrics=b.get('({stage:s.stage,best:s.best,credits:s.credits,energy:s.energy,atk:s.atk,spd:s.spd,gen:s.gen,rebirths:s.rebirths,kills:s.kills})');
  for(const key of ['credits','energy','atk','spd','gen','kills'])assert.ok(Number.isFinite(metrics[key]),key+' must remain finite');
  assert.ok(metrics.stage>=1&&metrics.best>=metrics.stage);
  assert.equal(metrics.rebirths,0,'no automatic rebirth during offline simulation');
  assert.ok(metrics.kills>0,'idle combat must defeat at least one enemy');
  assert.ok(metrics.atk+metrics.spd+metrics.gen>0,'auto-buy must invest during the 30-minute simulation');
  console.log('30-minute simulated idle metrics:',JSON.stringify({checkpoints,final:metrics}));
});

test('fresh save without auto-buy: 30-minute passive baseline records progression and first rebirth eligibility',()=>{
  const b=boot(undefined);
  const checkpoints=[];
  let elapsed=0,firstRebirthEligibleAt=null;
  for(const segment of [60,240,600,900]){
    // Same capped offline settlement used in the earlier auto-buy fixture.
    b.get('settleElapsed('+segment+')');
    elapsed+=segment;
    const state=b.get('({stage:s.stage,best:s.best,credits:s.credits,energy:s.energy,kills:s.kills,rebirths:s.rebirths,atk:s.atk,spd:s.spd,gen:s.gen})');
    if(firstRebirthEligibleAt===null&&state.stage>=100)firstRebirthEligibleAt=elapsed;
    checkpoints.push({elapsed,...state});
  }
  assert.equal(b.get('s.autoLevel'),0,'fresh save has no automation unlocked');
  assert.equal(b.get('s.atk+s.spd+s.gen'),0,'passive baseline must not buy upgrades');
  assert.equal(b.get('s.rebirths'),0,'offline settlement must not rebirth');
  assert.ok(checkpoints.every(p=>Number.isFinite(p.credits)&&Number.isFinite(p.energy)&&Number.isFinite(p.kills)),'baseline metrics finite');
  console.log('30-minute fresh passive baseline:',JSON.stringify({checkpoints,firstRebirthEligibleAt}));
});

test('fresh active-play proxy: manual purchases every five seconds over 30 minutes',()=>{
  const b=boot(undefined);
  const checkpoints=[];
  let purchases=0,firstRebirthEligibleAt=null;
  for(let second=1;second<=1800;second++){
    b.get('step(1,false)');
    if(second%5===0){
      // Deliberately simple human proxy: buy the cheapest currently unlocked upgrade.
      const bought=b.get('(()=>{const eligible=Object.keys(costs).filter(k=>s.best>=unlockStage[k]&&(k!=="spd"||s.spd<50)&&s.credits>=cost(k)).sort((a,b)=>cost(a)-cost(b));return eligible.length?purchase(eligible[0]):false})()');
      if(bought)purchases++;
    }
    if(firstRebirthEligibleAt===null&&b.get('s.stage')>=100)firstRebirthEligibleAt=second;
    if([60,300,900,1800].includes(second)){
      checkpoints.push({second,...b.get('({stage:s.stage,best:s.best,credits:s.credits,kills:s.kills,atk:s.atk,spd:s.spd,gen:s.gen,rebirths:s.rebirths})')});
    }
  }
  assert.equal(b.get('s.autoLevel'),0);
  assert.equal(b.get('s.rebirths'),0);
  assert.ok(purchases>0,'manual-purchase proxy must buy upgrades');
  assert.ok(checkpoints.every(p=>Number.isFinite(p.credits)&&Number.isFinite(p.kills)&&p.stage>=1));
  console.log('30-minute fresh active manual-purchase proxy:',JSON.stringify({purchases,firstRebirthEligibleAt,checkpoints}));
});

test('keyboard navigation and toggle controls have visible focus treatment',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
  assert.match(html,/button:focus-visible,input:focus-visible\{outline:3px solid #ffe17e;outline-offset:3px\}/);
  assert.match(html,/<nav class="nav" aria-label="화면 이동">/);
  assert.match(html,/setAttribute\('aria-pressed',String\(b.dataset.view===view\)\)/);
});


test('portrait combat motion emphasizes boss and respects reduced-motion preference',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
  assert.match(html,/@media\(prefers-reduced-motion:no-preference\)/);
  assert.match(html,/animation:hero-breathe 2\.8s/);
  assert.match(html,/animation:enemy-hover 2\.2s/);
  assert.match(html,/img\[src="boss_guardian\.webp"\]\{animation:boss-presence/);
  assert.doesNotMatch(html,/@media\(prefers-reduced-motion:reduce\)[\s\S]*animation:/);
});


test('foreground hit feedback is throttled and never called from offline settlement',()=>{
  const game=fs.readFileSync(path.join(__dirname,'../site/game.js'),'utf8');
  assert.match(game,/function combatImpact\(now\)/);
  assert.match(game,/now-lastImpact<180/);
  assert.match(game,/prefers-reduced-motion: reduce/);
  assert.match(game,/if\(enemyHp<before\)combatImpact\(now\)/);
  assert.doesNotMatch(game.split('function settleElapsed(')[1].split("$('skillList').addEventListener")[0],/combatImpact\(/);
});


test('combat hit cue animates foreground only, throttles bursts and honors reduced motion',()=>{
  const b=boot({stage:1,best:1,lastSaved:Date.UTC(2026,10,12,0,0,0)});
  const img=b.document.getElementById('enemyImage');
  let calls=0;
  img.animate=()=>{calls++};
  b.get('combatImpact(1000)');
  assert.equal(calls,1,'first foreground impact should animate');
  b.get('combatImpact(1100)');
  assert.equal(calls,1,'rapid hits should not stack animations');
  b.get('combatImpact(1180)');
  assert.equal(calls,2,'impact should resume after throttle');
  b.get('settleElapsed(2)');
  assert.equal(calls,2,'offline settlement should not animate');
  b.get('window.matchMedia=()=>({matches:true})');
  b.get('combatImpact(2000)');
  assert.equal(calls,2,'reduced motion should suppress impact');
  b.get('window.matchMedia=()=>({matches:false})');
  b.get('combatImpact(2200)');
  assert.equal(calls,3,'normal motion should restore impact');
});

test('next-purchase guidance prioritizes an affordable upgrade over an unaffordable one',()=>{
  const b=boot({stage:1,best:1,credits:20,lastSaved:Date.UTC(2026,10,12,0,0,0)});
  const actual=b.get('actionableGoal()');
  const expected=b.get('(()=>{const opts=Object.keys(costs).filter(k=>s.best>=unlockStage[k]&&(k!=="spd"||s.spd<50)).map(k=>({k,price:cost(k)})).sort((a,b)=>a.price-b.price);const affordable=opts.find(o=>s.credits>=o.price);return affordable?{price:affordable.price,credits:s.credits}:null})()');
  assert.ok(expected,'fixture must have an affordable option');
  assert.match(actual,/구매 가능/,'available purchase must be actionable');
  assert.match(actual,/최저가 강화: 전투 엔진/,'affordable attack upgrade should be selected');
});

test('next-purchase guidance falls back to the cheapest unlocked option when none is affordable',()=>{
  const b=boot({stage:1,best:1,credits:0,lastSaved:Date.UTC(2026,10,12,0,0,0)});
  const actual=b.get('actionableGoal()');
  assert.match(actual,/최저가 강화: 전투 엔진/,'unaffordable state should name cheapest unlocked upgrade');
  assert.doesNotMatch(actual,/구매 가능/,'zero credits should not suggest an immediate purchase');
});

test('next-purchase guidance stays actionable after rebirth with preserved best stage',()=>{
  const b=boot({stage:1,best:100,rebirths:1,credits:20,lastSaved:Date.UTC(2026,10,12,0,0,0)});
  const actual=b.get('actionableGoal()');
  assert.match(actual,/최저가 강화: 전투 엔진/);
  assert.match(actual,/구매 가능/);
});

test('offline settlement caps credited time at 7200 seconds and never auto-rebirths',()=>{
  const b=boot({stage:100,best:100,rebirths:1,autoLevel:3,autoRebirth:true,
    lastSaved:Date.UTC(2026,10,12,0,0,0)});
  const before=b.get('s.rebirths');
  const credited=b.get('settleElapsed(14400)');
  assert.equal(credited,7200,'offline credited time must be capped at two hours');
  assert.equal(b.get('s.rebirths'),before,'offline settlement must not trigger automatic rebirth');
  assert.match(b.get('logText'),/방치 진행 7200초 반영/,'return log must report credited, not wall time');
  assert.ok(b.get('s.questCredits.every((x,i)=>x<=questPayout(i)*5)'),'offline quest reserves must respect five-payout cap');
});


test('visibility resume settles hidden time once without duplicate cache payout',()=>{
  const start=Date.UTC(2026,10,12,0,0,0);
  const b=boot({stage:1,credits:30,cacheClock:0,cacheCredits:0,lastSaved:start},start);
  b.document.hidden=true;
  b.listeners.visibilitychange();
  b.setNow(start+60000);
  b.document.hidden=false;
  b.listeners.visibilitychange();
  const first=b.get('s.questCredits.reduce((a,x)=>a+x,0)');
  assert.ok(first>0,'one minute hidden should generate a cache payout');
  const savedAt=b.get('s.lastSaved');
  assert.equal(savedAt,start+60000,'settlement must save its credited timestamp');
  b.listeners.visibilitychange();
  assert.equal(b.get('s.questCredits.reduce((a,x)=>a+x,0)'),first,'duplicate visible event must not credit cache twice');
  assert.equal(b.get('s.lastSaved'),savedAt);
});


test('repeated hidden events preserve original background start for offline settlement',()=>{
  const start=Date.UTC(2026,10,12,0,0,0);
  const b=boot({stage:1,cacheClock:0,cacheCredits:0,lastSaved:start},start);
  b.document.hidden=true;
  b.listeners.visibilitychange();
  b.setNow(start+30000);
  b.listeners.visibilitychange();
  b.setNow(start+60000);
  b.document.hidden=false;
  b.listeners.visibilitychange();
  assert.ok(b.get('s.questCredits.reduce((a,x)=>a+x,0)')>0,'two hidden events must not discard the first 30 seconds');
  assert.equal(b.get('s.lastSaved'),start+60000);
});

test('visible event without a prior hidden transition never replays foreground time',()=>{
  const b=boot({lastSaved:Date.UTC(2026,10,12,0,0,0)});
  b.get('step(5)');
  const before=b.get('s.energy');
  b.setNow(Date.UTC(2026,10,12,0,0,30));
  b.listeners.visibilitychange();
  assert.equal(b.get('s.energy'),before,'spurious visible event must not settle unsaved foreground time');
});


test('automatic boss combat alternates existing artwork at stage 20 without player tapping',()=>{
  const guardian=boot({stage:10,best:20,lastSaved:Date.UTC(2026,10,12,0,0,0)});
  assert.equal(guardian.document.getElementById('enemyImage').src,'boss_guardian.webp');
  const overheat=boot({stage:20,best:20,lastSaved:Date.UTC(2026,10,12,0,0,0)});
  assert.equal(overheat.document.getElementById('enemyImage').src,'boss_overheat.webp');
  const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
  assert.ok(html.includes('img[src="boss_overheat.webp"]{animation:boss-presence'));
});


test('first playable screen titles do not expose internal experiment iteration labels',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../site/index.html'),'utf8');
  assert.ok(html.includes('<title>네온 방치단</title>'));
  for(const oldLabel of ['14차 실험','임시 테스트','정기 크레딧 회수 · 실험']){
    assert.ok(!html.includes(oldLabel),'remove internal title: '+oldLabel);
  }
});


test('first-playable 30-minute pacing baseline: passive remains pre-rebirth and active proxy has meaningful runway',()=>{
  const passive=boot(undefined);
  passive.get('settleElapsed(1800)');
  assert.ok(passive.get('s.stage')>=10,'passive auto-combat should progress beyond the first boss');
  assert.ok(passive.get('s.stage')<100,'passive baseline should not reach first rebirth without upgrades');
  const active=boot(undefined);
  let firstEligible=null,purchases=0;
  for(let second=1;second<=1800;second++){
    active.get('step(1,false)');
    if(second%5===0){
      const bought=active.get('(()=>{const eligible=Object.keys(costs).filter(k=>s.best>=unlockStage[k]&&(k!=="spd"||s.spd<50)&&s.credits>=cost(k)).sort((a,b)=>cost(a)-cost(b));return eligible.length?purchase(eligible[0]):false})()');
      if(bought)purchases++;
    }
    if(firstEligible===null&&active.get('s.stage')>=100)firstEligible=second;
  }
  assert.ok(purchases>0,'purchase proxy must make upgrade decisions');
  assert.ok(firstEligible===null||firstEligible>=600,'first rebirth must not be reachable within 10 minutes in this baseline');
  console.log('first-playable pacing guard:',JSON.stringify({passiveStage:passive.get('s.stage'),activeStage:active.get('s.stage'),firstEligible,purchases}));
});


test('30-minute low-input play proxies compare 30s and 60s optional upgrades',()=>{
  const scenarios=[];
  for(const interval of [30,60]){
    const b=boot(undefined);
    let purchases=0,firstEligible=null;
    const checkpoints=[];
    for(let second=1;second<=1800;second++){
      b.get('step(1,false)');
      if(second%interval===0){
        const bought=b.get('(()=>{const eligible=Object.keys(costs).filter(k=>s.best>=unlockStage[k]&&(k!=="spd"||s.spd<50)&&s.credits>=cost(k)).sort((a,b)=>cost(a)-cost(b));return eligible.length?purchase(eligible[0]):false})()');
        if(bought)purchases++;
      }
      if(firstEligible===null&&b.get('s.stage')>=100)firstEligible=second;
      if([300,900,1800].includes(second))checkpoints.push({second,stage:b.get('s.stage'),credits:b.get('s.credits'),kills:b.get('s.kills')});
    }
    const final=b.get('({stage:s.stage,best:s.best,credits:s.credits,kills:s.kills,rebirths:s.rebirths})');
    assert.ok(purchases>0,'optional upgrades should be affordable');
    assert.ok(Number.isFinite(final.credits)&&final.kills>0,'low-input economy stays finite and combat runs');
    assert.equal(final.rebirths,0,'no forced rebirth');
    scenarios.push({interval,purchases,firstEligible,checkpoints,final});
  }
  assert.ok(scenarios[0].final.stage>=scenarios[1].final.stage,'30s proxy should not progress slower than 60s proxy');
  console.log('30-minute low-input proxies:',JSON.stringify(scenarios));
});


test('milestone goals distinguish credit-only checkpoints from actual unlocks',()=>{
  const b=boot(undefined);
  assert.match(b.get('milestoneGoal()'),/STAGE 10.*달성 보너스 크레딧/);
  b.get('s.stage=10');
  assert.match(b.get('milestoneGoal()'),/STAGE 15.*새 기능: 에너지 증폭기/);
  b.get('s.stage=25');
  assert.match(b.get('milestoneGoal()'),/STAGE 35.*달성 보너스 크레딧/);
  b.get('s.stage=35');
  assert.match(b.get('milestoneGoal()'),/STAGE 45.*새 기능: 크레딧 주조기/);
  b.get('s.stage=85');
  assert.match(b.get('milestoneGoal()'),/STAGE 100.*새 기능: 재구성/);
});


test('stage 180 goal reports phase prerequisites rather than claiming a transition',()=>{
  const b=boot({stage:180,best:180,rebirths:0,phases:0});
  assert.match(b.get('milestoneGoal()'),/재구성 누적 2회/);
  b.get('s.rebirths=2');
  assert.match(b.get('milestoneGoal()'),/위상 전환 가능/);
  b.get('s.phases=1');
  assert.match(b.get('milestoneGoal()'),/위상 전환 달성/);
});


test('upgrade hint identifies cheapest available choice without claiming strategic optimality',()=>{
  const b=boot(undefined);
  const first=b.get('actionableGoal()');
  assert.match(first,/현재 구매 가능한 최저가 강화/);
  assert.match(first,/전투 엔진/);
  assert.doesNotMatch(first,/추천|최적/);
  b.get('s.credits=0');
  const waiting=b.get('actionableGoal()');
  assert.match(waiting,/다음 최저가 강화/);
  assert.doesNotMatch(waiting,/구매 가능$/);
  b.get('s.credits=10000;s.best=65');
  const affordable=b.get('actionableGoal()');
  assert.match(affordable,/현재 구매 가능한 최저가 강화/);
  assert.doesNotMatch(affordable,/추천|최적/);
});


test('mobile pagehide persists the latest progress without requiring beforeunload',()=>{
  const b=boot({stage:12,best:12,credits:500,lastSaved:Date.UTC(2026,10,12)});
  assert.equal(typeof b.listeners['window:pagehide'],'function');
  b.get('s.credits=9876;s.stage=14;s.best=14');
  b.listeners['window:pagehide']();
  const saved=JSON.parse(b.values.get('neon_rework_07'));
  assert.equal(saved.credits,9876);
  assert.equal(saved.stage,14);
  assert.equal(saved.best,14);
  assert.ok(saved.lastSaved>0);
  const resumed=boot(saved);
  assert.equal(resumed.get('s.credits'),9876);
  assert.equal(resumed.get('s.stage'),14);
});


test('storage quota/privacy rejection does not crash combat or silently claim save success',()=>{
  const b=boot(undefined);
  b.ctx.localStorage.setItem=()=>{throw new Error('QuotaExceededError')};
  assert.equal(b.get('save()'),false);
  assert.match(b.get('logText'),/저장 실패/);
  assert.doesNotThrow(()=>b.get('step(1,false)'));
  assert.doesNotThrow(()=>b.get('loop(1000)'));
  assert.equal(b.get('save()'),false);
});


test('manual save button reports success only after durable storage write',()=>{
  const b=boot(undefined);
  b.document.getElementById('save').onclick();
  assert.equal(b.get('logText'),'저장 완료');
  assert.ok(b.values.has('neon_rework_07'));
  b.ctx.localStorage.setItem=()=>{throw new Error('QuotaExceededError')};
  b.document.getElementById('save').onclick();
  assert.match(b.get('logText'),/저장 실패/);
  assert.doesNotMatch(b.get('logText'),/저장 완료/);
  assert.doesNotThrow(()=>b.get('step(1,false)'));
});


test('mobile background resume settles once despite repeated foreground event and pagehide',()=>{
  const start=Date.UTC(2026,10,12,0,0,0);
  const b=boot({stage:8,best:8,credits:500,lastSaved:start},start);
  b.document.hidden=true;
  b.listeners.visibilitychange();
  const hiddenSave=JSON.parse(b.values.get('neon_rework_07'));
  assert.equal(hiddenSave.lastSaved,start);
  b.setNow(start+60000);
  b.listeners['window:pagehide']();
  b.document.hidden=false;
  b.listeners.visibilitychange();
  const once=b.get('({credits:s.credits,kills:s.kills,stage:s.stage,lastSaved:s.lastSaved})');
  assert.equal(once.lastSaved,start+60000);
  b.listeners.visibilitychange();
  const twice=b.get('({credits:s.credits,kills:s.kills,stage:s.stage,lastSaved:s.lastSaved})');
  assert.deepEqual(JSON.parse(JSON.stringify(twice)),JSON.parse(JSON.stringify(once)),'duplicate visible event must not grant more rewards');
  const reloaded=boot(JSON.parse(b.values.get('neon_rework_07')),start+60000);
  assert.equal(reloaded.get('s.credits'),once.credits,'reload at the same timestamp must not pay again');
  assert.equal(reloaded.get('s.kills'),once.kills);
});

test('legacy partial save normalizes corrupt numeric and optional fields while retaining valid progress',()=>{
  const now=Date.UTC(2026,10,12,0,0,0);
  const b=boot({stage:42,best:44,credits:3210,energy:Infinity,atk:-9,spd:'bad',gen:3,
    knownUnlocks:['forge',null,42],allocation:'obsolete',autoBuy:1,
    traits:null,skillsOwned:[],skillsEquipped:[],lastSaved:now},now);
  assert.equal(b.get('s.stage'),42);
  assert.equal(b.get('s.best'),44);
  assert.equal(b.get('s.credits'),3210);
  assert.equal(b.get('s.atk'),0);
  assert.equal(b.get('s.spd'),0);
  assert.equal(b.get('s.gen'),3);
  assert.equal(b.get('s.allocation'),'balanced');
  assert.equal(b.get('s.knownUnlocks.length'),1);
  assert.doesNotThrow(()=>b.get('step(1,false)'));
  assert.equal(b.get('save()'),true);
});


test('pagehide while hidden preserves unpaid offline time across tab eviction',()=>{
  const start=Date.UTC(2026,10,12,0,0,0);
  const b=boot({stage:8,best:8,credits:500,lastSaved:start},start);
  b.document.hidden=true;
  b.listeners.visibilitychange();
  b.setNow(start+60000);
  b.listeners['window:pagehide']();
  const saved=JSON.parse(b.values.get('neon_rework_07'));
  assert.equal(saved.lastSaved,start,'pagehide must not advance settlement timestamp while hidden');
  const reloaded=boot(saved,start+60000);
  assert.ok(reloaded.get('s.credits')>saved.credits,'reload should award previously unpaid hidden progress');
  assert.equal(reloaded.get('s.lastSaved'),start+60000,'settlement checkpoint must advance after reward');
  const again=boot(JSON.parse(reloaded.values.get('neon_rework_07')),start+60000);
  assert.equal(again.get('s.credits'),reloaded.get('s.credits'),'same-time reload must not duplicate offline reward');
});

test('future-dated save and over-cap offline interval cannot create negative or unlimited rewards',()=>{
  const start=Date.UTC(2026,10,12,0,0,0);
  const future=boot({stage:8,best:8,credits:500,lastSaved:start+86400000},start);
  assert.equal(future.get('s.credits'),500);
  const long=boot({stage:8,best:8,credits:500,lastSaved:start-86400000},start);
  const capped=boot({stage:8,best:8,credits:500,lastSaved:start-7200000},start);
  assert.match(long.get('logText'),/방치 진행 7200초 반영/,'long absence must settle only 7200 seconds');
  assert.match(capped.get('logText'),/방치 진행 7200초 반영/,'cap boundary must settle 7200 seconds');
  assert.ok(Number.isFinite(long.get('s.credits'))&&Number.isFinite(capped.get('s.credits')),'capped rewards must remain finite');
  // Combat has random crit/loot outcomes, so exact credit equality across independent boots is not valid.
});


test('hidden save rejection does not stop offline settlement or falsely confirm persistence',()=>{
 const start=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:8,best:8,credits:500,lastSaved:start},start);
 b.denyWrites(true);b.document.hidden=true;
 assert.doesNotThrow(()=>b.listeners.visibilitychange());
 assert.match(b.get('logText'),/저장 실패/);
 b.setNow(start+60000);assert.doesNotThrow(()=>b.listeners['window:pagehide']());
 assert.equal(JSON.parse(b.values.get('neon_rework_07')).lastSaved,start);
 b.document.hidden=false;
 assert.doesNotThrow(()=>b.listeners.visibilitychange());
 assert.ok(b.get('s.credits')>500,'unsaved session still settles offline progress in memory');
 assert.match(b.get('logText'),/저장 실패/,'failed settlement save must warn rather than claim durability');
 b.denyWrites(false);assert.equal(b.get('save()'),true);
 const saved=JSON.parse(b.values.get('neon_rework_07'));
 assert.equal(saved.lastSaved,start+60000);
 const reload=boot(saved,start+60000);
 assert.equal(reload.get('s.credits'),saved.credits,'successful retry must not double award on reload');
});

test('battle goal stays synchronized with milestone across early, unlock and phase gates',()=>{
  for(const [stage,rebirths,phases,expected] of [
    [1,0,0,'STAGE 10'],[14,0,0,'STAGE 15'],[179,0,0,'STAGE 180'],
    [180,0,0,'재구성 누적 2회'],[180,2,0,'위상 전환 가능'],
    [180,2,1,'위상 전환 달성']
  ]){
    const b=boot({stage,best:stage,rebirths,phases,lastSaved:Date.UTC(2026,10,12,0,0,0)});
    b.get('render()');
    const battle=b.document.getElementById('battleGoal').textContent;
    assert.ok(battle.includes(expected),`stage ${stage} rebirths ${rebirths} phases ${phases}: ${battle}`);
    assert.ok(b.document.getElementById('goal').textContent.includes(battle),'battle and stats goals should agree');
  }
});


test('30-minute low-input upgrade strategies compare attack, speed and energy',()=>{
 const scenarios=[];
 for(const seed of [17,271,2026])for(const priority of ['atk','spd','gen']){
  const b=boot(undefined,Date.UTC(2026,10,12,0,0,0),seed);
  let purchases=0,firstRebirth=null;
  const checkpoints=[];
  for(let second=1;second<=1800;second++){
   b.get('step(1,false)');
   if(second%60===0){
    const bought=b.get(`(()=>{const options=Object.keys(costs).filter(k=>s.best>=unlockStage[k]&&(k!=="spd"||s.spd<50)&&s.credits>=cost(k));if(!options.length)return null;const preferred=options.includes("${priority}")?"${priority}":options.sort((a,b)=>cost(a)-cost(b))[0];return purchase(preferred)?preferred:null})()`);
    if(bought)purchases++;
   }
   if(firstRebirth===null&&b.get('s.stage')>=100)firstRebirth=second;
   if([300,900,1800].includes(second))checkpoints.push({second,stage:b.get('s.stage'),credits:Math.floor(b.get('s.credits'))});
  }
  const final=b.get('({stage:s.stage,best:s.best,kills:s.kills,credits:s.credits,atk:s.atk,spd:s.spd,gen:s.gen})');
  assert.ok(Number.isFinite(final.credits)&&final.kills>0);
  assert.ok(purchases>0,'every strategy must afford upgrades');
  scenarios.push({seed,priority,purchases,firstRebirth,checkpoints,final});
 }
 console.log('30-minute strategy comparison:',JSON.stringify(scenarios));
});


test('30-minute mixed investment paths quantify speed and production complementarity',()=>{
 const rows=[];
 for(const seed of [17,271,2026])for(const policy of ['attack-only','attack-speed','attack-energy','balanced-roi']){
  const b=boot(undefined,Date.UTC(2026,10,12,0,0,0),seed);
  const bought={atk:0,spd:0,gen:0,other:0};const checkpoints=[];
  for(let second=1;second<=1800;second++){
   b.get('step(1,false)');
   if(second%60===0){
    const choice=b.get(`(()=>{const affordable=Object.keys(costs).filter(k=>s.best>=unlockStage[k]&&(k!=='spd'||s.spd<50)&&s.credits>=cost(k));if(!affordable.length)return null;let desired='atk';if('${policy}'==='attack-speed'&&s.spd<Math.ceil(s.atk/4))desired='spd';if('${policy}'==='attack-energy'&&s.gen<Math.ceil(s.atk/4))desired='gen';if('${policy}'==='balanced-roi'){const interval=.85*Math.pow(.1/.85,Math.min(50,s.spd)/50);const speedGain=s.spd<50?interval/(.85*Math.pow(.1/.85,(s.spd+1)/50))-1:0;const attackGain=((5+(s.atk+1)*4)/(5+s.atk*4))*1.115-1;const energyGain=(1+(s.gen+1)*.015)/(1+s.gen*.015)-1;const scores={atk:attackGain/cost('atk'),spd:speedGain/cost('spd'),gen:energyGain/cost('gen')};desired=Object.keys(scores).filter(k=>affordable.includes(k)).sort((a,b)=>scores[b]-scores[a])[0]||'atk';}const target=affordable.includes(desired)?desired:affordable.includes('atk')?'atk':affordable.sort((a,b)=>cost(a)-cost(b))[0];return purchase(target)?target:null;})()`);
    if(choice)bought[choice]===undefined?bought.other++:bought[choice]++;
   }
   if([300,900,1800].includes(second))checkpoints.push({second,stage:b.get('s.stage'),credits:Math.floor(b.get('s.credits'))});
  }
  const final=b.get('({stage:s.stage,best:s.best,atk:s.atk,spd:s.spd,gen:s.gen,credits:s.credits,kills:s.kills})');
  assert.ok(Number.isFinite(final.credits)&&final.kills>0);
  rows.push({seed,policy,bought,checkpoints,final});
 }
 assert.equal(rows.length,12);
 console.log('30-minute mixed strategy comparison:',JSON.stringify(rows));
});


test('two-hour offline restore reports runtime and preserves settlement cap without auto rebirth',()=>{
 const start=Date.UTC(2026,10,12,0,0,0);
 const saved={stage:8,best:8,credits:500,autoRebirth:true,lastSaved:start};
 const t0=process.hrtime.bigint();
 const b=boot(saved,start+7200000,17);
 const elapsedMs=Number(process.hrtime.bigint()-t0)/1e6;
 const state=b.get('({stage:s.stage,best:s.best,rebirths:s.rebirths,credits:s.credits,lastSaved:s.lastSaved})');
 assert.equal(state.rebirths,0,'offline settlement must not trigger automatic rebirth');
 assert.equal(state.lastSaved,start+7200000);
 assert.ok(Number.isFinite(state.credits));
 assert.match(b.get('logText'),/방치 진행 7200초 반영/);
 console.log('two-hour offline restore benchmark:',JSON.stringify({elapsedMs:Math.round(elapsedMs),stage:state.stage,best:state.best,rebirths:state.rebirths}));
});

test('legacy automation levels above cap migrate to five without losing progression',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:72,best:90,credits:12345,cores:42,autoLevel:19,autoBuy:true,autoRebirth:true,lastSaved:stamp},stamp);
 assert.equal(b.get('s.autoLevel'),5);
 assert.equal(b.get('s.stage'),72);
 assert.equal(b.get('s.credits'),12345);
 assert.equal(b.get('s.cores'),42);
 assert.equal(b.get('s.autoBuy'),true);
 assert.equal(b.get('s.autoRebirth'),true);
 assert.equal(b.get('autoPurchaseInterval()'),3);
 assert.equal(b.get('coreCost("autoLevel")'),Infinity);
 const before=b.get('s.cores');
 b.get('buyCore("autoLevel")');
 assert.equal(b.get('s.cores'),before);
 assert.equal(b.get('s.autoLevel'),5);
 assert.match(b.document.getElementById('coreUpgrades').children.find(n=>n.dataset.core==='autoLevel').lastElementChild.textContent,/최대 레벨 달성/);
});
test('automation research level five refuses additional purchases',()=>{
 const stamp=Date.UTC(2026,10,12,0,0,0);
 const b=boot({autoLevel:5,cores:1e6,lastSaved:stamp},stamp);
 b.get('buyCore("autoLevel")');
 assert.equal(b.get('s.autoLevel'),5);
 assert.equal(b.get('s.cores'),1e6);
});


test('auto-buy prioritizes highest unlocked affordable tier, not cheapest cost',()=>{
 const b=boot({stage:65,best:65,credits:80000,autoLevel:1,autoBuy:true,lastSaved:Date.UTC(2026,10,12,0,0,0)});
 const before=b.get('({reactor:s.reactor,atk:s.atk,credits:s.credits})');
 b.get('step(10,false)');
 const after=b.get('({reactor:s.reactor,atk:s.atk,credits:s.credits})');
 assert.equal(before.reactor,0);
 assert.ok(after.reactor>=1,'reactor tier (stage 65) must win over cheap unlocked upgrades');
 assert.ok(Number.isFinite(after.credits)&&after.credits>=0);
});


test('30-minute integrated low-input auto-combat with gear, skills, traits and tier-first auto-buy remains finite',()=>{
 const start=Date.UTC(2026,10,12,0,0,0);
 const b=boot({stage:20,best:65,credits:200000,autoLevel:1,autoBuy:true,
  heroLevel:60,traitPointsEarned:59,traits:{precision:5,haste:3,bounty:3,energy:3},
  weapon:{tier:1,stage:20},skillsOwned:['overload','chain','bountySkill'],
  skillsEquipped:['overload','chain','bountySkill'],skillLevels:{overload:3,chain:2,bountySkill:2},
  lastSaved:start},start,271);
 const checkpoints=[];
 const initial=b.get('({stage:s.stage,best:s.best,reactor:s.reactor,kills:s.kills})');
 for(let second=1;second<=1800;second++){
  b.get('step(1,false)');
  if(second%300===0)checkpoints.push(b.get('({stage:s.stage,best:s.best,kills:s.kills,credits:s.credits,energy:s.energy,reactor:s.reactor,heroLevel:s.heroLevel})'));
 }
 const last=checkpoints.at(-1);
 assert.equal(checkpoints.length,6);
 assert.ok(last.kills>initial.kills,'automatic battle must defeat enemies without input');
 assert.ok(last.best>=initial.best,'highest stage must not regress');
 assert.ok(last.reactor>=initial.reactor,'auto-buy must not undo purchased upgrades');
 for(const point of checkpoints)for(const field of ['stage','best','kills','credits','energy','reactor','heroLevel'])
  assert.ok(Number.isFinite(point[field])&&point[field]>=0,field+' must remain finite and nonnegative');
 assert.equal(b.get('s.rebirths'),0,'the scenario must not silently rebirth');
 console.log('30-minute integrated low-input scenario:',JSON.stringify({initial,checkpoints}));
});
