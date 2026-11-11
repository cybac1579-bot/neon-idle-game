# Automated coverage matrix

| Area | Last checked | Evidence | Status / next priority |
| --- | --- | --- | --- |
| Mobile portrait combat visibility | 2026-11-12, `782b336` | CSS source inspection, responsive size change | **Pending device/browser visual verification**; high |
| Combat logic, attacks, skills, enemies, bosses | 2026-11-12 | Partial JS source review only | Full functional test pending; high |
| Save/load, old-version compatibility | 2026-11-12, `6cae13a` | Source review of load and offline settlement; no runtime fixtures | **Partial only**; old-save migration/invalid data still untested; high |
| Offline progression, auto-buy, economy | 2026-11-12, `6cae13a` | Identified and guarded auto-rebirth during offline settlement; source assertions only | **Runtime regression pending**; high |
| Growth costs/rewards and rebirth/traits | Not tested | — | Balance simulation needed |
| UI accessibility, performance, other viewports | Not tested | — | Test short screens and interactions |
| GitHub Pages deployed state | Not verified this run | Commit only, no deployment run proof | Verify build/deployment and published version |

The table tracks actual evidence, not assumed passing tests. Refer to `automation/README.md` for separation from manual logs.
