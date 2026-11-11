# Automated verification records (separate from manual collaboration)

This directory is reserved for scheduled automated checks and their evidence. Do not mix these records with manually requested development notes, handoff files, or player feedback.

## Files
- `automation/README.md`: this policy and shared index.
- `automation/verification-log.md`: append chronological automated-run summaries; create on first run.
- `automation/coverage-matrix.md`: track tested areas, last tested commit/date, evidence, open issues, and next priorities; create on first run.

## Rules
1. Before each automated run, read the latest main commit, previous automation records, and relevant manual-development documentation. Manual work and automated work share one codebase but keep separate logs.
2. Before any manual development, consult the automation records for newly found defects, recent changes, regressions, and unresolved risks. Preserve the distinction between automated and manual evidence.
3. Each automated run chooses a different neglected/high-risk area where useful; do not repeat the same full test suite without a reason. Always run targeted regression tests for changed code, critical failures, or compatibility risks.
4. Log timestamp (Asia/Seoul), base and resulting commit, scope, tests/evidence, failures, changes, deployment status, remaining issues, and next coverage target. Distinguish code-level automated checks from real-device/manual play validation.
5. When a run cannot access GitHub, cannot write, or cannot validate deployment, explicitly record the limitation; never claim successful persistence or deployment without confirmation.
6. Keep logs concise and version-controlled. Avoid editing user-authored manual notes unless explicitly requested.
7. Preserve the combat screen as an expandable primary game surface; assess mobile portrait design, combat visibility, skills/enemies/bosses, progression, rebirth, economy, saves, and integration.

The records are shared reference material for both future scheduled runs and interactive development sessions.
