(function () {
  "use strict";

  let enabled = true;

  try {
    enabled = localStorage.getItem("seviatEffectsEnabled") !== "false";
  } catch {}

  const library = {
    correct: [
      "correct-1.mp3",
      "correct-2.mp3",
      "correct-3.mp3",
      "correct-4.mp3"
    ],
    wrong: [
      "wrong-1.mp3",
      "wrong-2.mp3",
      "wrong-3.mp3"
    ],
    success: [
      "success-1.mp3",
      "success-2.mp3",
      "success-3.mp3"
    ]
  };

  let currentAudio = null;
  const lastPlayed = {};

  function stop() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }

  function play(name) {
    if (!enabled) return;

    const category =
      name === "complete" ? "success" :
      name === "retry" ? "wrong" : name;

    const files = library[category];
    if (!files) return;

    let index = Math.floor(Math.random() * files.length);

    if (files.length > 1 && index === lastPlayed[category]) {
      index = (index + 1) % files.length;
    }

    lastPlayed[category] = index;

    stop();

    const audio = new Audio(
      "/sounds/teacher/" + files[index]
    );

    currentAudio = audio;

    audio.play().catch(error => {
      console.warn("تعذر تشغيل التشجيع:", error);
    });
  }

  window.SeviatEffects = {
    play,
    stop,
    isEnabled: () => enabled,
    setEnabled(value) {
      enabled = Boolean(value);

      if (!enabled) stop();

      try {
        localStorage.setItem(
          "seviatEffectsEnabled",
          String(enabled)
        );
      } catch {}
    }
  };
})();
