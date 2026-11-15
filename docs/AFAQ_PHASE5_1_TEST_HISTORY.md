# Phase 5.1 actual test history

All intermediate failures remain in their original output directories. No failed run is relabelled as acceptance. Native emission was moved to its own group without dropping the 26 actual speech assertions; UI fixture checks do not certify pronunciation.

| Run | Pass / total | Source frozen | Failure observed |
|---|---|---|---|
| adaptive-2026-11-13T13-12-09-002Z | 1 / 2 | true | child-fixes-browser.cjs: Error: Timeout: Chrome start  |
| adaptive-2026-11-13T13-12-42-049Z | 1 / 2 | true | child-fixes-browser.cjs: AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value: |
| adaptive-2026-11-13T13-14-50-988Z | 1 / 2 | true | child-fixes-browser.cjs: SyntaxError: missing ) after argument list |
| adaptive-2026-11-13T13-15-48-182Z | 1 / 2 | true | child-fixes-browser.cjs: AssertionError [ERR_ASSERTION]: next viewport stable |
| adaptive-2026-11-13T13-17-42-350Z | 1 / 2 | true | child-fixes-browser.cjs: Error: Uncaught: Error: Missing/disabled #journey-next |
| adaptive-2026-11-13T13-18-55-160Z | 1 / 2 | true | child-fixes-browser.cjs: Error: Uncaught: SyntaxError: missing ) after argument list |
| adaptive-2026-11-13T13-22-32-186Z | 1 / 2 | true | child-fixes-browser.cjs: Error: Timeout: fixture synthesis complete |
| adaptive-2026-11-13T13-26-07-424Z | 1 / 2 | true | child-fixes-browser.cjs: AssertionError [ERR_ASSERTION]: family answers one screen prep:attention:5320 {"top":543.453125,"bottom":590.546875,"width":50.078125,"height":47.09375} |
| adaptive-2026-11-13T13-29-42-437Z | 20 / 23 | true | child-fixes-browser.cjs: AssertionError [ERR_ASSERTION]: family answers one screen prep:observation:5320 {"top":544.875,"bottom":591.96875,"width":44.5625,"height":47.09375}; interactions-browser.cjs: Error: Uncaught: Error: Missing/disabled #journey .journey-options button[data-value="● ▲"]; pedagogical-browser.cjs: AssertionError [ERR_ASSERTION]: prep:attention:4 |
| adaptive-2026-11-13T14-16-22-266Z | 1 / 2 | true | child-fixes-browser.cjs: AssertionError [ERR_ASSERTION]: local speech emission {"id":"name:م","started":false,"ended":false,"reason":"blocked"} |
| adaptive-2026-11-13T15-26-28-078Z | 1 / 2 | true | child-fixes-browser.cjs: AssertionError [ERR_ASSERTION]: local speech emission {"id":"name:م","started":false,"ended":false,"reason":"blocked","state":{"paused":false,"speaking":false,"pending":false,"focus":true,"visibility":"visible"}} |
| adaptive-2026-11-13T15-34-19-918Z | 2 / 2 | true | PASS |
| adaptive-2026-11-13T15-37-28-210Z | 23 / 24 | true | child-fixes-browser.cjs: Error: Timeout: teacher recording ready |
| adaptive-2026-11-13T15-54-38-709Z | 2 / 2 | true | PASS |
| adaptive-2026-11-13T16-01-09-861Z | 24 / 24 | true | PASS |
| adaptive-2026-11-13T16-18-54-694Z | 24 / 24 | true | PASS |

The final run above uses current source hashes. Intermediate harness expression/keyboard errors, browser startup restrictions, real layout/scroll defects, disabled-answer harness incompatibility, and native speech/recording readiness failures were investigated and preserved. No educational grading threshold was reduced.
