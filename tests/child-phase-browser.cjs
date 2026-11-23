'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path');let b;
(async()=>{
 b=await require('./fixtures/browser-session.cjs')();const {evaluate:e,until}=b,checks=[];
 const check=(v,label)=>{assert(v,label);checks.push(label);};
 const click=s=>e(`document.querySelector(${JSON.stringify(s)}).click()`);
 const draft=()=>e('(()=>{const p=SeviatJourney.getState();return p.interactiveV1?.sessions[p.interactiveV1.activeId]})()');
 const unlocked=()=>e('document.querySelectorAll(".journey-options button").length>0&&[...document.querySelectorAll(".journey-options button")].every(b=>!b.disabled)');
 async function answer(correct,selector='.journey-options'){await e(`(()=>{const p=SeviatJourney.getState(),d=p.interactiveV1.sessions[p.interactiveV1.activeId],q=d.questions[d.index];[...document.querySelectorAll(${JSON.stringify(selector+' button')})].find(b=>b.dataset.value${correct?'===':'!=='}q.answer).click()})()`);}
 await e(`localStorage.setItem('seviat-guided-journey-v1',JSON.stringify({active:'phase',profiles:{phase:{name:'Isolated beginner',runs:[],overrides:{},sessionMode:'practice'}}}))`);
 await b.send('Page.reload');await until(()=>e('window.Unit1Learning?.ready&&window.SeviatJourney'),'fresh beginner');
 await e('SeviatJourney.setPreferences({autoAdvance:true});SeviatChildUI.settings=()=>({autoContinue:true});SeviatJourney.begin()');await click('#journey-next');
 let d=await draft();check(d.nodeId==='prep:matching','beginner starts at matching without overrides');
 // Complete every first attempt incorrectly, then correct it in practice.
 const original=d.id;
 for(let steps=0;steps<12;steps++){
  d=await draft();if(!d||d.id!==original)break;
  await until(async()=>{const current=await draft();return !current||current.id!==original||await unlocked()},'question narration');const current=await draft();if(!current||current.id!==original)break;await answer(false);await click('#journey-retry');
  await answer(true,'.journey-retry-options');
  const index=d.index,guided=d.guided;
  await until(async()=>{const next=await draft();return !next||next.id!==original||next.index!==index||next.guided!==guided;},'automatic correction progression');
 }
 await until(async()=>{const p=await e('SeviatJourney.getState()');const next=await draft();return p.runs.length===1&&!!next&&next.id!==original;},'automatic remedial session after corrected group');
 let p=await e('SeviatJourney.getState()');check(p.runs[0].results.every(r=>!r.correct&&r.practiceRetries.at(-1).credit==='practice-only'),'first wrong answers remain assessment evidence');
 check((await draft()).nodeId==='prep:matching','corrections lead to remedial practice without premature unlock');
 await b.send('Page.reload');await until(()=>e('window.Unit1Learning?.ready&&window.SeviatJourney'),'restored beginner');await e('SeviatJourney.begin()');
 check((await e('SeviatJourney.getState()')).runs[0].results.every(r=>!r.correct),'reopen preserves first-attempt evidence');
 check((await draft()).nodeId==='prep:matching','reopen restores remedial session');
 check(await e('Object.keys(SeviatJourney.getState().overrides).length===0'),'no access override introduced');
 await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
 check(await e('!document.querySelector("#journey").textContent.includes("???")'),'Arabic remains readable at mobile viewport');
 check(b.errors.length===0,'no uncaught browser exceptions');
 const result={passed:true,checks,audioMode:'controlled events, no synthesis or recording',output:b.output};fs.mkdirSync('docs/child-phase',{recursive:true});fs.writeFileSync('docs/child-phase/browser-results.json',JSON.stringify(result,null,2)+'\n');await b.send('Page.captureScreenshot',{format:'png'}).then(r=>fs.writeFileSync(path.join(b.output,'mobile.png'),Buffer.from(r.data,'base64')));console.log(JSON.stringify(result,null,2));
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{await b?.close();});


