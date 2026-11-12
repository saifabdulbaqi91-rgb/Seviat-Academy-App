(function(){
'use strict';
const letters=['م','ب','ل','د','ن','ر','ص','ف','س','ق','ت','ح'];
const names={م:'الميم',ب:'الباء',ل:'اللام',د:'الدال',ن:'النون',ر:'الراء',ص:'الصاد',ف:'الفاء',س:'السين',ق:'القاف',ت:'التاء',ح:'الحاء'};
const nonJoin=new Set(['د','ر']);
let active=null;
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
const words={م:['مَ','مَالْ','مَنَارْ'],ب:['بَ','بَابْ','لَبَنْ'],ل:['لَ','لَبَنْ','بَلَدْ'],د:['دَ','دَارْ','بَلَدْ'],ن:['نَ','نَارْ','مِنْبَرْ'],ر:['رَ','رَمْلْ','نَارْ'],ص:['صَ','صَفْ','فَصْلْ'],ف:['فَ','فَمْ','فَصْلْ'],س:['سَ','سَمَكْ','سَلَمْ'],ق:['قَ','قَلَمْ','سَقْفْ'],ت:['تَ','تَمْرْ','بِنْتْ'],ح:['حَ','حَبْلْ','مِلْحْ']};
function models(l,skill){
 if(skill==='shape')return [{label:'منفصل',value:l},{label:'أول الكلمة',value:nonJoin.has(l)?l:l+'ـ'},{label:'وسط الكلمة',value:nonJoin.has(l)?'ـ'+l:'ـ'+l+'ـ'},{label:'آخر الكلمة',value:'ـ'+l}].filter((v,i,a)=>a.findIndex(q=>q.value===v.value)===i);
 if(skill==='vowels')return ['َ','ِ','ُ','ْ'].map((v,i)=>({label:['فتحة','كسرة','ضمة','سكون'][i],value:l+v}));
 if(skill==='madd')return [{label:'مد بالألف',value:l+'َا'},{label:'مد بالياء',value:l+'ِي'},{label:'مد بالواو',value:l+'ُو'}];
 if(skill==='syllables')return [{label:'مقطع قصير بالفتحة',value:l+'َ'},{label:'مقطع قصير بالكسرة',value:l+'ِ'},{label:'مقطع قصير بالضمة',value:l+'ُ'},{label:'مقطع طويل بالألف',value:l+'َا'},{label:'مقطع طويل بالواو',value:l+'ُو'},{label:'مقطع طويل بالياء',value:l+'ِي'}];
 return words[l].map(v=>({label:v,value:v}));
}
window.openIndependentWriting=function(){
 if(active?.cleanup)active.cleanup();
 const area=typeof createActivityArea==='function'?createActivityArea():document.getElementById('activityArea');
 if(!area)return;
 area.replaceChildren();area.classList.add('seviat-write-page');
 let letter='م',skill='vowels',mode='copy',selected='مَ',show=true,strokes=[],current=null,painting=false,modelIndex=0;
 const title=el('h2','', '✏️ الكتابة والتدريب');
 const hint=el('p','sw-hint','اختر الحرف والمهارة، ثم اكتب على السبورة. يمكنك إخفاء النموذج في أي وقت.');
 const settings=el('div','sw-settings');
 const makeSelect=(label,opts)=>{const wrap=el('label','sw-field');wrap.append(el('span','',label));const select=el('select');opts.forEach(([v,t])=>{const o=el('option','',t);o.value=v;select.append(o);});wrap.append(select);settings.append(wrap);return select;};
 const letterSel=makeSelect('الحرف',letters.map(l=>[l,l+' — '+names[l]]));
 const skillSel=makeSelect('المهارة',[['shape','أشكال الحرف والاتصال'],['vowels','الحركات القصيرة والسكون'],['madd','المدود'],['syllables','تركيب المقاطع'],['words','الكلمات']]);skillSel.value=skill;
 const modelSel=makeSelect('النموذج',[]);
 const modeSel=makeSelect('نوع التدريب',[['copy','نسخ النموذج'],['trace','تتبع النموذج'],['memory','الكتابة من الذاكرة'],['dictation','إملاء يقرؤه المعلم']]);
 const board=el('div','sw-board');const guide=el('div','sw-guide');const canvas=el('canvas','sw-canvas');board.append(guide,canvas);
 const controls=el('div','sw-controls');
 const btn=(label,fn)=>{const b=el('button','sw-button',label);b.type='button';b.addEventListener('click',fn);controls.append(b);return b;};
 const feedback=el('p','sw-feedback','');
 const sequence=el('div','sw-sequence');sequence.style.cssText='display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:12px;margin:14px 0';
 const prev=el('button','sw-button','◀ السابق');const counter=el('strong','sw-counter','');const next=el('button','sw-button','التالي ▶');
 prev.type=next.type='button';prev.style.minHeight=next.style.minHeight='48px';counter.setAttribute('aria-live','polite');sequence.append(prev,counter,next);
 const ctx=canvas.getContext('2d');let cssWidth=0,cssHeight=0;
 function redraw(){ctx.clearRect(0,0,cssWidth,cssHeight);ctx.strokeStyle='#145e9e';ctx.lineWidth=7;ctx.lineCap='round';ctx.lineJoin='round';for(const stroke of strokes){if(!stroke.length)continue;ctx.beginPath();ctx.moveTo(stroke[0][0]*cssWidth,stroke[0][1]*cssHeight);for(const point of stroke.slice(1))ctx.lineTo(point[0]*cssWidth,point[1]*cssHeight);if(stroke.length===1)ctx.lineTo(stroke[0][0]*cssWidth+.1,stroke[0][1]*cssHeight+.1);ctx.stroke();}}
 function resize(){const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;cssWidth=rect.width;cssHeight=rect.height;const dpr=window.devicePixelRatio||1;canvas.width=Math.round(cssWidth*dpr);canvas.height=Math.round(cssHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);redraw();}
 function refreshGuide(){guide.textContent=selected;guide.style.display=show?'flex':'none';guide.classList.toggle('sw-trace',mode==='trace');visibility.textContent=show?'🙈 إخفاء النموذج':'👁️ إظهار النموذج';}
 function updateCounter(){const total=modelSel.options.length;counter.textContent=total?`${modelIndex+1} من ${total}`:'لا توجد أمثلة';prev.disabled=modelIndex===0;next.disabled=modelIndex>=total-1;}
 function chooseModel(index){const total=modelSel.options.length;if(!total)return;modelIndex=Math.max(0,Math.min(total-1,index));modelSel.selectedIndex=modelIndex;selected=modelSel.value;refreshGuide();clear();updateCounter();}
 function refreshModels(){const values=models(letter,skill);modelSel.replaceChildren();values.forEach(v=>{const o=el('option','',v.label+' — '+v.value);o.value=v.value;modelSel.append(o);});chooseModel(0);}
 function clear(){strokes=[];current=null;redraw();feedback.textContent='';}
 const visibility=btn('🙈 إخفاء النموذج',()=>{show=!show;refreshGuide();});
 btn('🧽 مسح الكتابة',clear);
 btn('↶ تراجع',()=>{if(strokes.length){strokes.pop();redraw();}});
 btn('🔁 إعادة التدريب',clear);
 btn('⛶ ملء الشاشة',()=>{if(!document.fullscreenElement){board.requestFullscreen?.().catch(()=>{});}else document.exitFullscreen?.();});
 btn('✓ انتهيت',()=>{feedback.textContent=strokes.length?'أحسنت! اعرض كتابتك على المعلم، ثم كرر التدريب.':'اكتب على السبورة أولًا.';});
 letterSel.addEventListener('change',()=>{letter=letterSel.value;refreshModels();});skillSel.addEventListener('change',()=>{skill=skillSel.value;refreshModels();});modelSel.addEventListener('change',()=>chooseModel(modelSel.selectedIndex));prev.addEventListener('click',()=>chooseModel(modelIndex-1));next.addEventListener('click',()=>chooseModel(modelIndex+1));modeSel.addEventListener('change',()=>{mode=modeSel.value;show=mode==='copy'||mode==='trace';refreshGuide();clear();});
 function point(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];}
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;painting=true;current=[point(e)];strokes.push(current);canvas.setPointerCapture(e.pointerId);redraw();});
 canvas.addEventListener('pointermove',e=>{if(!painting)return;current.push(point(e));redraw();});
 const stop=()=>{painting=false;current=null;};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
 const note=el('p','sw-note','الكتابة تدريب حر؛ لا تغيّر درجات الاختبارات أو تقييم المعلم. الإملاء يقرؤه المعلم بنفسه.');
 area.append(title,hint,settings,sequence,board,controls,feedback,note);
 const observer=new ResizeObserver(resize);observer.observe(canvas);const fullscreen=()=>requestAnimationFrame(resize);document.addEventListener('fullscreenchange',fullscreen);
 active={cleanup(){observer.disconnect();document.removeEventListener('fullscreenchange',fullscreen);}};
 refreshModels();requestAnimationFrame(resize);area.scrollIntoView({behavior:'smooth',block:'start'});
};
})();

// before-click-fix-marker
document.addEventListener('click', function(e) {
  const card = e.target.closest('[data-stage="writing"]');
  if (!card) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  e.stopPropagation();
  if (typeof window.openIndependentWriting === 'function') {
    window.openIndependentWriting();
  }
}, true);
