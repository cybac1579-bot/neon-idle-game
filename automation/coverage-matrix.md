# Automated coverage matrix

| Area | Last checked | Evidence | Status / next priority |
| --- | --- | --- | --- |
| Mobile portrait combat visibility | 2026-11-12, `782b336` | CSS source inspection, responsive size change | **Pending device/browser visual verification**; high |
| Combat logic, attacks, skills, enemies, bosses | 2026-11-12 | Partial JS source review only | Full functional test pending; high |
| Save/load, old-version compatibility | 2026-11-12, `1c3dc67` | Prior timestamp guard retained; sanitized skill cooldown and auto-purchase timers on load; source assertions and GitHub commit | **Partial only**; runtime malformed-save fixtures and remaining nested fields pending; high |
| Offline progression, auto-buy, economy | 2026-11-12, `1c3dc67` | Timer normalization on load; prior auto-rebirth and invalid timestamp guards retained | **Runtime and hidden-tab double-count regression pending**; high |
| Growth costs/rewards and rebirth/traits | Not tested | — | Balance simulation needed |
| UI accessibility, performance, other viewports | Not tested | — | Test short screens and interactions |
| GitHub Pages deployed state | Not verified this run | Commit only, no deployment run proof | Verify build/deployment and published version |

The table tracks actual evidence, not assumed passing tests. Refer to `automation/README.md` for separation from manual logs.
