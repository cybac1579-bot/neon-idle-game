# Reference redesign — manual change log

This file tracks **only** the new redesign line. It is distinct from the legacy production record (`development/` on main) and scheduled automation (`automation/` on main).

## Branch and rollback
- Development branch: `development/reference-redesign`.
- Frozen rollback branch: `backup/pre-reference-redesign-20261112` at `edac0d9ff3e1d56e53211a9b0395eb4d5ee6f4b3`.
- Production `main` and public Pages have **not** been switched to this redesign.
- Player browser localStorage is **not** included in a Git branch backup.

## Manual redesign history (2026-11-12)
1. `1e7f574` — create redesign/PLAN.md with isolation, preservation and test gates.
2. `8c4a9ae` — portrait-first battle-stage visual CSS; no gameplay logic changes.
3. `12dd238` — boss/enemy presentation markup, reusable hit overlay and reduced-motion CSS.
4. `2110c00` — enemy type/boss stage labels and foreground-only throttled hit feedback.
5. `b29aa1d` — visible next-milestone label on combat screen.
6. `cbb3965` — milestone wiring, kill feedback and stage-clear flash.

7. `04e7066` — add passive skill-activation light sweep to combat stage, with reduced-motion fallback.
8. `e990e75` — connect existing automatic skill activations to foreground-only visual feedback; no skill damage or cooldown changes.

9. `0cfa654` — fix a real CSS regression: enemy idle animation selector no longer matched after adding overlay spans.
10. `903f5a4` — add full hero progression details to the growth tab.
11. `e9b76b6` — shorten battle hero status while retaining detailed values on growth screen.

12. `da1fe81` — add repeatable Node structural smoke tests in `tests/redesign-static.test.cjs` (11 checks). Syntax, DOM reference, and duplicate-ID checks were independently evaluated in the GitHub tool environment; the committed Node test file was syntax-parsed but not executed under Node CI.

13. `214e681` — add `.github/workflows/redesign-checks.yml` to run 11 static checks on pushes to the isolated redesign branch and on pull requests. CI result has not yet been independently confirmed.

14. `644221c` — extend CI smoke coverage from 11 to 14 checks: inline navigation JavaScript, navigation-to-screen mapping, and combat sprite count.
15. `21d5ecf` — immediately repair invalid regular-expression escaping introduced in the new test code; test file now parses and the three new structural assertions were independently checked against current sources.

16. `7463948` — add real Chromium/Playwright browser smoke covering initial render, automatic battle, portrait viewport overflow, four tabs, sprite count and page errors.
17. `85f9954` — add an isolated `browser-smoke` GitHub Actions job. This adds an executable browser test path but **does not** establish that CI has passed.

## Verification boundaries
- Current commit combined status returned no statuses and the available commit workflow lookup returned no runs; neither result establishes success or failure for push-triggered Actions.
- The GitHub connector cannot list push-triggered Actions runs with its current workflow-run endpoint (PR-only); CI run status remains unverified, not reported as passed.
- Direct local GitHub clone for Node execution failed because the container could not resolve github.com; GitHub Actions workflow was added as a reproducible alternative. Do not count this as a successful test run.
- v5 source-level consistency checks passed 7/7, including the enemy animation selector regression. Browser/device tests remain outstanding.
- v4 has not been runtime-tested or deployed.
- Previous checks were source-level assertions only (8/8 and 7/7 as reported), **not** live-browser or real-device acceptance tests.
- The redesigned UI has not yet been merged or deployed to the public site.
- Save key and offline calculation were intentionally preserved; runtime compatibility remains to be tested.

## Future entries
For each manual redesign patch: date, base/result commit, changed files, rationale, actual tests, unresolved issues, deployment status. Do not place scheduled automation summaries here.
