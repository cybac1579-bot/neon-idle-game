# 네온 방치단 — 확정 기준 등록부
Updated: 2026-11-14. Status: user-confirmed direction; implementation is NOT implied.

## Authority and precedence
1. Latest explicit user decision supersedes earlier instructions, even if an old handoff says otherwise.
2. Actual GitHub files/commits, CI and live automation status establish implementation facts, not chat summaries.
3. Keep design decisions separate from implementation, tests and subjective play quality.
4. Uncertain historical details remain unverified; never silently promote them to confirmed.
5. Preserve older records, main, release and save compatibility until validated.

## Product and controls
- Goal is a first playable vertical mobile build suitable for roughly 30 minutes of enjoyment evaluation, NOT a permanently finished game.
- Target device: Galaxy S25 Plus portrait; include 360/390/412px browser checks, then real-device verification separately.
- Automatic combat is primary. No repetitive tapping, rapid reactions or mandatory continuous input; optional low-frequency strategic interventions.
- Combat character/art and skill effects need strong visual presence, without cluttering the main screen. Detailed stats belong in a separate tab.
- High-quality character art/animation remain desired; do not represent mockups, low-res placeholders or CSS motion as final character animation.

## Progression and economy
- First prestige/reconstruction target: ~60 minutes under highly efficient play, not a hard gate or a requirement to prestige within the 30-minute evaluation.
- Normal play may take longer; purchase downtime alone is not a bug. Evaluate clarity of goals, meaningful accumulation, choices, reward and post-prestige acceleration.
- Include equipment, skills, traits, economy and all relevant multipliers in the 60-minute balance model BEFORE calibrating. Skills are intended as a central content pillar while preserving idle gameplay.
- Reconstruction is a long-term progression mechanic, not a forced button press at a fixed timestamp; assess player-chosen timing and diminishing returns.
- Keep multiple long-term prestige-core investment paths; long-run permanent upgrade caps should be attainable. Preserve permanent research/collection and separate deep-dungeon currencies subject to source verification.
- Credit collection service should retain its current manual path while keeping collection logic independent from UI for eventual automation; unlock conditions are not yet fixed.

## Engineering and operating rules
- main is the protected existing gameplay/deployment baseline. development/reference-redesign is a divergent visual reference, not a merge-ready replacement.
- Integrate via a new branch from current main; cherry-pick or selectively transplant visual-only changes, preserving combat, growth, reconstruction, economy, save/load, offline rewards and auto-buy.
- Keep CI and regression tests active even when scheduled auto-development is paused. Resume automation only after verified integration.
- Fix errors and regressions before new features. Do not claim tests, art display, commits, backups or deployment succeeded without evidence.
- Track visual-redesign progress separately from overall first-playable readiness. Percentages are estimates justified by evidence, not commit/test counts.
- Do not ship per-turn ZIPs; provide a playable integrated artifact when needed.
- For major new design approaches, assess at least 3 benefits and 3 drawbacks, each with impact magnitude; challenge flawed proposals instead of automatically agreeing.
- Keep user-facing updates concise and avoid asking for minor implementation decisions.

## Change protocol
When user revises a rule, update this file with date, exact new decision and superseded rule. Never silently erase disagreements. Cross-reference docs/IMPLEMENTATION_STATUS.md and docs/DEVELOPMENT_HANDOFF.md.
