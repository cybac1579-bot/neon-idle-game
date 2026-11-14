# 네온 방치단 — 다음 대화/개발 회차 진입점
Updated 2026-11-14.

1. Read docs/PROJECT_DECISIONS.md (latest user-approved design) and docs/IMPLEMENTATION_STATUS.md (verified implementation). Do not assume this handoff is newest.
2. Query live GitHub main SHA, development/reference-redesign, integration branch and compare results; inspect CI/workflows, automation/ records, latest commits and deployment. Check the task named '네온 방치단 자동 개선' is still paused.
3. Compare new findings to this snapshot. Protect main, existing deployment, save keys and user data.
4. On development/main-redesign-integration-20261114, transplant only necessary CSS/DOM/visual code after checking latest main architecture. Preserve gameplay/economy/save/offline systems. Do not assume a visual branch is mergeable.
5. Run existing main regression suite, redesigned mobile browser tests, save/restore/offline/prestige tests, and inspect actual character asset loading and portrait screenshots. Fix failures before adding features.
6. Build and test 60-minute efficient-first-prestige simulation including skills, equipment, traits and other multipliers; then 30-minute engagement assessment.
7. Update status matrix with exact SHAs, commands, pass/fail evidence, open risks and distinct redesign/first-playable percentages. Record each newly confirmed decision with its superseded version.
8. Resume paused auto-development ONLY after safe integration, CI and regression verification, and record the actual change. No background-work claims without scheduled task.
9. Report briefly: changes actually committed, tests actually run, remaining risks, next priority. Do not call unverified work complete.

Last verified: integration branch created from main dbfb7a759f2f4d4947db4fdb3fc18c5bbbf03fb1; redesign ahead 108 behind 187; automation paused. No gameplay transplant or integration tests performed.
