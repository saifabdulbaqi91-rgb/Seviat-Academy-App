# AFAQ — Curriculum and assessment foundation review

2026-11-14. Scope: additive local curriculum/content audit, functional supplemental literacy tasks and teacher-verifiable assessment. This is **not certification of the full Saudi curriculum or a validated standardized reading/spelling test**.

## Sources and preservation

Read the full attached request and advanced-literacy addition, the Phase 6 report and existing curriculum, diagnostic, adaptive, teacher, activity, audio and storage code. Pre-change checkpoint: `.access-staging/audio-repair-2026-11-14T01-09-13-675Z/checkpoint.json` (368 files, original hashes, HEAD and dirty status). Existing source data, backups, unrelated local changes and student storage are preserved. No commit, push, deployment, reset, authentication, subscriptions, cloud service or external teacher-curriculum integration.

No official textbook was found in the project source-file inventory. PDF files encountered in excluded browser-test staging are generated application reports, not textbooks. No official textbook was inspected. Required source: the complete official Saudi Grade 1 «لغتي» pupil books for the intended edition/terms, including contents and letter/lesson pages; teacher guidance is also needed to confirm introduced versus deferred component skills. Existing `data/curriculum.json` claims an edition and later units; that metadata is **not independent source verification**.

Confirmed implemented project order, also specified by the user:

| Unit | Letters | Source-verification boundary |
|---|---|---|
| 1 — أسرتي | م، ب، ل، د، ن، ر | Project implementation/user-specified; not textbook-inspected |
| 2 — مدرستي | ص، ف، س، ق، ت، ح | Project implementation/user-specified; not textbook-inspected |
| Later units | Existing metadata retained | Not verified, completed or silently invented here |

Existing required progression remains preparation matching → م and the ordered letter components: shape → short vowels → sukūn → long vowels → contextual forms → detection/analysis where implemented → syllable building. Existing direct prerequisites, teacher overrides, cumulative restrictions, required versus optional activities and historical mastery thresholds were not changed. The full original graph has 193 nodes, 85 required and 108 optional. A visual game or diagnostic response does not establish all skills of a letter.

## Content inventory, coverage and quality

`docs/AFAQ_CURRICULUM_CONTENT_AUDIT.json` contains the source inventory, 132 letter/component rows, original-item metadata annotations, missing metadata, later-unit verification gaps and all supplemental items. The audit tool reads original sources without rewriting them. It inventories **840 source items**: the 384-item reviewed Unit 1 bank, Unit 2 generated questions and adaptive-generated items. Historical alternative banks and historical student assessment records remain preserved; they are not counted as new independent validated assessment items.

The source inventory found no duplicate IDs, identical options or non-unique exact answer keys in that inventory. Annotations explicitly expose missing measurable-objective/distractor-rationale documentation rather than inventing it. Source-item counts do not mean every item is selectable: original policies still exclude unavailable, unsafe, scaffold-only and prerequisite-ineligible content. Automated checks cannot prove semantic uniqueness, diacritic correctness, linguistic quality or assessment validity.

The new authored bank contains **48 small tasks across 16 skills**, three per skill, with stable IDs, unit, supplemental lesson label, target, objective, skill dependencies, required letters, difficulty, modality, answer/rubric, diacritic requirement, purpose, source and human-review status. Choice tasks document distractor rationales. These are original supplemental tasks, **not quotations from or verified alignment with textbook lessons**. All start pending human review; teacher practice preview is available, but actual diagnostic/assessment evidence is blocked until the named local teacher approves that exact item version. Rejecting an item invalidates its approval-dependent evidence/admission. Approval is local to the active student, not a global linguistic certification.

Automated validation detects duplicate IDs, repeated choices, missing/non-unique exact keys, missing metadata/rubrics, absent vocalization, undeclared target/choice letters, unknown skills and invalid/cyclic skill dependencies. It flags near duplicates for review: the tanwīn contrast قَلَمٌ / قَلَمٍ intentionally shares its unvocalized form; retain this explicit flag, since case endings are the target distinction. It does not claim complete Arabic parsing or proof of fully correct diacritization.

The teacher coverage view distinguishes implemented source nodes, missing/blocked components, current diagnostic-sample counts, unreviewed content and quality approval. Counts from the active diagnostic adapter are explicitly labeled **sample counts**, not full-bank totals. “عرض الجرد الكامل والفجوات” loads the read-only source inventory and all letter/component rows in Arabic, without displaying raw JSON in the normal interface. The JSON audit supplies full source totals and missing metadata. Existing later-unit gaps, language-listening assessment gaps and detailed item-rationale work remain visible limitations.

## Functional advanced literacy coverage

