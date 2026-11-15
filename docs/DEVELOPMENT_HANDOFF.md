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


## 2026-11-15 latest handoff after phase guard (supersedes earlier P0/P1 next step)

- Manual PR #2 latest gameplay commit `6d3d9e31`: `phaseFocus` opt-in ON prevents automatic reconstruction from interrupting stage 180 objective after two prior reconstructions. OFF continues normal auto-rebirth; old saves default OFF. Core award threshold remains **AND**, display fixed. No auto-purchase/phase-button changes.
- PR CI: saved-game regression `43706407957` **60/60 PASS** and portrait browser `43706407929` **PASS**. Four added tests. Main branch, Pages deployment and real Android **unchanged/unverified**.
- Earlier P0 save preservation and skill cap fixes remain present (`3608411e`) and included in 60 tests. Safety branch `backup/neon-priority-baseline-20261115` preserved. Continue to check drift of main/automation records before new work.
- **NEXT:** gameplay-focused P1 step — diversify and assess actual skill effects, XP/slot unlock pacing, early/midstage reward choices. Keep high-quality new illustration work deferred, reuse existing character/enemy assets and simple low-cost feedback. Verify with original-code simulations and CI. Afterwards first prestige ~60m and 55–65 wall.
- User's explicitly confirmed high-level priorities are in `docs/PROJECT_DECISIONS.md`. The opt-in phaseFocus is an implementation decision subject to play feedback, not a new user-specified hard rule.


## 2026-11-15 latest P1 handoff — first-skill choice verified

- Current manual PR #2: STAGE20 optional first-skill selection per rebirth plus a 4th XP-focused `trainingSkill` (12s ×2 hero XP /14s cycle Lv1). Implementation `065f4651`, regression assertion correction `7f2368a6`. Keep 5-slot unlock levels and inheritance, RNG drops, existing saved heroes, and low-art-development priority. `main` and live Pages not deployed.
- PR CI **64/64 save regression PASS** run `43707318776`, portrait Chromium **PASS** run `43707318779`. First implementation had 1 false failure from a fake-DOM assertion and was corrected; all 4 new tests now pass.
- Actual original-JS .25s seeded simulation: 30min hero LV 8–9 with Training vs LV7 with Overload under three manually purchased runs; Training usually delays the first Stage100/rebirth relative to damage choice. Do not overclaim based on three seeds or equate simulation with real mobile.
- **NEXT:** address differentiation of Overload versus Chain, improve early skill/reward feedback and timing of second skill slot without changing the confirmed LV10/25/40/60 thresholds; then run complete 60min optimal-ish economy/multi-strategy simulation and fix STAGE55–65 slowdown. Avoid expensive new artwork and new phase expansion. Check live `main` automation drift before writing/merging.
- Canonical records: `docs/PROJECT_DECISIONS.md` (approved versus provisional), `docs/IMPLEMENTATION_STATUS.md` (implementation+evidence), `docs/audit/2026-11-15-full-game-review-checklist.md` (original 10-stage audit plus follow-ups). Draft PR stays unmerged pending actual Galaxy S25+ test and safe integration.


## 2026-11-15 latest handoff — actual mobile browser playthrough automation is green

- A **new browser-interactive playthrough CI** exists in `tests/playthrough-browser.test.cjs` and the portrait workflow; unlike game-logic-only scripts, it launches Chromium with `isMobile:true`, `hasTouch:true`, DPR2 at 360/390/412 CSS px, **taps visible UI controls**, reloads saves, and takes actual game screenshots. Commit `b55ebd27` initial test, corrected hidden-reset screenshot target in `46aae303`. No production game/assets changed this step.
- First run failed on one *screenshot automation error* after successful 3-width gameplay tests; final PR browser CI **PASS** run `43708855576`; push browser CI **PASS** `43708852676`; save regression **64/64 PASS** run `43708855567`. Never claim first attempt passed.
- Covered: touch growth button, STAGE20 reached with actual logic in accelerated **0.25-second ticks** (not 30 real minutes), choice/equip/inherit a skill, timed quest claim, UI image/layout checks, tap Save, reload and verify, seeded STAGE100 UI rebirth with heroLV11/skill inheritance and reload. 7 genuine Chromium screen captures and JSON report in GitHub artifact ID **14159891083**, run `43708852676`, expiry **2026-11-22**. Archive was re-downloaded and inspected. User still does not need ZIP each step.
- Real screenshot review: legible Korean and functioning buttons, but battle header info densely packed; static detailed hero portrait vs simple enemy icon style difference remains. Main/pr is draft and unmerged; **no real Samsung Galaxy S25+ gameplay, battery, thermal, true-device touch or live deployment verified**.
- **NEXT:** maintain gameplay-first, low-art budget. Differentiate `overload` and `chain` beyond two raw damage multipliers, analyze optional first-skill choice reward pacing/slot LV10. After stable skills, 30–60m time curve recalibration and 55–65 intermediate content. Preserve all user-approved slot/inheritance/trait/core/no-tap rules and existing saves.
- Records: `docs/PROJECT_DECISIONS.md` (locked vs provisional), `docs/IMPLEMENTATION_STATUS.md` (this evidence), `docs/audit/2026-11-15-full-game-review-checklist.md` (53 original findings + followups); `automation/` belongs to separate hourly main automation.
