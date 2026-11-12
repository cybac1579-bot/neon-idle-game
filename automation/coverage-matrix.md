# Automated coverage matrix

| Area | Last checked | Evidence | Status / next priority |
| --- | --- | --- | --- |
| Mobile portrait combat visibility | 2026-11-12, `fc1ddfe5` | Added viewport/combat CSS source-contract fixture; 13-test CI **passed** run 43144630537 | **Real device/browser visual verification pending**; high |
| Combat logic, attacks, skills, enemies, bosses | 2026-11-12, `d1aa9ca5` | Fixed source-level skipped boss encounters at rebirth jump; added two boss/milestone tests; **11 tests passed** Actions run 43137910692 | Real mobile combat visual/play remains unverified; high |
| Save/load, old-version compatibility | 2026-11-12, `ec66c1d5` | GitHub Actions run 43117916982: **4/4 Node fixture tests passed** after fixing fake DOM innerHTML children | Browser/device migration and malformed nested fields remain unverified; high |
| Offline progression, auto-buy, economy | 2026-11-12, `fc1ddfe5` | Added enabled/disabled auto-buy and unlock-gate fixture; 13-test CI **passed** run 43144630537; prior cache tests passed 43123215199 | Verify auto-buy strategy and 30-minute economy; high |
| Growth costs/rewards and rebirth/traits | 2026-11-12, `aebd0d2c` | Added 1,800-second Node simulation with auto-buy and numeric stability checks; **CI result pending**; previous 13 cases passed 43144630537 | Inspect simulation metrics and assess 30-minute player pacing; high |
| UI accessibility, performance, other viewports | Not tested | — | Test short screens and interactions |
| GitHub Pages deployed state | 2026-11-12, `2199bfdb` | Pages run 43144690587 **success** for base main; later test/docs commits pending | Verify new head deployment and published asset parity; high |

The table tracks actual evidence, not assumed passing tests. Refer to `automation/README.md` for separation from manual logs.
