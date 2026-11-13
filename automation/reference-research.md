# Automated reference research (separate from manual development)

This file accumulates comparative design research for the **production/legacy** Neon Idle Game on `main`. It is not a manual development log and is not a specification for the separate reference redesign branch. Never clone another game's art, assets, exact skill tree or progression formula. Hard constraint: **no repeated tapping, rapid reactions, or mandatory active combat**; combat is automatic with optional low-frequency strategic choices.

## 2026-11-12 19:56 KST — Idle Slayer: ascension persistence and offline convenience

Sources (secondary community documentation; not independently verified in-game):
- https://idleslayer.fandom.com/wiki/Ascension
- https://www.reddit.com/r/idleslayer/comments/185susb/
- https://www.reddit.com/r/idleslayer/comments/14n0soc

**Observation:** Idle Slayer's ascension tree includes upgrades that permanently retain early unlocks/quests, plus distinct offline benefits; later ultra ascension can reset the ordinary ascension tree. Community reports note that repeated resets can feel burdensome, and the game favors active play in some phases. The useful transferable principle is **remove already-solved friction after a reset**, not copy its reset tiers or require tapping.

**Pros (impact):** (1) Permanent quality-of-life unlocks give resets a visible meaning (high); (2) preserving early automation reduces repetitive upgrade work (high); (3) a compact next-unlock preview communicates goals without cluttering combat (medium).

**Cons / risks (impact):** (1) too much persistence can trivialize early stages and boss encounters (high); (2) another meta-currency/tree adds cognitive/UI cost (medium-high); (3) copying active-play incentives violates the mobile idle constraint (critical).

**Application cost:** low-medium for a read-only post-rebirth summary and unlock-preview using existing state; medium-high for new persistent upgrade effects, save migration, and balance simulation.

**Decision:** **Apply selectively in a later implementation**: prefer a compact post-rebirth summary of retained benefits and next unlock on a separate growth/details surface, not a new combat button. **Defer** new prestige currency, forced activity, and permanent boss-skipping until 30-minute new-save and post-rebirth pacing are validated. Existing boss-stop rule must remain intact. No gameplay change made from this research in this run.

**Testable next step:** measure first/second rebirth purchase counts, time to next meaningful unlock, and whether an informational summary can reuse existing state without a save schema change. Validate on portrait UI and actual device before claiming improved feel.


## 2026-11-12 20:51 KST — Rogue with the Dead: readable automatic battle and rebirth tradeoffs

Sources: official store description https://apps.apple.com/tw/app/rogue-with-the-dead-%E4%BA%A1%E9%80%94%E8%BD%89%E7%94%9F/id1515542137 ; official support https://rwtd-support.net/faq/ja/ ; review https://gameslife.jp/rogue-with-the-dead/ (secondary).

**Observed from store/support:** battles are automatic; differentiated frontline defenders, ranged and area-damage troops; boss gates; persistent artifacts after rebirth; offline quest income. Support documents different rewards for death versus deliberate return. This is a comparison, not a claim that Neon currently implements troop formations.

**Pros (impact):** (1) readable front/back attack roles give battles visual meaning without taps (high); (2) persistent artifacts make reset progression tangible (high); (3) deliberate return vs defeat makes rebirth a strategic choice (medium).
**Cons (impact):** (1) adding troop AI/formation is a major scope increase (high); (2) separate rebirth reward paths complicate economy and save compatibility (high); (3) multiple simultaneously animated units can overload small portrait screens and battery (high).
**Estimated implementation cost:** low for stronger visual enemy/skill differentiation using current single-hero combat; high for multi-unit AI, rebirth reward branches, and their tests.
**Decision:** apply the *principle* of visible differentiated automatic combat; **defer** new troop classes, alternate rebirth rewards and extra currencies. Preserve mandatory boss stops and no repeated-tap combat. Next testable change: add lightweight differentiated attack/skill cue states with reduced-motion and mobile performance guards; verify in browser and on device before claiming visual quality.

## 2026-11-12 21:54 KST — Antimatter Dimensions: non-spending milestones and reset friction

Source (community-maintained game documentation): https://antimatterdimensions.wiki.gg/wiki/Eternity_Milestones ; achievements overview https://antimatterdimensions.wiki.gg/wiki/Achievements . The milestone reference describes cumulative Eternity-count unlocks that do not spend the count, including retained unlocks, autobuyers, and conditional offline income. This is a design reference, not direct hands-on verification.

