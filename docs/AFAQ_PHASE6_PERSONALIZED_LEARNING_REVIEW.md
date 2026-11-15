# AFAQ — Phase 6: Personalized Learning Review

2026-11-14, Asia/Riyadh. Scope: safe local implementation over the existing application. No backend, production authentication, payments, subscriptions, synchronization, deployment, commit or push was introduced. Final validation results are recorded below.

## Audit and reuse

Read the Phase 3, Phase 4, Phase 5 and game-onboarding reports and inspected the dirty working tree before editing. Pre-change implementation plan: `docs/AFAQ_PHASE6_IMPLEMENTATION_PLAN.md`. Checkpoint: `.access-staging/audio-repair-2026-11-13T23-19-51-653Z/checkpoint.json` (360 original source/content/test/document files, copied exclusively with hashes, Git state and HEAD). Backups, unrelated branding work and existing student data are preserved.

Reused systems:

- Existing 193-node curriculum graph (85 required, 108 optional), six foundation/language domains, five diagnostic language domains, existing activity catalog and Saudi cumulative sequence: م، ب، ل، د، ن، ر; ص، ف، س، ق، ت، ح.
- Existing adaptive selection, per-answer journal, semantic task identity, hints/retries, guided/independent distinction, criterion-based progression, verified spaced assessments, legacy Unit 1 evidence projection and review scheduling.
- Existing local profile store, diagnostic store, teacher observations and voice-review database, accessible activity renderers, games, board, companion/rewards, shared preferences, Arabic RTL reports and Chrome PDF printing.
- Working Hoda/local browser TTS, approved-recording priority, independent question narration, sound controls and per-student mechanic onboarding. Audio modules and tutorial-understanding records were not rebuilt.

No production backend, authentication SDK/provider integration or server-side child authorization was found in the inspected application. Test HTTP servers are local test infrastructure, not an application backend. The existing parent/local role tools are not secure cloud accounts.

## Architecture and integration

`personalized-learning.js` is a pure, read-only projection over current curriculum, diagnostics and existing learning records. It derives plans rather than duplicating mastery state or persisting stale plan snapshots. Plan reconstruction after reload uses the original persistent history. The only new store, `afaq-personalized-decisions-v1`, contains append-only, per-student, reasoned placement-bypass decisions; it does not contain mastery or unlock flags.

The plan contains current stage/priority skill, prerequisite evidence, activity declarations, recommended strategy, short-term goals, review dates, verification status/rule, verified strengths, targeted interventions, safe enrichment, next currently eligible skill and a chronological history. If no next skill is eligible, it says so; it does not display a locked future skill as ready.

`personalized-learning-ui.js` renders the child home, local registration preparation, teacher overview, diagnostics/skill/timeline details, documented bypass controls and plan content inside the existing printable Arabic report. Existing teacher functions remain available behind advanced settings.

The existing journey accepts the derived strategy/mode for automatic sessions only when curriculum/content/assessment policy permits. Explicit teacher session preferences, assignments, previews and practice-only replays keep their existing behavior. Question pools use the policy for the actual requested mode. No mastery threshold was changed. The existing saved-draft resume path takes priority over starting another session.

After three consecutive failed sessions on the same skill, a permitted previously verified strength or completed prerequisite can supply one refresher session. Recommendations and the displayed plan use the same selection; after that different session the repeated-session condition clears and the engine can return to the weak skill. If there is no safe alternative, guided support and an explicit teacher-support recommendation are offered rather than inventing content or bypassing prerequisites. Teacher assignments and due reviews are not replaced by this rule. A regression test reproduced a completed prerequisite being selected even though its own prerequisites were currently locked; the alternative selector now checks current availability and content status as well as historical completion.

## Student journey

Welcome / local profile → short placement when required → recommended learning plan → current eligible activity → immediate feedback → saved progress → next appropriate activity / review.

- One main action: **ابدأ رحلتي** or **تابع رحلتي**. Existing Arabic/English interface switching is retained; Arabic instructional material is unchanged.
- Current skill and the optional plan appear immediately below the primary button. When map exploration is off, the older world-summary card is retained inside the optional plan rather than pushing it below the fold. A redundant discovery button is hidden when the primary action already resumes placement. Current skill is visible. **خطة تعلمي**, **نقاط قوتي**, **إنجازاتي**, the existing game library, and adult/profile access are optional disclosures.
- **تحدي التميز** appears only for verified, currently available, non-manual skills without an unresolved error/review need. It launches existing permitted practice with the existing adaptive difficulty. It is not an assessment, new mastery or an unlock. Participation rewards retain their separate meaning.
- Introductory content is not reset for returning learners. Completed placement and valid prior decisions persist; saved activities continue. Existing unregistered local profiles retain backward-compatible routing and are not forcibly re-registered or re-assessed.
- Newly created local profiles carry additive `phase6Registration` metadata. Their primary start action requires placement even if the legacy global automatic-placement preference is off. The previous profile is retained; failed profile storage rolls back the in-memory addition/active selection without overwriting prior data.

## Registration, decisions and persistence

