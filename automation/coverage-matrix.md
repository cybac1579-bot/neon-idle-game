# Automated coverage matrix

| Area | Last checked | Evidence | Status / next priority |
| --- | --- | --- | --- |
| Mobile portrait combat visibility | 2026-11-12, `782b336` | CSS source inspection, responsive size change | **Pending device/browser visual verification**; high |
| Combat logic, attacks, skills, enemies, bosses | 2026-11-12 | Partial JS source review only | Full functional test pending; high |
| Save/load, old-version compatibility | 2026-11-12, `1b5a70e` | Run 7: committed Node save regression harness (4 cases), **not executed**; previous source fixes `f4a3e07` and `59858a6` | **Unverified runtime**; run harness, fix failures, expand malformed nested fields; high |
| Offline progression, auto-buy, economy | 2026-11-12, `1b5a70e` | Added offline auto-rebirth and hidden-tab resume fixture cases, **not executed**; previous source guards retained | **Run tests and verify runtime**; auto-buy/economy still untested; high |
| Growth costs/rewards and rebirth/traits | Not tested | — | Balance simulation needed |
| UI accessibility, performance, other viewports | Not tested | — | Test short screens and interactions |
| GitHub Pages deployed state | Not verified this run | Commit only, no deployment run proof | Verify build/deployment and published version |

The table tracks actual evidence, not assumed passing tests. Refer to `automation/README.md` for separation from manual logs.
