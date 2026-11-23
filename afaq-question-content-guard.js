(function (host) {
  'use strict';

  const arabic = /[\u0621-\u064A]/g;

  function characters(text) {
    return String(text || '').match(arabic) || [];
  }

  function inspect(question, allowedLetters) {
    const q = question || {};
    const allowed = new Set(
      Array.isArray(allowedLetters) ? allowedLetters : []
    );

    const fields = [
      q.stimulus && q.stimulus.text,
      q.correctAnswer,
      ...(Array.isArray(q.options) ? q.options : []),
      ...(Array.isArray(q.tokens) ? q.tokens : [])
    ];

    const used = [...new Set(
      fields.flatMap(characters)
    )];

    const unknown = used.filter(
      letter => !allowed.has(letter)
    );

    return Object.freeze({
      questionId: q.id || null,
      safe: unknown.length === 0,
      unknownLetters: Object.freeze(unknown)
    });
  }

  host.AfaqQuestionContentGuard = Object.freeze({
    inspect
  });
})(window);
