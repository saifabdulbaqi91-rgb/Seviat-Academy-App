'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),{spawn}=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,path.basename(path.dirname(__dirname))==='.access-staging'?'../..':'..');
const stage=process.env.SEVIAT_TEST_OUTPUT||path.join(require('os').tmpdir(),'afaq-student-question-'+Date.now()),live=true;
const read=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');
const hashSources=()=>['arabic-speech.js','guided-audio.js','student-journey.js','parent-controls.js','unit1-learning.js'].map(f=>require('crypto').createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'));
const originalSourceHashes=hashSources();
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
 fs.mkdirSync(stage,{recursive:true});
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

 const checks=[],check=(value,label)=>{assert(value,label);checks.push(label);};
 const draft=()=>cdp.eval('(()=>{const p=SeviatJourney.getState();return p.interactiveV1?.sessions[p.interactiveV1.activeId]||null;})()');
 const reload=async()=>{await cdp.eval('window.lessonReload=true');await cdp.send('Page.reload');await until(()=>cdp.eval('!window.lessonReload&&window.Unit1Learning?.ready&&window.AfaqPersonalizedUI'),'reload',60000);};

 const KEY='seviat-guided-journey-v1';
 const evidence=node=>[0,1].map(n=>({id:node+'-fixture-'+n,node,evidenceVersion:2,mode:'assessment',difficulty:'standard',independent:true,completedAt:Date.now()-10000+n,results:Array.from({length:5},(_,i)=>({id:node+'-'+i,taskKey:node+'-'+i,answer:'fixture',correct:true,verified:true,evidenceEligible:true,assisted:false}))}));
 const fixture={active:'audio-first-fixture',profiles:{'audio-first-fixture':{name:'Synthetic student',runs:[...evidence('prep:matching'),...evidence('م:letter-shape'),...['letter-name','letter-sound'].map(skill=>({id:'م:'+skill+'-fixture',node:'م:'+skill,mode:'practice',completedAt:Date.now(),results:Array.from({length:3},(_,i)=>({id:'م:'+skill+'-'+i,correct:true}))}))],overrides:{},sessionMode:'practice'}}};
 await cdp.eval('localStorage.setItem('+JSON.stringify(KEY)+','+JSON.stringify(JSON.stringify(fixture))+');localStorage.setItem("seviat-parent-pin-v1","654321")');await reload();
 await cdp.eval('SeviatJourney.setPreferences({autoAdvance:false});SeviatJourney.begin("\u0645:short-vowels")');
 check((await draft())?.nodeId==='م:short-vowels','real student Meem vowel lesson opens with synthetic prior evidence');
 // Choose an existing curriculum question as the first synthetic test question, without changing its content.
 await cdp.eval('(()=>{const s=JSON.parse(localStorage.getItem('+JSON.stringify(KEY)+')),p=s.profiles[s.active],d=p.interactiveV1.sessions[p.interactiveV1.activeId];d.questions.sort((a,b)=>Number(b.options.every(x=>/^[م][َُِ]$/.test(x)))-Number(a.options.every(x=>/^[م][َُِ]$/.test(x))));d.phase="question";d.guided=false;localStorage.setItem('+JSON.stringify(KEY)+',JSON.stringify(s));})()');await reload();await click('#journey-start');
 let current=await draft();check(current.phase==='question','resume displays existing real curriculum question');
 check(current.questions[0].options.every(x=>/^[م][َُِ]$/.test(x)),'test uses the existing short-vowel choices');
 check(await cdp.eval('!document.querySelector("#journey .journey-model")&&!document.querySelector("#journey h3").textContent.includes('+JSON.stringify(current.questions[0].answer)+')&&!document.querySelector("#journey-hint")'),'no target model or pre-answer hint');
 check(await cdp.eval('Array.from(document.querySelectorAll("#journey .journey-options button")).every(b=>b.disabled)'),'choices wait for audio instead of parent confirmation');
 const before=await cdp.eval('localStorage.getItem('+JSON.stringify(KEY)+')'),questionId=await cdp.eval('document.querySelector("#journey").dataset.questionId');
 for(const method of ['cancel','escape','native-close']){
  await click('#seviat-menu-button');await click('#afaq-menu-teacher');
  check(await cdp.eval('document.querySelector("#seviat-parent-panel").open'),'adult PIN still protects teacher entry: '+method);
  if(method==='cancel')await click('#seviat-parent-cancel');
  else if(method==='escape'){await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});}
  else await cdp.eval('document.querySelector("#seviat-parent-panel").close()');
  await until(()=>cdp.eval('!document.querySelector("#seviat-parent-panel").open'),'parent modal closed');
  check(await cdp.eval('document.body.dataset.mode==="student"&&document.querySelector("#journey").dataset.questionId==='+JSON.stringify(questionId)+'&&localStorage.getItem('+JSON.stringify(KEY)+')==='+JSON.stringify(before)),'modal close preserves current lesson, question and saved bytes: '+method);
 }
 await click('#afaq-activity-menu');await click('#afaq-help-close');check((await draft()).id===current.id,'activity help close preserves the same session');
 check(await cdp.eval('(()=>{try{AfaqOnboarding.confirm("choose","unauthorized");return false;}catch{return true;}})()'),'sensitive teacher confirmation remains PIN protected');
 await cdp.eval('window.questionSpeech=[];const original=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=u=>{const r={text:u.text,lang:u.lang,ended:false};questionSpeech.push(r);u.addEventListener("end",()=>r.ended=true,{once:true});return original(u)}');
 await until(()=>cdp.eval('!document.querySelector(".student-question-replay").disabled'),'question audio ready',30000);await click('.student-question-replay');
 await until(()=>cdp.eval('Array.from(document.querySelectorAll("#journey .journey-options button")).every(b=>!b.disabled)'),'native question ends before choices unlock',30000);
 check(await cdp.eval('questionSpeech.some(x=>x.ended&&/^ar/.test(x.lang))'),'question uses real native Arabic speech');
 check(await cdp.eval('document.querySelector("#journey").innerText.includes("\u0627\u0646\u0637\u0642 \u0627\u0644\u0635\u0648\u062a \u0628\u0646\u0641\u0633\u0643")&&phase4MicCalls===0'),'student is encouraged to pronounce; no microphone or automatic pronunciation scoring');
 await click('#journey .journey-options button[data-value='+JSON.stringify(current.questions[0].answer)+']');
 const answered=await draft();check(answered.pending?.correct===true&&answered.results.length===1,'answer and feedback saved exactly once');
 check(answered.results[0].evidenceScope==='audio-prompted-choice','selection evidence does not claim assessed pronunciation');
 await reload();await click('#journey-start');const resumed=await draft();check(resumed.id===answered.id&&resumed.index===answered.index&&JSON.stringify(resumed.pending)===JSON.stringify(answered.pending)&&resumed.results.length===1,'reload resumes exact saved answer and feedback');
 check(await cdp.eval('document.querySelector("#journey").innerText.includes("\u0623\u062d\u0633\u0646\u062a")'),'saved feedback restored');
 check(pageErrors.length===0,'no JavaScript page exceptions');assert.deepEqual(hashSources(),originalSourceHashes);
 const result={passed:true,checks,pageErrors,consoleErrors,output:stage};fs.writeFileSync(path.join(stage,'student-question-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{try{if(cdp)await Promise.race([cdp.send('Browser.close'),sleep(1500)]);}catch{}cdp?.ws.close();if(browser&&!browser.killed)browser.kill();server.close();});
