/* Local child barrier, not a security boundary against browser owners. */
(function(host){'use strict';
function createSession({storage,now=Date.now,schedule=setTimeout,cancel=clearTimeout,onLock=()=>{},duration=600000}){
 let expires=0,timer=null,failed=0,retryAt=0;
 function lock(){const active=expires!==0;expires=0;if(timer!==null)cancel(timer);timer=null;if(active)onLock();}
 function authenticated(){if(expires&&now()>=expires)lock();return expires>now();}
 function assert(){if(!authenticated())throw Error('يلزم دخول المعلم أو ولي الأمر.');}
 function credential(){const parent=storage.getItem('seviat-parent-pin-v1'),owner=storage.getItem('afaq-owner-audio-pin');
  const value=parent!==null?parent:owner;if(value!==null&&!/^\d{6,}$/.test(value))throw Error('رمز الجهاز غير قابل للقراءة؛ لم يتغير الأصل.');return value;}
 function login(pin){if(now()<retryAt)throw Error('انتظر قليلًا قبل إعادة محاولة الدخول.');const saved=credential();if(saved===null||typeof pin!=='string'||pin!==saved){failed++;if(failed>=5)retryAt=now()+30000;return false;}failed=0;retryAt=0;lock();expires=now()+duration;timer=schedule(lock,duration);return true;}
 return {assert,authenticated,hasCredential:()=>credential()!==null,login,lock};
}
if(typeof module!=='undefined'){module.exports={createSession};return;}
const session=createSession({storage:{getItem:key=>host.localStorage.getItem(key)},onLock(){
 host.dispatchEvent(new Event('afaq-adult-locked'));
}});
function requireAdult(action){if(session.authenticated())return action();if(!host.SeviatParentControls)throw Error('تعذر تجهيز قفل البالغين.');return host.SeviatParentControls.requireTeacher(action);}
Object.defineProperty(host,'AfaqAdult',{value:Object.freeze({...session,require:requireAdult}),writable:false,configurable:false});
host.addEventListener('focus',()=>session.authenticated());
host.addEventListener('storage',e=>{if(e.key===null||['seviat-parent-pin-v1','afaq-owner-audio-pin'].includes(e.key))session.lock();});
host.addEventListener('afaq-adult-locked',()=>{
 try{host.AfaqSpeech?.dispose();}catch{}try{host.AfaqAudioLibrary?.dispose();}catch{}
 for(const id of ['seviat-parent-panel','afaq-smart-audio-panel','afaq-audio-library']){
  const el=document.getElementById(id);if(el?.tagName==='DIALOG')el.close();else el?.remove();
 }
 const hub=document.getElementById('teacherHub');if(hub){hub.hidden=true;hub.replaceChildren();}
 if(['teacher','adult-preview'].includes(document.body?.dataset.mode))host.SeviatJourney?.home();
});
new MutationObserver(()=>{if(document.body?.dataset.mode==='student')session.lock();})
 .observe(document.body,{attributes:true,attributeFilter:['data-mode']});
})(typeof window==='undefined'?globalThis:window);
