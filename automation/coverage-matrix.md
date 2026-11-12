# Automated coverage matrix

| Area | Last checked | Evidence | Status / next priority |
| --- | --- | --- | --- |
| Mobile portrait combat visibility | 2026-11-12, `782b336` | CSS source inspection, responsive size change | **Pending device/browser visual verification**; high |
| Combat logic, attacks, skills, enemies, bosses | 2026-11-12, `d1aa9ca5` | Fixed source-level skipped boss encounters at rebirth jump; added two boss/milestone tests; **11 tests passed** Actions run 43137910692 | Real mobile combat visual/play remains unverified; high |
| Save/load, old-version compatibility | 2026-11-12, `ec66c1d5` | GitHub Actions run 43117916982: **4/4 Node fixture tests passed** after fixing fake DOM innerHTML children | Browser/device migration and malformed nested fields remain unverified; high |
| Offline progression, auto-buy, economy | 2026-11-12, `aee1d897` | Actions 43123215199: periodic credit cache 5-payout cap and one-time claim fixture passed, plus prior offline tests | Auto-buy and full economy balance still untested; high |
| Growth costs/rewards and rebirth/traits | 2026-11-12, `d1aa9ca5` | Nine-test suite passed run 43130921525; boss-stage jump cap committed with new tests passed run 43137910692 | Simulate 30-minute balance; high |
| UI accessibility, performance, other viewports | Not tested | — | Test short screens and interactions |
| GitHub Pages deployed state | 2026-11-12, `7c45e32a` | Pages run 43130970357 success; newest gameplay/test commits queued/in progress | Verify newest head deployment and published asset; high |

The table tracks actual evidence, not assumed passing tests. Refer to `automation/README.md` for separation from manual logs.
