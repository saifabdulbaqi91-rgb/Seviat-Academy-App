'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,path.basename(path.dirname(__dirname))==='.access-staging'?'../..':'..');
const staged=process.argv.includes('--live')?root:path.join(root,'.access-staging');
const R=require(path.join(staged,'unit1-rules.js'));
const read=p=>fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'');
const data=JSON.parse(read(path.join(staged,'data/unit1-reviewed.json'))),qs=data.questions;
const names={'م':'ميم','ب':'باء','ل':'لام','د':'دال','ن':'نون','ر':'راء'};
let assertions=0;
function check(condition,label){assert(condition,label);assertions++;}
R.validate(qs);
const operationKeys=new Set();
const audit=JSON.parse(read(path.join(root,'docs/UNIT1_ADDITIONAL_QUESTIONS_AUDIT.json')));
const baseline={questions:audit.historicalQuestionIds.map(id=>({id}))};
const added=qs.filter(q=>!baseline.questions.some(p=>p.id===q.id));
check(added.length===R.letters.length*2,'Expected two absent-letter contrast tasks per letter');
check(baseline.questions.every(p=>qs.some(q=>q.id===p.id)),'Historical question IDs removed');
for(const l of R.letters){const additions=added.filter(q=>q.letter===l);check(additions.length===2,'Absent coverage '+l);for(const q of additions){
 check(q.skill==='letter-detection'&&q.phase==='cumulative'&&q.operation==='count-in-word','Added task outside scope '+q.id);
 check(q.answer==='٠'&&!q.stimulus.includes(l),'Absent letter answer '+q.id);
 check(data.wordGlossary.includes(q.stimulus),'Unknown added word '+q.id);
 check(q.requiredLetters.length===R.letters.length&&R.letters.every(x=>q.requiredLetters.includes(x)),'Cumulative prerequisite '+q.id);
 check([...q.stimulus.replace(/[\u064B-\u0652]/g,'')].every(c=>R.letters.includes(c)||'اوي'.includes(c)),'Future letter '+q.id);
}}

