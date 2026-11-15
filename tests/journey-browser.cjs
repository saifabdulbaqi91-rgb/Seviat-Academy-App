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


 const historical=JSON.stringify({version:2,attempts:[],practice:{},writing:[],extra:'untouched'});
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:"if(!localStorage.getItem('seviat-unit1-learning-v2'))localStorage.setItem('seviat-unit1-learning-v2',"+JSON.stringify(historical)+");"});
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:'if(localStorage.getItem("seviat-interaction-preferences-v1")===null)localStorage.setItem("seviat-interaction-preferences-v1",JSON.stringify({version:1,autoAdvance:false,animations:false}));'});
 await cdp.send('Page.navigate',{url});await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready&&window.SeviatJourney'),'ready');
 const old=await cdp.eval("localStorage.getItem('seviat-unit1-learning-v2')");
 const click=async selector=>{await cdp.eval('document.querySelector('+JSON.stringify(selector)+').click()');};
 assert.equal(await cdp.eval('document.body.dataset.mode'),'student');
 assert.equal(await cdp.eval("getComputedStyle(document.querySelector('#stages')).display"),'none');
 assert.notEqual(await cdp.eval("getComputedStyle(document.querySelector('#seviat-menu-button')).display"),'none');assert.equal(await cdp.eval("getComputedStyle(document.querySelector('#seviat-parent-settings')).display"),'none');assert.equal(await cdp.eval("document.querySelector('#teacherHub').hidden"),true); // Phase 5 exposes shared settings, never the old admin menu in child mode.
 await click('#journey-start');await click('#journey-next');
 assert.equal(await cdp.eval("document.querySelectorAll('#journey .journey-options').length"),1);
 async function choose(correct=true){const text=await cdp.eval("document.querySelector('#journey h3').textContent");let expected=await cdp.eval("document.querySelector('#journey .journey-model')?.textContent");
 if(!expected){const id=await cdp.eval("document.querySelector('#journey').dataset.questionId");expected=await cdp.eval('questionsData.questions.find(q=>q.id==='+JSON.stringify(id)+')?.answer');}
 await cdp.eval("[...document.querySelectorAll('#journey .journey-options button')].find(b=>"+(correct?'b.textContent===':'b.textContent!==')+JSON.stringify(expected)+").click()");await click('#journey-next');}
 await choose(); // guided trial: must not count
 assert.equal(await cdp.eval('SeviatJourney.getState().runs.length'),0);
 for(let i=0;i<5;i++)await choose(i!==0);
 assert.equal(await cdp.eval('SeviatJourney.getState().runs.length'),1);
 assert.equal(await cdp.eval("SeviatJourneyRules.complete(SeviatJourney.getState(),'prep:matching')"),false);
 await cdp.eval('SeviatJourney.home()');await click('#journey-start');await click('#journey-next');if(await cdp.eval("document.querySelector('#journey h2').textContent==='نجرب معًا'"))await choose();for(let i=0;i<5;i++)await choose();
 assert.equal(await cdp.eval("SeviatJourneyRules.complete(SeviatJourney.getState(),'prep:matching')"),true);
 assert.equal(await cdp.eval("localStorage.getItem('seviat-unit1-learning-v2')"),old);
 await click('#seviat-menu-button');await cdp.eval('Promise.all(document.querySelector("#seviat-sidebar").getAnimations().map(a=>a.finished.catch(()=>{})))');await click('#afaq-menu-teacher');assert.equal(await cdp.eval('document.body.dataset.mode'),'teacher');
 await cdp.eval("document.querySelector('#teacherHub input').value='طالبة ثانية'");
 await cdp.eval("[...document.querySelectorAll('#teacherHub button')].find(b=>b.textContent==='إضافة طالب').click()");
 assert.equal(await cdp.eval('SeviatJourney.getState().runs.length'),0);
 const selectNode=async id=>cdp.eval("[...document.querySelectorAll('#teacherHub select')].find(s=>[...s.options].some(o=>o.value==='prep:matching')).value="+JSON.stringify(id));
 await selectNode('ب:letter-shape');await cdp.eval("[...document.querySelectorAll('#teacherHub button')].find(b=>b.textContent==='معاينة أي نشاط').click()");
 assert.equal(await cdp.eval('document.body.dataset.mode'),'student');assert.equal(await cdp.eval("document.querySelector('#journey h2').textContent"),'هيا نكتشف');
 await cdp.eval('SeviatJourney.home()');await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready&&window.SeviatJourney'),'reload');assert.equal(await cdp.eval('SeviatJourney.getState().name'),'طالبة ثانية');
 await cdp.eval('SeviatJourney.teacher()');
 // Every preparation family is callable directly for the teacher, regardless of learner evidence.
 for(const id of ['prep:visual:2','prep:memory:3','prep:attention:2','prep:observation:1','prep:sequence:2','prep:extended:0:1','prep:auditory:3']){
  await cdp.eval('SeviatJourney.begin('+JSON.stringify(id)+',true)');await click('#journey-next');assert.equal(await cdp.eval("document.querySelectorAll('#journey .journey-options button').length>1"),true,id);await cdp.eval('SeviatJourney.teacher()');
 }

 const core=await cdp.eval('SeviatJourneyRules.nodes.filter(n=>!n.optional).map(n=>n.id)');
 for(const id of core){await cdp.eval('SeviatJourney.begin('+JSON.stringify(id)+',true)');assert.equal(await cdp.eval("document.querySelector('#journey h2').textContent"),'هيا نكتشف',id);}
 await cdp.eval("SeviatJourney.begin('م:letter-writing',true)");assert.equal(await cdp.eval("!!document.querySelector('#journey canvas')"),true);assert.equal(await cdp.eval('SeviatJourney.getState().runs.length'),0);
 await cdp.eval('SeviatJourney.home()');await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert.equal(await cdp.eval('document.documentElement.scrollWidth<=innerWidth'),true);
 fs.writeFileSync(path.join(stage,'journey-mobile.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png'})).data,'base64'));
 assert.equal(pageErrors.length,0,JSON.stringify(pageErrors));assert.equal(consoleErrors.length,0,JSON.stringify(consoleErrors));
 console.log(JSON.stringify({passed:true,checks:['student separation','guided practice excluded','multiple independent runs','Unit 1 unchanged','isolated journey profiles','teacher preview any letter','all seven preparation adapters','reload persistence','390px RTL'],pageErrors:0}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{try{if(cdp)await Promise.race([cdp.send('Browser.close'),sleep(2000)]); /* Chrome may exit before acknowledging close; preserve assertion exit status. */}catch{}if(cdp)cdp.ws.close();if(browser&&!browser.killed)browser.kill();server.close();setTimeout(()=>process.exit(process.exitCode||0),300).unref();});
