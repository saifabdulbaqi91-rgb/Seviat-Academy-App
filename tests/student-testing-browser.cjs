'use strict';
const assert=require('assert/strict'),fs=require('fs'),os=require('os'),path=require('path'),P=require('../tools/prepare-pages.cjs');let b;
(async()=>{
 const output=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'afaq-pages-test-')),'site');P.build(output);
 b=await require('./fixtures/browser-session.cjs')({root:output,basePath:'/Seviat-Academy-App/',page:'testing.html?v=20261124-testing-3',ready:'document.querySelector("#student-testing")?.getAttribute("aria-busy")==="false"&&!!document.querySelector("[data-unit]")'});
 const {evaluate:e,until}=b;let checks=0;const check=(v,s)=>{assert(v,s);checks++;};
 const sentinel={active:'existing',profiles:{existing:{name:'سجل محفوظ',runs:[],overrides:{},unknown:{preserve:true}}}};
 await e(`localStorage.setItem('seviat-guided-journey-v1',${JSON.stringify(JSON.stringify(sentinel))});localStorage.setItem('seviat-unit1-learning-v2','{"version":2,"attempts":[],"practice":{},"writing":[],"preserve":"unchanged"}');localStorage.setItem('seviat-unit2-practice-v1','{"preserve":"unchanged"}');`);
 const before=await e('JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])))');
 check(await e('document.querySelectorAll("[data-unit]").length===8'),'all eight units visible');
 check(await e('document.getElementById("testing-notice").textContent.includes("غير معتمد")'),'persistent testing notice');
 check(await e('!window.AfaqAdult&&!window.SeviatJourney&&!window.AfaqSpeechCore&&!window.AfaqSpeech.mountTeacher&&!window.AfaqSpeech.update&&!window.AfaqSpeech.recordingSnapshot&&!window.AfaqAudioLibrary.saveClip&&!window.AfaqAudioLibrary.mount&&!window.AfaqAudioManagement'),'no student administrative/edit/review APIs');
 const lessons=await e('AfaqQuestionBankBridge.curriculumLessons()');let mounted=0;const types=new Set();
 for(const lesson of lessons){
  const result=await e(`(async()=>{
   location.hash=new URLSearchParams({unit:${JSON.stringify(String(lesson.unitId))},lesson:${JSON.stringify(lesson.id)}}).toString();
   const wait=async id=>{for(let i=0;i<200;i++){if(document.querySelector('[data-question-id]')?.dataset.questionId===id)return;await new Promise(r=>setTimeout(r,0));}throw Error('question did not mount '+id);};
   const items=AfaqQuestionBankBridge.questionsForLesson(${JSON.stringify(lesson.id)});await wait(items[0].id);
   if(!document.querySelector('h2').textContent.includes(${JSON.stringify(lesson.title)}))throw Error('wrong lesson title');
   for(const q of items){
    await new Promise(r=>setTimeout(r,75));
    const jump=document.getElementById('testing-question-jump');jump.value=q.id;jump.dispatchEvent(new Event('change'));await wait(q.id);
    if(!document.querySelector('.afaq-bank-activity'))throw Error('unsupported '+q.id);
    if(!document.querySelector('.testing-review').textContent.includes('تجريبي'))throw Error('test notice missing');
    if(!document.querySelector('#testing-feedback')||document.querySelector('#testing-feedback').textContent)throw Error('feedback before attempt');
    if((q.stimulus?.visibility==='hidden'||['dictation','teacher-listening','construction'].includes(q.type))&&document.querySelector('.afaq-bank-stimulus'))throw Error('hidden answer disclosed '+q.id);
    if(document.querySelector('details, [data-correct], .answer-key, .teacher-target'))throw Error('teacher answer disclosure');
   }
   return {count:items.length,types:[...new Set(items.map(q=>q.type))]};
  })()`);mounted+=result.count;result.types.forEach(t=>types.add(t));check(result.count>0,'real lesson '+lesson.id);if(lesson.id.endsWith('-l1'))console.log('Testing unit '+lesson.unitId+'; mounted '+mounted);
 }
 check(mounted===1190,'all 1190 questions actually mounted');check(types.size===9,'all nine types rendered');
 // Try one answer per supported type; practical tasks remain observation-only.
 for(const type of [...types]){
  await e(`(async()=>{const q=AfaqQuestionBankBridge.curriculumLessons().flatMap(l=>AfaqQuestionBankBridge.questionsForLesson(l.id)).find(q=>q.type===${JSON.stringify(type)});location.hash=new URLSearchParams({unit:q.unitId,lesson:q.lessonId,question:q.id}).toString();for(let i=0;i<200&&document.querySelector('[data-question-id]')?.dataset.questionId!==q.id;i++)await new Promise(r=>setTimeout(r,0));})()`);
  if(type==='single-choice')await e(`document.querySelector('.afaq-bank-option-row>button').click()`);
  else if(type==='construction')await e(`(()=>{while(document.querySelector('.afaq-bank-word-cards .afaq-bank-option-row>button:not(:disabled)'))document.querySelector('.afaq-bank-word-cards .afaq-bank-option-row>button:not(:disabled)').click();[...document.querySelectorAll('.afaq-bank-controls>button')].find(b=>b.textContent==='تحقق من التركيب').click()})()`);
  else await e(`[...document.querySelectorAll('.afaq-bank-controls>button')].find(b=>b.textContent==='أنهيت النشاط').click()`);
  check(await e('!!document.getElementById("testing-feedback").textContent'),'attempt feedback '+type);
 }
 check(before===await e('JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])))'),'all local storage bytes preserved after 1190 questions and attempts');
 await until(()=>e('!!AfaqSpeech.entry("question-id:activity:single-choice")'),'audio commands');
 await e("location.hash='unit=1&lesson=sa-g1-u1-l1'");await until(()=>e('document.querySelector("[data-question-id]")?.dataset.questionId.includes("u1-l1")'),'audio activity');
 const speechBefore=await e('fixtureSpeechRequests.length');
 await e('AfaqTestingAudio.setMuted(true);document.querySelector(".afaq-bank-listen-instruction").click()');await b.sleep(100);
 check(await e('fixtureSpeechRequests.length')===speechBefore,'mute prevents teaching voice');
 await e('AfaqTestingAudio.setMuted(false);document.querySelector(".afaq-bank-listen-instruction").click()');
 await until(async()=>await e('fixtureSpeechRequests.length')>speechBefore,'instruction voice');
 await until(()=>e('document.querySelector(".afaq-bank-activity").textContent.includes("معاينة صوت آلي")'),'automated preview label');
 check(before===await e('JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])))'),'audio toggles are memory only');
 await e(`location.hash='unit=3&lesson=sa-g1-u3-l1'`);await until(()=>e('document.querySelector("[data-question-id]")?.dataset.questionId.includes("u3-l1")'),'Unit 3 reload route');
 const deepLink=await e('location.href');await b.send('Page.reload');await until(()=>e('document.querySelector("[data-question-id]")?.dataset.questionId.includes("u3-l1")'),'direct deep link refresh');check(await e('location.href')===deepLink,'deep link survives refresh');
 for(const width of [320,390,768,1280]){await b.send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<600});check(await e('document.documentElement.scrollWidth<=innerWidth+1'),'no horizontal overflow '+width);}
 check(await e('getComputedStyle(document.documentElement).direction==="rtl"'),'Arabic RTL');
 await until(()=>e('!!navigator.serviceWorker.controller'),'network-only worker active');check(await e('navigator.serviceWorker.controller.scriptURL.includes("sw.js?v=20261124-testing-3")'),'release cache worker');
 check(await e('(async()=>{const url=new URL("afaq-question-bank-activities.js?v=20261124-testing-3",location.href).href;const cache=await caches.open("afaq-stale-test-fixture");await cache.put(url,new Response("obsolete fixture"));const response=await fetch(url);return (await response.text()).includes("Unsupported question activity")&&!!(await cache.match(url))})()'),'network worker ignores stale cache and preserves cache contents');
 // Public root is a safe student portal; original index.html remains local only.
 await b.send('Page.navigate',{url:new URL('./',deepLink).href});await until(()=>e('!!document.getElementById("student-testing-entry")'),'public student portal');
 check(await e('!!document.getElementById("testing-notice")&&!window.AfaqAdult&&!window.AfaqAudioManagement'),'public root has notice and no owner APIs');
 await e('document.getElementById("student-testing-entry").click()');await until(()=>e('document.querySelectorAll("[data-unit]").length===8'),'portal opens all eight units');
 check(await e('(async()=>{await AfaqQuestionBankBridge.load();return !AfaqQuestionBankBridge.status().enabled&&AfaqQuestionBankBridge.verifiedQuestionsForLesson("sa-g1-u3-l1",{}).length===0})()'),'official bank remains disabled');
 // Negative URL checks verify absence from the served artifact, not just hidden controls.
 const privatePaths=['arabic-speech.js','adult-session.js','afaq-owner-menu.js','afaq-audio-management.js','afaq-audio-library.js','afaq-audio-catalog.js','afaq-smart-audio-ui.js','student-voice.js','tools/review-question.cjs','docs/recording-readiness/recording-inventory.csv'];
 for(const file of privatePaths)check(await e('(async()=>{const r=await fetch('+JSON.stringify(file)+');return r.status===404})()'),'private URL absent '+file);
 check(await e('(()=>{const NativeAudio=window.Audio,seen=[];window.Audio=function(url){const a={url,volume:1,play:()=>Promise.resolve(),pause(){a.paused=true;}};seen.push(a);return a;};try{AfaqTestingAudio.setMuted(true);SeviatEffects.play("correct");if(seen.length)return false;AfaqTestingAudio.setMuted(false);SeviatEffects.play("correct");if(seen.length!==1||!new URL(seen[0].url,location.href).pathname.startsWith("/Seviat-Academy-App/sounds/teacher/")||seen[0].volume!==AfaqTestingAudio.settings().volume)return false;AfaqTestingAudio.setMuted(true);return seen[0].paused===true;}finally{window.Audio=NativeAudio;AfaqTestingAudio.setMuted(false);}})()'),'effects preserve relative path, volume and mute cancellation');
 check(b.errors.length===0,JSON.stringify(b.errors));
 check(b.networkErrors.filter(r=>r.url.startsWith(new URL(deepLink).origin)&&!privatePaths.some(p=>new URL(r.url).pathname.endsWith("/"+p))).length===0,JSON.stringify(b.networkErrors));
 console.log(JSON.stringify({passed:true,checks,questionsMounted:mounted,lessons:lessons.length,types:[...types],basePath:'/Seviat-Academy-App/',artifact:output,browserOutput:b.output,audio:'controlled lifecycle; real recording coverage not asserted'}));
})().catch(async error=>{console.error(error.stack);if(b){console.error(JSON.stringify(b.errors));try{console.error(await b.evaluate('JSON.stringify({hash:location.hash,question:document.querySelector("[data-question-id]")?.dataset.questionId,text:document.getElementById("student-testing").textContent.slice(-1500)})'));}catch{}}process.exitCode=1;}).finally(async()=>{await b?.close();});
