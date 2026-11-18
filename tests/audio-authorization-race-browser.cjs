'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),{spawn}=require('child_process'),assert=require('assert/strict');
const root=path.resolve(__dirname,path.basename(path.dirname(__dirname))==='.access-staging'?'../..':'..');
const stage=fs.mkdtempSync(path.join(require('os').tmpdir(),'afaq-audio-auth-race-')),live=true;
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
// Native Chrome + real application DOM/IndexedDB. Never use an existing browser profile.
let browser,cdp,browserEndpoint;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const executable=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
 browser=spawn(executable,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+path.join(stage,'profile'),'--window-size=1280,960','about:blank'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 let log='';browser.stderr.on('data',data=>{log+=data;browserEndpoint=log.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];});
 await until(()=>browserEndpoint,'Chrome launch');
 const pages=await(await fetch('http://'+new URL(browserEndpoint).host+'/json/list')).json();
 cdp=new CDP(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
 await cdp.send('Runtime.enable');await cdp.send('Page.enable');
 await cdp.send('Page.addScriptToEvaluateOnNewDocument',{source:`localStorage.setItem('seviat-parent-pin-v1','864209');const realNow=Date.now.bind(Date);window.raceNowOffset=0;Date.now=()=>realNow()+raceNowOffset;`});
 await cdp.send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});
 await until(()=>cdp.eval('window.Unit1Learning?.ready&&window.AfaqWorkspace&&window.AfaqAdult'),'real app ready');
 const version=await cdp.send('Browser.getVersion');
 const results=[];
 for(const scenario of ['valid','lock-during-read','expire-during-read','lock-and-login-during-read','lock-after-delete-request','unknown-version']){
  const result=await cdp.eval(`(async()=>{
   const scenario=${JSON.stringify(scenario)};
   window.raceNowOffset=0;AfaqAdult.lock();AfaqAdult.login('864209');AfaqWorkspace.teacher('advanced');
   const id=document.querySelector('#afaq-speech-review select:nth-of-type(2)').value;
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('afaq-instruction-overrides-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('clips',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
   const row={id,version:scenario==='unknown-version'?99:1,blob:new Blob(['SYNTHETIC RECORDING: preserve exact bytes'],{type:'audio/webm'}),approved:true,reviewer:'Synthetic regression adult',reviewedAt:'2026-11-19T00:00:00Z',custom:{keep:true}};
   const other={...row,id:'synthetic-unrelated'};
   await new Promise((resolve,reject)=>{const tx=db.transaction('clips','readwrite');tx.objectStore('clips').put(row);tx.objectStore('clips').put(other);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
   const snapshot=async()=>{const rows=await new Promise((resolve,reject)=>{const r=db.transaction('clips').objectStore('clips').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return Promise.all(rows.map(async row=>({...row,blob:{type:row.blob.type,bytes:Array.from(new Uint8Array(await row.blob.arrayBuffer()))}})))};
   const before=await snapshot();
   const academicBefore=JSON.stringify({...localStorage});
   const originalGet=IDBObjectStore.prototype.get,originalDelete=IDBObjectStore.prototype.delete;
   let crossedBoundary=false,deleteCalls=0;
   const wrap=(request,callback)=>new Proxy(request,{set(target,key,value){if(key==='onsuccess'){target[key]=event=>{callback();value(event)};return true}target[key]=value;return true},get(target,key){const value=target[key];return typeof value==='function'?value.bind(target):value}});
   IDBObjectStore.prototype.get=function(key){const request=originalGet.call(this,key);if(this.transaction.db.name!=='afaq-instruction-overrides-v1'||key!==id)return request;return wrap(request,()=>{crossedBoundary=true;if(scenario==='lock-during-read'||scenario==='lock-and-login-during-read')AfaqAdult.lock();if(scenario==='lock-and-login-during-read')AfaqAdult.login('864209');if(scenario==='expire-during-read')window.raceNowOffset=600001})};
   IDBObjectStore.prototype.delete=function(key){const request=originalDelete.call(this,key);if(this.transaction.db.name!=='afaq-instruction-overrides-v1'||key!==id)return request;deleteCalls++;return scenario==='lock-after-delete-request'?wrap(request,()=>AfaqAdult.lock()):request};
   let status;
   try{await document.querySelector('#afaq-instruction-delete').onclick();status=document.querySelector('#afaq-speech-review [role=status]')?.textContent;}
   finally{IDBObjectStore.prototype.get=originalGet;IDBObjectStore.prototype.delete=originalDelete;window.raceNowOffset=0;}
   const after=await snapshot();db.close();
   return{scenario,crossedBoundary,deleteCalls,before,after,status,academicUnchanged:academicBefore===JSON.stringify({...localStorage}),auth:AfaqAdult.authenticated()};
  })()`);
  assert(result.crossedBoundary,scenario+': actual IDB get callback was not reached');
  assert(result.academicUnchanged,scenario+': student/local settings changed');
  if(scenario==='valid'){
   assert.equal(result.deleteCalls,1);assert.equal(result.after.length,result.before.length-1);
   assert(!result.after.some(row=>row.id===result.before.find(row=>row.id!=='synthetic-unrelated').id));
   assert.deepEqual(result.after.find(row=>row.id==='synthetic-unrelated'),result.before.find(row=>row.id==='synthetic-unrelated'));
  }else{
   assert.deepEqual(result.after,result.before,scenario+': original recording changed');
   assert.equal(result.deleteCalls,scenario==='lock-after-delete-request'?1:0,scenario+': forbidden delete was issued');
  }
  results.push({...result,before:undefined,after:undefined,status:'PASS',uiStatus:result.status});
  console.log(JSON.stringify(results.at(-1)));
 }
 // Test-only closure access for additional storage paths. The executed bodies
 // come from the real source; no production hooks or fake IndexedDB are used.
 await cdp.eval(`(async()=>{
  for(const [file,assignment] of [
   ['afaq-audio-management.js','window.audioManagementRegression={dbAction,exportBackup,importBackup};'],
   ['afaq-audio-library.js','window.audioLibraryRegression={saveClip};'],
   ['afaq-audio-studio.js','window.audioStudioRegression={saveClip};']
  ]){
   const source=await(await fetch(file)).text();
   const end=source.lastIndexOf('})();');if(end<0)throw Error('Missing closure seam');
   (0,eval)(source.slice(0,end)+assignment+source.slice(end));
  }
 })()`);
 for(const pathName of ['library-write','studio-write','management-write','voice-delete','voice-review']){
  for(const locked of [false,true]){
   const result=await cdp.eval(`(async()=>{
    const pathName=${JSON.stringify(pathName)},locked=${locked};
    raceNowOffset=0;AfaqAdult.lock();AfaqAdult.login('864209');AfaqWorkspace.teacher('advanced');
    const voice=pathName.startsWith('voice-');
    const name=voice?'seviat-voice-recordings-v1':'afaq-audio-studio-v1';
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>{if(voice){const store=r.result.createObjectStore('clips',{keyPath:'id'});store.createIndex('studentId','studentId')}else r.result.createObjectStore('clips')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    const id=voice?'synthetic-voice':pathName==='studio-write'?'syllable:qa':'text:synthetic-backup';
    const oldBlob=new Blob(['synthetic original'],{type:'audio/webm'}),newBlob=new Blob(['synthetic replacement'],{type:'audio/webm'});
    const row=voice?{id,version:1,studentId:'synthetic-a',nodeId:'test',blob:oldBlob,createdAt:Date.now(),expiresAt:Date.now()+86400000,review:null}:oldBlob;
    await new Promise((resolve,reject)=>{const t=db.transaction('clips','readwrite');if(voice)t.objectStore('clips').put(row);else t.objectStore('clips').put(row,id);t.oncomplete=resolve;t.onerror=()=>reject(t.error)});
    const read=()=>new Promise((resolve,reject)=>{const r=db.transaction('clips').objectStore('clips').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    const snapshot=async row=>row instanceof Blob?{type:row.type,bytes:Array.from(new Uint8Array(await row.arrayBuffer()))}:row?{...row,blob:await snapshot(row.blob)}:null;
    const before=await snapshot(await read());
    const originalOpen=IDBFactory.prototype.open,originalGet=IDBObjectStore.prototype.get;let boundary=false;
    const wrap=request=>new Proxy(request,{set(t,k,v){if(k==='onsuccess'){t[k]=e=>{boundary=true;AfaqAdult.lock();AfaqAdult.login('864209');v(e)};return true}t[k]=v;return true},get(t,k){const v=t[k];return typeof v==='function'?v.bind(t):v}});
    if(locked){
     if(voice)IDBObjectStore.prototype.get=function(key){const r=originalGet.call(this,key);return this.transaction.db.name===name&&key===id?wrap(r):r};
     else IDBFactory.prototype.open=function(...args){const r=originalOpen.apply(this,args);return args[0]===name?wrap(r):r};
    }
    let rejected=false,error;
    try{
     if(pathName==='library-write')await audioLibraryRegression.saveClip(id,newBlob);
     else if(pathName==='studio-write')await audioStudioRegression.saveClip(newBlob);
     else if(pathName==='management-write')await audioManagementRegression.dbAction('readwrite',store=>store.put(newBlob,id));
     else {const store=SeviatVoiceCore.createStore(indexedDB);if(pathName==='voice-delete')await store.delete(id,'synthetic-a');else await store.review(id,'synthetic-a',{observer:'Synthetic teacher',ratings:[2,2,2]})}
    }catch(e){rejected=true;error=e.message}
    finally{IDBFactory.prototype.open=originalOpen;IDBObjectStore.prototype.get=originalGet;}
    const after=await snapshot(await read());db.close();return{pathName,locked,boundary,rejected,error,before,after};
   })()`);
   if(locked){assert(result.boundary);assert(result.rejected);assert.deepEqual(result.after,result.before,pathName+': revoked mutation persisted');}
   else {assert(!result.rejected,result.error);assert.notDeepEqual(result.after,result.before,pathName+': valid mutation did not persist');}
   results.push({scenario:pathName+(locked?'-revoked':'-valid'),status:'PASS'});console.log(JSON.stringify(results.at(-1)));
  }
 }
 for(const kind of ['import','export']){
  const result=await cdp.eval(`(async()=>{
   const kind=${JSON.stringify(kind)};AfaqAdult.lock();AfaqAdult.login('864209');
   let downloads=0,rejected=false,error;
   const click=HTMLAnchorElement.prototype.click,library=window.AfaqAudioLibrary;
   HTMLAnchorElement.prototype.click=function(){downloads++};
   const revoke=()=>{AfaqAdult.lock();AfaqAdult.login('864209')};
   try{
    if(kind==='import'){
     const file=new File([JSON.stringify({format:'afaq-audio-backup-v1',clips:[{id:'text:revoked-import',data:'data:audio/webm;base64,c3ludGhldGlj'}]})],'synthetic.json',{type:'application/json'});
     const text=file.text.bind(file);file.text=async()=>{const value=await text();revoke();return value};
     await audioManagementRegression.importBackup(file);
    }else{
     window.AfaqAudioLibrary={...library,listIds:async()=>{await Promise.resolve();revoke();return ['text:synthetic-backup']}};
     await audioManagementRegression.exportBackup();
    }
   }catch(e){rejected=true;error=e.message}
   finally{HTMLAnchorElement.prototype.click=click;window.AfaqAudioLibrary=library;}
   return{kind,rejected,error,downloads};
  })()`);
  assert(result.rejected,kind+': revoked backup continued');assert.equal(result.downloads,0);
  results.push({scenario:kind+'-revoked-after-await',status:'PASS',evidence:result});console.log(JSON.stringify(results.at(-1)));
 }
 fs.writeFileSync(path.join(stage,'results.json'),JSON.stringify({passed:true,version,results,pageErrors,consoleErrors},null,2));
 assert.equal(pageErrors.length,0,'Unexpected uncaught browser exceptions; see results.json');
 console.log(JSON.stringify({passed:true,scenarios:results.length,evidence:stage}));
})().catch(error=>{console.error(error);console.error('Evidence directory:',stage);process.exitCode=1;}).finally(async()=>{
 if(cdp){try{await cdp.send('Browser.close');}catch{}cdp.ws.close();}else browser?.kill();
 server.close();setTimeout(()=>process.exit(process.exitCode||0),500);
});
