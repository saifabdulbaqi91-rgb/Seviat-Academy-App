(function(host){
'use strict';

function evaluate(question, context){
  const q = question || {};
  const c = context || {};
  const lesson = c.lesson || null;
  const progression = Array.isArray(c.progression) ? c.progression : [];
  const reasons = [];
  if (q.reviewStatus !== 'teacher-reviewed') reasons.push('question-not-reviewed');

  const letters = new Set(c.masteredLetters || []);
  const skills = new Set(c.masteredSkills || []);
  const orthography = new Set(c.masteredOrthography || []);

  const owner = progression.find(x => x.id === q.lessonId);
  const scheduled = progression.find(
    x => x.id === q.availability?.lessonId
  );
  const current = progression.find(
    x => x.id === c.currentLessonId
  );

  const ownerIndex = progression.indexOf(owner);
  const scheduledIndex = progression.indexOf(scheduled);
  const currentIndex = progression.indexOf(current);

  if (!lesson || q.lessonId !== lesson.id) {
    reasons.push('lesson-mismatch');
  }

  if (!lesson || q.unitId !== lesson.unitId) {
    reasons.push('unit-mismatch');
  }

  if (!owner || !scheduled || !current) {
    reasons.push('unknown-schedule-lesson');
  } else {
    if (scheduledIndex < ownerIndex) {
      reasons.push('invalid-schedule-order');
    }

    if (currentIndex < scheduledIndex) {
      reasons.push('question-scheduled-for-later');
    }
  }

  if (!Array.isArray(q.prerequisiteLetters) ||
      !Array.isArray(q.prerequisiteSkills) ||
      !Array.isArray(q.orthographicPrerequisites)) {
    reasons.push('missing-prerequisite-data');
  } else {
    for (const letter of q.prerequisiteLetters) {
      const isCurrentTarget =
        lesson &&
        lesson.letter === letter &&
        q.letter === letter &&
        currentIndex === ownerIndex &&
        scheduledIndex === ownerIndex;

      if (!isCurrentTarget && !letters.has(letter)) {
        reasons.push('letter-not-ready:' + letter);
      }
    }

    for (const skill of q.prerequisiteSkills) {
      if (!skills.has(skill)) {
        reasons.push('skill-not-ready:' + skill);
      }
    }

    for (const pattern of q.orthographicPrerequisites) {
      if (!orthography.has(pattern)) {
        reasons.push('orthography-not-ready:' + pattern);
      }
    }
  }

  const gate = c.specialGate || null;
  if (c.specialGateRequired === true && !gate) {
    reasons.push('required-special-gate-missing');
  }
  if (gate) {
    if (gate.questionId !== q.id) {
      reasons.push('special-gate-question-mismatch');
    } else {
      if (gate.reviewStatus !== 'approved' || gate.runtimeEnabled !== true) {
        reasons.push('special-gate-not-approved');
      }
      if (gate.contentSafeAtLesson !== true) {
        reasons.push('special-gate-content-review-required');
      }
      for (const letter of gate.futurePrerequisiteLetters || []) {
        if (!letters.has(letter)) {
          reasons.push('special-gate-letter-not-ready:' + letter);
        }
      }
    }
  }
  if (q.assessmentEligibility?.practice !== true) {
    reasons.push('practice-not-allowed');
  }

  if (c.lessonAvailable !== true) {
    reasons.push('lesson-not-confirmed-available');
  }

  return Object.freeze({
    questionId: q.id || null,
    eligible: reasons.length === 0,
    reasons: Object.freeze(reasons)
  });
}

const api = Object.freeze({evaluate});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else {
  host.AfaqQuestionEligibility = api;
}

})(typeof window === 'undefined' ? globalThis : window);
