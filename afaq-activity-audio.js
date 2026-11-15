(function () {
  'use strict';

  const SHORT_ID = 'u3a-v1-sounds';
  const LONG_ID = 'u3a-v1-long-sounds';

  const vowelSets = {
    [SHORT_ID]: ['\u0623\u064e', '\u0625\u0650', '\u0623\u064f'],
    [LONG_ID]: ['\u0622', '\u0625\u0650\u064a', '\u0623\u064f\u0648']
  };

  async function playApprovedAudio(text) {
    const token = text.normalize('NFC').trim();

    try {
      if (window.AfaqAudioLibrary?.play) {
        const played = await window.AfaqAudioLibrary.play(token);
        if (played) return true;
      }
    } catch (error) {
      console.warn('AFAQ audio library:', error);
    }

    if (window.AfaqVowelAudio?.sounds?.[token]) {
      window.AfaqVowelAudio.play(token);
      return true;
    }

    console.info('AFAQ: no approved audio:', token);
    return false;
  }

  function createButton(text, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
  }

  function addVowelButtons(root, itemId) {
    const symbols = vowelSets[itemId];
    if (!symbols || root.querySelector('.afaq-vowel-buttons')) return;

    const panel = document.createElement('div');
    panel.className = 'pilot-choices afaq-vowel-buttons';

    for (const symbol of symbols) {
      const button = createButton('\u0627\u0633\u062a\u0645\u0639: ' + symbol, () => {
        playApprovedAudio(symbol);
      });
      panel.appendChild(button);
    }

    const response = root.querySelector('.pilot-choices');

    if (response) {
      response.before(panel);
    } else {
      root.appendChild(panel);
    }
  }

  function addTokenAudio(root) {
    const buttons = root.querySelectorAll('[id^="pilot-token-"]');

    for (const button of buttons) {
      if (button.dataset.afaqAudioReady) continue;

      button.dataset.afaqAudioReady = 'true';

      button.addEventListener('click', () => {
        const token = button.textContent.trim();
        playApprovedAudio(token);
      });
    }
  }

  function update() {
    const root = document.querySelector('#pilot-task');
    if (!root) return;

    const itemId = document.querySelector('#journey')?.dataset.pilotItem;

    if (itemId) addVowelButtons(root, itemId);
    addTokenAudio(root);
  }

  let scheduled = false;

  function scheduleUpdate() {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      update();
    });
  }

  function start() {
    const observer = new MutationObserver(scheduleUpdate);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    scheduleUpdate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  window.AfaqActivityAudio = {
    update,
    play: playApprovedAudio
  };
})();
