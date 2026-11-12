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

## Verification boundaries
- This v4 change has not been runtime-tested or deployed; a source-level consistency check follows.
- Previous checks were source-level assertions only (8/8 and 7/7 as reported), **not** live-browser or real-device acceptance tests.
- The redesigned UI has not yet been merged or deployed to the public site.
- Save key and offline calculation were intentionally preserved; runtime compatibility remains to be tested.

## Future entries
For each manual redesign patch: date, base/result commit, changed files, rationale, actual tests, unresolved issues, deployment status. Do not place scheduled automation summaries here.
