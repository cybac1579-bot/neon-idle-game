# Automated coverage matrix

| Area | Last checked | Evidence | Status / next priority |
| --- | --- | --- | --- |
| Mobile portrait combat visibility | 2026-11-12, `d6bf73bc` | Hit feedback runtime fixture and prior contracts: CI run 43204867687 **success (20 tests)**; Pages run 43196140841 **success** for game commit `cc90b325` | **High:** real phone hit visibility, FPS, boss animation/filter interactions; CI is not device proof |
| Combat logic, attacks, skills, enemies, bosses | 2026-11-12, `d6bf73bc` | New runtime test confirms hit cue throttle, offline suppression and reduced-motion behavior; 20-case CI success 43204867687; boss/skill regression retained | **High:** real-browser cue, boss/skill feedback and performance |
| Save/load, old-version compatibility | 2026-11-12, `ec66c1d5` | GitHub Actions run 43117916982: **4/4 Node fixture tests passed** after fixing fake DOM innerHTML children | Browser/device migration and malformed nested fields remain unverified; high |
| Offline progression, auto-buy, economy | 2026-11-12, `fc1ddfe5` | Added enabled/disabled auto-buy and unlock-gate fixture; 13-test CI **passed** run 43144630537; prior cache tests passed 43123215199 | Verify auto-buy strategy and 30-minute economy; high |
| Growth costs/rewards and rebirth/traits | 2026-11-12, `f6e8475b` | Auto-buy unlocked fixture: 14/14 CI pass run 43151665234, stage 12/48/239/682 at 1/5/15/30 min; fresh passive baseline **15/15 CI passed** run 43158314770: stage 6/13/18/21 at 1/5/15/30 min (no upgrades); auto-buy fixture stage 12/48/239/682; fresh foreground manual-purchase fixture **16/16 CI passed** run 43165049886: stage 12/38/75/161 at 1/5/15/30m; first rebirth eligible 19m15s, 350 purchases | **High:** fresh manual-purchase proxy measured; verify player-feasible purchase cadence and actual feel before tuning, no real play verification |
| UI accessibility, performance, other viewports | 2026-11-12, `3c44b9ae` | Added visible keyboard focus styling; initial contract regex failed CI run 43179110804, corrected in `3c44b9ae`; **17/17 CI passed** run 43179194767 | Real mobile/keyboard/screen-reader interaction and performance still unverified; high |
| GitHub Pages deployed state | 2026-11-12 21:54 KST, `d6718845` | Previous gameplay Pages run 43196140841 **success**; new guidance fix commit `f569632f` Pages run and live asset parity **not verified** | **High:** monitor artifact indexing recurrence; independently verify published asset parity and real-device rendering |

| Reference research / inspiration | 2026-11-12 21:54 KST, `bb35e2d9` | `automation/reference-research.md`: Idle Slayer, Rogue with the Dead, Antimatter Dimensions milestone documentation; costs, tradeoffs and selective/deferred decisions | Next: compare low-frequency strategic choice affordances in a different game; no tap-based combat |

| Manual/automation separation | 2026-11-12 21:54 KST, `d6718845` | Read `development/README.md`; `development/manual-log.md` absent; automation files only edited | Preserve frozen backup and redesign branch boundaries; high |
| Progression goal guidance | 2026-11-12 21:54 KST, `d6718845` | Corrected `actionableGoal()` to prioritize affordable upgrades; added targeted 20-credit fixture where attack (18) is affordable but speed/generator are not; CI result pending | **High:** obtain 21-case CI evidence; verify rendered goal text and post-rebirth goals in real browser |

The table tracks actual evidence, not assumed passing tests. Refer to `automation/README.md` for separation from manual logs.
