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
