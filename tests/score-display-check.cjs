'use strict';
// Synthetic presentation fixtures only; no storage, browser or disk writes.
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const app=read('app.js');
const label=app.slice(app.indexOf('function legacyPointsLabel('),app.indexOf('function validLegacyScore('));
const context=vm.createContext({});
vm.runInContext('let score=0,legacyProgressPending=false;'+label,context);
let checks=0;
for(const value of [0,1,2,3,10,20,30,100,1234,12.5])for(const pending of [false,true]){
  const result=vm.runInContext(`score=${value};legacyProgressPending=${pending};legacyPointsLabel()`,context);
  assert.equal(result,'⭐ نقاطك: '+value+(pending?' (غير محفوظة)':''));checks++;
}
const R=require('../journey-rules'),I=require('../journey-interactions');
const source=read('student-journey.js');
const rewardFunction=source.split('\n').find(line=>line.startsWith('function rewardSummary('));
for(const count of [0,1,2,3,10,20,100]){
  const profile={runs:Array.from({length:count},(_,i)=>({id:'synthetic-'+i,node:'prep:matching',results:[{correct:true}]}))};
  const before=JSON.stringify(profile),text=[];
  const c=vm.createContext({Interactive:I,R,state:()=>profile,root:{},el:(tag,value)=>{if(value!==undefined)text.push(value);return {};}});
  vm.runInContext(rewardFunction+'\nrewardSummary(root,true);',c);
  assert(text.includes('★ '+count+' نجوم للمشاركة والتدريب'));
  assert(text.some(s=>s.includes('المشاركة: '+count+' جلسات')));
  assert.equal(JSON.stringify(profile),before,'rendering must not change progress');checks+=3;
}
const C=require('../afaq-workspace-core');
for(const performance of [0,1,2,30,80,100]){
  const profile={name:'طالب اصطناعي'},before=JSON.stringify(profile);
  const report=C.report({profile,rules:R,nodeTitle:()=>''},{rows:[{nodeId:'prep:matching',status:'learning',performance}]});
  assert.equal(report.rows[0].performanceLabel,performance+'٪ دقة العينة المستقلة');
  assert.equal(JSON.stringify(profile),before);checks+=2;
}
console.log(JSON.stringify({passed:true,checks,scope:'ASCII score digits, unsaved suffix, real student/teacher reward rendering, dashboard percentages; no progress mutation'}));
