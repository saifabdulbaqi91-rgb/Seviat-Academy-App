# Phase 4 — Child-First Learning Experience and Guided Interaction

2026-11-13, Asia/Riyadh. **Phase 4 final automated validation: 19/19 groups PASS on unchanged source hashes. Ready for acceptance within the documented supported scope.** The user explicitly authorized this final verification after the earlier permission rejection. No Phase 5, commit, push, deployment, logo edit or data reset occurred.

## Inspection and preservation

Read ADAPTIVE_DIAGNOSTIC_PLACEMENT_PHASE3.md and inspected the current journey, diagnostic UI/rules, engine, activity generators, profiles, per-answer journal, sound settings, typography, existing assets and dirty Git tree. Phase 3's baseline was 17/17 passing groups. The implementation plan was recorded before editing in CHILD_FIRST_PHASE4_PLAN.md. Checkpoint: .access-staging/child-phase4-1794530505181/checkpoint.json; 122 file entries copied exclusively with SHA-256, including current branding and audio assets. Existing backups and unrelated modifications remain intact.

The core adaptive engine, curriculum graph, curriculum banks, language path, Phase 3 diagnostic rules/content, companion implementation, existing activity/game generators, original sound preferences/effects, whiteboards and Unit 1/2 implementations were preserved. index.html gained only module/style links; its header/footer, styles.css and branding assets match the checkpoint. See CHILD_FIRST_PHASE4_PRESERVATION.json.

## What works

### Guided child journey

The prominent start/resume button routes to appropriate fresh or requested placement, or to saved/assigned/recommended learning. Existing learners, saved learning drafts, teacher-established levels and homework are not forced through fresh placement. Pending manual-only diagnostic branches do not trap the child. A finished short placement leads to the current learning activity, without creating mastery or unlocking prerequisites.

Child-facing technical evidence counts were replaced with short encouragement. Advanced map browsing is hidden by default and can be enabled by an adult; existing path/navigation remains available under that setting and in the adult controls. The adult entry is clearly labelled المعلم وولي الأمر. The AFAQ name and instructional/UI fonts are retained.

Correct objective questions retain the existing save-before-transition flow. Successful eligible objective sessions can continue automatically after two seconds to the existing engine's next appropriate activity, with a manual continue button and cancellation on navigation. Adult policy can disable session auto-continuation; existing manual question progression/reduced-motion preferences remain supported. Failed/support/supervised tasks stay manual. Two required independent sessions remain required even when the engine recommends repeating the same readiness skill.

Errors remain truthful first answers. A feedback hint is saved as feedbackHints, and an optional practice retry is saved as practiceRetries with credit: practice-only. A corrected retry does not replace the original incorrect response, turn an assisted task into verified evidence, add a duplicate learning result or manufacture mastery. Remediation uses the existing skill/weakness rules; the extra review button now practices the relevant activity rather than choosing an unrelated preparation family.

### Recorded instruction support and fallback

New guided-audio.js provides reusable activity-type guidance, replay, separate mute and volume preferences, safe same-origin recorded-asset paths and a registry that requires explicit human-review metadata. There is no instructional text-to-speech, synthetic Arabic pronunciation, external speech API or reuse of unapproved teacher/test clips.

instruction-audio.json deliberately has zero approved clips: no verified generic activity-instruction bank was supplied. The real application displays written/visual guidance and disables unavailable replay. This is a functioning fallback and playback framework, **not a claim that recorded Arabic instructions are delivered today**. Existing correct/incorrect/click/celebration sounds and their separate settings are unchanged. Instruction mute/volume affects instruction playback; the legacy top sound control still controls the existing effects/encouragement system.

### Student voice practice and local review

Relevant speaking tasks and the optional أجرّب بصوتي activity use MediaRecorder with explicit record, stop, replay and retry controls. No microphone request occurs on load or merely opening the speaking page. The microphone is requested only through the record action. Tracks stop on stop, navigation, hidden/page-hide lifecycle changes and errors, including permission arriving after the child has already left. Capture is capped at 20 seconds / 2 MiB.

A recording is an in-memory preview until explicit device-only teacher submission is chosen. Saving requires the local-consent checkbox and a separate button. There is no upload transport and no automatic pronunciation assessment. Only metadata and the audio blob are placed in a separate versioned IndexedDB store; no learning result is created. An adult can listen and record an explicit three-criterion observation with their name. That observation is labelled manual and grantsMastery:false; it does not enter the adaptive learning runs or placement evidence.

