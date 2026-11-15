const fs=require('fs');let s=fs.readFileSync('student-journey.js','utf8');
s=s.replace('function finish(){',`function submitForReview(node,runId){
 const profile=state();if(profile.homework!==node.id)return ()=>{};
 const previous=profile.homeworkSubmissions;
 if(previous!==undefined&&!Array.isArray(previous))throw Error('تعذر قراءة تسليمات الواجب القديمة');
 profile.homeworkSubmissions=[...(previous||[]),{id:crypto.randomUUID(),node:node.id,runId:runId||null,submittedAt:Date.now(),verified:false}];delete profile.homework;
 return ()=>{profile.homework=node.id;if(previous===undefined)delete profile.homeworkSubmissions;else profile.homeworkSubmissions=previous;};
}
function finish(){`);
s=s.replace("try{save();}catch(e){state().runs.pop();", "let undoSubmission=()=>{};try{if(homework===active.node.id&&(active.node.supervised||active.node.family==='extended'))undoSubmission=submitForReview(active.node,active.id);save();}catch(e){undoSubmission();state().runs.pop();");
s=s.replace("SeviatWritingActivity(target,root);button('انتهيت',home);return;", "SeviatWritingActivity(target,root);button('انتهيت',()=>{if(!preview&&state().homework===node.id){const undo=submitForReview(node);try{save();}catch(error){undo();throw error;}}home();});return;");
s=s.replace(' renderAdaptiveReport();',` for(const submission of state().homeworkSubmissions||[]){if(submission.reviewedAt)continue;el('p','واجب مسلّم ينتظر تحقق المعلم: '+submission.node,hub);button('تسجيل انتهاء المراجعة دون منح إتقان',()=>{const previous=submission.reviewedAt;submission.reviewedAt=Date.now();try{save();}catch(error){if(previous===undefined)delete submission.reviewedAt;else submission.reviewedAt=previous;throw error;}teacher();},hub);}
 renderAdaptiveReport();`);
fs.writeFileSync('student-journey.js',s,'utf8');
s=fs.readFileSync('tests/adaptive-browser.cjs','utf8');s=s.replace("assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).independent'),false);assert.notEqual", "assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).independent'),false);assert.equal(await cdp.eval('SeviatJourney.getState().homework'),undefined);assert.equal(await cdp.eval('SeviatJourney.getState().homeworkSubmissions.at(-1).verified'),false);assert.notEqual");fs.writeFileSync('tests/adaptive-browser.cjs',s,'utf8');
