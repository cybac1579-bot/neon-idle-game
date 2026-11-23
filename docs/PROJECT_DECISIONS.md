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


## Chain discharge role differentiation — 2026-11-15 (P1 trial, not locked user rule)

- The earlier 3-skill redesign + newly added fourth `trainingSkill` left `overload` and `chain` as two very similar instant-damage abilities. This P1 experiment **keeps Overload** as an immediate 3×power hit on a 9-second cooldown, and changes **Chain** into three 0.6×power pulses, 1 second apart, on a 6-second cooldown. Each pulse can finish the current stage and remaining pulses carry across into the next stage. This is deliberately different in *play pattern*, not a different attack-speed stat (0.1s cap unchanged).
- Skill pulse state `chainPulses` / `chainPulseClock` is saved, bounded during legacy load and cleared when Chain is unequipped or on rebirth/phase. Existing skill ownership, hero levels, skill slot milestones LV10/25/40/60, inheritance and the exclusive core-spend economy remain unchanged. No extra active tapping is required.
- Simple transient **skill/reward text cues** are shown within the existing battle UI for skill activation, item/skill drops, the STAGE20 first-skill choice and permanent slot unlock; no new illustrated or animated art. Normal reward and skill ownership persist even after the cue disappears.
- **Provisional gameplay change for tests**: 0.6×power/pulse, cooldown and reward cue details are open to adjustment after real-user play. Five-seed original JS 0.25s simulations with attack-first purchases/claims every 10s yielded a first-rebirth-ready mean **2240.95s Chain** vs **2365.45s Overload** (Chain faster ~124.5s / 5.3%). This is a scenario-dependent mean, not mathematically optimal or human-phone test evidence. Hero LV10 generally still opens after the initial 30-minute play window.
- Functionality commit `7e1b62d7`, screenshot-report test correction `979489d0`. PR save regression **68/68 PASS** run `43710046251`, latest browser portrait + touch run `43710193707` **PASS** and push browser run `43710041533` **PASS**. No `main` merge or live Pages deployment, Android device play still unverified.


## Early hero XP and LV10 slot playability trial — 2026-11-15 (provisional, gameplay-first)

- Existing permanent hero level/one trait point per level, unlock **skill slots 1 base + LV10/25/40/60 → maximum 5**, inherited skills (1–2) and all legacy saves **must be preserved**. The user specifically asked to improve the time of the second slot rather than alter the agreed thresholds.
- Based on original game JS **5 seeded RNG × 2 first-skill choices × 4 temporary early-XP variants** before implementation, chose a targeted trial: `xpNeeded(level)=ceil(10*level^1.45*(level<10?0.6:1))`. Cumulative hero XP LV1→10 becomes **611 vs previous 1017 (-39.92%)**. XP needed for LV10→11 and all later levels is unchanged; already earned XP, permanent hero level and invested trait points are not removed.
- When a permanent level-up *opens* a new skill slot, equip only as many currently owned, un-equipped skills as slots just opened, in acquisition order. **Never replace equipped skills or invent unavailable skills**; users can manually unequip/rearrange. No hidden auto equip on every render, and no slot-level rule changes. Growth tab now displays XP remaining to the next permanent slot.
- The user-approved first-rebirth optimized target **~60 minutes is NOT reached** and must be rebalanced after gameplay skills/equipment/trait changes stabilize. The change speeds progression and may alter long-run combat investment; provisional 5-seed strategy tests should not be considered final economic balancing.
- Unexpected actual-screen QA issue found and fixed in the same user-directed step: previous `#skillList` displayed skill rows in 2 narrow columns, overlapping descriptions and buttons. Updated to full-width skill cards with separate text/actions, no new illustration and no extra navigation.
- Implementation `78ee1a06`, UI bug fix `4150f24f`. GitHub PR regressions **72/72 PASS** run `43715025067`; actual mobile Chromium portrait/touch UI **PASS** run `43715025057`, including skill cards no overlap at 360/390/412 CSSpx. This is a **trial** pending player feedback, not a permanent user-locked XP formula. Main and live Pages remain untouched.


## STAGE55–65 middle-growth bridge — 2026-11-15 (provisional gameplay trial)

