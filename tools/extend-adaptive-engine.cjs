const fs=require('fs');
let s=fs.readFileSync('adaptive-learning.js','utf8');
s=s.replace("if (summary.independentAttempts >= 2 && summary.recentAccuracy >= .9 && !summary.weakItems.length) return 'stretch';", "if (mastery(state, nodeId, now).status === 'confirmed' && !summary.weakItems.length) return 'stretch';");
s=s.replace('  function difficulty(state, nodeId, now) {',`  function mastery(state, nodeId, now = Date.now()) {
    const summary = analyze(state, nodeId, now);
    const assessments = runsFor(state, nodeId).filter(run => run.mode === 'assessment' && independent(run));
    let confirmed = state.legacyEvidence?.[nodeId] === true;
    for (let i = 0; i < assessments.length; i++) for (let j = i + 1; j < assessments.length; j++) {
      if (Number(assessments[j].completedAt) - Number(assessments[i].completedAt) >= DAY && progressReady({...state, runs:[assessments[i], assessments[j]], criteria:{...state.criteria,runs:2}}, nodeId)) confirmed = true;
    }
    const status = confirmed ? 'confirmed' : summary.lastAccuracy !== null && summary.lastAccuracy < .6 ? 'needs-support' : progressReady(state,nodeId) ? 'progress-ready' : summary.attempts ? 'learning' : 'not-started';
    return {status, recentAccuracy:summary.recentAccuracy, independentAttempts:summary.independentAttempts, assistedAttempts:summary.attempts-summary.independentAttempts, weakSubskills:[...new Set(summary.weakItems.map(item=>item.subskill))]};
  }

  function planSession(state, node, now = Date.now()) {
    const summary = analyze(state,node.id,now);
    const level = difficulty(state,node.id,now);
    let mode = ['practice','assessment','diagnostic'].includes(state.sessionMode) ? state.sessionMode : null;
    if (!mode) mode = level === 'supported' ? 'guided-practice' : node.kind !== 'prep' && !summary.attempts && (state.runs || []).length ? 'diagnostic' : summary.lastAccuracy >= .8 ? 'assessment' : 'practice';
    return {mode,count:mode==='diagnostic'?3:MAX_SESSION,difficulty:level,independent:level!=='supported'&&!node.supervised};
  }

  function difficulty(state, nodeId, now) {`);
s=s.replace("    const due = summaries.filter", `    const gap = summaries.find(({node}) => rules.complete(state,node.id) && runsFor(state,node.id).some(run=>run.evidenceVersion===2) && !progressReady(state,node.id));
    if(gap) return {nodeId:gap.node.id,reason:'evidence-review',difficulty:difficulty(state,gap.node.id,now)};
    const recentRuns=(state.runs||[]).filter(run=>run&&run.preview!==true).slice(-2);
    if(recentRuns.length===2&&recentRuns.every(run=>!run.node.startsWith('prep:'))){
      const lastNode=rules.nodes.find(node=>node.id===recentRuns[1].node);
      const family=lastNode?.skill==='short-vowels'||lastNode?.skill==='sukoon'?'auditory':lastNode?.skill==='syllable-building'?'memory':'visual';
      const game=candidates.find(node=>node.kind==='word-game')||candidates.find(node=>node.kind==='preparation'&&node.family===family&&!rules.complete(state,node.id));
      if(game)return {nodeId:game.id,reason:'varied-practice',difficulty:difficulty(state,game.id,now)};
    }
    const due = summaries.filter`);
s=s.replace('taskKey, analyze, progressReady, difficulty, recommend, selectQuestions','taskKey, analyze, mastery, planSession, progressReady, difficulty, recommend, selectQuestions');
fs.writeFileSync('adaptive-learning.js',s,'utf8');
