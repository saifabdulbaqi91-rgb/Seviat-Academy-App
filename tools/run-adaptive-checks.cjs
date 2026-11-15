'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'.access-staging','adaptive-'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(output,{recursive:false});
const env={...process.env,SEVIAT_TEST_OUTPUT:output};
const checks=[['tests/unit3-alif-pilot-check.cjs'],['tests/official-curriculum-map-check.cjs'],['tests/literacy-foundation-check.cjs'],['tests/personalized-learning-check.cjs'],['tests/game-onboarding-check.cjs'],['tests/calm-audio-check.cjs'],['tests/child-fixes-check.cjs'],['tests/workspace-check.cjs'],['tests/child-experience-check.cjs'],['tests/diagnostic-check.cjs'],['tests/interactions-check.cjs'],['tests/universal-path-check.cjs'],['tests/pedagogical-check.cjs'],['tests/adaptive-check.cjs'],['tests/journey-check.cjs'],['tests/unit1-check.cjs','--live'],['tests/quality-check.cjs'],['tests/access-check.cjs','--live']];
if(process.argv.includes('--literacy-only')){checks.length=0;checks.push(['tests/literacy-foundation-check.cjs'],['tests/literacy-foundation-browser.cjs','--live']);}
if(process.argv.includes('--phase6-only')){checks.length=0;checks.push(['tests/personalized-learning-check.cjs'],['tests/personalized-learning-browser.cjs','--live']);}
if(process.argv.includes('--phase6-compat-only')){checks.length=0;checks.push(['tests/personalized-learning-check.cjs'],['tests/personalized-learning-browser.cjs','--live'],['tests/workspace-check.cjs'],['tests/workspace-browser.cjs','--live'],['tests/child-experience-check.cjs'],['tests/child-experience-browser.cjs','--live']);}
if(process.argv.includes('--onboarding-compat-only')){checks.length=0;checks.push(['tests/game-onboarding-check.cjs'],['tests/child-fixes-check.cjs'],['tests/game-onboarding-browser.cjs','--live'],['tests/child-fixes-browser.cjs','--live']);}
if(process.argv.includes('--onboarding-only')){checks.length=0;checks.push(['tests/game-onboarding-check.cjs'],['tests/game-onboarding-browser.cjs','--live']);}
if(process.argv.includes('--child-fixes-only')){checks.length=0;checks.push(['tests/child-fixes-check.cjs'],['tests/child-fixes-browser.cjs','--live']);}
if(process.argv.includes('--calm-only')){checks.length=0;checks.push(['tests/calm-audio-check.cjs'],['tests/arabic-speech-native-browser.cjs','--live']);}
if(process.argv.includes('--native-speech-only')){checks.length=0;checks.push(['tests/arabic-speech-native-browser.cjs','--live']);}
if(process.argv.includes('--access-only')){checks.length=0;checks.push(['tests/access-check.cjs','--live'],['tests/access-browser.cjs','--live']);}
if(process.argv.includes('--adaptive-only')){checks.length=0;checks.push(['tests/adaptive-check.cjs'],['tests/adaptive-browser.cjs','--live']);}
if(process.argv.includes('--universal-only')){checks.length=0;checks.push(['tests/universal-path-check.cjs'],['tests/universal-path-browser.cjs','--live']);}
if(process.argv.includes('--interactions-only')){checks.length=0;checks.push(['tests/interactions-check.cjs'],['tests/interactions-browser.cjs','--live']);}
if(process.argv.includes('--diagnostic-only')){checks.length=0;checks.push(['tests/diagnostic-check.cjs'],['tests/diagnostic-browser.cjs','--live']);}
if(process.argv.includes('--child-only')){checks.length=0;checks.push(['tests/child-experience-check.cjs'],['tests/child-experience-browser.cjs','--live']);}
if(process.argv.includes('--workspace-only')){checks.length=0;checks.push(['tests/workspace-check.cjs'],['tests/workspace-browser.cjs','--live']);}
if(process.argv.includes('--browser'))checks.push(['tests/unit3-alif-pilot-browser.cjs','--live'],['tests/literacy-foundation-browser.cjs','--live'],['tests/personalized-learning-browser.cjs','--live'],['tests/game-onboarding-browser.cjs','--live'],['tests/arabic-speech-native-browser.cjs','--live'],['tests/child-fixes-browser.cjs','--live'],['tests/workspace-browser.cjs','--live'],['tests/child-experience-browser.cjs','--live'],['tests/diagnostic-browser.cjs','--live'],['tests/interactions-browser.cjs','--live'],['tests/universal-path-browser.cjs','--live'],['tests/pedagogical-browser.cjs','--live'],['tests/journey-browser.cjs','--live'],['tests/adaptive-browser.cjs','--live'],['tests/access-browser.cjs','--live'],['tests/unit1-browser.cjs','--live']);
const baselineMetadata=path.join(root,'.access-staging','changed-files.json');
if(fs.existsSync(baselineMetadata))fs.copyFileSync(baselineMetadata,path.join(output,'changed-files.json'),fs.constants.COPYFILE_EXCL);
const sourceFiles=['arabic-learning-path.js','data/unit1-reviewed.json','data/questions.json','data/skills.json','tests/universal-path-check.cjs','tests/universal-path-browser.cjs','afaq-fonts.css','app.js','seviat-sound-settings.js','writing-board.js','index.html','adaptive-learning.js','adaptive-activities.js','journey-rules.js','student-journey.js','student-journey.css','unit1-learning.js','unit1-rules.js','unit2-preparation.js'];sourceFiles.push(...fs.readdirSync(root).filter(f=>/\.(js|css|html)$/.test(f)&&!/(backup|before|\.bak)/i.test(f)),...fs.readdirSync(path.join(root,'data')).filter(f=>f.endsWith('.json')&&!/backup/i.test(f)).map(f=>'data/'+f),...fs.readdirSync(path.join(root,'tests')).filter(f=>/\.(js|cjs)$/.test(f)).map(f=>'tests/'+f),'tests/calm-sound-source.json','manifest.json','instruction-audio.json','tools/run-adaptive-checks.cjs','docs/UNIT1_ADDITIONAL_QUESTIONS_AUDIT.json');const sourceHashes=()=>Object.fromEntries(sourceFiles.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));const initialHashes=sourceHashes();
console.log('TEST_OUTPUT='+output);
const results=[];
for(const args of checks){
 console.log('RUN '+args.join(' '));
 const run=cp.spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',windowsHide:true,timeout:420000,maxBuffer:10*1024*1024});
 fs.writeFileSync(path.join(output,path.basename(args[0])+'.log'),(run.stdout||'')+(run.stderr||''),{flag:'wx'});
 console.log(run.stdout||'');if(run.stderr)console.error(run.stderr);
 results.push({command:args,passed:run.status===0,error:run.error?.message||null});
}
fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify({output,results,sourceHashes:initialHashes,sourceUnchangedDuringTests:JSON.stringify(initialHashes)===JSON.stringify(sourceHashes())},null,2),{flag:'wx'});
console.log(JSON.stringify({output,results},null,2));
if(JSON.stringify(initialHashes)!==JSON.stringify(sourceHashes())||results.some(result=>!result.passed))process.exitCode=1;
