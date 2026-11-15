'use strict';
const assert=require('assert/strict');
module.exports=async function({cdp,click,sleep,until,answer,reload,getState,letters}){
 const checks=[];
 const historical=await getState();
 const policy=await cdp.eval("localStorage.getItem('seviat-access-policy-v2')");
 const legacy=await cdp.eval("localStorage.getItem('seviatLearningProgress')");
 // These writes affect only the throwaway test profile, never the user's browser.
 await cdp.eval("localStorage.setItem('seviat-visual-levels-v1',JSON.stringify({unlocked:5}));localStorage.setItem('seviat-auditory-unlocked-v1','5');localStorage.setItem('seviat-memory-unlocked-v1','5')");
 await cdp.eval('openVisualLevels()');await cdp.eval("document.querySelector('#visualLevelList > div:nth-child(2) button').click()");
 assert.equal(await cdp.eval("new Set([...document.querySelectorAll('#visualChoices svg')].map(s=>s.getAttribute('width'))).size"),1);
 assert.equal(await cdp.eval("new Set([...document.querySelectorAll('#visualChoices svg g')].map(s=>s.getAttribute('fill'))).size"),1);
 checks.push('visual level 2 renders equal option sizes and colors');
 await cdp.eval('openMemoryLevels()');await click('#memoryLevels > div:first-child button');
 await letters();const screen=await cdp.eval("document.querySelector('#activityArea').innerHTML");
 await sleep(5300);assert.equal(await cdp.eval("document.querySelector('#activityArea').innerHTML"),screen);
 checks.push('memory navigation: expired real timer causes no error or screen change');
 // Observe scheduled Web Audio nodes and real ended events, without claiming listening quality.
 await cdp.eval(`(()=>{
   window.qualityTones=[];
   const proto=(window.AudioContext||window.webkitAudioContext).prototype;
   const original=proto.createOscillator;
   proto.createOscillator=function(...args){
     const node=original.apply(this,args),start=node.start;
     const record={frequency:null,ended:false};
     node.start=function(...args){record.frequency=node.frequency.value;if([330,660].includes(record.frequency))qualityTones.push(record);return start.apply(this,args);};
     node.addEventListener('ended',()=>record.ended=true);
     return node;
   };
 })()`);
 await cdp.eval('openAuditoryLevels()');await click('#auditoryLevels > div:nth-child(5) button');
 await click('#playAuditory');
 await until(()=>cdp.eval('qualityTones.length===5'),'five scheduled tones');
 assert.equal(await cdp.eval("document.querySelector('#playAuditory').disabled"),true);
 await click('#auditoryOptions button');
 assert.equal(await cdp.eval("document.querySelector('#auditoryNext').disabled"),true);
 assert.equal(await cdp.eval('qualityTones.some(t=>!t.ended)'),true);
 await until(()=>cdp.eval("!document.querySelector('#playAuditory').disabled"),'real playback end');
 assert.equal(await cdp.eval('qualityTones.every(t=>t.ended)'),true);
 // A previous full listen must not allow answers during replay.
 await cdp.eval('qualityTones=[]');await click('#playAuditory');await click('#auditoryOptions button');
 assert.equal(await cdp.eval("document.querySelector('#auditoryNext').disabled"),true);
 await cdp.eval('SeviatEffects.setEnabled(false)');
 await until(()=>cdp.eval("!document.querySelector('#playAuditory').disabled"),'muted cancellation');
 await click('#auditoryOptions button');assert.equal(await cdp.eval("document.querySelector('#auditoryNext').disabled"),true);
 await cdp.eval('SeviatEffects.setEnabled(true);qualityTones=[]');await click('#playAuditory');
 await until(()=>cdp.eval("!document.querySelector('#playAuditory').disabled"),'complete replay');
 const count=await cdp.eval('qualityTones.filter(t=>t.frequency===660).length');
 await click('#auditoryOptions button:nth-child('+count+')');
 assert.equal(await cdp.eval("document.querySelector('#auditoryNext').disabled"),false);
 assert(await cdp.eval("document.querySelector('#auditoryFeedback').textContent.includes('إجابة صحيحة')"));
 checks.push('auditory 5 actual Web Audio count, ended gating, replay lock, mute cancellation and correct answer');
 await click('#auditoryNext');await cdp.eval('qualityTones=[]');await click('#playAuditory');await letters();
 await until(()=>cdp.eval('qualityTones.every(t=>t.ended)'),'audio stopped after navigation');
 checks.push('auditory navigation stops scheduled oscillators');
 for(const l of await cdp.eval('Unit1Rules.letters')){
  await cdp.eval('Unit1Learning.openSkill('+JSON.stringify(l)+',"letter-sound")');
  assert.equal(await cdp.eval("document.querySelector('#u1-start-assessment').disabled"),true);
  assert.equal(await cdp.eval("document.querySelector('#u1-start-practice').disabled"),false);
  assert(await cdp.eval("document.querySelector('#activityArea').textContent.includes('التقييم بحاجة إلى مراجعة المعلم')"));
 }
 checks.push('all six letter-sound tests held for teacher review with practice retained');
 for(const skill of ['short-vowels','long-vowels']){
  await cdp.eval('Unit1Learning.openSkill(Unit1Rules.letters[0],'+JSON.stringify(skill)+')');await click('#u1-start-assessment');
  const seen={};let failedSub=null;
  for(let i=0;i<5;i++){
   const item=await cdp.eval("(()=>{const q=questionsData.questions.find(q=>q.id===document.querySelector('#activityArea').dataset.questionId);return {id:q.id,sub:SeviatAccessGuard.subskill(q)};})()");
   seen[item.sub]=(seen[item.sub]||0)+1;if(i===0)failedSub=item.sub;
   await answer(i!==0);
   await until(()=>cdp.eval("!document.querySelector('#u1-options')||document.querySelector('#activityArea').dataset.questionId!=="+JSON.stringify(item.id)),'diagnostic next');
  }
  const last=(await getState()).attempts.at(-1);
  assert.equal(last.results.filter(r=>r.correct).length,4);
  assert(last.results.every(r=>r.subskill));
  assert(await cdp.eval("document.querySelector('#u1-subskill-report').textContent.includes('يحتاج إلى مراجعة وتدريب')"));
  assert.equal(await cdp.eval("document.querySelectorAll('#u1-subskill-report p').length"),4);
  await reload();
  await cdp.eval('Unit1Learning.openSkill(Unit1Rules.letters[0],'+JSON.stringify(skill)+')');
  assert(await cdp.eval("document.querySelector('#u1-subskill-report').textContent.includes('يحتاج إلى مراجعة وتدريب')"));
 }
 checks.push('4/5 passes with distinct short/long subskill weakness reports retained on reload');
 // Render a full balanced word-count test, answer constantly one, and verify failure.
 await cdp.eval('Unit1Learning.openSkill(Unit1Rules.letters[0],"letter-detection","cumulative")');await click('#u1-start-assessment');
 for(let i=0;i<5;i++){
  // Keep choice lookup and activation in one browser task; page scrolling cannot redirect the click.
  const old=await cdp.eval("(()=>{const area=document.querySelector('#activityArea'),b=[...document.querySelectorAll('#u1-options button')].find(b=>b.dataset.answerValue==='١');if(!b||b.disabled)throw Error('Missing enabled constant-one answer: '+area.innerText);const id=area.dataset.questionId;b.click();return id;})()");
  await until(()=>cdp.eval("!document.querySelector('#u1-options')||document.querySelector('#activityArea').dataset.questionId!=="+JSON.stringify(old)),'counting next');
 }
 const constantAttempt=(await getState()).attempts.at(-1);
 assert.equal(constantAttempt.results.length,5);
 assert(constantAttempt.results.every(r=>r.answer==='١'));
 assert(constantAttempt.results.filter(r=>r.correct).length<=3);
 checks.push('constant-one strategy fails actual five-question cumulative assessment');
 const after=await getState();
 assert.deepEqual(after.attempts.slice(0,historical.attempts.length),historical.attempts);
 assert.deepEqual(after.writing,historical.writing);assert.deepEqual(after.practice,historical.practice);
 assert.equal(await cdp.eval("localStorage.getItem('seviat-access-policy-v2')"),policy);
 assert.equal(await cdp.eval("localStorage.getItem('seviatLearningProgress')"),legacy);
 checks.push('historical attempts/writing/practice and detailed policy unchanged');
 return checks;
};
