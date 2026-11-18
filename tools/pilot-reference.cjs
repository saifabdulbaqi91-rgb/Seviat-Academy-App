'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const FIXTURE = 'tests/fixtures/unit3-alif-reference.json';
// Digest of the provenance record derived from committed b94f220 metadata,
// after independently checking the original supplied PDF against that metadata.
const FIXTURE_SHA256 = 'a7c16068813f80fab7ec943155c6de40f881aa64dfc1a7d26de9bf020ff19a4a';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function verifyPilotReference({ root = ROOT, pilot, map }) {
  const bytes = fs.readFileSync(path.join(root, ...FIXTURE.split('/')));
  const normalized = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
  assert.equal(sha(normalized), FIXTURE_SHA256, 'Pinned pilot reference fixture integrity');
  const fixture = JSON.parse(normalized);
  assert.equal(fixture.version, 1);
  const r = fixture.reference;
  assert.equal(fixture.origin.originalPdfSha256, r.sha256);
  const source = map.sources.find(s => s.id === r.sourceId);
  assert(source, 'Required curriculum reference source');
  assert.equal(source.filename, r.filename, 'Reference filename');
  assert.equal(source.path, 'references/textbooks/' + r.filename, 'Reference catalog path');
  assert.equal(source.sha256, r.sha256, 'Committed PDF identity');
  assert.equal(source.pdfPageCount, r.pdfPageCount, 'Reference page count');
  assert.equal(source.identity.title, r.title);
  assert.equal(source.identity.edition, r.edition);
  assert.equal(source.identity.part, r.part);
  assert.equal(map.verification.qualifiedHumanReviewCompleted, r.qualifiedHumanReviewCompleted);
  const unit = map.units[r.unit - 1];
  assert.equal(unit.number, r.unit);
  const lesson = unit.lessons.find(l => l.id === r.lessonId);
  assert(lesson, 'Required alif curriculum lesson');
  assert.equal(lesson.letter, r.letter);
  assert.equal(lesson.source.sourceId, r.sourceId);
  assert.equal(lesson.source.filename, r.filename);
  assert.equal(lesson.source.pdfPage, r.fromPdfPage);
  assert.equal(lesson.span.fromPdfPage, r.fromPdfPage);
  assert.equal(lesson.span.toPdfPage, r.toPdfPage);
  assert.equal(lesson.verificationStatus, r.lessonVerification);
  assert.deepEqual(lesson.priorIntroducedLetters, r.priorIntroducedLetters);
  assert.equal(pilot.sourceFile, r.filename, 'Pilot reference filename');
  assert.equal(pilot.sha256, r.sha256, 'Pilot PDF identity');
  assert.deepEqual(pilot.prior, r.priorIntroducedLetters);
  for (const item of pilot.items) {
    assert.equal(item.source.filename, r.filename);
    assert.equal(item.source.sha256, r.sha256);
    assert(Number.isInteger(item.source.pdfPage) && item.source.pdfPage >= r.fromPdfPage && item.source.pdfPage <= r.toPdfPage, 'Pilot reference page boundary');
  }
  assert.deepEqual([...new Set(pilot.items.map(i => i.source.pdfPage))].sort((a, b) => a - b), r.activityPages, 'Pilot cited page set');
  return fixture;
}

// Separate, explicit integration audit: retain the original byte-level PDF
// assertion without making repository tests depend on an untracked textbook.
function verifyOriginalPdf(file, options) {
  const fixture = verifyPilotReference(options);
  const bytes = fs.readFileSync(file); // Missing original references fail; never skip.
  assert.equal(sha(bytes), fixture.reference.sha256, 'Original reference PDF changed');
  assert.equal(bytes.length, fixture.origin.originalPdfByteLength);
  return { passed: true, originalPdfBytesVerified: true, sha256: sha(bytes), bytes: bytes.length };
}

module.exports = { ROOT, FIXTURE, verifyPilotReference, verifyOriginalPdf };
