# Provisional visual direction — 2026-11-13

Status: USER-APPROVED DIRECTION, NOT FINAL UI OR ART APPROVAL.

## Visual language
- Use the refined traditional fantasy illustration aesthetic, NOT the previously assumed pink/cyan neon style.
- Dark restrained UI with elegant gold accents; avoid heavy ornament or excessive screen clutter.
- The latest portrait mockup is a **directional reference only**, not an implementable layout or layered asset.

## Actual game interface
- Main view primarily shows protagonist auto-combat, enemies and attack feedback.
- Show only essential resources, progress and combat cues during idle viewing.
- Existing real game features (battle, growth, skills, equipment where implemented, summoning where implemented, rebirth and statistics) must drive available controls. Do NOT add fictional buttons/features from mockups.
- Open/close functionality in compact overlays or drawers, returning to unobstructed combat when dismissed.
- Keep combat simulation running while panels are open; do not change save or progression behavior.
- Put detailed growth metrics in the stats view rather than crowding the main battle scene.

## Battle composition deferred
- Do not lock hero size, enemy placement or slash effects based on the generated image.
- Explore the actual 390px-wide portrait viewport while integrating real assets.
- Verify hero and enemies remain legible, and that overlays do not hide important combat cues.

## Scope and verification
- Work only on development/reference-redesign; production main unchanged without approval.
- Prototype real HTML/CSS/JS interactions, capture browser screenshots, and run existing regression checks before claiming UI implementation.
- The latest reference image is flattened and is not animation-ready; independent character layers are still needed.