**Benefits (impact):** (1) non-spending milestone counters make long-term progress legible without another currency (high); (2) keeping automation after resets reduces repetitive interaction (high); (3) predictable next milestone supports optional long-term planning (medium).
**Risks (impact):** (1) too many thresholds make the growth UI dense (high); (2) retained upgrades can flatten early combat pacing (high); (3) overlapping offline production and automation rules complicate save migration and balance (medium-high).
**Cost / expected value:** low for read-only next-unlock/retained-benefit summary based on existing state; medium-high for persistent effects and balancing; potentially high UX value but not proven for Neon.
**Decision:** **Apply principle only / defer gameplay unlocks** until first and second rebirth pacing and actual portrait usability are measured. Prefer a small growth/details-panel milestone preview rather than extra battle buttons; no new tap mechanics. Do not copy AD's formulas, numbers, achievements or trees. This run made no AD-derived gameplay changes.
**Next testable step:** verify post-rebirth goal wording and persistence with fixture tests, then measure player-facing milestone clarity in a real mobile browser.

## 2026-11-12 22:54 KST — Melvor Idle: auto-combat target selection and automation guardrails

Sources: community wiki combat overview https://melvor-idle.fandom.com/ru/wiki/%D0%91%D0%BE%D0%B9 ; Melvor wiki combat loadout https://melvoridle.wiki/tools/combat-loadout ; reported Auto Slayer eligibility inconsistency https://github.com/MelvorIdle/melvoridle.github.io/issues/2155 ; player feedback about managing loadouts https://www.reddit.com/r/MelvorIdle/comments/1cgtyv4/ . These are external references, not hands-on verification of a current build.

**Transferable idea:** combat continues automatically after selecting a target and preparing a loadout. Optional strategic choices can be infrequent and meaningful (target class, loadout, risk) without repetitive taps. The reported Auto Slayer eligibility inconsistency illustrates why automatic and manual target selection should share one eligibility predicate.

**Advantages / impact:** (1) optional pre-battle strategy gives agency without reaction demands (high); (2) explicit target eligibility reduces confusing automation behavior (high); (3) separating detailed loadout stats from battle canvas protects portrait readability (medium-high).

**Drawbacks / impact:** (1) target pools and equipment counters can multiply balancing work (high); (2) automatically switching to dangerous enemies can produce unexplained losses (high); (3) extra selection UI risks crowding the existing battle screen (high).

**Estimated Neon cost / expected effect:** low for auditing current auto-buy/auto-rebirth eligibility consistency and adding regression fixtures; medium for a compact optional pre-battle preference in the existing growth/details surface; high for multi-target enemy AI and gear-counter systems. Potentially high agency/clarity benefit, unproven until tested.

**Decision:** **apply audit principle now, defer new mechanics**. Keep default fully automatic combat and existing boss stops. Before any target-selection feature, test shared eligibility and save compatibility; do not introduce tap attacks, mandatory manual targeting, or a dense combat toolbar. Next research should examine a different game's clear offline-return summary rather than repeat combat automation.

## 2026-11-12 23:57 KST — Idle Champions: offline simulation transparency and reset automation

Sources: https://idlechampions.fandom.com/wiki/Modron_Automation ; https://steamcommunity.com/app/627690/discussions/0/3609015230786416930/ ; https://www.reddit.com/r/idlechampions/comments/1k73byy/ . These describe documented/community-reported behavior, not a current hands-on build.

**Transferable principle:** distinguish foreground and offline progression, clearly summarize offline rewards and stopping conditions, and avoid hidden reset/automation surprises. Idle Champions' saved formations and area-based reset loops show the value of transparent configuration, but also the setup burden and divergence between offline and foreground mechanics.

