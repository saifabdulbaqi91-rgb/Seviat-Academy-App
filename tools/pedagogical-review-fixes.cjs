'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');const stage=path.join(root,'.access-staging','pedagogical-source-'+Date.now());fs.mkdirSync(stage);
const files=['adaptive-learning.js','student-journey.js','afaq-fonts.css','app.js','seviat-sound-settings.js','writing-board.js'];const hashes={};
for(const f of files){const b=fs.readFileSync(path.join(root,f));fs.writeFileSync(path.join(stage,f),b,{flag:'wx'});hashes[f]=crypto.createHash('sha256').update(b).digest('hex');}
fs.writeFileSync(path.join(stage,'manifest.json'),JSON.stringify(hashes,null,2),{flag:'wx'});console.log('SOURCE_SNAPSHOT='+stage);
function edit(file,fn){const text=fs.readFileSync(file,'utf8');fs.writeFileSync(file,fn(text),'utf8');}
edit('adaptive-learning.js',s=>{
 const dueStart=s.indexOf('    const due = summaries.filter');const dueEnd=s.indexOf('    const next = rules.nodes.find',dueStart);const due=s.slice(dueStart,dueEnd);s=s.slice(0,dueStart)+s.slice(dueEnd);s=s.replace('    const recentRuns=',due+'    const recentRuns=');
 return s.replace("node.kind==='word-game'&&new Set", "node.kind==='word-game'&&!rules.complete(state,node.id)&&new Set");
});
edit('student-journey.js',s=>s.replace("skippedOptional.has(node.id)||", "skippedOptional.has(node.id)||(node.kind==='word-game'&&wordGamePool(node,false).length<5)||")
 .replace("'نكتشف الحرف '+run.node.letter+' خطوة بخطوة.'", "run.node.kind==='word-game'?'نركّب كلمات تعلمناها.':'نكتشف الحرف '+run.node.letter+' خطوة بخطوة.'")
 .replace("if(completed||active.plan.mode==='diagnostic'||", "if((active.node.optional&&state().homework!==active.node.id)||completed||active.plan.mode==='diagnostic'||")
 .replace("if(summary.status==='not-started')continue;", "")
 .replace("summary.weakSubskills.join('، ')", "summary.weakSubskills.map(skill=>({all:'المهارة العامة',fatha:'الفتحة',kasra:'الكسرة',damma:'الضمة',alif:'المد بالألف',ya:'المد بالياء',waw:'المد بالواو','ending-mark':'علامة آخر الحرف','silent-ending':'السكون','joining-position':'الاتصال'})[skill]||skill).join('، ')")
 .replace("q.visual?'الشكل المطابق':q.answer", "q.visual?'جرب الاختيار':q.answer")
 .replace("for(const b of options.children)b.disabled=true;", "for(const b of options.children){b.disabled=true;if(b.dataset.value===q.answer){b.style.borderColor='#23856d';b.setAttribute('aria-label',(b.getAttribute('aria-label')||b.textContent)+' — الإجابة الصحيحة');}}")
 .replace("if(q.visual){choice.innerHTML", "choice.dataset.value=value;if(q.visual){choice.innerHTML"));
edit('app.js',s=>{const start=s.indexOf('function speak(text) {');const end=s.indexOf('\nfunction createActivityArea()',start);if(start<0||end<0)throw Error('Speech hook not found');return s.slice(0,start)+'function speak() {\n  // Educational pronunciation requires a reviewed recording or the teacher.\n  return false;\n}\n\n'+s.slice(end);});
edit('afaq-fonts.css',s=>s+`\n/* Journey and current lesson renderers: preserve Arabic shaping and marks. */
#journey h3,#journey .journey-model,#journey .journey-options button,
#u1-options button,#activityArea .sv2-prompt,#activityArea .sv2-options button,
#activityArea .sv2-target,#activityArea [data-shape],.sw-guide {
 font-family:'Noto Naskh Arabic',serif!important;line-height:2!important;
 padding-block:12px;overflow:visible;letter-spacing:normal;
}
#journey .journey-options{grid-template-columns:repeat(auto-fit,minmax(min(120px,100%),1fr))}
#journey .journey-model{overflow-wrap:anywhere;margin-inline:0}
#journey .journey-options button{overflow-wrap:anywhere;min-width:0}
`);
edit('writing-board.js',s=>s.replace('font-family:Arial,sans-serif;',"font-family:'Noto Naskh Arabic',serif;line-height:2;"));
edit('seviat-sound-settings.js',s=>s.replace("b.closest('.sv2-options')", "b.closest('#journey .journey-options')||b.closest('.sv2-options')"));
