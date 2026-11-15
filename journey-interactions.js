/* Interaction lifecycle and participation only. This module never changes mastery rules. */
(function(host){
'use strict';
const dayKey=(time=Date.now())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));
function descriptor(node,catalog){
 const activity=catalog?.activities.find(a=>a.sourceActivityId===node.id);
 let gameType=null;
 if(node.kind==='prep'||node.family==='visual')gameType='visual-matching';
 else if(['memory','sequence'].includes(node.family)||node.family==='extended'&&node.group===2)gameType='memory-sequencing';
 else if(node.family==='auditory')gameType='tone-discrimination';
 else if(node.kind==='preparation')gameType='attention-and-patterns';
 else if(['letter-shape','letter-detection'].includes(node.skill))gameType='letter-discrimination';
 else if(node.kind==='word-game'||node.skill==='syllable-building')gameType='construction';
 return {version:1,id:node.id,gameType,skillIds:activity?.skillIds||[node.skill||'visual-discrimination'],domainIds:activity?.domainIds||[],teacherAssessed:!!node.supervised,completion:'all-session-items'};
}
function automatic(node,q){return !node.supervised&&!q.teacherReview&&!q.scaffold&&q.type!=='teacher-listening'&&!node.skill?.includes('writing');}
function createFlow({commit,advance,schedule=setTimeout,cancel=clearTimeout,delay=1000,automatic=true}){
 let submitted=false,advanced=false,correct=false,job=null,disposed=false;
 const stop=()=>{if(job!==null){cancel(job);job=null;}};
 const next=()=>{if(disposed||!submitted||advanced)return false;stop();advanced=true;if(advance()===false){advanced=false;return false;}return true;};
 const arm=()=>{stop();if(automatic&&submitted&&correct&&!advanced&&!disposed)job=schedule(next,delay);};
 return {submit(answer,isCorrect){if(disposed||submitted)return false;if(commit(answer,isCorrect)===false)return false;submitted=true;correct=isCorrect;arm();return true;},restore(isCorrect){submitted=true;correct=isCorrect;},next,setAutomatic(value){automatic=!!value;arm();},dispose(){disposed=true;stop();},get pending(){return submitted&&!advanced;}};
}
function journal(profile){
 const value=profile.interactiveV1;if(value===undefined)return {version:1,sessions:{},activeId:null};
 if(!value||value.version!==1||!value.sessions||typeof value.sessions!=='object'||Array.isArray(value.sessions)||value.activeId!=null&&typeof value.activeId!=='string')throw Error('سجل الجلسة المحفوظة غير قابل للقراءة؛ لم يُستبدل.');
 return value;
}
function validateDraft(draft){
 if(!draft||draft.version!==1||typeof draft.id!=='string'||typeof draft.nodeId!=='string'||!Array.isArray(draft.questions)||!draft.questions.length||draft.questions.length>5||!Array.isArray(draft.results)||draft.results.length>draft.questions.length||!Number.isInteger(draft.index)||draft.index<0||draft.index>=draft.questions.length) return false;
 if(!['intro','question','feedback'].includes(draft.phase)||!draft.plan||!['practice','assessment','diagnostic','guided-practice'].includes(draft.plan.mode))return false;
 if(!draft.questions.every(q=>q&&typeof q.id==='string'&&typeof q.answer==='string'&&Array.isArray(q.options)&&q.options.includes(q.answer)))return false;
 if(draft.phase==='intro'&&(draft.index!==0||draft.results.length))return false;
 if(draft.phase==='question'&&draft.results.length!==draft.index)return false;
 if(draft.phase==='feedback'&&(!draft.pending||typeof draft.pending.correct!=='boolean'||!draft.questions[draft.index].options.includes(draft.pending.answer)||draft.pending.correct!==(draft.pending.answer===draft.questions[draft.index].answer)||draft.results.length!==draft.index+Number(!draft.guided)))return false;
 const ids=new Set();return draft.results.every((r,index)=>r&&r.id===draft.questions[index]?.id&&typeof r.id==='string'&&!ids.has(r.id)&&ids.add(r.id)&&typeof r.correct==='boolean'&&draft.questions.some(q=>q.id===r.id&&q.options.includes(r.answer)&&r.correct===(r.answer===q.answer)));
}
function rewards(profile,rules,now=Date.now()){
 const seen=new Set(),runs=[];
 for(const run of profile.runs||[]){if(!run||!run.id||seen.has(run.id)||run.preview||!Array.isArray(run.results)||!run.results.length)continue;seen.add(run.id);runs.push(run);}
 const entries=runs.map(run=>{const achievement=run.independent===true&&run.results.length>=5&&run.results.every(r=>r.verified===true&&r.evidenceEligible!==false&&!r.assisted)&&run.results.filter(r=>r.correct).length/run.results.length>=.8;const node=rules.nodes.find(n=>n.id===run.node);return {id:run.id,node:run.node,stars:1+Number(achievement),participation:1,achievement:Number(achievement),game:!!descriptor(node||{id:run.node},null).gameType,challengeDay:run.challengeDay||null};});
 const submitted=new Set();for(const item of Array.isArray(profile.homeworkSubmissions)?profile.homeworkSubmissions:[]){if(!item?.id||item.runId||submitted.has(item.id))continue;submitted.add(item.id);entries.push({id:'submission:'+item.id,node:item.node,stars:1,participation:1,achievement:0,game:false,challengeDay:null});}
 const uniqueNodes=new Set(entries.map(e=>e.node));const today=dayKey(now),challengeCompleted=entries.some(e=>e.challengeDay===today);
 const badges=[];if(entries.length)badges.push({id:'first-session',title:'خطوتي الأولى'});if(uniqueNodes.size>=3)badges.push({id:'variety',title:'أكتشف أنشطة متنوعة'});if(challengeCompleted)badges.push({id:'daily-choice',title:'تحدٍّ اختياري أنجزته'});
 return {version:1,stars:entries.reduce((n,e)=>n+e.stars,0),participation:entries.length,achievementStars:entries.reduce((n,e)=>n+e.achievement,0),gameSessions:entries.filter(e=>e.game).length,badges,challengeCompleted,entries};
}
const api={version:1,dayKey,descriptor,automatic,createFlow,journal,validateDraft,rewards};if(typeof module!=='undefined')module.exports=api;else host.SeviatInteractions=api;
})(typeof window==='undefined'?globalThis:window);