# Automated coverage matrix

| Area | Last checked | Evidence | Status / next priority |
| --- | --- | --- | --- |
| Mobile portrait combat visibility | 2026-11-12, `fc1ddfe5` | Added viewport/combat CSS source-contract fixture; 13-test CI pending | **Real device/browser visual verification pending**; high |
| Combat logic, attacks, skills, enemies, bosses | 2026-11-12, `d1aa9ca5` | Fixed source-level skipped boss encounters at rebirth jump; added two boss/milestone tests; **11 tests passed** Actions run 43137910692 | Real mobile combat visual/play remains unverified; high |
| Save/load, old-version compatibility | 2026-11-12, `ec66c1d5` | GitHub Actions run 43117916982: **4/4 Node fixture tests passed** after fixing fake DOM innerHTML children | Browser/device migration and malformed nested fields remain unverified; high |
| Offline progression, auto-buy, economy | 2026-11-12, `fc1ddfe5` | Added enabled/disabled auto-buy and unlock-gate fixture; 13-test CI pending; prior cache tests passed 43123215199 | Verify new CI, then auto-buy strategy and 30-minute economy; high |
| Growth costs/rewards and rebirth/traits | 2026-11-12, `d1aa9ca5` | Nine-test suite passed run 43130921525; boss-stage jump cap committed with new tests passed run 43137910692 | Simulate 30-minute balance; high |
| UI accessibility, performance, other viewports | Not tested | — | Test short screens and interactions |
| GitHub Pages deployed state | 2026-11-12, `03dc2641` | Pages run 43137961883 success; new `fc1ddfe5` run 43144630568 queued | Verify latest deployment and published asset; high |

The table tracks actual evidence, not assumed passing tests. Refer to `automation/README.md` for separation from manual logs.
