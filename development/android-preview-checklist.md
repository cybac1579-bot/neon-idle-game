# 네온 방치단 — 모바일 HTTPS 테스트 배포 체크리스트

현재 자동 빌드 산출물은 GitHub Actions `neon-idle-portrait-web-preview` 아티팩트의 **정적 웹 파일**이다. APK가 아니며, 아티팩트를 다운로드해 로컬 `file://`로 여는 방식은 저장·설치 동작 검증에 적합하지 않다.

## 배포 준비
1. 검증 완료된 Actions 실행의 `neon-idle-portrait-web-preview` 아티팩트를 사용한다. `dist/neon-idle/` 내부 파일들이 웹사이트 루트 또는 프로젝트 하위 경로에 그대로 배치되어야 한다. 별도 상위 디렉터리가 붙으면 시작 URL을 조정한다.
2. **HTTPS**로 제공하고 `index.html`, `game.js`, `cosmetics.js`, `portrait-integration.css`, `manifest.webmanifest`, `app-icon-192.png`, `app-icon-512.png`가 모두 200 응답인지 확인한다.
3. `manifest.webmanifest`은 `application/manifest+json` 또는 JSON으로 제공한다. `start_url`과 `scope`는 상대 경로이므로 하위 경로 배포도 지원한다. 자동 테스트는 HTTP localhost의 프로젝트 경로를 흉내 내어 검사하지만 **실제 HTTPS 인증서나 안드로이드 설치 여부를 증명하지 않는다**.
4. 공개 배포나 GitHub Pages 설정 변경은 별도 결정 전까지 수행하지 않는다. 테스트 링크를 만들 경우 공개 접근 범위와 저장 데이터 취급을 먼저 확인한다.

## 갤럭시 S25+ 세로 실기기 점검
- Chrome에서 HTTPS 테스트 링크를 열고 5개 탭, 스크롤, 글자 잘림, 터치 영역을 확인한다.
- 전투 방치 → 성장 구매 → 심층 선택 → 저장 → 브라우저 완전 종료/재실행을 확인한다.
- Chrome 메뉴의 홈 화면 추가/앱 설치 가능 여부, 실행 시 주소창 유무, 앱 아이콘을 확인한다. 브라우저·OS 버전에 따라 설치 UI가 달라질 수 있다.
- 30분 플레이에서 성장 목표, 첫 재구성 접근성, 심층 난이도, 구매 대기 체감, 발열·배터리·프레임 저하, 저장 오류를 기록한다.
- 저장 데이터는 브라우저의 **해당 사이트 origin**에 묶인다. 주소·도메인·프로토콜 변경 또는 사이트 데이터 삭제 시 기존 진행이 이전되지 않을 수 있다. 브라우저 저장소가 항상 영구 보존되는 것도 아니다.

## 합격 기준
실제 기기에서 30분 동안 치명적 오류 없이 플레이하고, 탭·강화·심층·재구성 동작 및 재실행 저장 복구를 확인해야 **실기기 1차 플레이 검증 완료**로 보고한다. CI 통과만으로 실기기 검증 완료라고 기록하지 않는다.

## 수동 GitHub Pages 테스트 배포 (미실행)
- 리포지터리는 공개 저장소이며 GitHub API에서 `has_pages=true`로 확인되었다. **이는 현재 테스트 게임이 실제 공개되어 있다는 증거가 아니다.** 기존 Pages 콘텐츠가 있을 수 있으므로 덮어쓰기 전에 반드시 확인한다.
- `.github/workflows/manual-pages-preview.yml`은 `workflow_dispatch` 전용이다. 사용자가 공개 테스트 배포를 명시적으로 승인한 후에만 실행한다. 입력란에 `PUBLISH`를 입력해야 실행되며, Node 회귀 테스트 → 정적 웹 빌드 → 배포 패키지 Chromium 검증 → Pages 배포 순서다.
- GitHub Actions의 수동 실행 UI는 워크플로 파일이 기본 브랜치에 존재해야 보이는 경우가 있다. 현재 통합 브랜치에만 추가했으므로 **배포 가능 상태로 확정하지 않는다**. 기본 브랜치 반영 여부, Pages 배포 소스(GitHub Actions), `github-pages` 환경 보호 규칙과 공개 범위를 검토해야 한다.
- GitHub Pages는 일반적으로 공개 URL이다. 기존 Pages 사이트를 대체할 수 있고 기존 사용자 데이터는 origin과 경로 조건에 영향을 받는다. 승인 전에는 실행·병합하지 않는다.

## PC에서 비공개로 먼저 실행하기
1. 통합 브랜치 프로젝트를 내려받아 Node.js 22와 Chromium/Playwright 의존성을 준비한다. 이미 성공한 Actions 빌드의 `neon-idle-portrait-web-preview` 아티팩트만 받은 경우에는 `dist/neon-idle/`에 압축을 풀고 프로젝트의 `automation/local-preview.cjs`를 함께 사용한다.
2. 소스에서 빌드할 때: `npm install --no-save --no-package-lock playwright@1.56.1`, `npx playwright install chromium`, `node automation/build-mobile-web.cjs` 순으로 실행한다.
3. `node automation/local-preview.cjs` 실행 후 터미널에 출력된 `http://127.0.0.1:<포트>/` 주소를 **같은 PC 브라우저**에서 연다. 서버는 127.0.0.1에만 바인딩하고 종료는 Ctrl+C다. 포트는 4173으로 고정해 동일한 브라우저의 로컬 저장 origin을 유지한다. 다른 프로그램이 이미 해당 포트를 사용 중이면 오류가 출력된다.
4. 이 경로는 공개 배포나 갤럭시 테스트를 대신하지 않는다. 모바일 설치와 30분 실기기 검증에는 별도 승인된 HTTPS 경로가 필요하다.
