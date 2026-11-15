
(function () {
  'use strict';

  const sounds = Object.freeze({
    '\u0623\u064E': 'fatha_short.wav',
    '\u0625\u0650': 'kasra_short.wav',
    '\u0623\u064F': 'damma_short.wav',
    '\u0622': 'alif_long.wav',
    '\u0625\u0650\u064A': 'ya_long.wav',
    '\u0623\u064F\u0648': 'waw_long.wav'
  });

  let currentAudio = null;

  function stop() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }

  function play(symbol) {
    const file = sounds[symbol];
    if (!file) return false;

    window.AfaqSpeech?.stop?.();
    stop();

    currentAudio = new Audio('sounds/' + file);
    currentAudio.play().catch(console.error);
    return true;
  }

  window.AfaqVowelAudio = { play, stop, sounds };
})();
