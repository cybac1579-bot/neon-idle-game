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
