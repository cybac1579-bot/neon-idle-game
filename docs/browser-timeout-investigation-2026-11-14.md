# 브라우저 시간 초과 조사 (2026-11-14)

## 실제 확인
- 로컬 Chromium 실행 파일 `/usr/bin/chromium`과 Node 22는 존재하지만 로컬 `require('playwright')`는 실패함(패키지 미설치).
- 별도 로컬 판타지 원화 미리보기의 `site/hero_fantasy_fullbody.webp`(466,590 bytes)는 존재하고 HTML이 이를 참조함.
- 기존 브라우저 검사 코드에는 `hero_swordswoman_219.webp`의 219×220px만 허용하는 하드코딩이 있었음. 새 원화가 들어오면 잘못 실패하는 검사임.
- 로컬 Chromium 헤드리스 스크린샷 시도는 외부 실행 제한에 걸려 완료되지 못했음. **성공 스크린샷이나 실제 화면 검증으로 보고하지 않는다.**
- GitHub Actions는 이미 Playwright/Chromium 설치 및 브라우저 검사 환경을 갖추고 있음.

## 이번 수정
- `tests/redesign-browser.test.cjs`: 기존 219px 원화와 신규 `hero_fantasy_fullbody.webp`를 구분하여 검사. 신규 에셋이면 최소 1000×1400px 조건 적용. 파일 자체가 실제로 로드됐는지 확인하는 검사는 유지.
- `.github/workflows/redesign-checks.yml`: 브라우저 테스트 실행에 120초 제한과 종료 후 강제 정리(10초) 적용. 워크플로 전체 제한은 기존 12분 유지.
- 이 수정은 **검증 인프라 개선**이며 신규 바이너리 원화의 GitHub 업로드나 실제 브라우저 검증 성공을 의미하지 않음.

## 후속 조치
1. CI 통과/실패 결과와 오류 위치를 확인해 코드 오류와 실행 시간 초과를 구분한다.
2. 반복되는 타임아웃이면 Chromium 설치/시작/페이지 로드/게임 준비/스크린샷 단계별 소요 시간을 기록하고, 해당 단계에만 재시도 정책을 적용한다.
3. 신규 원화 바이너리 개발 브랜치 등록 후 실제 이미지 로드/크기/전투 화면 캡처 검증.
4. 브라우저 검증과 실제 휴대전화 플레이 검증은 별도로 기록한다.

## 단계별 실측 결과 (후속 회차)
- GitHub Actions 실행 `43512863669` / 커밋 `2413739fad1e4ca3fd2ec0ee7b4d912534e0687e` **성공**. 브라우저 결과 artifact ID `14080140232`를 실제 다운로드하여 `browser-timings.json` 확인.
- 서버 준비 6ms, Chromium 시작 300ms, 페이지 로드 473ms, 게임 준비 504ms, 전투 화면 캡처 1510ms, 간소화 화면 캡처 2987ms, 저장 후 새로고침 4094ms, 전체 검증 완료 **4111ms** (모두 시작부터 누적 시간).
- 브라우저 오류 로그 및 이미지 캡처 파일이 artifact에 포함됨. 120초 제한에 도달하지 않았음.
- **판단:** GitHub CI에서 이번 실행의 시간 초과는 재현되지 않았음. 이전 로컬 Chromium 실행 시간 초과의 근본 원인은 아직 특정하지 못했으므로 완전 해결로 보고하지 않는다.
- 신규 판타지 원화는 별도 로컬 ZIP에 존재하지만 GitHub 개발 브랜치의 바이너리 에셋에는 아직 없음. CI는 현재 레거시 원화를 검사한 것임.

## 로컬 Chromium 재현 및 바이너리 이관 관문 (추가 회차)
- `neon-fantasy-art-local-preview.zip`의 실제 `site/hero_fantasy_fullbody.webp`를 확인함(1346×1602 RGBA, HTML src 참조).
- 로컬 시스템 `/usr/bin/chromium`은 존재하지만 Playwright Node 모듈은 설치되지 않음.
- `chromium --headless --no-sandbox --disable-gpu --disable-dev-shm-usage --disable-software-rasterizer --window-size=390,844 --screenshot=...` 실행을 `timeout 18s`로 제한해 재시도했으나 종료 코드 **124(시간 초과)**, 스크린샷 미생성. DBus/zygote 관련 로그만 확보. **로컬 Chromium은 여전히 불안정**, CI Chromium 4.11초 성공과 분리해 판단.
- 로컬 ZIP은 GitHub 브랜치에 자동 동기화되지 않음. 현재 GitHub 브랜치에는 `hero_fantasy_fullbody.webp`가 없으므로 CI가 신규 원화를 렌더링했다고 주장할 수 없음.
- 다음: GitHub API에 바이너리 bytes를 전달할 수 있는 경로를 확보해 원화 blob 등록 후 개발 브랜치에 연결. 그다음 CI 캡처/화면 확인. 로컬 브라우저에 무제한 대기하지 않는다.

## 다중 세로 해상도 검증 (후속 회차)
- 브라우저 검사 `16df7e135d0356d0fc56a91ea6ba6029917d63f2` / Actions 실행 `43514509490` **성공**.
- 테스트에 360×780, 390×844, 412×915 CSS px 세로 화면 추가. 가로 넘침, 전투 공간 높이, 캐릭터/적 영역 배치 검사 통과.
- artifact `14080146876` 실제 다운로드. 세 해상도 스크린샷과 브라우저 진단 파일 확인. **신규 판타지 원화는 아직 GitHub에 없으므로 검증 이미지는 레거시 주인공 기준.**
