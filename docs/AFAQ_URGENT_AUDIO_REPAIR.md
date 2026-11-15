# AFAQ — Urgent audio playback repair

Date: 2026-11-13. Scope: repair Phase 5.1 instruction playback only. **Automated validation: 24/24 regression groups pass; the strengthened native test also passes on unchanged application code. Audible output and understandable Arabic remain unverified by human listening; the audible feature is NOT approved as complete.** Earlier 24/24 results did not prove the production replay button was audible.

## Root cause and traced flow

`instruction-audio.json` contains no approved clips. The activity renderer passes a valid ordinary instruction and question prompt to `SeviatGuidedAudio.mount`. Its availability check previously used only exact teacher-approved TTS selection or approved recordings. Consequently the replay button was disabled without individual teacher approval, despite an installed Arabic voice and working `speechSynthesis`. The earlier native-engine test bypassed this production button; the UI tests actually expected it to be disabled without recordings. Those expectations did not cover the requested ordinary TTS fallback.

This is a confirmed application-level cause. It does not establish whether a user's operating-system mixer, output device, tab mute, or browser policy also contributes to silence.

## Repair

- `arabic-speech.js`: separate reviewed pronunciation selection from playback selection. Ordinary built-in game instructions and multiword question guidance can use an available **local Arabic** browser voice without a teacher signature. Prefer local ar-SA, then a local Arabic default, then another local Arabic voice. No remote voice/service is enabled. Teacher-approved exact text/voice/rate remains preferred; explicit teacher rejection is respected. Isolated letters, vowel combinations, phonetic examples, and pronunciation validation cases still require human review. No scoring or mastery evidence is produced by TTS.
- `guided-audio.js`: use the ordinary fallback, finish loading approved recording overrides before enabling replay, and invoke synthesis directly within the click call stack without awaiting fetch/IndexedDB. Preserve recording priority and independent persistent settings. Cancel previous owned speech, including when changing a nonzero instruction volume, and avoid stale auto-start after a manual replay. Show Arabic loading, mute, unsupported, unavailable, blocked, timeout, and failed-completion messages. A native start is not described as proof of speaker output.
- Ignore late errors from cancelled utterances so they cannot affect a newer utterance. Navigation and recording retain existing cancellation behavior.
- `afaq-workspace.js`: clarify that speed changes require renewed approval for pronunciation examples, while ordinary instructions use the device Arabic voice.
- Tests: strengthen pure selection coverage; replace the old expected-disabled ordinary replay behavior with local fallback assertions; add actual production-button/native-engine verification to the existing Chrome group without removing its 26 required pronunciation samples. Native utterance volume is compared against its float32 representation, not a JavaScript double.

Modified tests: `tests/child-fixes-check.cjs`, `tests/child-fixes-browser.cjs`, `tests/child-experience-browser.cjs`, and `tests/arabic-speech-native-browser.cjs`.

Original displayed educational text, curriculum, learning thresholds, storage keys, sound effects/encouragement controls, branding, and student progress are preserved. Automatic explanation and question reading remain separate preferences; no preference is forcibly enabled or reset.

## Protection

Checkpoint: `.access-staging/audio-repair-2026-11-13T17-01-18-006Z/checkpoint.json`, containing copies and SHA-256 hashes of 349 pre-existing application/content/test/document files plus Git status and HEAD. Previous backup files and reports remain intact. All Chrome tests use dedicated temporary profiles and a local test server; no student browser profile or production records are reset. No commit, push, deployment, external speech service, or dependency installation.

## Test results

Final command: `node tools/run-adaptive-checks.cjs --browser`. **24/24 groups PASS**, including 12 pure and 12 actual Chrome browser groups. Sources remained unchanged during the complete run. After it finished, only the native test was strengthened to require an independent question-index advance and was rerun successfully; no application source changed. Current hashes match the composite full-plus-supplemental evidence. Evidence: `.access-staging/adaptive-2026-11-13T17-27-01-961Z/summary.json`; preservation proof: `docs/AFAQ_URGENT_AUDIO_PRESERVATION.json`. Supplemental command: `node tools/run-adaptive-checks.cjs --native-speech-only`; result: **1/1 PASS**, at `.access-staging/adaptive-2026-11-13T17-45-33-585Z/summary.json`. The question index demonstrably advances from 0 to 1, followed by working replay.

