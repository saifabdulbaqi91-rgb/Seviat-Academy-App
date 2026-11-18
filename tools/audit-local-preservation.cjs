'use strict';
// Explicitly optional: no mandatory test imports this local-file inventory.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const args = process.argv.slice(2);
const rootIndex = args.indexOf('--root');
if (rootIndex < 0 || !args[rootIndex + 1]) {
  console.error('Usage: node tools/audit-local-preservation.cjs --root <local-folder> [--require-all]');
  process.exitCode = 2;
} else {
  const root = path.resolve(args[rootIndex + 1]);
  const fixture = require('../tests/fixtures/historical-integrity/optional-local-preservation.json');
  const results = fixture.entries.map(entry => {
    const file = path.join(root, ...entry.file.split('/'));
    if (!fs.existsSync(file)) return { file: entry.file, status: 'NOT_PRESENT' };
    const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    return { file: entry.file, status: actual === entry.historicalSha256 ? 'PASS' : 'FAIL' };
  });
  console.log(JSON.stringify({ optional: true, results }, null, 2));
  if (results.some(r => r.status === 'FAIL' || (args.includes('--require-all') && r.status === 'NOT_PRESENT'))) process.exitCode = 1;
}
