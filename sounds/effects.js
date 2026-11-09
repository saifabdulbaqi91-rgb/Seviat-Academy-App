(function () {
  let audioContext = null;
  let enabled = localStorage.getItem("seviatEffectsEnabled") !== "false";

  function getContext() {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    return audioContext;
  }

  function tone(frequency, duration, delay = 0, type = "sine", volume = 0.12) {
    if (!enabled) return;

    const ctx = getContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(
      frequency,
      ctx.currentTime + delay
    );

    const start = ctx.currentTime + delay;
    const end = start + duration;

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }

  const effects = {
    click() {
      tone(520, 0.07, 0, "sine", 0.07);
    },

    select() {
      tone(620, 0.09, 0, "sine", 0.09);
    },

    correct() {
      tone(523, 0.13);
      tone(659, 0.13, 0.14);
      tone(784, 0.22, 0.28);
    },

    wrong() {
      tone(330, 0.16, 0, "triangle", 0.08);
      tone(280, 0.18, 0.18, "triangle", 0.07);
    },

    retry() {
      tone(392, 0.12);
      tone(494, 0.16, 0.15);
    },

    next() {
      tone(660, 0.08);
      tone(880, 0.11, 0.09);
    },

    star() {
      tone(784, 0.12);
      tone(988, 0.12, 0.13);
      tone(1175, 0.2, 0.26);
    },

    complete() {
      [523, 659, 784, 1047].forEach((frequency, index) => {
        tone(frequency, 0.22, index * 0.16);
      });
    }
  };

  window.SeviatEffects = {
    play(name) {
      if (effects[name]) effects[name]();
    },

    setEnabled(value) {
      enabled = Boolean(value);
      localStorage.setItem("seviatEffectsEnabled", String(enabled));
    },

    isEnabled() {
      return enabled;
    }
  };
})();

document.addEventListener("click", function (event) {
  const button = event.target.closest("button");

  if (!button || !window.SeviatEffects) return;

  if (button.disabled) return;

  if (button.closest("#answerOptions")) {
    window.SeviatEffects.play("select");
  } else {
    window.SeviatEffects.play("click");
  }
});
