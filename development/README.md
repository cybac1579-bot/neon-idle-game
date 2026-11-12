# Legacy development — manual record index

This directory documents the **pre-redesign** game, current production line, and user-directed maintenance. It is separate from the redesign and from scheduled automation logs.

## Boundaries
- Production/legacy code: `main` (the scheduled automation may continue to update this branch).
- Frozen pre-redesign source snapshot: `backup/pre-reference-redesign-20261112`, commit `edac0d9ff3e1d56e53211a9b0395eb4d5ee6f4b3`. Do not update this branch.
- Redesign code and notes: `development/reference-redesign` and `redesign/` on that branch.
- Scheduled checks: `automation/` on main. These are not manual-development records.

## Legacy game baseline
- Portrait mobile idle RPG; auto combat with optional low-frequency decisions. No Tap Titans-style repetitive tapping.
- Systems include combat, growth, rebirth, phase, automation, offline progress, equipment, skills, traits, and economy.
- Existing production URL: https://cybac1579-bot.github.io/neon-idle-game/
- Preserve save compatibility and verify production deployments before reporting them as live.

## Reporting policy
- Record manual maintenance and player feedback here, rather than in `automation/` or `redesign/`.
- Note exact commit, actual tests, and whether deployment/device verification was completed.
- If redesign is eventually merged, keep this historical index and rollback branch.

## Initial entry (2026-11-12)
- The user requested that pre-redesign development and the new redesign be recorded separately.
- Historical baseline is the frozen backup branch above; no previous chat transcript is claimed to be copied into this file.
- Future manual legacy work should append to `development/manual-log.md`.
