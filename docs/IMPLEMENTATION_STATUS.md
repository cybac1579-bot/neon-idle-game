# 네온 방치단 — 실제 구현 및 검증 상태
Snapshot: 2026-11-14. Evidence is scoped to what was actually inspected.

## Repository
- Repo: cybac1579-bot/neon-idle-game
- Protected baseline main SHA at inspection: dbfb7a759f2f4d4947db4fdb3fc18c5bbbf03fb1
- Visual source: development/reference-redesign
- Comparison main...development/reference-redesign: diverged; redesign ahead 108 / behind 187 at inspection.
- New integration branch: development/main-redesign-integration-20261114, created from above main SHA.
- Comparison identified changes in site/index.html, site/game.js, hero assets, redesign tests and documentation. No blind merge.
- Reference docs: docs/main-redesign-integration-audit-2026-11-14.md and docs/hero-art-integration-gate-2026-11-13.md on redesign branch.

## Verification matrix
| Area | State | Evidence / next action |
|---|---|---|
| Automation pause | VERIFIED at snapshot | '네온 방치단 자동 개선' is_enabled=false via task lookup |
| Branch comparison | VERIFIED | main/redesign compare, ahead 108 behind 187 |
| Integration branch | CREATED | GitHub create_branch response |
| Gameplay preservation after transplant | NOT TESTED | No code transplant yet |
| Main CI latest run | NOT CHECKED this session | Inspect workflow runs/checks |
| Redesign CI latest run | NOT CHECKED live this session | Historical audit cites successful run 43514509490; not current proof |
| Browser 360/390/412 | HISTORICAL CLAIM | Redesign historical test results; not rerun |
| New high-resolution hero art | NOT VERIFIED | Historical audit says hero_fantasy_fullbody.webp absent |
| Save/load/offline/reconstruction | NOT TESTED on integration branch | Run regressions after UI transplant |
| 60-minute full-system economy | DESIGN TARGET ONLY | Needs equipment/skill/trait integrated simulation |
| 30-minute real-device play | NOT TESTED | User evaluation later |
| Deployment | UNCHANGED / NOT VERIFIED live | Preserve main until integration passes |

## Progress
Previous ~67% is historical estimate only; no current evidence-based revised percentage. Do not advance readiness merely for writing docs or creating a branch.

## Integration v1 — 2026-11-14
- Commit 75fd7c941450f8a8d576e757600a6296ffe09b16 on integration branch: selectively added portrait battle CSS in site/index.html. No site/game.js edit; gameplay script section in HTML byte-for-byte unchanged by this edit.
- Read-back confirmed CSS marker present. Static inspection of current HTML/JS: 0 getElementById references, 0 missing referenced IDs, 0 duplicate IDs. This is a limited static check, NOT browser execution or regression suite.
- Browser/CI/real-device tests NOT RUN in this session. No production artwork added; no main/deployment change.
- Next: run CI/browser suite, verify actual rendering, then transplant other visual elements only if tests pass.

## Browser verification infrastructure — 2026-11-14
- Added tests/integration-portrait.test.cjs at commit 1acff01b70826f242a0f34653e661c5ee1e142ed. Checks 360/390/412px Chromium startup, image load, horizontal overflow, arena height, navigation and browser errors.
- Added .github/workflows/integration-portrait.yml at commit 1d19bab53ea3d8c12415cc5911486fdd9021508f, configured to run on integration branch pushes.
- Test and workflow files were committed, but GitHub Actions completion and PASS/FAIL have NOT been observed yet. Local environment cannot reach github.com (DNS), so no local repository checkout or Chromium execution was performed.
- This browser smoke does not cover save/offline/reconstruction/economy; additional regression evidence required before merge.


## Verified integration status — 2026-11-14 (supersedes older pending notes above)
- PR #2 `integration/reconcile-main-redesign-20261114` -> `main` remains unmerged; latest inspected comparison was clean, ahead 13 / behind 0 before subsequent test commits. Recheck before merge.
- Save regression #89 passed 49/49 on commit `7532a46`; portrait Chromium #73 passed at 360/390/412px, including quest rows, claim semantics, persistence, and 60-minute telemetry. No physical Android device verification.
- First-reconstruction telemetry at #73: 2859 seconds (47m39s), but RNG was not seeded; this is NOT a reproducible economic baseline.
- Commit `6c87667` seeds the browser balance simulation with deterministic PRNG; save regression #90 passed 49/49, while portrait #74 result was pending when this note was written. Consult latest Actions results before claiming it passed.
- Current experimental economy: 71-100 enemy HP gradually increased by 1.015 per stage over stage 70, while early 1-70 behavior is unchanged. Target first reconstruction ~60 minutes under best practical strategy, not an artificial timer. Seeded simulation is a comparison tool, not proof of optimal strategy or real-world play duration.
- Outstanding before merge: deterministic simulation results and multi-strategy balance validation; real-device portrait gameplay; production deployment and Pages parity verification. No live production deployment claimed.
- Readiness remains 58% provisional; do not advance from passing smoke tests alone.