**Advantages (impact):** (1) return summary can explain time, credits, stages, and capped rewards without requiring taps (high); (2) explicit offline automation exclusions prevent unexpected rebirths (high); (3) a shared summary model aids regression testing (medium-high).
**Drawbacks (impact):** (1) detailed return overlays interrupt mobile play (high); (2) promising offline/foreground parity where algorithms differ misleads users (high); (3) multi-party or formation automation is excessive scope and UI cost (high).
**Cost / expected value:** low-medium for a compact optional return summary from existing settlement values; medium for accurate before/after snapshots and fixture coverage; high for parity guarantees or multi-party automation. Potential clarity benefit, not yet player-validated.
**Decision:** **defer UI until offline lifecycle fixture coverage and real mobile view are checked**; prioritize accurate accounting and a nonmodal summary in an existing detail/status surface. No active tap mechanics, forced manual decisions, or automatic offline rebirth. Avoid copying formations, currencies, or formulas.
**Next verification:** test 7,200-second cap, offline no-rebirth, and visible/hidden resume without duplicate rewards; verify that the current log message communicates actual credited time, not elapsed wall time.

## 2026-11-13 00:59 KST — NGU Idle: layered idle progression and information overload

Reference: https://store.steampowered.com/app/1147690/NGU_IDLE/ (official store listing; comparative design interpretation, not hands-on current-build verification).

**Transferable idea:** multiple persistent progression layers can provide long-term goals while combat remains mostly automatic. Separate short-term action feedback from deep upgrade statistics rather than exposing all systems in the battle view.

**Benefits / impact:** (1) layered milestones support long-term retention (high); (2) optional detailed growth panels protect battle readability (high); (3) permanent unlocks can reduce repeat-work after resets (medium-high).
**Risks / impact:** (1) dense menus and overlapping currencies obscure the next meaningful choice (high); (2) excessive simultaneous systems dilute enemy/boss identity (high); (3) long automation chains and unfamiliar terminology raise onboarding cost (medium-high).
**Cost / expected value:** low for auditing existing goal/detail placement; medium for milestone summaries; high for introducing new currencies or progression layers. No gameplay benefit proven for Neon yet.
**Decision:** adopt only the *separation of battle feedback and detailed statistics* as an evaluation criterion; defer new layers and currencies until existing first/second rebirth and mobile layout are validated. No mandatory taps or rapid input. This run added an offline-cap regression fixture, not an NGU-derived gameplay change.

## 2026-11-13 01:52 KST — Universal Paperclips: phase transitions without input pressure

Reference: original browser game https://www.decisionproblem.com/paperclips/ (gameplay design reference; no hands-on session or current-build measurement in this run).

**Transferable principle:** make a new progression phase recognizable through a changed goal, resource tradeoff and presentation rather than merely adding a new currency. For Neon, existing phase/rebirth systems could explain the next unlock in the growth/details panel while the battle remains automatic.

**Benefits / impact:** (1) clear phase milestones can create meaningful long-term goals (high); (2) showing one next milestone can reduce cognitive load on portrait screens (medium-high); (3) using existing phase state avoids new save fields (medium).
**Drawbacks / impact:** (1) copying the original's clicking and micromanagement violates Neon's low-input rule (critical); (2) abrupt phase transitions may obscure ongoing combat and boss progression (high); (3) adding more resource conversion layers could amplify balance and tutorial cost (high).
**Estimated cost / expected value:** low for read-only next-phase copy and tests, medium for UI presentation and localization, high for a new economic phase. Benefit to real-player comprehension is plausible but not measured.
**Decision:** **apply only as a future clarity audit**, not a mechanic. Keep automatic battle and existing boss stops, defer new resource layers and any rapid-tap loop. First obtain executable evidence for the 24-case suite and actual mobile portrait usability; then test whether existing phase unlock text already communicates the next objective.


## 2026-11-13 02:58 KST — Cookie Clicker: milestones versus attention demand

Source: original game https://orteil.dashnet.org/cookieclicker/ (design comparison; no hands-on run in this check).

**Transferable principle:** recognizable milestone/achievement cues and a persistent progression ladder can make otherwise passive accumulation legible. This does **not** justify importing click-to-progress or timed golden-cookie reactions.

**Benefits (impact):** (1) milestone visibility makes idle waiting purposeful (high); (2) compact next-goal indicator can reuse existing phase/rebirth state (medium-high); (3) optional history of milestones provides a sense of progress after reset (medium).

**Costs/risks (impact):** (1) click-driven primary loop violates Neon’s no-repeated-tapping constraint (critical); (2) event popups compete with combat readability on portrait displays (high); (3) achievement sprawl and extra unlocks require balancing and save migration (medium-high).

