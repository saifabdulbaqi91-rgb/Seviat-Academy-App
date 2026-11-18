'use strict';
// Test-only byte reconstruction. Never execute reconstructed historical code.
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const FIXTURES = 'tests/fixtures/historical-integrity';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const textBytes = bytes => Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));

function resolveInside(root, relative) {
  assert.equal(typeof relative, 'string', 'Invalid preservation path');
  const normalized = relative.replaceAll('\\', '/');
  assert(!/^(?:\/|[a-z]:)/i.test(normalized) && !normalized.split('/').includes('..'), 'Unsafe preservation path');
  return path.join(root, ...normalized.split('/'));
}

function load(root) {
  const fixture = name => fs.readFileSync(resolveInside(root, FIXTURES + '/' + name));
  const manifest = JSON.parse(fixture('manifest.json'));
  assert.equal(manifest.version, 1);
  assert.equal(manifest.entries.length, 42, 'Complete tracked historical inventory');
  assert.equal(new Set(manifest.entries.map(e => e.file)).size, 42, 'Unique preservation paths');
  const reviewedBytes = textBytes(fixture(manifest.reviewedChanges.file));
  assert.equal(sha(reviewedBytes), manifest.reviewedChanges.sha256, 'Reviewed change receipt integrity');
  const reviewed = JSON.parse(reviewedBytes);
  assert.equal(reviewed.version, 1);
  assert.deepEqual(reviewed.files.map(e => e.file).sort(), ['arabic-speech.js', 'diagnostic-placement.js', 'guided-audio.js']);
  const brand = textBytes(fixture(manifest.brand.file));
  assert.equal(sha(brand), manifest.brand.canonicalSha256, 'Historical brand fixture integrity');
  const policyBytes = textBytes(fs.readFileSync(resolveInside(root, manifest.policy.file)));
  assert.equal(sha(policyBytes), manifest.policy.canonicalSha256, 'Approved policy integrity');
  return { manifest, reviewed, brand, policy: JSON.parse(policyBytes) };
}

function replaceOnce(text, current, historical, label) {
  assert.equal(text.split(current).length, 2, label);
  return text.replace(current, historical);
}

function reconstruct(bytes, entry, bundle) {
  if (entry.kind === 'binary') {
    assert.equal(entry.historicalSha256, entry.canonicalHistoricalSha256, 'Binary history must remain byte-exact');
    return bytes;
  }
  assert.equal(entry.kind, 'text');
  let text = textBytes(bytes).toString('utf8');
  const receipt = bundle.reviewed.files.find(e => e.file === entry.file);
  if (receipt) {
    // Pin the ENTIRE reviewed source, including all authorization guards.
    // Neither the unguarded historical version nor arbitrary future edits pass.
    assert.equal(sha(Buffer.from(text)), receipt.reviewedCanonicalSha256, 'Reviewed source integrity: ' + entry.file);
    assert.equal(receipt.historicalCanonicalSha256, entry.canonicalHistoricalSha256);
    const lines = text.split('\n');
    for (const hunk of [...receipt.hunks].reverse()) {
      assert.deepEqual(lines.slice(hunk.reviewedLine, hunk.reviewedLine + hunk.reviewed.length), hunk.reviewed, 'Exact reviewed change: ' + entry.file);
      lines.splice(hunk.reviewedLine, hunk.reviewed.length, ...hunk.historical);
    }
    text = lines.join('\n');
  }
  // Retain the two narrowly authorized exceptions from approved-policy-snapshot.
  if (entry.file === 'journey-rules.js') {
    text = replaceOnce(text, "'short-vowels','long-vowels','sukoon'", "'short-vowels','sukoon','long-vowels'", 'One approved prerequisite correction');
  }
  if (entry.file === 'data/curriculum.json') {
    const p = bundle.policy;
    assert.equal(p.status, 'approved-by-project-owner');
    assert.equal(p.previousValue, 'الجمادات والنباتات فقط');
    assert.deepEqual(p.allowedSubjects, ['people', 'animals', 'plants', 'inanimate-objects']);
    assert(p.facialFeatures.includes('Obscure'));
    text = replaceOnce(text, JSON.stringify(p.approvedValue), JSON.stringify(p.previousValue), 'One approved curriculum policy replacement');
  }
  return Buffer.from(text);
}

function verifyHistorical(group, { root = ROOT, onVerified = () => {} } = {}) {
  assert(['literacy', 'workspace'].includes(group), 'Unknown historical inventory');
  const bundle = load(root);
  const entries = bundle.manifest.entries.filter(e => e.groups.includes(group));
  assert.equal(entries.length, 39, 'Complete mandatory ' + group + ' inventory');
  for (const entry of entries) {
    const bytes = fs.readFileSync(resolveInside(root, entry.file)); // Missing tracked files must fail.
    assert.equal(sha(reconstruct(bytes, entry, bundle)), entry.canonicalHistoricalSha256, 'Historical integrity: ' + entry.file);
    onVerified(entry.file);
  }
  return entries.length;
}

function verifyBrand({ root = ROOT } = {}) {
  const bundle = load(root);
  const html = fs.readFileSync(resolveInside(root, 'index.html'), 'utf8');
  const match = html.match(/<div class="brand">[\s\S]*?<\/header>/);
  assert(match, 'Mandatory official header');
  assert.equal(textBytes(Buffer.from(match[0])).toString('utf8'), bundle.brand.toString('utf8'), 'Official logo/header unchanged');
  return true;
}

module.exports = { ROOT, verifyHistorical, verifyBrand };