The new profile dialog is explicitly for the parent/teacher, requires an adult self-attestation, and accepts an optional alias. No child email, password, birth date, legal name, payment details or microphone permission is requested. The existing multiple-profile management is reused. This is adult-managed local preparation, **not verified adult identity or secure registration**.

A new-profile placement bypass requires an explicit reason and observer, and references actual existing version-2 verified independent assessment runs meeting the existing spaced mastery rules. Practice scores, stars, diagnostic success, one assessment and an unsupported legacy Boolean alone cannot fabricate that referenced evidence. The decision records the reviewed criteria; changing future learning criteria does not erase the historical admission review or modify current mastery. Decisions are isolated by student and preserve original bytes on quota/concurrent/unreadable-version failures.

A later teacher-requested assessment takes precedence over an older bypass. Ending a new learner's assessment before collecting the minimum independent evidence is not an undocumented bypass; the learner can resume a fresh discovery while the stopped assessment remains in history. No evidence is deleted.

LocalStorage and IndexedDB persist only on this browser/device and can be lost if its storage is cleared. There is no cross-device synchronization. Adult self-attestation and switching to the teacher workspace are not authentication or authorization.

Production integration remains blocked pending an approved provider/backend, real adult authentication, server-side child/adult ownership and role authorization, private storage access policies, approved consent/retention/deletion/account-recovery rules, synchronization/conflict design, secure configuration and deployment approval. No credentials or paid/external service were assumed or activated.

## Educational strategies and evidence

| Context | Existing methods selected/reused | Evidence boundary |
|---|---|---|
| New/missing skill | Modeling, guided examples, visual matching, short independent attempts | Scaffolds/teacher-led tasks never automatically verify mastery |
| Repeated errors | Guided support, specific subskill/error review, prerequisite refresher, teacher correction | No clinical/developmental cause is inferred; accessibility preferences alone do not invalidate performance |
| Memory/attention/visual preparation | Existing varied preparation games and retrieval interactions | Game scores and tutorial-understanding are not language mastery |
| Auditory practice | Existing tone player/completion gates; human-presented language tasks where required | TTS is not an authoritative phoneme or pronunciation assessor |
| Consolidation | Existing 1/3/7-day review selection and independent assessment | Existing sample/count/accuracy/subskill rules and at least 24-hour assessment separation remain unchanged |
| Verified strength | Eligible existing stretch practice and application; one optional enrichment session | Requires verified mastery, safe content/prerequisites, no unresolved review gap; high practice scores are insufficient |
| Writing/speaking | Existing board, explicit local recording and named teacher observations | No automatic ink or pronunciation scoring; observations/diagnostics remain distinct from curriculum mastery |

Every existing activity is projected with target skill/domain, prerequisites, declared strategies, difficulty, supported practice/assessment/enrichment/manual modes and the evidence collected. These are capability declarations over existing renderers, not claims that all techniques or all assessments are available for every item. Manual-only content remains manual.

