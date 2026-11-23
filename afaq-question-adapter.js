(function (host) {
  'use strict';

  function normalize(q) {
    if (!q || typeof q !== 'object') {
      throw new Error('Invalid question');
    }

    if (!q.visiblePrompt) return { ...q };

    const listening = q.type === 'teacher-listening';

    return {
      ...q,
      unit: q.unitId,
      prompt: q.visiblePrompt,
      answer: q.correctAnswer,
      stimulus: q.stimulus?.text || '',
      type: q.type === 'single-choice'
        ? 'multiple-choice'
        : q.type,
      requiredLetters: q.prerequisiteLetters || [],
      audioText: listening ? (q.teacherTarget || '') : '',
      spokenPrompt: q.spokenPrompt || q.visiblePrompt,
      audioPolicy: {
        readPrompt: true,
        readOptions: !listening && q.type === 'single-choice',
        autoReadStimulus: false,
        humanRecordingOverridesTTS: true,
        ...(q.audioPolicy || {})
      },
      originalQuestion: q
    };
  }

  const api = { normalize };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    host.AfaqQuestionAdapter = api;
  }
})(typeof window === 'undefined' ? globalThis : window);
