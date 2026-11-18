'use strict';
// Exercise the real pilot command using only new temporary synthetic copies.
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { ROOT, FIXTURE, verifyOriginalPdf } = require('../tools/pilot-reference.cjs');
const pilot = require('../unit3-alif-pilot.js');
const map = require('../data/official-curriculum-map.json');
const evidence = fs.mkdtempSync(path.join(os.tmpdir(), 'afaq-pilot-reference-regression-'));
const files = [
  'tests/unit3-alif-pilot-check.cjs', 'tools/pilot-reference.cjs', FIXTURE,
  'unit3-alif-pilot.js', 'journey-rules.js', 'data/official-curriculum-map.json',
  'data/content-policy.json', 'data/curriculum.json', 'tools/approved-policy-snapshot.cjs'
];
const results = [];
function sandbox(name, omitted) {
  const root = path.join(evidence, name); fs.mkdirSync(root);
  for (const file of files) {
    if (file === omitted) continue;
    const target = path.join(root, ...file.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, ...file.split('/')), target);
  }
  assert(!fs.existsSync(path.join(root, 'references')));
  return root;
}
function run(root, name, expectedError) {
  const env = { ...process.env };
  // Child commands must not share a caller's exclusive result-file location.
  delete env.SEVIAT_TEST_OUTPUT;
  const result = spawnSync(process.execPath, [path.join(root, 'tests/unit3-alif-pilot-check.cjs')], {
    cwd: evidence, env, encoding: 'utf8', timeout: 30000
  });
  assert(!result.error, result.error?.message);
  if (expectedError) {
    assert.notEqual(result.status, 0, name + ' must fail');
    assert((result.stdout + result.stderr).includes(expectedError), name + ': unexpected failure: ' + result.stderr);
  } else assert.equal(result.status, 0, result.stderr);
  assert(!fs.existsSync(path.join(root, 'references')));
  results.push({ name, expected: expectedError ? 'FAIL' : 'PASS', exit: result.status });
}
const root = sandbox('no-pdf');
for (const eol of ['LF', 'CRLF']) {
  for (const file of files) {
    const absolute = path.join(root, file), text = fs.readFileSync(absolute, 'utf8').replace(/\r\n/g, '\n');
    fs.writeFileSync(absolute, eol === 'LF' ? text : text.replace(/\n/g, '\r\n'));
  }
  run(root, 'no-pdf-' + eol + '-unrelated-cwd');
}
function mutate(file, change, name, error) {
  const target = path.join(root, file), original = fs.readFileSync(target);
  try { fs.writeFileSync(target, change(original.toString('utf8'))); run(root, name, error); }
  finally { fs.writeFileSync(target, original); }
}
mutate(FIXTURE, text => {
  const fixture = JSON.parse(text); fixture.reference.sha256 = '0'.repeat(64); return JSON.stringify(fixture);
}, 'invalid-required-reference-fixture', 'Pinned pilot reference fixture integrity');
run(sandbox('missing-fixture', FIXTURE), 'missing-required-reference-fixture', 'ENOENT');
mutate('data/official-curriculum-map.json', text => {
  const copy = JSON.parse(text); copy.sources[0].sha256 = '0'.repeat(64); return JSON.stringify(copy);
}, 'invalid-curriculum-reference-identity', 'Committed PDF identity');
mutate('data/official-curriculum-map.json', text => {
  const copy = JSON.parse(text); copy.sources = copy.sources.slice(1); return JSON.stringify(copy);
}, 'missing-curriculum-reference-source', 'Required curriculum reference source');
mutate('unit3-alif-pilot.js', text => {
  const marker = "source:source(page,skill)";
  assert.equal(text.split(marker).length, 2);
  return text.replace(marker, 'source:source(999,skill)');
}, 'invalid-pilot-page-citation', 'AssertionError');
run(sandbox('missing-map', 'data/official-curriculum-map.json'), 'missing-required-curriculum-map', 'MODULE_NOT_FOUND');

// Keep the original byte-integrity assertion strict in its integration audit.
const syntheticPdf = path.join(evidence, 'synthetic-invalid.pdf');
fs.writeFileSync(syntheticPdf, '%PDF-1.7\nSYNTHETIC INVALID REFERENCE ONLY\n');
assert.throws(() => verifyOriginalPdf(syntheticPdf, { pilot, map }), /Original reference PDF changed/);
results.push({ name: 'invalid-original-pdf', expected: 'FAIL', rejected: true });
assert.throws(() => verifyOriginalPdf(path.join(evidence, 'missing.pdf'), { pilot, map }), error => error.code === 'ENOENT');
results.push({ name: 'missing-original-pdf', expected: 'FAIL', rejected: true });
fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify({ passed: true, results }, null, 2));
console.log(JSON.stringify({ passed: true, checks: results.length, evidence, originalPdfRequiredForMandatoryTest: false }));
