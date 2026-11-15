# AFAQ — Game-mechanic onboarding review

Date: 2026-11-14 (Asia/Riyadh). Test artifact directory timestamps use UTC. Scope: instruction repetition and optional interaction tutorials; no new development phase.

## Root cause

The previous visit guard used run/question identity. Each new question therefore qualified for the same automatic how-to instruction, even when its controls were unchanged. It also combined automatic question reading with the generic explanation preference. A settings refresh needed a separate guard so it could update controls without re-entering onboarding.

## Behavior implemented

- Game how-to audio is offered once per student/mechanic in a page visit, when automatic explanations are enabled. Question transitions, guided-to-independent rerenders, progress updates, settings updates and answer feedback do not replay it. A student who skips practice is not marked as understanding the mechanic; an unfamiliar mechanic may be introduced again after a page reload. Returning to a successfully learned mechanic skips automatic how-to audio even after reload.
- The existing optional help/demo is reused. The visible **جرّب طريقة اللعب** offer opens help for an unfamiliar mechanic; **أعد الشرح** remains available independently. Two distinct successful demo interactions are required for automatic tutorial-understanding evidence. Matching/choice use neutral shapes, memory requires observing and hiding the model, and listening requires completing the existing tone player before choosing. Errors and closing/skipping help never grant tutorial understanding.
- Tutorial records use the new local key `afaq-mechanic-understanding-v1`, keyed by student and stable versioned mechanic. They contain source/time/interaction count or an explicit named teacher confirmation, without educational scores, stars, mastery or unlocks. Existing storage formats and unknown fields are preserved. Unreadable/future-version data and concurrent writes fail safely without replacement. Storage failures are reported in Arabic.
- Stable mechanics: `visual-choice-v1`, `question-choice-v1`, `observe-recall-v1`, `listen-then-choice-v1`, `drawing-board-v1`, `record-replay-v1`. Ordinary question choice, the current card-choice construction activity and diagnostic card choice share one mechanic because their controls are the same. A genuinely different future interaction needs its own versioned identifier, not a letter or question ID.
- Students can reopen practice or explicitly reset the current tutorial in help. The teacher's advanced workspace can confirm/reset a selected mechanic for the selected local student. Neither operation changes academic evidence. A local role switch remains a convenience, not authentication.
- Automatic question reading uses its independent existing persistent preference. Only an explicit `questionNarration: true` content/context flag authorizes automatic question-specific narration; generic visual matching is excluded. The existing corpus was not broadly flagged or rewritten. Necessary listening stimuli retain their existing explicit listening controls and verified completion gates. Manual question reading remains available even when automatic question reading is off. How-to and necessary question narration wait serially for completion rather than overlap.
- Hoda/local Arabic TTS, approved teacher recording priority, replay, cancellation, volume, mute, feedback effects and occasional milestone encouragement are preserved. No speech engine, recording database, curriculum threshold or prerequisite engine was replaced. No external/paid service was added.
- Existing wrong-answer hints and retry remain optional and visual; no explanation or encouragement is automatically spoken after an error.

## Files

Runtime: `game-onboarding.js` (new), `guided-audio.js`, `child-activity.js`, `student-journey.js`, `afaq-workspace.js`, and the script include in `index.html`.

Tests: `tests/game-onboarding-check.cjs` and `tests/game-onboarding-browser.cjs` (new), `tests/child-fixes-browser.cjs`, `tests/arabic-speech-native-browser.cjs`, `tools/run-adaptive-checks.cjs`.

Only existing expectations that required per-question/familiar-game automatic audio or absolutely no tutorial-specific writes were updated for the requested behavior. Academic byte-for-byte preservation, curriculum prerequisites, real playback/recording priority, layout and sound checks remain required. No failing test is skipped.

## Preservation

Before editing, checkpointed 355 original source/content/test/document files, Git state and HEAD at `.access-staging/audio-repair-2026-11-13T21-41-51-193Z/checkpoint.json`. No file deletions, destructive Git commands, commits, pushes or deployment. Chrome tests use isolated test profiles, not the user's browsing profile or local student database. Final hash audit and frozen-source test results are recorded below.

