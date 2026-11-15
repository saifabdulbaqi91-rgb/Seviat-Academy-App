const fs=require('fs');let s=fs.readFileSync('student-journey.js','utf8');const anchor='function activityExclusions(includeSkipped=true)';const index=s.indexOf(anchor);if(index<0)throw Error('anchor');s=s.slice(0,index)+`function activityMode(node){return E.planSession(learningState(),node).mode==='assessment'?'assessment':'practice';}
function activityPolicy(node,mode,question){
 if(node.kind==='prep'||node.kind==='preparation')return SeviatAccessGuard.coarseAllowed('preparation');
 if(node.kind==='word-game')return SeviatAccessGuard.coarseAllowed('games');
 const sub=question?.subskill|| (question?SeviatAccessGuard.subskill(question):'all');
 return SeviatAccessGuard.isAllowed(node.letter,node.skill,sub,mode,'unit-'+node.unit);
}
function writingTarget(node){return node.skill==='word-writing'?(questionsData.writingActivities?.find(a=>a.letter===node.letter&&a.skill==='word-writing')?.target||window.SeviatWritingModels?.words[node.letter]?.[1]||node.letter+'َا'):node.letter;}
function activityCapable(node){
 if(!R.available(learningState(),node)&&state().homework!==node.id)return true;
 if(node.skill?.includes('writing'))return activityPolicy(node,'practice')&&contentAllowed(writingTarget(node),node);
 if(node.kind==='prep'||node.kind==='preparation')return activityPolicy(node,'practice');
 if(node.kind==='word-game')return activityPolicy(node,'practice')&&wordGamePool(node,false).length>=5;
 const mode=activityMode(node);return safePool([...pool(node,false),...SeviatAdaptiveActivities.questions(node)],node).filter(q=>activityPolicy(node,mode,q)).length>=3;
}
`+s.slice(index);
s=s.replace("(includeSkipped&&skippedOptional.has(node.id))||", "(includeSkipped&&skippedOptional.has(node.id))||!activityCapable(node)||");
s=s.replace("const target=node.skill==='word-writing'?(questionsData.writingActivities?.find(a=>a.letter===node.letter&&a.skill==='word-writing')?.target||window.SeviatWritingModels?.words[node.letter]?.[1]||node.letter+'َا'):node.letter;", "const target=writingTarget(node);");
s=s.replace("if(!preview)qs=safePool(qs,node);", "if(!preview)qs=safePool(qs,node).filter(q=>activityPolicy(node,activityMode(node),q));");
// Existing previews remain independent of learner mastery; policy still controls student activity entry.
fs.writeFileSync('student-journey.js',s);