## 2026-11-15 prioritized development restart — P0 baseline and save integrity (supersedes stale snapshot statuses above)
- **Latest user priority:** gameplay and verified fun outrank new high-end illustration production. Keep existing six in-game art assets; postpone new high-end art/animation. Confirmed in `docs/PROJECT_DECISIONS.md`, commit `1e2719d4`.
- **Protected baseline:** main remains unchanged by the manual integration work. Safety branch `backup/neon-priority-baseline-20261115` at `1e2719d4bb341fc595510041a6dd8d8c06376314`. Manual PR #2 `integration/reconcile-main-redesign-20261114` is draft/unmerged.
- **Main→manual reconciliation:** merge commit `8b414c25` (parents manual and main) keeps manual `site/game.js` and `site/index.html` exact prior blobs, imports main's automation coverage/research/verification notes, modernizes obsolete rebirth stage-jump expectations, and preserves the highest-tier auto-buy and 30-minute integrated combat regression checks. Manual branch no longer behind main at the snapshot checked; before future merge recheck drift.
- **CI baseline:** initial merge test had 1 new test-harness typo, corrected in `083a0432`. PR save regression `43705304544` **53/53 PASS**, PR portrait `43705304547` **PASS**. Do not describe the earlier intermediate failure as a game defect.
- **Actual gameplay/save fix:** `site/game.js` `3608411e` preserves oversized legacy quest reserves upon the next payout rather than silently clamping them to a new 5-cycle cap; saved skills are clamped to real level 20 (including legacy alias) with capped XP reset. **Normal new quest reserves still cap at 5 payouts**. No combat/credit-rate rebalance, art additions or phase-system changes.
- **New regression tests:** `automation/save-regression.test.cjs` `5e8ea185` adds 3 tests for high-stage legacy credit survival across tick/save/load/claim, already-migrated oversized quest balances, and loaded skill cap/alias normalization. PR save regression run `43705486087` **56/56 PASS**. PR portrait run `43705486090` and push run `43705481934` **PASS**. Actual Android device and Pages parity **NOT VERIFIED**.
- **Readiness:** retain provisional **58%** until user has tested gameplay; risk-reduction work completed, not new fun/content. Whole audit already 10/10 and the post-audit development phase is now active.
- **Next priority:** automatic-rebirth condition/label discrepancy (OR vs max/AND) and preventing automatic reconstruction from consuming the phase unlock at STAGE180. Test coherent policy before changing. After that: skill/gameplay reward choices, 60-minute calibration, portrait UI and basic effects; high-end new art deferred.


## 2026-11-15 P0/P1 auto-rebirth and phase objective safeguard — verified code+CI

- Code/UI/test commit: `6d3d9e31bba29f14f3bd7421aa0de682a10fc5ca` on manual `integration/reconcile-main-redesign-20261114`. Changed **only** `site/game.js`, `site/index.html`, `automation/save-regression.test.cjs` in that gameplay commit.
- Added an explicit **phaseFocus** preference in the existing reconstruction automation panel. Default false for old saves, normalized to boolean on load, persisted by save. With preference ON and `rebirths>=2`, only foreground automatic reconstruction is suppressed; normal auto-purchase/skill/combat continue. A player can still reconstruct manually and execute phase manually on STAGE180.
- Actual automatic core threshold `max(3,ceil(totalCores*.15))` unchanged, UI **OR** miswording replaced by correct **AND** requirement, showing current and required core award.
- Four extra Node regression cases cover AND policy, STAGE179→180 under focus, old save/default OFF and manual override, second rebirth before pause/setting toggle. PR saved-game CI run `43706407957`: **60/60 PASS**; PR portrait Chromium run `43706407929`: **PASS**.
- Confirmed **not tested**: actual Galaxy S25+ interaction and extended phase objective 180 growth pacing. Opt-in can create a prolonged run: the player may choose OFF at any time. No changed enemy health/costs/skills/art, no main merge or deployment.
- **Next development priority:** meaningful skill decisions/hero progression + basic combat reward indicators using existing art; only after skill mechanics are stable, re-balance first prestige toward 60m with 55–65 bridge; new high-end illustration production deferred.


## 2026-11-15 P1 first skill-choice + hero-XP option — actual implementation / checks

