'use strict';
const assert=require('assert/strict'),fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto'),cp=require('child_process'),P=require('../tools/prepare-pages.cjs');
const root=path.resolve(__dirname,'..'),staged=()=>cp.execFileSync('git',['diff','--name-only','--cached'],{cwd:root,encoding:'utf8'}),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let checks=0;const check=(value,label)=>{assert(value,label);checks++;};
const beforeIndex=staged(),files=P.files(),before=new Map(files.map(file=>[file,hash(path.join(root,P.source(file)))]));
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'afaq-package-check-')),output=path.join(folder,'site'),built=P.build(output);
function walk(dir,prefix=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name),prefix+entry.name+'/'):[prefix+entry.name]);}
const home=fs.readFileSync(path.join(output,'index.html'),'utf8');
check(/\p{Script=Arabic}/u.test(home)&&!/\?{3,}/.test(home),'public portal preserves Arabic UTF-8 text');
const expected=[...files,'.nojekyll'].sort(),actual=walk(output).sort();
check(JSON.stringify(actual)===JSON.stringify(expected),'artifact contains exactly the runtime allowlist');
check(built.files.length===files.length,'build manifest matches source manifest');
for(const file of files){check(hash(path.join(output,file))===before.get(file),'unchanged deployed bytes '+file);check(hash(path.join(root,P.source(file)))===before.get(file),'source preserved '+file);}
check(!actual.some(file=>/^(tools|tests|backups|references|Microsoft|\.git|\.github)\//.test(file)||/backup|before-|\.log$|\.zip$/i.test(file)),'no tools, backups, repository metadata, tests or archives published');
assert.throws(()=>P.build(output),/existing work is never overwritten/);checks++;
assert.throws(()=>P.build(root),/existing work is never overwritten/);checks++;
check(staged()===beforeIndex,'Git staging preserved');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');
check(/on:\s*\r?\n\s+workflow_dispatch:/.test(workflow)&&!/^\s+(push|pull_request):/m.test(workflow),'no automatic deployment trigger');
check(/default:\s*false/.test(workflow)&&workflow.includes("inputs.deploy && github.ref == 'refs/heads/afaq-development'"),'deployment is an explicit manual opt-in on the intended branch');
check(workflow.includes('path: ${{ runner.temp }}/afaq-pages'),'only prepared artifact uploaded');
check(workflow.includes('Refuse publication while verification is unresolved')&&workflow.includes('m.remainingVerification?.length'),'unresolved audio gate blocks publication');
check(workflow.includes('node tests/native-audio-browser.cjs')&&workflow.includes('node tests/native-audio-controls-browser.cjs')&&workflow.includes('node tests/audio-transport-check.cjs'),'release requires real media completion, controls and HTTP transport checks');
const reviewManifest=path.join(root,'docs/deployment/2026-11-24-student-testing-files.json');
if(fs.existsSync(reviewManifest)){const reviewed=JSON.parse(fs.readFileSync(reviewManifest,'utf8').replace(/^\uFEFF/,''));check(JSON.stringify([...reviewed.publishedRuntimeFiles].sort())===JSON.stringify(expected),'reviewed file list remains exact');}
console.log(JSON.stringify({passed:true,checks,runtimeFiles:actual.length,output,stagingPreserved:true,deployDispatched:false}));