**Cost / decision:** low for a read-only milestone summary on the existing growth/detail surface; medium-high for new unlock effects. **Apply only the clarity principle; defer implementation** until actual phone viewport and current phase-goal wording are tested. No extra combat buttons, timed taps or currency layers. No gameplay changes this run.


## 2026-11-13 03:53 KST — Realm Grinder: meaningful reset choice without click pressure

Sources: original developer game page https://www.kongregate.com/en/games/divinegames/realm-grinder ; strategy overview https://www.pcgamer.com/realm-grinder-guide/ ; player-reported repetition https://www.reddit.com/r/incremental_games/comments/uj4bkj/ . Source review only, not a current hands-on game session.

**Observation:** faction selection changes passive/active production builds; abdication resets faction affiliation while permanent gem progression accumulates. This supports differentiated long-term choices, but the original also includes manual treasure clicking and extensive repeated purchase/reset loops.

**Benefits / impact:** (1) distinct passive strategies offer replay variety without requiring reaction inputs (high); (2) reset decisions can feel consequential when one persistent benefit is clearly explained (high); (3) an optional next-reset preview may reduce uncertainty (medium-high).
**Risks / impact:** (1) factions/build trees create large balance and save-schema burden (high); (2) rapid abdication/purchase repetition conflicts with Neon mobile low-input rule (critical); (3) many production modifiers obscure enemy/boss progression (high).
**Cost / expected value:** low for auditing existing rebirth-preview text and test coverage; medium for an optional read-only comparison using current state; high for faction systems. Potential strategic clarity is plausible, not device-validated.
**Decision:** **adopt only the principle of meaningful, clearly previewed low-frequency reset decisions; defer new factions, currencies, click loops, and rapid repeated resets.** Keep automatic combat and battle presence. Next evidence: test visibility-resume settlement exactly once and verify current reset preview in portrait browser before considering UI changes.


## 2026-11-13 04:56 KST — Kittens Game: resource ceilings and low-input production planning

Source: https://kittensgame.com/web/ (original browser game; design interpretation only, not hands-on measurement).

**Transferable idea:** resource caps and production goals can make long passive intervals understandable, but hidden caps can make waiting feel wasted. Neon already caps periodic credits at five payouts, so explain this limit in the existing detail/status area rather than add a mandatory collection prompt.

**Advantages / impact:** (1) visible cap prevents confusion over lost offline earnings (high); (2) a clear next production target makes idle waiting purposeful (medium-high); (3) optional read-only details protect the automatic combat canvas (high).
**Drawbacks / impact:** (1) many resource types and production chains increase cognitive burden (high); (2) requiring frequent cap clearing would violate low-input expectations (critical); (3) extra meters and prompts crowd portrait battle (high).
**Cost / expected effect:** low for auditing existing cap text; medium for a nonmodal detail summary; high for new production chains. Comprehension benefit plausible, not player-tested.
**Decision:** **apply the cap-clarity audit principle only**, defer new resource systems and frequent manual collection. This run instead fixed duplicate-hidden-event offline accounting and added a fixture; CI/device result pending.


## 2026-11-13 06:00 KST — Trimps: idle combat progression versus management overhead

Reference: original playable project https://trimps.github.io/ (design-level comparison, not a hands-on current-version benchmark).

**Transferable observation:** a long-running automatic progression loop can expose optional planning around resource allocation and progression bottlenecks without demanding continuous attack taps. For Neon, the relevant question is whether the current automatic combat and existing allocation choice communicate *why* a boss or resource bottleneck matters.

**Advantages / impact:** (1) meaningful bottlenecks give an otherwise passive run a next objective (high); (2) optional resource allocation provides low-frequency agency (medium-high); (3) persistent progression can give resets a strategic purpose (high).
**Disadvantages / impact:** (1) layered production/worker management would overwhelm the existing portrait battle surface (high); (2) automation rules and prestige tuning greatly increase test complexity (high); (3) importing rapid early-run management would violate the intended low-input mobile experience (critical).
**Cost and expected benefit:** low for a read-only boss-blocker/next-goal audit in existing details, medium for optional allocation feedback, high for new production systems. Clarity benefit plausible but not device-validated.
**Decision:** adopt only the *clear bottleneck and low-frequency planning* evaluation principle. Defer workers, new resources, repetitive purchases, tap combat and further reset layers. First verify current boss stop and allocation descriptions on a real portrait browser; preserve combat visual prominence and keep details off the main battle canvas.


