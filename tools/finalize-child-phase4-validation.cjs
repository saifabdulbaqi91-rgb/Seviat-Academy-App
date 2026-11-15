'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const dir='.access-staging/adaptive-2026-11-13T10-38-34-967Z',checkpoint='.access-staging/phase4-final-1794566303350';
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const summary=JSON.parse(fs.readFileSync(dir+'/summary.json','utf8'));
if(summary.results.length!==19||summary.results.some(r=>!r.passed)||!summary.sourceUnchangedDuringTests)throw Error('All 19 frozen-source groups must pass');
for(const [p,h]of Object.entries(summary.sourceHashes))if(hash(p)!==h)throw Error('Source changed since full run: '+p);
const proofFile='docs/CHILD_FIRST_PHASE4_PRESERVATION.json',proof=JSON.parse(fs.readFileSync(proofFile,'utf8'));
for(const [p,h]of Object.entries(proof.preservedHashes))if(hash(p)!==h)throw Error('Protected file changed: '+p);
const oldHtml=fs.readFileSync('.access-staging/child-phase4-1794530505181/index.html','utf8'),html=fs.readFileSync('index.html','utf8');for(const tag of ['header','footer']){const re=new RegExp('<'+tag+'[\\s\\S]*?</'+tag+'>');if(html.match(re)[0]!==oldHtml.match(re)[0])throw Error('Brand changed');}
const readiness=Object.fromEntries(['child','diagnostic'].map(n=>[n,JSON.parse(fs.readFileSync(dir+'/'+n+'-readiness.json','utf8'))]));
for(const r of Object.values(readiness))if(!r.snapshot.unit1Ready||r.pageErrors.length||r.consoleErrors.length||r.networkFailures.length)throw Error('Readiness not clean');
const native=JSON.parse(fs.readFileSync(dir+'/child-experience-browser-results.json','utf8'));if(!native.passed||native.pageErrors)throw Error('Native browser result not passing');
const doc='docs/CHILD_FIRST_LEARNING_PHASE4.md';let report=fs.readFileSync(doc,'utf8');
const paraStart=report.indexOf('2026-11-13'),paraEnd=report.indexOf('\n\n## Inspection');
report=report.slice(0,paraStart)+'2026-11-13, Asia/Riyadh. **Phase 4 final automated validation: 19/19 groups PASS on unchanged source hashes. Ready for acceptance within the documented supported scope.** The user explicitly authorized this final verification after the earlier permission rejection. No Phase 5, commit, push, deployment, logo edit or data reset occurred.'+report.slice(paraEnd);
report=report.replace('An attempted final contrast-fix/Chrome command was rejected and did not execute. No previously existing backup was edited.','The earlier rejected command remains recorded in the preserved report. The subsequently authorized final pass changed only the speaking-screen button colors and added readiness/contrast test diagnostics. No previously existing backup was edited.');
const start=report.indexOf('## Executed tests'),end=report.indexOf('## Remaining work / limits');
const rows=summary.results.map(r=>'| '+r.command.join(' ')+' | PASS |').join('\n');
const tests=`## Final verification and fixes

The speaking-screen secondary button «انتهيت» inherited a dark foreground in dark mode. Its scoped rule now explicitly uses foreground #173b70 and background #eaf4ff (approximately 10:1 contrast). Chrome computes the rendered colors and asserts contrast >=4.5 at 320/390/768/1280 widths in both themes. Screenshots were also inspected; the recording action and finished action are visible on the narrow dark screen. No global theme or brand changes were made.

A new pre-edit checkpoint is retained at ${checkpoint}/checkpoint.json, including the earlier report, preservation proof, CSS and affected tests. The original Phase 4 checkpoint and all earlier test logs are retained.

Final executed command: node tools/run-adaptive-checks.cjs --browser. Evidence: ${dir}/summary.json. All 19 groups passed; sourceUnchangedDuringTests is true and all recorded source hashes were rechecked against the final files. git diff --check passed (line-ending warnings only).

${rows ? '| Group | Final result |\n|---|---|\n'+rows : ''}

The dedicated child Chrome suite covers default placement-to-learning, returning students, assigned activities, saved answers and refresh, automatic activity/question continuation and cancellation, repeated errors with truthful hints/retries, separate instruction sound preferences, missing-asset fallback, native playback, actual MediaRecorder with a fake microphone, local consented save, quota failure/retry, manual teacher review without mastery, permission denial, late microphone cleanup, retention/deletion, profile separation and sufficient-evidence percentages. Existing domain, prerequisite, game/activity, accessibility, diagnostic and historical storage regressions all passed. No physical microphone or actual child recording was used. The playback fixture is a harness-only non-language tone, not approved Arabic speech.

### Investigation of the two earlier readiness failures

The earlier full attempt at .access-staging/adaptive-2026-11-13T10-11-46-220Z recorded two readiness timeouts and also sourceUnchangedDuringTests:false. Those failed results are preserved; they have not been relabelled as passes. The old logs did not record resource timing/API state, so they cannot establish an exact retrospective root cause. Concurrent source editing made that run unsuitable for final acceptance; it does not prove a particular runtime defect.

Both tests now record readiness snapshots, resource timings, JavaScript/console errors and network failures without changing their original API predicates, 15-second deadlines or any existing assertion. The application marks Unit1Learning.ready only after all curriculum sources load and configure successfully. The harness deliberately delays the reviewed curriculum file by 1.5 seconds, which remains in place. In the final sequential frozen run, child readiness completed in ${readiness.child.elapsed} ms and diagnostic readiness in ${readiness.diagnostic.elapsed} ms. Both snapshots show complete document, loaded journey/diagnostic/child modules and Unit1 ready, with zero JavaScript, console or network failures. See child-readiness.json and diagnostic-readiness.json in the final evidence directory. The previous timeout did not reproduce; intermittent startup latency remains a monitored limitation rather than a fabricated confirmed fix. No timeout was extended, failed test skipped or success criterion relaxed.

`;
report=report.slice(0,start)+tests+report.slice(end);
report=report.replace(/- \*\*Known visual issue:\*\*[^\n]*\n/,'').replace(/- Execute the full 19-group[^\n]*\n/,'');
report=report.replace('Work is ready for review with the final visual/test actions explicitly pending the rejected permission decision.','Phase 4 is ready for review within these documented limits. No next-phase implementation was started.');
fs.writeFileSync(doc,report);
proof.previousStatus=proof.status;proof.timestamp=new Date().toISOString();proof.status='Phase 4 final automated validation passed; ready for review within documented limits';proof.finalCheckpoint=checkpoint;proof.finalRegressionDirectory=dir;proof.finalGroups=19;proof.fullFrozenRegressionPassed=true;proof.finalSourceUnchanged=true;proof.finalHashesMatchCurrent=true;proof.finalReadiness=Object.fromEntries(Object.entries(readiness).map(([k,r])=>[k,{elapsed:r.elapsed,pageErrors:r.pageErrors.length,consoleErrors:r.consoleErrors.length,networkFailures:r.networkFailures.length}]));proof.contrast={foreground:'#173b70',background:'#eaf4ff',minimumRequired:4.5,themes:['light','dark'],widths:[320,390,768,1280]};proof.focusedBrowserMatchesCurrentSources=false;proof.earlierFocusedRunSupersededByFinalRun=true;
fs.writeFileSync(proofFile,JSON.stringify(proof,null,2));console.log(JSON.stringify({passed:19,sourceHashesMatch:true,protectedFiles:Object.keys(proof.preservedHashes).length,report:doc},null,2));