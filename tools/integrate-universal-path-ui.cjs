const fs=require('fs');let s=fs.readFileSync('student-journey.js','utf8');
s=s.replace("const state=()=>store.profiles[store.active];",`const state=()=>store.profiles[store.active];
const Path=window.SeviatArabicPath;let catalog=null;
try{if(Path)catalog=Path.createCatalog(R);}catch(error){console.error('تعذر بناء خريطة التعلم',error);}
function learningState(){if(store.active!=='default')return state();try{return E.legacyView(state(),JSON.parse(localStorage.getItem('seviat-unit1-learning-v2')||'{}'),window.Unit1Rules,R);}catch{return state();}}
function pathView(){return catalog?Path.view(catalog,learningState(),R,E,{recommendation:recommendation()}):null;}
function renderPath(view){
 if(!view)return;
 const current=view.worlds.find(w=>w.id===view.currentWorldId),summary=el('section');summary.className='path-current';summary.id='learning-path-current';
 el('p','عالمك الآن',summary);el('h3',current.title,summary);
 const lesson=el('p',view.recommendedLesson?'خطوتك التالية: '+view.recommendedLesson.title:'أحسنت! نختار خطوتك التالية مع المعلم.',summary);lesson.className='path-lesson';lesson.id='path-recommended-lesson';
 el('p',view.progress.completed+' من '+view.progress.total+' خطوات لها أدلة تعلم كافية',summary);
 const map=el('details');map.id='learning-path';el('summary','اكتشف مسارك',map);
 const nav=el('nav',undefined,map);nav.className='path-worlds';nav.setAttribute('aria-label','عوالم التعلم');
 const levels=el('section',undefined,map);levels.className='path-levels';levels.id='path-levels';
 const labels={available:'جاهز للتعلم',completed:'أنجزته بأدلة تعلم',locked:'🔒 خطوة قادمة',planned:'قيد الإعداد',unavailable:'غير متاح بعد'};
 const draw=worldId=>{levels.replaceChildren();for(const b of nav.children){const selected=b.dataset.worldId===worldId;b.setAttribute('aria-pressed',String(selected));}
  const world=view.worlds.find(w=>w.id===worldId);el('h3',world.title,levels);
  const list=el('ol',undefined,levels);let index=0;
  for(const level of view.levels.filter(l=>l.worldId===worldId)){index++;const row=el('li',undefined,list);row.dataset.levelId=level.id;row.dataset.status=level.status;row.className='path-level';
   const title=level.status==='locked'?'خطوة '+index:level.title;const b=button(title,()=>begin(level.sourceActivityId),row);b.disabled=!['available','completed'].includes(level.status);b.dataset.lessonId=level.lessonId||'';b.className='path-level-action';
   el('span',labels[level.status],row);if(level.confirmed)el('span','✓ مراجعة متباعدة مثبتة',row);else if(level.teacherOverride&&level.status==='available')el('span','اختارها لك المعلم',row);
  }
 };
 for(const world of view.worlds){const b=button(world.title+(world.status==='planned'?' — قريبًا':''),()=>draw(world.id),nav);b.dataset.worldId=world.id;b.setAttribute('aria-pressed',String(world.id===view.currentWorldId));}
 draw(view.currentWorldId);
}`);
const start=s.indexOf('function home(){'),end=s.indexOf('// Keep helpers DOM-only',start);if(start<0||end<0)throw Error('home anchors');
s=s.slice(0,start)+`function home(){if(run?.node.optional&&!run.preview&&state().homework!==run.node.id)skippedOptional.add(run.node.id);stop();document.body.dataset.mode='student';hub.hidden=true;entry.hidden=false;document.getElementById('activityArea')?.remove();screen('كل خطوة اكتشاف جديد');el('p','نتعلم قليلًا ونفرح بما نكتشفه.');
 const view=pathView();const done=view?view.progress.completed:R.nodes.filter(n=>!n.optional&&R.evidence(learningState(),n.id)).length;const p=el('progress');p.max=view?view.progress.total:R.nodes.filter(n=>!n.optional).length;p.value=done;p.setAttribute('aria-label','تقدم الرحلة بأدلة التعلم');
 if(broken){el('p','تعذر فتح سجلك. اطلب مساعدة المعلم.');return;}button('تابع رحلتك',()=>begin(),root,'journey-start');renderPath(view);
}
`+s.slice(end);
s=s.replace("return E.recommend(state(),R,Date.now(),excluded);}","return catalog?E.recommendLesson(learningState(),catalog,R,Path,Date.now(),excluded):E.recommend(learningState(),R,Date.now(),excluded);}");
s=s.replace("root,'journey-next');}\nfunction question", "root,'journey-next');button('العودة إلى مساري',home,root,'journey-home');}\nfunction question");
s=s.replace(" button('استراحة',home);\n}"," button('العودة إلى مساري',home,root,'journey-home');\n}");
s=s.replace("'teacher-needed':'تحتاج مراجعة المعلم'","'teacher-needed':'تحتاج مراجعة المعلم','invalid-path':'تحتاج خريطة التعلم إلى مراجعة المعلم'");
s=s.replace('getState:()=>structuredClone(state())','getState:()=>structuredClone(state()),getPath:()=>structuredClone(pathView())');
fs.writeFileSync('student-journey.js',s);
fs.appendFileSync('student-journey.css',`
/* Universal path: navigation metadata only; activities keep their existing Arabic typography. */
.path-current{margin:24px 0;padding:20px;border-radius:20px;background:#edf7f3;text-align:start;border-inline-start:5px solid #23856d}
.path-current h3{font-size:clamp(22px,4vw,30px);margin:8px 0}.path-current p{margin:8px 0}
#learning-path{text-align:start;border:1px solid #c8d8df;border-radius:18px;padding:16px;margin-top:24px}
#learning-path>summary{cursor:pointer;min-height:48px;display:list-item;font-size:20px;font-weight:700}
.path-worlds{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:8px;margin:16px 0}
#journey .path-worlds button{margin:0;background:#f1f5fa;border:1px solid #a4becb;color:#173b70;font-size:17px;white-space:normal;overflow-wrap:anywhere}
#journey .path-worlds [aria-pressed="true"]{border:3px solid #23856d;background:#e6f4ee}
.path-levels ol{list-style:none;padding:0;display:grid;gap:12px}.path-level{padding:12px;border:1px solid #c8d8df;border-radius:16px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:#f8fbfd}
#journey .path-level button{margin:0;flex:1 1 180px;text-align:start;color:#173b70;background:#e7f2fa;border:1px solid #89b1c8;overflow-wrap:anywhere}
.path-level span{font-size:15px}.path-level[data-status="completed"]{border-color:#23856d;background:#edf7f3}.path-level button:disabled{opacity:1;color:#647584!important;background:#edf0f4!important;cursor:default}
.path-lesson,#journey .path-level-action{font-family:'Noto Naskh Arabic',serif;line-height:2;padding-block:10px;overflow:visible}
@media(max-width:420px){#learning-path{padding:12px}.path-level{padding:10px}.path-level span{display:block}.path-current{padding:14px}}
`);