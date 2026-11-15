'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm'),assert=require('assert/strict'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),stage=path.join(root,'.unit1-staging');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const readJSON=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const browser=readJSON(path.join(stage,'browser-results.json')),checks=readJSON(path.join(stage,'unit-results.json'));
assert(browser.passed&&checks.passed&&browser.mode==='staged'&&checks.mode==='staged','Staged tests must pass');
assert.equal(browser.activeQuestions,372);assert.equal(checks.activeQuestions,372);
const entries=Object.entries(browser.testedHashes||{});assert.equal(entries.length,13,'Missing tested file hashes');
const expectedSources=readJSON(path.join(stage,'source-hashes.json'));
const targets=entries.map(([relative,expected])=>{
 const dest=path.resolve(root,relative),src=path.resolve(stage,relative);
 assert(dest.startsWith(root+path.sep)&&src.startsWith(stage+path.sep),'Path outside workspace');
 const bytes=fs.readFileSync(src);assert.equal(hash(bytes),expected,'Changed since browser test: '+relative);
 if(relative.endsWith('.js')||relative.endsWith('.cjs'))new vm.Script(bytes.toString('utf8'),{filename:relative});
 if(relative.endsWith('.json'))JSON.parse(bytes.toString('utf8'));
 return {relative,dest,bytes,before:fs.existsSync(dest)?fs.readFileSync(dest):null};
});
if(targets.every(t=>t.before&&hash(t.before)===hash(t.bytes))){console.log('Already applied: no files changed, no additional questions or backups.');process.exit(0);}
for(const [relative,expected] of Object.entries(expectedSources))assert.equal(hash(fs.readFileSync(path.join(root,relative))),expected,'Source changed after preparation: '+relative);
const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date()).replace(/[-: ]/g,'');
const backup=path.join(root,'backups','unit1-safe-'+stamp);fs.mkdirSync(backup,{recursive:false});
const backupFiles=[...new Set([...Object.keys(expectedSources),...targets.filter(t=>t.before).map(t=>t.relative)])];
const manifest=[];
for(const relative of backupFiles){const source=path.join(root,relative),dest=path.join(backup,relative),bytes=fs.readFileSync(source);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes,{flag:'wx'});assert.equal(hash(fs.readFileSync(dest)),hash(bytes));manifest.push({file:relative,sha256:hash(bytes)});}
fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),timeZone:'Asia/Riyadh',files:manifest,newFiles:targets.filter(t=>!t.before).map(t=>t.relative)},null,2));
const written=[];
try{
 for(const item of targets){fs.mkdirSync(path.dirname(item.dest),{recursive:true});const temporary=item.dest+'.unit1-tmp';fs.writeFileSync(temporary,item.bytes,{flag:'wx'});fs.renameSync(temporary,item.dest);written.push(item);assert.equal(hash(fs.readFileSync(item.dest)),hash(item.bytes));}
 const validation=spawnSync(process.execPath,[path.join(root,'tests','unit1-check.cjs'),'--live'],{cwd:root,encoding:'utf8',windowsHide:true});
 if(validation.status!==0)throw Error('Post-write validation failed: '+validation.stdout+'\n'+validation.stderr);
 const result={backup:path.relative(root,backup),changedFiles:targets.map(t=>t.relative),status:'applied-awaiting-live-browser',postWriteChecks:JSON.parse(validation.stdout)};
 fs.writeFileSync(path.join(stage,'deployment.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){
 for(const item of written.reverse()){
  assert(item.dest.startsWith(root+path.sep),'Unsafe rollback path');
  if(item.before)fs.writeFileSync(item.dest,item.before);
  else if(fs.existsSync(item.dest))fs.unlinkSync(item.dest); // Only files created by this transaction.
 }
 throw error;
}