| Skill | Functioning activity / evidence | Human boundary |
|---|---|---|
| Three-letter decoding | رَسَمَ، دَرَسَ، قَلَمٌ; live oral task and review submission | Named teacher observes accuracy, blending, independence |
| Longer-word decoding | مَنَارٌ، سَلَامٌ، مَلَابِسُ; four/five-letter examples | Teacher verifies; letter counts do not prove fluent reading |
| Reading accuracy | حَبْلٌ، بِلَادٌ، مَنَابِرُ | Teacher rubric; no speech recognition |
| Reading fluency | Three short sentence tasks | Teacher accuracy/phrasing/independence rubric; optional observed seconds; speed alone never determines mastery |
| Short sentence reading | سَارَ بَاسِلٌ، نَامَ سَالِمٌ، رَسَمَ سَالِمٌ بَابًا | Teacher oral review |
| Basic comprehension | Three text-dependent subject/action choice tasks | Objective exact keys; limited literal comprehension, not broad comprehension certification |
| Short/long vowels | Three same-letter short/madd contrasts | Visual classification only; not automatically proof of auditory discrimination |
| Sukūn, shaddah, tanwīn | Nine marked-letter-in-word choices | Visual orthographic evidence; pronunciation remains human-reviewed |
| Segmentation | Three ordered letter-sequence choices | Explicitly **letter segmentation**, not validated phonemic/syllabic segmentation |
| Word construction | Three actual token-order interactions, reset and feedback | Measures construction with a displayed model, not independent oral decoding |
| Spelling | Typed original response after teacher-provided word; no displayed key | Teacher orthography/meaning/independence rubric |
| Dictation | Typed response after live teacher dictation; no displayed key | No unapproved TTS pronunciation model or automatic spelling score |
| Handwriting | Reuses existing board; pointer work retained as normalized strokes, teacher review rendering | No ink recognition; independent assessment conceals the reference; copied practice cannot prove independent spelling |
| Independent writing | Actual Arabic written production, not a choice button | Open response judged by teacher; sample word is not an obligatory answer |

Three examples per skill are a small working foundation, **not adequate content for a comprehensive standardized or sustained advanced literacy course**. Long texts, extended fluency passages, broader inferential comprehension, extensive spelling patterns, fully sourced hamzah coverage and verified language-listening item banks remain incomplete. Existing games, preparation activities, rewards and board behavior are retained.

## Assessment and placement rules

New evidence is append-only in `afaq-literacy-evidence-v1`, separately from original curriculum progress, diagnostic placement and practice history. Events retain student, skill, item, time, purpose, response, assistance, hints/retries, objective correctness or human rubric, named reviewer, confidence category and exact item signature. Student production is a pending submission, **not a score**. Teacher assessment actions live in the separate workspace. Local mode switching is not authentication or secure authorization.

Reading, spelling, comprehension, handwriting and independent writing have independent skill decisions. Practice and diagnostic events never grant mastery. Missing evidence is «لم يُقيّم»; partial evidence is «أدلة غير كافية». Percentages appear only from sufficient independent assessment items and are sample accuracy/rubric results, not fabricated mastery percentages. Reading can have a verified-strength practice recommendation at the same time as targeted spelling support. Recommendations contain an actual eligible item or explicitly remain unavailable.

The additive supplemental decision policy is an explicit **local safeguard, not a research-backed threshold**: a named teacher and reason, at least two distinct unassisted approved assessment items, prerequisite skill decisions, and (for verified mastery) full correctness/all rubric criteria across at least two UTC dates. The adult can configure the supplemental minimum item/date counts from 2 to 5 with a reason; the policy is captured with each decision, so later changes do not rewrite historical decisions. Existing curriculum thresholds are unchanged. One success, repeated copies of one item, assisted work, practice, diagnostic placement or a tutorial cannot verify a skill. Because the current bank has three items per skill, a configured requirement above three distinct items correctly remains insufficient until additional reviewed content exists. Broader educator-approved calibration remains required; the rule is not a standardized test cutoff.

Advanced checkpoint: a short bounded sequence proposes three-letter decoding, then longer-word decoding after a successful observed response; struggle proposes vowel or segmentation verification. It stops after four collected diagnostic responses instead of endlessly looping visual shapes. The teacher explicitly confirms a reasoned supplemental reading admission using successful independently observed short/long items. Only letters demonstrated in those items enter its supplemental scope; untested letters and skills remain unknown. This decision **does not write official curriculum unlocks or mastery**. Beginners retain official cumulative constraints. Adults may preview any task; student launches must meet letter and skill prerequisites.

After this scoped admission, the primary learning action may resume an approved eligible supplemental word activity, preserving existing homework, active original diagnosis and saved original activity priority. A returning student retains the decision and evidence. Subsequent practice moves through unused examples and stops clearly when its small skill set is exhausted. Larger automatic cross-skill placement and full official-course acceleration remain limited by verified content and human prerequisite verification; no claim is made that two words prove all prerequisite skills.

## Interaction, audio and privacy