- **Decision:** retain the existing STAGE55 frontline allocation (Balanced / Assault ×2.2 combat / Supply ×2.5 credit production). 5-seed original-code attack-first experiments showed the STAGE55→65 wall with no allocation choice **799.6s**, versus **382.5s** when Assault is actively selected at STAGE55. The primary problem is *insufficient visibility/value communication of an already implemented strategy*, not absence of raw power.
- At **STAGE60**, show **one optional support choice per reconstruction** **inside the existing allocation panel**: `firepower` grants existing combat-engine upgrade +2 levels; `industry` grants existing credit-forge +2 levels; `training` grants existing hero XP equal to the requirement for the current next hero level (which may grant a permanent hero level/trait point). No new currency, equip slot rule, prestige-count bonus or independent permanent progression layer is added. **Not selecting is supported**, automatic combat/production continue, and the choice persists on save/reload but resets at normal rebirth and phase. Old saves have `frontlineSupport:null`.
- STAGE55 and STAGE60 milestone reward cues, the battle goal, and the stats goal point to the existing allocation / new free support; newly selected option stays visually highlighted with readable contrast. The actual allocation multipliers were **not increased**. This is a **temporary tested design**, not a new immutable user-specified rule. User prioritized gameplay over expensive artwork; existing art is reused.
- Optimized-ish path is still **far faster** than the user-locked efficient-play first-rebirth target of **~60 minutes**: on 5 attack-first seeds, Assault+none first-STAGE100 mean **1384.4s (~23m04s)** and Assault+firepower +2 mean **1336.85s (~22m17s)**. Support is a modest additional benefit; **do not treat the wall as fully balanced**. Next: integrated global economy balance including skill/equipment/traits/core and intended 60m target; do not merely inflate HP and costs.
- Tests: branch `integration/reconcile-main-redesign-20261114`, functionality `041bd247`, reward amount/branch CI `d7cf668`, battle-vs-stats goal sync fix `5625d5b`, UI option highlighting + geometry `8d271a5`. Final **76/76 Node save regressions PASS** push CI `43719700252`, **mobile Chromium touch/layout PASS** push CI `43719700221`. Actual Galaxy S25+ hardware and main/live Pages not tested or deployed.


## Main / manual development reconciliation — 2026-11-15 (history-integrated, not deployed)

- **Protected pre-merge snapshot**: `backup/neon-manual-pre-main-sync-20261115` at manual head `68065c8e5c893c707499e99a56e9a26c59338a66`. Full Git two-parent merge commit `fcf1acdbfb1b9f1e22e6bd3766f411a285eaca9d` combines that manual head with then-live `main` head `9ab7fc1fd0c988fe880621ccc035cf8107c94094`. This was a **merge of main into the manual integration branch**; not a merge/deploy to main.
- The merged tree contains byte-identical latest `automation/coverage-matrix.md`, `automation/reference-research.md`, and `automation/verification-log.md` from main; no automatic test results/history discarded. The manual redesign `site/index.html`, combat/phase/skill/quest gameplay, portfolio docs and browser tests are preserved. The combined saved-game regression file retains 76 existing valid manual tests plus two current-main behaviors: truthfully displayed tier-first automatic purchase objective, and partial boss HP reload preservation (now 78 tests).
- Automatic upgrade decision retains the **manual-branch code's existing** highest unlocked tier-first rule with stable ordering for same-tier items; read-only `actionableGoal()` now describes that exact rule when automation is actually enabled, otherwise retains the existing manual cheapest-purchase hint. This merge does not silently change buying order. Saved partial boss HP is restored and clipped to enemy max, including old saves. Obsolete main-era tests requiring rebirth-count stage jumps and the removed periodic one-time cache were **not reintroduced**, because the confirmed new rules explicitly forbid them.
- **Integration stability:** Latest CI at `22c5a424`: manual branch Node save regression **78/78 PASS** run `43721292127`; Chromium portrait and touch playthrough **PASS** run `43721292060`, 360/390/412px and 10 real screenshots. Initial push Chromium run `43721140017` failed because a legitimate random skill drop created a third skill card after a test had incorrectly required exactly two; fixed **test-only** in `22c5a424` to check all actual skill cards for overlap and clipping. Both intermediate failure and verified fix are retained.
- PR #2 is **draft/open/unmerged**, `mergeable=true`, behind current main **0** at the comparison snapshot. Hourly main automation may cause later divergence; refresh both refs and CI status before any eventual merge. No deployment, actual Galaxy S25+ hardware test or user-confirmed mobile feel. Gameplay-first art deferral remains.


## Shared automatic + manual development — 2026-11-16 (latest confirmed workflow)

