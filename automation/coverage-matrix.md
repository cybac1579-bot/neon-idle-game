# Automated coverage matrix

| Area | Last checked | Evidence | Status / next priority |
| --- | --- | --- | --- |
| Mobile portrait combat visibility | 2026-11-12, `782b336` | CSS source inspection, responsive size change | **Pending device/browser visual verification**; high |
| Combat logic, attacks, skills, enemies, bosses | 2026-11-12 | Partial JS source review only | Full functional test pending; high |
| Save/load, old-version compatibility | 2026-11-12, `a31c57b` | Fixed missing/invalid timestamp causing phantom 7200s offline reward; source assertions, GitHub commit | **Partial only**; runtime old-save fixtures and nested malformed data pending; high |
| Offline progression, auto-buy, economy | 2026-11-12, `a31c57b` | Prior auto-rebirth guard retained; invalid saved timestamp no longer grants 2h offline settlement | **Runtime and hidden-tab double-count regression pending**; high |
| Growth costs/rewards and rebirth/traits | Not tested | — | Balance simulation needed |
| UI accessibility, performance, other viewports | Not tested | — | Test short screens and interactions |
| GitHub Pages deployed state | Not verified this run | Commit only, no deployment run proof | Verify build/deployment and published version |

The table tracks actual evidence, not assumed passing tests. Refer to `automation/README.md` for separation from manual logs.