Privacy controls include discarding the current draft, deleting the most recently saved copy from the recording screen, and an adult per-clip deletion with confirmation. Retention defaults to seven days; an adult can select one/seven/thirty days for future recordings. The expiry timestamp is fixed at explicit save. Expired records in the active profile are removed when that profile's recording list is next opened; there is no background deletion while the app/device is closed. Different profiles are filtered separately. Unknown future clip schemas are not automatically rewritten/deleted. This local interface is not authenticated access control or encrypted multi-user storage.

### Skill/domain reports

The adult dashboard reports existing learning evidence, practice/assessment counts, diagnostic items and manual recording reviews distinctly. Skill performance percentages require at least two independent version-2 sessions with five different verified eligible items each; duplicate, assisted, scaffolded or unverified sessions do not fill the sample. A single correct answer or diagnostic success cannot produce a percentage or mastery. Unassessed and insufficient-evidence states are distinct from a measured low percentage.

Domain cards show accuracy of sampled skills only, measured/unassessed scope and separately confirmed skills. They do not claim overall domain mastery percentages. The existing mastery states, teacher overrides and diagnostic results remain separate. Errors, feedback hints and non-credit retries are visible, with suggestions for targeted skill review, more independent evidence or spaced review. Teacher evaluation controls are rendered in the separate adult area; the local mode toggle is organizational, not secure authentication.

## Storage and backward compatibility

- Existing learning/assessment keys and formats remain. New optional fields are additive; the original answer and identifiers are unchanged.
- seviat-child-experience-v1 stores adult routing/continuation/map/retention policy; seviat-instruction-preferences-v1 stores only instruction mute/volume. Invalid or concurrently changed originals are refused instead of silently replaced.
- seviat-voice-recordings-v1 is a separate IndexedDB database with the clips store, versioned blobs/metadata and explicit manual review history. No automatic migration or clearing of learning/placement/legacy data.
- Existing answer-save rollback, duplicate prevention and navigation/refresh recovery remain active. Local byte-comparison guards are best-effort concurrency protection, not atomic multi-tab synchronization. Quota/corruption/unavailable APIs provide fallback without blocking learning.

## Files

New runtime: child-experience.js, child-experience-ui.js, child-experience.css, guided-audio.js, student-voice.js, instruction-audio.json.

Modified runtime: student-journey.js (routing/hooks, recording lifecycle, saved feedback practice, scoped navigation), diagnostic-ui.js (simple child result and learning handoff, instruction fallback), index.html (links only).

Verification: tests/child-experience-check.cjs and tests/child-experience-browser.cjs added; tools/run-adaptive-checks.cjs extended to 19 groups and instruction-registry hashing. Eight prior browser suites explicitly choose supported adult-requested placement and manual session continuation so their existing educational assertions remain meaningful; universal-path regression additionally enables adult-approved map exploration. The new suite tests the default child route and auto-continuation. The historical tests were not replaced with automatic passing outcomes.

Development/checkpoint/test-body helpers are retained in tools, including checkpoint-child-phase4.cjs, integrate-child-phase4.cjs, phase4-regression-policy.cjs, phase4-simple-home.cjs, phase4-voice-visibility.cjs, phase4-mobile-recording-check.cjs, create-child-browser.cjs and child-browser-body.txt. The earlier rejected command remains recorded in the preserved report. The subsequently authorized final pass changed only the speaking-screen button colors and added readiness/contrast test diagnostics. No previously existing backup was edited.

Documentation: CHILD_FIRST_PHASE4_PLAN.md, CHILD_FIRST_LEARNING_PHASE4.md and CHILD_FIRST_PHASE4_PRESERVATION.json.

## Final verification and fixes

The speaking-screen secondary button «انتهيت» inherited a dark foreground in dark mode. Its scoped rule now explicitly uses foreground #173b70 and background #eaf4ff (approximately 10:1 contrast). Chrome computes the rendered colors and asserts contrast >=4.5 at 320/390/768/1280 widths in both themes. Screenshots were also inspected; the recording action and finished action are visible on the narrow dark screen. No global theme or brand changes were made.

A new pre-edit checkpoint is retained at .access-staging/phase4-final-1794566303350/checkpoint.json, including the earlier report, preservation proof, CSS and affected tests. The original Phase 4 checkpoint and all earlier test logs are retained.

