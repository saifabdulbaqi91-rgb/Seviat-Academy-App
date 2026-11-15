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




 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:'if(localStorage.getItem("seviat-interaction-preferences-v1")===null)localStorage.setItem("seviat-interaction-preferences-v1",JSON.stringify({version:1,autoAdvance:false,animations:false}));'});
 await cdp.send('Page.navigate',{url});await until(()=>cdp.eval('window.Unit1Learning?.ready&&window.SeviatJourney'),'ready');
 const legacy=await cdp.eval("JSON.stringify(['seviat-unit1-learning-v2','seviat-unit2-practice-v1','seviatLearningProgress'].map(k=>localStorage.getItem(k)))");
 const click=async selector=>{const rect=await cdp.eval('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');window.scrollTo({top:scrollY,behavior:"instant"});e.scrollIntoView({block:"center",behavior:"instant"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()');await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...rect,button:'left',clickCount:1});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...rect,button:'left',clickCount:1});};
 await cdp.eval('window.reviewSpeechCalls=0;window.speechSynthesis.speak=()=>reviewSpeechCalls++;speak("ميم");');assert.equal(await cdp.eval('reviewSpeechCalls'),0);
 await cdp.eval('SeviatEffects.setEnabled(true);window.reviewPlayback=false;const original=SeviatAudioQuestions.playNotes;SeviatAudioQuestions.playNotes=async(...args)=>{reviewPlayback=false;const r=await original(...args);reviewPlayback=r;return r;}');
 const games=await cdp.eval("SeviatJourneyRules.nodes.filter(n=>n.kind==='preparation').map(n=>n.id)");
 for(const id of games){await cdp.eval('SeviatJourney.begin('+JSON.stringify(id)+',true)');await click('#journey-next');if(id.includes('auditory')){await click('#journey-listen');await until(()=>cdp.eval('reviewPlayback'),'actual game playback '+id);}if(id.includes('memory')||id.includes('sequence')||id.startsWith('prep:visual:5')||id.startsWith('prep:extended:2:'))await sleep(5200);
 assert(await cdp.eval("document.querySelectorAll('#journey .journey-options button').length>=2"),id);await click('#journey .journey-options button');assert(await cdp.eval("!!document.querySelector('#journey-next')"),id);await click('#journey-next');await cdp.eval('SeviatJourney.home()');}
 assert.equal(await cdp.eval('SeviatJourney.getState().runs.length'),0,'preview never records evidence');
 await cdp.eval('SeviatJourney.home()');await click('#journey-start');await click('#journey-next');await cdp.eval("const m=document.querySelector('#journey .journey-model').textContent;[...document.querySelectorAll('#journey .journey-options button')].find(b=>b.textContent!==m).click()");assert(await cdp.eval("[...document.querySelectorAll('[aria-label]')].some(e=>e.getAttribute('aria-label').includes('الإجابة الصحيحة'))"));await click('#journey-next');
 assert(await cdp.eval("getComputedStyle(document.querySelector('#journey h3')).fontFamily.includes('Noto Naskh Arabic')"));
 const fontStatus=await cdp.eval("(async()=>{try{await Promise.all([document.fonts.load('32px \"Noto Naskh Arabic\"','مُبَلْ'),document.fonts.load('20px Tajawal','تعلم')]);return {naskh:document.fonts.check('32px \"Noto Naskh Arabic\"'),tajawal:document.fonts.check('20px Tajawal')};}catch(e){return {error:String(e)};}})()");
 for(const width of [320,390,768,1280]){await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});assert(await cdp.eval('document.documentElement.scrollWidth<=innerWidth'),'student width '+width);fs.writeFileSync(path.join(stage,'pedagogical-'+width+'.png'),Buffer.from((await cdp.send('Page.captureScreenshot',{format:'png'})).data,'base64'),{flag:'wx'});}
 await cdp.send('Emulation.setDeviceMetricsOverride',{width:320,height:900,deviceScaleFactor:1,mobile:true});await cdp.eval("SeviatJourney.begin('prep:attention:5',true)");await click('#journey-next');assert(await cdp.eval("document.querySelector('#journey .journey-options').getBoundingClientRect().height<650"));
 await cdp.send('Emulation.clearDeviceMetricsOverride');await cdp.eval('SeviatJourney.teacher()');assert.equal(await cdp.eval("document.querySelectorAll('.adaptive-report tbody tr').length"),await cdp.eval('SeviatJourneyRules.nodes.length'));
 await cdp.eval("const node=[...document.querySelectorAll('#teacherHub select')].find(s=>[...s.options].some(o=>o.value==='prep:matching'));node.value='م:short-vowels';[...document.querySelectorAll('#teacherHub button')].find(b=>b.textContent==='تعيين واجب').click()");await cdp.send('Page.reload');await until(()=>cdp.eval('window.Unit1Learning?.ready&&window.SeviatJourney'),'teacher save reload');assert.equal(await cdp.eval('SeviatJourney.getState().homework'),'م:short-vowels');
 await cdp.eval('SeviatSound.set("buttons",false);SeviatSound.set("feedback",true)');assert.deepEqual(await cdp.eval('SeviatSound.settings()'),{buttons:false,feedback:true});await cdp.send('Page.reload');await until(()=>cdp.eval('window.Unit1Learning?.ready&&window.SeviatJourney'),'sound reload');assert.deepEqual(await cdp.eval('SeviatSound.settings()'),{buttons:false,feedback:true});await cdp.eval('SeviatSound.set("feedback",false);SeviatSound.set("buttons",true)');assert.deepEqual(await cdp.eval('SeviatSound.settings()'),{buttons:true,feedback:false});
 assert.equal(await cdp.eval("JSON.stringify(['seviat-unit1-learning-v2','seviat-unit2-practice-v1','seviatLearningProgress'].map(k=>localStorage.getItem(k)))"),legacy);
 assert.equal(pageErrors.length,0,JSON.stringify(pageErrors));const result={passed:true,games:games.length,widths:[320,390,768,1280],fontStatus,pageErrors:pageErrors.length,consoleErrors,checks:['46 game render/answer/next/leave paths','actual auditory completion','correct/wrong feedback','preview has no records','all skill report rows','homework reload','independent sound preferences reload','legacy records unchanged','no educational TTS']};fs.writeFileSync(path.join(stage,'pedagogical-browser-results.json'),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result,null,2));
})().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(async()=>{try{if(cdp)await Promise.race([cdp.send('Browser.close'),sleep(2000)]); /* Chrome may exit before acknowledging close; preserve assertion exit status. */}catch{}if(cdp)cdp.ws.close();if(browser&&!browser.killed)browser.kill();server.close();setTimeout(()=>process.exit(process.exitCode||0),300).unref();});
