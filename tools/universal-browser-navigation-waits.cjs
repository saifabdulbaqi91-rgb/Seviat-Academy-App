const fs=require('fs'),path=require('path');
for(const file of ['tests/access-browser.cjs']){const dest=path.join('.access-staging/universal-phase1-1794519341516',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest,fs.constants.COPYFILE_EXCL);}
for(const file of ['tests/adaptive-browser.cjs','tests/journey-browser.cjs','tests/access-browser.cjs','tests/unit1-browser.cjs']){
 let s=fs.readFileSync(file,'utf8');
 s=s.replaceAll("await cdp.send('Page.reload')", "await cdp.eval('window.seviatTestReloadPending=true');await cdp.send('Page.reload')");
 s=s.replaceAll("cdp.eval('window.Unit1Learning?.ready", "cdp.eval('!window.seviatTestReloadPending&&window.Unit1Learning?.ready");
 s=s.replaceAll("click('details summary')", "click('#activityArea details summary')");
 fs.writeFileSync(file,s);
}
let s=fs.readFileSync('tools/run-adaptive-checks.cjs','utf8');s=s.replace(";const sourceHashes=()", ";sourceFiles.push(...fs.readdirSync(root).filter(f=>/\\.(js|css|html)$/.test(f)&&!/(backup|before|\\.bak)/i.test(f)),...fs.readdirSync(path.join(root,'data')).filter(f=>f.endsWith('.json')&&!/backup/i.test(f)).map(f=>'data/'+f),...fs.readdirSync(path.join(root,'tests')).filter(f=>/\\.(js|cjs)$/.test(f)).map(f=>'tests/'+f),'tools/run-adaptive-checks.cjs','docs/UNIT1_ADDITIONAL_QUESTIONS_AUDIT.json');const sourceHashes=()");fs.writeFileSync('tools/run-adaptive-checks.cjs',s);