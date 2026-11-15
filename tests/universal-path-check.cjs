'use strict';
const assert=require('assert/strict'),fs=require('fs'),P=require('../arabic-learning-path.js'),R=require('../journey-rules.js'),E=require('../adaptive-learning.js'),U=require('../unit1-rules.js');
let checks=0;const check=(v,label)=>{assert(v,label);checks++;},copy=o=>JSON.parse(JSON.stringify(o));
const c=P.createCatalog(R),now=Date.now();
check(P.validate(c,R),'catalog valid');check(c.activities.length===R.nodes.length,'one reference per existing activity');check(new Set(c.activities.map(a=>a.sourceActivityId)).size===R.nodes.length,'no copied activity');
for(const group of ['domains','skills','worlds','levels','lessons','activities','mappings'])for(const n of c[group]){check(!!n.id&&n.version===1,'stable versioned ID');}
for(const d of ['reading','writing','listening','speaking','comprehension'])check(c.domains.some(x=>x.id===d),'language domain '+d);
check(!c.domains.some(x=>x.id==='games'),'games are not a competency');check(c.worlds.length===7,'seven worlds');check(c.levels.filter(l=>l.status==='planned').length===3,'unimplemented worlds explicit');
for(const world of ['communication','fluency','application'])check(!c.activities.some(a=>a.worldId===world),'no invented tasks '+world);
check(c.activities.filter(a=>a.status==='unavailable').length===12,'missing Unit 2 listening/word reading explicit');
check(c.curricula[0].sequence.join('')==='مبلدنرصفسقتح','Saudi sequence preserved');
check(P.view(c,emptyState(),R,E,{excludedActivities:['prep:matching']}).levels[0].status==='unavailable','runtime missing content disabled');
function emptyState(){return {runs:[],overrides:{}};}
check(P.createCatalog(R).activities.map(a=>a.id).join('|')===c.activities.map(a=>a.id).join('|'),'IDs deterministic');
const bad=fn=>{const x=copy(c);fn(x);assert.throws(()=>P.validate(x,R));checks++;};
bad(x=>x.lessons[0].requires=['missing']);bad(x=>{x.lessons[0].requires=[x.lessons[1].id];x.lessons[1].requires=[x.lessons[0].id];});bad(x=>x.activities.pop());bad(x=>x.levels[0].lessonIds=['missing']);bad(x=>x.mappings[0].activityId='absent');bad(x=>x.skills[0].domainIds=['absent']);bad(x=>x.lessons[0].activityIds=[]);bad(x=>x.activities.push(copy(x.activities[0])));
assert.throws(()=>R.createRules([{id:'a',requires:['b']},{id:'b',requires:['a']}]));checks++;
assert.throws(()=>R.createRules([{id:'a',requires:['missing']}]));checks++;
check(E.recommend({runs:[]},{...R,nodes:[{id:'x',requires:['x']}]},now).reason==='invalid-path','circular engine path stopped');
const result=(id,time,correct=true)=>({id,node:'prep:matching',mode:'assessment',evidenceVersion:2,independent:true,completedAt:time,results:Array.from({length:5},(_,i)=>({id:'matching-'+i,correct,verified:true}))});
const empty={runs:[],overrides:{},unknownLegacyField:'keep'},snapshot=JSON.stringify(empty);
let v=P.view(c,empty,R,E,{now});check(v.recommendation.nodeId==='prep:matching','zero start');check(v.progress.completed===0,'zero evidence');check(v.levels.find(l=>l.id==='level:م:letter-shape').status==='locked','prerequisite locked');
const one={...empty,runs:[result('one',now)]};check(P.view(c,one,R,E,{now}).progress.completed===0,'single session not mastery');
const two={...empty,runs:[result('one',now-1000),result('two',now)]};v=P.view(c,two,R,E,{now});check(v.progress.completed===1,'independent evidence advances');check(v.recommendation.nodeId==='م:letter-shape','next mapped lesson');
check(E.recommend(two,R,now).nodeId==='م:letter-shape','same verified progression outside browser globals');
check(E.recommendLesson(two,c,R,P,now).lessonId==='lesson:م:letter-shape','engine maps lesson');
const old={...empty,runs:[result('old-1',now-5*86400000),result('old-2',now-3*86400000)]};check(P.view(c,old,R,E,{now}).recommendation.reason==='spaced-review','returning review');
const mistakes={...empty,runs:[result('bad',now,false)]};check(P.view(c,mistakes,R,E,{now}).recommendation.reason==='targeted-review','remediation');
const unverified={...empty,runs:two.runs.map(r=>({...r,results:r.results.map(a=>({...a,verified:false}))}))};check(P.view(c,unverified,R,E,{now}).progress.completed===0,'unverified cannot complete');
const waived={...empty,overrides:{'ح:syllable-building':'allow'}};v=P.view(c,waived,R,E,{now});check(v.levels.find(l=>l.id==='level:ح:syllable-building').status==='available','teacher bypass');check(v.progress.completed===0,'override is not proficiency');
const lockedRoot={...two,overrides:{'prep:matching':'lock'}};check(P.view(c,lockedRoot,R,E,{now}).progress.completed===1,'locking preserves proficiency evidence');check(P.view(c,two,R,E,{now,excludedActivities:['prep:matching']}).progress.completed===1,'runtime unavailability does not erase progress');
const locked={...two,overrides:{'م:letter-shape':'lock'}};check(P.view(c,locked,R,E,{now}).levels.find(l=>l.id==='level:م:letter-shape').status==='locked','teacher lock');
check(P.view(c,{...empty,homework:'ح:syllable-building'},R,E,{now}).recommendation.reason==='teacher-assignment','assignment priority');
check(P.view(c,{...empty,homework:'ح:word-reading'},R,E,{now}).recommendation.nodeId!=='ح:word-reading','unavailable assignment cannot trap');
const advanced={...empty,legacyEvidence:Object.fromEntries(R.nodes.filter(n=>!n.optional).map(n=>[n.id,true]))};const advancedView=P.view(c,advanced,R,E,{now});check(advancedView.recommendation.nodeId===null,'finished learner not sent to unavailable content');check(advancedView.currentWorldId==='words'&&advancedView.progress.completed===advancedView.progress.total,'finished path retains last learned world');
const disabled=R.createRules([{id:'planned',requires:[],status:'planned'}],E);check(E.recommend(empty,disabled,now).nodeId===null,'planned unavailable');
// A shared activity maps to another curriculum without duplicating it.
const cfg=copy(P.defaultConfig);cfg.curricula.push({id:'future-curriculum',kind:'curriculum',version:1,title:'منهج تجريبي',grade:2});
const secondary={...c.mappings[0],id:'mapping:future:matching',curriculumId:'future-curriculum',grade:2};
const multi=P.createCatalog(R,{config:cfg,additionalMappings:[secondary]});check(multi.activities.length===c.activities.length,'multi curriculum no duplicate');check(P.curriculumRules(multi,R,'future-curriculum',E).nodes.length===1,'select mapping');
// Generic branching and cross-skill prerequisites, without a compulsory linear Saudi sequence.
const graph=R.createRules([{id:'root',title:'تمييز',skill:'letter-shape',kind:'lesson',requires:[]},{id:'parallel',title:'كتابة',skill:'letter-writing',kind:'lesson',requires:[]},{id:'cross',title:'تحليل',skill:'sound-analysis',kind:'lesson',requires:['root','parallel']}],E);
const generic=P.createCatalog(graph,{skillMappings:{root:'letter-recognition',parallel:'letter-writing',cross:'sound-analysis'}});
check(P.curriculumRules(generic,graph,undefined,E).available(empty,graph.nodes[1]),'parallel start allowed');check(!graph.available(empty,graph.nodes[2]),'cross skill gated');check(graph.available({...empty,overrides:{root:'allow',parallel:'allow'}},graph.nodes[2]),'cross skill prerequisites satisfied');
const bank=JSON.parse(fs.readFileSync('data/unit1-reviewed.json','utf8').replace(/^\uFEFF/,''));const pool=bank.questions.filter(q=>q.letter==='م'&&q.skill==='letter-shape'&&q.phase==='training').slice(0,5);
const legacy={version:2,attempts:[0,1].map(i=>({id:'legacy-'+i,key:U.stateKey('م','letter-shape'),mode:'assessment',completedAt:now-(2-i)*86400001,independent:true,teacherConfirmed:true,results:pool.map(q=>({id:q.id,answer:q.answer,correct:true}))})),practice:{},writing:[],unknown:'retained'};
const legacyBytes=JSON.stringify(legacy),view=E.legacyView(empty,legacy,U,R);check(view.legacyEvidence['م:letter-shape'],'old assessment still influences');check(view.runs===empty.runs,'no duplicate progress records');check(JSON.stringify(legacy)===legacyBytes&&JSON.stringify(empty)===snapshot,'read only compatibility');
console.log(JSON.stringify({passed:true,checks,domains:c.domains.length,worlds:c.worlds.length,levels:c.levels.length,activities:c.activities.length}));