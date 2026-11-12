# Reference-driven redesign — working plan

## Baseline and rollback
- Immutable baseline branch: `backup/pre-reference-redesign-20261112`
- Baseline commit: `edac0d9ff3e1d56e53211a9b0395eb4d5ee6f4b3`
- Redesign branch: `development/reference-redesign`
- Do not modify or force-update the backup branch.
- The hourly automation currently works on main; re-check and integrate main changes deliberately to avoid losing fixes.
- GitHub history backs up source assets, **not** player localStorage. Preserve save data separately before changing storage schema.

## Product constraints
- Portrait-first mobile idle RPG.
- Automatic combat; never add rapid tapping, mandatory repeated inputs, or reaction-time gameplay.
- Combat remains visually central, with character/enemy/skill/boss presentation and expandable effects.
- Avoid dense battle UI; move optional statistics and management to other views.
- Preserve save/offline, progression, rebirth, automation, economy, and testable game logic unless evidence justifies replacing a module.

## References (inspiration, not copying)
- Rogue with the Dead: readable automatic combat and rebirth loop.
- Antimatter Dimensions: layered progression and unlockable automation.
- Legend of Slime: portrait combat hierarchy and short-term visual feedback.
- Other titles may inform isolated systems; no copied copyrighted assets, code, UI artwork, or text.

## Implementation sequence
1. Audit current screen DOM/CSS, battle rendering, state dependencies, and tests. Capture existing behavior and regression targets.
2. Build a portrait-first battle UI prototype on this branch with an expandable combat stage and minimal persistent controls. No new mandatory taps.
3. Integrate existing battle state and visual effects; keep game calculations unchanged initially.
4. Reorganize growth and rebirth navigation while preserving the saved-game key and load compatibility.
5. Run targeted tests, review CI and deployment, then compare with the baseline using real-device play before deciding to merge.
6. Do not overwrite main or switch public Pages to the redesign until explicitly approved after play testing.

## Validation gate
- Automated tests and static checks must be reported separately from actual browser/device play.
- Confirm rollback branch exists, unchanged.
- Verify save compatibility, offline progression, auto-buy, rebirth, and no regressions in combat.
- Request player feedback on a separately accessible preview before replacing production.
