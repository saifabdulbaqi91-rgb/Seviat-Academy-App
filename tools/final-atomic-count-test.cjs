const fs=require('fs');let s=fs.readFileSync('tests/quality-browser-checks.cjs','utf8');const a=s.indexOf(' for(let i=0;i<5;i++){',s.indexOf('// Render a full balanced word-count')),b=s.indexOf(" checks.push('constant-one",a);if(a<0||b<0)throw Error('anchors');s=s.slice(0,a)+` for(let i=0;i<5;i++){
  // Keep choice lookup and activation in one browser task; page scrolling cannot redirect the click.
  const old=await cdp.eval("(()=>{const area=document.querySelector('#activityArea'),b=[...document.querySelectorAll('#u1-options button')].find(b=>b.dataset.answerValue==='١');if(!b||b.disabled)throw Error('Missing enabled constant-one answer: '+area.innerText);const id=area.dataset.questionId;b.click();return id;})()");
  await until(()=>cdp.eval("!document.querySelector('#u1-options')||document.querySelector('#activityArea').dataset.questionId!=="+JSON.stringify(old)),'counting next');
 }
 const constantAttempt=(await getState()).attempts.at(-1);
 assert.equal(constantAttempt.results.length,5);
 assert(constantAttempt.results.every(r=>r.answer==='١'));
 assert(constantAttempt.results.filter(r=>r.correct).length<=3);
`+s.slice(b);fs.writeFileSync('tests/quality-browser-checks.cjs',s);