'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');
const root = path.resolve(__dirname, '..');
const backup = path.resolve(process.argv[2] || '');
const output = path.join(root, 'docs', 'WORKTREE_AUDIT_20261112.json');
if (!process.argv[2] || backup.startsWith(root + path.sep)) throw Error('An external backup is required');
if (fs.existsSync(output)) throw Error('Audit output already exists; preserve it and choose a new filename');
const tracked = new Set(cp.execFileSync('git', ['ls-files', '-z'], {cwd:root, encoding:'utf8'}).split('\0'));
function category(file) {
  if (file.startsWith('.git/')) return 'git-metadata';
  if (/^(\.access-staging|\.quality-staging|\.unit1-staging|Microsoft)\//.test(file)) return 'temporary-or-browser-data';
  if (file.startsWith('backups/') || /(?:\.backup|\.before-|\.bak$|\.zip$)/i.test(file)) return 'backup-or-archive';
  if (/^(local-student-data|student-exports)\/|^seviat-journey.*\.json$/.test(file)) return 'local-student-data';
  if (file === 'data/progress.json') return 'tracked-progress-template-review-before-real-data';
  if (/^tests\//.test(file)) return 'test-source';
  if (/^tools\/|\.(py|ps1)$/.test(file)) return 'development-tool-source';
  if (/^docs\/|\.md$/.test(file)) return 'documentation-source';
  if (/\.txt$/.test(file)) return 'audit-or-text-resource-review';
  if (/^(sounds|icons)\//.test(file)) return /(?:test|sample)/i.test(file) ? 'media-review-candidate' : 'application-asset';
  if (/^data\/.*\.json$/.test(file)) return 'curriculum-or-reference-data';
  if (/\.(html|css|js|json)$/.test(file)) return 'application-source';
  return 'other-review';
}
function walk(dir, relative='') {
  const list=[];
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const rel=(relative ? relative+'/' : '')+entry.name;
    if(entry.isSymbolicLink()) { list.push({path:rel,symlink:true}); continue; }
    if(entry.isDirectory()) list.push(...walk(path.join(dir,entry.name),rel));
    else {
      const buffer=fs.readFileSync(path.join(dir,entry.name));
      const item={path:rel,bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex'),category:category(rel),tracked:tracked.has(rel)};
      if(!rel.startsWith('.git/')) {
        const current=path.join(root,rel);
        item.workspaceMatches=fs.existsSync(current)&&crypto.createHash('sha256').update(fs.readFileSync(current)).digest('hex')===item.sha256;
      }
      list.push(item);
    }
  }
  return list;
}
const files=walk(backup);
const mismatches=files.filter(f=>f.workspaceMatches===false);
const categories={};for(const file of files)categories[file.category]=(categories[file.category]||0)+1;
const audit={createdAt:new Date().toISOString(),root,backup,gitStatus:cp.execFileSync('git',['status','--porcelain=v1','-uall'],{cwd:root,encoding:'utf8'}),categories,totalFiles:files.length,totalBytes:files.reduce((n,f)=>n+(f.bytes||0),0),mismatches,files};
fs.writeFileSync(output,JSON.stringify(audit,null,2),{flag:'wx'});
console.log(JSON.stringify({output,backup,files:files.length,categories,mismatches:mismatches.map(f=>f.path)},null,2));
if(mismatches.length)process.exitCode=1;
