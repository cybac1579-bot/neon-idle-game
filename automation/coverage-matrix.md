# Automated coverage matrix

| Area | Last checked | Evidence | Status / next priority |
| --- | --- | --- | --- |
| Mobile portrait combat visibility | 2026-11-12, `782b336` | CSS source inspection, responsive size change | **Pending device/browser visual verification**; high |
| Combat logic, attacks, skills, enemies, bosses | 2026-11-12 | Partial JS source review only | Full functional test pending; high |
| Save/load, old-version compatibility | 2026-11-12, `e337fbd` | Run 8: added GitHub Actions Node 22 workflow for 4 regression cases; **no passing execution observed** | **Unverified runtime**; inspect CI run and repair failing harness/game; high |
| Offline progression, auto-buy, economy | 2026-11-12, `e337fbd` | Save/visibility fixtures now have a CI workflow, **not confirmed run** | **Obtain green test evidence**; auto-buy/economy still untested; high |
| Growth costs/rewards and rebirth/traits | Not tested | — | Balance simulation needed |
| UI accessibility, performance, other viewports | Not tested | — | Test short screens and interactions |
| GitHub Pages deployed state | 2026-11-12 07:56 KST | CI workflow commit accepted; no Pages build/run or published asset proof | **Not verified**; inspect Pages status and deployed version |

The table tracks actual evidence, not assumed passing tests. Refer to `automation/README.md` for separation from manual logs.
