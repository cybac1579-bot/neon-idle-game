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
