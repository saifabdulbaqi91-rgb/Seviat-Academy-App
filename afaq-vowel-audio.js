
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
  let generation = 0, playbackTimer = null;
  let completion = Promise.resolve(false), finish = null;

  function stop() {
    generation++;
    clearTimeout(playbackTimer); playbackTimer = null;
    finish?.(false); finish = null;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }

  async function play(symbol) {
    window.SeviatGuidedAudio?.stop();
    stop();
    const token = generation;
    const file = sounds[symbol];
    if (!file) return false;
    // A filename alone is not evidence that a pronunciation was reviewed.
    let manifest;
    try { const response = await fetch('instruction-audio.json'); if (!response.ok) return false; manifest = await response.json(); } catch { return false; }
    const clip = window.SeviatGuidedAudioCore?.approved(manifest, 'phoneme:' + symbol);
    if (token !== generation || !clip) return false;
    window.AfaqAudioLibrary?.stop();
    window.AfaqSpeech?.stop();
    const audio = new Audio(clip.src); currentAudio = audio;
    completion = new Promise(resolve => { finish = resolve; });
    const settle = ok => { if (token !== generation) return; clearTimeout(playbackTimer); playbackTimer = null; audio.pause(); finish?.(ok); finish = null; currentAudio = null; };
    playbackTimer = setTimeout(() => settle(false), 30000);
    audio.onended = () => settle(true);
    audio.onerror = () => settle(false);
    try { await audio.play(); return token === generation; } catch { settle(false); return false; }
  }

  window.AfaqVowelAudio = { play, stop, sounds, done: () => completion };
})();
