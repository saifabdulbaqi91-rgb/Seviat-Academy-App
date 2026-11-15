'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const stage=process.argv[2];if(!stage)throw Error('Pass the final test directory');
const summary=JSON.parse(fs.readFileSync(path.join(stage,'summary.json'),'utf8'));
if(summary.results.length!==17||summary.results.some(r=>!r.passed)||!summary.sourceUnchangedDuringTests)throw Error('Final 17 groups must pass unchanged');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const [p,h]of Object.entries(summary.sourceHashes))if(hash(p)!==h)throw Error('Changed after final test: '+p);
const completion=JSON.parse(fs.readFileSync('docs/PHASE3_COMPLETION_STATE.json','utf8'));
const checkpoint=JSON.parse(fs.readFileSync(path.join(completion.checkpoint,'checkpoint.json'),'utf8'));
const allowed=new Set(['tests/diagnostic-check.cjs','tests/diagnostic-browser.cjs','tests/interactions-browser.cjs']);
const changed=Object.keys(checkpoint.hashes).filter(p=>hash(p)!==checkpoint.hashes[p]);
if(changed.some(p=>!allowed.has(p)))throw Error('Unrelated file changed during completion: '+changed.join(','));
const protectedFiles=Object.fromEntries(Object.entries(checkpoint.hashes).filter(([p])=>!allowed.has(p)));
const original=JSON.parse(fs.readFileSync('.access-staging/diagnostic-phase3-1794524710061/checkpoint.json','utf8'));
for(const p of ['adaptive-learning.js','adaptive-activities.js','journey-rules.js','arabic-learning-path.js','journey-interactions.js','learning-companion.js','writing-board.js','independent-writing.js','seviat-sound-settings.js','unit1-learning.js','unit1-rules.js','unit2-preparation.js','.git/HEAD'])if(hash(p)!==original.files[p])throw Error('Protected Phase 3 baseline modified: '+p);
const curriculum=Object.keys(checkpoint.hashes).filter(p=>p.startsWith('data/'));
const browser=JSON.parse(fs.readFileSync(path.join(stage,'diagnostic-browser-results.json'),'utf8'));
if(!browser.passed||browser.observations<9||browser.diagnosticResponses!==24)throw Error('Diagnostic browser coverage incomplete');
const proof={timestamp:new Date().toISOString(),finalTestDirectory:stage,groups:17,sourceUnchangedDuringTests:true,currentSourcesMatchTests:true,completionCheckpoint:completion.checkpoint,completionModifiedExistingFiles:changed,preservedHashes:protectedFiles,curriculumFilesUnchanged:curriculum.length,localBrandingPreserved:['index.html','styles.css',...Object.keys(protectedFiles).filter(p=>p.startsWith('assets/'))]};
const table=summary.results.map(r=>'| '+r.command.join(' ')+' | PASS |').join('\n');
const report=`# Phase 3 — Adaptive Diagnostic Placement: completion report

Completed: 2026-11-13 (Asia/Riyadh). Incremental implementation; no rebuild, commit, push, deployment, paid service or external API integration. Phase 3 is complete within the coverage and limitations below. Work stops here; the next phase is planning only.

## State inspected at resumption

The diagnostic implementation already existed in diagnostic-placement.js, diagnostic-content.js, diagnostic-ui.js and diagnostic-placement.css, with hooks in student-journey.js and script/style links in index.html. The earlier final run had passed 17/17 groups with stable source hashes. Only index.html and styles.css had changed afterward, through the user's local branding experiments; these invalidate treating the earlier run as verification of the current application. The two final reports were missing. Existing tracked modifications, untracked sources, tests, reports, assets, backups and temporary directories were retained.

Original pre-integration findings remain in PHASE3_PRE_INTEGRATION_AUDIT.md; they describe that earlier point in time, not the later user experiments. A new read-only checkpoint at ${completion.checkpoint}/checkpoint.json preserves the current sources and assets before completion changes.

## Delivered behavior

- Pure, separately testable placement rules with versioned configuration: five language domains, configurable branches/subskills, methods, difficulty ranks, evidence minimum, branch limit and assessment limit. A separate foundations/readiness branch supports beginners; it is not presented as proof of language proficiency.
- Short Arabic RTL discovery interface with the existing companion, progress, keyboard/pointer controls, hints, assistance recording, pause and resume. Objective responses are saved before feedback or a manual next action. Duplicate and stale controls cannot submit twice. Refresh resumes the next unsent item without losing saved responses.
- Difficulty ranking rises after repeated independent success and falls after repeated mistakes; only available existing items are selected. Branches stop after sufficient evidence or their configured cap. Defaults: at least three independent items, at most four per branch, and twelve overall; the teacher can request 12/20/30-item sessions. A short budget may leave some domains unassessed. Missing content ends safely rather than fabricating a test or looping.
- Teacher dashboard shows all five domains, subskill status, independent evidence counts, assessment method, scoped strengths/support needs, proposed available starting points, review decisions and assessment history. Reassessment requires a reason; an unfinished session can be resumed or explicitly ended early with its evidence retained.
- Teacher-scored tasks require an observer name and explicit 0/1/2 ratings against three criteria. Writing uses existing letter models and can open the existing board; listening uses the teacher's live pronunciation and learned alternatives; speaking currently observes letter naming. There is no automatic handwriting or speech assessment, microphone capture, pronunciation synthesis or recorded language-audio bank.

## Domain coverage and boundaries

| Domain | Implemented evidence | Limits |
|---|---|---|
| Reading | Existing verified visual letter-recognition and written short-vowel items | Not oral reading, fluency or a complete reading-level assessment |
| Writing | Teacher observation of letter formation, points and independent production | No automatic ink recognition; no new word/sentence-writing diagnostic |
| Listening | Teacher presents a letter sound and observes discrimination from learned alternatives | No automated pronunciation verification; Unit 2 unavailable sound content excluded |
| Speaking | Teacher observes accurate, clear, independent letter naming | Not free speech or a full speaking-language assessment |
| Comprehension and analysis | Existing written syllable analysis and construction | Not sentence/text comprehension; no unavailable content invented |

All five domains support not-assessed, insufficient-evidence, developing, needs-support and mastered classifications. “Mastered” is explicitly scoped to the sampled diagnostic tasks, not overall domain mastery or curriculum completion. One correct answer or one teacher observation is insufficient. Hinted/assisted responses remain recorded but do not count as independent evidence. Unassessed skills are never marked failed.

## Data, prerequisites and personalization

Placement is stored only under seviat-diagnostic-placement-v1, version 1, indexed by the existing local student identifier. Each profile holds assessments and append-only teacher decisions. Assessments retain their item/source snapshots and responses: student, skill, item, difficulty, outcome, one accepted attempt, hint/assistance, method, observer/rubric when applicable, and timestamp. Summaries derive evidence sufficiency from those records.

This store is separate from seviat-guided-journey-v1 and its runs, overrides, interactiveV1 drafts, assignments and rewards; also separate from Unit 1, Unit 2 and legacy progress keys. No migration or reset is performed. Unknown fields survive. Unreadable or unknown-version data is refused without replacing it. Failed writes leave prior data intact. A raw-byte check rejects an observed concurrent update; it is not atomic cross-window synchronization. Local quota and corrupt-data repair remain limitations.

Diagnostic evidence is not passed into learning-engine runs, cannot unlock any graph prerequisite, cannot earn learning rewards, and cannot erase stronger historical evidence. Candidate activities must pass the existing graph, known-letter/content filters and teacher policy. Separate domain recommendations require teacher review. Reviewed starting points are considered only for eligible ordinary next/variety recommendations, not above homework, targeted remediation or spaced review; supervised tasks remain manual. No available unmastered item yields a null recommendation instead of an arbitrary unlocked level.

Returning learners retain their records and evidence after refresh. They are not forced to repeat placement. New or explicitly requested discovery is separate from the ordinary primary journey entry. The next phase's mandatory Start → Diagnostic → Personalized Level flow has not been implemented.

## Exact files

Phase 3 implementation before resumption:
- Added diagnostic-placement.js, diagnostic-content.js, diagnostic-ui.js, diagnostic-placement.css.
- Integrated student-journey.js and index.html; extended tools/run-adaptive-checks.cjs; added tests/diagnostic-check.cjs and tests/diagnostic-browser.cjs.
- Development/checkpoint helpers remain in tools; old backups and prior changes were not overwritten.

Completion pass:
- Updated tests/diagnostic-check.cjs and tests/diagnostic-browser.cjs, plus the bounded Chrome cleanup in tests/interactions-browser.cjs, among existing files. Removed obsolete assumptions about the old text logo; kept diagnostic assertions, protected-current-header checking and source-hash protection. Added stronger actual historical-success, no-unlock, no-reward, missing-content and unknown-version compatibility checks.
- Added tools/complete-phase3-state.cjs, tools/phase3-compatibility-assertions.cjs, tools/phase3-browser-cleanup.cjs, tools/inspect-phase3-test-session.cjs (read-only test-session inspection), tools/write-phase3-completion-reports.cjs and documentation/state/preservation records.
- No application source, logo, identity, index.html, styles.css, asset or prior learning file changed during this completion pass. No new confirmed production regression required a code fix. A pre-final run exposed a test-harness teardown hang: all interaction assertions were saved successfully, but Browser.close could wait indefinitely after Chrome exited without acknowledging the command. The interactions test now bounds that cleanup wait to two seconds; assertion failures still retain a failing exit code. The full 17-group final run was repeated after this fix; earlier logs remain preserved. Earlier Phase 3 fixes for dark companion contrast and Arabic starting-point labels remain intact.

## Executed verification

Command: node tools/run-adaptive-checks.cjs --browser.
Final output: ${stage.replace(/\\/g,'/')}.
**17/17 groups passed**, with unchanged source hashes during execution and final files matched to those hashes before report generation. There are no remaining failed test groups.

| Group | Result |
|---|---|
${table}

The diagnostic pure suite executed 75 assertions. Dedicated Chrome completed 24 responses including nine simulated teacher observations across the three manual domains. It verified new/readiness placement, independent historical progress after reload, no forced reassessment, keyboard answers, pause/resume/refresh, duplicates/stale buttons, hints/mistakes, quota failure/retry, early teacher completion, five-domain reporting, prerequisites, decisions and homework precedence, and preservation of corrupt/concurrently updated/legacy data. Before/after comparisons across all 193 graph nodes prove no mastery or availability changes after placement; learning rewards are unchanged.

All existing regression groups ran, including companion/reduced motion/auto progression, games, teacher assignments, all 46 preparation activity paths, 60 core skill screens, Unit 1's 384 current questions and 255 historical records, twelve cumulative assessment sessions, whiteboard, separate sound settings and teacher-access restrictions. Chrome checked 320/390/768/1280 widths and both light/dark diagnostic presentation. Images and machine results are in the final output directory. Pointer emulation and keyboard automation do not replace physical touch or assistive-technology trials. The older suites' supported manual-progress fixtures remain unchanged; the dedicated interactions suite checks actual automatic progression.

Integrity: ${Object.keys(protectedFiles).length} checkpoint files including current branding/assets stayed byte-identical during completion; ${curriculum.length} data files are unchanged. Core adaptive engine, activity generators, graph, path, companion, interaction rules, sound, boards and historical unit implementations match the original Phase 3 checkpoint. See PHASE3_COMPLETION_PRESERVATION.json. git diff --check passed (Windows line-ending warnings only).

## Known limitations and human review

- Diagnostic accuracy is a scoped sample, not a validated psychometric placement instrument. Difficulty ranks reflect the existing content; the engine cannot supply harder items that do not exist. A strict prerequisite frontier means a new student can initially have readiness-only coverage. Different domain starts remain bounded by current prerequisites, not new placement unlocks.
- Twelve items cannot guarantee independent coverage of all branches. Lack of suitable material, assistance, or the budget may produce insufficient evidence or not assessed; these are intentional safe outcomes. Teacher observation validity depends on actual human observation, not the automated test's simulated scores.
- No automated speech/handwriting analysis, spoken instructions, audio replay bank, child voice recording or comprehensive oral reading/comprehension assessment was added. No backend, accounts, secure authentication, cross-device persistence or guaranteed simultaneous-window transaction support.
- Teacher review is local device management, not protected authorization. Paused item snapshots consume local storage; no automatic deletion or destructive migration is performed.
- A qualified Arabic teacher must review rubric validity, letter-name/sound distinctions, diacritics, age suitability and interpretation of evidence. Humans must test Arabic mark clipping, contrast, screen reader announcements, real touch/keyboard operation, existing feedback audio and recovery on representative devices. Automated execution does not establish correct pronunciation or pedagogical validity.
- Branding approval, logo variants, favicon/PWA identity and unrelated local visual experiments are outside this completion scope and have not been reviewed or changed. See AFAQ_BRANDING_INTEGRATION_REPORT.md.

## Next phase — planning only

Priority proposal for later review: Start → Diagnostic Assessment → Personalized Level → Learn → Practice → Assess → Automatically Continue, with one child-facing action/activity at a time. Keep analytics, settings, reassessment reasons and administration in teacher/parent areas. Plan validated, replayable spoken instructions and explicit recording consent/storage rules before adding child voice capture; use appropriate evidence models for listening, reading, writing and speaking. Define detailed mastery percentages with uncertainty and weakness/remediation rules rather than treating placement accuracy or rewards as mastery. Preserve identifiers and versioned evidence, and test transitions and legacy compatibility before any future rollout. **None of these next-phase requirements was implemented in this completion pass.**
`;
const branding=`# AFAQ branding — scope and preservation record

2026-11-13. This is a documentation record, not approval or implementation of a visual identity.

The original Phase 3 pre-integration audit is preserved in PHASE3_PRE_INTEGRATION_AUDIT.md. At that earlier time, it found legacy visible branding and no verified approved logo assets, and deferred logo-dependent work. Later, before the completion request, the user added local experiments in index.html, styles.css and assets/. The current instruction explicitly excludes logo/identity work and requires retaining those experiments.

No identity source or asset was modified during completion. Their bytes match the resume checkpoint at ${completion.checkpoint}/checkpoint.json; individual SHA-256 values are recorded in PHASE3_COMPLETION_PRESERVATION.json. This does not claim that experimental assets are official, approved, accessible, proportionally correct or production-ready. No logo was generated, redrawn, replaced, recolored, renamed or published by this completion pass.

Obsolete diagnostic tests that required the old literal text logo were removed because they conflicted with preserving the user's work. The dedicated Chrome test instead verifies that discovery does not alter the existing brand markup. Source hashing protects current index.html/styles.css throughout the final 17-group regression run. Diagnostic light/dark layouts were exercised; this is not a brand compliance review. Logo approval, variants, favicon/PWA icon integration and brand-specific visual review were not performed and remain outside scope.

Diagnostic results, coverage, limitations, final executed test results and planning-only next steps are documented in ADAPTIVE_DIAGNOSTIC_PLACEMENT_PHASE3.md. No commit, push or deployment occurred.
`;
for(const [file,body]of [['docs/PHASE3_COMPLETION_PRESERVATION.json',JSON.stringify(proof,null,2)],['docs/ADAPTIVE_DIAGNOSTIC_PLACEMENT_PHASE3.md',report],['docs/AFAQ_BRANDING_INTEGRATION_REPORT.md',branding]])fs.writeFileSync(file,body,{flag:'wx'});
console.log(JSON.stringify({report:'docs/ADAPTIVE_DIAGNOSTIC_PLACEMENT_PHASE3.md',groups:17,preserved:Object.keys(protectedFiles).length,curriculum:curriculum.length,completionChanged:changed}));