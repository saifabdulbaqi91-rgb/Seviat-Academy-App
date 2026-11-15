'use strict';
const fs=require('fs');const current=fs.readFileSync('tests/journey-browser.cjs','utf8');const prefix=current.slice(0,current.indexOf(' const historical='));
const scenario=`
 const preserved={
  'seviat-unit1-learning-v2':JSON.stringify({version:2,attempts:[],practice:{},writing:[],marker:'unit1-preserved'}),
  'seviat-unit2-practice-v1':JSON.stringify({'ص:shape':{attempts:2,correct:8,total:12}}),
  'seviatLearningProgress':JSON.stringify({score:31,answeredQuestions:['old-question'],custom:'preserve'}),
  'seviat-sound-preferences-v1':JSON.stringify({buttons:false,feedback:false})
 };
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:'for(const [key,value] of Object.entries('+JSON.stringify(preserved)+'))if(localStorage.getItem(key)===null)localStorage.setItem(key,value);'});
 await cdp.send('Page.navigate',{url});await until(()=>cdp.eval('window.Unit1Learning?.ready&&window.SeviatJourney&&window.SeviatAdaptive'),'ready');
 const click=async selector=>cdp.eval('document.querySelector('+JSON.stringify(selector)+').click()');
 const answer=async(correct=true)=>{
  const expected=await cdp.eval("(()=>{const id=document.querySelector('#journey').dataset.questionId;return questionsData.questions.find(q=>q.id===id)?.answer||document.querySelector('#journey .journey-model')?.textContent;})()");
  assert(expected,'a rendered question must expose its content');
  await cdp.eval("[...document.querySelectorAll('#journey .journey-options button')].find(b=>b.textContent"+(correct?'===':'!==')+JSON.stringify(expected)+").click()");await click('#journey-next');
 };
 const session=async(count,wrong=[])=>{await click('#journey-next');if(await cdp.eval("document.querySelector('#journey h2').textContent==='نجرب معًا'"))await answer();for(let i=0;i<count;i++)await answer(!wrong.includes(i));};
 await click('#journey-start');await session(5);
 assert.equal(await cdp.eval("SeviatJourney.getState().runs.at(-1).mode"),'practice');
 await click('#journey-next');await session(5);
 assert.equal(await cdp.eval("SeviatJourney.getState().runs.at(-1).mode"),'assessment');
 assert.equal(await cdp.eval("SeviatAdaptive.mastery(SeviatJourney.getState(),'prep:matching').status"),'progress-ready');
 await click('#journey-next');assert.equal(await cdp.eval("document.querySelector('#journey h2').textContent"),'لنكتشف ما تعرفه');await session(3);
 assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).results.length'),3);
 assert.equal(await cdp.eval("SeviatAdaptive.mastery(SeviatJourney.getState(),'م:letter-shape').status"),'learning');
 const count=await cdp.eval('SeviatJourney.getState().runs.length');await cdp.send('Page.reload');await until(()=>cdp.eval('window.Unit1Learning?.ready&&window.SeviatJourney'),'reload');assert.equal(await cdp.eval('SeviatJourney.getState().runs.length'),count);
 for(const [key,value]of Object.entries(preserved))assert.equal(await cdp.eval('localStorage.getItem('+JSON.stringify(key)+')'),value,key);
 // Every fixture and storage write below belongs to this isolated test browser.
 const seed=async(profile)=>{await cdp.eval('localStorage.setItem("seviat-guided-journey-v1",'+JSON.stringify(JSON.stringify({active:'test',profiles:{test:{name:'اختبار',overrides:{},runs:[],...profile}},unknownLegacyField:'retained'}))+')');await cdp.send('Page.reload');await until(()=>cdp.eval('window.Unit1Learning?.ready&&window.SeviatJourney'),'fixture reload');};
 const failed=Array.from({length:5},(_,i)=>({id:'matching-'+i,correct:i>2,verified:true}));
 await seed({runs:[{id:'prior-failure',node:'prep:matching',mode:'practice',evidenceVersion:2,independent:true,completedAt:Date.now()-1000,results:failed}]});
 await click('#journey-start');await click('#journey-next');assert.equal(await cdp.eval("document.querySelectorAll('#journey .journey-options button').length"),2);await answer();for(let i=0;i<5;i++)await answer();
 assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).independent'),false);
 assert.equal(await cdp.eval('JSON.parse(localStorage.getItem("seviat-guided-journey-v1")).unknownLegacyField'),'retained');
 await click('#journey-next');await click('#journey-next');assert.equal(await cdp.eval("document.querySelectorAll('#journey .journey-options button').length"),3);
 const known={};for(const l of ['م','ب','ل','د','ن','ر']){known[l+':letter-shape']='allow';known[l+':syllable-building']='allow';}
 await seed({overrides:known,homework:'ص:letter-shape'});await click('#journey-start');await click('#journey-next');
 const options=await cdp.eval("[...document.querySelectorAll('#journey .journey-options button')].map(b=>b.textContent)");assert(options.length>1);assert(options.every(value=>![...value].some(c=>'فسقتح'.includes(c))),'future Unit 2 letters must not be distractors');
 await cdp.eval('SeviatJourney.teacher()');assert.equal(await cdp.eval("!!document.querySelector('.adaptive-report')"),true);await cdp.eval("SeviatJourney.begin('ح:letter-shape',true)");assert.equal(await cdp.eval("document.querySelector('#journey h2').textContent"),'هيا نكتشف');
 await seed({overrides:known,homework:'word-game:1'});await click('#journey-start');await click('#journey-next');assert(await cdp.eval("document.querySelector('#journey h3').textContent.includes('ركّب الكلمة')"));
 const letters=await cdp.eval("document.querySelector('#journey .journey-model').textContent");assert(![...letters].some(c=>'صفسقتحكج'.includes(c)));
 await seed({overrides:known,homework:'م:letter-sound'});await click('#journey-start');await session(5);assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).independent'),false);assert.notEqual(await cdp.eval("SeviatAdaptive.mastery(SeviatJourney.getState(),'م:letter-sound').status"),'confirmed');
 await seed({});await click('#journey-start');await click('#journey-next');await answer();
 await cdp.eval("window.originalAdaptiveSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='seviat-guided-journey-v1')throw new DOMException('quota','QuotaExceededError');return originalAdaptiveSetItem.call(this,key,value);}");
 for(let i=0;i<5;i++)await answer();assert.equal(await cdp.eval('SeviatJourney.getState().runs.length'),0);assert(await cdp.eval("document.querySelector('#journey').textContent.includes('تعذر حفظ تقدمك')"));
 await cdp.eval('Storage.prototype.setItem=originalAdaptiveSetItem;SeviatJourney.home()');
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await cdp.eval('document.documentElement.scrollWidth<=innerWidth'),true);fs.writeFileSync(path.join(stage,'adaptive-mobile.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png'})).data,'base64'),{flag:'wx'});
 await cdp.eval("localStorage.setItem('seviat-guided-journey-v1','broken-original')");await cdp.send('Page.reload');await until(()=>cdp.eval('window.Unit1Learning?.ready&&window.SeviatJourney'),'corrupt fixture');assert.equal(await cdp.eval("localStorage.getItem('seviat-guided-journey-v1')"),'broken-original');
 for(const [key,value]of Object.entries(preserved))assert.equal(await cdp.eval('localStorage.getItem('+JSON.stringify(key)+')'),value,key);
 assert.equal(pageErrors.length,0,JSON.stringify(pageErrors));assert.equal(consoleErrors.length,0,JSON.stringify(consoleErrors));
 const result={passed:true,checks:['adaptive practice and assessment','short diagnosis','no single-answer mastery','reload persistence','legacy Unit 1/2 and sound settings unchanged','support excluded from evidence','unknown legacy fields preserved','no future letters in Unit 2 options','teacher preview and report','known-letter word game','unverified sound cannot certify mastery','quota rollback','corrupt data preserved','390px RTL'],pageErrors:0};fs.writeFileSync(path.join(stage,'adaptive-browser-results.json'),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result,null,2));
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{try{if(cdp)await cdp.send('Browser.close');}catch{}if(cdp)cdp.ws.close();if(browser&&!browser.killed)browser.kill();server.close();setTimeout(()=>process.exit(process.exitCode||0),300).unref();});
`;
fs.writeFileSync('tests/adaptive-browser.cjs',prefix+scenario,{flag:'wx'});
// Retain the previous assertions while allowing assessment sessions to omit guided hints.
let existing=fs.readFileSync('tests/journey-browser.cjs','utf8');const old="await click('#journey-start');await click('#journey-next');await choose();for(let i=0;i<5;i++)await choose();";if(!existing.includes(old))throw Error('Legacy test integration point missing');existing=existing.replace(old,"await click('#journey-start');await click('#journey-next');if(await cdp.eval(\"document.querySelector('#journey h2').textContent==='نجرب معًا'\"))await choose();for(let i=0;i<5;i++)await choose();");fs.writeFileSync('tests/journey-browser.cjs',existing,'utf8');
