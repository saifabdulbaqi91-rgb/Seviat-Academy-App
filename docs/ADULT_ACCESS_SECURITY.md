# Local adult access

`adult-session.js` is loaded before the application. The existing parent login
dialog now opens one in-memory adult session, used by teacher, parent and audio
administration. Browser operations fail closed if the guard is absent.

Existing `seviat-parent-pin-v1` is authoritative when present. If absent, the
existing `afaq-owner-audio-pin` is accepted instead. Neither key is migrated,
copied, replaced or deleted. If both exist, the parent PIN controls the unified
session and the audio PIN remains untouched. If neither exists, an adult must
set up the PIN using the existing first-use dialog. This setup cannot prove
that the person is an adult. Unreadable credentials block access without repair.

Sessions last 10 minutes, have an explicit lock, and lock when returning to the
student home or entering student mode. Every privileged operation also checks
the deadline synchronously, independent of timer throttling. Five failed PIN
attempts impose a 30-second in-memory delay. Reloading resets that delay but
also loses the authenticated session. PIN changes in another tab lock the
session. Each tab authenticates separately. Teacher-owned preview/supervised
activity uses `adult-preview`; returning to the learner locks the session.

Entry checks are supplemented by checks in retained action handlers and store
methods: profile creation/switch, assignments, overrides, assessment criteria,
journey export and reports, diagnostic teacher observations/decisions, literacy
approval/admission/review, pilot approvals, tutorial teacher confirmation,
recording reviews/deletion, audio import/export/approval and speech review.
Audio database mutations and export recheck after asynchronous waits. Locking
closes adult panels and stops adult recording/playback without deleting assets.
Student learning, objective answers, progress saves and playback of approved
audio continue without an adult login. Student recording submission remains
allowed; deleting a saved recording requires adult authorization.

No student schema, progress key, existing recording or audio asset is migrated
or reset. Legacy progress corruption/retry safeguards remain unchanged.

## Limits

This is a local child barrier, **not production authentication**. A person who
controls the browser, developer tools, downloaded code, localStorage or IndexedDB
can bypass client checks or alter local evidence. PINs retain their existing
plain-text format to avoid an unapproved credential migration. The local delay
does not resist a determined attacker. Cross-student data is not encrypted or
isolated from the browser owner. Identical-origin scripts share this trust.

Production requires authenticated adult accounts, server-side role and student
ownership checks on every request, protected recordings, server-side validation
of evidence and a trustworthy audit log. Offline evidence must remain untrusted
until validated. Existing local records must be preserved and explicitly mapped
to accounts in a separate, reviewed rollout; do not infer ownership or silently
grant historical records new trust.

## Regression checks

`node tests/adult-security-check.cjs` runs real session and privileged methods
with synthetic storage, fake time, isolated VM contexts and forbidden IndexedDB
access. It checks denied direct calls, expiry, lock, unchanged original bytes
and authorized adult workflows. Journey routing tests use the actual session
core in their synthetic harness. Existing access, legacy progress, journey,
audio and quality tests must continue to pass. These checks are not a substitute
for a real-browser accessibility and full-workflow verification before release.
