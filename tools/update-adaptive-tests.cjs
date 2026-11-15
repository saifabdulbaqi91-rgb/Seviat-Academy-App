const fs=require('fs');let s=fs.readFileSync('tests/adaptive-check.cjs','utf8');s=s.replace("E.difficulty({runs:[run('x'),run('x')]},'x',now)==='stretch','sustained success raises challenge'", "E.difficulty({runs:[run('x'),run('x')]},'x',now)==='standard','progress alone does not certify mastery'");s=s.replace("console.log(JSON.stringify({passed:true,checks}));",`
const spaced={runs:[run('x',[],{mode:'assessment',completedAt:now-2*86400000}),run('x',[],{mode:'assessment',completedAt:now})]};
check(E.mastery(spaced,'x',now).status==='confirmed','mastery needs separated independent assessments');
check(E.difficulty(spaced,'x',now)==='stretch','confirmed mastery permits greater challenge');
check(E.mastery({runs:[run('x',[],{mode:'diagnostic'}),run('x',[],{mode:'practice'})]},'x',now).status!=='confirmed','diagnostic is not confirmed mastery');
check(E.planSession({runs:[run()]},R.nodes.find(n=>n.id==='م:letter-shape'),now).mode==='diagnostic','new skill can trigger a short diagnostic');
check(E.planSession({runs:[run()]},R.nodes.find(n=>n.id==='م:letter-shape'),now).count===3,'diagnostic is short');
check(E.planSession({runs:[],sessionMode:'assessment'},R.nodes[0],now).mode==='assessment','teacher chooses assessment');
check(E.recommend({runs:[run('م:letter-shape'),run('م:letter-shape')],overrides:{'prep:matching':'allow'}},R,now).reason==='varied-practice','existing games vary short learning sessions');
console.log(JSON.stringify({passed:true,checks}));`);
fs.writeFileSync('tests/adaptive-check.cjs',s,'utf8');
