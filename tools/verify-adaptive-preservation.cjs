'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const inventory=JSON.parse(fs.readFileSync(path.join(root,'docs/WORKTREE_AUDIT_20261112.json'),'utf8').replace(/^\uFEFF/,''));
const edited=new Set(['index.html','journey-rules.js','student-journey.js','student-journey.css','tests/journey-browser.cjs','tests/access-browser.cjs']);
const missing=[],unexpectedChanges=[],changedAsPlanned=[];
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let checked=0;
for(const file of inventory.files){
 if(file.path.startsWith('.git/'))continue;
 const current=path.resolve(root,file.path);
 if(!current.startsWith(root+path.sep))throw Error('Inventory path outside workspace');
 if(!fs.existsSync(current)){missing.push(file.path);continue;}
 if(['temporary-or-browser-data','backup-or-archive'].includes(file.category))continue;
 checked++;
 if(hash(current)!==file.sha256)(edited.has(file.path)?changedAsPlanned:unexpectedChanges).push(file.path);
}
const gitHead=inventory.files.find(file=>file.path==='.git/HEAD');
const headUnchanged=gitHead&&hash(path.join(root,'.git/HEAD'))===gitHead.sha256;
const result={passed:!missing.length&&!unexpectedChanges.length&&headUnchanged,backup:inventory.backup,baselineFiles:inventory.totalFiles,sourceFilesCompared:checked,changedAsPlanned,missing,unexpectedChanges,gitHeadUnchanged:Boolean(headUnchanged),gitignoreUnchanged:hash(path.join(root,'.gitignore'))===inventory.files.find(file=>file.path==='.gitignore').sha256};
const output=path.join(root,'docs','ADAPTIVE_PRESERVATION_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');fs.writeFileSync(output,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({output,...result},null,2));if(!result.passed)process.exitCode=1;
