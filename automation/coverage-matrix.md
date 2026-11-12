# Automated coverage matrix

| Area | Last checked | Evidence | Status / next priority |
| --- | --- | --- | --- |
| Mobile portrait combat visibility | 2026-11-12, `782b336` | CSS source inspection, responsive size change | **Pending device/browser visual verification**; high |
| Combat logic, attacks, skills, enemies, bosses | 2026-11-12, `aee1d897` | Actions 43123215199: boss image/trait damage and skill damage/cooldown Node fixtures passed | Stage-jump/boss behavior and actual visual combat unverified; high |
| Save/load, old-version compatibility | 2026-11-12, `ec66c1d5` | GitHub Actions run 43117916982: **4/4 Node fixture tests passed** after fixing fake DOM innerHTML children | Browser/device migration and malformed nested fields remain unverified; high |
| Offline progression, auto-buy, economy | 2026-11-12, `aee1d897` | Actions 43123215199: periodic credit cache 5-payout cap and one-time claim fixture passed, plus prior offline tests | Auto-buy and full economy balance still untested; high |
| Growth costs/rewards and rebirth/traits | 2026-11-12, `d00fc685` | Added two Node fixtures for upgrade unlock/cost/cap and stage-100 rebirth persistence; **CI pending** (run 43130921525) | Verify nine-case CI; simulate 30-minute balance and boss-stage jumps; high |
| UI accessibility, performance, other viewports | Not tested | — | Test short screens and interactions |
| GitHub Pages deployed state | 2026-11-12, `f1e35a97` | Pages Actions 43123270981 success; `d00fc685` run 43130921499 queued at inspection | Current head deployment and actual published assets not verified; high |

The table tracks actual evidence, not assumed passing tests. Refer to `automation/README.md` for separation from manual logs.
