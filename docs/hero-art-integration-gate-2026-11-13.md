# Hero art integration gate — 2026-11-13

## Verified baseline
- Redesign browser checks passed at commit abdebd09 (run 43243650186).
- Independent ambient and weapon-light CSS layers work, but do not articulate character anatomy.
- Existing 219x220 swordswoman is a low-resolution placeholder and must not be treated as production art.

## New concept review
- A newly generated neon anime battle-screen concept demonstrates composition and color direction.
- It is a flattened screen mockup, not a standalone character illustration and not an animation-ready asset.
- Do not integrate the mockup as a character sprite or claim it is production artwork.

## Acceptance criteria for next character asset
1. Single protagonist, consistent design and pose, transparent background, >= 1024px tall.
2. Separate transparent layers for body/base, front/back hair, sleeve/coat, weapon, optional eyes.
3. Matching pivots and identical canvas dimensions so pieces align without drift.
4. Clear idle and short attack poses, visually verified at 390px portrait viewport.
5. Test reduced-motion mode, no horizontal overflow, and high attack-speed visual throttling.
6. No main-branch changes until art quality and actual browser screenshots are reviewed.

## Scope and status
This document is a production gate, not an assertion that layered high-resolution art exists.
