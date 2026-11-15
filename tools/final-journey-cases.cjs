const fs=require('fs');let s=fs.readFileSync('tests/adaptive-browser.cjs','utf8');const anchor=' const known={};';if(!s.includes(anchor))throw Error('anchor');s=s.replace(anchor,`
 // Explicit learner journeys in the real isolated Chrome page.
 const successfulMatching=(id,time)=>({id,node:'prep:matching',mode:'assessment',evidenceVersion:2,independent:true,completedAt:time,results:Array.from({length:5},(_,i)=>({id:'matching-'+i,taskKey:'matching-'+i,correct:true,verified:true}))});
 const returningRuns=[successfulMatching('old-1',Date.now()-12*86400000),successfulMatching('old-2',Date.now()-10*86400000)];
 await seed({runs:returningRuns});
 assert.equal(await cdp.eval('SeviatJourney.recommend().reason'),'spaced-review');
 assert.equal(await cdp.eval('SeviatJourney.recommend().nodeId'),'prep:matching');
 assert.equal(await cdp.eval(\"document.querySelector('#journey-start').textContent\"),'تابع رحلتك');
 await click('#journey-start');await session(5);assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).node'),'prep:matching');
 const savedReturning=await cdp.eval('SeviatJourney.getState().runs.length');await cdp.send('Page.reload');await until(()=>cdp.eval('window.Unit1Learning?.ready&&window.SeviatJourney'),'returning reload');assert.equal(await cdp.eval('SeviatJourney.getState().runs.length'),savedReturning);
 assert.notEqual(await cdp.eval('SeviatJourney.recommend().reason'),'spaced-review');
 // Recent repeated success should progress, not repeat an already ready skill.
 await seed({runs:[successfulMatching('fast-1',Date.now()-10000),successfulMatching('fast-2',Date.now()-5000)]});
 assert.equal(await cdp.eval('SeviatJourney.recommend().nodeId'),'م:letter-shape');
 await click('#journey-start');await session(3);assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).mode'),'diagnostic');
 await click('#journey-next');await session(5);await click('#journey-next');await session(5);
 assert.equal(await cdp.eval(\"SeviatAdaptive.progressReady(SeviatJourney.getState(),'م:letter-shape')\"),true);
 await click('#journey-next');assert.notEqual(await cdp.eval('SeviatJourney.recommend().nodeId'),'م:letter-shape');
 // Repeated actual mistakes trigger support and cannot certify mastery.
 await seed({});await click('#journey-start');await session(5,[0,1,2,3,4]);await click('#journey-next');await session(5,[0,1,2,3,4]);
 assert.equal(await cdp.eval('SeviatJourney.recommend().difficulty'),'supported');
 assert.equal(await cdp.eval(\"SeviatAdaptive.progressReady(SeviatJourney.getState(),'prep:matching')\"),false);
 assert.equal(await cdp.eval('SeviatJourney.getState().runs.at(-1).independent'),false);
 // Assign a specific independent homework through the teacher UI and persist it.
 await seed({});await cdp.eval('SeviatJourney.teacher()');
 await cdp.eval(\"[...document.querySelectorAll('#teacherHub select')].find(s=>[...s.options].some(o=>o.value==='prep:matching')).value='prep:matching'\".replaceAll('#teacherHub','#teacherHub'));
 await cdp.eval(\"[...document.querySelectorAll('#teacherHub button')].find(b=>b.textContent==='تعيين واجب').click()\");
 await cdp.send('Page.reload');await until(()=>cdp.eval('window.Unit1Learning?.ready&&window.SeviatJourney'),'homework reload');
 assert.equal(await cdp.eval('SeviatJourney.recommend().reason'),'teacher-assignment');
 await click('#journey-start');await session(5);await click('#journey-next');await session(5);
 assert.equal(await cdp.eval('SeviatJourney.getState().homework'),undefined);
 await cdp.eval('SeviatJourney.home()');await click('#journey-start');assert.notEqual(await cdp.eval('SeviatJourney.recommend().nodeId'),'prep:matching');
 const known={};`);
// Existing teacher hub has this public ID.
s=s.replaceAll('#teacherHub','#teacherHub');
s=s.replace("checks:['adaptive practice and assessment'","checks:['five explicit Chrome learner scenarios: new, repeated mistakes, fast progress, returning, teacher homework','adaptive practice and assessment'");
fs.writeFileSync('tests/adaptive-browser.cjs',s);