- The user requested that hourly automated improvement and interactive manual development **no longer be split into different gameplay branches**. This supersedes the previous operational arrangement in which automation modified production `main` while manual work modified `integration/reconcile-main-redesign-20261114`.
- **One canonical active development branch:** `integration/reconcile-main-redesign-20261114`. Both kinds of work read its latest HEAD, apply actual gameplay/test changes there, run GitHub Actions and re-read resulting commits. The scheduled automation prompt has been updated to point here.
- **Production safety:** `main` remains a protected live-release baseline, not the branch scheduled jobs should mutate. PR #2 stays draft/unmerged until integration and real-device readiness are verified. Do not automatically merge or deploy simply because CI is green.
- **Records are separated only for accountability:** `automation/` for scheduled verification and research; `docs/` for approved decisions, manual updates and handoffs. They do not denote different game versions or progression percentages.
- **Concurrency:** always fetch current working HEAD and target blob SHA before changes. On concurrent updates, compare and reconcile without force push, stale code overwrite, or silent removal of user-locked rules.
- All 27 latest main-only automation-documentation commits through `main@9918709e` were preserved as the second parent of shared-branch merge commit `54fafa62`. The manual gameplay tree was preserved, apart from exact updates to three automation Markdown files. Backup `backup/neon-before-shared-development-20261116` keeps the pre-sync manual head.
- Scheduled job is enabled; its **next actual run must confirm** that a scheduled run now reads/writes the shared branch. This recorded configuration does not prove future execution.


## Trial: automatic timed-quest reward claiming at automation research Lv2 — 2026-11-16

**Status: provisional implementation choice; NOT a new user-locked rule.** The user's existing direction is automatic combat, fewer repetitive inputs after reincarnation, distinct combat/economy/automation core investment, and eventual automated periodic credit claiming. The **Lv2 unlock and 30-second claim frequency are test hypotheses**; evaluate before preserving permanently. First-rebirth economics and user-approved skill/trait/inheritance rules are not changed.

- Independently opt in with a checkbox inside the existing reconstruction > automation panel. Requires `autoLevel >= 2` and does **not** require the separate automatic upgrade purchase toggle.
- Claim once every 30 seconds in foreground/offline using **the same `transferCacheCredits()` as the existing manual collection button**. The quest durations/payout/5-cycle reserve caps remain unchanged. This converts already earned rewards to spendable credits, never mints a new reward source or a currency.
- Defaults **OFF for old saves**; preserves chosen setting, research and claim clock through saves and normal reincarnations (clock resets to 0 when a new run starts). Core-research reset at the phase transition also resets this preference. No automatic reincarnation runs offline, as before.
- **Benefits (impact):** greatly reduces post-rebirth frequent reward-claim actions (large), makes a noncombat core-investment path give noticeable convenience (large), reuses a tested payment function and save schema (medium).
- **Drawbacks/risks (impact):** more post-rebirth credits may magnify investment imbalance (large; not yet 2+ rebirth simulated), a separate setting adds one control to the automation panel (small), Lv2 and 30s cadence may not be a natural unlock curve (medium; test-only).
- Do not treat this as replacing the P1 priority: meaningful STAGE 55–100 rewards and realistic efficient ~60m first rebirth remain ahead of further P2 convenience expansions.


## Trial: passive STAGE85 weapon × equipped-skill resonance — 2026-11-16

**Status: experimental implementation, not a permanently user-approved balance rule.** The original direction is meaningful skill/equipment choice, no compulsory active tapping, first rebirth near 60m for a high-efficiency player, and reduced repeat-time after further rebirths. Preserve the existing 4 skills and LV10/25/40/60 permanent slot thresholds; no new currency, button, or fifth skill was added.

