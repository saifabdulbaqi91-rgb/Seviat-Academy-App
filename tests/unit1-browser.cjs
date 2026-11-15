'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),{spawn}=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,path.basename(path.dirname(__dirname))==='.unit1-staging'?'../..':'..');
const stage=process.env.SEVIAT_TEST_OUTPUT||path.join(root,'.unit1-staging'),live=process.argv.includes('--live');
const read=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');
const requests=[],pageErrors=[],consoleErrors=[];
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
 const profile=path.join(stage,live?'browser-profile-live':'browser-profile');fs.mkdirSync(profile,{recursive:true});
 browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'--window-size=1280,960','about:blank'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 browser.on('error',e=>{throw e;});let browserLog='';browser.stderr.on('data',chunk=>{browserLog+=chunk;const m=browserLog.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m)browserEndpoint=m[1];});
 await until(()=>browserEndpoint,'Chrome start');
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
 const curriculum=JSON.parse(read(path.join(root,'data/unit1-reviewed.json')));
 assert.equal(await cdp.eval('questionsData.questions.length'),curriculum.questions.length);
 assert.equal(await cdp.eval('new Set(questionsData.questions.map(q=>q.id)).size'),curriculum.questions.length);
 assert.equal(await cdp.eval('questionsData.legacyQuestions.length'),255);
 assert.equal(await cdp.eval('Unit1Rules.validate(questionsData.questions)'),true);
 const click=async selector=>{assert(await cdp.eval('!!document.querySelector('+JSON.stringify(selector)+')'),'Missing '+selector);await cdp.eval('document.querySelector('+JSON.stringify(selector)+').click()');};
 const loginIfNeeded=async()=>{if(await cdp.eval("!!document.querySelector('#seviat-parent-pin')")){await cdp.eval("document.querySelector('#seviat-parent-pin').value='123456'");await click('#seviat-parent-login');return true;}return false;};
 const getState=()=>cdp.eval("JSON.parse(localStorage.getItem('seviat-unit1-learning-v2'))");
 const open=async(l,skill,phase='training')=>cdp.eval('Unit1Learning.openSkill('+JSON.stringify(l)+','+JSON.stringify(skill)+','+JSON.stringify(phase)+')');
 const answerAll=async(oneWrong=false)=>{let count=0;while(await cdp.eval("!!document.querySelector('#u1-options')")){
  if(await cdp.eval("!!document.querySelector('#u1-teacher-read')")){await cdp.eval("document.querySelector('#u1-teacher-read').closest('details').open=true");await click('#u1-teacher-read');}
  const oldId=await cdp.eval("document.querySelector('#activityArea').dataset.questionId");
  const index=await cdp.eval("(()=>{const q=questionsData.questions.find(q=>q.id===document.querySelector('#activityArea').dataset.questionId);return [...document.querySelectorAll('#u1-options button')].findIndex(b=>b.dataset.answerValue"+(oneWrong&&count===0?'!==':'===')+"q.answer);})()");
  assert(index>=0);await click('#u1-options button:nth-child('+(index+1)+')');
  await until(()=>cdp.eval("!document.querySelector('#u1-options')||document.querySelector('#activityArea').dataset.questionId!=="+JSON.stringify(oldId)),'automatic question progression');
  if(++count>8)throw Error('Quiz loop');
 }return count;};
 // Teacher navigation is deliberately independent of learner mastery.
 await cdp.eval("localStorage.setItem('seviat-parent-pin-v1','123456')");
 await open('ب','letter-shape');assert.equal(await cdp.eval("document.querySelector('#u1-start-practice').disabled"),false);
 await open('م','letter-name');await click('#u1-start-practice');assert.equal(await answerAll(),5);assert.equal((await getState()).attempts.length,0);
 await open('م','letter-name');await click('#u1-start-assessment');assert.equal(await answerAll(true),5);
 let state=await getState();assert.equal(state.attempts.length,1);assert.equal(state.attempts[0].results.filter(r=>r.correct).length,4);assert.equal(state.attempts[0].teacherConfirmed,false);
 await cdp.eval("document.querySelector('#u1-save-attempt').closest('details').open=true");await click('#u1-independent');await click('#u1-confirmed');await click('#u1-save-attempt');
 await until(()=>cdp.eval("!!document.querySelector('#seviat-parent-pin')"),'teacher login');
 await cdp.eval("document.querySelector('#seviat-parent-pin').value='123456'");await click('#seviat-parent-login');await click('#u1-save-attempt');
 assert.equal((await getState()).confirmations.length,1);assert.equal((await getState()).attempts.length,1);
 assert.equal(await cdp.eval("Unit1Rules.mastered(JSON.parse(localStorage.getItem('seviat-unit1-learning-v2')),'م','letter-name')"),false);
 await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready'),'saved reload');assert.equal((await getState()).attempts.length,1);assert.equal((await getState()).confirmations.length,1);
 // Shift only the isolated fixture; then prove spaced review can confirm mastery.
 await cdp.eval("(()=>{const s=JSON.parse(localStorage.getItem('seviat-unit1-learning-v2'));s.attempts[0].completedAt-=86400001;localStorage.setItem('seviat-unit1-learning-v2',JSON.stringify(s));})()");
 await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready'),'spaced fixture');await open('م','letter-name');await click('#u1-start-assessment');assert.equal(await answerAll(),5);
 await cdp.eval("document.querySelector('#u1-save-attempt').closest('details').open=true");await click('#u1-independent');await click('#u1-confirmed');await click('#u1-save-attempt');
 if(await loginIfNeeded())await click('#u1-save-attempt');
 assert.equal(await cdp.eval("Unit1Rules.mastered(JSON.parse(localStorage.getItem('seviat-unit1-learning-v2')),'م','letter-name')"),true);
 // Traverse all original core and cumulative screens on a passed fixture.
 await cdp.eval("(()=>{const R=Unit1Rules,s=JSON.parse(localStorage.getItem('seviat-unit1-learning-v2'));for(const l of R.letters)for(const skill of R.coreSkills){const pool=questionsData.questions.filter(q=>q.letter===l&&q.skill===skill&&q.phase==='training').slice(0,5);s.attempts.push({id:crypto.randomUUID(),key:R.stateKey(l,skill),mode:'assessment',completedAt:Date.now(),results:pool.map(q=>({id:q.id,answer:q.answer,correct:true}))});}localStorage.setItem('seviat-unit1-learning-v2',JSON.stringify(s));})()");
 await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready'),'passed fixture');
 for(const l of curriculum.letters)for(const skill of await cdp.eval('Unit1Rules.coreSkills')){await open(l,skill);await click('#u1-start-practice');assert(await cdp.eval("!!document.querySelector('#u1-options')"));await click('#u1-cancel');}
 for(const l of curriculum.letters)for(const skill of ['word-reading','letter-detection']){const expected=curriculum.questions.filter(q=>q.letter===l&&q.skill===skill&&q.phase==='cumulative').length;await open(l,skill,'cumulative');await click('#u1-start-practice');assert.equal(await answerAll(),expected);}
 await cdp.eval("Unit1Learning.openWriting('م','letter-writing')");const beforeWriting=(await getState()).attempts.length;
 await cdp.eval("document.querySelector('#u1-save-writing-0').closest('details').open=true");await click('#u1-writing-0-0');await click('#u1-writing-confirm-0');await click('#u1-save-writing-0');if(await loginIfNeeded())await click('#u1-save-writing-0');assert.equal((await getState()).writing.length,1);assert.equal((await getState()).attempts.length,beforeWriting);
 await cdp.eval("Unit1Learning.openWriting('د','letter-writing')");await click('#u1-free-board');assert(await cdp.eval("!!document.querySelector('canvas')"));
 const shapes=await cdp.eval("document.querySelector('#activityArea').textContent");assert(!shapes.includes('وسط الكلمة'));assert(!shapes.includes('أول الكلمة'));
 await cdp.eval('SeviatEffects.setEnabled(false)');await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready'),'muted reload');assert.equal(await cdp.eval('SeviatEffects.isEnabled()'),false);
 assert.equal(await cdp.eval("localStorage.getItem('seviatLearningProgress')"),legacyValue);
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await cdp.eval('document.documentElement.scrollWidth<=innerWidth'),true);
 fs.writeFileSync(path.join(stage,'unit1-live-mobile.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png'})).data,'base64'),{flag:'wx'});await cdp.send('Emulation.clearDeviceMetricsOverride');
 assert.equal(pageErrors.length,0,JSON.stringify(pageErrors));assert.equal(consoleErrors.length,0,JSON.stringify(consoleErrors));
 // Failed fetch must never leave activities marked ready. This failure is intentional.
 failingPath='/data/unit1-reviewed.json';await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload');
 await until(()=>cdp.eval("document.body?.innerText?.includes('تعذر تحميل المنهج')"),'load error screen');
 assert.equal(await cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready'),false);
 failingPath=null;consoleErrors.length=0;await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready===true'),'recovery after failed fetch');
 assert.equal(await cdp.eval("localStorage.getItem('seviatLearningProgress')"),legacyValue);
 const jsonRequests=[...new Set(requests.filter(p=>p.endsWith('.json')))];assert(jsonRequests.includes('/data/unit1-reviewed.json'));assert.equal(jsonRequests.length,7);
 const result={passed:true,mode:live?'live':'staged',activeQuestions:curriculum.questions.length,legacyRecords:255,skillScreensTraversed:60,cumulativeSessions:12,checks:['current curriculum validation','practice not assessment','4/5 auto save','teacher confirmation separate','spaced review mastery','all core screens','cumulative reading and detection','separate writing','non-joining board','mute persistence','390px layout','failed fetch and recovery','legacy preserved'],pageErrors:pageErrors.length};
 const crypto=require('crypto');
 const deployFiles=['sounds/effects.js','.gitignore','app.js','index.html','group1-engine.js','group1-extra-loader.js','writing-board.js','data/skills.json','unit1-rules.js','unit1-learning.js','data/unit1-reviewed.json','data/unit1-legacy-audit.json','tests/unit1-check.cjs','tests/unit1-browser.cjs'];
 result.testedHashes=Object.fromEntries(deployFiles.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(live?root:stage,f))).digest('hex')]));
 fs.writeFileSync(path.join(stage,live?'browser-live-results.json':'browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{try{if(cdp)await Promise.race([cdp.send('Browser.close'),sleep(2000)]); /* Chrome may exit before acknowledging close; preserve assertion exit status. */}catch{}if(cdp)cdp.ws.close();if(browser&&!browser.killed)browser.kill();server.close();setTimeout(()=>process.exit(process.exitCode||0),300).unref();});