for(const q of qs){
 const operationKey=JSON.stringify([q.letter,q.operation,q.stimulus]);
 check(!operationKeys.has(operationKey),'Cross-skill duplicate '+q.id);operationKeys.add(operationKey);
 const l=q.letter,s=q.stimulus,marks=['َ','ِ','ُ'],longs=[l+'َا',l+'ِي',l+'ُو'];
 const forms=['د','ر'].includes(l)?[l,'ـ'+l]:[l,l+'ـ','ـ'+l+'ـ','ـ'+l];
 let expected;
 switch(q.operation){
 case 'name-glyph':case 'name-from-context':expected=names[l];break;
 case 'hear-name':case 'identify-letter':case 'match-shape':case 'identify-heard-consonant':expected=l;break;
 case 'named-position':expected=['الأول','الثاني','الثالث'][s.split('، ').indexOf(l)];break;
 case 'name-symbol-pair':expected=names[l]+' : '+l;break;
 case 'matching-pair':expected=l+' '+l;break;
 case 'count-dots':expected=['ب','ن'].includes(l)?'نقطة واحدة':'بلا نقاط';break;
 case 'visual-difference':expected='□';break;
 case 'identify-mark':expected=l+marks[['الفتحة','الكسرة','الضمة'].indexOf(s)];break;
 case 'hear-short':case 'hear-madd':case 'hear-closed':case 'read-heard-word':expected=q.audioText;break;
 case 'identify-sukoon':expected=l+'ْ';break;
 case 'name-sukoon':expected='السكون';break;
 case 'silent-ending':expected=s+'ْ';break;
 case 'identify-madd':expected=longs[['الألف','الياء','الواو'].indexOf(s)];break;
 case 'connection-form':expected=forms[Number(s)];break;
 case 'joins-next':expected='لا';break;
 case 'first-in-chain':expected=['د','ر'].includes(l)?l:l+'ـ';break;
 case 'last-in-chain':expected='ـ'+l;break;
 case 'count-in-word':expected=['٠','١','٢','٣'][[...s.replace(/[\u064B-\u0652]/g,'')].filter(c=>c===l).length];break;
 case 'count-in-sequence':expected=['٠','١','٢','٣'][s.split(' ').filter(c=>c===l).length];break;
 case 'locate-in-sequence':expected=['أول السطر','وسط السطر','آخر السطر'][s.split(' ').indexOf(l)];break;
 case 'first-sound':expected=s.slice(0,2);break;
 case 'last-sound':expected=s.slice(-2);break;
 case 'split-closed':expected=s.slice(0,2)+' + '+s.slice(2);break;
 case 'recognize-closed':expected=l+'َمْ';break;
 case 'heard-sound-order':expected=s.split('|').join(' + ');break;
 case 'combine-madd':case 'combine-closed':expected=s.split('|').join('');break;
 default:throw Error('Untested operation '+q.operation);
 }
 check(q.answer===expected,'Wrong answer '+q.id);
 check(q.options.filter(x=>x===expected).length===1,'Ambiguous answer '+q.id);
 if(q.type==='teacher-listening')check(!q.prompt.includes(q.audioText),'Listening answer revealed '+q.id);
 if(q.skill==='word-reading'){
  check(q.phase==='cumulative','Reading escaped review');
  for(const option of q.options){check(data.wordGlossary.includes(option),'Unreviewed word '+option);check([...option.replace(/[\u064B-\u0652]/g,'')].every(c=>R.letters.includes(c)||'اوي'.includes(c)),'Future consonant');}
 }
 if(q.skill==='letter-positions'&&['د','ر'].includes(l))check(!q.options.some(x=>x.includes(l+'ـ')),'Invalid joining form');
}
check(data.writingActivities.length===60,'Writing count');
for(const a of data.writingActivities){check(!a.options&&!a.answer,'Fake writing question');check(a.rubric.length===4,'Writing rubric');}
check(new Set(data.writingActivities.map(a=>a.id)).size===60,'Writing IDs');
let state={version:2,attempts:[],practice:{},writing:[]};
const l=R.letters[0],s=R.coreSkills[0],pool=qs.filter(q=>q.letter===l&&q.skill===s);
const make=(id,time,correct=5,extra={})=>({id,key:R.stateKey(l,s),mode:'assessment',completedAt:time,independent:true,teacherConfirmed:true,results:pool.slice(0,5).map((q,i)=>({id:q.id,answer:i<correct?q.answer:q.options.find(x=>x!==q.answer),correct:true})),...extra});
const t=100000000;
check(R.canPractice(state,l,R.coreSkills[9]),'Practice must be free within available letter');
let auto=R.record({...state,custom:'preserve'},make('auto',t,4,{teacherConfirmed:false,independent:false}),qs);
check(R.passed(auto,l,s)&&R.unlocked(auto,l,R.coreSkills[1]),'4/5 must immediately unlock next assessment');
check(!R.mastered(auto,l,s)&&auto.custom==='preserve','Pass is not confirmed mastery');
auto=R.record(auto,make('review',t+86400000,4,{teacherConfirmed:false,independent:false}),qs);
check(!R.mastered(auto,l,s),'Unconfirmed review cannot confirm mastery');
const savedAttempts=JSON.stringify(auto.attempts);
auto=R.confirm(auto,'review',true);
check(R.mastered(auto,l,s),'Spaced teacher-confirmed review must confirm mastery');
check(JSON.stringify(auto.attempts)===savedAttempts,'Teacher confirmation changed attempts');
check(R.confirm(auto,'review',true).confirmations.length===1,'Duplicate confirmation');

