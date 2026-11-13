# First playable: 30-minute evaluation acceptance criteria

Status: **not accepted** as of 2026-11-13 22:55 KST. Provisional readiness: **58%**; this is an estimate, not a test coverage fraction.

## Evidence required before calling the first playable ready
1. **CI integrity:** latest gameplay/test changes have successful push-triggered CI with links and captured failures resolved. A successful older workflow does not validate a newer fixture.
2. **Deployment:** successful Pages workflow for applicable gameplay commit and live-served JS/HTML version parity, checked separately.
3. **Portrait UX:** browser rendering at narrow phone portrait sizes, including combat prominence, no clipped text/buttons, readable next goal, usable navigation and no forced scrolling between combat and essential actions. Device inspection remains distinct.
4. **Passive combat:** attacks, skills, enemy/boss feedback and progression continue without tapping. Optional strategic actions need no fast reaction or repetitive inputs. Check a 30–60s-or-less frequent decision path and an unattended path.
5. **30-minute growth:** record 5/15/30-minute stage, currency, purchases, milestone unlocks, first rebirth eligibility, and whether attack/speed/production choices yield different useful outcomes across several RNG seeds. No requirement to rebirth within 30 minutes; purchase gaps alone are not failures.
6. **Persistence:** save/load, legacy migration, offline 2h cap, hidden/pagehide/resume once-only settlement, storage denial warning and recovery, and no silent loss claims. A blocked storage device cannot guarantee recovery of unsaved progress.
7. **Actual phone/player evaluation:** Android portrait visuals, tab eviction, performance, touch ergonomics and subjective enjoyment are **unverified until observed**; simulated tests cannot prove them.

## Current evidence / gaps
- Last confirmed gameplay CI and Pages: [CI 43397286985](https://github.com/cybac1579-bot/neon-idle-game/actions/runs/43397286985) and [Pages 43397287028](https://github.com/cybac1579-bot/neon-idle-game/actions/runs/43397287028), gameplay commit `795030ea`.
- Earlier three-strategy fixture: [CI 43413627466](https://github.com/cybac1579-bot/neon-idle-game/actions/runs/43413627466) succeeded. New nine-path seeded fixture `c31b0db8`: **push CI not confirmed**. PR-only workflow lookup returning no runs is inconclusive.
- Nine-path numeric results, browser portrait screenshots, served asset parity, real-device lifecycle and full 30-minute subjective play remain missing.
- Readiness stays 58% until meaningful player-facing evidence is collected. Never raise it solely for a commit, test count, or documentation update.

## After acceptance
Stop speculative feature expansion and await player feedback; retain scheduled regression/deployment checks. Keep automation records under `automation/` and manual development under `development/`.
