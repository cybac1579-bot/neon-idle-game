// Strict, independent quality gates. Run: node --test automation/quality-gates.test.cjs
// Intentionally RED against known defects until the underlying game rules are corrected.
// Never rewrite these tests to accept the current implementation as the specification.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../site/game.js'),'utf8');

function extractFunction(name){
  const start=src.indexOf('function '+name+'(');
  assert.notEqual(start,-1,'function '+name+' must exist');
  const brace=src.indexOf('{',start);
  let depth=0;
  for(let i=brace;i<src.length;i++){
    if(src[i]==='{')depth++;
    if(src[i]==='}'&&!--depth)return src.slice(start,i+1);
  }
  throw Error('Unclosed function: '+name);
}
test('quality gate itself detects a deliberately broken invariant',()=>{
  const valid=(previous,cleared,next)=>next<=cleared+1||next===previous+1;
  assert.equal(valid(10,10,20),false,'mutation: skipping uncleared stages must fail');
  assert.equal(valid(10,20,11),true);
});
test('hero experience must not grow exponentially faster than level costs',()=>{
  const defeat=extractFunction('resolveEnemyDefeat');
  const xp=src.match(/const xpNeeded=level=>([^;]+);/);
  assert.ok(xp,'level cost formula must remain inspectable');
  assert.doesNotMatch(defeat,/Math\.pow\(1\.08,s\.stage-1\)/,
    'known defect: exponential stage XP overpowers polynomial level costs; redesign and test measured trajectories');
});
test('stage acceleration must be bounded by previously cleared stages, not rebirth count alone',()=>{
  const defeat=extractFunction('resolveEnemyDefeat');
  assert.doesNotMatch(defeat,/const jump=Math\.max\(1,Math\.min\(12,1\+s\.rebirths\*3\)\)/,
    'known defect: rebirth-count jump skips first-time stages');
  assert.match(defeat,/bestCleared|clearedRecord|previouslyCleared/,
    'accelerated stages must reference a real previously cleared record');
});
test('quality gates cover core high-risk systems with explicit contracts',()=>{
  const required=['resolveEnemyDefeat','rebirth','phase','startDeepEncounter','tickDeepEncounter','step','settleElapsed'];
  for(const name of required)assert.ok(src.includes('function '+name+'('),'missing critical function: '+name);
});
