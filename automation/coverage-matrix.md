# Automated coverage matrix

| Area | Last checked | Evidence | Status / next priority |
| --- | --- | --- | --- |
| Mobile portrait combat visibility | 2026-11-12, `fc1ddfe5` | Added viewport/combat CSS source-contract fixture; 13-test CI **passed** run 43144630537 | **Real device/browser visual verification pending**; high |
| Combat logic, attacks, skills, enemies, bosses | 2026-11-12, `d1aa9ca5` | Fixed source-level skipped boss encounters at rebirth jump; added two boss/milestone tests; **11 tests passed** Actions run 43137910692 | Real mobile combat visual/play remains unverified; high |
| Save/load, old-version compatibility | 2026-11-12, `ec66c1d5` | GitHub Actions run 43117916982: **4/4 Node fixture tests passed** after fixing fake DOM innerHTML children | Browser/device migration and malformed nested fields remain unverified; high |
| Offline progression, auto-buy, economy | 2026-11-12, `fc1ddfe5` | Added enabled/disabled auto-buy and unlock-gate fixture; 13-test CI **passed** run 43144630537; prior cache tests passed 43123215199 | Verify auto-buy strategy and 30-minute economy; high |
| Growth costs/rewards and rebirth/traits | 2026-11-12, `5b6865a6` | Auto-buy unlocked fixture: 14/14 CI pass run 43151665234, stage 12/48/239/682 at 1/5/15/30 min; new fresh-save passive baseline test added, CI pending | **High:** compare true fresh passive baseline and manual-purchase first run before tuning; no real play verification |
| UI accessibility, performance, other viewports | Not tested | — | Test short screens and interactions |
| GitHub Pages deployed state | 2026-11-12, `d0e2eb09` | Pages run 43151725191 **success** for prior main; new `5b6865a6` test commit queued | Verify latest head deployment and published asset parity; high |

The table tracks actual evidence, not assumed passing tests. Refer to `automation/README.md` for separation from manual logs.