- Code/UI/test commit `065f46517ed9191664dd613a1e1fb768a9809415`: one **optional free first-skill choice per run at STAGE 20**. Existing RNG drops continue, empty skill slots auto-equip chosen skill. Includes 4th `trainingSkill` (12s of ×2 kill hero XP every 14s at Lv1). Choice/buff are saved and normalized, reset on rebirth/phase; inheritance continues with Lv1 resets. Previous 5-slot milestones and no-tap rule unchanged; no new art.
- Four new Node regression cases, 60→64. First CI was **63/64 FAIL 1** due to fake DOM `remove()` no-op while an assertion expected removed child nodes; corrected only test assertion in `7f2368a643fc5ad53c108833f3dc32b63ef06513`. Latest **64/64 PASS** PR run `43707318776`, portrait Chromium **PASS** PR run `43707318779`. The intermediate failure is not hidden.
- Additional original game-JS V8 simulation (three seeds 20261114/15/16; 0.25s ticks; 10s manual attack-first upgrades and quest claims; first skill chosen at STAGE20): training-skill 30min hero level **9/9/8**, overload-skill **7/7/7**. First-rebirth-ready times training **2514.25/2357.75/2952.25s**, mean **2608.08s (~43m28s)**; overload **2351.50/2430/2228.25s**, mean **2336.58s (~38m57s)**. Indicates progression-versus-speed tradeoff, **NOT** statistically adequate/optimal balance proof or an actual mobile gameplay test.
- Still open: 4 skills vs 5 max slots, `overload` and `chain` mostly overlapping damage roles, second skill slot typically unlocked after 30min, 55–65 pacing, first rebirth target near 60min. Defer numeric rebalance until skill/gear/trait choices stabilize.
- Draft PR #2; main/Pages unchanged, Android/real-device unverified. First-playable readiness **58% provisional** (not mechanically advanced for passing more tests).


## 2026-11-15 P1 real Chromium mobile-touch playthrough checks — verified

- Implemented a new **actual Chromium page/touch** test script `tests/playthrough-browser.test.cjs` and an extra step in `.github/workflows/integration-portrait.yml` (test-only, no game.js/index.html/balance/art modification). Prepared `b55ebd27` then repaired the test's hidden-tab screenshot step in `46aae303b401d565786cd3b62a30c5943fae6ef7`.
- The first CI run **failed only on the last reset-tab screenshot**: after reload the UI correctly returned to battle, while the screenshot script targeted a hidden reset section. All **three 360/390/412px mobile-touch playthroughs had already passed**, including tap-driven purchase, STAGE20 first-skill choice/auto-equip/inheritance, skill XP buff, timed quest claim, battle visibility, and save/reload. The screenshot-script fix explicitly taps Reset after reload; game code was unchanged.
- **Final GitHub Actions CI green** at `46aae303`: push browser run `43708852676` **PASS**, PR browser run `43708855576` **PASS**, PR save regression run `43708855567` **PASS (64/64 regression cases unchanged)**. The new browser playthrough produced `PASS TOUCH_PLAYTHROUGH` for **360/390/412**, `PASS TOUCH_REBIRTH`, and `PASS MOBILE_TOUCH_PLAYTHROUGH`, all no page/network errors.
- Actual browser touches: each viewport starts clean at STAGE1; first basic engine purchase via Playwright `tap()`; calls the **actual game `step(.25)`** with periodic real `purchase()` and quest claim logic to accelerate to STAGE20 (around 93.75 simulated seconds, **not wall-clock human play**); taps 1st `trainingSkill` choice, taps inherited skill button, activates skill, taps 3-quest reward claim, captures battle; taps Save, reloads and confirms stage, purchase, chosen/owned/inherited skill all persist. A **separately seeded STAGE100 save fixture** is used for actual UI rebirth tap and verifies stage reset to1, permanent heroLV11 maintained, inherited skill reset LV1 and choice re-enabled, reload remains correct. The stage100 was **not naturally reached by a 30-min physical play session**.
- Seven genuine Chromium PNG screenshots were captured: `stage20-choices-{360,390,412}.png`, `battle-{360,390,412}.png`, `rebirth-controls-390.png`, plus `playthrough-report.json`. Archived by GitHub Actions artifact `neon-touch-playthrough`, run `43708852676`, artifact **14159891083**; GitHub UI URL `https://github.com/cybac1579-bot/neon-idle-game/actions/runs/43708852676/artifacts/14159891083`, **expires Nov 22 2026** (7-day workflow artifact retention). Artifact ZIP **actually re-downloaded, extracted, report verified**, and 390px battle/skill-choice/rebirth images visually inspected during this turn. This is actual in-game browser rendering, **not a synthesized concept image**. Archive download SHA256 `78e365b81b6bacb5887fba9540c8318c435ececf3b8d2126709f7187a7c69a4f` (for locally downloaded ZIP).
- Observations from real rendered screenshots: Korean renders correctly without mojibake, skill-choice buttons legible and flow usable, no horizontal overflow; battle panel upper section crowds hero XP/traits/slot data and does not focus exclusively on watching combat; hero is a detailed static rectangular portrait versus a simple icon-like enemy, producing a visual-style disconnect. These are **visual findings**, not confirmed gameplay-fun scores or mobile hardware performance defects.
- Scope boundary: Playwright `isMobile:true`, `hasTouch:true`, DPR2, Chromium virtual viewports are **NOT an actual Galaxy S25+**; no thermals/battery/screen notch/sustained FPS metrics; no human 30-min enjoyment assessment, no live Pages deployment parity verification.
- Next gameplay task: clarify meaningful `overload` vs `chain` skill distinction, early acquisition/reward feedback and LV10 second slot experience, then adjust ~60m first rebirth / STAGE55–65 pacing using actual gameplay code. Preserve current art and avoid high-cost image generation.