## Verification

**Final full regression: 27/27 PASS** (14 pure groups and 13 actual Chrome groups). Command: `node tools/run-adaptive-checks.cjs --browser`. Evidence: `.access-staging/adaptive-2026-11-13T22-41-58-639Z/summary.json`. Sources remained frozen throughout; final source hashes still match. No remaining failed group and no skipped group.

This includes tutorial first entry, two successful practice steps, silent subsequent questions and familiar returns, new mechanics, manual replay, independent question reading, settings-update deduplication, wrong/skipped practice, student switching, named teacher confirmation/reset, student reset, corruption/quota/concurrency, and mobile/tablet/desktop layouts. Existing regression checks include all 46 game render/answer/next/leave paths, learner scenarios, curriculum/mastery safeguards, diagnostic separation, voice recording, Arabic PDF, light/dark RTL, keyboard/touch and historical data preservation. Native Hoda executed all 26 required corpus cases and 11 production UI speech requests; this is not human pronunciation approval or physical audibility verification. Mobile layout tests use desktop Chrome viewport emulation, not physical Android/iOS devices.

Preservation audit: 355 originals retained, 347 byte-for-byte unchanged and 8 deliberately changed; all checkpoint copies intact; no original missing and HEAD unchanged. Index HTML differs only by the new script include. See `docs/AFAQ_GAME_ONBOARDING_PRESERVATION.json` for hashes. No runtime/test source was edited after the final full run.

Intermediate evidence is preserved:

- `.access-staging/adaptive-2026-11-13T22-02-40-856Z`: pure tutorial check passed; new Chrome check failed at help-opening timing immediately after viewport resize. Added layout stabilization and an explicit open assertion; subsequent focused Chrome runs passed.
- `.access-staging/adaptive-2026-11-13T22-16-05-279Z`: tutorial checks 2/2 passed.
- `.access-staging/adaptive-2026-11-13T22-20-55-494Z`: full 25/27 passed. Both failures arose from an incorrectly quoted JavaScript expression introduced in `tests/child-fixes-browser.cjs`; fixed the syntax, not the pass criteria.
- `.access-staging/adaptive-2026-11-13T22-36-27-721Z`: focused 3/4 passed. Teacher/profile/reset tutorial checks passed. A historical override test waited for automatic playback on an already introduced mechanic. It now asserts silence, requests manual replay, and still requires the actual approved recording to play before TTS.
- `.access-staging/adaptive-2026-11-13T22-38-57-122Z`: repaired compatibility checks 2/2 passed, including approved recording priority, real media playback, autoplay fallback, keyboard/touch, 320px–desktop layouts and preserved legacy data.

## Limitations and manual review

- The neutral card demo does not prove handwriting or recording controls were understood. It explicitly says so and does not certify `drawing-board-v1` or `record-replay-v1`; these currently require an explicit teacher confirmation after observing the real controls. No automatic handwriting or pronunciation assessment is claimed.
- Tutorials prove basic interaction, not educational comprehension or mastery. They are optional, provide no credit and never unlock a curriculum step. Existing educational lesson introductions are retained; suppressing repetitive game explanations does not skip required learning.
- Automatic question reading is deliberately opt-in per authored item/context, not applied to every repetitive prompt or to isolated phonetic examples. New listening/reading content must identify its actual narration requirement and retain human validation for pronunciation models.
- Actual Chrome/native speech tests establish engine/media execution and cancellation, not physical speaker output or linguistic accuracy. The user previously confirmed Hoda was audible. Listen manually to the final pacing/clarity on the intended devices, including phone hardware; device speech availability/autoplay policies still apply.
- Brief manual check: enter a new mechanic with automatic explanations enabled; optionally complete its two demos; answer several questions and return/reload (no repeated how-to); request **أعد الشرح**; switch to a new mechanic; reset/retry tutorial; switch student; verify sound/volume and optional question reading. Verify no unsolicited speech after mistakes and use the optional visual hint.