Reuses activity help/tutorial mechanics, guided audio replay, recorded-instruction priority, existing Hoda Arabic fallback, mute/volume/cancellation and calm onboarding. New typed-production and live-reading mechanics have distinct stable identities and accurate ordinary instructions; typing is not presented as recording, and in-person reading does not claim a recorder exists. Their interaction understanding is teacher-confirmed; a generic click demo cannot certify typing or reading controls. Educational words/phonemes are not automatically promoted to authoritative TTS models. Ordinary instructions remain distinct from actual oral assessment. No external speech service, upload, microphone request or automated oral/handwriting evaluator was added.

Work is local to this browser. New submissions, named observations and quality decisions remain on the device; no secure multi-user protection or synchronization is claimed. Oversized drawing work receives an actionable message rather than saving truncated corrupt JSON. Existing data is not migrated, deleted or reset.

## Validation

**Final regression: 31/31 PASS — 16 pure groups and 15 actual Chrome groups.** Command: `node tools/run-adaptive-checks.cjs --browser`. Evidence: `.access-staging/adaptive-2026-11-14T01-58-31-176Z/summary.json`. All runtime/test source hashes remained unchanged during and after the run. No prior assertion was removed or relaxed.

| Verification | Result |
|---|---|
| New literacy quality/evidence rules | PASS: 48 items, 16 skills, approval gates, cumulative letters, independent domains, configurable criteria, teacher admission, support/enrichment, corrupt/concurrent/quota safety |
| New actual Chrome task workflows | PASS: all 48 input/feedback/submit/exit paths, real board pointer work, teacher quality/rubric review, short/long checkpoint, primary advanced path, reload/isolation, blocked unapproved/untaught items |
| Existing 29 regression groups | PASS, including original diagnosis, returning/new/struggling/fast/homework learners, onboarding, teacher reports, accessibility and historic assessments |
| Legacy content | PASS: 384 current Unit 1 questions, 255 historical questions, 60 writing activities; unchanged Unit 1/2 storage |
| Actual Chrome games | PASS: 46 original game render/answer/next/leave paths; 8 new viewport/theme profiles, keyboard and emulated touch |
| Local Arabic TTS | PASS: native Microsoft Hoda, 26 cases and 11 original production replay requests; actual audible output and linguistic correctness not established automatically |
| Arabic PDF | PASS: actual Chrome export, 615273 bytes, embedded fonts |
| Preservation | 368 originals checked, 365 unchanged and 3 intended integrations changed; zero missing files, intact checkpoint copies, same Git HEAD and exact logo/header |

Focused final evidence: `.access-staging/adaptive-2026-11-14T01-55-05-119Z` (2/2). Earlier failures remain in their original logs: `01-31-31-113Z` exposed missing touch-choice rendering; `01-35-16-152Z` exposed the word-board access mismatch; the first full run `01-51-05-534Z` was explicitly interrupted after a new help-registry startup error. The latter incorrectly assumed a CommonJS helper was a browser export; the new module now provides its own metadata and correctly scoped manual-task help. No original audio/presentation core was changed. The source-preservation test also caught newline-only header differences; original line endings were restored without relaxing the assertion.

Repairs include large answer buttons, prerequisite-checked reuse of the original board activity interface, correct drawing clear/size handling (no truncated JSON), separate accurate typing/live-reading instructions, visible replay/availability beside the question, source-version-aware evidence and independent teacher decisions.

Chrome uses separate synthetic student/browser fixtures and emulated viewports at 320×568, 390×844, 768×1024 and 1280×800 in light/dark themes. Screenshots were inspected for readable Arabic, diacritics and replay/choice layout. No real child learning study, qualified linguistic review, physical Android/iOS hardware, microphone, automatic speech scoring or handwriting-recognition validation is claimed.

## Files and remaining human review

New: `literacy-foundation.js`, `literacy-foundation-ui.js`, `literacy-foundation.css`, two `tests/literacy-foundation-*.cjs` files, `tools/literacy-foundation-audit.cjs`, the audit JSON, implementation plan and this report. Integration only in `index.html`, `afaq-workspace.js` and `tools/run-adaptive-checks.cjs`. Original curriculum/data/audio modules and official logo are preserved.

Required human review before broader use:

1. Supply and inspect the intended official textbooks; verify later units, skills and introduced/deferred orthographic patterns.
2. Arabic educator reviews all 48 new targets, complete vocalization, prompts, literal comprehension keys, distractors and grade suitability; test with real learners.
3. Observe actual oral reading, fluency, independent spelling/dictation and handwriting; calibrate rubrics/decision criteria. Automation here verifies workflow and storage, not educational validity.
4. Expand item diversity and passage length before claiming broad advanced-literacy coverage or reliable standardized placement.
5. Review ordinary instruction audibility and pronunciation models on actual Android/iOS hardware; Chrome viewport emulation is not physical-device testing.

No later external curriculum/textbook import, school-course remediation, AI scoring, cloud infrastructure or paid service was implemented. Stop for manual review after final validation.
