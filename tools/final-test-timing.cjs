const fs=require('fs');let s=fs.readFileSync('tests/unit1-browser.cjs','utf8').replaceAll("cdp.eval('Unit1Learning.ready')","cdp.eval('window.Unit1Learning?.ready')");fs.writeFileSync('tests/unit1-browser.cjs',s);
s=fs.readFileSync('tests/adaptive-browser.cjs','utf8');s=s.replace("await click('#journey-next');await session(5);await click('#journey-next');await session(5);\n assert.equal(await cdp.eval(\"SeviatAdaptive.progressReady(SeviatJourney.getState(),'م:letter-shape')\"),true);",`await click('#journey-next');await session(null);
 // A short optional game can be recommended for variety between repeated letter sessions.
 await click('#journey-next');
 if(await cdp.eval("SeviatJourney.recommend().reason==='varied-practice'")){await cdp.eval('SeviatJourney.home()');await click('#journey-start');}
 await session(null);
 assert.equal(await cdp.eval("SeviatAdaptive.progressReady(SeviatJourney.getState(),'م:letter-shape')"),true);`);
s=s.replace(`.replaceAll('#teacherHub','#teacherHub')`,'');fs.writeFileSync('tests/adaptive-browser.cjs',s);