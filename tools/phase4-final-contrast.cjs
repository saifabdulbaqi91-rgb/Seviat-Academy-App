const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=process.cwd(),dir=path.join(root,'.access-staging','phase4-final-'+Date.now());fs.mkdirSync(dir);
const files=['child-experience.css','tests/child-experience-browser.cjs','tests/diagnostic-browser.cjs','docs/CHILD_FIRST_LEARNING_PHASE4.md','docs/CHILD_FIRST_PHASE4_PRESERVATION.json'];
for(const file of files){const dest=path.join(dir,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest,fs.constants.COPYFILE_EXCL);}
fs.writeFileSync(path.join(dir,'checkpoint.json'),JSON.stringify({created:new Date().toISOString(),files:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]))},null,2),{flag:'wx'});
let css=fs.readFileSync(files[0],'utf8');const old='background:transparent!important;border:1px solid #89b1c8;color:inherit!important';if(!css.includes(old))throw Error('Unexpected contrast rule');css=css.replace(old,'background:#eaf4ff!important;border:1px solid #89b1c8;color:#173b70!important');fs.writeFileSync(files[0],css);
for(const file of files.slice(1,3)){
 let s=fs.readFileSync(file,'utf8');
 s=s.replace('const requests=[],pageErrors=[],consoleErrors=[];','const requests=[],pageErrors=[],consoleErrors=[],networkFailures=[];');
 s=s.replace("if(m.method==='Runtime.exceptionThrown')", "if(m.method==='Network.loadingFailed')networkFailures.push(m.params);if(m.method==='Runtime.exceptionThrown')");
 s=s.replace("await cdp.send('Runtime.enable');await cdp.send('Page.enable');", "await cdp.send('Runtime.enable');await cdp.send('Page.enable');await cdp.send('Network.enable');");
 const line=s.split('\n').find(l=>l.includes("await cdp.send('Page.navigate',{url});await until("));if(!line)throw Error('Readiness anchor absent '+file);
 const label=file.includes('child-')?'child':'diagnostic';
 s=s.replace(line,` const readinessStart=Date.now();try{${line.trim()}}finally{const snapshot=await cdp.eval('({readyState:document.readyState,unit1:!!window.Unit1Learning,unit1Ready:window.Unit1Learning?.ready,journey:!!window.SeviatJourney,child:!!window.SeviatChildUI,diagnostic:!!window.SeviatDiagnosticUI,resources:performance.getEntriesByType("resource").map(r=>({name:r.name,duration:r.duration,responseEnd:r.responseEnd}))})');fs.writeFileSync(path.join(stage,'${label}-readiness.json'),JSON.stringify({elapsed:Date.now()-readinessStart,snapshot,pageErrors,consoleErrors,networkFailures,requests},null,2),{flag:'wx'});}`);
 if(label==='child'){
 const anchor="assert(await cdp.eval('document.documentElement.scrollWidth<=innerWidth'),'child overflow '+theme+width);";
 if(!s.includes(anchor))throw Error('Contrast anchor missing');
 s=s.replace(anchor,anchor+`const colors=await cdp.eval('(()=>{const s=getComputedStyle(document.querySelector("#journey-next"));return {foreground:s.color,background:s.backgroundColor};})()');const luminance=c=>c.match(/[\\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);const fg=luminance(colors.foreground),bg=luminance(colors.background),ratio=(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);assert(ratio>=4.5,'finished button contrast '+theme+width+' '+ratio);`);
 }
 fs.writeFileSync(file,s);
}
console.log('CHECKPOINT='+dir);