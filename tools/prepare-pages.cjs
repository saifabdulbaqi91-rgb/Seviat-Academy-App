'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
const data=['question-bank','question-bank-audio-plan','afaq-curriculum-question-map','afaq-journey-lesson-catalog','afaq-curriculum-progression','afaq-question-special-gates','official-curriculum-map'].map(name=>'data/'+name+'.json');
const runtime=['afaq-fonts.css','afaq-student-testing.css','afaq-cache-refresh.js','afaq-testing-audio.js','afaq-student-speech.js','afaq-student-effects.js','afaq-question-audio-bridge.js','afaq-question-audio.js','afaq-question-bank-bridge.js','afaq-question-bank-activities.js','afaq-student-testing.js'];
function source(name){return name==='index.html'?'student-index.html':name;}
function files(){
 const selected=new Set(['index.html','testing.html','manifest.json','sw.js',...data,...runtime]);
 // Explicit reviewed media list: newly tracked files cannot silently enter the public artifact.
 for(const name of ["assets/branding/afaq-logo-dark.png","assets/branding/afaq-logo-light.png","sounds/alif_long.wav","sounds/damma_short.wav","sounds/fatha_short.wav","sounds/feedback/correct.mp3","sounds/feedback/success.mp3","sounds/feedback/wrong.mp3","sounds/kasra_short.wav","sounds/meem-review.mp3","sounds/meem-slow.mp3","sounds/teacher/correct-1.mp3","sounds/teacher/correct-2.mp3","sounds/teacher/correct-3.mp3","sounds/teacher/correct-4.mp3","sounds/teacher/success-1.mp3","sounds/teacher/success-2.mp3","sounds/teacher/success-3.mp3","sounds/teacher/wrong-1.mp3","sounds/teacher/wrong-2.mp3","sounds/teacher/wrong-3.mp3","sounds/waw_long.wav","sounds/ya_long.wav"])selected.add(name);
 for(const file of [...selected].filter(f=>f.endsWith('.js'))){
  const text=fs.readFileSync(path.join(root,file),'utf8');
  for(const match of text.matchAll(/['"]((?:\.\/)?(?:data\/|docs\/recording-readiness\/)?[a-zA-Z0-9_./-]+\.(?:json|csv))['"]/g)){
   const dep=match[1].replace(/^\.\//,'');if(fs.existsSync(path.join(root,dep))&&!selected.has(dep))throw Error('Missing runtime dependency '+dep+' from '+file);
  }
 }
 const list=[...selected].sort();
 for(const name of list){if(!/^[\w./-]+$/.test(name)||name.split('/').includes('..')||/(?:backup|before-|\.log$|\.zip$)/i.test(name)||!fs.statSync(path.join(root,source(name))).isFile()||fs.lstatSync(path.join(root,source(name))).isSymbolicLink())throw Error('Unsafe/missing runtime file '+name);}
 return list;
}
function build(destination){
 const resolved=path.resolve(destination);if(fs.existsSync(resolved))throw Error('Output must be a new directory; existing work is never overwritten');
 const list=files();fs.mkdirSync(resolved,{recursive:true});
 for(const name of list){const target=path.join(resolved,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,source(name)),target);}
 fs.writeFileSync(path.join(resolved,'.nojekyll'),'');return {files:list,output:resolved};
}
if(require.main===module){try{const args=process.argv.slice(2);if(args.length===2&&args[0]==='--output')console.log(JSON.stringify(build(args[1]),null,2));else if(!args.length||args[0]==='--list')console.log(files().join('\n'));else throw Error('Usage: node tools/prepare-pages.cjs [--list | --output NEW_DIRECTORY]');}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={files,build,source};
