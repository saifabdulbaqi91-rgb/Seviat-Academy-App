/* Pure, local adaptive recommendations. This module never writes student records. */
(function (host) {
  'use strict';
  const DAY = 86400000;
  const MAX_SESSION = 5;
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
  const hash = value => {
    let result = 2166136261;
    for (const character of String(value)) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
    return result >>> 0;
  };
  const results = run => Array.isArray(run.results) ? run.results.filter(result => result && typeof result.id === 'string' && typeof result.correct === 'boolean') : [];
  const independent = run => run.independent === true && run.preview !== true && run.guided !== true && run.assisted !== true;
  const eligible = (result, run) => independent(run) && result.evidenceEligible !== false && result.assisted !== true && result.verified !== false && (run.evidenceVersion !== 2 || result.verified === true);

  function taskKey(question) {
    if (question.taskKey) return question.taskKey;
    const visualAnswer = question.visual?.options?.[Number(question.answer)];
    return JSON.stringify([
      question.letter || '', question.skill || '', question.operation || 'choice',
      question.stimulus || question.visual?.target || question.prompt || '',
      visualAnswer || question.answer,
      question.visual ? [...question.visual.options].sort() : [...(question.options || [])].map(String).sort()
    ]);
  }

  // Presentation identity is deliberately separate from historical evidence keys.
  // Option order and source IDs must not turn the same task into two session items.
  function sessionKey(question) {
    const normalize = value => String(value ?? '')
      .normalize('NFC')
      .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const options = Array.isArray(question.visual?.options)
      ? question.visual.options
      : Array.isArray(question.options)
        ? question.options
        : [];

    const index = Number(question.answer);

    const correct = Number.isInteger(index) &&
      index >= 0 && index < options.length
        ? options[index]
        : question.answer;

    return JSON.stringify([
      normalize(question.letter),
      normalize(question.skill),
      normalize(question.prompt),
      normalize(question.stimulus),
      normalize(question.audioText),
      question.sounds || null,
      !!question.memory,
      normalize(question.visual?.target),
      normalize(correct),
      options.map(normalize).sort()
    ]);
  }

  function runsFor(state, nodeId) {
    const seen = new Set();
    return (Array.isArray(state.runs) ? state.runs : []).filter(run => {
      if (!run || run.node !== nodeId || run.preview === true || !results(run).length) return false;
      if (run.id && seen.has(run.id)) return false;
      if (run.id) seen.add(run.id);
      return true;
    }).map((run, index) => ({run, index})).sort((a, b) =>
      (Number(a.run.completedAt) || a.index) - (Number(b.run.completedAt) || b.index)
    ).map(item => item.run);
  }

  function analyze(state, nodeId, now = Date.now()) {
    const runs = runsFor(state, nodeId);
    const independentRuns = runs.filter(independent);
    const items = new Map();
    for (const run of independentRuns) for (const result of results(run).filter(result => eligible(result, run))) {
      const key = result.taskKey || result.id;
      const previous = items.get(key) || {key, id:result.id, mistakes:0, streak:0};
      const streak = result.correct ? previous.streak + 1 : 0;
      items.set(key, {...previous, id:result.id, mistakes:previous.mistakes + Number(!result.correct), streak, correct:result.correct, subskill:result.subskill || 'all'});
    }
    const recent = independentRuns.slice(-3).flatMap(run => results(run).filter(result => eligible(result, run)));
    const latest = runs.at(-1);
    const lastIndependent = independentRuns.at(-1);
    const lastResults = lastIndependent ? results(lastIndependent).filter(result => eligible(result, lastIndependent)) : [];
    const successful = independentRuns.filter(run => {
      const answers = results(run).filter(result => eligible(result, run));
      return answers.length >= MAX_SESSION && new Set(answers.map(result => result.taskKey || result.id)).size >= MAX_SESSION && answers.filter(result => result.correct).length / answers.length >= .8;
    });
    const unresolved = [...items.values()].filter(item => item.mistakes && item.streak < 2);
    const lastTime = Number(lastIndependent?.completedAt) || 0;
    const intervalDays = [1, 3, 7][Math.min(2, Math.max(0, successful.length - 2))];
    return {
      nodeId, attempts:runs.length, independentAttempts:independentRuns.filter(run=>results(run).every(result=>eligible(result,run))).length,
      assistedAttempts:runs.filter(run=>!independent(run)||results(run).some(result=>!eligible(result,run))).length,
      recentAccuracy:recent.length ? recent.filter(result => result.correct).length / recent.length : null,
      lastAccuracy:lastResults.length ? lastResults.filter(result => result.correct).length / lastResults.length : null,
      weakItems:unresolved, lastRun:latest, lastIndependentAt:lastTime,
      reviewDueAt:lastTime && successful.length >= 2 ? lastTime + intervalDays * DAY : null,
      due:Boolean(lastTime && successful.length >= 2 && now >= lastTime + intervalDays * DAY),
      successfulRuns:successful.length
    };
  }

  function progressReady(state, nodeId) {
    const count = clamp(Number(state.criteria?.runs) || 2, 2, 3);
    const threshold = clamp((Number(state.criteria?.correct) || 4) / 5, .8, 1);
    const recent = runsFor(state, nodeId).filter(independent).slice(-count);
    if (recent.length < count) return false;
    const subskills = new Map();
    for (const run of recent) {
      const answers = results(run).filter(result => eligible(result, run));
      if (answers.length < MAX_SESSION || new Set(answers.map(result => result.taskKey || result.id)).size < MAX_SESSION || answers.filter(result => result.correct).length / answers.length < threshold) return false;
      for (const result of answers) if (result.subskill && result.subskill !== 'all') {
        const group = subskills.get(result.subskill) || [];
        group.push(result.correct); subskills.set(result.subskill, group);
      }
    }
    return [...subskills.values()].every(group => group.length >= 2 && group.filter(Boolean).length / group.length >= threshold);
  }

  function mastery(state, nodeId, now = Date.now()) {
    const summary = analyze(state, nodeId, now);
    const assessments = runsFor(state, nodeId).filter(run => run.mode === 'assessment' && independent(run));
    let confirmed = state.legacyEvidence?.[nodeId] === true;
    const required=clamp(Number(state.criteria?.runs)||2,2,3);
    for(let i=required-1;i<assessments.length;i++){const window=assessments.slice(i-required+1,i+1);if(Number(window.at(-1).completedAt)-Number(window[0].completedAt)>=DAY&&progressReady({...state,runs:window},nodeId))confirmed=true;}
    const status = confirmed ? 'confirmed' : summary.lastAccuracy !== null && summary.lastAccuracy < .6 ? 'needs-support' : progressReady(state,nodeId) ? 'progress-ready' : summary.attempts ? 'learning' : 'not-started';
    return {status, recentAccuracy:summary.recentAccuracy, independentAttempts:summary.independentAttempts, assistedAttempts:summary.assistedAttempts, weakSubskills:[...new Set(summary.weakItems.map(item=>item.subskill))]};
  }

  function planSession(state, node, now = Date.now()) {
    const summary = analyze(state,node.id,now);
    const level = difficulty(state,node.id,now);
    let mode = ['practice','assessment','diagnostic'].includes(state.sessionMode) ? state.sessionMode : null;
    if (!mode) mode = level === 'supported' ? 'guided-practice' : node.kind !== 'prep' && !summary.attempts && (state.runs || []).length ? 'diagnostic' : summary.lastAccuracy >= .8 ? 'assessment' : 'practice';
    return {mode,count:mode==='diagnostic'?3:MAX_SESSION,difficulty:level,independent:level!=='supported'&&!node.supervised};
  }

  function difficulty(state, nodeId, now) {
    if (state.difficulty === 'supported' || state.difficulty === 'standard') return state.difficulty;
    const summary = analyze(state, nodeId, now);
    const last = summary.lastRun;
    // Supported success changes the next practice, never becomes independent evidence.
    if (last?.difficulty === 'supported' && results(last).filter(result => result.correct).length / results(last).length >= .8) return 'standard';
    if (summary.lastAccuracy !== null && summary.lastAccuracy < .6) return 'supported';
    if (mastery(state, nodeId, now).status === 'confirmed' && !summary.weakItems.length) return 'stretch';
    return 'standard';
  }

  function autoAvailable(state,node,rules){
    if(!rules.available(state,node,api))return false;
    if(node.kind==='preparation'&&node.level>1)return node.requires.every(id=>state.overrides?.[id]==='allow'||mastery(state,id).status==='confirmed');
    return true;
  }

  function recommend(state, rules, now = Date.now(), excluded = []) {
    try{if(rules.validateGraph)rules.validateGraph(rules.nodes);}catch{return {nodeId:null,reason:'invalid-path',difficulty:'standard'};}
    const available = node => !['planned','unavailable'].includes(node.status) && !excluded.includes(node.id) && state.overrides?.[node.id] !== 'lock';
    const assignment = rules.nodes.find(node => node.id === state.homework && available(node));
    if (assignment) return {nodeId:assignment.id, reason:'teacher-assignment', difficulty:difficulty(state, assignment.id, now)};
    const teaching = host.AfaqTeachingProgression;
    if (teaching && rules.letters) {
      const teachingId = teaching.nextTeachingStep(state, rules);
      const teachingNode = rules.nodes.find(n => n.id === teachingId);

      if (
        teachingNode &&
        available(teachingNode) &&
        rules.available(state, teachingNode, api)
      ) {
        return {
          nodeId: teachingId,
          reason: 'teaching-progression',
          difficulty: difficulty(state, teachingId, now)
        };
      }
    }
    const candidates = rules.nodes.filter(node => available(node) && !node.supervised && state.overrides?.[node.id] !== 'allow' && autoAvailable(state, node, rules));
    const summaries = candidates.map(node => ({node, summary:analyze(state, node.id, now)}));
    const weak = summaries.filter(({summary}) => summary.weakItems.length && summary.lastAccuracy !== null && summary.lastAccuracy < .8)
      .sort((a, b) => a.summary.lastAccuracy - b.summary.lastAccuracy || a.summary.lastIndependentAt - b.summary.lastIndependentAt)[0];
    if (weak) return {nodeId:weak.node.id, reason:'targeted-review', difficulty:difficulty(state, weak.node.id, now)};
    const gap = summaries.find(({node}) => rules.complete(state,node.id,api) && runsFor(state,node.id).some(run=>run.evidenceVersion===2) && !progressReady(state,node.id));
    if(gap) return {nodeId:gap.node.id,reason:'evidence-review',difficulty:difficulty(state,gap.node.id,now)};
    const due = summaries.filter(({node, summary}) => !node.optional && rules.complete(state,node.id,api) && summary.due)
      .sort((a, b) => a.summary.reviewDueAt - b.summary.reviewDueAt)[0];
    if (due) return {nodeId:due.node.id, reason:'spaced-review', difficulty:difficulty(state, due.node.id, now)};
    const recentRuns=(state.runs||[]).filter(run=>run&&typeof run.node==='string'&&run.preview!==true).slice(-2);
    if(recentRuns.length===2&&recentRuns.every(run=>!run.node.startsWith('prep:'))){
      const lastNode=rules.nodes.find(node=>node.id===recentRuns[1].node);
      const family=lastNode?.skill==='short-vowels'||lastNode?.skill==='sukoon'?'auditory':lastNode?.skill==='syllable-building'?'memory':'visual';
      const game=candidates.find(node=>node.kind==='word-game'&&!rules.complete(state,node.id,api)&&new Set(state.studiedWords||[]).size>=5)||candidates.find(node=>node.kind==='preparation'&&node.family===family&&!rules.complete(state,node.id,api));
      if(game)return {nodeId:game.id,reason:'varied-practice',difficulty:difficulty(state,game.id,now)};
    }
    const next = rules.nodes.find(node => !node.optional && available(node) && rules.available(state,node,api) && !rules.complete(state,node.id,api));
    return next ? {nodeId:next.id, reason:'next', difficulty:difficulty(state, next.id, now)} : {nodeId:null, reason:'teacher-needed', difficulty:'standard'};
  }

  function selectQuestions(state, nodeId, bank, options = {}) {
    const desired = clamp(Number(options.count) || MAX_SESSION, 1, MAX_SESSION);
    const summary = analyze(state, nodeId, options.now);
    const weaknesses = new Set(summary.weakItems.flatMap(item => [item.key, item.id]));
    const seen = new Set(), presentations = new Set();
    const unique = bank.filter(question => {
      const key = taskKey(question);
      const presentation = sessionKey(question);
      if (seen.has(key) || presentations.has(presentation)) return false;
      seen.add(key); presentations.add(presentation); return true;
    });
    const level = options.difficulty || difficulty(state, nodeId, options.now);
    const itemLevel = question => Number(question.difficulty) || (/combine|analyse|analyze|build/.test(question.operation || '') ? 3 : /mark|match/.test(question.operation || '') ? 1 : 2);
    const ranked = [...unique].sort((a, b) => {
      const weakA = Number(weaknesses.has(a.id) || weaknesses.has(taskKey(a)));
      const weakB = Number(weaknesses.has(b.id) || weaknesses.has(taskKey(b)));
      return weakB - weakA || (level === 'supported' ? itemLevel(a) - itemLevel(b) : level === 'stretch' ? itemLevel(b) - itemLevel(a) : 0) || hash((options.seed || '') + taskKey(a)) - hash((options.seed || '') + taskKey(b));
    });
    // Cover each available subskill before filling the remaining slots.
    const selected = [];
    const groups = new Set();
    for (const question of ranked) {
      const group = question.subskill || 'all';
      if (!groups.has(group) && selected.length < desired) { selected.push(question); groups.add(group); }
    }
    for (const question of ranked) if (selected.length < desired && !selected.includes(question)) selected.push(question);
    return selected;
  }

  // Read-only projection: historical assessment bytes and current journey runs are never migrated.
  function legacyView(state,legacy,legacyRules,journeyRules){
    const legacyEvidence={...state.legacyEvidence};
    if(legacyRules&&legacy)for(const node of journeyRules.nodes)if(node.unit===1&&node.letter&&legacyRules.mastered(legacy,node.letter,node.skill))legacyEvidence[node.id]=true;
    return {...state,legacyEvidence};
  }
  function recommendLesson(state,catalog,rules,path,now=Date.now(),excluded=[]){const recommendation=recommend(state,path.curriculumRules(catalog,rules,undefined,api),now,excluded),lesson=path.lessonFor(catalog,recommendation.nodeId);return {...recommendation,lessonId:lesson?.id||null,levelId:lesson?.levelId||null,worldId:lesson?.worldId||null};}
  const api = {version:1, legacyView, recommendLesson, taskKey, sessionKey, analyze, mastery, planSession, autoAvailable, progressReady, difficulty, recommend, selectQuestions};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else host.SeviatAdaptive = api;
})(typeof window === 'undefined' ? globalThis : window);