- At **STAGE85+**, existing weapon tiers grant extra effect to **currently equipped** skills: common +10%, rare +15%, heroic +20% (of each skill effect, **not** overall character DPS). The four supported effects are Overload instant burst, Chain individual pulse damage, Bounty credit-on-kill boost, and Training hero-XP boost. Without a weapon or equipped skill, none activates. It is shown in the existing Growth > Equipment/Skills panel; no extra button or navigation.
- Stage 85 unlock is reflected in milestone text; optional stage 75 weapon reward still grants its per-run +20% weapon effect independently.
- **Bug fix:** weapon drop comparisons now use base `weaponScore(candidate) > weaponScore(s.weapon)`, not a temporary +20% `weaponMultiplier()` from stage75 reward. This restores proper automatic equipment upgrades during a temporarily boosted run.
- The resonance follows loaded weapon and equipped skills without any saved extra state. It deactivates automatically after normal rebirth/phase, when stage resets and the weapon is cleared; inherited skill/level/reset rules remain unchanged.
- **Advantages:** makes weapon tier and skill loadout influence STAGE85+ outcomes (medium), preserves one-tap-free passive combat with no extra economy or UI controls (large), derives from equipped loadout and therefore needs no migration or new save key (medium).
- **Risks/tradeoffs:** still only four distinct skills for five possible permanent slots (large unresolved content shortage), the small +10–20% skill-only gains may be too subtle to feel meaningful (medium), and existing fastest runs already reach stage100 too quickly relative to target, so even modest bonuses reduce their time further (medium). Future user playtest decides whether to retain/rebalance. No raw enemy HP/cost increase performed.


## 2026-11-16 provisional STAGE55 strategy tradeoff revision (supersedes earlier no-cost allocation trial)

**Status: test-only economy revision, not an immutable user-approved design.** The previous STAGE55 experiment made assault ×2.2 combat with no credit penalty and supply ×2.5 passive income with no combat penalty; Balanced was strictly dominated by Assault at equal production. This conflicted with the user's intended growth-route selection and ~60-minute high-efficiency first rebirth. The old recorded 2.2/2.5 bonus numbers remain historical baselines, not current active truth.

- Starting STAGE55, **Balanced:** combat ×1, passive credit ×1, enemy-kill credits ×1. **Assault:** combat ×2.2, passive credits ×0.75, enemy-kill credits ×0.8. **Supply:** combat ×0.8, passive credits ×2.5, enemy-kill credits ×1.5.
- The penalty/benefit applies **only while selected after stage55**, is instantly reversible, and is cleared on regular reincarnation/phase. The user can switch without spending currency. Timed quest payouts, milestone credits, core rewards, level/traits, weapon slots, spell cooldowns, saved schema and auto combat are untouched.
- Research evidence showed passive credit production had become irrelevant compared to exponentially increasing enemy rewards (e.g. STAGE65 base kill ~1.09M versus forge LV5 passive ~3K credits per minute without other modifiers), hence supply also affects **existing enemy-kill** credits. No new credit source was added.
- Real front-loaded user actions are not increased. The three options appear in the same Growth screen with actual combat DPS, passive production and kill-reward multiplier previews.

**Benefits:** (1) none of the three modes strictly dominates both combat and credit income (**large** for choice integrity), (2) supply+income skills creates a real alternative resource-oriented route rather than a dead passive statistic (**medium**), (3) no extra UI panel/currency/tapping/new save field (**large** for simplicity).
**Drawbacks:** (1) at current simulated STAGE100 objective Assault still completes faster than Balanced/Supply (**large unresolved depth risk**), (2) 60s/3-level value+Chain first Stage100 rose to ~83m18 while a 10s active same-build run is ~41m06, so optimized ~60m target remains unmet (**large**), (3) extra kill-reward multipliers interact with Bounty skill and future automation after rebirth, needing longer-run validation (**medium**).

The adjustment is a provisional candidate, not a claim that the game has good final strategy balance. A staged human-like **Supply 55–64 → Assault from65** diagnostic is allowed (one extra mode choice) to check whether saving before Reactor unlock pays back. It is not an automated in-game feature. Do not add more modes or complexity before actual 30-minute mobile experience and multi-rebirth testing.


## 2026-11-16 progressive auto-buy research trial, 3-rebirth validation

**Status: provisional balance trial, not a new immutable user requirement.** The user's priority remains rewarding post-rebirth compression without tapping, differentiated long-term core investments, no free bonus tied only to rebirth count, and all paths eventually unlockable. Existing first-STAGE100 efficient play target near **60 minutes** is still not met (current 10-second high-interaction and 60-second low-input scenarios remain very far apart).

**Finding from actual game code:** former automatic purchasing at research LV1 granted **up to 11 buys every 10 seconds**, and at LV2 **up to 19 buys every 8 seconds**. Earlier spoken statement that LV1 tick was 30 seconds and LV2 was 10 seconds was incorrect: the array `[30,10,8,6,4,3]` is indexed by research level, so LV0=30s (auto-buy locked), LV1=10s, LV2=8s, LV3=6s, LV4=4s, LV5=3s. This discrepancy has been corrected in tests and the record.

