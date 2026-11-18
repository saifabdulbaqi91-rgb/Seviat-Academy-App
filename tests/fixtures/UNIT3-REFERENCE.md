# Unit 3 alif reference record

`unit3-alif-reference.json` contains only reference identity, provenance and the
scope of the alif pilot. It contains no PDF pages, illustrations, exercise text,
student records or recordings. It is not a fabricated substitute textbook.

The metadata comes from committed
`b94f220f6ce572d75b99bf47daefbf60586cbc94:data/official-curriculum-map.json`, at
`/sources/0` and `/units/2/lessons/0`. The record preserves the Git blob ID and
canonical metadata-file hash. Before extraction, the original local supplied PDF
was read without modification and its complete SHA-256 independently matched
both the committed map and the pilot:

```
0f5721705c9c048138f5ef9b90eb5f042d9c17a9d9523829dc0ed9f8e0da89ae
```

The original contains 31,042,535 bytes. Its 266-page count, edition and lesson
scope (PDF pages 220–226) are inherited from the existing documented map review,
not newly inferred from raw PDF text. The activity citations remain
220, 223, 224, 225 and 226. The twelve prerequisite letters and the pending human
review status remain unchanged. This record makes no claim of new pedagogical,
linguistic, publisher-signature or comprehensive visual validation.

The old pilot test never parsed/rendered the PDF or evaluated its exercises; its
only PDF operation was comparing the full file's hash with `pilot.sha256`.
Functional checks then exercised the pilot's 22 adaptations using synthetic
storage. Those functional/curriculum assertions are retained. The mandatory test
now additionally checks the pinned record, committed map source/lesson metadata,
pilot source identity, prerequisites and every item's page/hash citation.
The record's complete LF-normalized SHA-256 is pinned in
`tools/pilot-reference.cjs`; binary PDF bytes are never text-normalized.

Run the ordinary repository test from the repository root:

```
node tests/unit3-alif-pilot-check.cjs
node tests/pilot-reference-check.cjs
```

Absolute script paths also work from another working directory. Missing or
modified mandatory reference data fail; there is no existence-based skip,
fallback or automatic reference refresh.

The actual PDF-availability/byte-integrity check is retained as an explicit
integration audit (run when the original is supplied):

```
node tools/audit-pilot-reference.cjs --pdf <original-textbook.pdf>
```

It executes the same full-file SHA-256 assertion and fails for a missing or
changed PDF. Mandatory repository tests certify reference metadata consistency,
not the presence of an external textbook on every machine. Neither command
modifies the PDF. The negative suite uses only temporary synthetic copies and
proves rejection of invalid/missing metadata, invalid citations, and an invalid
or missing original PDF. No full PDF needs to be tracked in Git.
