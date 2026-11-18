'use strict';
// Actual persistence, warning controls, progress display and answer handler.
// Synthetic DOM and storage only: no browser profile, student data or writes.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync(require('path').join(__dirname,'../app.js'),'utf8');
const persistence=source.slice(source.indexOf('let legacyProgressStatus'),source.indexOf('function speak('));
const answer=source.slice(source.indexOf('function checkAnswer('),source.indexOf('function openStage('));
function fixture(raw){
  const nodes=new Map();
  class Element {
    constructor(){this.children=[];this.dataset={};this.style={};this.attributes={};this.textContent='';}
    set id(value){this._id=value;nodes.set(value,this);} get id(){return this._id;}
    append(child){child.parent=this;this.children.push(child);}
    setAttribute(k,v){this.attributes[k]=v;}
    remove(){for(const c of this.children)c.remove();nodes.delete(this.id);if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
    replaceChildren(){for(const c of [...this.children])c.remove();this.children=[];}
  }
  const body=new Element();
  for(const id of ['gameFeedback','gameScore','nextQuestion','progressText','progressBar']){const el=new Element();el.id=id;body.append(el);}
  const store={raw,writes:0,failWrite:false,failRead:false,getItem(){if(this.failRead)throw Error('SecurityError');return this.raw;},setItem(k,v){this.writes++;if(this.failWrite)throw Error('QuotaExceededError');this.raw=v;}};
  const context=vm.createContext({localStorage:store,console:{warn(){}},window:{},document:{body,createElement:()=>new Element(),getElementById:id=>nodes.get(id),querySelectorAll:()=>[]},setTimeout:()=>1});
  vm.runInContext('const STORAGE_KEY="seviatLearningProgress";let score=0,answeredQuestions=[],questionsData={questions:[{id:"q1"},{id:"q2"}]},quizResults=[],currentQuestions=[{id:"q1",answer:"yes"},{id:"q2",answer:"yes"}],currentQuestionIndex=0,quizMode="practice",autoNextTimer;\n'+persistence+'\n'+answer+
    '\nglobalThis.api={load:loadProgress,state:()=>({score,ids:[...answeredQuestions]}),answer(index=0){currentQuestionIndex=index;document.getElementById("nextQuestion").dataset={};checkAnswer("yes",null);},retry:saveLegacyProgressFromUI};',context);
  return {store,nodes,app:context.api};
}
{
  const f=fixture('{"score":"10","answeredQuestions":[],"custom":"keep"}');
  assert(f.app.load());f.store.failWrite=true;f.app.answer();
  assert.equal(f.app.state().score,20);assert.equal(JSON.parse(f.store.raw).score,'10');
  assert(f.nodes.get('gameScore').textContent.includes('غير محفوظة'));
  assert.equal(f.nodes.get('legacy-progress-warning').attributes.role,'alert');
  assert(f.nodes.get('legacy-progress-warning').children[0].textContent.includes('تعذر حفظ'));
  const writes=f.store.writes;f.app.answer();assert.equal(f.store.writes,writes);assert.equal(f.app.state().score,20);
  f.nodes.get('legacy-progress-retry').onclick();assert(f.nodes.has('legacy-progress-warning'));
  f.store.failWrite=false;f.nodes.get('legacy-progress-retry').onclick();
  assert(!f.nodes.has('legacy-progress-warning'));assert(!f.nodes.get('gameScore').textContent.includes('غير محفوظة'));
  assert.equal(f.nodes.get('progressText').textContent,'50% من الأسئلة أُنجزت');
  const saved=JSON.parse(f.store.raw);assert.equal(saved.score,20);assert.equal(saved.custom,'keep');assert.deepEqual(saved.answeredQuestions,['q1']);
  f.app.retry();assert.equal(JSON.parse(f.store.raw).score,20);
  const reloaded=fixture(f.store.raw);assert(reloaded.app.load());assert.equal(reloaded.app.state().score,20);
}
for(const original of [' {\ninvalid ', '{"score":null}', '{"answeredQuestions":{}}']){
  const f=fixture(original);assert.equal(f.app.load(),false);f.app.answer();
  assert(f.nodes.has('legacy-progress-warning'));assert(!f.nodes.has('legacy-progress-retry'));
  assert(f.nodes.get('gameScore').textContent.includes('غير محفوظة'));
  f.app.retry();f.app.answer(1);assert.equal(f.app.load(),false);assert.equal(f.store.raw,original);assert.equal(f.store.writes,0);
}
{
  const f=fixture('{"score":0}');f.app.load();f.store.failWrite=true;f.app.answer();
  f.store.failWrite=false;const newer=' {"score":90,"answeredQuestions":["other"]} ';f.store.raw=newer;
  f.nodes.get('legacy-progress-retry').onclick();assert.equal(f.store.raw,newer);
  assert(!f.nodes.has('legacy-progress-retry'));assert(f.nodes.has('legacy-progress-warning'));
  f.app.answer(1);assert.equal(f.store.raw,newer);
}
{
  const f=fixture('{"score":0}');f.app.load();f.store.failRead=true;f.app.answer();
  f.store.failRead=false;f.app.retry();assert.equal(f.store.raw,'{"score":0}');assert.equal(f.store.writes,0);
  assert(f.nodes.has('legacy-progress-warning'));
}
{
  const f=fixture(null);assert(f.app.load());f.app.answer();assert(!f.nodes.has('legacy-progress-warning'));
  assert.equal(f.nodes.get('gameScore').textContent,'⭐ نقاطك: 10');assert.equal(JSON.parse(f.store.raw).score,10);
}
console.log(JSON.stringify({passed:true,scenarios:7,scope:'real answer handler, warning DOM, retry click, unsaved labels, no duplicate points, corrupt bytes, stale retry, read errors, reload and success; synthetic DOM/storage only'}));
