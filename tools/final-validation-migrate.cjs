'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const stamp=new Date().toISOString().replace(/[:.]/g,'-'), checkpoint='.access-staging/final-source-'+stamp;
fs.mkdirSync(checkpoint,{recursive:true});
const files=['tests/unit1-browser.cjs','tests/unit1-check.cjs','tests/adaptive-browser.cjs','tools/run-adaptive-checks.cjs'];
for(const file of files){const to=path.join(checkpoint,file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(file,to,fs.constants.COPYFILE_EXCL);}
fs.writeFileSync(path.join(checkpoint,'manifest.json'),JSON.stringify(Object.fromEntries([...files,'data/unit1-reviewed.json','unit1-learning.js','unit1-rules.js','.git/HEAD'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),null,2),{flag:'wx'});
const current=require('../data/unit1-reviewed.json'),old=JSON.parse(fs.readFileSync('.unit1-staging/data/unit1-reviewed.json','utf8').replace(/^\uFEFF/,''));
const extra=current.questions.filter(q=>!old.questions.some(p=>p.id===q.id));
const origin='.quality-staging/2026-11-11T21-32-26-795Z/prepare-quality.cjs';
fs.writeFileSync('docs/UNIT1_ADDITIONAL_QUESTIONS_AUDIT.json',JSON.stringify({historicalCount:old.questions.length,currentCount:current.questions.length,origin,originSha256:crypto.createHash('sha256').update(fs.readFileSync(origin)).digest('hex'),added:extra,removed:old.questions.filter(q=>!current.questions.some(p=>p.id===q.id)).map(q=>q.id)},null,2),{flag:'wx'});
let check=fs.readFileSync('tests/unit1-check.cjs','utf8');
check=check.replace("const operationKeys=new Set();",`const operationKeys=new Set();
const baseline=JSON.parse(read(path.join(root,'.unit1-staging/data/unit1-reviewed.json')));
const added=qs.filter(q=>!baseline.questions.some(p=>p.id===q.id));
check(added.length===R.letters.length*2,'Expected two absent-letter contrast tasks per letter');
check(baseline.questions.every(p=>qs.some(q=>q.id===p.id)),'Historical question IDs removed');
for(const l of R.letters){const additions=added.filter(q=>q.letter===l);check(additions.length===2,'Absent coverage '+l);for(const q of additions){
 check(q.skill==='letter-detection'&&q.phase==='cumulative'&&q.operation==='count-in-word','Added task outside scope '+q.id);
 check(q.answer==='٠'&&!q.stimulus.includes(l),'Absent letter answer '+q.id);
 check(data.wordGlossary.includes(q.stimulus),'Unknown added word '+q.id);
 check(q.requiredLetters.length===R.letters.length&&R.letters.every(x=>q.requiredLetters.includes(x)),'Cumulative prerequisite '+q.id);
 check([...q.stimulus.replace(/[\\u064B-\\u0652]/g,'')].every(c=>R.letters.includes(c)||'اوي'.includes(c)),'Future letter '+q.id);
}}
`);
check=check.replace("new Set(merged.questions.map(q=>q.id)).size===384","new Set(merged.questions.map(q=>q.id)).size===qs.length");fs.writeFileSync('tests/unit1-check.cjs',check);
let oldTest=fs.readFileSync('tests/unit1-browser.cjs','utf8');const start=oldTest.indexOf(' assert.equal(await cdp.eval(\'questionsData.questions.length\'),372);'),end=oldTest.indexOf(' // Failed fetch must never');
if(start<0||end<0)throw Error('Missing migration anchors');
const body=` const curriculum=JSON.parse(read(path.join(root,'data/unit1-reviewed.json')));
 assert.equal(await cdp.eval('questionsData.questions.length'),curriculum.questions.length);
 assert.equal(await cdp.eval('new Set(questionsData.questions.map(q=>q.id)).size'),curriculum.questions.length);
 assert.equal(await cdp.eval('questionsData.legacyQuestions.length'),255);
 assert.equal(await cdp.eval('Unit1Rules.validate(questionsData.questions)'),true);
 const click=async selector=>{assert(await cdp.eval('!!document.querySelector('+JSON.stringify(selector)+')'),'Missing '+selector);await cdp.eval('document.querySelector('+JSON.stringify(selector)+').click()');};
 const getState=()=>cdp.eval(\"JSON.parse(localStorage.getItem('seviat-unit1-learning-v2'))\");
 const open=async(l,skill,phase='training')=>cdp.eval('Unit1Learning.openSkill('+JSON.stringify(l)+','+JSON.stringify(skill)+','+JSON.stringify(phase)+')');
 const answerAll=async(oneWrong=false)=>{let count=0;while(await cdp.eval(\"!!document.querySelector('#u1-options')\")){
  if(await cdp.eval(\"!!document.querySelector('#u1-teacher-read')\")){await cdp.eval(\"document.querySelector('#u1-teacher-read').closest('details').open=true\");await click('#u1-teacher-read');}
  const oldId=await cdp.eval(\"document.querySelector('#activityArea').dataset.questionId\");
  const index=await cdp.eval(\"(()=>{const q=questionsData.questions.find(q=>q.id===document.querySelector('#activityArea').dataset.questionId);return [...document.querySelectorAll('#u1-options button')].findIndex(b=>b.dataset.answerValue\"+(oneWrong&&count===0?'!==':'===')+\"q.answer);})()\");
  assert(index>=0);await click('#u1-options button:nth-child('+(index+1)+')');
  await until(()=>cdp.eval(\"!document.querySelector('#u1-options')||document.querySelector('#activityArea').dataset.questionId!==\"+JSON.stringify(oldId)),'automatic question progression');
  if(++count>8)throw Error('Quiz loop');
 }return count;};
 // Teacher navigation is deliberately independent of learner mastery.
 await cdp.eval(\"localStorage.setItem('seviat-parent-pin-v1','123456')\");
 await open('ب','letter-shape');assert.equal(await cdp.eval(\"document.querySelector('#u1-start-practice').disabled\"),false);
 await open('م','letter-name');await click('#u1-start-practice');assert.equal(await answerAll(),5);assert.equal((await getState()).attempts.length,0);
 await open('م','letter-name');await click('#u1-start-assessment');assert.equal(await answerAll(true),5);
 let state=await getState();assert.equal(state.attempts.length,1);assert.equal(state.attempts[0].results.filter(r=>r.correct).length,4);assert.equal(state.attempts[0].teacherConfirmed,false);
 await cdp.eval(\"document.querySelector('#u1-save-attempt').closest('details').open=true\");await click('#u1-independent');await click('#u1-confirmed');await click('#u1-save-attempt');
 await until(()=>cdp.eval(\"!!document.querySelector('#seviat-parent-pin')\"),'teacher login');
 await cdp.eval(\"document.querySelector('#seviat-parent-pin').value='123456'\");await click('#seviat-parent-login');await click('#u1-save-attempt');
 assert.equal((await getState()).confirmations.length,1);assert.equal((await getState()).attempts.length,1);
 assert.equal(await cdp.eval(\"Unit1Rules.mastered(JSON.parse(localStorage.getItem('seviat-unit1-learning-v2')),'م','letter-name')\"),false);
 await cdp.send('Page.reload');await until(()=>cdp.eval('Unit1Learning.ready'),'saved reload');assert.equal((await getState()).attempts.length,1);assert.equal((await getState()).confirmations.length,1);
 // Shift only the isolated fixture; then prove spaced review can confirm mastery.
 await cdp.eval(\"(()=>{const s=JSON.parse(localStorage.getItem('seviat-unit1-learning-v2'));s.attempts[0].completedAt-=86400001;localStorage.setItem('seviat-unit1-learning-v2',JSON.stringify(s));})()\");
 await cdp.send('Page.reload');await until(()=>cdp.eval('Unit1Learning.ready'),'spaced fixture');await open('م','letter-name');await click('#u1-start-assessment');assert.equal(await answerAll(),5);
 await cdp.eval(\"document.querySelector('#u1-save-attempt').closest('details').open=true\");await click('#u1-independent');await click('#u1-confirmed');await click('#u1-save-attempt');
 assert.equal(await cdp.eval(\"Unit1Rules.mastered(JSON.parse(localStorage.getItem('seviat-unit1-learning-v2')),'م','letter-name')\"),true);
 // Traverse all original core and cumulative screens on a passed fixture.
 await cdp.eval(\"(()=>{const R=Unit1Rules,s=JSON.parse(localStorage.getItem('seviat-unit1-learning-v2'));for(const l of R.letters)for(const skill of R.coreSkills){const pool=questionsData.questions.filter(q=>q.letter===l&&q.skill===skill&&q.phase==='training').slice(0,5);s.attempts.push({id:crypto.randomUUID(),key:R.stateKey(l,skill),mode:'assessment',completedAt:Date.now(),results:pool.map(q=>({id:q.id,answer:q.answer,correct:true}))});}localStorage.setItem('seviat-unit1-learning-v2',JSON.stringify(s));})()\");
 await cdp.send('Page.reload');await until(()=>cdp.eval('Unit1Learning.ready'),'passed fixture');
 for(const l of curriculum.letters)for(const skill of await cdp.eval('Unit1Rules.coreSkills')){await open(l,skill);await click('#u1-start-practice');assert(await cdp.eval(\"!!document.querySelector('#u1-options')\"));await click('#u1-cancel');}
 for(const l of curriculum.letters)for(const skill of ['word-reading','letter-detection']){await open(l,skill,'cumulative');await click('#u1-start-practice');assert.equal(await answerAll(),5);}
 await cdp.eval(\"Unit1Learning.openWriting('م','letter-writing')\");const beforeWriting=(await getState()).attempts.length;
 await cdp.eval(\"document.querySelector('#u1-save-writing-0').closest('details').open=true\");await click('#u1-writing-0-0');await click('#u1-writing-confirm-0');await click('#u1-save-writing-0');assert.equal((await getState()).writing.length,1);assert.equal((await getState()).attempts.length,beforeWriting);
 await cdp.eval(\"Unit1Learning.openWriting('د','letter-writing')\");await click('#u1-free-board');assert(await cdp.eval(\"!!document.querySelector('canvas')\"));
 const shapes=await cdp.eval(\"document.querySelector('#activityArea').textContent\");assert(!shapes.includes('وسط الكلمة'));assert(!shapes.includes('أول الكلمة'));
 await cdp.eval('SeviatEffects.setEnabled(false)');await cdp.send('Page.reload');await until(()=>cdp.eval('Unit1Learning.ready'),'muted reload');assert.equal(await cdp.eval('SeviatEffects.isEnabled()'),false);
 assert.equal(await cdp.eval(\"localStorage.getItem('seviatLearningProgress')\"),legacyValue);
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await cdp.eval('document.documentElement.scrollWidth<=innerWidth'),true);
 fs.writeFileSync(path.join(stage,'unit1-live-mobile.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png'})).data,'base64'),{flag:'wx'});await cdp.send('Emulation.clearDeviceMetricsOverride');
 assert.equal(pageErrors.length,0,JSON.stringify(pageErrors));assert.equal(consoleErrors.length,0,JSON.stringify(consoleErrors));
`;
oldTest=oldTest.slice(0,start)+body+oldTest.slice(end);
const resultStart=oldTest.indexOf(' const result={passed:true'),resultEnd=oldTest.indexOf(' const crypto=require',resultStart);
oldTest=oldTest.slice(0,resultStart)+` const result={passed:true,mode:live?'live':'staged',activeQuestions:curriculum.questions.length,legacyRecords:255,skillScreensTraversed:60,cumulativeSessions:12,checks:['current curriculum validation','practice not assessment','4/5 auto save','teacher confirmation separate','spaced review mastery','all core screens','cumulative reading and detection','separate writing','non-joining board','mute persistence','390px layout','failed fetch and recovery','legacy preserved'],pageErrors:pageErrors.length};\n`+oldTest.slice(resultEnd);
fs.writeFileSync('tests/unit1-browser.cjs',oldTest);
console.log(JSON.stringify({checkpoint,added:extra.length}));