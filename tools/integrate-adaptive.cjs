'use strict';
const fs=require('fs');
function change(file,replacements){let text=fs.readFileSync(file,'utf8');for(const [before,after]of replacements){if(!text.includes(before))throw Error('Expected integration point missing in '+file+': '+before.slice(0,60));text=text.replace(before,after);}fs.writeFileSync(file,text,'utf8');}
change('index.html',[[ '<script src="journey-rules.js"></script><script src="student-journey.js"></script>', '<script src="journey-rules.js"></script><script src="adaptive-learning.js"></script><script src="student-journey.js"></script>' ]]);
change('journey-rules.js',[[ 'nodes.push(...prep);', `nodes.push(...prep);
for(const unit of [1,2])nodes.push({id:'word-game:'+unit,kind:'word-game',skill:'word-building',unit,optional:true,title:'لعبة تركيب الكلمات — '+unit,requires:letters.slice(0,unit*6).map(l=>l+':syllable-building')});` ]]);
change('student-journey.js',[
 ["const R=SeviatJourneyRules,KEY=", "const R=SeviatJourneyRules,E=window.SeviatAdaptive,KEY="],
 ["'word-reading':'قراءة الكلمات'};", "'word-reading':'قراءة الكلمات','word-building':'تركيب الكلمات'};"],
 ["let store,broken=false,run=null,timer=null,epoch=0;", "let store,broken=false,run=null,timer=null,epoch=0;\nlet latestRecommendation=null;"],
 [" if(node.kind==='preparation')return preparationPool(node);", " if(node.kind==='word-game')return wordGamePool(node,preview);\n if(node.kind==='preparation')return preparationPool(node);"],
 [" if(node.supervised&&node.unit===2&&node.skill==='word-reading')return [];", " if(node.supervised&&node.unit===2&&['word-reading','letter-sound'].includes(node.skill))return [];"],
 ["stop();document.body.dataset.mode='student';hub.hidden=true;entry.hidden=false;const node=id?R.nodes.find(n=>n.id===id):R.nodes.find(n=>n.id===state().homework&&state().overrides?.[n.id]!=='lock')||R.next(state());", "stop();document.body.dataset.mode='student';hub.hidden=true;entry.hidden=false;latestRecommendation=E.recommend(state(),R);const node=id?R.nodes.find(n=>n.id===id):R.nodes.find(n=>n.id===latestRecommendation.nodeId);"],
 ["R.nodes.every(n=>R.complete(state(),n.id))", "R.nodes.filter(n=>!n.optional).every(n=>R.complete(state(),n.id))"],
 ["SeviatWritingActivity(target,root);", "if(!preview&&!contentAllowed(target,node)){el('p','نتعلم هذه الخطوة مع المعلم.');button('العودة',home);return;}SeviatWritingActivity(target,root);"],
 ["let qs=pool(node,preview);", "let qs=pool(node,preview);if(!preview)qs=safePool(qs,node);"],
 ["teacherReview:q.teacherReview});", "teacherReview:true,scaffold:true});"],
 [" const weakness=state().runs.filter(r=>r.node===node.id).flatMap(r=>r.results.filter(x=>!x.correct).map(x=>x.id));\n if(state().difficulty==='supported')qs=qs.map(q=>({...q,teacherReview:true,options:[q.answer,...q.options.filter(x=>x!==q.answer).slice(0,1)]}));\n const ordered=[...qs].sort(()=>Math.random()-.5).sort((a,b)=>Number(weakness.includes(b.id))-Number(weakness.includes(a.id)));\n run={node,preview,questions:ordered.slice(0,5),results:[],index:0,phase:'intro',id:crypto.randomUUID()};intro();", " const sessionId=crypto.randomUUID(),plan=preview?{mode:'preview',count:5,difficulty:'standard'}:E.planSession(state(),node);\n const ordered=E.selectQuestions(state(),node.id,qs,{count:plan.count,difficulty:plan.difficulty,seed:sessionId});\n if(!ordered.length){screen('لنتعلم معًا');button('العودة',home);return;}\n const prepared=ordered.map(q=>({...q,taskKey:E.taskKey(q),duration:q.memory&&plan.difficulty==='stretch'?Math.max(1500,(q.duration||2500)*.8):q.duration,...(plan.difficulty==='supported'?{teacherReview:true,options:[q.answer,...q.options.filter(x=>x!==q.answer).slice(0,1)]}:{})}));\n run={node,preview,plan,questions:prepared,results:[],index:0,phase:'intro',id:sessionId};intro();"],
 ["function intro(){screen('هيا نكتشف');", "function intro(){screen(run.plan.mode==='diagnostic'?'لنكتشف ما تعرفه':'هيا نكتشف');"],
 ["()=>question(true),root,'journey-next'", "()=>question(!['assessment','diagnostic'].includes(run.plan.mode)),root,'journey-next'"],
 ["active.index<4?'دورك الآن':'خطوة أخيرة'", "active.index<active.questions.length-1?'دورك الآن':'خطوة أخيرة'"],
 ["progress.max=5;", "progress.max=active.questions.length;"],
 ["active.results.push({id:q.id,correct});active.index++;if(active.index===5)finish();", "active.results.push({id:q.id,correct,taskKey:q.taskKey,subskill:q.subskill||((q.skill==='short-vowels'||q.skill==='long-vowels')?SeviatAccessGuard.subskill(q):'all'),verified:!q.teacherReview&&!q.scaffold,evidenceEligible:!q.teacherReview&&!q.scaffold,assisted:planAssisted(active)});active.index++;if(active.index===active.questions.length)finish();"],
 ["function reviewNode(node)", "function planAssisted(active){return active.plan.difficulty==='supported'||active.node.supervised===true;}\nfunction reviewNode(node)"],
 ["independent:!active.preview&&!active.questions.some(q=>q.teacherReview),completedAt:", "independent:!active.preview&&!planAssisted(active)&&active.questions.some(q=>!q.teacherReview&&!q.scaffold),evidenceVersion:2,mode:active.plan.mode,difficulty:active.plan.difficulty,completedAt:"],
 ["if(R.complete(state(),active.node.id)&&homework===active.node.id)", "if(E.progressReady(state(),active.node.id)&&homework===active.node.id)"],
 ["el('p','أنجزت خمس خطوات. '+", "el('p','أنجزت '+record.results.length+' خطوات. '+"],
 ["const completed=R.complete(state(),active.node.id);", "const completed=E.progressReady(state(),active.node.id)||state().overrides?.[active.node.id]==='allow';"],
 ["if(completed)begin();else begin(active.node.id);", "if(completed||active.plan.mode==='diagnostic'||E.recommend(state(),R).reason==='varied-practice')begin();else begin(active.node.id);"],
 ["[['standard','مستقل'],['supported','خيارات أقل مع دعم']]", "[['auto','تلقائي حسب الأدلة'],['standard','مستقل'],['supported','خيارات أقل مع دعم']]"],
 ["difficulty.value=state().difficulty||'standard';", "difficulty.value=state().difficulty||'auto';"],
 [" const correctThreshold=", " const sessionMode=select(hub,'نوع الجلسة ',[['auto','تلقائي'],['practice','تدريب'],['diagnostic','تشخيص قصير'],['assessment','تقييم مستقل']]);sessionMode.value=state().sessionMode||'auto';sessionMode.onchange=()=>{state().sessionMode=sessionMode.value;save();};\n const correctThreshold="],
 [" const report=el('pre',undefined,hub);", " renderAdaptiveReport();\n const report=el('pre',undefined,hub);"],
 ["proposedNext:R.next(state())?.id||null", "proposedNext:E.recommend(state(),R)"],
 ["window.SeviatJourney={home,teacher,begin,getState:", "window.SeviatJourney={home,teacher,begin,recommend:()=>E.recommend(state(),R),getState:"]
]);