## 2026-11-13 06:51 KST — The Perfect Tower II: readable auto-defense and upgrade depth

Reference: official Steam listing https://store.steampowered.com/app/1197260/The_Perfect_Tower_II/ (design-level comparison; no current-version play session or live source verification this run).

**Transferable principle:** automatically resolved combat can retain visible stakes through clear enemy pressure, damage feedback, and optional long-horizon upgrade planning. This does not justify importing tower-defense mechanics into Neon.

**Advantages / impact:** (1) strong visual combat feedback makes passive encounters legible (high); (2) upgrade goals can create medium-term agency without attack taps (high); (3) separating upgrade management from battle presentation protects portrait clarity (high).
**Disadvantages / impact:** (1) copying extensive tower modules would balloon balance and save migration (high); (2) dense simultaneous combat effects may degrade phone performance (high); (3) optimizing around frequent menu intervention would undermine low-input play (high).
**Cost / expected benefit:** low for auditing existing hit/boss cue hierarchy; medium for restrained cue adjustments with reduced-motion and frame-budget tests; very high for new tower modules. Better readability is plausible but **not measured on device**.
**Decision:** **audit only** existing boss/skill hit differentiation and portrait screen before implementation. Defer new systems and any rapid interaction. Preserve fully automatic combat and optional infrequent choices.


## 2026-11-13 08:00 KST — Idle Research: unlock communication versus layer sprawl

Sources: official Steam description https://store.steampowered.com/app/1482860/Idle_Research/ ; independent gameplay analysis https://www.mrguider.org/strategy/idle-research-guide-tips-cheats-strategies/ . Secondary gameplay specifics are not independently reproduced in-game.

**Observation:** research unlocks new producers, production layers feed one another, and prestige makes earlier progress faster. It also offers a large collection of research/crafting/combat/skill systems; its breadth is a warning against growing Neon through more tabs before current combat and rebirth are legible.

**Benefits (impact):** (1) previewing next unlock and its production role clarifies the next goal (high); (2) visibly retained reset efficiency gives rebirth meaning (high); (3) automatic production preserves low-input pacing (high).
**Costs/risks (impact):** (1) cascading resources obscure bottlenecks (high); (2) several overlapping upgrade menus crowd portrait screens (high); (3) active-play speedups risk violating no-mandatory-tapping (critical).
**Neon cost / expected effect:** low for reusing existing milestone and upgrade data in the separate stats/growth screen; medium for measured reset summaries; high for new crafting or research layers and their save migrations. Potential clarity benefit is plausible but unmeasured.
**Decision:** adopt only milestone/automation readability as a future audited UI improvement. Defer new research currencies, crafting slots, active speedups and additional tabs. This run prioritized a confirmed lifecycle accounting defect instead of implementing speculative new systems.

## 2026-11-13 08:12 KST — Tap Titans 2: boss differentiation without tap combat
- Reference: https://www.gamehive.com/games/tap-titans-2 ; https://store.steampowered.com/app/1923130/Tap_Titans_2/
- **Scope:** visual identity and boss-stage pacing only, not its tap mechanic; no new claims about unverified specific TT2 mechanics.
- **Benefits:** distinctive boss silhouettes make 10-stage milestones more legible (high); reuse of existing assets avoids art-production dependency (medium); optional/passive presentation keeps auto-combat intact (high).
- **Risks:** alternating images alone cannot substitute for mechanical enemy variety (medium); extra motion may cost battery or distract (medium); visually borrowing a tap-centric game could imply mandatory interaction (high).
- **Cost/effect:** low: existing `boss_guardian.webp` and `boss_overheat.webp` can alternate at 10/20 stages with existing reduced-motion CSS and no extra buttons. Expected better milestone readability, not yet user/device validated.
- **Decision:** implement alternating existing boss artwork and restrained portrait emphasis; reject rapid taps, active combat, and extra control prompts. Test with real portrait device later.

