# 독립 용병단 원형 — 스마트폰 오프라인 단일 파일 테스트

작성: 2026-11-18. 기존 웹 Preview의 Vercel API 일일 배포 한도 때문에, 검증 전용 독립 실행 HTML 경로를 별도 제공한다. **공개 `main`/Pages/기존 게임 저장을 바꾸지 않는다.**

## 파일 생성 및 획득
- 단일 파일 생성: `node scripts/build-expedition-standalone.cjs`.
- 산출물: `artifacts/expedition-standalone/neon-expedition-offline.html`, `README-KO.txt`.
- 테스트용 파일은 별도 `site/index.html`이 아니라 `site/expedition.html` + `expedition-engine.js` + `expedition-field.js` + `expedition-app.js`를 한 파일에 포함한 빌드 결과이다.
- GitHub Actions **Integration portrait browser smoke** 워크플로의 성공한 실행 아래 **Artifacts → `neon-expedition-offline-playable`**를 내려받아 ZIP을 압축 해제하면 된다. 액세스 가능한 저장소 구성원 로그인 필요. 아티팩트 기본 보관기간 **30일**.
- 휴대폰 파일 앱에서 `neon-expedition-offline.html`을 선택해 HTML을 실행하는 브라우저로 열어 본다. 문자 소스만 보이거나 열리지 않으면 해당 브라우저에서 로컬 HTML 실행을 지원하지 않을 수 있다. 이 경우 파일을 고집하지 말고 HTTP(S) 테스트 배포 경로를 다시 마련해야 한다.
- 빌드 SHA는 HTML `meta[name=neon-expedition-build]`과 하단 안내, README에 표시. `local-source`로 표시되면 CI가 아닌 로컬 빌드다. 이전 Vercel 고정 Preview SHA `c8bd6bc2`는 후속 환생 경제·결과·저장 백업이 반영되지 않은 오래된 코드다.

## 저장과 파일 백업
- `네온 방치단` **옛 게임 키 `neon_rework_07`는 수정하지 않는다.** 독립 용병단 키는 `neon_expedition_prototype_v1`.
- Chrome/삼성 인터넷 등 브라우저의 `file://` 자동 저장 지원 여부는 운영체제 정책·앱 열기 경로에 따라 달라질 수 있다. 단일 파일 저장 상태는 `https://` 사이트의 저장 공간과 **자동 공유되지 않는다**.
- 도감 탭의 **전체 저장 백업**은 수집한 유물, 지휘관 레벨, 코어, 용병, 자동 구매 설정, 탐사 기록 등을 포함하는 `neon-expedition-full-save-YYYY-MM-DD.json`을 파일로 내려받는다. **저장 파일 복원**으로 해당 파일을 다시 선택해 복원할 수 있다.
- 복원 전에 해당 진행도의 최고 거리·유물 종류·환생 횟수를 표시하고, 사용자가 확인할 때만 현재 원형 저장을 덮어쓴다. **복원한 파일의 옛 시간차로 오프라인 보상을 중복 계산하지 않도록** 가져오는 시각을 현재로 설정한다. 형식 검증, 최대 4MB 제한, `E.normalize` 데이터 검증을 거친다.
- **내 플레이 기록 JSON 내보내기**는 공유/분석용 기록만 모은 별도 포맷이다. *전체 저장 백업*과 혼동해 복원에 사용하지 않는다.
- 파일은 사용자가 버튼으로 요청하거나 직접 고르지 않는 한 서버로 전송하지 않는다.

## 자동화 검증
- 기존 `.github/workflows/integration-portrait.yml`에서 독립 원형 엔진/반복 환생/예전 게임 회귀 통과 후 단일 HTML을 생성하고, 모바일 크기 360/390/412px의 Chromium을 네트워크 차단 상태에서 `file://`로 실행한다.
- 별도 `tests/expedition-offline-browser.test.cjs`가 화면 표시, 자동 저장·전체 백업 JSON 다운로드·복원·새로고침 유지, 기존 게임 키 미변경 및 외부 HTTP 요청이 없음을 검사한다.
- **한계:** Chromium PC 브라우저를 이용한 파일 URL 검증이지 실제 Galaxy S25+ 파일 앱/Chrome/삼성 인터넷/Android 배터리 제한 테스트가 아니다. 실기기에서 정상 실행/장기간 저장 유지 여부는 사용자가 직접 확인해야 한다.
- 빌드·오프라인 브라우저 검증이 성공한 워크플로에서만 다운로드 아티팩트가 제공된다.

## 사용자가 체감해야 할 핵심
1. 5~10분 동안 자동 전진과 용병/경제 강화, 처음 유물 발견이 자연스러운지 확인.
2. 최소 10거리 보스 격파 이후 선택해서 귀환 → 화면에 새 출발의 화력/체력/보급 증가가 얼마나 명확한지 확인.
3. 두 번째 탐사에서 전보다 빨라진 효과, 유물 도감 새로운 깊이의 기대감, 최소한의 반복 조작 여부를 확인.
4. 앱을 종료하고 재열었을 때 저장이 남는지 확인. 기록이 중요한 경우 전체 저장 백업 JSON을 수시로 만들기.
5. 실제 플레이 분석을 원하면 도감의 **내 플레이 기록 JSON 내보내기**를 사용해 직접 파일 공유. 사용자 체감 피드백도 함께 남기기.

확정 전제: 더 많은 콘텐츠, 새 재화, 강제 시간 제한, 환생 횟수 무료 보너스 등은 실제 장기 재미 검증 전 추가하지 않는다.


## 최신 검증된 아티팩트 (실제 생성)
- GitHub Actions 실행 ID: `44143464585`, **SUCCESS**
- 코드 SHA: `43a0803e41184f488a96e2377901fbcecae79920`
- 다운로드: [GitHub Actions 아티팩트](https://github.com/cybac1579-bot/neon-idle-game/actions/runs/44143464585/artifacts/14356485280)
- Artifact id: `14356485280`, `neon-expedition-offline-playable`, 만료 예정: **2026-12-17 18:04 UTC**
- 엔진 테스트 **86/86**, 360·390·412px Chromium 정상 동작, `file://` 네트워크 차단·백업/복원/새로고침 PASS.
- **실기기 테스트는 별도 단계**이며 실행 가능성만 엔진과 데스크톱 Chromium으로 확인했다. ZIP 내 `neon-expedition-offline.html`을 실행하면 된다.
