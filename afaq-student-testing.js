(function(host){
'use strict';
const root=document.getElementById('student-testing'),bridge=host.AfaqQuestionBankBridge,renderer=host.AfaqQuestionBankActivities;
let lessons=[],unit=1,lesson=null,skill='all',questions=[],position=0,epoch=0,audioNote='جارٍ تجهيز الصوت…';
function el(tag,text,parent=root){const node=document.createElement(tag);if(text!=null)node.textContent=text;if(parent)parent.append(node);return node;}
function button(text,action,parent=root){const b=el('button',text,parent);b.type='button';b.onclick=action;return b;}
function stop(){epoch++;host.AfaqQuestionAudio?.stop();}
function route(){const p=new URLSearchParams(location.hash.slice(1));unit=Number(p.get('unit'))||1;lesson=lessons.find(l=>l.id===p.get('lesson')&&l.unitId===unit)||null;skill=p.get('skill')||'all';const id=p.get('question');questions=lesson?bridge.questionsForLesson(lesson.id).filter(q=>skill==='all'||q.skill===skill):[];position=Math.max(0,questions.findIndex(q=>q.id===id));render();}
function navigate(next){const p=new URLSearchParams();p.set('unit',String(next.unit??unit));if(next.lesson)p.set('lesson',next.lesson);if(next.skill&&next.skill!=='all')p.set('skill',next.skill);if(next.question)p.set('question',next.question);const hash='#'+p;if(next.question&&next.lesson===lesson?.id&&(next.skill||'all')===skill){history.replaceState(null,'',hash);route();}else if(location.hash===hash)route();else location.hash=hash;}
function heading(text){const h=el('h2',text);h.tabIndex=-1;h.focus({preventScroll:true});return h;}
function render(){
 stop();root.replaceChildren();root.setAttribute('aria-busy','false');
 const nav=el('nav');nav.setAttribute('aria-label','وحدات المنهج للاختبار');
 for(let id=1;id<=8;id++){const item=lessons.find(l=>l.unitId===id);const b=button('الوحدة '+id+' — '+(item?.unitTitle||''),()=>navigate({unit:id}),nav);b.dataset.unit=String(id);b.setAttribute('aria-pressed',String(id===unit));}
 const sound=button(host.AfaqTestingAudio.settings().muted?'تشغيل الصوت':'كتم الصوت',()=>{host.AfaqTestingAudio.setMuted(!host.AfaqTestingAudio.settings().muted);sound.textContent=host.AfaqTestingAudio.settings().muted?'تشغيل الصوت':'كتم الصوت';sound.setAttribute('aria-pressed',String(host.AfaqTestingAudio.settings().muted));});sound.id='testing-sound';sound.setAttribute('aria-pressed',String(host.AfaqTestingAudio.settings().muted));
 el('p','١١٩٠ سؤالًا للاختبار فقط — لا حفظ للدرجات أو التقدم. '+audioNote).id='testing-summary';
 if(!lesson){heading('دروس الوحدة '+unit);const list=el('ol');list.className='testing-lessons';for(const l of lessons.filter(l=>l.unitId===unit)){const row=el('li',null,list),items=bridge.questionsForLesson(l.id);const b=button(l.title,()=>navigate({unit,lesson:l.id}),row);b.dataset.lesson=l.id;el('small',items.length+' سؤالًا — اختبار دون اعتماد رسمي',b);}if(!list.children.length)el('p','هذه الوحدة غير موجودة. اختر وحدة من القائمة.');return;}
 const back=button('العودة إلى دروس الوحدة',()=>navigate({unit}));back.id='testing-back';
 heading(lesson.title);el('p','محتوى تجريبي؛ فتح الدرس هنا لا يفتح أي درس في التعلم الرسمي.').className='testing-review';
 const filters=el('div');filters.className='testing-filters';const label=el('label','المهارة',filters),select=el('select',null,label);select.id='testing-skill';
 const all=bridge.questionsForLesson(lesson.id),skills=[...new Set(all.map(q=>q.skill))];
 for(const value of ['all',...skills]){const option=el('option',value==='all'?'كل المهارات':all.find(q=>q.skill===value)?.objective||value,select);option.value=value;}
 if(!skills.includes(skill)&&skill!=='all'){skill='all';questions=all;position=0;}
 select.value=skill;select.onchange=()=>navigate({unit,lesson:lesson.id,skill:select.value});
 const jumpLabel=el('label','السؤال',filters),jump=el('select',null,jumpLabel);jump.id='testing-question-jump';questions.forEach((q,i)=>{const option=el('option',(i+1)+' — '+q.objective+' — '+renderer.types[q.type],jump);option.value=q.id;});jump.value=questions[position]?.id||'';jump.onchange=()=>navigate({unit,lesson:lesson.id,skill,question:jump.value});
 if(!questions.length){el('p','لا توجد أسئلة لهذه المهارة؛ لن نعرض أسئلة من درس آخر.');return;}
 const q=questions[position],token=epoch,card=el('section');card.className='testing-card';card.dataset.questionId=q.id;
 el('p','السؤال '+(position+1)+' من '+questions.length+' — '+q.objective,card).className='testing-meta';
 el('p',q.reviewStatus==='teacher-reviewed'?'مراجع في المصدر — هذه المحاولة اختبارية فقط':'غير معتمد — بانتظار مراجعة معلم لغة عربية مؤهل',card).className='testing-review';
 const activity=el('div',null,card),feedback=el('p','',card);feedback.id='testing-feedback';feedback.setAttribute('role','status');
 if(!renderer.types[q.type])el('p','نوع النشاط غير مدعوم حاليًا: '+q.type,activity);
 else renderer.mount(activity,q,receipt=>{if(token!==epoch)return;host.SeviatEffects?.play(q.type==='single-choice'?(receipt.response===q.correctAnswer?'correct':'wrong'):q.type==='construction'?(receipt.response?.correct?'correct':'wrong'):'complete');activity.querySelectorAll('button,textarea').forEach(b=>b.disabled=true);if(q.type==='single-choice')feedback.textContent=receipt.response===q.correctAnswer?'أحسنت، إجابة صحيحة في هذه التجربة.':'حاول مجددًا أو راجع المهارة مع المعلم.';else if(q.type==='construction')feedback.textContent=receipt.response?.correct?'تركيب صحيح في هذه التجربة.':'راجع التركيب مع المعلم.';else feedback.textContent='انتهت التجربة؛ يحتاج الأداء إلى ملاحظة المعلم، دون تصحيح آلي أو إتقان رسمي.';});
 const actions=el('div');actions.className='testing-actions';const go=i=>navigate({unit,lesson:lesson.id,skill,question:questions[i].id});const previous=button('السابق',()=>go(position-1),actions);previous.disabled=position===0;previous.id='testing-previous';button('إعادة التجربة',render,actions).id='testing-retry';const next=button('التالي',()=>go(position+1),actions);next.disabled=position===questions.length-1;next.id='testing-next';
}
async function start(){try{await bridge.load();lessons=bridge.curriculumLessons();if(lessons.length!==40)throw Error('Incomplete curriculum');audioNote='الصوت المسجل المعتمد له الأولوية. قد لا يتوفر صوت لبعض البنود؛ استعن بالمعلم.';route();try{await host.AfaqQuestionAudioBridge.load('data/question-bank-audio-plan.json?v=20261124-testing-3');}catch{audioNote='تعذر تجهيز بعض أوامر الصوت. يمكنك اختبار العرض والاستعانة بالمعلم.';const summary=document.getElementById('testing-summary');if(summary)summary.textContent='١١٩٠ سؤالًا للاختبار فقط. '+audioNote;}}catch(error){root.replaceChildren();root.setAttribute('aria-busy','false');el('p','تعذر تحميل منهج الاختبار. لم يتغير تقدمك. تحقق من الاتصال ثم أعد المحاولة.').setAttribute('role','alert');button('إعادة المحاولة',start);console.error('AFAQ testing load failed',error);}}
host.addEventListener('hashchange',()=>{if(lessons.length)route();});host.addEventListener('pagehide',stop);void start();
})(window);
