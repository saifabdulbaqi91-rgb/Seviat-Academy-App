'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/^\uFEFF/,'');
const R=require(path.join(root,'unit1-rules.js')),data=JSON.parse(read('data/unit1-reviewed.json'));
let checks=0;const check=(value,label)=>{assert(value,label);checks++;};
function load(file,expose,extra={}){
 const context={window:{addEventListener(){}},console,Math,localStorage:{getItem(){return null;}},...extra};
 const source=read(file).replace(/\}\)\(\);\s*$/,expose+'\n})();');
 vm.runInNewContext(source,context,{filename:file});return context;
}
const auditory=load('auditory-game.js','window.test={createQuestion,playNotes,stop:()=>stopPlayback()};');
for(let i=0;i<1000;i++)for(const level of [3,5]){
 const q=auditory.window.test.createQuestion(level);
 check(Number(q.answer)===(level===3?q.sounds.length:q.sounds.filter(n=>n.frequency===660).length),'Incorrect sound count');
 if(level===5)check(q.sounds.length===5,'Unannounced demonstration tone');
}
const visual=load('visual-levels.js','window.test=makeQuestions;');
for(let n=0;n<100;n++)for(const q of visual.window.test(2)){
 check(q.options.filter(o=>o.correct).length===1,'Ambiguous shape');
 check(new Set(q.options.map(o=>o.size)).size===1,'Size reveals answer');
 check(new Set(q.options.map(o=>o.color)).size===1,'Color reveals answer');
 check(q.options.find(o=>o.correct).shape===q.target.shape,'Wrong visual answer');
}
// All possible orders of each seven-item counting bank, not a lucky shuffle sample.
function* permutations(items){if(!items.length){yield [];return;}for(let i=0;i<items.length;i++)for(const tail of permutations(items.filter((_,j)=>i!==j)))yield [items[i],...tail];}
for(const l of R.letters){
 const counts=data.questions.filter(q=>q.letter===l&&q.operation==='count-in-word');
 check(counts.length===7,'Counting coverage');
 for(const q of counts){
  check(data.wordGlossary.includes(q.stimulus),'New unfamiliar word');
  check(q.answer==='٠١٢٣'[[...q.stimulus].filter(c=>c===l).length],'Wrong letter count');
  check(q.options.join('')==='٠١٢٣','Option formatting reveals absence');
  check(q.phase==='cumulative','Word precedes prerequisites');
 }
 for(const ordering of permutations(counts)){
  const selected=R.selectAssessment(ordering);check(selected.length===5,'No balanced assessment');
  check(Math.max(...['٠','١','٢','٣'].map(a=>selected.filter(q=>q.answer===a).length))<4,'Fixed number passes');
 }
 const sounds=data.questions.filter(q=>q.letter===l&&q.skill==='letter-sound');
 check(sounds.length===5&&sounds.every(q=>!R.assessmentEligible(q)),'Invalid listening assessment is eligible');
 check(R.selectAssessment(sounds).length===0,'Invalid listening test selected');
}
const complete={version:2,attempts:[],practice:{legacy:{correct:true}},writing:[{id:'historical-writing'}],unknown:'preserve',confirmations:[]};
for(const l of R.letters)for(const skill of R.coreSkills){
 const p=data.questions.filter(q=>q.letter===l&&q.skill===skill&&q.phase==='training').slice(0,5);
 complete.attempts.push({id:l+skill,key:R.stateKey(l,skill),mode:'assessment',completedAt:123,results:p.map(q=>({id:q.id,answer:q.answer,correct:true}))});
}
const before=JSON.stringify(complete);
check(R.cumulativeUnlocked(complete),'Historical progression changed');
for(const l of R.letters){
 const sounds=data.questions.filter(q=>q.letter===l&&q.skill==='letter-sound');
 assert.throws(()=>R.record(complete,{id:'new-sound',key:R.stateKey(l,'letter-sound'),mode:'assessment',results:sounds.map(q=>({id:q.id,answer:q.answer}))},data.questions));checks++;
 const oldCounts=data.questions.filter(q=>q.letter===l&&q.operation==='count-in-word').slice(0,5);
 assert.throws(()=>R.record(complete,{id:'biased-count',key:R.stateKey(l,'letter-detection','cumulative'),mode:'assessment',results:oldCounts.map(q=>({id:q.id,answer:q.answer}))},data.questions));checks++;
 const selected=R.selectAssessment(data.questions.filter(q=>q.letter===l&&q.operation==='count-in-word'));
 for(const a of ['٠','١','٢','٣']){
  const saved=R.record(complete,{id:'constant-'+a,key:R.stateKey(l,'letter-detection','cumulative'),mode:'assessment',results:selected.map(q=>({id:q.id,answer:a,correct:true}))},data.questions);
  check(!R.successful(saved.attempts.at(-1)),'Caller can fake counting pass');
 }
}
for(const skill of ['short-vowels','long-vowels']){
 const p=data.questions.filter(q=>q.letter===R.letters[0]&&q.skill===skill).slice(0,5);
 const attempt={id:skill,key:R.stateKey(R.letters[0],skill),mode:'assessment',results:p.map((q,i)=>({id:q.id,answer:i===4?q.options.find(a=>a!==q.answer):q.answer}))};
 const next=R.record(complete,attempt,data.questions),saved=next.attempts.at(-1),report=R.subskillReport(saved,data.questions);
 check(R.successful(saved),'4/5 changed');
 check(report.reduce((n,r)=>n+r.total,0)===5,'Subskill samples lost');
 check(report.some(r=>r.correct<r.total),'Weak subskill hidden by aggregate pass');
 check(saved.results.every(r=>r.subskill),'New result snapshot lacks subskill');
 check(R.subskillReport({...saved,results:[]},data.questions).every(r=>r.total===0),'Missing coverage claimed');
}
check(JSON.stringify(complete)===before,'Historical progress was mutated');
// A tiny DOM with identity and connectivity, exercising real timer callbacks.
function memoryFixture(){
 let nodes={},pending=[],timers=new Map(),id=0;
 class Node {
  constructor(){this.isConnected=true;this.style={};this.children=[];this.textContent='';}
  set innerHTML(html){for(const n of Object.values(nodes))n.isConnected=false;nodes={};for(const m of html.matchAll(/id="([^"]+)"/g))nodes[m[1]]=new Node();}
  appendChild(n){this.children.push(n);}setAttribute(){}scrollIntoView(){}replaceChildren(){this.children=[];}querySelectorAll(){return this.children;}
 }
 const area=new Node();
 const ctx=load('memory-game.js','window.test={startMemory,stopTimer};',{
  document:{getElementById:id=>nodes[id]||null,createElement:()=>new Node()},createActivityArea:()=>area,
  setTimeout(fn){const key=++id;timers.set(key,fn);pending.push(fn);return key;},clearTimeout(key){timers.delete(key);}
 });
 return {ctx,area,get nodes(){return nodes;},get last(){return pending.at(-1);}};
}
const m=memoryFixture();m.ctx.window.test.startMemory(1,'practice');
const stale=m.last;m.area.innerHTML='<h2 id="unrelated">Other activity</h2>';stale();
check(m.nodes.unrelated.textContent==='','Stale timer updated unrelated screen');
m.ctx.window.test.startMemory(1,'practice');const previous=m.last;
m.ctx.window.test.startMemory(2,'practice');const instruction=m.nodes.memoryInstruction;
previous();check(instruction.textContent==='','Old round updated new round');m.last();check(instruction.textContent.length>0,'Current timer did not reveal choices');
const summary={passed:true,checks,questions:data.questions.length,writing:data.writingActivities.length,countingPermutations:30240};
// Playback completion is controlled by actual oscillator ended events.
(async()=>{
 const oscillators=[];let watcher;
 class AudioContext {
  constructor(){this.currentTime=0;this.destination={};}resume(){return Promise.resolve();}
  createOscillator(){const o={frequency:{},connect(){},disconnect(){},start(){},stop(){}};oscillators.push(o);return o;}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
 }
 const a=load('auditory-game.js','window.test={playNotes};',{
  window:{AudioContext,addEventListener(){},SeviatEffects:{isEnabled:()=>true}},
  setInterval(fn){watcher=fn;return 1;},clearInterval(){}
 });
 const owner={isConnected:true};let resolved=false;
 const promise=a.window.test.playNotes([{frequency:440,duration:.2},{frequency:660,duration:.3}],owner).then(value=>{resolved=true;return value;});
 await new Promise(setImmediate);check(!resolved,'Playback resolves when scheduled');
 oscillators[0].onended();await Promise.resolve();check(!resolved,'Playback resolves before final sound');
 oscillators[1].onended();check(await promise,'Complete playback not acknowledged');
 const interrupted=a.window.test.playNotes([{frequency:440,duration:.2}],owner);await new Promise(setImmediate);owner.isConnected=false;watcher();check(await interrupted===false,'Navigation falsely counts as listening');
 summary.checks=checks;console.log(JSON.stringify(summary,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
