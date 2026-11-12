# Visual and animation decisions — 2026-11-12

Status: agreed design direction; implementation and device performance NOT yet validated.

## Visual direction
- Preserve the appeal and composition of the original high-quality neon/anime visual concept in the actual portrait mobile game.
- Do not substitute a low-resolution cropped character for the final artwork.
- Keep the main battle screen visually focused; detailed statistics belong in a separate stats view.

## Character animation
- One protagonist receives high-quality artwork with **partial (B-level) animation**, not realistic full-body combat animation.
- Candidate motions: blinking, subtle hair/clothing motion, slight upper-body/weapon movement for attacks.
- Enemies may use static artwork plus minimal hit shake, brief flash and defeat/disappear effects.
- Separate character art, effect layers and game UI.

## Attack-speed scaling
- Combat simulation (damage, crits, kills, rewards) must not depend on visual animation frequency.
- Low attack speed: one visible motion per attack when reasonable.
- Medium attack speed: cap protagonist motion rate, represent extra attacks with lightweight slash effects.
- High attack speed: cap visible motion and effect density; use trails and aggregated damage display.
- Candidate visible-motion cap ~2–3/s is an illustrative test value, NOT finalized balance.
- Verify correctness across 1–20 attacks/s and test transitions between display modes.

## Risks and verification gates
1. Inspect code structure and preserve existing combat, progression, rebirth and save data.
2. Prototype one high-resolution protagonist with idle and simple attack motion in the actual browser game.
3. Verify simulation/visual decoupling and regression tests.
4. Capture actual screenshots and test on portrait mobile, including performance and readability.
5. Do not claim final feasibility or art quality before these checks pass.

## Scope control
- Work on `development/reference-redesign`; do not modify `main` or production deployment without approval.
- These are decisions, not a claim that features have already been implemented.
