'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),{spawn}=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,path.basename(path.dirname(__dirname))==='.access-staging'?'../..':'..');
const stage=process.env.SEVIAT_TEST_OUTPUT||path.join(root,'.access-staging'),live=process.argv.includes('--live');
const read=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');
const requests=[],pageErrors=[],consoleErrors=[];
let failingPath=null,delayFirstCurriculum=true;
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
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});if(delayFirstCurriculum&&pathname==='/data/unit1-reviewed.json'){delayFirstCurriculum=false;setTimeout(()=>fs.createReadStream(file).pipe(res),1500);}else fs.createReadStream(file).pipe(res);
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
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:'if(localStorage.getItem("seviat-child-experience-v1")===null)localStorage.setItem("seviat-child-experience-v1",JSON.stringify({version:1,autoPlacement:false,autoContinue:false,exploreMap:true,retentionDays:7}));'});



 const preserved={'seviat-unit1-learning-v2':JSON.stringify({version:2,attempts:[],practice:{},writing:[],marker:'preserve'}),'seviat-unit2-practice-v1':JSON.stringify({marker:'unit2'}),'seviatLearningProgress':JSON.stringify({score:42,custom:'keep'})};
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:'for(const [key,value]of Object.entries('+JSON.stringify(preserved)+'))if(localStorage.getItem(key)===null)localStorage.setItem(key,value);'});
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:'if(localStorage.getItem("seviat-interaction-preferences-v1")===null)localStorage.setItem("seviat-interaction-preferences-v1",JSON.stringify({version:1,autoAdvance:false,animations:false}));'});
 await cdp.send('Page.navigate',{url});await until(()=>cdp.eval('!!window.SeviatJourney'),'initial shell');assert.equal(await cdp.eval('document.querySelector("#journey-start").disabled'),true);await until(()=>cdp.eval('window.Unit1Learning?.ready&&window.SeviatArabicPath&&window.SeviatJourney?.getPath()'),'path ready');
 const click=async selector=>{const point=await cdp.eval('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');if(!e||e.disabled)throw Error("Missing/disabled button");window.scrollTo({top:scrollY,behavior:"instant"});e.scrollIntoView({block:"center",behavior:"instant"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});};
 const reload=async()=>{await cdp.eval('window.universalReloadPending=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.universalReloadPending&&window.Unit1Learning?.ready&&window.SeviatJourney?.getPath()'),'new document ready');};
 const seed=async(profile)=>{await cdp.eval('localStorage.setItem("seviat-guided-journey-v1",'+JSON.stringify(JSON.stringify({active:'path-test',profiles:{'path-test':{name:'متعلم تجريبي',runs:[],overrides:{},...profile}},unknown:'retained'}))+')');await reload();};
 assert.equal(await cdp.eval('document.body.dataset.mode'),'student');assert.equal(await cdp.eval('SeviatJourney.getPath().progress.completed'),0);
 await click('#learning-path > summary');assert.equal(await cdp.eval('document.querySelectorAll(".path-worlds button").length'),7);
 assert.equal(await cdp.eval('!!document.querySelector(".path-level[data-status=available] button:not(:disabled)")'),true);
 await click('[data-world-id="letters"]');assert.equal(await cdp.eval('document.querySelectorAll("#path-levels button:not(:disabled)").length'),0);
 await click('[data-world-id="communication"]');assert.equal(await cdp.eval('document.querySelector("#path-levels [data-status=planned]")!==null'),true);
 await click('[data-world-id="readiness"]');await click('.path-level[data-status="available"] button');assert.equal(await cdp.eval('document.querySelector("#journey h2").textContent'),'هيا نكتشف');await click('#journey-home');assert.equal(await cdp.eval('SeviatJourney.getState().runs.length'),0);
 // The primary action and normal activity controls remain functional.
 await click('#journey-start');await click('#journey-next');
 const answer=async()=>{const target=await cdp.eval('document.querySelector("#journey .journey-model").textContent');await cdp.eval('[...document.querySelectorAll("#journey .journey-options button")].find(b=>b.textContent==='+JSON.stringify(target)+').click()');await click('#journey-next');};
 await answer();for(let i=0;i<5;i++)await answer();await click('#journey-next');await click('#journey-next');for(let i=0;i<5;i++)await answer();
 await cdp.eval('SeviatJourney.home()');assert.equal(await cdp.eval('SeviatJourney.getPath().progress.completed'),1);assert.equal(await cdp.eval('SeviatJourney.getPath().recommendedLesson.id'),'lesson:م:letter-shape');await reload();assert.equal(await cdp.eval('SeviatJourney.getState().runs.length'),2);
 const run=(id,time)=>({id,node:'prep:matching',mode:'assessment',evidenceVersion:2,independent:true,completedAt:time,results:Array.from({length:5},(_,i)=>({id:'matching-'+i,correct:true,verified:true}))});
 await seed({runs:[run('return-1',Date.now()-5*86400000),run('return-2',Date.now()-3*86400000)]});assert.equal(await cdp.eval('SeviatJourney.getPath().recommendation.reason'),'spaced-review');
 await seed({overrides:{'prep:matching':'allow'}});assert.equal(await cdp.eval('SeviatJourney.getPath().progress.completed'),0);assert.equal(await cdp.eval('SeviatJourney.getPath().recommendedLesson.id'),'lesson:م:letter-shape');
 await cdp.eval('SeviatJourney.teacher()');await cdp.eval('[...document.querySelectorAll("#teacherHub select")].find(s=>[...s.options].some(o=>o.value==="prep:matching")).value="prep:matching"');await cdp.eval('[...document.querySelectorAll("#teacherHub button")].find(b=>b.textContent==="تعيين واجب").click()');await reload();assert.equal(await cdp.eval('SeviatJourney.getPath().recommendation.reason'),'teacher-assignment');assert.equal(await cdp.eval('SeviatJourney.getPath().recommendedLesson.id'),'lesson:prep:matching');
 await cdp.eval('SeviatJourney.teacher()');await click('#returnStudent');assert.equal(await cdp.eval('document.body.dataset.mode'),'student');

 // Student paths honor teacher access policy even when a teacher waived prerequisites.
 await seed({overrides:{'prep:matching':'allow'}});
 await cdp.eval('localStorage.setItem("seviat-access-policy-v2",JSON.stringify({version:2,coarse:{mode:"custom",allowed:["preparation"]},detailed:{mode:"all",allowed:[]}}));SeviatJourney.home()');
 assert.equal(await cdp.eval('SeviatJourney.getPath().levels.find(l=>l.id==="level:م:letter-shape").status'),'unavailable');
 await cdp.eval('SeviatJourney.begin("م:letter-shape")');assert.equal(await cdp.eval('document.querySelectorAll("#journey .journey-options").length'),0);
 await cdp.eval('localStorage.setItem("seviat-access-policy-v2","invalid-original");SeviatJourney.home()');assert.equal(await cdp.eval('localStorage.getItem("seviat-access-policy-v2")'),'invalid-original');assert.equal(await cdp.eval('SeviatJourney.recommend().nodeId'),null);
 await cdp.eval('localStorage.removeItem("seviat-access-policy-v2")');await seed({overrides:{'prep:matching':'allow'}});
 assert.equal(await cdp.eval('SeviatJourney.getPath().levels.find(l=>l.id==="level:word-game:1").status'),'unavailable');
 // Reuse historical confirmed assessments without saving synthetic journey runs.
 const historical=await cdp.eval('(()=>{const p=questionsData.questions.filter(q=>q.letter==="م"&&q.skill==="letter-shape"&&q.phase==="training").slice(0,5);return JSON.stringify({version:2,attempts:[0,1].map(i=>({id:"historical-"+i,key:Unit1Rules.stateKey("م","letter-shape"),mode:"assessment",completedAt:Date.now()-(2-i)*86400001,independent:true,teacherConfirmed:true,results:p.map(q=>({id:q.id,answer:q.answer,correct:true}))})),practice:{},writing:[],unknown:"preserve"});})()');
 await cdp.eval('localStorage.setItem("seviat-unit1-learning-v2",'+JSON.stringify(historical)+');localStorage.setItem("seviat-guided-journey-v1",JSON.stringify({active:"default",profiles:{default:{name:"سجل سابق",runs:[],overrides:{}}}}))');await reload();
 assert.equal(await cdp.eval('SeviatJourney.getPath().levels.find(l=>l.id==="level:م:letter-shape").status'),'completed');assert.equal(await cdp.eval('SeviatJourney.getState().runs.length'),0);assert.equal(await cdp.eval('localStorage.getItem("seviat-unit1-learning-v2")'),historical);
 await cdp.eval('localStorage.setItem("seviat-unit1-learning-v2",'+JSON.stringify(preserved['seviat-unit1-learning-v2'])+')');await seed({});
 const widths=[320,390,768,1280];for(const width of widths){await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});if(!await cdp.eval('document.querySelector("#learning-path").open'))await click('#learning-path > summary');await click('[data-world-id="letters"]');assert(await cdp.eval('document.documentElement.scrollWidth<=innerWidth'),'overflow '+width);assert(await cdp.eval('[...document.querySelectorAll(".path-worlds button")].every(b=>b.getBoundingClientRect().height>=44)'),'touch '+width);fs.writeFileSync(path.join(stage,'universal-path-'+width+'.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png'})).data,'base64'),{flag:'wx'});}
 for(const [key,value]of Object.entries(preserved))assert.equal(await cdp.eval('localStorage.getItem('+JSON.stringify(key)+')'),value,key);
 assert.equal(await cdp.eval('JSON.parse(localStorage.getItem("seviat-guided-journey-v1")).unknown'),'retained');assert.equal(pageErrors.length,0,JSON.stringify(pageErrors));assert.equal(consoleErrors.length,0,JSON.stringify(consoleErrors));
 const result={passed:true,widths,worlds:7,checks:['loading gate and ready event refresh','functional path level entry and back','planned/locked levels disabled','primary action and guided evidence','reload persistence','override is not proficiency','returning review','teacher homework lesson mapping','teacher return','legacy bytes unchanged','confirmed legacy assessment projection without migration','runtime missing vocabulary disabled','teacher policy and corrupt policy respected','mobile and desktop navigation'],pageErrors:0};fs.writeFileSync(path.join(stage,'universal-path-browser-results.json'),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result,null,2));
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{try{if(cdp)await Promise.race([cdp.send('Browser.close'),sleep(2000)]); /* Chrome may exit before acknowledging close; preserve assertion exit status. */}catch{}if(cdp)cdp.ws.close();if(browser&&!browser.killed)browser.kill();server.close();setTimeout(()=>process.exit(process.exitCode||0),300).unref();});
