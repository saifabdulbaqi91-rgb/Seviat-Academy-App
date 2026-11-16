'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),{spawn}=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,path.basename(path.dirname(__dirname))==='.access-staging'?'../..':'..');
const stage=process.env.SEVIAT_TEST_OUTPUT||path.join(root,'.access-staging','journey-routing-'+Date.now()),live=process.argv.includes('--live');
const read=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');
const requests=[],pageErrors=[],consoleErrors=[],networkFailures=[];
let failingPath=null,delayFirstCurriculum=true,instructionFixture=false;
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);requests.push(pathname);
 if(instructionFixture&&pathname==='/instruction-audio.json'){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({version:1,clips:['matching','choose','memory','diagnostic','listening'].map(kind=>({kind,src:'sounds/instructions/phase4-fixture.wav',approved:true,reviewedBy:'NONLANGUAGE TEST FIXTURE',reviewedAt:'2026-11-13'}))}));return;}
 if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}
 if(failingPath===pathname){res.writeHead(503).end('Intentional test failure');return;}
 if(req.method!=='GET')requests.push('METHOD:'+req.method);
 if(pathname==='/sounds/instructions/phase4-fixture.wav'){const size=1600,buffer=Buffer.alloc(44+size*2);buffer.write('RIFF');buffer.writeUInt32LE(36+size*2,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(8000,24);buffer.writeUInt32LE(16000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(size*2,40);for(let i=0;i<size;i++)buffer.writeInt16LE(Math.round(Math.sin(i/8000*2*Math.PI*440)*1500),44+i*2);res.writeHead(200,{'Content-Type':'audio/wav'}).end(buffer);return;}
 const relative=pathname==='/'?'index.html':pathname.slice(1);
 const original=path.resolve(root,relative),overlay=path.resolve(stage,relative);
 if(!original.startsWith(root+path.sep)||relative.includes('..')){res.writeHead(403).end();return;}
 const file=!live&&fs.existsSync(overlay)&&fs.statSync(overlay).isFile()?overlay:original;
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2'};
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});if(delayFirstCurriculum&&pathname==='/data/unit1-reviewed.json'){delayFirstCurriculum=false;setTimeout(()=>fs.createReadStream(file).pipe(res),1500);}else fs.createReadStream(file).pipe(res);
});
class CDP {
 constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();this.ready=new Promise((yes,no)=>{this.ws.onopen=yes;this.ws.onerror=no;});this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=this.pending.get(m.id);if(p){this.pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else{if(m.method==='Network.loadingFailed')networkFailures.push(m.params);if(m.method==='Runtime.exceptionThrown')pageErrors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')consoleErrors.push(m.params.args.map(a=>a.value||a.description).join(' '));}};}
 async send(method,params={}){await this.ready;const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
 async eval(expression){const result=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text+': '+result.exceptionDetails.exception?.description);return result.result.value;}
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label,timeout=15000){const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await fn())return;await sleep(100);}throw Error('Timeout: '+label);}
let browser,cdp,browserEndpoint;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const executable='C:/Program Files/Google/Chrome/Application/chrome.exe';
 const profile=path.join(stage,'browser-profile-'+Date.now());fs.mkdirSync(profile,{recursive:true});
 browser=spawn(executable,['--headless=new','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+profile,'--window-size=1280,960','about:blank'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 browser.on('exit',(code,signal)=>{console.log('Chrome exit',code,signal);});browser.on('error',e=>{throw e;});let browserLog='';browser.stderr.on('data',chunk=>{browserLog+=chunk;const m=browserLog.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(m)browserEndpoint=m[1];});
 try{await until(()=>{const activePort=path.join(profile,'DevToolsActivePort');if(!browserEndpoint&&fs.existsSync(activePort)){const [port,endpoint]=read(activePort).trim().split(/\r?\n/);if(/^\d+$/.test(port)&&endpoint?.startsWith('/devtools/browser/'))browserEndpoint='ws://127.0.0.1:'+port+endpoint;}return browserEndpoint;},'Chrome start',60000);}catch(error){throw Error(error.message+' '+browserLog);}
 const remote=new URL(browserEndpoint);
 const pages=await (await fetch('http://'+remote.host+'/json/list')).json();cdp=new CDP(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await cdp.send('Runtime.enable');await cdp.send('Page.enable');await cdp.send('Network.enable');
 // Routing checks use bundled/fallback fonts and never depend on remote font availability.
 await cdp.send('Network.setBlockedURLs',{urls:['https://fonts.googleapis.com/*','https://fonts.gstatic.com/*']});
 const preserved={'seviat-unit1-learning-v2':JSON.stringify({version:2,attempts:[],practice:{},writing:[],marker:'phase4'}),'seviat-unit2-practice-v1':JSON.stringify({custom:'unit2'}),'seviatLearningProgress':JSON.stringify({score:0,custom:'keep'})};
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:'for(const [k,v]of Object.entries('+JSON.stringify(preserved)+'))if(localStorage.getItem(k)===null)localStorage.setItem(k,v);window.phase4MicCalls=0;window.phase4Streams=[];if(navigator.mediaDevices){const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async c=>{phase4MicCalls++;const s=await original(c);phase4Streams.push(s);return s;};}'});
 const readinessStart=Date.now();try{await cdp.send('Page.navigate',{url});await until(()=>cdp.eval('window.Unit1Learning?.ready&&window.SeviatChildUI&&window.SeviatJourney'),'routing application ready',60000);}finally{const snapshot=await cdp.eval('({readyState:document.readyState,unit1:!!window.Unit1Learning,unit1Ready:window.Unit1Learning?.ready,journey:!!window.SeviatJourney,child:!!window.SeviatChildUI,diagnostic:!!window.SeviatDiagnosticUI,resources:performance.getEntriesByType("resource").map(r=>({name:r.name,duration:r.duration,responseEnd:r.responseEnd}))})');fs.writeFileSync(path.join(stage,'journey-routing-readiness-'+process.pid+'-'+Date.now()+'.json'),JSON.stringify({elapsed:Date.now()-readinessStart,snapshot,pageErrors,consoleErrors,networkFailures,requests},null,2),{flag:'wx'});}
 // Opening/closing details queues layout changes. Never dispatch to a stale or offscreen point.
 const click=async selector=>{
  let point;
  await until(async()=>{
   const candidate=await cdp.eval('(async()=>{const e=document.querySelector('+JSON.stringify(selector)+');if(!e||e.disabled||e.hidden)throw Error("Missing/disabled "+'+JSON.stringify(selector)+');await new Promise(resolve=>requestAnimationFrame(resolve));e.scrollIntoView({block:"center",behavior:"instant"});await new Promise(resolve=>requestAnimationFrame(resolve));const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);return e.isConnected&&r.width>0&&r.height>0&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight&&(hit===e||e.contains(hit))?{x,y}:null;})()');
   if(!candidate)return false;
   point=candidate;return true;
  },'clickable '+selector);
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
 };
 const KEY='seviat-guided-journey-v1',DK='seviat-diagnostic-placement-v1';let scenario=0;
 const checks=[];const check=(ok,label)=>{assert(ok,label);checks.push(label);};
 const raw=()=>cdp.eval('localStorage.getItem('+JSON.stringify(KEY)+')');
 const active=()=>cdp.eval('SeviatJourney.getExperienceContext().studentId');
 const draft=()=>cdp.eval('(()=>{const p=SeviatJourney.getState();return p.interactiveV1?.sessions[p.interactiveV1.activeId]||null;})()');
 const rewards=()=>cdp.eval('JSON.stringify(SeviatJourney.getInteraction().rewards)');
 const reload=async()=>{await cdp.eval('window.routingReload=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.routingReload&&window.Unit1Learning?.ready&&window.SeviatJourney&&window.AfaqPersonalizedUI'),'reload',60000);};
 const seed=async(profile={})=>{const id='routing-'+(++scenario);await cdp.eval('(()=>{const key='+JSON.stringify(KEY)+',s=JSON.parse(localStorage.getItem(key)||\'{"profiles":{}}\');s.active='+JSON.stringify(id)+';s.profiles[s.active]='+JSON.stringify({name:'Routing fixture',runs:[],overrides:{},...profile})+';localStorage.setItem(key,JSON.stringify(s));})()');await reload();return id;};
 const select=async id=>{await cdp.eval('(()=>{const key='+JSON.stringify(KEY)+',s=JSON.parse(localStorage.getItem(key));s.active='+JSON.stringify(id)+';localStorage.setItem(key,JSON.stringify(s));})()');await reload();};
 const registered={phase6Registration:{version:1,guardianManaged:true,placementRequired:true}};
 const complete=async()=>{
  await cdp.eval('SeviatDiagnosticUI.start()');
  for(let n=0;n<40;n++){
   const a=await cdp.eval('SeviatDiagnosticUI.getAssessment()');if(a.status==='completed')break;
   const q=a.bank.find(i=>i.id===a.pendingItemId)?.question;assert(q,'routing fixture must offer an objective diagnostic task');
   await click('.diagnostic-view button[data-value='+JSON.stringify(q.answer)+']');await click('#diagnostic-next');
  }
  assert(await cdp.eval('SeviatDiagnosticUI.getAssessment().status==="completed"'));
  await reload();
 };
 const intent=()=>cdp.eval('sessionStorage.getItem("afaq-deferred-entry-v1:"+encodeURIComponent(SeviatJourney.getExperienceContext().studentId))');
 const request=()=>cdp.eval('SeviatJourney.begin("prep:matching")');
 // A legacy first-time profile has the same policy via Start and direct entry.
 await seed();check(await cdp.eval('SeviatChildUI.route()==="placement"'),'legacy first-time primary requires placement');
 let academic=await raw(),stars=await rewards();await request();check(await cdp.eval('!!document.querySelector("#diagnostic-option-0")'),'direct first-time activity opens placement');check(await raw()===academic,'placement entry preserves academic bytes');
 const originalAssessment=await cdp.eval('SeviatDiagnosticUI.getAssessment().id');await reload();await request();check(await cdp.eval('SeviatDiagnosticUI.getAssessment().id')===originalAssessment,'placement resumes without duplicate assessment');
 check(JSON.parse(await intent()).id==='prep:matching','direct destination survives reload');
 // Complete the real diagnostic by answering its actual controls.
 for(let n=0;n<40;n++){
  const a=await cdp.eval('SeviatDiagnosticUI.getAssessment()');if(a.status==='completed')break;
  const q=a.bank.find(i=>i.id===a.pendingItemId)?.question;
  if(!q){await click('#diagnostic-next');continue;}
  await click('.diagnostic-view button[data-value='+JSON.stringify(q.answer)+']');await click('#diagnostic-next');
 }
 check(await cdp.eval('SeviatDiagnosticUI.getAssessment().status==="completed"'),'actual diagnostic finishes');
 check(await raw()===academic,'diagnostic answers do not create mastery or attempts');check(await rewards()===stars,'diagnostics do not grant rewards');
 await click('#diagnostic-return');let saved=await draft();check(saved?.nodeId==='prep:matching','deferred activity resumes after real diagnostic');check(await intent()===null,'deferred request consumed');
 await cdp.eval('SeviatJourney.setPreferences({autoAdvance:false})');await click('#journey-next');
 for(let n=0;n<2;n++){const d=await draft(),q=d.questions[d.index];await click('.journey-options button[data-value='+JSON.stringify(q.answer)+']');await click('#journey-next');}
 saved=await draft();check(saved.index===1,'saved attempt has advanced question index');academic=await raw();stars=await rewards();
 await reload();await click('#journey-start');check((await draft()).id===saved.id&&(await draft()).index===saved.index,'returning Start resumes identical attempt and question index');check(await raw()===academic&&await rewards()===stars,'resume adds no attempts or rewards');
 // An assignment cannot skip mandatory placement; its intent is student-specific.
 const assigned=await seed({...registered,homework:'prep:matching'});academic=await raw();await request();check(await raw()===academic,'assigned entry defers without altering assignment');
 const other=await seed({overrides:{'prep:matching':'allow'}});check(await intent()===null,'another student cannot inherit deferred activity');await select(assigned);check(JSON.parse(await intent()).studentId===assigned,'original student retains request');
 await complete();await cdp.eval('SeviatJourney.begin()');saved=await draft();check(saved.nodeId==='prep:matching','assignment resumes after completed diagnosis');await reload();await cdp.eval('SeviatJourney.begin()');check((await draft()).id===saved.id,'assignment resume does not duplicate attempt');
 // Current permissions are checked again after diagnostic deferral.
 await seed(registered);await request();await complete();await cdp.eval('(()=>{const key='+JSON.stringify(KEY)+',s=JSON.parse(localStorage.getItem(key));s.profiles[s.active].overrides["prep:matching"]="lock";localStorage.setItem(key,JSON.stringify(s));})()');await reload();academic=await raw();await cdp.eval('SeviatJourney.begin()');check(await cdp.eval('!!document.querySelector("#journey-deferred-return")'),'locked deferred activity is rejected safely');check(await raw()===academic,'rejected destination leaves academic evidence intact');
 // Documented bypass uses actual spaced independent assessment evidence.
 const now=Date.now(),runs=[1,2].map(n=>({id:'routing-evidence-'+n,node:'prep:matching',mode:'assessment',evidenceVersion:2,independent:true,completedAt:now-n*86400000-1000,results:Array.from({length:5},(_,i)=>({id:'q'+i,taskKey:'q'+i,correct:true,verified:true}))}));
 await seed({...registered,runs});await cdp.eval('(()=>{const a=SeviatJourney.getExperienceContext();AfaqPersonalized.createDecisions(localStorage).bypass({...a,nodeId:"prep:matching",observer:"Browser fixture",reason:"Two independent spaced assessments",id:crypto.randomUUID()});})()');await reload();
 check(await cdp.eval('SeviatChildUI.route()==="learning"'),'verified teacher bypass remains valid');await request();check(await cdp.eval('!document.querySelector("#diagnostic-option-0")'),'exempt student not forced into repeated diagnostics');
 // A teacher level allow is retained but does not manufacture a placement bypass.
 await seed({...registered,overrides:{'prep:matching':'allow'}});await request();check(await cdp.eval('!!document.querySelector("#diagnostic-option-0")'),'level allow alone does not bypass mandatory placement');
 // Approved pilot shortcuts cannot replace an already deferred destination.
 const allPrior=await cdp.eval('Object.fromEntries(SeviatJourneyRules.nodes.filter(n=>!n.optional).map(n=>[n.id,"allow"]))');
 const approvePilot=async()=>{await cdp.eval('(()=>{const a=SeviatJourney.getExperienceContext(),store=AfaqAlifPilot.createStore(localStorage),base={studentId:a.studentId,at:Date.now(),reviewer:"BROWSER FIXTURE ONLY",note:"Synthetic routing test; not human content approval"};store.quality({...base,id:crypto.randomUUID(),itemId:"u3a-v1-name",decision:"approved",checks:Object.fromEntries(AfaqAlifPilot.checks.map(k=>[k,true]))});store.enable({...base,id:crypto.randomUUID(),enabled:true});})()');await reload();};
 await seed({...registered,overrides:allPrior});await approvePilot();await request();await complete();await click('#journey-start');check((await draft())?.nodeId==='prep:matching','pilot shortcut does not replace deferred learning activity');
 await seed({...registered,overrides:allPrior});await approvePilot();academic=await raw();await cdp.eval('AfaqAlifPilotUI.launch("u3a-v1-name")');check(JSON.parse(await intent()).kind==='alif-pilot','direct pilot launch also defers for mandatory diagnosis');check(await raw()===academic,'pilot deferral preserves academic evidence');await complete();await click('#journey-start');check(await cdp.eval('document.querySelector("#journey").dataset.pilotItem')==='u3a-v1-name','deferred pilot launch resumes through its own approval checks');
 // Service failures have a recovery path and create no synthetic diagnosis.
 await seed({overrides:{'prep:matching':'allow'}});academic=await raw();
 for(const service of ['SeviatChildUI','SeviatDiagnosticUI','AfaqPersonalizedUI']){
  await cdp.eval('window.routingService=window['+JSON.stringify(service)+'];window['+JSON.stringify(service)+']=undefined');await request();
  check(await cdp.eval('!!document.querySelector("#journey-routing-retry")'),'recovery shown for '+service);check(await raw()===academic,'service failure preserves profile '+service);
  await cdp.eval('window['+JSON.stringify(service)+']=window.routingService');await click('#journey-routing-retry');check(!!await draft(),'retry obeys restored policy '+service);await cdp.eval('SeviatJourney.home()');academic=await raw();
 }
 // Corrupt diagnostic bytes are neither replaced nor treated as first placement.
 const diagnosticBytes=await cdp.eval('localStorage.getItem('+JSON.stringify(DK)+')');await cdp.eval('localStorage.setItem('+JSON.stringify(DK)+',"{broken-routing-fixture")');await reload();academic=await raw();await request();
 check(await cdp.eval('!!document.querySelector("#journey-routing-retry")'),'corrupt diagnostic shows Arabic recovery');await click('#journey-routing-retry');
 check(await cdp.eval('localStorage.getItem('+JSON.stringify(DK)+')')==='{broken-routing-fixture','corrupt diagnostic bytes preserved');check(await raw()===academic,'corrupt diagnosis leaves saved attempts unchanged');
 await cdp.eval('localStorage.setItem('+JSON.stringify(DK)+','+JSON.stringify(diagnosticBytes)+')');await reload();
 // Preview never consults or changes placement, and no available node produces a safe exit.
 await seed(registered);academic=await raw();await cdp.eval('SeviatJourney.begin("prep:matching",true)');check(await raw()===academic&&await intent()===null,'preview preserves all academic and navigation records');
 const locks=await cdp.eval('Object.fromEntries(SeviatJourneyRules.nodes.map(n=>[n.id,"lock"]))');await seed({overrides:locks});academic=await raw();await cdp.eval('SeviatJourney.begin()');check(await cdp.eval('!document.querySelector("#diagnostic-option-0")&&!SeviatJourney.getInteraction().activeId'),'no valid learning path exits without diagnostic loop');check(await raw()===academic,'unavailable path does not reset progress');
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await cdp.eval('window.routingService=SeviatDiagnosticUI;window.SeviatDiagnosticUI=undefined');await request();check(await cdp.eval('!!document.querySelector("#journey-routing-retry")&&document.documentElement.scrollWidth<=innerWidth'),'mobile recovery without horizontal overflow');await cdp.eval('window.SeviatDiagnosticUI=window.routingService');
 for(const [key,value]of Object.entries(preserved))check(await cdp.eval('localStorage.getItem('+JSON.stringify(key)+')')===value,'legacy progress fixture preserved '+key);
 check(pageErrors.length===0,'no unhandled browser errors '+JSON.stringify(pageErrors));check(consoleErrors.length===0,'no unexpected console errors '+JSON.stringify(consoleErrors));
 const result={passed:true,actualChrome:true,checks,physicalMobileHardware:false};fs.writeFileSync(path.join(stage,'journey-routing-browser-results.json'),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));
})().catch(error=>{console.error(error.stack);console.error(JSON.stringify({pageErrors,consoleErrors}));process.exitCode=1;}).finally(async()=>{try{if(cdp)await Promise.race([cdp.send('Browser.close'),sleep(2000)]);}catch{}if(cdp)cdp.ws.close();if(browser&&!browser.killed)browser.kill();server.close();setTimeout(()=>process.exit(process.exitCode||0),300).unref();});
