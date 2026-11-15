'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),{spawn}=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,path.basename(path.dirname(__dirname))==='.access-staging'?'../..':'..');
const stage=process.env.SEVIAT_TEST_OUTPUT||path.join(root,'.access-staging'),live=process.argv.includes('--live');
const read=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');
const requests=[],pageErrors=[],consoleErrors=[],clickTrace=[];
let failingPath=null;
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);requests.push(pathname);
 if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}
 if(failingPath===pathname){res.writeHead(503).end('Intentional test failure');return;}
 const relative=pathname==='/'?'index.html':pathname.slice(1);
 const original=path.resolve(root,relative),overlay=path.resolve(stage,relative);
 if(!original.startsWith(root+path.sep)||relative.includes('..')){res.writeHead(403).end();return;}
 const file=!live&&fs.existsSync(overlay)&&fs.statSync(overlay).isFile()?overlay:original;
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2'};
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
});
class CDP {
 constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();this.ready=new Promise((yes,no)=>{this.ws.onopen=yes;this.ws.onerror=no;});this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=this.pending.get(m.id);if(p){this.pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else{if(m.method==='Runtime.exceptionThrown')pageErrors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')consoleErrors.push(m.params.args.map(a=>a.value||a.description).join(' '));}};}
 async send(method,params={}){await this.ready;const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
 async eval(expression){const result=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text+': '+result.exceptionDetails.exception?.description);return result.result.value;}
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){const deadline=Date.now()+15000;while(Date.now()<deadline){if(await fn())return;await sleep(100);}throw Error('Timeout: '+label);}
let browser,cdp,browserEndpoint;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const executable='C:/Program Files/Google/Chrome/Application/chrome.exe';
 const profile=path.join(stage,'browser-profile-'+Date.now());fs.mkdirSync(profile,{recursive:true});
 browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'--window-size=1280,960','about:blank'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 browser.on('exit',(code,signal)=>{console.log('Chrome exit',code,signal);});browser.on('error',e=>{throw e;});let browserLog='';browser.stderr.on('data',chunk=>{browserLog+=chunk;const m=browserLog.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m)browserEndpoint=m[1];});
 try{await until(()=>browserEndpoint,'Chrome start');}catch(error){throw Error(error.message+' '+browserLog);}
 const remote=new URL(browserEndpoint);
 const pages=await (await fetch('http://'+remote.host+'/json/list')).json();cdp=new CDP(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await cdp.send('Runtime.enable');await cdp.send('Page.enable');
 // Supported adult policy keeps the previous manual journey regression scenarios explicit.
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:'if(localStorage.getItem("seviat-child-experience-v1")===null)localStorage.setItem("seviat-child-experience-v1",JSON.stringify({version:1,autoPlacement:false,autoContinue:false,retentionDays:7}));'});

 const legacyValue=JSON.stringify({score:70,answeredQuestions:['meem-vowel-01','retired-question'],customField:'preserve-me'});
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`if (!localStorage.getItem('seviatLearningProgress')) localStorage.setItem('seviatLearningProgress', ${JSON.stringify(legacyValue)});`});
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:"document.addEventListener('DOMContentLoaded',()=>window.SeviatJourney?.teacher());"});
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:'if(localStorage.getItem("seviat-interaction-preferences-v1")===null)localStorage.setItem("seviat-interaction-preferences-v1",JSON.stringify({version:1,autoAdvance:false,animations:false}));'});
 await cdp.send('Page.navigate',{url});
 await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready===true'),'app initialization');
 await cdp.eval("localStorage.removeItem('seviat-unit1-learning-v2');localStorage.setItem('seviatEffectsEnabled','true')");
 await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready===true'),'fresh state');
 assert.equal(await cdp.eval('questionsData.questions.length'),384);
 assert.equal(await cdp.eval('questionsData.legacyQuestions.length'),255);
 assert.equal(await cdp.eval('new Set(questionsData.questions.map(q=>q.id)).size'),384);
 const click=async selector=>{
 let point,prior;await until(async()=>{const hit=await cdp.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)return null;e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,width:r.width,height:r.height,hit:!!e.contains(document.elementFromPoint(x,y))};})()`);if(!hit||!hit.width||!hit.height||!hit.hit){prior=null;return false;}const stable=prior&&Math.abs(prior.x-hit.x)<.5&&Math.abs(prior.y-hit.y)<.5;prior=hit;point={x:hit.x,y:hit.y};return stable;},'stable unobstructed click '+selector);
 clickTrace.push({selector,point});await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
 if(selector==='#seviat-menu-button')await sleep(350);
 };
  const G='seviat-access-policy-v2',S='seviat-unit1-learning-v2';
 const reload=async()=>{await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready===true'),'reload');};
 const getState=()=>cdp.eval("JSON.parse(localStorage.getItem('seviat-unit1-learning-v2'))");
 const setPolicy=async policy=>{await cdp.eval("localStorage.setItem("+JSON.stringify(G)+","+JSON.stringify(JSON.stringify(policy))+");window.dispatchEvent(new CustomEvent('seviat-access-changed'))");};
 const all={version:2,coarse:{mode:'all',allowed:[]},detailed:{mode:'all',allowed:[]}};
 await setPolicy(all);
 await cdp.eval("localStorage.setItem('seviat-parent-pin-v1','123456')");
 const login=async()=>{if(await cdp.eval("document.querySelector('#seviat-parent-panel').open && !!document.querySelector('#seviat-parent-pin')")){await cdp.eval("document.querySelector('#seviat-parent-pin').value='123456'");await click('#seviat-parent-login');}};
 const letters=async()=>click('[data-stage="letters"]');
 await letters();assert.equal(await cdp.eval("document.querySelector('#u1-letter-1').disabled"),false);
 await cdp.eval("Unit1Learning.openSkill('ب','letter-name')");
 assert.equal(await cdp.eval("!!document.querySelector('#u1-options')"),false);
 await letters();await click('#u1-letter-0');await click('#u1-skill-letter-name');await click('#u1-start-practice');
 const id=await cdp.eval("document.querySelector('#activityArea').dataset.questionId");
 async function answer(correct=true){
   if(await cdp.eval("!!document.querySelector('#u1-teacher-read')")){
    await click('#activityArea details summary');await login();await click('#u1-teacher-read');
   }
   const index=await cdp.eval("(()=>{const q=questionsData.questions.find(q=>q.id===document.querySelector('#activityArea').dataset.questionId);return [...document.querySelectorAll('#u1-options button')].findIndex(b=>"+(correct?"b.dataset.answerValue===q.answer":"b.dataset.answerValue!==q.answer")+")})()");
   await click('#u1-options button:nth-child('+(index+1)+')');
 }
 await answer(false);
 assert.equal(await cdp.eval("document.querySelector('#activityArea').dataset.questionId"),id);
 assert.equal((await getState())?.attempts.length||0,0);
 await answer(true);
 const stored=await getState();assert.equal(stored.practiceHistory.at(-1).retries,1);
 await sleep(700);assert.equal(await cdp.eval("document.querySelector('#activityArea').dataset.questionId"),id);
 await until(()=>cdp.eval("document.querySelector('#activityArea').dataset.questionId!=="+JSON.stringify(id)),'automatic next');
 assert.equal(await cdp.eval("document.querySelector('#u1-feedback').textContent"),'اختر الإجابة الصحيحة.');
 await click('#u1-cancel');
 // Cancelled transition must not replace another screen.
 await click('#u1-start-practice');await answer(true);await click('#u1-cancel');await sleep(2200);assert(await cdp.eval("!!document.querySelector('#u1-start-practice')"));
 // Actual short assessment: one wrong answer remains wrong; no retry scoring.
 await click('#u1-start-assessment');
 for(let i=0;i<5;i++){const old=await cdp.eval("document.querySelector('#activityArea').dataset.questionId");await answer(i!==0);await until(()=>cdp.eval("!document.querySelector('#u1-options')||document.querySelector('#activityArea').dataset.questionId!=="+JSON.stringify(old)),'assessment next');}
 assert.equal((await getState()).attempts[0].results.filter(r=>r.correct).length,4);
 assert.equal((await getState()).attempts.length,1);
 await click('#u1-finish-back');await click('#u1-skill-letter-shape');assert.equal(await cdp.eval("document.querySelector('#u1-start-assessment').disabled"),false);
 await reload();await letters();await click('#u1-letter-0');await click('#u1-skill-letter-shape');assert.equal(await cdp.eval("document.querySelector('#u1-start-assessment').disabled"),false);
 assert.equal(await cdp.eval("localStorage.getItem('seviatLearningProgress')"),legacyValue);
 // Practice and assessment policies are independent, including direct entry.
 await setPolicy({...all,detailed:{mode:'custom',allowed:['unit-1/م/short-vowels/fatha/practice']}});
 await letters();await click('#u1-letter-0');await click('#u1-skill-short-vowels');
 assert.equal(await cdp.eval("document.querySelector('#u1-start-assessment').disabled"),true);
 assert.equal(await cdp.eval("[...document.querySelector('#u1-subskill').options].map(x=>x.value).join(',')"),'all,fatha');
 await click('#u1-start-practice');
 for(let i=0;i<2;i++){assert.equal(await cdp.eval("SeviatAccessGuard.subskill(questionsData.questions.find(q=>q.id===document.querySelector('#activityArea').dataset.questionId))"),'fatha');const old=await cdp.eval("document.querySelector('#activityArea').dataset.questionId");await answer();await until(()=>cdp.eval("!document.querySelector('#u1-options')||document.querySelector('#activityArea').dataset.questionId!=="+JSON.stringify(old)),'filtered next');}
 assert.equal((await getState()).attempts.length,1);
 await cdp.eval("Unit1Learning.openWriting('م','letter-writing')");assert.equal(await cdp.eval("!!document.querySelector('#u1-writing-0-0')"),false);
 await cdp.eval("openWritingBoard('م')");assert.equal(await cdp.eval("document.querySelectorAll('canvas').length"),0);
 await setPolicy({...all,detailed:{mode:'custom',allowed:['unit-1/م/letter-name/all/assessment']}});
 await letters();await click('#u1-letter-0');await click('#u1-skill-letter-name');
 assert.equal(await cdp.eval("document.querySelector('#u1-start-practice').disabled"),true);
 assert.equal(await cdp.eval("document.querySelector('#u1-start-assessment').disabled"),false);
 await click('#u1-start-assessment');await setPolicy({...all,coarse:{mode:'custom',allowed:[]}});
 assert.equal(await cdp.eval("!!document.querySelector('#u1-options')"),false);
 assert.equal((await getState()).attempts.length,1);
 for(const entry of ["openPreparation()","openVisualLevels()","openMemoryLevels()","openAuditoryLevels()","SeviatExtraGames.openLevels('attention')","openWritingBoard('م')"]){await cdp.eval(entry);assert.equal(await cdp.eval("document.querySelectorAll('#activityArea canvas').length"),0);assert(await cdp.eval("document.querySelector('#activityArea').innerText.includes('غير متاح')"));}
 // Actual settings login, cancel, detailed save, and round trip.
 await click('#seviat-menu-button');await cdp.eval('Promise.all(document.querySelector("#seviat-sidebar").getAnimations().map(a=>a.finished.catch(()=>{})))');await click('#afaq-menu-teacher');await click('#afaq-tab-advanced');await click('#afaq-access-settings');await login();
 await click('#seviat-allow-all');await click('#seviat-open-access-tree');await until(()=>cdp.eval("!!document.querySelector('#seviat-access-tree')"),'tree');
 await cdp.eval("(()=>{const i=[...document.querySelectorAll('[data-access-id]')].find(i=>i.dataset.accessId==='unit-1/ب/short-vowels/kasra/practice');i.checked=false;})()");
 await click('#seviat-save-access');
 assert.equal(await cdp.eval("SeviatAccessGuard.isAllowed('ب','short-vowels','kasra','practice')"),false);
 assert.equal(await cdp.eval("SeviatAccessGuard.isAllowed('ب','short-vowels','fatha','practice')"),true);
 await reload();assert.equal(await cdp.eval("SeviatAccessGuard.isAllowed('ب','short-vowels','kasra','practice')"),false);
 const policyBefore=await cdp.eval("localStorage.getItem('"+G+"')");
 await click('#seviat-menu-button');await cdp.eval('Promise.all(document.querySelector("#seviat-sidebar").getAnimations().map(a=>a.finished.catch(()=>{})))');await click('#afaq-menu-teacher');await click('#afaq-tab-advanced');await click('#afaq-access-settings');await login();await click('#seviat-deny-all');await click('#seviat-parent-cancel');
 assert.equal(await cdp.eval("localStorage.getItem('"+G+"')"),policyBefore);
 // Corrupt policy fails closed without replacing its bytes or progress.
 const progressBefore=await cdp.eval("localStorage.getItem('"+S+"')");
 await cdp.eval("localStorage.setItem('"+G+"','broken')");await reload();
 assert.equal(await cdp.eval("SeviatAccessGuard.isAllowed('م','letter-name','all','practice')"),false);
 assert.equal(await cdp.eval("localStorage.getItem('"+G+"')"),'broken');
 assert.equal(await cdp.eval("localStorage.getItem('"+S+"')"),progressBefore);
 await setPolicy(all);
 // Fully passed fixture is isolated to this temporary Chrome profile.
 await cdp.eval("(()=>{const R=Unit1Rules,s=JSON.parse(localStorage.getItem('"+S+"'));for(const l of R.letters)for(const skill of R.coreSkills){const pool=questionsData.questions.filter(q=>q.letter===l&&q.skill===skill&&q.phase==='training').slice(0,5);s.attempts.push({id:crypto.randomUUID(),key:R.stateKey(l,skill),mode:'assessment',completedAt:Date.now(),results:pool.map(q=>({id:q.id,answer:q.answer,correct:true}))});}localStorage.setItem('"+S+"',JSON.stringify(s));})()");
 await reload();
 for(let l=0;l<6;l++){await letters();await click('#u1-letter-'+l);for(const skill of await cdp.eval('Unit1Rules.coreSkills')){await click('#u1-skill-'+skill);await click('#u1-start-practice');assert(await cdp.eval("!!document.querySelector('#u1-options')"));await click('#u1-cancel');await click('#u1-back-skills');}}
 await click('#u1-writing');await click('#activityArea details summary');await login();await click('#u1-writing-0-0');await click('#u1-writing-confirm-0');const beforeWrite=(await getState()).attempts.length;await click('#u1-save-writing-0');assert.equal((await getState()).writing.length,1);assert.equal((await getState()).attempts.length,beforeWrite);
 await click('#u1-free-board');assert(await cdp.eval("!!document.querySelector('canvas')"));
 await letters();await click('#u1-cumulative');await click('#u1-review-read-0');await click('#u1-start-practice');assert(await cdp.eval("!!document.querySelector('#u1-teacher-read')"));await click('#u1-cancel');
 for(const entry of ['openPreparation()','openVisualLevels()','openMemoryLevels()','openAuditoryLevels()', "SeviatExtraGames.openLevels('attention')"]){await cdp.eval(entry);assert(await cdp.eval("document.querySelector('#activityArea').querySelectorAll('button').length>1"));}
 const qualityChecks=await require('./quality-browser-checks.cjs')({cdp,click,sleep,until,answer,reload,getState,letters});
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await letters();assert.equal(await cdp.eval('document.documentElement.scrollWidth<=window.innerWidth'),true);
 assert.equal(pageErrors.length,0,JSON.stringify(pageErrors));assert.equal(consoleErrors.length,0,consoleErrors.join('\n'));
 const result={passed:true,mode:live?'live':'staged',checks:['384 questions and 255 historical records','practice retry and 2s auto transition','cancelled timer','4/5 immediate unlock and reload','filtered fatha pool','assessment-only permission','writing and public entrypoint denial','mid-session revocation','actual parent login/save/cancel/reload','corrupt policy preserved and denied','legacy progress preserved','60 core skill screens','writing teacher review and board','cumulative reading screen','5 preparation menus','390px RTL layout'],pageErrors:0,qualityChecks};
 const crypto=require('crypto');const files=JSON.parse(read(path.join(stage,'changed-files.json')));
 result.testedHashes=Object.fromEntries(files.filter(f=>!f.endsWith('.md')).map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(live?root:stage,f))).digest('hex')]));
 fs.writeFileSync(path.join(stage,'access-click-trace.json'),JSON.stringify(clickTrace,null,2),{flag:'wx'});fs.writeFileSync(path.join(stage,live?'access-browser-live.json':'access-browser.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(async error=>{console.error(error.stack);process.exitCode=1;try{const snapshot=cdp?await cdp.eval('({mode:document.body.dataset.mode,text:document.body.innerText,question:document.querySelector("#activityArea")?.dataset.questionId})'):null;fs.writeFileSync(path.join(stage,'access-failure-context.json'),JSON.stringify({error:error.stack,clickTrace,pageErrors,consoleErrors,snapshot},null,2),{flag:'wx'});}catch{}}).finally(async()=>{try{if(cdp)await Promise.race([cdp.send('Browser.close'),sleep(2000)]); /* Chrome may exit before acknowledging close; preserve assertion exit status. */}catch{}if(cdp)cdp.ws.close();if(browser&&!browser.killed)browser.kill();server.close();setTimeout(()=>process.exit(process.exitCode||0),300).unref();});