## 2026-11-13 — prestige goal transparency, reference comparison (design assessment)
- **Reference:** Antimatter Dimensions (official: https://ivark.github.io/AntimatterDimensions/). Here the comparison is a design principle, not a fresh verification of its current version: major prestige gates should expose exact remaining prerequisites rather than suggesting the reset already happened.
- **Our observed gap:** STAGE 180 goal claimed phase transition after milestone even when `gainPhase()` still blocked by cumulative rebirth count. This is a game-specific logic mismatch independently confirmed in source.
- **Benefits of prerequisite-aware goal:** (high) avoids false completion impression; (medium) clarifies why phase control is locked; (medium) improves post-milestone direction without new buttons.
- **Risks/tradeoffs:** (low) more contextual wording needs translation/UX review; (medium) late-stage goals may still be dense on narrow phones; (low) changing labels alone does not make prestige rewarding.
- **Cost and decision:** low implementation cost, adopted in `1e96744b` with regression. Do not copy Antimatter Dimensions' reset mechanics or currency layers. Defer further prestige systems until existing 30-minute mobile loop is validated.

## 2026-11-13 10:56 KST — Idle Slayer's active/idle asymmetry (comparison, not feature adoption)
- **Sources:** [Idle Slayer Korean App Store listing](https://apps.apple.com/kr/app/idle-slayer-addictive-clicker/id1526599527) describes ascension and progression; [community discussion on offline progression (2025-03-25)](https://www.reddit.com/r/idleslayer/comments/1jjow19/) and [recent discussion (2026-10-04)](https://www.reddit.com/r/idleslayer/comments/1wxedjj/idle_game/) contain subjective complaints that early progression can demand activity. These are player anecdotes, not measured retention data or an authoritative balance audit.
- **Transferable lesson:** keep long-term prestige goals visible and differentiate 'cheapest affordable' from 'best strategic' choice; explain idle progress expectations transparently. The price-only hint was renamed in `341cf715` to avoid misleading players.
- **Benefits:** **high** truthful choice presentation; **medium** fewer misinterpretations of a stalled economy; **medium** clearer contrast between passive and optional purchase behavior.
- **Costs/risks:** **low** extra Korean heading length on portrait; **medium** cheapest choice still does not optimize player goals; **high** copying active-only quest gating or jump/tap interactions would violate user low-input constraints.
- **Decision:** adopt only truthful hint wording (low cost); **reject** active-only quest requirements and repetitive input. Defer strategic recommendations until their effect can be validated with multiple upgrade-path simulations; do not imply price-only sorting is optimal.

## 2026-11-13 11:54 KST — mobile idle-game continuity: compare priorities rather than copy mechanics
- **Comparison basis:** existing Antimatter Dimensions and Idle Slayer reference entries in this file, plus the current game's own lifecycle/save implementation; no new external gameplay or retention claim is made in this pass.
- **Transferable design principle:** long idle sessions and prestige progress are meaningful only if progress survives app switches and navigation. This is a reliability prerequisite, not another currency/upgrade feature. Implemented redundant `pagehide` checkpoint in `dd5ab79f`, in addition to visibility and periodic saves.
- **Benefits:** **high** lower exposure to lost progress on page navigation; **medium** protects trust in delayed rewards; **medium** small code footprint and no extra player interaction.
- **Costs/risks:** **medium** browser/OS may still terminate before any lifecycle callback; **medium** localStorage can fail under quota/privacy restrictions; **low** additional write on navigation. These are not fixed by merely adding a listener.
- **Decision:** adopt the low-cost persistence checkpoint; defer speculative extra prestige or tapping systems. Next research rotation should compare offline-reward clarity and long-term save robustness, then test actual mobile behavior before claiming parity with reference titles.

## 2026-11-13 12:53 KST — Antimatter Dimensions comparison: save reliability before more prestige layers
- **Basis:** previously reviewed Antimatter Dimensions' long-form idle/prestige structure, compared against the current game's localStorage and lifecycle code; no new external claims about its implementation or user retention.
- **Transferable lesson:** in long idle progress, a recoverable save failure is more urgent than adding another upgrade layer. Existing direct localStorage writes could throw and interrupt the foreground loop. This run adopted a non-throwing save path and an explicit on-screen warning.
- **Benefits:** **high** automatic battle can continue under storage rejection; **high** avoids falsely implying progress was persisted; **medium** no new mandatory interaction.
- **Costs/risks:** **high** progress still cannot persist if browser storage remains blocked; **medium** warning could be visually obscured on a small portrait screen; **low** repeated failed writes incur overhead every 5 seconds.
- **Decision:** adopt minimal fault isolation, defer elaborate cloud save/import/export until justified by real player needs. Verify physical mobile and continue examining save compatibility before new prestige mechanics.

## 2026-11-13 13:54 KST — idle save trust and explicit confirmation (design comparison)
- **Basis:** compare this game's manual-save UI against the already documented Antimatter Dimensions long-session/prestige reference; this entry is an internal UX inference, **not** a newly verified external claim about that game's implementation.
- **Transferable lesson:** for accumulated idle progress, an explicit save confirmation must reflect the actual persistence outcome. Previously this game's manual-save button overwrote the failure warning with '저장 완료' even when storage rejected the write.
- **Benefits:** **high** prevents false assurance and potential lost progress; **medium** gives actionable recovery information; **low** minimal implementation and no extra taps.
- **Costs/risks:** **medium** localStorage can still be unavailable and no durable backup exists; **medium** small-screen battle log may obscure warning; **low** no additional gameplay choice is created.
- **Decision:** adopt truthful confirmation in `5572df40` and test it. Defer adding speculative cloud saves or mandatory manual checkpoints. Next comparison should focus on background progress messaging and actual mobile readability, not repetitive input.

## 2026-11-13 14:55 KST — Rogue with the Dead / Antimatter Dimensions: offline settlement reliability
- **Basis:** previously recorded reference notes on idle progress and reset loops, compared with current game's `visibilitychange`, `pagehide`, `settleElapsed`, and partial-save normalization. This is a design inference rather than a newly verified claim about either game's internal implementation.
- **Transferable lesson:** meaningful idle progress must be paid exactly once when resuming; an accidental duplicate reward can invalidate pacing, and a corrupted legacy save must not silently erase valid stage/currency. The current test additions cover those invariants without adding player interactions.
- **Benefits:** **high** protects economic balance from duplicated offline payout; **high** safeguards valid historical progress; **medium** preserves low-input gameplay.
- **Costs/risks:** **medium** simulated browser events cannot prove Android OS lifecycle behavior; **medium** long-duration clock skew and storage-denial scenarios need separate checks; **low** test maintenance cost.
- **Decision:** adopt targeted regressions before speculative prestige/content expansion. Defer new automatic tapping or mandatory manual save actions; next rotate to offline-cap and reward transparency.

## 2026-11-13 15:55 KST — offline checkpoint semantics (Rogue with the Dead / Antimatter Dimensions reference)
- Basis: existing comparison notes and this game's verified code inspection, not new assertions about reference games' private implementations. The relevant design principle is that idle reward is tied to a settled checkpoint, not merely the last save event.
- **Observed flaw:** a hidden tab could save a new wall-clock timestamp on pagehide without settling elapsed combat, losing earned offline time if evicted. That makes the reward feel unreliable even when combat progression works.
- **Benefits of fix:** **high** avoids lost idle progress on eviction; **high** keeps reward exactly-once across reload; **medium** improves confidence without extra input.
- **Costs/risks:** **medium** client clock can still be manipulated and Android behavior is not simulated perfectly; **medium** 2h offline cap may need player-facing explanation; **low** localized implementation complexity.
- **Decision:** preserve the unsettled hidden checkpoint in save and add runtime tests. Do not add active tapping, cloud save or speculative offline multiplier; next assess whether capped reward duration is visible enough on mobile.

## 2026-11-13 16:56 KST — reliability before adding idle bonuses
- Existing Rogue with the Dead / Antimatter Dimensions comparisons suggest treating reliable persistence and legible long-term progress as prerequisites for new offline reward multipliers. This is an application to our game, not a claim about their private save code.
- **Benefit (high):** no false save success when quota is denied; **benefit (high):** a later successful retry retains already-settled progress without duplicate rewards; **benefit (medium):** no additional player tapping.
- **Risk (high):** no local-only app can recover progress that never persisted before tab eviction; **risk (medium):** simulated browser exceptions differ from Android behavior; **cost (low):** additional regression maintenance.
- **Decision:** add quota rejection lifecycle regression; defer new idle multiplier/forced manual save. Inspect CI before claiming coverage, then rotate to milestone choice and offline cap communication.
