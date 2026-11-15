'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const pureDir='.access-staging/adaptive-2026-11-13T10-23-23-374Z',browserDir='.access-staging/adaptive-2026-11-13T10-17-41-283Z',regressionDir='.access-staging/adaptive-2026-11-13T10-11-46-220Z';
const pure=JSON.parse(fs.readFileSync(path.join(pureDir,'summary.json'),'utf8')),browser=JSON.parse(fs.readFileSync(path.join(browserDir,'summary.json'),'utf8'));
if(pure.results.length!==10||pure.results.some(r=>!r.passed)||!pure.sourceUnchangedDuringTests||browser.results.length!==2||browser.results.some(r=>!r.passed)||!browser.sourceUnchangedDuringTests)throw Error('Expected executed local and focused browser checks');
for(const [p,h]of Object.entries(pure.sourceHashes))if(hash(p)!==h)throw Error('Changed since local tests: '+p);
const nativeChanges=Object.entries(browser.sourceHashes).filter(([p,h])=>hash(p)!==h).map(([p])=>p);if(nativeChanges.length)throw Error('Focused browser does not match current sources: '+nativeChanges.join(','));
const checkpointDir='.access-staging/child-phase4-1794530505181',checkpoint=JSON.parse(fs.readFileSync(path.join(checkpointDir,'checkpoint.json'),'utf8'));
const allowed=new Set(['student-journey.js','diagnostic-ui.js','index.html','tools/run-adaptive-checks.cjs',...['diagnostic','interactions','universal-path','pedagogical','journey','adaptive','access','unit1'].map(n=>'tests/'+n+'-browser.cjs')]);
const changed=Object.keys(checkpoint.hashes).filter(p=>hash(p)!==checkpoint.hashes[p]);if(changed.some(p=>!allowed.has(p)))throw Error('Unrelated file changed: '+changed.join(','));
const html=fs.readFileSync('index.html','utf8'),old=fs.readFileSync(path.join(checkpointDir,'index.html'),'utf8');for(const tag of ['header','footer'])if(html.match(new RegExp('<'+tag+'[\\s\\S]*?</'+tag+'>'))[0]!==old.match(new RegExp('<'+tag+'[\\s\\S]*?</'+tag+'>'))[0])throw Error('Brand changed');
const fullFile=path.join(regressionDir,'summary.json');const full=fs.existsSync(fullFile)?JSON.parse(fs.readFileSync(fullFile,'utf8')):null;const fullStatus=full?full.results.map(r=>'| '+r.command.join(' ')+' | '+(r.passed?'PASS':'FAIL: '+(r.error||'see log'))+' |').join('\n'):'The previously authorized full regression process has not produced its final summary yet; no final passing claim is made.';
const preserved=Object.fromEntries(Object.entries(checkpoint.hashes).filter(([p,h])=>!allowed.has(p)));
const proof={timestamp:new Date().toISOString(),status:'implemented; final visual fix and full frozen regression pending permission',checkpoint:checkpointDir,pureDirectory:pureDir,pureGroups:10,pureSourceUnchanged:true,focusedBrowserDirectory:browserDir,focusedBrowserGroups:2,focusedBrowserMatchesCurrentSources:true,regressionAttemptDirectory:regressionDir,fullFrozenRegressionPassed:false,changedExistingFiles:changed,preservedHashes:preserved};
const report=`# Phase 4 — Child-First Learning Experience and Guided Interaction

2026-11-13, Asia/Riyadh. Incremental implementation over the completed Phase 3. **Implementation is present, but final acceptance is pending.** The final command combining a known contrast fix and an unrestricted Chrome regression run was rejected by the user. It was not retried or bypassed. A text clarification was requested; no permission is inferred from silence. No commit, push, deployment, paid service, external API integration, logo edit or reset occurred.

## Inspection and preservation

Read ADAPTIVE_DIAGNOSTIC_PLACEMENT_PHASE3.md and inspected the current journey, diagnostic UI/rules, engine, activity generators, profiles, per-answer journal, sound settings, typography, existing assets and dirty Git tree. Phase 3's baseline was 17/17 passing groups. The implementation plan was recorded before editing in CHILD_FIRST_PHASE4_PLAN.md. Checkpoint: ${checkpointDir}/checkpoint.json; 122 file entries copied exclusively with SHA-256, including current branding and audio assets. Existing backups and unrelated modifications remain intact.

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

Development/checkpoint/test-body helpers are retained in tools, including checkpoint-child-phase4.cjs, integrate-child-phase4.cjs, phase4-regression-policy.cjs, phase4-simple-home.cjs, phase4-voice-visibility.cjs, phase4-mobile-recording-check.cjs, create-child-browser.cjs and child-browser-body.txt. An attempted final contrast-fix/Chrome command was rejected and did not execute. No previously existing backup was edited.

Documentation: CHILD_FIRST_PHASE4_PLAN.md, CHILD_FIRST_LEARNING_PHASE4.md and CHILD_FIRST_PHASE4_PRESERVATION.json.

## Executed tests — no final 19/19 claim

1. Current frozen-source local run: ${pureDir}/summary.json — **10/10 passing groups**, including 125 new pure checks, prior diagnostic/interaction/path/engine checks and existing structural/content/access tests. Source hashes stayed unchanged and match current sources.
2. Latest focused Chrome run: ${browserDir}/summary.json — **2/2 passing groups** (the 125 pure checks plus the dedicated browser suite), with zero page errors. Its tested runtime/test hashes also match current sources. It exercised actual MediaRecorder and audio playback with Chrome's fake microphone; no physical microphone or real child recording was used.
3. Dedicated Chrome verified the fresh welcome → placement → learning flow, no placement mastery, returners/homework, save/refresh, automatic question/session progression and cancellation/races, truthful wrong/hint/retry evidence, missing instruction fallback, mute/volume, local recording/playback/explicit save, simulated recording-quota refusal and retry, manual review without mastery, permission denial/late cleanup, profile isolation, expiry/deletion, sufficient-sample percentages and 320/390/768/1280 widths in light/dark themes. The recording action is visible within an 844px-high narrow viewport. The positive instruction-player test uses a non-language test tone served only by the test harness; it is not an approved instructional recording.
4. A full 19-group regression attempt was started earlier at ${regressionDir}. It ran during subsequent visual edits, so it is **not a valid final frozen-source run**. It included child/diagnostic readiness timeouts; a later focused child run passed. No readiness cause is asserted without further diagnosis. The existing successful legacy groups remain useful evidence, not proof of final 19/19 acceptance. Status at report generation:

| Group | Attempt result |
|---|---|
${fullStatus}

The final unrestricted Chrome regression request was rejected. It has not been rerun, and no unexecuted checks are reported as passing. Earlier logs, failed attempts and screenshots remain preserved. git diff --check passed with Windows line-ending warnings only.

## Remaining work / limits

- **Known visual issue:** the secondary انتهيت button on the speaking screen has poor dark-theme contrast. The proposed narrow fix is background:#eaf4ff!important;color:#173b70!important on #journey.speaking-view>#journey-next, plus a browser color assertion. The command containing that fix and final Chrome run was rejected; neither was applied. This must be resolved before final acceptance.
- Execute the full 19-group frozen-source regression and Chrome run after any authorized fix, and verify final source hashes. This report does not certify completion of that final acceptance step.
- Supply human-approved generic spoken instructions before claiming spoken activity guidance or fully independent use by pre-readers. Current written/model fallback is intentional. Recording permission/API support requires a suitable secure browser context; denied/missing support falls back to ordinary learning.
- Pronunciation, language correctness and handwriting evaluation remain human. Recording captures sound; it does not transcribe, classify pronunciation or establish skill mastery. Existing handwriting board remains manual.
- Arabic teacher review is needed for rubrics, letter-name/sound/mark distinctions, sample interpretation and age suitability. Test real touch devices, screen readers, focus/contrast and listening quality with approved recordings. Automated fake-device playback/recording is not speech-quality validation.
- Shared-device voice privacy is local only: no secure identity, encryption guarantee, remote teacher inbox, server persistence or closed-app expiry worker. Local deletion covers this new voice store only, never historical progress.
- Full curriculum sequencing, prerequisites and existing human-observation limits remain. Placements, rewards and corrected practice retries do not automatically unlock levels.

No next development phase, logo redesign, backend, registration, paid API, commit, push or deployment was started. Work is ready for review with the final visual/test actions explicitly pending the rejected permission decision.
`;
fs.writeFileSync('docs/CHILD_FIRST_PHASE4_PRESERVATION.json',JSON.stringify(proof,null,2),{flag:'wx'});fs.writeFileSync('docs/CHILD_FIRST_LEARNING_PHASE4.md',report,{flag:'wx'});console.log(JSON.stringify({report:'docs/CHILD_FIRST_LEARNING_PHASE4.md',localGroups:10,focusedBrowserGroups:2,final19Passing:false,preserved:Object.keys(preserved).length,changed}));