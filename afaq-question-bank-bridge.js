(function (host) {
  'use strict';

  const files = {
    bank: 'data/question-bank.json',
    map: 'data/afaq-curriculum-question-map.json',
    catalog: 'data/afaq-journey-lesson-catalog.json',
    progression: 'data/afaq-curriculum-progression.json',
    specialGates: 'data/afaq-question-special-gates.json'
  };

  let snapshot = null;

  async function readJSON(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error('Cannot load ' + path);
    return response.json();
  }

  async function load() {
    const [bank, map, catalog, progression, specialGates] =
      await Promise.all(Object.values(files).map(readJSON));

    const questions = new Map(bank.questions.map(q => [q.id, q]));
    const gates = new Map();

    for (const gate of specialGates.entries || []) {
      if (!questions.has(gate.questionId) || gates.has(gate.questionId)) {
        throw new Error('Invalid special gate: ' + gate.questionId);
      }
      gates.set(gate.questionId, gate);
    }

    if (specialGates.version !== 1 || typeof specialGates.runtimeEnabled !== 'boolean') {
      throw new Error('Unexpected special gates configuration');
    }
    const catalogIds = new Set(catalog.lessons.map(l => l.id));
    const progressionIds = new Set(progression.lessons.map(l => l.id));

    if (questions.size !== bank.questions.length) {
      throw new Error('Duplicate question IDs');
    }

    const lessons = new Map();
    const seen = new Set();

    for (const lesson of map.lessons) {
      if (!catalogIds.has(lesson.lessonId) ||
          !progressionIds.has(lesson.lessonId)) {
        throw new Error('Missing lesson: ' + lesson.lessonId);
      }

      const items = [];

      for (const id of lesson.originalQuestionIds) {
        const q = questions.get(id);

        if (!q || q.lessonId !== lesson.lessonId ||
            q.unitId !== lesson.unitId || seen.has(id)) {
          throw new Error('Invalid question mapping: ' + id);
        }

        seen.add(id);
        items.push(q);
      }

      lessons.set(lesson.lessonId, Object.freeze(items));
    }

    if (seen.size !== questions.size) {
      throw new Error('Unmapped questions');
    }

    snapshot = {
      enabled: bank.runtimeEnabled === true && map.runtimeEnabled === true && catalog.runtimeEnabled === true && progression.runtimeEnabled === true,
      total: questions.size,
      lessonCount: lessons.size,
      lessons,
      gates,
      progression: progression.lessons
    };

    return {
      enabled: snapshot.enabled,
      total: snapshot.total,
      lessonCount: snapshot.lessonCount
    };
  }

  function questionsForLesson(lessonId) {
    return snapshot
      ? [...(snapshot.lessons.get(lessonId) || [])]
      : [];
  }

  function eligibleQuestions(
    lessonId,
    masteredLetters = [],
    masteredSkills = [],
    masteredOrthography = []
  ) {
    const learned = new Set(masteredLetters);
    const skills = new Set(masteredSkills);
    const orthography = new Set(masteredOrthography);

    return questionsForLesson(lessonId).filter(q => {
      const gate = snapshot?.gates.get(q.id);
      if (gate && (
        gate.reviewStatus !== 'approved' ||
        gate.runtimeEnabled !== true ||
        gate.contentSafeAtLesson !== true
      )) return false;

      if (q.assessmentEligibility?.practice !== true) return false;

      if (!Array.isArray(q.prerequisiteLetters) ||
          !Array.isArray(q.prerequisiteSkills) ||
          !Array.isArray(q.orthographicPrerequisites)) return false;

      return (
        q.prerequisiteLetters.every(letter => learned.has(letter)) &&
        q.prerequisiteSkills.every(skill => skills.has(skill)) &&
        q.orthographicPrerequisites.every(item => orthography.has(item))
      );
    });
  }


  function verifiedQuestionsForLesson(lessonId, context) {
    if (!snapshot || snapshot.enabled !== true) return [];

    const c = context || {};
    const integration = host.AfaqQuestionIntegration;
    const mapping = host.AfaqQuestionSkillMapping;
    const adapter = host.AfaqQuestionJourneyAdapter;
    const eligibility = host.AfaqQuestionEligibility;

    if (!integration || !mapping || !adapter || !eligibility ||
        !c.rules || !c.profile || !Array.isArray(c.progression) ||
        !c.currentLessonId) {
      return [];
    }

    const guard = host.AfaqQuestionContentGuard;
    if (!guard || !Array.isArray(c.allowedLetters)) return [];

    return questionsForLesson(lessonId).filter(question => {
      if (question.reviewStatus !== 'teacher-reviewed') return false;
      const gate = snapshot.gates.get(question.id);
      if (!gate && question.specialGateRequired === true) return false;
      if (gate && (
        gate.reviewStatus !== 'approved' ||
        gate.runtimeEnabled !== true ||
        gate.contentSafeAtLesson !== true
      )) return false;
      const contentCheck = guard.inspect(
        question,
        c.allowedLetters
      );

      if (!contentCheck.safe) return false;
      const result = integration.evaluate(question, {
        rules: c.rules,
        profile: c.profile,
        progression: c.progression,
        currentLessonId: c.currentLessonId,
        mapping,
        adapter,
        eligibility,
        specialGate:gate || null,
        specialGateRequired:snapshot.gates.has(question.id)
      });

      return result.eligible === true;
    });
  }

  function contextForNode(node, rules, profile) {
    if (!snapshot || !node?.letter || !rules || !profile) return null;
    const lesson = snapshot.progression.find(l => l.letter === node.letter);
    const mapping = host.AfaqQuestionSkillMapping;
    const adapter = host.AfaqQuestionJourneyAdapter;
    if (!lesson || !mapping || !adapter) return null;
    const context = adapter.createContext({rules, profile, letter:node.letter, mapping});
    const allowedLetters = snapshot.progression.filter(l => l.letter && context.letterReady(l.letter)).map(l => l.letter);
    // The current target is taught at this lesson; future letters require real evidence.
    if (!allowedLetters.includes(node.letter)) allowedLetters.push(node.letter);
    return {lessonId:lesson.id, currentLessonId:lesson.id, allowedLetters, progression:snapshot.progression};
  }

  host.AfaqQuestionBankBridge = Object.freeze({
    load,
    questionsForLesson,
    eligibleQuestions,
    verifiedQuestionsForLesson,
    contextForNode,
    status: () => snapshot
      ? {
          loaded: true,
          enabled: snapshot.enabled,
          total: snapshot.total,
          lessons: snapshot.lessonCount
        }
      : { loaded: false, enabled: false }
  });
})(window);
