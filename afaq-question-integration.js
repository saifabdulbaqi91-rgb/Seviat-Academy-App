(function(host){
'use strict';

function evaluate(question, options){
  const o = options || {};
  const q = question || {};
  const rules = o.rules;
  const mapping = o.mapping;
  const adapterApi = o.adapter;
  const eligibility = o.eligibility;

  if (!rules || !mapping || !adapterApi || !eligibility ||
      !o.profile || !Array.isArray(o.progression)) {
    return Object.freeze({
      eligible:false,
      reasons:['missing-integration-dependencies']
    });
  }

  const owner = o.progression.find(
    lesson => lesson.id === q.lessonId
  );

  if (!owner || !owner.letter) {
    return Object.freeze({
      eligible:false,
      reasons:['unsupported-lesson-type']
    });
  }

  const adapter = adapterApi.createContext({
    rules,
    mapping,
    profile:o.profile,
    letter:owner.letter
  });

  const targetLetter = q.letter || owner.letter;

  const targetReady = adapter.targetAvailable(
    q.skill,
    targetLetter
  );

  const targetMapping = mapping.resolve(q.skill);

  const targetId =
    targetMapping?.relation === 'exact-name' &&
    targetMapping.journey
      ? targetLetter + ':' + targetMapping.journey
      : null;

  const targetNode = targetId
    ? rules.nodes.find(node => node.id === targetId)
    : null;

  const actualLessonAvailable =
    targetNode !== null &&
    o.profile.overrides?.[targetId] !== 'lock' &&
    rules.available(o.profile, targetNode) === true;

  if (!targetReady) {
    return Object.freeze({
      eligible:false,
      reasons:['target-not-available']
    });
  }

  const letters = q.prerequisiteLetters || [];
  const skills = q.prerequisiteSkills || [];

  const masteredLetters = letters.filter(
    letter => adapter.letterReady(letter)
  );

  const masteredSkills = skills.filter(skill => {
    const requiredLetters = Array.isArray(q.prerequisiteLetters)
      ? q.prerequisiteLetters
      : [];

    if (requiredLetters.length === 0) {
      return adapter.skillReady(skill, owner.letter);
    }

    return requiredLetters.every(
      requiredLetter =>
        adapter.skillReady(skill, requiredLetter)
    );
  });

  return eligibility.evaluate(q,{
    lesson:owner,
    progression:o.progression,
    currentLessonId:o.currentLessonId,
    lessonAvailable:actualLessonAvailable,
    masteredLetters,
    masteredSkills,
    masteredOrthography:[],
    specialGate:o.specialGate || null,
    specialGateRequired:o.specialGateRequired === true
  });
}

const api = Object.freeze({evaluate});

if(typeof module !== 'undefined' && module.exports){
  module.exports=api;
}else{
  host.AfaqQuestionIntegration=api;
}

})(typeof window === 'undefined' ? globalThis : window);
