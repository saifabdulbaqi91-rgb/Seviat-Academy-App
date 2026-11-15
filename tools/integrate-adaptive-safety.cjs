'use strict';
const fs=require('fs');
const file='student-journey.js';let source=fs.readFileSync(file,'utf8');
const helpers=`
function learnedLetters(node){
 const known=new Set(R.letters.filter(letter=>R.complete(state(),letter+':letter-shape')));
 if(node.letter)known.add(node.letter);
 if(['long-vowels','syllable-building','word-building','word-writing','word-reading'].includes(node.skill)||R.letters.some(letter=>R.complete(state(),letter+':long-vowels')))known.add('ا');
 return known;
}
function contentAllowed(value,node){const known=learnedLetters(node);return [...String(value).replace(/[أإآ]/g,'ا')].filter(c=>/[ء-ي]/.test(c)).every(c=>known.has(c));}
function safePool(bank,node){
 return bank.filter(q=>!q.requiredLetters||q.requiredLetters.every(l=>l===node.letter||R.complete(state(),l+':syllable-building'))).flatMap(q=>{
  if(node.unit!==2&&node.kind!=='word-game')return [q];
  if(!contentAllowed(q.answer,node))return [];
  let options=q.options.filter(value=>contentAllowed(value,node));
  if(options.length<2&&['letter-shape','letter-name'].includes(node.skill))options=[q.answer,...[...learnedLetters(node)].filter(l=>l!==q.answer).slice(0,2)];
  options=[...new Set(options)];
  return options.length>=2?[{...q,options}]:[];
 });
}
function wordGamePool(node,preview){
 let words=node.unit===1?(questionsData.writingActivities||[]).filter(a=>a.skill==='word-writing').map(a=>a.target):R.letters.slice(6).flatMap(letter=>window.SeviatWritingModels?.words[letter]||[]);
 words=[...new Set(words)].filter(word=>preview||contentAllowed(word,node)).sort();
 if(words.length<3)return [];
 const segmenter=new Intl.Segmenter('ar',{granularity:'grapheme'});
 return words.map((word,i)=>({id:node.id+':'+i,unit:node.unit,skill:'word-building',operation:'word-build',prompt:'ركّب الكلمة من البطاقات',stimulus:[...segmenter.segment(word)].map(x=>x.segment).join(' | '),answer:word,options:[word,words[(i+1)%words.length],words[(i+2)%words.length]]}));
}
function renderAdaptiveReport(){
 const recommendation=E.recommend(state(),R),reasons={'teacher-assignment':'واجب حدده المعلم','targeted-review':'مراجعة الأخطاء المتكررة','evidence-review':'تحتاج المهارة دليلًا مستقلاً إضافيًا','spaced-review':'حان موعد المراجعة المتباعدة','varied-practice':'تنويع بتحدٍ قصير','next':'الخطوة التالية في المسار','teacher-needed':'تحتاج مراجعة المعلم'};
 const nextNode=R.nodes.find(n=>n.id===recommendation.nodeId);
 el('h3','توصية المحرك',hub);el('p',(nextNode?(nextNode.letter||'')+' '+(titles[nextNode.skill]||nextNode.title):'استراحة')+' — '+reasons[recommendation.reason],hub);
 const labels={'not-started':'لم يبدأ','learning':'قيد التعلم','needs-support':'يحتاج دعمًا','progress-ready':'جاهز للانتقال وفق الأدلة','confirmed':'إتقان مثبت بأدلة متباعدة'};
 const table=el('table',undefined,hub);table.className='adaptive-report';const head=el('tr',undefined,el('thead',undefined,table));for(const title of ['المهارة','الدليل','الدقة الحديثة','مستقل / بمساعدة','ما يحتاج مراجعة'])el('th',title,head);
 const body=el('tbody',undefined,table);
 for(const node of R.nodes){const summary=E.mastery(state(),node.id);if(summary.status==='not-started')continue;const row=el('tr',undefined,body);for(const value of [(node.letter||'')+' '+(titles[node.skill]||node.title),labels[summary.status],summary.recentAccuracy===null?'—':Math.round(summary.recentAccuracy*100)+'٪',summary.independentAttempts+' / '+summary.assistedAttempts,summary.weakSubskills.join('، ')||'—'])el('td',value,row);}
 el('p','الاستجابة السريعة لا تثبت الإتقان. التشخيص القصير والدعم والكتابة والصوت غير المتحقق لا يمنحون إتقانًا مستقلاً. الإتقان المثبت يتطلب تقييمين مستقلين متباعدين ٢٤ ساعة وتغطية المهارات الفرعية.',hub);
}
`;
if(!source.includes('function pool(node,preview=false){'))throw Error('Missing pool integration point');
source=source.replace('function pool(node,preview=false){',helpers+'\nfunction pool(node,preview=false){');
source=source.replace("n.title&&n.id.startsWith('prep:')?n.title", "n.title&&(n.id.startsWith('prep:')||n.kind==='word-game')?n.title");
fs.writeFileSync(file,source,'utf8');
const rules='journey-rules.js';let text=fs.readFileSync(rules,'utf8');const hook='function evidence(state,id){';if(!text.includes(hook))throw Error('Missing evidence hook');text=text.replace(hook,hook+"if(host.SeviatAdaptive&&(state.runs||[]).some(r=>r.node===id&&r.evidenceVersion===2)){const legacy={...state,runs:(state.runs||[]).filter(r=>r.evidenceVersion!==2)};return evidence(legacy,id)||host.SeviatAdaptive.progressReady(state,id);}");fs.writeFileSync(rules,text,'utf8');
fs.appendFileSync('student-journey.css','\n.adaptive-report{width:100%;border-collapse:collapse;font-size:15px}.adaptive-report th,.adaptive-report td{padding:10px;border-bottom:1px solid #b8cad8;text-align:start;overflow-wrap:anywhere}#teacherHub{overflow-x:auto}\n');