**Live trial adjustment:** keep existing intervals and tier-first affordable purchase priority, but make purchases-per-tick advance with research level: LV0=0, LV1=1, LV2=1, LV3=2, LV4=3, LV5=5. This avoids 11 instant purchases on the first automation unlock while preserving faster purchasing at higher ranks. Core costs/maximum LV5, auto-buy opt-in, quest auto-claim at LV2, save schema, manual 1/3-level buttons, hero/skills/inheritance, enemy curve and art stay unchanged. The old high-batch algorithm remains available **only as an explicitly labeled counterfactual in test code**, not a user option.

**Benefits (impact):** (1) lowers runaway strength of earliest automation investment (large), (2) retains idle/rebirth compression and more frequent purchases after additional core research (large), (3) keeps existing controls, rewards, core tier and storage keys (medium).
**Costs/risks (impact):** (1) early automation is still faster than combat in the constrained-input model, so route superiority remains (large), (2) legacy save owners at LV1 will experience fewer automated purchases than previously and thus a changed economy (medium; provisional balancing), (3) a 3-rebirth scripted simulation with five fixed seeds does not verify actual user enjoyment or every future core combination (large unknown). Do not present the trial as a final balanced path design.

**Five-seed actual production JS evidence, identical first run for each route:** STAGE100 first **4,998.40 seconds (83m18s)**. Second/third by persistent-core spending (seconds; manual visits every 60s except `automation-lite` every 180s after first reset):
- Combat: **4461.40 / 4302.20**, ~493.6 manual actions total across 3 runs.
- Economy: **4617.30 / 4505.20**, ~504.8 actions.
- Automation (live progressive budget): **4041.95 / 3359.30**, ~326.2 actions.
- Automation-lite (3-min visits): **3964.50 / 3905.50**, ~245.4 actions.
- Legacy high-batch counterfactual: automation **3360.30 / 3353.10**, ~281.8 actions; auto-lite **3567.05 / 3420.30**, ~230.2 actions.
All **5/5 seeds completed all 3 STAGE100 cycles** for each policy/variant, but this is not human play nor statistical proof of optimality. The scripted driver explicitly counts core purchases and switches enabling auto-buy and auto-claim as user actions. After first rebirth the standard 5 core payout permits LV1 auto research (cost 3); LV2 costs 6 and is reached after second rebirth in simulated path. Auto-claim therefore begins on the third run and remains an opt-in option.

**Next direction:** avoid further arbitrary global enemy HP/cost inflation or endlessly changing research numbers. Prioritize the actual STAGE55–100 reward choice depth and compare mixed core investments, multi-rebirth sustainability, user control burden and mobile gameplay before locking balancing.


## 2026-11-16 provisional STAGE65 fifth skill — energy-cycle discovery

**Status: implemented playtest candidate; not an immutable user-approved new balance rule.** The user prioritizes meaningful STAGE55–100 growth, differentiated equipment and skills, and a maximum of five equipped skill slots, with no compulsory tap combat or new high-end art while gameplay is still unvalidated.

- The four STAGE20 initial choice skills remain unchanged and remain the only free first-selection options before STAGE65. The **fifth skill, '전력 순환' (capacitor)**, is acquired automatically the first time the current run reaches STAGE65 unless already owned (including inherited), and is also eligible for standard drops only at STAGE65+. Legacy saves already past 65 without the skill receive it at the next kill. There is no new button, currency, slot, equipment type or character art.
- The skill triggers on an **18-second cooldown** and for **10 seconds** doubles existing energy generation and increases existing sustained combat power based on stored energy: at skill LV1 bonus = min(45%, log10(1+energy) × 6%). Existing per-skill level progression improves this temporary combat bonus. At STAGE85+ equipped weapon rarity adds the existing skill resonance of +10/15/20% **of that effect**. It does not remove stored energy, alter attack-speed cap, create a new damage pulse or add an extra tapping mechanic.
- If an equip slot is free, the new skill auto-equips. If slots are already full, existing equipped skills are **never silently replaced**; the Growth panel displays a "전력 순환 미장착" instruction. The user may manually unequip another skill and equip it. The agreed initial + LV10/25/40/60 thresholds for a maximum of five slots remain untouched.
- New skill ownership/XP follows normal rules; after rebirth/phase the skill is reset unless selected as one of 1–2 inheritable skills, then the inheriting skill level resets to 1. The timed effect clears on reset and immediately on unequip, preventing temporary buff stacking via hot-swapping. Saved malformed buff duration is clamped to 0–10 seconds and dropped entirely when the skill is not equipped.
- **Advantages:** (large) turns a content-light STAGE65 bridge into a guaranteed new skill, independent of RNG; (medium) makes existing generator/energy/amp investment interact with a distinct *sustained* skill rather than another instant-damage attack; (large) expands obtainable skills to exactly the maximum five slots without changing permanent slot thresholds, controls, or save keys.
- **Risks:** (medium) before enough hero-level slots are available, the reward is owned but not equipped and players may need to swap; (medium) stored energy can make the boost stronger than expected at later phases and high skill levels, so real power curves need tuning; (large uncertainty) seeded first-STAGE100 automated scripts do not manually equip the newly obtained skill when slots are full, so nearly unchanged run times do **not** prove the new skill is ineffective or balanced. Actual 30-minute player feedback is still required.
- No overall HP/cost brute inflation, direct first-rebirth count benefit, additional fifth active button, or artwork update was introduced. The first optimized ~60-minute reconstruction target and realistic 30-minute engagement remain open.


