# Historical integrity fixtures

These fixtures repair the two repository tests without copying student records,
recordings, backup contents, or temporary reports into Git. Mandatory checks use
only repository files and Node built-ins. From the repository root, run:

```
node tests/literacy-foundation-check.cjs
node tests/workspace-check.cjs
node tests/historical-integrity-check.cjs
```

From another working directory, pass absolute script paths; the tests themselves
do not depend on the process working directory.

## Evidence and scope

`manifest.json` preserves the original raw SHA-256 values and separate canonical
historical SHA-256 values. Every historical input was read from the saved snapshot
and verified against its original checkpoint hash **before** fixture extraction.
No expected historical hash was obtained from current application source.

The two origin checkpoints were the local working-tree snapshots:

* literacy: `audio-repair-2026-11-14T01-09-13-675Z`, created
  `2026-11-14T01:09:19.251Z`, recording HEAD
  `e8a60ac00c91351cfb8b6fc6e06f004a99141fe2` plus then-uncommitted work;
* workspace: `phase5-1794568139612`, created `2026-11-13T11:09:00.250Z`.

Their original filenames, checkpoint digests and timestamps are provenance, not
runtime paths. Each previously selected 67 files. Exactly 39 tracked targets per
test (42 distinct targets) remain mandatory; the other 28 local backups/audio
files have been moved explicitly to the optional audit, not silently dropped.
The functional assertions remain in the original tests, including profile
isolation, mastery prerequisites, evidence requirements, rubric rules, corrupt
storage, quota/concurrent writes, reporting accuracy and non-mutation.

The existing narrowly approved curriculum-policy and prerequisite-order
transformations are retained in the verifier. The owner-approved policy file is
itself pinned to its reviewed committed content. No application behavior changes.

## Reviewed changes are exact, not blanket exceptions

`reviewed-source-changes.json` records exact line edits between the verified
historical snapshots and these explicitly reviewed committed versions:

* `guided-audio.js`: `a6dd866a3e75961f484790a9246093a03f5b250f`, audio lifecycle
  ownership and primary-question replay; its historical bytes match `b94f220`;
* `diagnostic-placement.js`: `d66f9831872706ae6c70bb425bde1692951767e0`, adult
  authorization of teacher observations/decisions; history matches `b94f220`;
* `arabic-speech.js`: `d66f9831872706ae6c70bb425bde1692951767e0`, committed audio
  compatibility/answer-leakage fixes and adult/async recording guards. Its older
  baseline was an intermediate working-tree version, not an exact Git revision;
  that version's original `60e6a18b...` SHA was verified against the saved bytes.

Each receipt includes the committed Git blob ID and a full canonical source
digest derived from that committed blob. Runtime verification first checks the
**entire current source**, including authorization guards, against that digest;
then reverses only the exact reviewed edits in a byte copy and verifies the
reconstructed historical digest. Historical unguarded source is never executed
or accepted as an alternative current version. Unknown future changes fail.
The receipt itself is pinned by the manifest. Updating receipts is a separate
explicit review, never a test-generated refresh or a generic guard-stripping rule.

## Text and binary handling

Only declared text entries normalize CRLF to LF; neither whitespace nor Unicode
content is otherwise changed. Original raw hashes remain available for audit.
Binary assets/recordings already tracked in the repository retain byte-level
hash checks; no binary contents are duplicated in these fixtures.

`brand.html` is only the public `div.brand` through closing `header`, verified
against the original workspace snapshot and independently against committed
`b94f220f6ce572d75b99bf47daefbf60586cbc94:index.html`. The original full index was
verified against its checkpoint before extracting the fragment. Its own raw and
canonical historical digests are retained. No whole old page is needed.

All fixture and source paths resolve relative to the repository, not the shell's
working directory; both slash styles are accepted, with traversal rejected.
Missing mandatory fixtures or source files fail rather than skip assertions.

## Optional local preservation

`optional-local-preservation.json` stores **hashes and names only**, never backup
or recording contents. It is not loaded by either mandatory test:

```
node tools/audit-local-preservation.cjs --root <local-folder>
```

Absent local files report `NOT_PRESENT` without failure. Existing mismatches fail;
`--require-all` additionally fails on absent local files. This tool never writes,
migrates, repairs or deletes the user's local files. Its raw historical hashes
are intentionally not normalized: it audits exact local archival bytes.

## Regression verification

`historical-integrity-check.cjs` creates only temporary test copies, runs the two
real commands with LF and CRLF from an unrelated cwd, and proves failures for a
removed adult guard, an unauthorized protected-source edit, a changed binary
asset, a changed receipt, missing mandatory fixtures and a missing protected
source. The temporary copies deliberately lack `.access-staging`, optional local
inventory, untracked backups and local recordings. These integrity checks
supplement, and do not replace, `adult-security-check.cjs` and the native Chrome
async authorization regression suite.
