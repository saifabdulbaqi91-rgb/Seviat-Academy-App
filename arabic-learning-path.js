/* Versioned curriculum mapping and presentation model. No storage, questions or second adaptive engine. */
(function(host){
'use strict';
const domain=(id,title,category='language')=>({id,kind:'domain',version:1,title,category});
const domains=[domain('reading','القراءة'),domain('writing','الكتابة'),domain('listening','الاستماع'),domain('speaking','التحدث'),domain('comprehension','الفهم والتحليل'),domain('foundations','الاستعداد للتعلم','support')];
const skills=[
 ['visual-discrimination','التمييز البصري',['foundations']],['attention','الانتباه',['foundations']],['memory','الذاكرة',['foundations']],['sequencing','التسلسل',['foundations']],['auditory-discrimination','التمييز السمعي',['listening']],
 ['letter-recognition','تمييز الحروف',['reading']],['letter-position','أشكال الحروف واتصالها',['reading','writing']],['letter-search','تمييز الحرف في سياق',['reading','comprehension']],['letter-naming','أسماء الحروف',['reading','speaking']],['letter-sound','صوت الحرف',['listening','speaking']],
 ['short-vowels','الحركات القصيرة',['reading','listening']],['sukoon','السكون',['reading','listening']],['long-vowels','المدود',['reading','listening']],['sound-analysis','التحليل الصوتي',['comprehension','listening']],['syllable-building','بناء المقاطع',['reading','comprehension']],['word-building','تركيب الكلمات',['reading','writing']],['letter-writing','كتابة الحروف',['writing']],['word-writing','كتابة الكلمات',['writing']],['word-reading','قراءة الكلمات',['reading']],
 ['sentence-comprehension','فهم الجمل',['comprehension','listening']],['oral-communication','التواصل الشفهي',['speaking','listening']],['reading-fluency','الطلاقة القرائية',['reading']],['text-comprehension','فهم المقروء',['comprehension']],['language-application','تطبيق اللغة',['reading','writing','speaking','comprehension']]
].map(([id,title,domainIds])=>({id,kind:'skill',version:1,title,domainIds}));
const worlds=[
 ['readiness','أستعد وأكتشف',['visual-discrimination','attention','memory','sequencing','auditory-discrimination']],
 ['letters','أتعرف إلى الحروف',['letter-recognition','letter-position','letter-search','letter-naming']],
 ['sounds','أكتشف الأصوات',['letter-sound','short-vowels','sukoon','long-vowels']],
 ['words','أبني المقاطع والكلمات',['sound-analysis','syllable-building','word-building','letter-writing','word-writing','word-reading']],
 ['communication','أستمع وأتواصل',['sentence-comprehension','oral-communication']],
 ['fluency','أقرأ وأفهم',['reading-fluency','text-comprehension']],
 ['application','أستخدم لغتي',['language-application']]
].map(([id,title,skillIds],order)=>({id,kind:'world',version:1,title,skillIds,order,requires:[]}));
const config={version:1,id:'arabic-path-v1',domains,skills,worlds,curricula:[{id:'sa-lughati-g1',kind:'curriculum',version:1,title:'لغتي — السعودية — الصف الأول',grade:1,sequence:['م','ب','ل','د','ن','ر','ص','ف','س','ق','ت','ح']}],defaultCurriculum:'sa-lughati-g1'};
const titles=Object.fromEntries(skills.map(s=>[s.id,s.title]));
const skillFor=node=>node.kind==='prep'?'visual-discrimination':node.kind==='preparation'?node.family==='auditory'?'auditory-discrimination':node.family==='memory'?'memory':node.family==='sequence'?'sequencing':['attention','observation'].includes(node.family)?'attention':node.family==='extended'?(node.group===2?'memory':node.group===3?'attention':'visual-discrimination'):'visual-discrimination':({'letter-shape':'letter-recognition','letter-positions':'letter-position','letter-detection':'letter-search','letter-name':'letter-naming'})[node.skill]||node.skill;
const worldFor=skill=>worlds.find(w=>w.skillIds.includes(skill))?.id;
const clone=value=>JSON.parse(JSON.stringify(value));
function createCatalog(rules,options={}){
 const specification=clone(options.config||config),curriculumId=options.curriculumId||specification.defaultCurriculum,entities={domains:specification.domains,skills:specification.skills,worlds:specification.worlds,curricula:specification.curricula,levels:[],lessons:[],activities:[],mappings:[]};
 for(const node of rules.nodes){
  const skillId=options.skillMappings?.[node.id]||skillFor(node),worldId=options.worldMappings?.[node.id]||specification.worlds.find(w=>w.skillIds.includes(skillId))?.id;
  if(!worldId)throw Error('No world for '+node.id);
  const title=node.letter?(titles[skillId]||node.title)+' — '+node.letter:node.title;
  const status=node.status||(node.unit===2&&['letter-sound','word-reading'].includes(node.skill)?'unavailable':'implemented');
  const skill=entities.skills.find(s=>s.id===skillId);if(!skill)throw Error('Missing skill '+skillId);
  const base={version:1,title,skillIds:[skillId],domainIds:[...skill.domainIds],worldId,status,requires:[],source:'existing-activity',optional:!!node.optional};
  const levelId='level:'+node.id,lessonId='lesson:'+node.id,activityId='activity:'+node.id;
  entities.levels.push({...base,kind:'level',id:levelId,lessonIds:[lessonId],requires:node.requires.map(id=>'level:'+id)});
  entities.lessons.push({...base,kind:'lesson',id:lessonId,levelId,activityIds:[activityId],requires:node.requires.map(id=>'lesson:'+id),masteryCheck:!node.supervised});
  entities.activities.push({...base,kind:'activity',id:activityId,levelId,lessonId,sourceActivityId:node.id,activityType:['prep','preparation','word-game'].includes(node.kind)?'game':node.supervised?'teacher-led':'practice-and-assessment',requires:node.requires.map(id=>'activity:'+id)});
  entities.mappings.push({id:'mapping:'+curriculumId+':'+node.id,kind:'mapping',version:1,curriculumId,grade:specification.curricula.find(c=>c.id===curriculumId)?.grade||null,unit:node.unit||0,curriculumLessonId:node.letter?curriculumId+':'+node.unit+':'+node.letter:curriculumId+':readiness',activityId,lessonId,levelId,skillId,sourceActivityId:node.id});
 }
 // Planned groupings contain metadata only: no questions, activities, or fabricated evidence.
 for(const world of entities.worlds.filter(w=>!entities.levels.some(l=>l.worldId===w.id))){
  const skillId=world.skillIds[0],skill=entities.skills.find(s=>s.id===skillId),id='planned:'+world.id;
  entities.levels.push({id:'level:'+id,kind:'level',version:1,title:world.title,worldId:world.id,skillIds:[skillId],domainIds:[...skill.domainIds],status:'planned',requires:[],lessonIds:['lesson:'+id],optional:true});
  entities.lessons.push({id:'lesson:'+id,kind:'lesson',version:1,title:world.title,worldId:world.id,levelId:'level:'+id,skillIds:[skillId],domainIds:[...skill.domainIds],status:'planned',requires:[],activityIds:[],masteryCheck:false,optional:true});
 }
 if(options.additionalMappings)entities.mappings.push(...clone(options.additionalMappings));
 const catalog={version:1,id:specification.id,defaultCurriculum:specification.defaultCurriculum,...entities};
 validate(catalog,rules);return catalog;
}
function validate(catalog,rules){
 const groups=['domains','skills','worlds','curricula','levels','lessons','activities','mappings'];const all=new Map();
 for(const group of groups){if(!Array.isArray(catalog[group]))throw Error('Missing '+group);for(const n of catalog[group]){const key=group+':'+n.id;if(!n.id||n.version!==1||all.has(key))throw Error('Duplicate or unversioned '+key);all.set(key,n);}}
 const has=(group,id)=>all.has(group+':'+id);if(!has('curricula',catalog.defaultCurriculum))throw Error('Default curriculum missing');
 for(const s of catalog.skills)for(const id of s.domainIds)if(!has('domains',id))throw Error('Missing domain '+id);
 for(const w of catalog.worlds){if(!w.title)throw Error('World title missing');for(const id of w.skillIds)if(!has('skills',id))throw Error('Missing world skill '+id);}
 for(const group of ['worlds','levels','lessons','activities']){
  const nodes=catalog[group];rules.validateGraph(nodes);
  for(const n of nodes){if(!n.title)throw Error('Missing title '+n.id);if(group==='worlds')continue;
   if(!['implemented','planned','unavailable'].includes(n.status)||!has('worlds',n.worldId))throw Error('Invalid status/world '+n.id);
   for(const id of n.skillIds||[])if(!has('skills',id))throw Error('Missing skill '+id);
   for(const id of n.domainIds||[])if(!has('domains',id))throw Error('Missing domain '+id);
   if(group==='levels')for(const id of n.lessonIds)if(!has('lessons',id)||all.get('lessons:'+id).levelId!==n.id)throw Error('Missing level lesson '+id);
   if(group==='lessons'){if(!has('levels',n.levelId)||n.status==='implemented'&&!n.activityIds.length)throw Error('Missing lesson content '+n.id);for(const id of n.activityIds)if(!has('activities',id)||all.get('activities:'+id).lessonId!==n.id)throw Error('Missing lesson activity '+id);}
   if(group==='activities'&&(!rules.nodes.some(r=>r.id===n.sourceActivityId)||!has('lessons',n.lessonId)))throw Error('Missing source activity '+n.id);
  }
 }
 for(const m of catalog.mappings){if(!has('curricula',m.curriculumId)||!has('activities',m.activityId)||!has('lessons',m.lessonId)||!has('levels',m.levelId)||!has('skills',m.skillId))throw Error('Broken mapping '+m.id);const a=all.get('activities:'+m.activityId);if(a.lessonId!==m.lessonId||a.levelId!==m.levelId||a.sourceActivityId!==m.sourceActivityId||!a.skillIds.includes(m.skillId))throw Error('Inconsistent mapping '+m.id);}
 return true;
}
function curriculumRules(catalog,rules,curriculumId=catalog.defaultCurriculum,engine=host.SeviatAdaptive){
 if(!catalog.curricula.some(c=>c.id===curriculumId))throw Error('Unknown curriculum');
 const sources=new Set(catalog.mappings.filter(m=>m.curriculumId===curriculumId&&catalog.activities.some(a=>a.id===m.activityId&&a.status==='implemented')).map(m=>m.sourceActivityId));
 // Keep missing prerequisites as errors: imports must provide a complete valid subgraph.
 return rules.createRules(rules.nodes.filter(n=>sources.has(n.id)),engine);
}
function lessonFor(catalog,sourceActivityId){return catalog.lessons.find(l=>l.activityIds.some(id=>catalog.activities.find(a=>a.id===id)?.sourceActivityId===sourceActivityId));}
function view(catalog,state,rules,engine,options={}){
 const activeRules=curriculumRules(catalog,rules,options.curriculumId,engine),recommendation=options.recommendation||engine.recommend(state,activeRules,options.now);
 const mapped=new Set(activeRules.nodes.map(n=>n.id));
 const levels=catalog.levels.map(level=>{
  const lesson=catalog.lessons.find(l=>l.id===level.lessonIds[0]),activity=catalog.activities.find(a=>a.id===lesson?.activityIds[0]),node=activeRules.nodes.find(n=>n.id===activity?.sourceActivityId);
  const evidence=node&&(state.legacyEvidence?.[node.id]===true||rules.evidence(state,node.id,engine)||engine.progressReady(state,node.id));
  const locked=node&&state.overrides?.[node.id]==='lock';
  const ready=node&&!locked&&(state.homework===node.id||engine.autoAvailable(state,node,activeRules));
  const status=level.status!=='implemented'?level.status:!node||!mapped.has(node.id)||(options.excludedActivities||[]).includes(node.id)?'unavailable':locked?'locked':evidence?'completed':ready?'available':'locked';
  return {...level,status,evidenceComplete:!!evidence,lessonId:lesson?.id,sourceActivityId:node?.id,confirmed:!!node&&engine.mastery(state,node.id,options.now).status==='confirmed',teacherOverride:node&&state.overrides?.[node.id]==='allow'};
 });
 const recommendedLesson=lessonFor(catalog,recommendation.nodeId)||null;
 const required=levels.filter(l=>!l.optional&&catalog.levels.find(base=>base.id===l.id)?.status==='implemented'&&mapped.has(l.sourceActivityId));
 return {version:1,curriculumId:options.curriculumId||catalog.defaultCurriculum,recommendation,recommendedLesson,currentWorldId:recommendedLesson?.worldId||[...catalog.worlds].reverse().find(w=>levels.some(l=>l.worldId===w.id&&l.evidenceComplete))?.id||catalog.worlds[0].id,levels,progress:{completed:required.filter(l=>l.evidenceComplete).length,total:required.length},worlds:catalog.worlds.map(w=>({...w,status:levels.some(l=>l.worldId===w.id&&!['planned','unavailable'].includes(l.status))?'implemented':'planned'}))};
}
const api={version:1,defaultConfig:config,createCatalog,validate,curriculumRules,lessonFor,view};
if(typeof module!=='undefined')module.exports=api;else host.SeviatArabicPath=api;
})(typeof window==='undefined'?globalThis:window);