## 2026-11-16 STAGE65 chain × capacitor gameplay combo trial

**Status: playtest candidate, not an unchangeable user-approved balance rule.** This experiment builds on the new guaranteed STAGE65 `capacitor` skill rather than adding currencies, cast buttons, permanent traits or skill slots. All battle input remains automatic.

- **Observation from real-game simulation:** low-input visits every 60 seconds, three fixed RNG seeds, identical value-based purchase policy and same chain first-skill selection. With no manual equipment changes ('natural'), first STAGE100 ~**4,942.92s** (82m23s). Keeping Chain only ~**4,941.42s**; swapping to Capacitor only **4,799.83s** (~80m00s); explicitly equipping Chain+Capacitor **4,786.33s** (~79m46s). The 13.5-second pair advantage against Capacitor-only was too weak to establish satisfying combination-specific gameplay.
- **Implemented unique skill-combination behavior:** while **both Chain and Capacitor are equipped** and Capacitor's ordinary 10-second energy buff is active, individual Chain pulse damage is multiplied by **2**. Existing charged duration, resonance with STAGE85 weapon tiers, 0.1s attack-speed cap, equip/inherit reset, save keys, chain pulse timing and regular attack strength are unchanged. The battle cue displays **'충전 연쇄'** when a charged pulse hits; the existing Growth skill summary shows an available pair-combo hint or active-combination description, without adding controls/navigation.
- **Post-change tested 3-seed mean STAGE100:** 'natural' **4,942.92s** unchanged, 'chain' **4,941.42s**, 'capacitor' **4,780.58s** (~79m41s), 'pair' **4,754.33s** (~79m14s). The combo increases combined-build value by **32 seconds** versus the previously tested pair; pair vs capacitor-only is now **26.25 seconds**. This is a modest improvement, not final satisfactory gameplay proof.
- **Benefits:** (large) real simultaneous-skill interaction, beyond standalone additive bonuses, without new required tapping; (medium) an optional reason to spend two equipped slots and inspect combinations; (medium) existing battle cue makes the interaction observable during unattended combat.
- **Costs/risks:** (medium) synergy still yields under one minute advantage in this test and may be too subtle; (medium) later five permanent skill slots can eventually hold **all five currently implemented skills**, eliminating loadout tradeoffs unless more alternatives are eventually created; (large uncertainty) three seed scenarios and a 60-second scripted purchase policy cannot establish enjoyment, tactical payoff or globally optimal first-rebirth pacing. Very-active first-run timing still ~41m vs low-input ~83m, far from reliably hitting the user's ~60m high-efficiency target.
- **Automation/rebirth:** the combo is entirely based on actual equipped skills and active buff, so it naturally ends when unequipped or at rebirth/phase; no separate stored 'combo' flag. Inherited skill limits (one or two) are unchanged. Next P1 should test other viable competing skill pairs and real phone usability before adding large categories of systems or finalizing bonuses.


## 2026-11-16 STAGE35 tactical reinforcement and 60-second fast-quest reserve — trial

**Status: first-30-minute playtest candidate, not a new immutable user-approved rule.** Goal: make an otherwise credit-only STAGE35 milestone visibly rewarding, soften early skill-drop randomness, and reduce the need to manually collect a six-second quest every 30 seconds. No extra tap, page, currency, forced skill replacement, premium art, or passive-combat redesign.

