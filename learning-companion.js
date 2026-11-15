/* Original code-native sprout companion; no recordings or instructional speech. */
(function(){
'use strict';
const messages={idle:'كل خطوة تقوّيك.',welcome:'أهلًا! نكتشف معًا.',success:'أحسنت! خطوة جميلة.',retry:'لا بأس، ننظر مرة أخرى.',hint:'خذ وقتك وابحث عن النموذج.',celebration:'أنهيت تدريبك!','level-completion':'جاهز لخطوة جديدة!'};
function create(){
 const element=document.createElement('aside');element.className='learning-companion';element.setAttribute('aria-label','رفيق التعلم');element.dataset.state='idle';element.dataset.motion='on';
 element.innerHTML='<svg class="companion-sprout" viewBox="0 0 100 100" role="img" aria-label="نبتة مرحة، رفيق التعلم"><g class="companion-body"><path d="M50 33 Q35 9 17 19 Q22 40 50 37" fill="#47a888"/><path d="M50 31 Q69 6 85 18 Q80 40 50 37" fill="#75c2a1"/><path d="M50 22 V43" stroke="#257e69" stroke-width="5" stroke-linecap="round"/><rect x="19" y="38" width="62" height="49" rx="22" fill="#ffd98e" stroke="#ae752e" stroke-width="2"/><ellipse class="companion-eye" cx="37" cy="57" rx="3.5" ry="5" fill="#173b70"/><ellipse class="companion-eye" cx="63" cy="57" rx="3.5" ry="5" fill="#173b70"/><path class="companion-mouth" d="M39 70 Q50 80 61 70" fill="none" stroke="#173b70" stroke-width="3" stroke-linecap="round"/><circle cx="28" cy="68" r="5" fill="#f5ae91"/><circle cx="72" cy="68" r="5" fill="#f5ae91"/></g></svg>';
 const text=document.createElement('p');text.className='companion-message';text.textContent=messages.idle;element.append(text);
 return {element,setState(state,message){if(!Object.hasOwn(messages,state))state='idle';element.dataset.state=state;text.textContent=message||messages[state];},setAnimations(enabled){element.dataset.motion=enabled?'on':'off';},get state(){return element.dataset.state;}};
}
window.SeviatCompanion={version:1,create,states:Object.keys(messages)};
})();