# AFAQ Phase 5 — retained verification history

These are executed attempts, including failures. Only the final 12-17-04 unchanged-source 21/21 run is acceptance evidence; passing groups from an edited intermediate run are not a final acceptance claim. Logs and screenshots remain in their original directories.

| Evidence directory under .access-staging | Passing groups | Sources unchanged |
|---|---|---|
| adaptive-2026-11-13T11-16-09-616Z | 1/2 | true |
| adaptive-2026-11-13T11-17-41-537Z | 2/2 | true |
| adaptive-2026-11-13T11-19-11-165Z | 18/21 | true |
| adaptive-2026-11-13T11-30-10-971Z | 21/21 | false |
| adaptive-2026-11-13T11-43-01-622Z | 2/2 | true |
| adaptive-2026-11-13T11-44-56-108Z | 21/21 | false |
| adaptive-2026-11-13T11-50-06-112Z | 2/2 | true |
| adaptive-2026-11-13T11-53-08-214Z | 20/21 | false |
| adaptive-2026-11-13T11-57-30-136Z | 18/21 | false |
| adaptive-2026-11-13T12-03-13-643Z | 20/21 | false |
| adaptive-2026-11-13T12-13-16-641Z | 2/2 | true |
| adaptive-2026-11-13T12-17-04-679Z | 21/21 | true |

## Findings and corrections

Earlier failed attempts are retained, not relabelled as passes: .access-staging/adaptive-2026-11-13T11-16-09-616Z exposed a test click racing the sidebar transition; the harness now waits for transition completion and verifies the click target is unobstructed. .access-staging/adaptive-2026-11-13T11-19-11-165Z exposed a collision between the new suite's and old suite's exclusive child-readiness.json artifact.

The new suite now writes workspace-readiness.json.

The same run also exposed two legacy navigation expectations: a completely hidden student menu and the old direct parent-settings button. Tests now navigate the shared settings menu to the teacher advanced access controls, preserving login/save/cancel checks and verifying administrator controls remain absent in child mode. These incompatibilities were corrected without skipping educational assertions, extending readiness timeouts or replacing application outcomes.

An intermediate run at .access-staging/adaptive-2026-11-13T11-30-10-971Z passed every group but was superseded: direct PDF-page rendering exposed dark paper margins, so print CSS and checks were improved before that run ended; its sourceUnchangedDuringTests:false prevents accepting it as final proof.

The corrected print canvas is explicitly white, uses full printable width, and tests require an actual loaded Noto Naskh face. A final inspection also found that the already-loaded curriculum could precede registration of the new home hook; initialization now explicitly attaches to the existing home and is idempotent. Chrome simulates the missed initial hook and verifies one library and one menu, plus a saved-draft resume label. That confirmed initialization/label fix supersedes the intermediate 11-44-56 run; An additional accessibility check retains lang=ar on instructional containers under an English interface, with language metadata on translated controls.

The intermediate 11-53-08 run is likewise superseded by that metadata correction; only the final unchanged-source run below is acceptance evidence.

An intermediate pedagogical Chrome suite saved all passing results and then stalled waiting for Browser.close to acknowledge after Chrome had closed.

The legacy browser harnesses now bound this cleanup wait to two seconds, following the existing child/interactions pattern, while retaining assertion failure exit status and all main test deadlines. A transient inline-comment syntax error during that cleanup edit was observed by the still-running intermediate 11-57-30 process. It was corrected to a block comment; all seven modified harnesses passed node --check before the final run. Those intermediate parse failures are retained in their logs, not reclassified.

The intermediate 11-57-30 run is superseded; the final full run verifies the corrected harnesses.

The intermediate 12-03-13 access navigation missed a letter-picker target after a pointer click.

The security suite now waits for a stable unobstructed target before each single click, records the click trace and retains all original policy/login/grade assertions; it never retries an answer to force success.

The final focused access and full regressions supersede that attempt.

The old log lacks enough pointer telemetry to prove the retrospective cause more narrowly. Narrow-screen report text was also improved to readable cards and covered by a >=16px browser assertion.
