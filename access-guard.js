/* Local prototype policy. This is not server-side authorization. */
(function(){
'use strict';
const KEY='seviat-access-policy-v2',coarseKey='seviat-access-v1',detailKey='seviat-detailed-access-v1';
const categories=['preparation','letters','movements','combination','writing','games'];
function read(key){const raw=localStorage.getItem(key);return raw===null?null:JSON.parse(raw);}
function validList(x){return x&&Array.isArray(x.allowed)&&x.allowed.every(v=>typeof v==='string');}
function getPolicy(){
 try{
  const saved=read(KEY);
  if(saved!==null){
   if(saved.version!==2||!validList(saved.coarse)||!['all','custom'].includes(saved.coarse.mode)||!validList(saved.detailed)||!['all','custom'].includes(saved.detailed.mode))throw Error('صيغة إعدادات غير معروفة');
   return saved;
  }
  const coarse=read(coarseKey),detail=read(detailKey);
  if(coarse!==null&&(!validList(coarse)||!['all','custom'].includes(coarse.mode)))throw Error('إعدادات عامة غير قابلة للقراءة');
  if(detail!==null&&!validList(detail))throw Error('إعدادات تفصيلية غير قابلة للقراءة');
  return {version:2,coarse:coarse||{mode:'all',allowed:[]},detailed:detail?{...detail,mode:'custom'}:{mode:'all',allowed:[]}};
 }catch(error){return {error:'تعذر قراءة الصلاحيات؛ لم تتغير البيانات الأصلية. '+error.message,coarse:{mode:'custom',allowed:[]},detailed:{mode:'custom',allowed:[]}};}
}
const accessId=(l,s,sub='all',mode='practice',unit='unit-1')=>[unit,l,s,sub||'all',mode].join('/');
function category(s){return /writing/.test(s)?'writing':['short-vowels','long-vowels','sukoon'].includes(s)?'movements':['sound-analysis','syllable-building'].includes(s)?'combination':'letters';}
function coarseAllowed(id,policy=getPolicy()){return !policy.error&&(policy.coarse.mode==='all'||policy.coarse.allowed.includes(id));}
function isAllowed(l,s,sub,mode,unit='unit-1'){
 if(!['practice','assessment'].includes(mode)||!l||!s)return false;
 const p=getPolicy();if(p.error)return false;
 if(!coarseAllowed('letter:'+l,p)||!coarseAllowed(category(s),p))return false;
 return p.detailed.mode==='all'||p.detailed.allowed.includes(accessId(l,s,sub,mode,unit))||
   (sub!=='all'&&p.detailed.allowed.includes(accessId(l,s,'all',mode,unit)));
}
function subskill(q){
 if(q.skill==='short-vowels')return ({'َ':'fatha','ِ':'kasra','ُ':'damma'})[[...q.answer].find(c=>'َُِ'.includes(c))]||'unmapped';
 if(q.skill==='long-vowels')return ({'ا':'alif','و':'waw','ي':'ya'})[q.answer.at(-1)]||'unmapped';
 return q.subskill||'all';
}
function filterQuestions(qs,l,s,mode){return qs.filter(q=>q.letter===l&&q.skill===s&&subskill(q)!=='unmapped'&&isAllowed(l,s,subskill(q),mode,'unit-'+(q.unit||1)));}
function save(policy){
 if(!window.SeviatParentControls?.isAuthenticated())throw Error('يلزم دخول المعلم أو ولي الأمر.');
 if(getPolicy().error)throw Error('الإعدادات الأصلية غير قابلة للقراءة؛ لا يمكن الكتابة فوقها.');
 if(!validList(policy.coarse)||!validList(policy.detailed)||!['all','custom'].includes(policy.coarse.mode)||!['all','custom'].includes(policy.detailed.mode))throw Error('Invalid policy');
 localStorage.setItem(KEY,JSON.stringify({...policy,version:2,updatedAt:Date.now()}));
 window.dispatchEvent(new CustomEvent('seviat-access-changed'));
}
function denied(){showMessage('النشاط غير متاح','هذا النشاط مغلق من إعدادات المعلم أو ولي الأمر، أو لم تُجتز متطلباته بعد.');}
window.addEventListener('storage',event=>{if([KEY,coarseKey,detailKey].includes(event.key)||event.key===null)window.dispatchEvent(new CustomEvent('seviat-access-changed'));});
window.SeviatAccessGuard={getPolicy,accessId,isAllowed,filterQuestions,subskill,category,coarseAllowed,save,denied,categories};
})();
