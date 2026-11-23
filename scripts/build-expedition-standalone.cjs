'use strict';
// Build a private, single-file, offline-only test entry point.
// Not a new public deployment or a substitute for Android device validation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const site=path.join(root,'site');
const outDir=path.join(root,'artifacts','expedition-standalone');
const out=path.join(outDir,'neon-expedition-offline.html');
const source=fs.readFileSync(path.join(site,'expedition.html'),'utf8');
const sha=(process.env.GITHUB_SHA||'local-source').replace(/[^a-z0-9]/gi,'').slice(0,12);
const files=['expedition-engine.js','expedition-art.js','expedition-field.js','expedition-ui.js','expedition-app.js'];
let compiled=source;
const cssTag='<link rel="stylesheet" href="./expedition-ui.css" data-expedition-skin="prototype-v1">';
assert.equal(compiled.split(cssTag).length,2,'expected exactly one replaceable prototype stylesheet');
const css=fs.readFileSync(path.join(site,'expedition-ui.css'),'utf8');
assert.ok(!css.includes('</style'),'CSS must not close the inline HTML style tag');
compiled=compiled.replace(cssTag,'<style data-inline-skin="prototype-v1">'+css+'</style>');
for(const name of files){
 const tag='<script src="./'+name+'"></script>';
 assert.equal(compiled.split(tag).length,2,'exactly one expected script include '+name);
 const code=fs.readFileSync(path.join(site,name),'utf8');
 // HTML parser must not prematurely close the inlined JS.
 compiled=compiled.replace(tag,'<script data-inline-source="'+name+'">\n'+code.replace(/<\/script/gi,'<\\/script')+'\n</script>');
}
compiled=compiled.replace('</head>',
 '<meta name="neon-expedition-build" content="'+sha+'"><meta name="neon-expedition-package" content="offline-standalone-v1"></head>');
compiled=compiled.replace(
 '독립 플레이 테스트 · 기존 게임 및 저장 분리',
 '비공개 독립 테스트 파일 · 오프라인 단일 HTML · 빌드 '+sha+' · 최종 그래픽 아님'
);
assert.ok(compiled.includes('오프라인 단일 HTML · 빌드 '+sha),'stamp must match the footer label');
assert.ok(!/<script[^>]+\bsrc=/i.test(compiled),'all scripts should be inline');
assert.ok(!/<link[^>]+\bhref=\s*["']https?:/i.test(compiled),'no external stylesheets');
assert.ok(compiled.includes('neon_expedition_prototype_v1'),'isolated save key must be retained');
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(out,compiled,'utf8');
fs.writeFileSync(path.join(outDir,'README-KO.txt'),[
 '네온 방치단 · 독립 용병단 오프라인 플레이 테스트',
 '기준 커밋: '+sha,
 '',
 '1. GitHub Actions의 neon-expedition-offline-playable 아티팩트 ZIP을 내려받아 압축을 해제해.',
 '2. neon-expedition-offline.html 파일을 Galaxy S25+ 파일 앱에서 Chrome/삼성 인터넷 등 HTML을 실행하는 브라우저로 열어.',
 '3. 데이터 연결 없이도 게임의 전투·성장·유물·환생은 파일 안에서 작동하도록 묶었어.',
 '4. 유물 → 탐사 저장 데이터 백업·복원 → 전체 저장 백업을 눌러 JSON 파일로 진행 상태를 보관해.',
 '5. 파일 경로, 브라우저 또는 웹 주소를 바꾸면 자동 저장 공간도 달라질 수 있어. 저장 파일 복원으로 불러올 수 있어.',
 '6. 자동 저장 불가 경고가 보이면 현재 플레이를 새로고침하기 전에 유물 탭 → 전체 저장 백업 JSON을 받아 둬. 경고가 없어도 파일 이동 전에는 백업을 권장해.',
 '7. 30분 실기기 테스트: 처음/15분/30분에 전투 관전과 성장·유물 수집을 확인하고, 중간에 앱을 전환했다가 복귀해 봐. 자동 구매·상자 자동 개봉은 직접 선택해.',
 '8. 유물 → 내 플레이 기록 JSON 내보내기는 분석용 기록이고, 전체 저장 백업 JSON과는 달라. 30분 종료 후 두 파일을 구별해 보관해.',
 '',
 '주의: Android 실제 기기 동작은 아직 별도로 확인되지 않았어.',
 '파일 HTML에 대한 브라우저 저장 허용 여부는 기종·브라우저 정책에 따라 달라질 수 있으므로 전체 저장 백업을 권장해.',
 '공개 게임(main/Pages), 기존 게임 저장(neon_rework_07)과는 분리된 테스트 버전이야.',
 ''
].join('\n'),'utf8');
console.log(JSON.stringify({artifact:'neon-expedition-offline-playable',
 sourceSha:sha,bytes:Buffer.byteLength(compiled),files:['neon-expedition-offline.html','README-KO.txt'],
 allScriptAssetsEmbedded:true,saveKey:'neon_expedition_prototype_v1'}));
