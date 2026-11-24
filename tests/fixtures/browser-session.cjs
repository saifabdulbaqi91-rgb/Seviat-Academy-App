'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),{spawn}=require('child_process');
module.exports=async function session(options={}){
 const root=path.resolve(options.root||path.resolve(__dirname,'../..')),basePath=options.basePath||'/',output=fs.mkdtempSync(path.join(os.tmpdir(),'afaq-representative-'));
 const errors=[],networkErrors=[],mediaEvents=[],browserLog=[],networkResponses=[],requests=[],pending=new Map();let id=0,browser,ws,endpoint,closing=false;
 const server=http.createServer(require('./static-server.cjs')(root,basePath,requests));
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const until=async(fn,label,timeout=20000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await sleep(50);}throw Error('Timeout: '+label);};
 const close=async()=>{closing=true;try{ws?.close();}catch{}for(const p of pending.values())p.reject(Error('Browser session closed'));pending.clear();browser?.kill();server.closeAllConnections();await new Promise(r=>server.close(r));};
 try{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=spawn(process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'google-chrome'),[...(options.headless===false?['--start-minimized']:['--headless=new']),'--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+path.join(output,'profile'),'--window-size=1280,960','about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
  browser.on('error',e=>errors.push(String(e)));browser.stderr.on('data',data=>{browserLog.push(String(data));endpoint=String(data).match(/DevTools listening on (ws:\/\/\S+)/)?.[1]||endpoint;});
  await until(()=>endpoint,'Chrome launch');const pages=await(await fetch('http://'+new URL(endpoint).host+'/json/list')).json();ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise((yes,no)=>{ws.onopen=yes;ws.onerror=no;});
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method.startsWith('Media.'))mediaEvents.push({method:m.method,params:m.params});else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Network.responseReceived'){networkResponses.push(m.params.response);if(m.params.response.status>=400&&!m.params.response.url.endsWith('/favicon.ico'))networkErrors.push({url:m.params.response.url,status:m.params.response.status});}};
  const send=(method,params={})=>new Promise((resolve,reject)=>{if(closing)return reject(Error('Closed'));const key=++id,timer=setTimeout(()=>{pending.delete(key);reject(Error('CDP timeout: '+method));},25000);pending.set(key,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});ws.send(JSON.stringify({id:key,method,params}));});
  const evaluate=async expression=>{let r;try{r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});}catch(error){throw Error(error.message+' in '+expression.slice(0,180));}if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Media.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:(options.nativeSpeech||options.nativeMedia?'':require('./controlled-speech.cjs'))+`;fixtureHoldSpeech=false;${options.nativeMedia?'':'window.AudioContext=undefined;window.webkitAudioContext=undefined;'}localStorage.setItem('seviat-parent-pin-v1','864209');localStorage.setItem('seviat-child-experience-v1',JSON.stringify({version:1,autoPlacement:false,autoContinue:false,retentionDays:7}));`});
  await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+basePath+(options.page||'')});await until(()=>evaluate(options.ready||'window.Unit1Learning?.ready&&window.SeviatJourney&&window.AfaqLiteracyUI'),'application ready');
  return {output,errors,networkErrors,mediaEvents,browserLog,networkResponses,requests,send,evaluate,until,sleep,close};
 }catch(e){await close();throw e;}
};
