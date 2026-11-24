/* Upgrade only this application's scope. Never delete caches, credentials or learner data. */
(function(){
'use strict';
if(!('serviceWorker' in navigator)||!window.isSecureContext)return;
const hadController=!!navigator.serviceWorker.controller;
let prompted=false;
navigator.serviceWorker.addEventListener('controllerchange',()=>{
 if(!hadController||prompted)return;prompted=true;
 const notice=document.createElement('aside');notice.setAttribute('role','status');notice.style.cssText='position:fixed;bottom:12px;inset-inline:12px;z-index:10001;background:#fff4cf;color:#553500;border:2px solid #a96800;padding:14px;border-radius:12px;font-family:Tajawal,sans-serif';
 notice.append(document.createTextNode('توفرت نسخة أحدث من آفاق. احفظ عملك ثم حدّث الصفحة. '));
 const button=document.createElement('button');button.type='button';button.textContent='تحميل النسخة الجديدة';button.style.minHeight='44px';button.onclick=()=>location.reload();notice.append(button);document.body.append(notice);
});
function failed(){if(document.body?.dataset.experience==='student-testing'){const notice=document.getElementById('testing-notice');if(notice){const p=document.createElement('p');p.textContent='تعذر تحديث عامل التخزين. إذا ظهرت نسخة قديمة، أعد تحميل الصفحة مع الاتصال بالإنترنت.';notice.append(p);}}}
navigator.serviceWorker.register(new URL('sw.js?v=20261124-testing-3',document.baseURI),{scope:new URL('./',document.baseURI).pathname,updateViaCache:'none'}).then(registration=>registration.update()).catch(failed);
})();
