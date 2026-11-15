# AFAQ — Calm audio review

Started 2026-11-13; completed 2026-11-14 (Asia/Riyadh). Test directory timestamps are UTC. Scope: quieter existing audio, preserving Hoda/browser TTS, approved recordings, curriculum, branding and progress. The user has manually confirmed that Arabic instructions in the preceding repair are audible. This review does not replace that implementation or certify educational phoneme pronunciation.

## Causes

- `SeviatGuidedAudio.mount` scheduled narration on every mount, without a stable per-question visit identity. Intro, guided practice, independent practice, and restored/rerendered questions could repeat the same guidance. When both options were enabled, generic instructions and question reading were also queued together.
- `SeviatSound.play(correct/wrong)` combined synthesized tones with teacher encouragement recordings on every answer. Several legacy generic click paths could add another tap sound. Cancelling instruction speech did not consistently cancel other local spoken playback.
- The earlier native startup failure had no `onstart` before the unchanged 8-second deadline. Its OS/browser cause was not conclusively established. A pending native request could be left without recovery; increasing the timeout would not itself prove playback.

## Changes

- Automatic narration is claimed once per run/question identity; placement uses assessment/item identity. Intro does not automatically narrate the same first question. Guided-to-independent transitions, same-question rerenders, answer feedback, retries and progress updates do not replay explanations. An intentional new run gets new identities. Manual **أعد الشرح** remains available. Visit deduplication is in page memory, not student records; a full page reload may narrate a resumed question once again.
- One automatic source per question: when ordinary question reading is enabled and available it takes priority, otherwise use the generic instruction. No automatic double explanation. Turning automatic narration off suppresses both automatic sources; manual reading and replay remain independent. Approved recording priority, reviewed phonetic examples, and Arabic voice selection remain unchanged.
- Every accepted correct/wrong answer gets one short 110ms tone (plus its brief release), with no spoken praise. Feedback and narration cancel previous owned playback. Generic replay/record/retry controls do not add a competing click tone. Rejected double submissions remain silent.
- Spoken encouragement is restricted to successful completed sessions / existing explicit completion events, using the existing varied success recordings with no immediate repeat and a 12-second cooldown. Teacher previews do not create completion praise. New installations default spoken encouragement off; explicitly saved preferences are retained. Existing progress, rewards and mastery rules are untouched.
- Narration/teacher preview, encouragement and local student playback cancel competing spoken playback. Starting microphone recording cancels speech. Feedback sound, spoken encouragement, automatic explanation and question reading retain separate persistent controls. Master mute/volume remain independent. Optional music stays off and its disabled control explains that no approved music/player is supplied; no music capability is fabricated.
- Startup recovery: at 1.2 seconds, retry at most one native request only if it has never started, has no explicit failure and the synthesizer is not speaking. Invalidate the abandoned attempt before cancelling it so its late callbacks cannot finish the replacement. Never retry after `onstart`, explicit autoplay rejection, navigation, mute or cancellation. The original total 8-second start deadline and visible Arabic retry/error messages remain. A separate text-length-bounded completion watchdog (10–180 seconds) resolves failed playback if a started engine never sends end; it cancels the owned request and never restarts speech after start. No hidden repeated playback or external service is introduced. This handles the tested lost-start condition; it cannot guarantee an OS engine never stalls.

## Files

Runtime: `guided-audio.js`, `arabic-speech.js`, `student-journey.js`, `diagnostic-ui.js`, `seviat-sound-settings.js`, `afaq-workspace.js`.

Checks: `tests/calm-audio-check.cjs` (new), `tests/calm-sound-source.json` (new preservation fixture), `tests/arabic-speech-native-browser.cjs`, `tests/child-fixes-check.cjs`, `tests/child-experience-check.cjs`, `tests/diagnostic-check.cjs`, `tools/run-adaptive-checks.cjs`.

The historical immutable sound-source checks now explicitly compare the authorized calm adapter against its exact audited source and verify its prior baseline against the original historical hashes. They still protect other sources, content and branding. Functional sound behavior is separately exercised in a VM and actual Chrome; no mastery threshold, old assertion about educational evidence, or required pronunciation sample was removed.

## Preservation

Checkpoint before changes: `.access-staging/audio-repair-2026-11-13T17-53-32-241Z/checkpoint.json` (351 copied source/content/test/document files, hashes, Git status and HEAD). Previous backups, unrelated dirty files, index/logo/styles, student stores and assessment data are preserved. No destructive Git commands, commit, push, deployment, dependency installation or external/paid speech services.

## Tests

