# Automated development and verification log (shared game code; separate record folders)

This directory holds scheduled automated work records and evidence. Automation and interactive manual work now develop **one common game codebase on one shared integration branch**, while their narrative logs stay separately organized in `automation/` and `docs/`. Do not treat independent folders as independent source versions.

## Files
- `automation/README.md`: this policy and shared index.
- `automation/verification-log.md`: append chronological automated-run summaries; create on first run.
- `automation/coverage-matrix.md`: track tested areas, last tested commit/date, evidence, open issues, and next priorities; create on first run.

## Rules
1. Before each automated run, read the latest `integration/reconcile-main-redesign-20261114` HEAD, previous automation records, and `docs/PROJECT_DECISIONS.md`, `docs/IMPLEMENTATION_STATUS.md`, and `docs/DEVELOPMENT_HANDOFF.md`. Also compare protected `main` for release drift. Manual and scheduled work change the **same integration branch**, but keep separate record folders.
2. Before any manual development, consult the automation records for newly found defects, recent changes, regressions, and unresolved risks. Preserve the distinction between automated and manual evidence.
3. Each automated run chooses a different neglected/high-risk area where useful; do not repeat the same full test suite without a reason. Always run targeted regression tests for changed code, critical failures, or compatibility risks.
4. Log timestamp (Asia/Seoul), base and resulting commit, scope, tests/evidence, failures, changes, deployment status, remaining issues, and next coverage target. Distinguish code-level automated checks from real-device/manual play validation.
5. When a run cannot access GitHub, cannot write, or cannot validate deployment, explicitly record the limitation; never claim successful persistence or deployment without confirmation.
6. Keep logs concise and version-controlled. Avoid editing user-authored manual notes unless explicitly requested.
7. Preserve the combat screen as an expandable primary game surface; assess mobile portrait design, combat visibility, skills/enemies/bosses, progression, rebirth, economy, saves, and integration.

The records are shared reference material for both future scheduled runs and interactive development sessions.

## Unified development policy — 2026-11-16
- **Shared working branch:** `integration/reconcile-main-redesign-20261114`; both hourly automated improvements and interactive manual development commit gameplay, tests, and their respective records here.
- **Protected release baseline:** `main`; it is read-only for scheduled work. PR #2 remains draft until integrated validation and explicit user-directed release. Do not auto-merge or auto-deploy from unattended runs.
- Current main-only automation history was integrated into the shared branch at merge commit `54fafa62ef751858dd05050744e0006aff8b306c`; preserve both parents and previous snapshots.
- At each run, re-read the current working branch HEAD and touched file blob SHA. Never force-push or overwrite concurrently updated manual files. Compare before any conflicting write; re-run targeted + broader regressions when gameplay changes.
- Shared readiness must reflect the same integrated candidate, not a parallel production-only percentage. Distinguish production deployment and physical Android validation. Manual docs in `docs/` and automated evidence in `automation/` remain separate for auditability, **not separate development tracks**.
- If no critical failures exist, advance actual player-facing gameplay and realistic low-input 30–60 minute tests, rather than repeating research/log-only runs.
