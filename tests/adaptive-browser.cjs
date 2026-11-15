'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),{spawn}=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,path.basename(path.dirname(__dirname))==='.access-staging'?'../..':'..');
const stage=process.env.SEVIAT_TEST_OUTPUT||path.join(root,'.access-staging'),live=process.argv.includes('--live');
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
 const profile=path.join(stage,'browser-profile-'+Date.now());fs.mkdirSync(profile,{recursive:true});
 browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'--window-size=1280,960','about:blank'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 browser.on('exit',(code,signal)=>{console.log('Chrome exit',code,signal);});browser.on('error',e=>{throw e;});let browserLog='';browser.stderr.on('data',chunk=>{browserLog+=chunk;const m=browserLog.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m)browserEndpoint=m[1];});
 try{await until(()=>browserEndpoint,'Chrome start');}catch(error){throw Error(error.message+' '+browserLog);}
 const remote=new URL(browserEndpoint);
 const pages=await (await fetch('http://'+remote.host+'/json/list')).json();cdp=new CDP(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await cdp.send('Runtime.enable');await cdp.send('Page.enable');
 // Supported adult policy keeps the previous manual journey regression scenarios explicit.
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:'if(localStorage.getItem("seviat-child-experience-v1")===null)localStorage.setItem("seviat-child-experience-v1",JSON.stringify({version:1,autoPlacement:false,autoContinue:false,retentionDays:7}));'});



 const preserved={
  'seviat-unit1-learning-v2':JSON.stringify({version:2,attempts:[],practice:{},writing:[],marker:'unit1-preserved'}),
  'seviat-unit2-practice-v1':JSON.stringify({'ص:shape':{attempts:2,correct:8,total:12}}),
  'seviatLearningProgress':JSON.stringify({score:31,answeredQuestions:['old-question'],custom:'preserve'}),
  'seviat-sound-preferences-v1':JSON.stringify({buttons:false,feedback:false})
 };
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:'for(const [key,value] of Object.entries('+JSON.stringify(preserved)+'))if(localStorage.getItem(key)===null)localStorage.setItem(key,value);'});
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:'if(localStorage.getItem("seviat-interaction-preferences-v1")===null)localStorage.setItem("seviat-interaction-preferences-v1",JSON.stringify({version:1,autoAdvance:false,animations:false}));'});
 await cdp.send('Page.navigate',{url});await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready&&window.SeviatJourney&&window.SeviatAdaptive'),'ready');
 const click=async selector=>cdp.eval('document.querySelector('+JSON.stringify(selector)+').click()');
 const answer=async(correct=true)=>{
  const expected=await cdp.eval("(()=>{const id=document.querySelector('#journey').dataset.questionId;const base=questionsData.questions.find(q=>q.id===id);const extra=SeviatJourneyRules.nodes.flatMap(n=>SeviatAdaptiveActivities.questions(n)).find(q=>q.id===id);let unit2=null;const node=SeviatJourneyRules.nodes.find(n=>n.unit===2&&id.startsWith(n.id+'-'));if(node){const map={'letter-shape':'shape','short-vowels':'vowels',sukoon:'sukoon','long-vowels':'madd','letter-positions':'position','syllable-building':'syllable'};unit2=SeviatUnit2.questions(node.letter,map[node.skill])[Number(id.slice(node.id.length+1))];}return base?.answer||extra?.answer||unit2?.answer||document.querySelector('#journey .journey-model')?.textContent;})()");
  assert(expected,'a rendered question must expose its content');
  await cdp.eval("[...document.querySelectorAll('#journey .journey-options button')].find(b=>b.textContent"+(correct?'===':'!==')+JSON.stringify(expected)+").click()");await click('#journey-next');
 };
 const session=async(count,wrong=[])=>{await click('#journey-next');if(await cdp.eval("document.querySelector('#journey h2').textContent==='نجرب معًا'"))await answer();if(count===null)count=await cdp.eval("document.querySelector('#journey progress').max");for(let i=0;i<count;i++)await answer(!wrong.includes(i));};
 await click('#journey-start');await session(5);
 assert.equal(await cdp.eval("SeviatJourney.getState().runs.at(-1).mode"),'practice');
 await click('#journey-next');await session(5);
 assert.equal(await cdp.eval("SeviatJourney.getState().runs.at(-1).mode"),'assessment');
 assert.equal(await cdp.eval("SeviatAdaptive.mastery(SeviatJourney.getState(),'prep:matching').status"),'progress-ready');
 await click('#journey-next');assert.equal(await cdp.eval("document.querySelector('#journey h2').textContent"),'لنكتشف ما تعرفه');await session(3);
 assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).results.length'),3);
 assert.equal(await cdp.eval("SeviatAdaptive.mastery(SeviatJourney.getState(),'م:letter-shape').status"),'learning');
 const count=await cdp.eval('SeviatJourney.getState().runs.length');await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready&&window.SeviatJourney'),'reload');assert.equal(await cdp.eval('SeviatJourney.getState().runs.length'),count);
 for(const [key,value]of Object.entries(preserved))assert.equal(await cdp.eval('localStorage.getItem('+JSON.stringify(key)+')'),value,key);
 // Every fixture and storage write below belongs to this isolated test browser.
 const seed=async(profile)=>{await cdp.eval('localStorage.setItem("seviat-guided-journey-v1",'+JSON.stringify(JSON.stringify({active:'test',profiles:{test:{name:'اختبار',overrides:{},runs:[],...profile}},unknownLegacyField:'retained'}))+')');await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready&&window.SeviatJourney'),'fixture reload');};
 const failed=Array.from({length:5},(_,i)=>({id:'matching-'+i,correct:i>2,verified:true}));
 await seed({runs:[{id:'prior-failure',node:'prep:matching',mode:'practice',evidenceVersion:2,independent:true,completedAt:Date.now()-1000,results:failed}]});
 await click('#journey-start');await click('#journey-next');assert.equal(await cdp.eval("document.querySelectorAll('#journey .journey-options button').length"),2);await answer();for(let i=0;i<5;i++)await answer();
 assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).independent'),false);
 assert.equal(await cdp.eval('JSON.parse(localStorage.getItem("seviat-guided-journey-v1")).unknownLegacyField'),'retained');
 await click('#journey-next');await click('#journey-next');assert.equal(await cdp.eval("document.querySelectorAll('#journey .journey-options button').length"),3);

 // Explicit learner journeys in the real isolated Chrome page.
 const successfulMatching=(id,time)=>({id,node:'prep:matching',mode:'assessment',evidenceVersion:2,independent:true,completedAt:time,results:Array.from({length:5},(_,i)=>({id:'matching-'+i,taskKey:'matching-'+i,correct:true,verified:true}))});
 const returningRuns=[successfulMatching('old-1',Date.now()-12*86400000),successfulMatching('old-2',Date.now()-10*86400000)];
 await seed({runs:returningRuns});
 assert.equal(await cdp.eval('SeviatJourney.recommend().reason'),'spaced-review');
 assert.equal(await cdp.eval('SeviatJourney.recommend().nodeId'),'prep:matching');
 assert.equal(await cdp.eval("document.querySelector('#journey-start').textContent"),'تابع رحلتي');
 await click('#journey-start');await session(5);assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).node'),'prep:matching');
 const savedReturning=await cdp.eval('SeviatJourney.getState().runs.length');await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready&&window.SeviatJourney'),'returning reload');assert.equal(await cdp.eval('SeviatJourney.getState().runs.length'),savedReturning);
 assert.notEqual(await cdp.eval('SeviatJourney.recommend().reason'),'spaced-review');
 // Recent repeated success should progress, not repeat an already ready skill.
 await seed({runs:[successfulMatching('fast-1',Date.now()-10000),successfulMatching('fast-2',Date.now()-5000)]});
 assert.equal(await cdp.eval('SeviatJourney.recommend().nodeId'),'م:letter-shape');
 await click('#journey-start');await session(3);assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).mode'),'diagnostic');
 await click('#journey-next');await session(null);
 // A short optional game can be recommended for variety between repeated letter sessions.
 await click('#journey-next');
 if(await cdp.eval("SeviatJourney.recommend().reason==='varied-practice'")){await cdp.eval('SeviatJourney.home()');await click('#journey-start');}
 await session(null);
 assert.equal(await cdp.eval("SeviatAdaptive.progressReady(SeviatJourney.getState(),'م:letter-shape')"),true);
 await click('#journey-next');assert.notEqual(await cdp.eval('SeviatJourney.recommend().nodeId'),'م:letter-shape');
 // Repeated actual mistakes trigger support and cannot certify mastery.
 await seed({});await click('#journey-start');await session(5,[0,1,2,3,4]);await click('#journey-next');await session(5,[0,1,2,3,4]);
 assert.equal(await cdp.eval('SeviatJourney.recommend().difficulty'),'supported');
 assert.equal(await cdp.eval("SeviatAdaptive.progressReady(SeviatJourney.getState(),'prep:matching')"),false);
 assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).independent'),false);
 // Assign a specific independent homework through the teacher UI and persist it.
 await seed({});await cdp.eval('SeviatJourney.teacher()');
 await cdp.eval("[...document.querySelectorAll('#teacherHub select')].find(s=>[...s.options].some(o=>o.value==='prep:matching')).value='prep:matching'");
 await cdp.eval("[...document.querySelectorAll('#teacherHub button')].find(b=>b.textContent==='تعيين واجب').click()");
 await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready&&window.SeviatJourney'),'homework reload');
 assert.equal(await cdp.eval('SeviatJourney.recommend().reason'),'teacher-assignment');
 await click('#journey-start');await session(5);await click('#journey-next');await session(5);
 assert.equal(await cdp.eval('SeviatJourney.getState().homework'),undefined);
 await cdp.eval('SeviatJourney.home()');await click('#journey-start');assert.notEqual(await cdp.eval('SeviatJourney.recommend().nodeId'),'prep:matching');
 const known={};for(const l of ['م','ب','ل','د','ن','ر']){known[l+':letter-shape']='allow';known[l+':syllable-building']='allow';known[l+':long-vowels']='allow';}
 await seed({overrides:known,homework:'ص:letter-shape'});await click('#journey-start');await click('#journey-next');
 const options=await cdp.eval("[...document.querySelectorAll('#journey .journey-options button')].map(b=>b.textContent)");assert(options.length>1);assert(options.every(value=>![...value].some(c=>'فسقتح'.includes(c))),'future Unit 2 letters must not be distractors');
 await cdp.eval('SeviatJourney.teacher()');assert.equal(await cdp.eval("!!document.querySelector('.adaptive-report')"),true);await cdp.eval("SeviatJourney.begin('ح:letter-shape',true)");assert.equal(await cdp.eval("document.querySelector('#journey h2').textContent"),'هيا نكتشف');
 await seed({overrides:known,homework:'word-game:1'});await click('#journey-start');assert.equal(await cdp.eval("document.querySelector('#journey').textContent.includes('ركّب الكلمة')"),false);
 await seed({overrides:known,homework:'word-game:1',studiedWords:['مَالْ','رَمْلْ','مَنَارْ','بَابْ','لَبَنْ','بَلَدْ','دَارْ','نَارْ','مِنْبَرْ']});await click('#journey-start');await click('#journey-next');assert(await cdp.eval("document.querySelector('#journey h3').textContent.includes('ركّب الكلمة')"));
 const letters=await cdp.eval("document.querySelector('#journey .journey-model').textContent");assert(![...letters].some(c=>'صفسقتحكج'.includes(c)));
 await seed({overrides:known,homework:'م:letter-sound'});await click('#journey-start');await session(null);assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).independent'),false);assert.equal(await cdp.eval('SeviatJourney.getState().homework'),undefined);assert.equal(await cdp.eval('SeviatJourney.getState().homeworkSubmissions.at(-1).verified'),false);assert.notEqual(await cdp.eval("SeviatAdaptive.mastery(SeviatJourney.getState(),'م:letter-sound').status"),'confirmed');

 const coreNodes=await cdp.eval('SeviatJourneyRules.nodes.filter(n=>!n.optional).map(n=>n.id)');
 for(const id of ['م:short-vowels','م:sukoon','م:long-vowels','م:sound-analysis','ص:sukoon','ص:long-vowels','ص:syllable-building','ص:letter-positions']){
  const prerequisites=Object.fromEntries(coreNodes.slice(0,coreNodes.indexOf(id)).map(key=>[key,'allow']));await seed({overrides:prerequisites,homework:id});await click('#journey-start');await session(5);assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).results.every(r=>r.verified)'),true,id);await click('#journey-next');await session(5);assert.equal(await cdp.eval('SeviatAdaptive.progressReady(SeviatJourney.getState(),'+JSON.stringify(id)+')'),true,id);
 }
 await seed({});await click('#journey-start');await click('#journey-next');await answer();
 await cdp.eval("window.originalAdaptiveSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='seviat-guided-journey-v1')throw new DOMException('quota','QuotaExceededError');return originalAdaptiveSetItem.call(this,key,value);}");
 await cdp.eval("document.querySelector('#journey .journey-options button').click()");assert.equal(await cdp.eval('SeviatJourney.getState().runs.length'),0);assert(await cdp.eval("document.querySelector('#journey').textContent.includes('تعذر حفظ تقدمك')"));
 await cdp.eval('Storage.prototype.setItem=originalAdaptiveSetItem;SeviatJourney.home()');
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await cdp.eval('document.documentElement.scrollWidth<=innerWidth'),true);fs.writeFileSync(path.join(stage,'adaptive-mobile.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png'})).data,'base64'),{flag:'wx'});
 await cdp.eval("localStorage.setItem('seviat-guided-journey-v1','broken-original')");await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready&&window.SeviatJourney'),'corrupt fixture');assert.equal(await cdp.eval("localStorage.getItem('seviat-guided-journey-v1')"),'broken-original');
 for(const [key,value]of Object.entries(preserved))assert.equal(await cdp.eval('localStorage.getItem('+JSON.stringify(key)+')'),value,key);
 assert.equal(pageErrors.length,0,JSON.stringify(pageErrors));assert.equal(consoleErrors.length,0,JSON.stringify(consoleErrors));
 const result={passed:true,checks:['five explicit Chrome learner scenarios: new, repeated mistakes, fast progress, returning, teacher homework','adaptive practice and assessment','short diagnosis','no single-answer mastery','reload persistence','legacy Unit 1/2 and sound settings unchanged','support excluded from evidence','unknown legacy fields preserved','no future letters in Unit 2 options','independent short/long vowels, sukoon, analysis and syllable evidence','teacher preview and report','known-letter word game','unverified sound cannot certify mastery','quota rollback','corrupt data preserved','390px RTL'],pageErrors:0};fs.writeFileSync(path.join(stage,'adaptive-browser-results.json'),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result,null,2));
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{try{if(cdp)await Promise.race([cdp.send('Browser.close'),sleep(2000)]); /* Chrome may exit before acknowledging close; preserve assertion exit status. */}catch{}if(cdp)cdp.ws.close();if(browser&&!browser.killed)browser.kill();server.close();setTimeout(()=>process.exit(process.exitCode||0),300).unref();});