**Full regression: 25/25 PASS**, including 13 pure and 12 Chrome groups, at `.access-staging/adaptive-2026-11-13T18-04-41-187Z/summary.json`, with frozen sources throughout. After this run, the two audio modules received native HTML audio-control arbitration, a master gate for automatic narration (manual question reading remains available), and a bounded completion guard. Only those two modules and their two focused tests changed after the comprehensive run. **Final focused validation: 2/2 PASS**, at `.access-staging/adaptive-2026-11-13T21-17-46-043Z/summary.json`, with current source hashes matching this final evidence. The 25 groups were not all rerun after the final guard; the relevant pure and actual native Chrome checks were rerun. All other full-run hashes still match current files. Compatibility checks for student recording and teacher overrides also passed 2/2 each at `.access-staging/adaptive-2026-11-13T21-04-11-789Z` and `.access-staging/adaptive-2026-11-13T21-05-52-223Z`, before the last completion watchdog.

Preservation proof: `docs/AFAQ_CALM_AUDIO_PRESERVATION.json`: all 351 original files present, 340 unchanged, exactly 11 authorized originals changed, HEAD/index/styles/logo/curriculum/backups preserved. Final native evidence: `.access-staging/adaptive-2026-11-13T21-17-46-043Z/urgent-audio-native-ui.json`; 26/26 native samples completed, 12 production speech requests, zero page/console errors, three silent rerenders, five silent progress updates, one tone per wrong/retry answer and zero answer encouragement recordings. Actual native HTML audio playback cancels speech without self-cancellation; replay cancels that player; auto-off suppresses automatic question reading on the next question.

One post-resume native attempt at `.access-staging/adaptive-2026-11-13T21-02-04-535Z` failed waiting for sample 2 (ل) after the first two samples completed. The old trace did not distinguish a missing start from a missing end. This failure is retained and not called a pass. A final diagnostic event trace and a completion watchdog were added; the final run completes all 26 samples. The watchdog test proves bounded failure handling, not elimination of every platform stall.

| Attempt | Passed groups | Frozen | Result / retained failure |
|---|---|---|---|
| `adaptive-2026-11-13T17-59-02-937Z` | 12/13 | true | AssertionError [ERR_ASSERTION]: protected except exact authorized Phase 5 branding/volume adapter seviat-sound-settings.js |
| `adaptive-2026-11-13T18-01-35-146Z` | 2/2 | true | PASS |
| `adaptive-2026-11-13T18-04-41-187Z` | 25/25 | true | PASS |
| `adaptive-2026-11-13T21-02-04-535Z` | 1/2 | true | Error: Timeout: native local sample 2 |
| `adaptive-2026-11-13T21-04-11-789Z` | 2/2 | true | PASS |
| `adaptive-2026-11-13T21-05-52-223Z` | 2/2 | true | PASS |
| `adaptive-2026-11-13T21-17-46-043Z` | 2/2 | true | PASS |

 Initial pure run: 12/13 passed; the old diagnostic source-immutability assertion correctly noticed the authorized sound change. Its exact adapter check was updated, not bypassed. Focused calm/native run: 2/2 passed. All intermediate logs remain in their original output directories.

The current real Chrome group retains all 26 native pronunciation samples and exercises actual production-button playback with installed Microsoft Hoda (ar-EG), without mocked native speech. New checks include three repeated mounts of the same question, five progress updates, guided-to-independent deduplication, actual question index advancement, manual replay, automatic narration, rapid replacement, mute during speech, volume during speech, ordinary question reading, rapid duplicate answer suppression, wrong-answer/retry single tones, no spoken encouragement on answers, and preferences after refresh. Core tests deterministically simulate one lost native startup and verify recovery, no repeat after start, no retry after block/cancel, milestone cooldown/variation, and independent settings.

## Remaining limitations / manual review

- The exact OS/browser cause of the intermittent failure remains undetermined; the post-resume timeout above was observed, but the old trace did not identify its event phase. Bounded recovery passes the simulated failure checks; successful native events do not prove that every original failure is resolved. An engine that remains unresponsive still reaches the explicit retry message after 8 seconds.
- The test browser uses actual Chrome with `--headless=new`, real native speech and actual Web Audio; it cannot hear the physical speakers or judge the final mix. The user's preceding audible confirmation is recorded above, but calmness, clarity and timing of this build need manual listening.
- Arabic phonemes, isolated letter sounds and pronunciation models remain subject to human approval. No pronunciation scoring, automatic grammar/diacritization guarantee or external speech assessment was added.
- Actual Android/iOS voice packs and speakers are not verified by desktop viewport checks. Without a local Arabic voice use approved recordings or written fallback.
- Music has no supplied assets/player and remains unavailable/off. No student voice upload or retention change.

Manual acceptance: enable automatic guidance and complete a short matching session; verify one automatic instruction per new question, none on wrong answer/retry or guided rerender; use replay repeatedly; answer quickly; toggle feedback and spoken encouragement separately; verify only brief optional praise at completion; change mute/volume during speech; leave the activity during playback; listen on an actual phone and desktop. Review is still required; no publication is requested.