General instructional grounding: the [IES/What Works Clearinghouse foundational reading practice guide](https://ies.ed.gov/ncee/wwc/PracticeGuide/21) discusses explicit sound/letter and decoding instruction and practice with feedback. It is not validation of this application or proof that its English-language findings transfer unchanged to Arabic. The strategy mapping is an implementation decision requiring Arabic educator review, not a new efficacy claim. Oral transmission, careful human correction and purposeful repetition remain teacher-mediated where their correctness cannot be automated. Original Saudi cumulative content is retained.

## Diagnostics, mastery and strengths

The existing progressive diagnostic rules, minimum evidence, assistance attribution and length caps are reused. For new Phase 6 profiles, the configuration adds written sukūn and long-vowel branches. Their items are adapted from the existing reviewed bank through the existing bank builder, preserving question text, choices, semantic identity, eligibility and taught-letter checks. Existing stored assessment configurations/item snapshots remain unchanged. Explicit teacher-supplied branch configurations are respected.

The plan distinguishes **إتقان مثبت**, **قيد النمو**, **يحتاج دعمًا**, **أدلة غير كافية**, and **لم يُقيّم**. One incorrect answer is not labeled a proven gap. Percentages require at least two suitable version-2 independent samples; they are performance accuracy, not invented mastery percentages. Verified historical mastery remains separate from a recent review need.

The older report's practice-accuracy shortcut for “strengths” was removed: practice at 80–100% alone is no longer a verified strength. Diagnostic performance, tutorial success, rewards and teacher unlocks do not become curriculum mastery. Existing verified legacy assessment projections remain respected.

Coverage is bounded by actual available/prerequisite-safe content. Beginners may have only readiness items. Oral reading fluency, free speaking, sentence/text comprehension, independent dictation diagnostics and comprehensive handwritten-word assessment remain incomplete/manual or unassessed. The short budget can leave domains unassessed. No questions, scoring or content were fabricated to fill these gaps.

Advanced returning learners keep existing verified progress and available stages. A fresh advanced learner without verifiable curriculum records may still need teacher-guided prerequisite verification or the existing explicit teacher overrides; diagnostic-only success does not silently unlock levels. An external-assessment import/validation protocol was not invented in this phase.

## Files

New runtime: `personalized-learning.js`, `personalized-learning-ui.js`, `personalized-learning.css`.

Integrated runtime: `student-journey.js`, `child-experience-ui.js`, `diagnostic-ui.js`, `afaq-workspace.js`, `afaq-workspace-core.js`, and script/style includes in `index.html`.

New checks: `tests/personalized-learning-check.cjs`, `tests/personalized-learning-browser.cjs`. Runner: `tools/run-adaptive-checks.cjs`. Existing `tests/workspace-browser.cjs` and `tests/adaptive-browser.cjs` change only their expected Arabic resume label to the requested **تابع رحلتي**; no educational, layout, sound or data-preservation assertion was removed.

Documentation: this report, `docs/AFAQ_PHASE6_IMPLEMENTATION_PLAN.md`, and final preservation evidence recorded after verification.

## Verification

**Final comprehensive validation: 29/29 PASS** (15 pure groups and 14 actual Chrome groups), including all 27 previous groups and the two Phase 6 groups. Command: `node tools/run-adaptive-checks.cjs --browser`. Final evidence: `.access-staging/adaptive-2026-11-14T00-16-18-974Z/summary.json`. Runtime and test sources stayed frozen throughout this run and their current hashes match the final summary. No remaining failed group, skipped group or relaxed pass criterion. No runtime/test source was edited after the final full run.

The final checks cover new and returning learners, actual profile creation and quota rollback, diagnosis and stopped/re-requested assessments, plan/activity agreement, targeted support and safe variation, verified strengths/enrichment, locked prerequisites, mastery/diagnostic separation, decision persistence/student isolation, teacher review, Arabic report/PDF, keyboard/touch, mobile/tablet/desktop and light/dark themes. Hoda executed 26 required native corpus cases and 11 production UI speech requests; this does not establish physical audibility or correct Arabic pronunciation. Final screenshots and metrics show the primary action/current stage visible on the tested 320/390/768/1280 layouts.

Final preservation audit: 360 originals retained, 351 byte-for-byte unchanged and 9 intentionally modified. All checkpoint copies are intact; no original is missing; Git HEAD is unchanged. Branding/header/footer are exact, and index differs only by module/style links. Core curriculum, data, fonts, boards, audio and game-level onboarding sources are preserved. Hash evidence: `docs/AFAQ_PHASE6_PRESERVATION.json`.

Intermediate evidence:

- `.access-staging/adaptive-2026-11-13T23-30-33-939Z`: 14 existing pure groups passed before the new Phase 6 groups were added.
- `.access-staging/adaptive-2026-11-13T23-36-56-983Z`: 6/6 Phase 6/workspace/child compatibility groups passed, including actual Chrome, Arabic PDF and preservation.
- `.access-staging/adaptive-2026-11-13T23-44-57-217Z`: 2/2 expanded Phase 6 groups passed, including reused mark diagnostics, empty-stop handling, later reassessment, and profile-creation quota rollback.
- `.access-staging/adaptive-2026-11-13T23-49-00-456Z`: pure check passed; Chrome launch did not announce its DevTools endpoint within the unchanged 15-second startup deadline, before app loading. No page errors were reported because the page was not reached. The failure is retained; the same check was rerun without relaxing its timeout or assertions.

- `.access-staging/adaptive-2026-11-13T23-50-49-763Z`: identical focused checks rerun after the startup failure; 2/2 passed without timeout changes.
- `.access-staging/adaptive-2026-11-13T23-54-15-790Z`: first comprehensive run 29/29 passed on frozen sources, before the final home-layout refinement and locked-prerequisite regression guard.
- `.access-staging/adaptive-2026-11-14T00-13-44-535Z`: 2/2 focused checks passed after those refinements, including primary action/current-skill visibility and desktop/mobile light/dark screenshots. The final comprehensive rerun recorded above includes these refinements.

## Remaining limitations and manual review

- Production accounts, adult authorization and cross-device synchronization require the approved infrastructure listed above. Local files are not secure cloud accounts.
- The new diagnostic branches assess written marks using existing content, not validated pronunciation or oral decoding. Missing/manual assessment scopes remain explicitly unassessed.
- Current enrichment reuses permitted existing stretch/application tasks. New creative language content, richer transfer tasks and comprehensive fluency/comprehension/dictation banks need pedagogical content review and are not claimed as completed.
- Review spoken Arabic and pedagogical suitability with an Arabic teacher. Real Chrome/native events cannot prove physical audibility or linguistic accuracy; mobile viewports are emulated, not physical Android/iOS devices.
- Intermittent truncation of long encouragement is a known low-priority defect. Learning does not wait for encouragement; narration/answers/navigation retain cancellation and priority. No audio rebuild was attempted, and the defect must not be described as fixed.
- Manual acceptance: create an alias with an adult, complete discovery, resume a saved attempt, inspect a weak-skill intervention and a verified-strength challenge, switch child profiles, save a reasoned prior-assessment review, and inspect/print the Arabic report on the intended devices. Confirm the calm mechanic-level audio remains appropriate.
