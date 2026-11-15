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

## Economy redesign decisions — 2026-11-14 (latest user confirmations)
- The former single 60-second credit collection is a TEMPORARY implementation, not the intended final mechanic. Replace it with several independent time-based repeatable credit quests (e.g. 3s, 6s, 30s), each with its own duration and payout. These are timed jobs, NOT enemy-kill or milestone quests.
- Timed quests REPLACE the existing single collection source; do not add them on top of it as a fourth credit source. Audit combat bounty, passive production, traits, permanent multipliers and timed-job income together to prevent runaway stacking.
- Higher enemy HP and early resistance are acceptable and desirable when they make equipment, skills and timed-job credits genuinely useful. Avoid dead ends: meaningful counterplay must be available before a wall.
- Efficient first reconstruction target remains ~60 minutes, calibrated with all growth sources, not merely HP/cost inflation.
- Automatic purchasing prioritizes the HIGHEST UNLOCKED UPGRADE TIER (unlock-stage order), not the highest purchase price and not the cheapest purchase. Within the same tier preserve stable existing ordering; if a higher tier is unaffordable, fall back to the highest affordable tier. Implemented on integration branch at be86f7e177d0068a65be3de53ca34ac0a82776d9.
- Do not request additional user settings before investigating and balancing; make evidence-based tuning decisions and report measured results separately from estimates.

## Development priorities — 2026-11-15 (latest user decision)

- User approved prioritizing gameplay development over new high-quality illustrations. This **supersedes the earlier equal-priority development schedule for graphics and systems**, not the long-term aspiration for quality character art. **Preserve current illustrated assets and art hooks**; use simple hit/skill/reward indicators. Do not commission/build new high-end cut-ins, sprite animations or environment variations while core gameplay remains unvalidated.
- New execution order for the manual integration branch (each phase must pass relevant tests before next):
  1. **P0 integrity:** fix outdated CI expectations while preserving current confirmed rules; restore useful tier-first auto-buy regression coverage; then prevent legacy quest balance loss and out-of-range skill-level restoration.
  2. **P0/P1 automation gate:** ensure auto-rebirth policy/text is consistent and does not silently prevent STAGE180 phase objectives; validate long-run behavior.
  3. **P1 gameplay:** meaningful skill differences, choice/drop/reward loop, and hero advancement availability; retain agreed skill slot milestones unless explicitly changed by the user.
  4. **P1 pacing:** optimize first reconstruction toward ~60 min under efficient play **after skills/gear/traits are represented**, and improve STAGE55~65 wall with meaningful intermediate options.
  5. **P1 interface/performance:** portrait combat focus, clear reward feedback, stats separation, avoid unnecessary per-frame DOM writes. Preserve current imagery, fix misleading boss HP art when convenient.
  6. **P2 polish:** equipment depth, trait rounding/point sinks, credit claim automation and boss differentiation, based on playtest evidence.
  7. **Deferred:** high-end new art/animation, multiple new character illustrations, new currencies, phase/deep progression expansion. Existing phase code/data must remain save-compatible and must not be deleted.
- **Protected core gameplay:** automated stage combat (no tapping), credits/upgrades, weapon/skills, permanent hero level/traits, reconstruction/core investment (no free rebirth-count bonus), automation, save/load/offline. Three timed quests remain lightweight supplementary income, not a new independent progression layer.
- Baseline: the existing 10-step audit in `docs/audit/2026-11-15-full-game-review-checklist.md` is complete. From now on, code/test fixes and audits are tracked separately. Production `main` is not overwritten; PR #2 remains draft until merged-code tests and real-device readiness are verified.


## Phase objective safeguard — implementation policy, 2026-11-15

- **Implementation choice, not a separately user-approved design change:** preserve normal auto-rebirth by default; allow the player to explicitly check **"위상 목표 우선"** in the existing Reset > Automation screen once automation research level 3 is unlocked. With this check ON and at least 2 reconstructions in the current phase, **automatic reconstruction is paused even when its core threshold is met**, allowing the current run to reach STAGE 180. Automatic purchasing continues and manual reconstruction/phase transition remain user-controlled.
- The setting is **OFF for legacy saves** (preserves behavior), persists on save/reload/regular rebirth/phase, and can be turned OFF at any time to resume auto-rebirth. With phase focus ON, the second reconstruction can still happen automatically; subsequent reconstructions wait. Do not auto-trigger phase transition without the player's choice.
- The existing auto-rebirth decision remains `gainCore() >= max(3,ceil(totalCores*0.15))`: **both** "at least 3 cores" and "15% of all cores ever gained in this phase" must hold, not OR. Fix UI wording and display the numeric threshold; do not silently make auto-rebirth much more aggressive by replacing AND with OR.
- Limitation: phase focus may substantially lengthen a run (especially weak permanent combat investments); the player can uncheck it. Further UX/play balance validation should compare both settings over multiple rebirths; do not call it an unconditional performance buff.
- Implementation commit `6d3d9e31`. PR CI storage regression `43706407957` **60/60 passed** including four new guard tests; Chromium portrait PR `43706407929` **passed**. Main/deployment and real Galaxy S25+ are untouched/unverified.


## First skill-choice gameplay trial — 2026-11-15 (provisional implementation, not a user-locked rule)

- The current **gameplay-first, graphics-light** manual branch offers **one optional first-skill selection per run at current STAGE 20**. Choice is nonblocking: combat and random drops continue if untouched. It resets on rebirth and phase. Old saves default the new flag to false.
- Existing `overload`, `chain`, `bountySkill` remain. Experimental 4th `trainingSkill` / 전술 훈련 offers **12 seconds of ×2 hero XP at skill Lv1, every 14 seconds**, with standard skill-level scaling. No attack-speed buff or bonus rebirth-stage jump.
- These new skill values and the optional choice are **playtest experiments**, not separately approved permanent user rules. Preserve the user-approved skill-slot levels (initial 1; LV10/25/40/60 increasing to 5), inheritance, and high-end-new-art deferral.
- Implementation `065f4651`, test harness follow-up `7f2368a6`. Latest PR regression **64/64 PASS**, run `43707318776`, portrait Chromium **PASS**, run `43707318779`. Still no actual Galaxy S25+ gameplay or main deployment.