The strengthened pure group has 129 assertions. Actual installed local voice: **Microsoft Hoda - Arabic (Egypt)**, locale **ar-EG**. Chrome used `--headless=new`, a dedicated profile, real SpeechSynthesis and native utterances, without mocked speech callbacks. The production UI produced 10 native requests covering trusted-click replay, question change, automatic explanation after interaction, rapid replacement, muting active speech, changing active speech volume, ordinary question reading, and preferences after refresh. All requests used local Arabic, positive volume, and no pre-existing active utterance after cancellation. All 26 separate validation samples started and ended. Console errors: 0; page exceptions: 0. This verifies native engine interaction, not physical sound or pronunciation correctness. Recordings still take priority; the recorded-autoplay restriction scenario is simulated in its existing fixture and native autoplay succeeds after a permitted gesture. Actual denial is not forced by changing Chrome policies; the error/timeout branches have explicit regression coverage.

All prior regression groups also pass: 46 games, five learner scenarios, mobile/tablet/desktop and themes, teacher/report flows, diagnostic separation, legacy 384-question curriculum / 255 historical records / 60 writing activities, microphone privacy and storage compatibility. All 349 original files remain; 342 are unchanged and the seven changed files are listed above. Index, styles, official logo, curriculum, thresholds, old reports/backups and HEAD remain unchanged.

| Attempt | Passed groups | Frozen sources | Result / retained failure |
|---|---|---|---|
| `adaptive-2026-11-13T17-04-29-082Z` | 0/1 | false | Error: Uncaught: SyntaxError: Identifier 'r' has already been declared |
| `adaptive-2026-11-13T17-07-11-394Z` | 23/24 | false | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| `adaptive-2026-11-13T17-23-11-173Z` | 0/1 | true | AssertionError [ERR_ASSERTION]: Native engine failed to emit 1 of 26 samples; inspect phase5_1-native-emission.json. No linguistic approval is inferred. |
| `adaptive-2026-11-13T17-27-01-961Z` | 24/24 | true | PASS |
| `adaptive-2026-11-13T17-45-33-585Z` | 1/1 | true | PASS |

The first new UI harness failed because two CDP evaluations declared the same global `const r`; block scope fixed the harness. The exploratory full run then failed its new volume assertion because native utterances expose `0.4000000059604645` (float32) rather than the JS double `0.4`; the expected native value is now exactly `Math.fround(.4)`. Some sources changed during that exploratory run, so it is explicitly not accepted as a frozen run. An additional native-only run timed out on the first sample (name م) at the unchanged 8-second watchdog; its remaining 25 samples succeeded. No sample was skipped, timeout extended, or success fabricated. The final sequential complete run passes every sample. The intermittent initial engine timeout remains an observed platform limitation rather than a proven concurrency diagnosis: if it recurs in the app, the visible retry message is required. It does not certify audible output.

Phone/tablet sizes were tested as Chrome viewports; actual Android/iOS voice engines and physical devices were not verified. Browser-local TTS requires an installed local Arabic voice; unavailable platforms retain written guidance and optional approved recordings.

No human listening response has been recorded in this report. The manual procedure below remains required before audible acceptance.

## Required listening check — still manual

1. Open the running app in Chrome on the actual target device. Unmute the system output and browser tab/site, and select the intended speakers/headphones.
2. Start a preparation matching activity. In sound settings, enable instructional sound and set both master and instruction volume above zero. Click **أعد الشرح**. Confirm that the instruction is actually audible and understandable Arabic, matching the displayed task.
3. Enable **الشرح التلقائي**, answer and advance. Confirm automatic instructions; click **أعد الشرح** again on the new question. Rapidly replay twice and confirm the earlier speech stops.
4. Mute instructional sound, then restore it. Test volume changes. Verify sound effects can be controlled separately and question reading stays independent from automatic explanation.
5. If Chrome blocks automatic playback, click **أعد الشرح** and confirm that playback works after the gesture. If no local Arabic voice exists, confirm the Arabic availability message; install an OS Arabic voice or use an approved teacher recording.
6. Confirm no speech continues after leaving the activity or starting microphone recording. Refresh and confirm preferences persist. A teacher must separately review phonetic examples before using them as pronunciation models.

**Do not mark the audible feature complete based on API calls, start/end callbacks, or passing tests.** This environment cannot hear the physical output, verify the OS mixer/speaker path, or judge Arabic intelligibility. No actual speaker capture or human listening approval has been obtained.

Technical references consulted: [SpeechSynthesis.speak](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/speak), [getVoices and voiceschanged](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices). Available voices depend on the device; queued synthesis and asynchronous voice discovery are handled separately from physical audibility.