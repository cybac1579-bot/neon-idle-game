# Manual development and conversation decisions — 네온 방치단

This log is for **user-directed work and decisions**; scheduled automation results belong in `automation/`. Summaries below are not verbatim chat archives. Preserve historical files and read the latest main, automation evidence, redesign branch and this log before future work.

## 2026-11-14 — Portrait first-playable integration and conversation continuity
- User explicitly instructed: **consult prior development files and previous discussion records before progressing, and record decisions and changes made in the current conversation**. Continue this rule in subsequent sessions. Do not mistake a summarized note for a full chat transcript.
- Confirmed design constraints from prior discussions: Galaxy S25+ portrait target; automatic combat without repetitive tapping; combat should be the main visible scene; detailed statistics belong in the statistics tab; optional, low-frequency decisions; maintain save/offline settlement compatibility; a 30-minute first playable is an evaluation milestone, **not** a mandatory rebirth/completion deadline. Prioritize defects over new features and never claim unverified mobile play, deployment, or artwork integration.
- Repository boundaries: `main` production, `development/reference-redesign` older/diverged redesign, `integration/portrait-first-playable-20261114` integration derived from main `dbfb7a759f2f4d4947db4fdb3fc18c5bbbf03fb1`. Keep production untouched until integration and device checks. Do not overwrite main game logic with the older redesign branch.
- Earlier integration commits added `site/portrait-integration.css` and its link in `site/index.html`; initial CI failed in the isolated-logic comparison. Commit `676c8f4024cb543fcd8f274e20da5275f6d43989` fixed shallow checkout with `fetch-depth: 0`; [CI run 43516346507](https://github.com/cybac1579-bot/neon-idle-game/actions/runs/43516346507) **succeeded**. This is CI evidence, **not** browser/Android evidence.
- Current user-directed change `ac74de5089740788265bec866a32d835467857f3`: moved best-stage and rebirth counters from battle into detailed statistics, preserving their existing DOM IDs so `site/game.js` remains unchanged. Battle retains current stage, figures, HP, goal, and log; focus is less clutter.
- CI for the latest UI change: **pending at log creation**, not claimed passed. Main/Pages deployment and actual 360×740/412×915 browser screenshot, Galaxy S25+ play, 30-minute player enjoyment, and live-served asset parity remain unverified.
- Provisional first-playable readiness **58%**, visual integration **30%** (subjective estimates, not measured completion); do not raise them for log-only work. Next: inspect latest branch CI, repair failures first; check portrait layout and real image quality; compare mixed-build 30-minute diagnostics; validate save/resume and eventual production parity. Keep scheduled automatic-improvement task disabled until safe integration.

## Recording rules for future manual sessions
1. Read this file plus relevant `development/`, `automation/`, and `redesign/` references and the latest branch/CI status.
2. Append user feedback and newly confirmed decisions with date, branch, commit, actual tests, remaining risks, and next step.
3. Keep **manual** notes here; never claim they are a complete transcript or replace source verification.
4. If a test fails, investigate and fix before adding new features. Never treat passing unit tests as proof of real-device visuals or fun.

## 2026-11-14 — Cosmetic-only customization confirmed and implemented
- User clarified that swapping outfits/characters is **strictly for visual variety**, not a gameplay stat, skill, growth, or balance system. Preserve this as a hard design constraint; avoid cosmetic pay-to-win mechanics or character stat variants.
- Implemented isolated `site/cosmetics.js` registry and separate `neon_cosmetic_v1` localStorage key, with normalized fallback and storage-denial warning. Added `heroImage` and cosmetic character/outfit selectors **only in the stats tab**, not on the combat canvas. Only existing `seha_portrait.webp` is registered; no claim that new character art or outfits exist yet.
- Commits: cosmetic registry `4c0160f2`, HTML selectors `0b39ab1f`, targeted workflow checks `062ca2eb`. Existing `site/game.js` and game-save key remain untouched. Cosmetic changes must not alter stats or require gameplay save migrations.
- At writing: latest workflow result for these commits **not yet verified**; real Android/browser appearance and save persistence remain unverified. Next verify CI, then use actual screenshots/asset checks before integrating into main.
