'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/^\uFEFF/,'');
const values=new Map(),events=[];let teacher=false;
const window={addEventListener(){},dispatchEvent:e=>events.push(e),SeviatParentControls:{isAuthenticated:()=>teacher}};
const storage={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,v)};
vm.runInNewContext(read('access-guard.js'),{window,localStorage:storage,CustomEvent:class{constructor(type){this.type=type;}},showMessage(){}});
const A=window.SeviatAccessGuard,d=JSON.parse(read('data/unit1-reviewed.json'));
let checks=0;function check(x,msg){assert(x,msg);checks++;}
for(const q of d.questions){const sub=A.subskill(q);check(sub!=='unmapped',q.id);if(q.skill==='short-vowels')check(['fatha','kasra','damma'].includes(sub),q.id);if(q.skill==='long-vowels')check(['alif','ya','waw'].includes(sub),q.id);}
for(const letter of d.letters)for(const [skill,subs] of [['short-vowels',['fatha','kasra','damma']],['long-vowels',['alif','ya','waw']]])for(const sub of subs){
 values.set('seviat-detailed-access-v1',JSON.stringify({allowed:[A.accessId(letter,skill,sub,'practice')]}));
 const pool=A.filterQuestions(d.questions,letter,skill,'practice');
 check(pool.length===2,letter+sub);check(pool.every(q=>A.subskill(q)===sub),'Mapping leak');
 check(A.filterQuestions(d.questions,letter,skill,'assessment').length===0,'Assessment leak');
}
values.clear();check(A.filterQuestions(d.questions,'م','letter-name','assessment').length===5,'Default');
values.set('seviat-access-v1',JSON.stringify({mode:'custom',allowed:[]}));check(!A.isAllowed('م','letter-name','all','practice'),'Coarse denied');
values.clear();values.set('seviat-detailed-access-v1','broken');check(!!A.getPolicy().error,'Corrupt fail open');check(!A.isAllowed('م','letter-name','all','practice'),'Corrupt denied');
values.clear();const p=A.getPolicy();assert.throws(()=>A.save(p));checks++;
teacher=true;values.set('seviat-access-v1',JSON.stringify({mode:'all',allowed:['future-id'],custom:'preserve'}));const before=values.get('seviat-access-v1');
A.save(A.getPolicy());check(values.get('seviat-access-v1')===before,'Legacy changed');check(A.getPolicy().coarse.custom==='preserve','Unknown field lost');
values.set('seviat-access-policy-v2','{}');check(!!A.getPolicy().error,'Unknown version fail open');
const audit=JSON.parse(read('docs/QUESTION_ACCESS_AUDIT.json'));check(audit.missingSubskillMetadata===60,'Baseline discrepancy');check(d.questions.length===384&&d.writingActivities.length===60,'Bank changed');
console.log(JSON.stringify({passed:true,checks,questions:384,writing:60}));
