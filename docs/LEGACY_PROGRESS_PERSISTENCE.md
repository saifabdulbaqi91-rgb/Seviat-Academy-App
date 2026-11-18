# Legacy progress persistence safety

The `seviatLearningProgress` reader/writer in `app.js` only writes after a
successful read and schema check. A missing key starts an empty session. An
existing record must be a JSON object. Optional `score` must be a finite,
non-negative number or a nonempty decimal numeric string (including decimal
fractions, exponent notation and surrounding whitespace); optional `answeredQuestions` must contain nonempty string
IDs; optional `updatedAt` must be a parseable date string. Missing fields remain
compatible with legacy defaults. Unknown fields, duplicate IDs and retired IDs
are retained. Empty strings, hexadecimal strings, negative/nonfinite scores,
booleans and null scores are rejected. Numeric strings become numbers in memory
so awarding points adds numerically. Loading valid data never rewrites or
migrates it; a successful explicit progress save writes the numeric score.

Corrupt JSON/schema and read failures disable writes for that page instance.
The original stored string is never replaced, normalized, deleted or copied to
another key. The application may continue in memory; this is not durable saved
progress. A failed `setItem`, including quota/security errors, returns false
without advancing the saved baseline. Browser localStorage setItem is atomic
on failure. A later save may retry; reload reads the last successfully stored
record. The actual answer handler marks newly awarded points as pending before
saving and handles the result. On failure, an Arabic alert stays outside the
activity area so activity navigation does not discard the warning. Points are
labelled unsaved, including when the activity is rendered again. For a write
failure while the comparison baseline remains valid, the alert includes an
Arabic retry button. It retries persistence only, never awards points or repeats
the answer handler, and disappears after a successful save. Re-answering an
already credited question also never awards duplicate points. A later new
answer can save all pending progress together.

For corruption, read failure or a detected conflict, retry is disabled: reloading
or repairing must not silently overwrite the preserved record. The alert asks
for teacher assistance and warns that new points are unsaved. No repair,
student-data access or automatic reload is performed. Pending points remain
volatile and will be lost if the page is closed without a successful save.

Before each write, the exact current string must match the successfully loaded
or last saved string. Any difference (including formatting, deletion or a new
corrupt value) disables writes until reload. No merge or automatic repair is
attempted. This rejects ordinary stale writes from competing tabs and does not
depend on delayed storage events.

## Concurrency boundary

localStorage does **not** provide an atomic compare-and-set or a transaction
spanning getItem and setItem. Another tab can write between these operations;
that simultaneous write can still be overwritten. A change followed by restoration
of identical bytes is also undetectable. This implementation does not guarantee
serializable multi-tab writes, nor protect against unrelated older writers.
The focused test explicitly demonstrates the simultaneous-write boundary.
For a strict guarantee, all writers must adopt a shared exclusive Web Lock
(with writes disabled when unavailable), or persistence must use a transactional
store. Both require a separately scoped change to the asynchronous call paths
and compatibility policy. Until then, use one active legacy-learning tab.

## Verification

Run `node tests/legacy-progress-check.cjs` and
`node tests/legacy-progress-integration-check.cjs`. The tests read actual app
functions into isolated VM contexts and use only synthetic in-memory storage.
The integration test exercises the real answer handler, warning creation,
retry button callback, score label and progress display with a synthetic DOM.
It checks quota recovery, repeated failure, no duplicate points, corruption,
competing writes, read failure and reload. These are not real-browser layout
or screen-reader tests. Neither test opens a browser, reads student
localStorage, or writes test artifacts.
