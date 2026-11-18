'use strict';
// All mutations below are confined to newly created synthetic test directories.
const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT } = require('../tools/historical-integrity.cjs');
const fixturePath = 'tests/fixtures/historical-integrity/';
const manifest = require('./fixtures/historical-integrity/manifest.json');
const evidence = fs.mkdtempSync(path.join(os.tmpdir(), 'afaq-historical-regression-'));
const files = [...new Set([
  ...manifest.entries.map(e => e.file), manifest.policy.file, 'index.html',
  fixturePath + 'manifest.json', fixturePath + 'reviewed-source-changes.json', fixturePath + 'brand.html',
  'tools/historical-integrity.cjs', 'tests/literacy-foundation-check.cjs', 'tests/workspace-check.cjs',
  'literacy-foundation.js', 'literacy-foundation-ui.js', 'afaq-workspace-core.js', 'child-experience.js'
])];
const commands = ['literacy-foundation-check', 'workspace-check'];
let checks = 0;
const results = [];

function sandbox(name, omitted = '') {
  const root = path.join(evidence, name);
  fs.mkdirSync(root);
  for (const file of files) {
    if (file === omitted) continue;
    const target = path.join(root, ...file.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, ...file.split('/')), target);
  }
  assert(!fs.existsSync(path.join(root, '.access-staging')));
  // The optional local inventory is deliberately absent, too.
  assert(!fs.existsSync(path.join(root, fixturePath, 'optional-local-preservation.json')));
  return root;
}

function run(root, label, expectedError) {
  for (const command of commands) {
    // An unrelated cwd catches accidental process.cwd()-relative reads.
    const result = spawnSync(process.execPath, [path.join(root, 'tests', command + '.cjs')], {
      cwd: evidence, encoding: 'utf8', timeout: 30000
    });
    assert(!result.error, result.error?.message);
    if (expectedError) {
      assert.notEqual(result.status, 0, label + ' must fail: ' + command);
      assert((result.stdout + result.stderr).includes(expectedError), label + ': unexpected failure: ' + result.stderr);
    } else assert.equal(result.status, 0, result.stderr);
    results.push({ label, command, expected: expectedError ? 'FAIL' : 'PASS', exit: result.status });
    checks++;
  }
}

const root = sandbox('mandatory-only');
for (const eol of ['LF', 'CRLF']) {
  for (const file of files.filter(f => /\.(?:js|cjs|json|html|css|svg|txt)$/.test(f))) {
    const absolute = path.join(root, file);
    const text = fs.readFileSync(absolute, 'utf8').replace(/\r\n/g, '\n');
    fs.writeFileSync(absolute, eol === 'LF' ? text : text.replace(/\n/g, '\r\n'));
  }
  run(root, eol + '-no-local-dependencies');
}

function mutate(file, replacement, label, error) {
  const absolute = path.join(root, file), original = fs.readFileSync(absolute);
  try { fs.writeFileSync(absolute, replacement(original)); run(root, label, error); }
  finally { fs.writeFileSync(absolute, original); }
}

mutate('diagnostic-placement.js', bytes => {
  const text = bytes.toString('utf8');
  const guard = "if(ratings&&typeof window!=='undefined')window.AfaqAdult.assert();";
  assert.equal(text.split(guard).length, 2, 'Exact real authorization guard');
  return text.replace(guard, '');
}, 'removed-adult-guard', 'Reviewed source integrity: diagnostic-placement.js');
mutate('adaptive-learning.js', bytes => Buffer.concat([bytes, Buffer.from('\n// UNAUTHORIZED synthetic change\n')]),
  'modified-protected-source', 'Historical integrity: adaptive-learning.js');
mutate('assets/branding/afaq-logo-dark.png', bytes => {
  const changed = Buffer.from(bytes); changed[0] ^= 1; return changed;
}, 'modified-binary-asset', 'Historical integrity: assets/branding/afaq-logo-dark.png');
mutate(fixturePath + 'reviewed-source-changes.json', bytes => Buffer.concat([bytes, Buffer.from(' ')]),
  'modified-review-receipt', 'Reviewed change receipt integrity');

for (const missing of ['manifest.json', 'reviewed-source-changes.json', 'brand.html']) {
  const incomplete = sandbox('missing-' + missing, fixturePath + missing);
  run(incomplete, 'missing-mandatory-fixture-' + missing, 'ENOENT');
}
run(sandbox('missing-source', 'styles.css'), 'missing-mandatory-source', 'ENOENT');

const emptyLocal = path.join(evidence, 'no-local-backups');fs.mkdirSync(emptyLocal);
const optional = spawnSync(process.execPath, [path.join(ROOT, 'tools/audit-local-preservation.cjs'), '--root', emptyLocal], { encoding: 'utf8' });
assert.equal(optional.status, 0, optional.stderr);
assert(JSON.parse(optional.stdout).results.every(r => r.status === 'NOT_PRESENT'));
checks++;
fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify({ passed: true, checks, results }, null, 2));
console.log(JSON.stringify({ passed: true, checks, evidence, scope: 'Real commands, LF/CRLF, unrelated cwd, missing local files, guard/source/binary/fixture rejection' }));
