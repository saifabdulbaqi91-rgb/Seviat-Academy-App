(function(){
'use strict';
const menu=document.getElementById('seviat-menu-button'),sidebar=document.getElementById('seviat-sidebar'),overlay=document.getElementById('seviat-menu-overlay');
const PIN='seviat-parent-pin-v1';let expires=0,returnFocus=null;
function isAuthenticated(){return Date.now()<expires;}
function toggle(open){sidebar.style.transform=open?'translateX(0)':'translateX(110%)';sidebar.inert=!open;overlay.style.display=open?'block':'none';menu.setAttribute('aria-expanded',String(open));if(open)document.getElementById('seviat-menu-close').focus();else menu.focus();}
menu.onclick=()=>toggle(true);document.getElementById('seviat-menu-close').onclick=()=>toggle(false);overlay.onclick=()=>toggle(false);sidebar.inert=true;
const dialog=document.createElement('dialog');dialog.id='seviat-parent-panel';dialog.dir='rtl';dialog.style.cssText='width:min(580px,90vw);max-height:85vh;overflow:auto;border:1px solid #7995af;border-radius:16px;padding:20px';dialog.setAttribute('aria-label','إعدادات المعلم وولي الأمر');document.body.append(dialog);
function el(tag,text,parent=dialog){const n=document.createElement(tag);if(text)n.textContent=text;parent.append(n);return n;}
function btn(text,action,id){const b=el('button',text);b.type='button';b.className='primary-button';b.style.cssText='margin:6px;min-height:44px';if(id)b.id=id;b.onclick=action;return b;}
function close(){dialog.close();returnFocus?.focus();}
function requireTeacher(action){if(isAuthenticated()){action();return;}openLogin(action);}
function openLogin(action){
 returnFocus=document.activeElement;toggle(false);dialog.replaceChildren();if(!dialog.open)dialog.showModal();
 el('h2','دخول المعلم وولي الأمر');el('p','قفل محلي لهذا الجهاز فقط. لا يمثل حسابًا آمنًا أو تحققًا من الهوية عبر خادم.');
 let saved;try{saved=localStorage.getItem(PIN);}catch{el('p','تعذر الوصول إلى إعدادات الجهاز.');btn('إغلاق',close);return;}
 el('p',saved?'أدخل رمزك المكون من ستة أرقام.':'الإعداد الأول بواسطة ولي الأمر: اختر رمزًا من ستة أرقام.');
 const label=el('label','الرمز');const input=el('input',null,label);input.id='seviat-parent-pin';input.type='password';input.inputMode='numeric';input.maxLength=6;input.autocomplete='off';
 let confirmation;if(!saved){const lab=el('label','تأكيد الرمز');confirmation=el('input',null,lab);confirmation.id='seviat-parent-pin-confirm';confirmation.type='password';confirmation.inputMode='numeric';confirmation.maxLength=6;}
 const status=el('p');status.setAttribute('role','status');
 btn(saved?'دخول':'إنشاء الرمز',()=>{
 const pin=input.value.trim();if(!/^\d{6}$/.test(pin)){status.textContent='أدخل ستة أرقام.';return;}
 if(saved&&pin!==saved){status.textContent='الرمز غير صحيح.';input.value='';return;}
 if(!saved&&pin!==confirmation.value){status.textContent='الرمزان غير متطابقين.';return;}
 try{if(!saved)localStorage.setItem(PIN,pin);expires=Date.now()+10*60*1000;close();action();}catch{status.textContent='تعذر حفظ الإعدادات.';}
 },'seviat-parent-login');
 btn('إلغاء',close,'seviat-parent-cancel');input.focus();
}
async function showControls(){
 if(!isAuthenticated())return requireTeacher(showControls);
 returnFocus=document.activeElement;dialog.replaceChildren();if(!dialog.open)dialog.showModal();
 el('h2','إتاحة الأنشطة');el('p','السماح بالنشاط لا يتجاوز متطلبات التدرج. الخيارات التفصيلية مستقلة للتدريب والاختبار. التقييم الكتابي بشري دون نقاط.');
 let draft=structuredClone(window.SeviatAccessGuard.getPolicy());
 if(draft.error){el('p',draft.error);btn('إغلاق',close);return;}
 const labels={preparation:'التهيئة والاستعداد',letters:'الحروف',movements:'الحركات والمدود',combination:'التحليل والتركيب',writing:'الكتابة',games:'الألعاب'};
 const general=el('div');general.id='seviat-general-access';
 const ids=[...Object.keys(labels),...Unit1Rules.letters.map(l=>'letter:'+l)];
 function renderGeneral(){
 general.replaceChildren();
 for(const id of ids){const label=el('label',null,general);label.style.cssText='display:flex;gap:10px;align-items:center;min-height:44px';const c=el('input',null,label);c.type='checkbox';c.dataset.coarseId=id;c.checked=draft.coarse.mode==='all'||draft.coarse.allowed.includes(id);label.append(document.createTextNode(labels[id]||'حرف '+id.slice(7)));
 c.onchange=()=>{if(draft.coarse.mode==='all'){draft.coarse.mode='custom';draft.coarse.allowed=[...new Set([...draft.coarse.allowed,...ids])];}draft.coarse.allowed=c.checked?[...new Set([...draft.coarse.allowed,id])]:draft.coarse.allowed.filter(x=>x!==id);};}
 }
 renderGeneral();let tree;
 const status=el('p');status.setAttribute('role','status');
 btn('فتح الجميع',()=>{draft.coarse={...draft.coarse,mode:'all'};draft.detailed={...draft.detailed,mode:'all'};renderGeneral();tree?.querySelectorAll('input').forEach(i=>i.checked=true);},'seviat-allow-all');
 btn('إغلاق الجميع',()=>{draft.coarse={...draft.coarse,mode:'custom',allowed:[]};draft.detailed={...draft.detailed,mode:'custom',allowed:[]};renderGeneral();tree?.querySelectorAll('input').forEach(i=>i.checked=false);},'seviat-deny-all');
 const openTree=btn('التحكم التفصيلي في المهارات',async()=>{
 if(tree){tree.scrollIntoView();return;}
 openTree.disabled=true;
 try{const catalog=await SeviatAccessTree.loadCatalog();if(!dialog.open||!isAuthenticated())return;tree=SeviatAccessTree.createTree(catalog,draft);dialog.insertBefore(tree,status);tree.scrollIntoView();}
 catch(error){status.textContent=error.message;}finally{openTree.disabled=false;}
 },'seviat-open-access-tree');
 btn('حفظ وتفعيل',()=>{
 try{if(!isAuthenticated())throw Error('انتهت جلسة المعلم؛ أغلق الإعدادات وسجّل الدخول مجددًا.');
 if(tree)draft.detailed=SeviatAccessTree.readTree(tree,draft.detailed);
 SeviatAccessGuard.save(draft);close();
 }catch(error){status.textContent=error.message;}
 },'seviat-save-access');
 btn('إلغاء دون حفظ',close,'seviat-parent-cancel');
 btn('إنهاء جلسة المعلم',()=>{expires=0;close();},'seviat-parent-logout');
}
document.getElementById('seviat-parent-settings').onclick=()=>requireTeacher(showControls);
document.addEventListener('keydown',e=>{if(e.key==='Escape')toggle(false);});
window.SeviatParentControls={isAuthenticated,requireTeacher,getAccess:()=>SeviatAccessGuard.getPolicy().coarse,isAllowed:id=>SeviatAccessGuard.coarseAllowed(id)};
})();
