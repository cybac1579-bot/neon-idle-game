# Automated coverage matrix

| Area | Last checked | Evidence | Status / next priority |
| --- | --- | --- | --- |
| Mobile portrait combat visibility | 2026-11-12, `d6bf73bc` | Hit feedback runtime fixture and prior contracts: CI run 43204867687 **success (20 tests)**; Pages run 43196140841 **success** for game commit `cc90b325` | **High:** real phone hit visibility, FPS, boss animation/filter interactions; CI is not device proof |
| Combat logic, attacks, skills, enemies, bosses | 2026-11-12, `d6bf73bc` | New runtime test confirms hit cue throttle, offline suppression and reduced-motion behavior; 20-case CI success 43204867687; boss/skill regression retained | **High:** real-browser cue, boss/skill feedback and performance |
| Save/load, old-version compatibility | 2026-11-12, `ec66c1d5` | GitHub Actions run 43117916982: **4/4 Node fixture tests passed** after fixing fake DOM innerHTML children | Browser/device migration and malformed nested fields remain unverified; high |
| Offline progression, auto-buy, economy | 2026-11-12, `fc1ddfe5` | Added enabled/disabled auto-buy and unlock-gate fixture; 13-test CI **passed** run 43144630537; prior cache tests passed 43123215199 | Verify auto-buy strategy and 30-minute economy; high |
| Growth costs/rewards and rebirth/traits | 2026-11-12, `f6e8475b` | Auto-buy unlocked fixture: 14/14 CI pass run 43151665234, stage 12/48/239/682 at 1/5/15/30 min; fresh passive baseline **15/15 CI passed** run 43158314770: stage 6/13/18/21 at 1/5/15/30 min (no upgrades); auto-buy fixture stage 12/48/239/682; fresh foreground manual-purchase fixture **16/16 CI passed** run 43165049886: stage 12/38/75/161 at 1/5/15/30m; first rebirth eligible 19m15s, 350 purchases | **High:** fresh manual-purchase proxy measured; verify player-feasible purchase cadence and actual feel before tuning, no real play verification |
| UI accessibility, performance, other viewports | 2026-11-12, `3c44b9ae` | Added visible keyboard focus styling; initial contract regex failed CI run 43179110804, corrected in `3c44b9ae`; **17/17 CI passed** run 43179194767 | Real mobile/keyboard/screen-reader interaction and performance still unverified; high |
| GitHub Pages deployed state | 2026-11-12 23:57 KST, base `ef1bf909` | Current main commit `ef1bf909` confirmed by commit search; combined status empty and commit-workflow-run endpoint returned no PR-triggered runs; public Pages URL inaccessible to web reader | **High:** obtain push-triggered Actions CI/Pages outcome and deployed JS parity; neither absence of statuses nor prior success proves latest deployment |

| Reference research / inspiration | 2026-11-12 23:57 KST, `d2232181` | Added Idle Champions offline-progress reporting/automation tradeoffs with source links; prior Melvor comparison retained | Verify offline accounting and cap, then consider nonmodal return summary; no mandatory taps |

| Manual/automation separation | 2026-11-12 21:54 KST, `d6718845` | Read `development/README.md`; `development/manual-log.md` absent; automation files only edited | Preserve frozen backup and redesign branch boundaries; high |
| Progression goal guidance | 2026-11-12 23:57 KST, `ea50450b` | Source assertions: affordable-first selection present; 2 new Node VM fixtures (zero-credit fallback and rebirth with retained best), 23 tests authored total. **23-test CI not observed**; prior 20-case pass is historical only | **High:** obtain 23-test CI result, confirm rendered wording and deployed parity; no runtime success claim |

| Offline-return reporting / lifecycle | 2026-11-12 23:57 KST, `ef1bf909` | Source review: `settleElapsed` caps to 7,200s and calls `step(dt,false)`; prior 4-case Node fixture pass 43117916982 only | **High:** new cap/visibility accounting fixture, browser resume and no duplicate settlement; no fresh execution evidence |


| Offline 2h cap and return accounting | 2026-11-13 00:59 KST, base `aec6e30f`, fixture `e20b150b` | Added Node fixture for 14,400s wall time -> 7,200s credited, no offline rebirth, cache five-payout cap, log wording. **Not executed/CI unconfirmed.** | **Critical:** run 24-test suite and repair any fixture/runtime failure; browser visibility resume and published JS parity remain unverified |
| Reference research: NGU Idle | 2026-11-13 00:59 KST, `2c5a8749` | Official Steam store reference; compared layered progression versus portrait UI complexity; no gameplay code changed | Defer new currencies; preserve automatic combat and inspect detail-panel clutter |

The table tracks actual evidence, not assumed passing tests. Refer to `automation/README.md` for separation from manual logs.