## 2026-11-15 P1 skill differentiation and reward feedback — delivered and verified

- Actual gameplay/UI/regression/browser-test commit `7e1b62d7c6304ba3ae95b04a13c3c6b5c8a79524` changed only `site/game.js`, `site/index.html`, `automation/save-regression.test.cjs`, `tests/playthrough-browser.test.cjs`.
- `overload`: unchanged single 3×power strike every 9s. `chain`: former instant 1.7×power attack replaced by **3 separate 0.6×power pulses**, 1s apart, total raw 1.8×power/6s. Each pulse resolves a defeat immediately, so remaining pulses can hit subsequent stage enemies. Scheduled pulses persist through save/load and are discarded on unequip/rebirth/phase. Legacy saves default to no pending pulses. No new damage-mode currency, tap input or animation art.
- Small temporary on-screen cues (`skillCue`, `rewardCue`) report skill activations/individual chain pulses, dropped weapon/skill, first skill selection and LV10/25/40/60 slot unlock. Cues expire; important earned items and levels persist. Growth skill panel now tells player the **next unchanged slot-unlock level**.
- **Node regression:** four new tests (overload single burst, multi-stage Chain pulse transfer, pending pulse persistence/reset, transient cue lifecycle). Total **68/68 PASS** GitHub PR run `43710046251`. Real Chromium mobile-touch playthrough and legacy portrait checks **PASS** push run `43710041533`, PR run `43710046346`. Screenshot count print initially remained 7 though eighth Chain shot was captured. Corrected reporting only in `979489d07944fa2a8c5efc35f6b3c22c223b43d4`; final PR portrait+touch run `43710193707` **PASS**, PR regression `43710193716` **PASS**, producing accurately reported **8 actual Chromium PNGs**.
- New real-browser Chain scenario: at STAGE30 schedule 3 pulses, first pulse defeats stage30 and advances to STAGE31 with 2 pending, second damages STAGE31 and displays "연쇄 방전 · 2/3 타격"; actual browser screenshot `chain-pulses-390.png` manually viewed (real image, not mockup). See Actions run `43710193707` artifact **14160481111** `neon-touch-playthrough`, expires **2026-11-22**, includes 8 PNGs + `playthrough-report.json`. Prior run `43710046346` artifact 14159344134 was actually downloaded/extracted and its JSON and screenshot verified; all checks PASS.
- Additional **20 original-JS seeded simulations**: seeds 20261114–20261118, .25s steps, same attack-first upgrades and manual quest claims every 10s, first skill choice at STAGE20, 60m in-game time. Mean first-rebirth-ready times Chain **2240.95s (37m20.95s)**, Overload **2365.45s (39m25.45s)**, bountySkill **2385.20s**, trainingSkill **2485.60s**. Chain faster by **124.50s (5.26%)** on average vs Overload, **not every seed**. First 30m hero LV10 mostly not reached even with faster skill; exact 60m balance is NOT yet achieved. Sample size 5 seeds/policy, not real device or global optimum.
- Visual QA: actual Chain screenshot shows clear transient turquoise cue but substantial empty space above hero/foe and dense small hero status text at top. High-end new art remains deferred; future mobile UI/visual feedback pass should target layout/cue clarity rather than more characters. No main/Pages deployment or actual Galaxy S25+ hardware run. Existing provisional readiness **58%** preserved pending play-quality assessment.