- **STAGE35:** only on the actual stage34→35 transition, if exactly one early skill is owned, grant one complementary skill from the existing initial four. Deterministic partners: Chain→Bounty, Overload→Training, Bounty→Chain, Training→Overload. The skill is auto-equipped only if an existing permanent hero-level slot is free; the player retains previous equipped skills if full. If already at least two skills and one equipped skill below LV20 exists, grant the first eligible equipped skill +3 XP instead. No skill is force-chosen when the player has zero owned skills, preserving the STAGE20 first-skill-choice opportunity. Existing milestone credit bonus still applies, and existing save/rebirth/skill inheritance resets continue. The one-stage transition needs **no additional persisted entitlement flag**; old saves after STAGE35 do not retroactively receive it.
- **Timed quests:** existing three queues still use original 6s/30s/120s cycles, payout formula, manual claim, optional permanent-research Lv2 auto claim, offline simulation, and no double payment. The **6s emergency delivery** now accumulates **10 payouts (60 seconds)** instead of 5 payouts (30 seconds); other two queues remain at five. This reduces reward forfeiture for the user who visits every 60s while remaining a finite reserve, not a new reward source.
- **Benefits:** (large) a guaranteed mid-early skill discovery when random drops have been sparse; (medium) a useful old-skill XP reward if drops were abundant; (large) less frequent quest harvesting pressure without weakening the meaningful later automatic-claim perk; (medium) all content visible in existing Growth/milestone/reward cue, no screen crowding.
- **Risks:** (medium) changing which second skill fills a scarce early slot can alter first-run combat/economy unpredictably; (medium) longer 6s reward storage modestly increases collected credits if the player already checks every 60s, but never accelerates rewards for a player collecting every 30s; (medium) STAGE35 doesn't help a user who has deliberately ignored initial skill selection and has zero owned skills; (large uncertainty) Android first-30-minute enjoyment is still untested, and the ~60m best-efficiency first-rebirth economy goal remains unresolved. Keep these values provisional.
- **Measurements (actual JS seeded policy, not human play):** the 5-seed 10s manual decision value+Chain first STAGE100 became ~**2,540.15s (42m20s)** vs previous ~2,465.95s (41m06s); 60s/3-level value+Chain became ~**5,031.65s (83m52s)** vs 4,998.40s (83m18s); average stage at 30min remains **52**, low-input 30min manual actions **67.8**. The change can slow fixed-policy runs by changing the second equipped skill; it is not an across-the-board speed improvement. It is intended to add early reward reliability and reduce claim pressure, not to bypass the pacing goal.


## 2026-11-17 visual direction: high-fidelity character pixel art is an alternative, NOT low-resolution placeholder art

**User's explicit preference:** If art-production constraints later motivate a switch to pixel art, the intended quality is **high-detail action-RPG sprite art in the spirit of Dungeon Fighter Online (던전앤파이터)** — expressive characters, intricate costumes, readable silhouettes, refined attack/skill frame animation, rich effects and strong personality. **Never interpret “도트” as crudely pixelated low-effort placeholders, an 8-bit/low-resolution retro mandate, or permission to compromise character attractiveness.** Dungeon Fighter Online is a *quality/animation reference*, not a request to copy its protected character designs or assets.

**Decision status:** stylistic **contingency/option**, *not* approval to replace current battle UI, character illustrations, backgrounds or existing WEBP/SVG assets. Keep current visual direction and production pipeline unless user explicitly chooses to switch based on direct comparison/production evidence. The user cares strongly about battle observation, attractive female characters and quality action animations; distinguish “production efficiency” from “cheap style.”

Pros of testing this style later: (large) strong readable repeatable attack animation for unattended combat, (medium) reusable sprite-based action/effect language across enemies, (medium) attractive distinct character silhouettes. Risks: (large) high-detail sprites with many attacks/frame angles can cost **more** work than cutout animations, (medium) visible style mismatch with painted portraits/UI, (medium) phone-scale readability and memory costs need actual-device verification. **Do not claim high-quality pixel art is automatically faster.**

**Proof gate before any switch:** make *one* production-equivalent character plus one enemy in the actual mobile portrait battle scene; compare asset authoring+integration time, app/frame performance, attack effect legibility, and subjective player appeal to current illustration style. Preserve existing assets in source control. Meanwhile prioritize a separate shared-branch **preview playtest build**, not production `main`/GitHub Pages, to obtain first real 30-minute feedback.


## 2026-11-17 local-only first-player telemetry before any further balance changes

