# 백업/다운로드 실측 점검 (2026-11-13)

## 확인한 범위
- `main`의 `automation/README.md`와 `automation/verification-log.md`가 GitHub에서 읽히는 것을 확인했다. 이는 **버전 관리 기록**이지 전체 프로젝트 백업 ZIP의 복원 검증은 아니다.
- `development/reference-redesign`의 Actions run `43438487059` 성공을 확인했다.
- 해당 실행의 `redesign-browser-results` artifact ID `14045900058` 다운로드 성공. 파일 크기 **2,688,462바이트**, ZIP 항목 **7개**, CRC 테스트 **통과**.
- ZIP 내용: `battle-attack.png`, `battle-compact-portrait.png`, `battle-portrait.png`, `browser-diagnostics.json`, `browser-errors.json`, `growth-drawer-portrait.png`, `stats-drawer-portrait.png`.
- **중요:** 이 ZIP은 브라우저 스크린샷/진단 결과만 담긴 테스트 산출물이며 **게임 전체 소스 백업이 아니다**.
- 최신 `main` Actions run `43428819583`의 artifact 목록은 비어 있었다. 따라서 자동화에서 **전체 프로젝트 ZIP 백업을 만들고 다운로드 가능하게 보관한다는 사실은 확인되지 않았다**.
- GitHub 저장소 코드와 커밋 기록은 존재하지만, 현재 점검에서는 GitHub 전체 소스 ZIP을 다운로드하여 재압축/복원 검증하지 못했다. **전체 백업 다운로드/복원 성공으로 보고 금지**.

## 브라우저 스크린샷 점검
- `battle-compact-portrait.png`(780×1688px)을 직접 열어 확인: 세로 전투 공간은 확보됐으나 캐릭터는 저해상도·흐릿함, 적은 기존 기계형 SVG, 화면 하단의 불필요한 임시 안내 문구가 남아 있다.
- 신규 판타지 전신 원화는 아직 브랜치의 바이너리 게임 에셋에 적용되지 않았다.

## 후속 조건
1. 별도 **전체 소스 백업**(최소 `site/`, `tests/`, 워크플로, 문서)을 만들고 저장 위치/버전/해시를 기록.
2. 생성된 전체 백업을 실제 재다운로드하고 ZIP CRC 및 핵심 파일 포함 여부 검사.
3. 압축 해제 후 브라우저 테스트/실행까지 확인한 경우에만 복원 검증 성공으로 표시.
4. 그래픽 개편 브랜치와 `main`을 혼동하지 않고 백업 대상/기준 SHA를 명시.
