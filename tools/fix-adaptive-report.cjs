const fs=require('fs');let s=fs.readFileSync('student-journey.js','utf8');s=s.replace('const recommendation=recommendation(),reasons=', 'const suggested=recommendation(),reasons=').replace('n.id===recommendation.nodeId','n.id===suggested.nodeId').replace('reasons[recommendation.reason]','reasons[suggested.reason]');fs.writeFileSync('student-journey.js',s,'utf8');
s=fs.readFileSync('tests/adaptive-check.cjs','utf8');s=s.replace("console.log(JSON.stringify({passed:true,checks}));",`
const A=require('../adaptive-activities.js');
for(const node of R.nodes.filter(n=>!n.optional&&n.letter))for(const q of A.questions(node)){
 check(q.options.includes(q.answer),'new task includes its answer');
 check(new Set(q.options).size===q.options.length,'new task choices are distinct');
 check(q.requiredLetters.every(l=>l===node.letter),'new task uses no future letter');
 check(q.evidenceScope==='visual-recognition','visual tasks never claim verified pronunciation');
 if(q.operation==='identify-short-mark')check(q.answer===({'َ':'الفتحة','ِ':'الكسرة','ُ':'الضمة'})[[...q.stimulus].at(-1)],'correct short mark name');
 if(q.operation==='identify-long-mark')check(q.answer===({'ا':'مد بالألف','ي':'مد بالياء','و':'مد بالواو'})[q.stimulus.at(-1)],'correct long mark name');
 if(q.operation==='build-visible-long'||q.operation==='build-visible-closed')check(q.answer===q.stimulus.split(' + ').join(''),'correct grapheme assembly');
}
check(!E.progressReady({runs:[run('x',[],{assisted:true}),run('x',[],{assisted:true})]},'x'),'assisted sessions never become independent evidence');
console.log(JSON.stringify({passed:true,checks}));`);fs.writeFileSync('tests/adaptive-check.cjs',s,'utf8');
