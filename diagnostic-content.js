/* Adapts verified existing content; creates no new instructional content or audio. */
(function(host){
'use strict';
const map={'letter-shape':'letters','short-vowels':'marks','sound-analysis':'analysis','syllable-building':'building','letter-writing':'handwriting','letter-sound':'listening','letter-name':'speaking'};
const rubric={handwriting:['شكل الحرف واتجاهه صحيحان','موضع النقاط أو غيابها صحيح','كتابة مستقلة دون تتبع أو تقليد مباشر'],listening:['نطق المعلم صوت الحرف دون عرض اسمه أو كتابته','اختار الطفل بطاقة الحرف الصحيحة دون إشارة','ميز الصوت عن بديل سبق تعلمه دون مساعدة'],speaking:['سمى الطفل الحرف باسمه لا بصوته','النطق واضح ومقبول لغويًا لدى المعلم','الإجابة مستقلة دون تلقين']};
function build({rules,profile,configuration,questions,allowed,contentAllowed,engine}){
const c=host.SeviatPlacement?.config(configuration)||require('./diagnostic-placement.js').config(configuration),output=[],seen=new Set();
for(const node of rules.nodes){const branchId=node.id==='prep:matching'?'readiness':map[node.skill];const branch=c.branches.find(b=>b.id===branchId);if(!branch||!rules.available(profile,node,engine)||!allowed(node,branch.method))continue;
const base={nodeId:node.id,branchId,domain:branch.domain,skill:branch.skill,method:branch.method,difficulty:Math.min(3,1+Math.floor(Math.max(0,rules.letters.indexOf(node.letter))/4))};
if(branch.method==='teacher-rubric'){
if(node.unit===2&&node.skill==='letter-sound')continue;
const known=rules.letters.filter(l=>rules.complete(profile,l+':letter-shape',engine));if(branchId==='listening'&&known.length<2)continue;
const item={...base,id:'teacher:'+node.id,sourceId:'existing-activity:'+node.id,target:node.letter,rubric:rubric[branchId],alternatives:known.filter(l=>l!==node.letter).slice(0,2)};output.push(item);continue;
}
for(const q of questions(node)){
if(q.teacherReview||q.scaffold||q.type==='teacher-listening'||!q.options?.includes(q.answer)||q.options.length<2||new Set(q.options).size!==q.options.length)continue;
if(q.requiredLetters?.some(l=>l!==node.letter&&!rules.complete(profile,l+':syllable-building',engine)))continue;
if(!q.semanticChoices&&q.options.some(value=>!contentAllowed(value,node)))continue;
const key=JSON.stringify([node.id,q.stimulus||'',q.answer,[...q.options].sort()]);if(seen.has(key))continue;seen.add(key);
output.push({...base,id:'item:'+q.id,sourceId:q.id,question:JSON.parse(JSON.stringify(q))});
}
}
return output;
}
const api={build,rubric};if(typeof module!=='undefined')module.exports=api;else host.SeviatDiagnosticContent=api;
})(typeof window==='undefined'?globalThis:window);