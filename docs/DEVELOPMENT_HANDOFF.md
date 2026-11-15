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


## 2026-11-15 latest handoff — use this instead of the older 2026-11-14 stale steps
- **Authoritative decision:** `docs/PROJECT_DECISIONS.md` — gameplay priorities outrank new costly high-end art; preserve the seven core systems and existing artwork, freeze phase/new-currency expansion, keep cheap combat feedback.
- **Current working branch:** `integration/reconcile-main-redesign-20261114`, draft PR #2. Source game remains active on this branch, **not merged to main**. Safety branch `backup/neon-priority-baseline-20261115` points to `1e2719d4`.
- **Reconciliation:** `8b414c25` explicitly brought latest main ancestry and automation records without reverting the manual branch's no-free-rebirth-stage-skip rule or three independent timed quests. Recheck `main` head each session because hourly automation may add new commits.
- **P0 complete (code + tests):** test normalization `083a0432`; old credit cache cap/data-loss and abnormal saved skill levels fixes `3608411e`; three new regressions `5e8ea185`. Latest PR save CI **56/56 PASS**, run `43705486087`; portrait CI **PASS**, runs `43705486090` (PR) and `43705481934` (push). No Android execution or live Pages parity verified.
- **Next step:** **P0/P1 auto-rebirth and phase objective compatibility**. Source issue is `gainCore()>=Math.max(3,Math.ceil(s.totalCores*.15))` vs UI describing `15% OR 3`. When enabled, auto-rebirth can reset from STAGE179 before phase STAGE180 is reached. Preserve user agency and avoid accidental automatic reset, test staged save conditions and multi-rebirth simulations. Then optimize skill variety/hero XP, ~60min first rebirth, mobile UI, simple feedback before high-end art.
- **Documentation:** full 10-step audit and post-audit CI analysis in `docs/audit/2026-11-15-full-game-review-checklist.md`; actual verification evidence here and in GitHub Actions. Previous statement 'automation paused' was historical and must not be treated as current fact; check live automation.
- **Reporting:** changes actually committed, CI pass/fail, unverified mobile, unchanged main status and provisional first-playable readiness 58%. Do not invent GitHub deployment or screenshot proof.