Final executed command: node tools/run-adaptive-checks.cjs --browser. Evidence: .access-staging/adaptive-2026-11-13T10-38-34-967Z/summary.json. All 19 groups passed; sourceUnchangedDuringTests is true and all recorded source hashes were rechecked against the final files. git diff --check passed (line-ending warnings only).

| Group | Final result |
|---|---|
| tests/child-experience-check.cjs | PASS |
| tests/diagnostic-check.cjs | PASS |
| tests/interactions-check.cjs | PASS |
| tests/universal-path-check.cjs | PASS |
| tests/pedagogical-check.cjs | PASS |
| tests/adaptive-check.cjs | PASS |
| tests/journey-check.cjs | PASS |
| tests/unit1-check.cjs --live | PASS |
| tests/quality-check.cjs | PASS |
| tests/access-check.cjs --live | PASS |
| tests/child-experience-browser.cjs --live | PASS |
| tests/diagnostic-browser.cjs --live | PASS |
| tests/interactions-browser.cjs --live | PASS |
| tests/universal-path-browser.cjs --live | PASS |
| tests/pedagogical-browser.cjs --live | PASS |
| tests/journey-browser.cjs --live | PASS |
| tests/adaptive-browser.cjs --live | PASS |
| tests/access-browser.cjs --live | PASS |
| tests/unit1-browser.cjs --live | PASS |

The dedicated child Chrome suite covers default placement-to-learning, returning students, assigned activities, saved answers and refresh, automatic activity/question continuation and cancellation, repeated errors with truthful hints/retries, separate instruction sound preferences, missing-asset fallback, native playback, actual MediaRecorder with a fake microphone, local consented save, quota failure/retry, manual teacher review without mastery, permission denial, late microphone cleanup, retention/deletion, profile separation and sufficient-evidence percentages. Existing domain, prerequisite, game/activity, accessibility, diagnostic and historical storage regressions all passed. No physical microphone or actual child recording was used. The playback fixture is a harness-only non-language tone, not approved Arabic speech.

### Investigation of the two earlier readiness failures

The earlier full attempt at .access-staging/adaptive-2026-11-13T10-11-46-220Z recorded two readiness timeouts and also sourceUnchangedDuringTests:false. Those failed results are preserved; they have not been relabelled as passes. The old logs did not record resource timing/API state, so they cannot establish an exact retrospective root cause. Concurrent source editing made that run unsuitable for final acceptance; it does not prove a particular runtime defect.

Both tests now record readiness snapshots, resource timings, JavaScript/console errors and network failures without changing their original API predicates, 15-second deadlines or any existing assertion. The application marks Unit1Learning.ready only after all curriculum sources load and configure successfully. The harness deliberately delays the reviewed curriculum file by 1.5 seconds, which remains in place. In the final sequential frozen run, child readiness completed in 12686 ms and diagnostic readiness in 7241 ms. Both snapshots show complete document, loaded journey/diagnostic/child modules and Unit1 ready, with zero JavaScript, console or network failures. See child-readiness.json and diagnostic-readiness.json in the final evidence directory. The previous timeout did not reproduce; intermittent startup latency remains a monitored limitation rather than a fabricated confirmed fix. No timeout was extended, failed test skipped or success criterion relaxed.

## Remaining work / limits

- Supply human-approved generic spoken instructions before claiming spoken activity guidance or fully independent use by pre-readers. Current written/model fallback is intentional. Recording permission/API support requires a suitable secure browser context; denied/missing support falls back to ordinary learning.
- Pronunciation, language correctness and handwriting evaluation remain human. Recording captures sound; it does not transcribe, classify pronunciation or establish skill mastery. Existing handwriting board remains manual.
- Arabic teacher review is needed for rubrics, letter-name/sound/mark distinctions, sample interpretation and age suitability. Test real touch devices, screen readers, focus/contrast and listening quality with approved recordings. Automated fake-device playback/recording is not speech-quality validation.
- Shared-device voice privacy is local only: no secure identity, encryption guarantee, remote teacher inbox, server persistence or closed-app expiry worker. Local deletion covers this new voice store only, never historical progress.
- Full curriculum sequencing, prerequisites and existing human-observation limits remain. Placements, rewards and corrected practice retries do not automatically unlock levels.

No next development phase, logo redesign, backend, registration, paid API, commit, push or deployment was started. Phase 4 is ready for review within these documented limits. No next-phase implementation was started.
