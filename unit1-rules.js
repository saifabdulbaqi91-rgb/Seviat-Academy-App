/* Pure learning rules. Storage and presentation are deliberately separate. */
(function (host) {
  'use strict';
  const letters = ['م','ب','ل','د','ن','ر'];
  const coreSkills = ['letter-name','letter-shape','letter-sound','short-vowels','sukoon','long-vowels','letter-positions','letter-detection','sound-analysis','syllable-building'];
  const skills = [...coreSkills,'word-reading'];
  const rules = Object.freeze({minimumQuestions:5,requiredCorrectAnswers:4,consecutiveSuccesses:2,minimumGapMs:24*60*60*1000});
  const normalize = value => String(value).normalize('NFC').replace(/\s+/g,' ').trim();
  function taskKey(q) { return JSON.stringify([q.letter,q.skill,q.operation,normalize(q.stimulus)]); }
  function contentKey(q) { return JSON.stringify([q.letter,q.skill,normalize(q.prompt),normalize(q.audioText||''),[...q.options].map(normalize).sort(),normalize(q.answer)]); }
  function validate(questions) {
    const ids=new Set(), tasks=new Set(), content=new Set();
    for(const q of questions) {
      if(!q.id||ids.has(q.id))throw Error('Duplicate or missing ID: '+q.id);
      ids.add(q.id);
      if(!letters.includes(q.letter)||!skills.includes(q.skill)||!q.operation||!q.stimulus||!q.prompt)throw Error('Incomplete question: '+q.id);
      if(!Array.isArray(q.options)||q.options.length<2||new Set(q.options.map(normalize)).size!==q.options.length||!q.options.includes(q.answer))throw Error('Invalid choices: '+q.id);
      if(q.type==='teacher-listening'&&!q.audioText)throw Error('Missing teacher audio text: '+q.id);
      if(!['multiple-choice','teacher-listening'].includes(q.type))throw Error('Writing must not be auto graded');
      if(!['training','cumulative'].includes(q.phase))throw Error('Missing phase');
      const known=letters.slice(0,letters.indexOf(q.letter)+1);
      if(q.phase==='training'&&q.requiredLetters.some(l=>!known.includes(l)))throw Error('Future prerequisite: '+q.id);
      for(const k of [taskKey(q)]) { if(tasks.has(k))throw Error('Duplicate task: '+q.id); tasks.add(k); }
      const ck=contentKey(q);if(content.has(ck))throw Error('Duplicate content: '+q.id);content.add(ck);
    }
    for(const l of letters)for(const s of skills)if(questions.filter(q=>q.letter===l&&q.skill===s).length<5)throw Error('Insufficient coverage '+l+'/'+s);
    return true;
  }
  const stateKey=(letter,skill,phase='training')=>[letter,skill,phase].join('/');

  function successful(a) {
    return a.mode==='assessment'&&Array.isArray(a.results)&&a.results.length>=5&&new Set(a.results.map(r=>r.id)).size===a.results.length&&a.results.filter(r=>r.correct===true).length/a.results.length>=0.8;
  }
  function qualified(a) {return successful(a)&&a.independent===true&&a.teacherConfirmed===true;}
  function passed(state,l,s,phase='training') {
    return (state.attempts||[]).some(a=>a.key===stateKey(l,s,phase)&&successful(a));
  }
  function mastered(state,l,s,phase='training') {
    const attempts=(state.attempts||[]).filter(a=>a.key===stateKey(l,s,phase)).sort((a,b)=>a.completedAt-b.completedAt);
    let first=null;
    for(const a of attempts) {
      if(!successful(a)){first=null;continue;}
      const confirmed=qualified(a)||(state.confirmations||[]).some(c=>c.attemptId===a.id&&c.independent===true&&c.teacherConfirmed===true);
      if(first!==null&&a.completedAt-first>=rules.minimumGapMs&&confirmed)return true;
      if(first===null)first=a.completedAt;
    }
    return false;
  }
  const letterComplete=(state,l)=>coreSkills.every(s=>passed(state,l,s));
  const cumulativeUnlocked=state=>letters.every(l=>letterComplete(state,l));
  function canPractice(state,l,s,phase='training') {
    if(!letters.includes(l)||!skills.includes(s))return false;
    if(phase==='cumulative')return cumulativeUnlocked(state);
    return phase==='training'&&coreSkills.includes(s)&&letters.slice(0,letters.indexOf(l)).every(x=>letterComplete(state,x));
  }
  function unlocked(state,l,s,phase='training') {
    return canPractice(state,l,s,phase)&&(phase==='cumulative'||coreSkills.slice(0,coreSkills.indexOf(s)).every(x=>passed(state,l,x)));
  }
  function confirm(state,attemptId,independent) {
    if(!(state.attempts||[]).some(a=>a.id===attemptId))throw Error('Missing attempt');
    if((state.confirmations||[]).some(c=>c.attemptId===attemptId&&c.independent===independent))return state;
    return {...state,confirmations:[...(state.confirmations||[]),{attemptId,independent,teacherConfirmed:true,at:Date.now()}]};
  }
  const assessmentEligible = q => q.assessmentStatus !== 'teacher-review-required';
  function selectAssessment(pool) {
    const eligible=pool.filter(assessmentEligible);
    if (!eligible.length) return [];
    if (eligible.every(q=>q.operation==='count-in-word')) {
      const selected=[],counts=new Map();
      for(const q of eligible) {
        const n=counts.get(q.answer)||0;
        if(n>=3)continue;
        selected.push(q);counts.set(q.answer,n+1);
        if(selected.length===5)break;
      }
      return selected.length===5?selected:[];
    }
    return eligible.slice(0,5);
  }
  function subskillOf(q) {
    if(q.skill==='short-vowels')return ({'َ':'fatha','ِ':'kasra','ُ':'damma'})[[...q.answer].find(c=>'َُِ'.includes(c))];
    if(q.skill==='long-vowels')return ({'ا':'alif','و':'waw','ي':'ya'})[q.answer.at(-1)];
    return null;
  }
  function subskillReport(attempt,bank) {
    const skill=attempt.key.split('/')[1];
    const keys=skill==='short-vowels'?['fatha','kasra','damma']:skill==='long-vowels'?['alif','ya','waw']:[];
    return keys.map(subskill=>{
      const results=attempt.results.filter(r=>{
        const q=bank.find(q=>q.id===r.id);
        return (r.subskill || (q && subskillOf(q)))===subskill;
      });
      return {subskill,total:results.length,correct:results.filter(r=>r.correct===true).length};
    });
  }
  function record(state,attempt,bank) {
    if((state.attempts||[]).some(a=>a.id===attempt.id))return state;
    const [l,s,phase]=attempt.key.split('/');
    if(!unlocked(state,l,s,phase))throw Error('Skill is locked');
    const pool=new Map(bank.filter(q=>q.letter===l&&q.skill===s&&q.phase===phase).map(q=>[q.id,q]));
    if(attempt.mode!=='assessment'||attempt.results.length!==5||new Set(attempt.results.map(r=>r.id)).size!==attempt.results.length||attempt.results.some(r=>!pool.has(r.id)||!assessmentEligible(pool.get(r.id))))throw Error('Invalid assessment');
    const used=attempt.results.map(r=>pool.get(r.id));
    if(used.every(q=>q.operation==='count-in-word') && [...new Set(used.map(q=>q.answer))].some(a=>used.filter(q=>q.answer===a).length>3))throw Error('Unbalanced counting assessment');
    const checked={...attempt,results:attempt.results.map(r=>({id:r.id,answer:r.answer,correct:r.answer===pool.get(r.id).answer,...(subskillOf(pool.get(r.id))?{subskill:subskillOf(pool.get(r.id))}:{})}))};
    return {...state,attempts:[...(state.attempts||[]),checked]};
  }
  function merge(active,history) {
    validate(active);
    const seen=new Set();
    for(const q of history) {if(seen.has(q.id))throw Error('Duplicate legacy ID '+q.id);seen.add(q.id);}
    return {questions:active,legacyQuestions:history};
  }
  const api={assessmentEligible,selectAssessment,subskillReport,letters,coreSkills,skills,rules,validate,taskKey,contentKey,stateKey,qualified,successful,passed,canPractice,confirm,mastered,letterComplete,cumulativeUnlocked,unlocked,record,merge};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else host.Unit1Rules=api;
})(typeof window!=='undefined'?window:globalThis);