check(R.unlocked(state,l,s),'First skill locked');check(!R.unlocked(state,l,R.coreSkills[1]),'Next skill prematurely unlocked');check(!R.unlocked(state,'ب',s),'Next letter prematurely unlocked');
state=R.record(state,make('one',t),qs);check(!R.mastered(state,l,s),'Single attempt is not mastery');
state=R.record(state,make('soon',t+1000),qs);check(!R.mastered(state,l,s),'Immediate repeat is not mastery');
const count=state.attempts.length;state=R.record(state,make('soon',t+1000),qs);check(state.attempts.length===count,'Duplicate submission');
state=R.record(state,make('later',t+R.rules.minimumGapMs),qs);check(R.mastered(state,l,s),'Spaced successes not recognized');check(R.unlocked(state,l,R.coreSkills[1]),'Next skill did not unlock');
state=R.record(state,make('failed',t+R.rules.minimumGapMs*2,2),qs);check(R.mastered(state,l,s),'Previously confirmed mastery must remain recorded');
check(state.attempts.at(-1).results.filter(r=>r.correct).length===2,'Trusting caller correctness');
state=R.record(state,make('assisted',t+R.rules.minimumGapMs*3,5,{independent:false}),qs);check(R.mastered(state,l,s),'Historical confirmed mastery lost');
assert.throws(()=>R.record(state,make('practice',t,5,{mode:'practice'}),qs));assertions++;
assert.throws(()=>R.record(state,{...make('dupes',t),results:Array(5).fill(make('x',t).results[0])},qs));assertions++;
assert.throws(()=>R.validate([...qs,qs[0]]));assertions++;
assert.throws(()=>R.validate([...qs,{...qs[0],id:'different-id'}]));assertions++;
const completed={version:2,attempts:[],practice:{},writing:[]};
for(const letter of R.letters)for(const skill of R.coreSkills){const p=qs.filter(q=>q.letter===letter&&q.skill===skill).slice(0,5);for(let n=0;n<2;n++)completed.attempts.push({id:letter+skill+n,key:R.stateKey(letter,skill),mode:'assessment',completedAt:t+n*R.rules.minimumGapMs,independent:true,teacherConfirmed:true,results:p.map(q=>({id:q.id,answer:q.answer,correct:true}))});}
check(R.cumulativeUnlocked(completed),'Cumulative review not unlocked');check(!R.cumulativeUnlocked(state),'Cumulative review unlocked early');
for(const l of R.letters)check(R.unlocked(completed,l,'word-reading','cumulative'),'Reading locked after prerequisites');
const legacyFiles=['data/questions.json','data/meem-questions.json','data/group1-extra.json','data/group1-reading-extra.json'];
const historical=legacyFiles.flatMap(f=>JSON.parse(read(path.join(root,f))).questions);
const ctx={window:{},console:{log(){}},questionsData:{questions:[]}};vm.runInNewContext(read(path.join(root,'group1-engine.js')),ctx);historical.push(...JSON.parse(JSON.stringify(ctx.window.SeviatGroup1.questions)));
const merged=R.merge(qs,historical);check(merged.legacyQuestions.length===255,'Historical records lost');check(new Set(merged.questions.map(q=>q.id)).size===qs.length,'Active duplicate IDs');
for(const q of qs){const old=historical.find(x=>x.id===q.id);if(old)check(old.skill===q.skill&&old.letter===q.letter,'ID reused across skills');}
const skillData=JSON.parse(read(path.join(staged,'data/skills.json')));
for(const [k,v] of Object.entries(R.rules))check(skillData.mastery[k]===v,'Config/runtime rule mismatch '+k);
// Parse every JavaScript and JSON file, including pre-existing backups, without executing them.
let js=0,jsonCount=0;const syntaxErrors=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 if(['.git','.access-staging','.quality-staging','node_modules','browser-profile'].includes(entry.name))continue;
 const file=path.join(dir,entry.name);if(entry.isDirectory()){walk(file);continue;}
 const relative=path.relative(root,file);const overlay=path.join(staged,relative);const chosen=fs.existsSync(overlay)?overlay:file;
 try{if(/\.(js|cjs)$/.test(file)){new vm.Script(read(chosen),{filename:relative});js++;}else if(file.endsWith('.json')){JSON.parse(read(chosen));jsonCount++;}}catch(e){syntaxErrors.push(relative+': '+e.message);}
}}
walk(root);
for(const file of ['unit1-rules.js','unit1-learning.js']){new vm.Script(read(path.join(staged,file)),{filename:file});}
check(syntaxErrors.length===0,'Syntax errors: '+syntaxErrors.join('\n'));
const result={assertions,activeQuestions:qs.length,historicalQuestions:historical.length,writingActivities:data.writingActivities.length,javascriptParsed:js,jsonParsed:jsonCount,mode:staged===root?'live':'staged',passed:true};
fs.writeFileSync(path.join(process.env.SEVIAT_TEST_OUTPUT||path.join(root,'.access-staging'),staged===root?'unit-live-results.json':'unit-results.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));