// Release safety gate: publishing must never be an automatic side effect of pushes.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const workflow=fs.readFileSync('.github/workflows/manual-pages-preview.yml','utf8');
const integration=fs.readFileSync('.github/workflows/portrait-integration.yml','utf8');
assert.match(workflow,/^on:\s*\n\s+workflow_dispatch:/m,'release is manual-only');
assert.doesNotMatch(workflow,/^\s{2}(?:push|pull_request|schedule|workflow_run):/m,'no automatic release trigger');
assert.match(workflow,/confirm_public_preview/,'explicit public preview confirmation');
assert.match(workflow,/inputs\.confirm_public_preview == 'PUBLISH'/,'release job is guarded');
assert.match(workflow,/node --test automation\/save-regression\.test\.cjs/,'release requires gameplay regression');
assert.match(workflow,/node automation\/packaged-browser-smoke\.cjs/,'release requires packaged browser smoke');
assert.match(workflow,/actions\/deploy-pages@v4/,'release uses Pages action');
assert.match(workflow,/ref: integration\/portrait-first-playable-20261114/,'release uses integration branch');
assert.match(integration,/permissions:\s*\n\s+contents: read/,'regular CI has read-only token');
assert.doesNotMatch(integration,/pages: write/,'regular CI cannot publish Pages');
console.log('Manual-only Pages deployment safety gate passed');