**User priority confirmed:** Halt speculative balancing changes until there is real player feedback. Implement **local gameplay recording + manual JSON export first**. Automatic network upload/server analytics are **not approved**.

- A new independent `site/playtest.js` observes the actual existing browser game without modifying its combat, economy, XP, equipment, skills, trait, rebirth or persistence rules. It lives in localStorage under `neon_playtest_log_v1`, **separate** from the canonical game save key `neon_rework_07`. A record reset has its own confirmation and must not clear gameplay save; no new navigation tab.
- Record session starts, real elapsed seconds and periodic foreground snapshots; stage progression and approximate times; manually purchased upgrade level and cost with buttons/batches distinct from automatic total upgrade levels; manual and automatic timed-quest claims and credits; first skill selection, equipment/inheritance changes, trait and core investments, allocation, milestone rewards, and rebirth/phase; background return and offline settlement if applicable. Auto purchasing is aggregated into counters to avoid writing every individual automated action, while events are bounded to the latest 1,200 entries and dropped-event count is retained. This is **instrumentation**, not a gameplay re-balance.
- Stats tab contains **‘플레이 기록 JSON 내보내기’** and **‘플레이 기록만 초기화’**. Only the player clicking export creates a local JSON download. No network requests, device ID, player account or URL analytics. The JSON contains user gameplay information and timestamps and should be treated as player-shared data only when attached to ChatGPT.
- **Expected usage:** after opening the correctly versioned test candidate, enter **통계 → 플레이 기록만 초기화** at the start of a 30-minute session; play normally, then **통계 → 플레이 기록 JSON 내보내기** and attach the generated `neon-playtest-YYYY-MM-DD.json` file in ChatGPT. Give brief subjective feedback (where bored, would continue?) in parallel. Don't confuse this with a 30-minute human playtest already completed.
- **Integrity checks:** Node/static parse and source separation; actual Chromium GUI purchase/quest/skill/stage instrumentation, downloadable JSON payload, privacy constraints, reload persist and clear with gameplay save retention. Real S25+ background/offline functionality still requires user device. Avoid claiming the system can silently read personal localStorage or see the game without explicit export.
- Old speculative suggestion to raise six-second quest cache cap from ten to twenty is on hold; existing ten deliveries (60s) remain unchanged until user play evidence. First efficient STAGE100 ~60m remains target, not validated.


## Core game reference approved — 2026-11-17 (latest explicit user decision; supersedes prior unapproved redesign)
- **Approved:** Rebuild the basic gameplay *closely around the structural loop* of 《환생용병단》 / Rogue with the Dead before proposing bespoke additional content. Reuse familiar genre mechanics and priorities; do **not** copy original source, proprietary UI layout, character names/designs, narrative, proprietary art/audio, or other protected expression.
- **Priority order:** (1) continually advancing auto-fighting mercenary squad and enemy/boss encounter; (2) unit recruitment, unit development and idle quest income; (3) chest reward and satisfying permanent artifact collection/encyclopedia; (4) player-as-commander permanent progress, rebirth and a meaningfully improved next run; (5) offline progress, save/reload and low touch interaction. Work on additional original content **only after basic spine is demonstrated as successful in real play**.
- **Player is a permanent commander, not the single combatant.** Keep player level/traits concept and rebirth core (no arbitrary bonus for rebirth *count*) but postpone reconciling old skill-slot/inheritance specifics until the loop proves meaningful. Preserve previous saves and legacy implementation untouched while designing the parallel prototype.
- **Explicitly deferred:** phase/late-game expansion, extra currencies, new independent game systems, broad animation/art production, tuning legacy Stage 60/65/75/85, and polishing the old 60-minute target before the new 20–30 minute play loop is validated.
- **Engineering:** shared work branch \`integration/reconcile-main-redesign-20261114\`; leave \`main\`, existing Pages/PR and legacy \`site/index.html\`/save schema intact. Add a separate opt-in prototype entry point; implement and test the new loop separately. Do not declare it fun or ready until actual phone play validation.
- **Scheduled automation rule:** the newer explicitly approved redesign takes precedence over old instructions that would keep building stand-alone systems in the legacy game. Read this section before making any code change. Automatic work should only advance the new core loop or safety tests, and must not auto-merge or replace current public game.
- **Reference caution:** players' remembered game experience is the rationale, not evidence that all original content is required. Focus on fidelity of *interaction rhythm and progression loop*, not on pixel-perfect duplication.
