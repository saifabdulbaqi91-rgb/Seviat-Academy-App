(function () {
  "use strict";

  const LEVELS = [
    "تمييز الصوتين المتشابهين والمختلفين",
    "الصوت القصير والطويل",
    "عد الأصوات",
    "الذاكرة السمعية",
    "الانتباه السمعي"
  ];

  const KEY = "seviat-auditory-unlocked-v1";
  let audioContext = null;
  let session = 0;

  function getContext() {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!audioContext) audioContext = new AudioContextClass();
    return audioContext;
  }

  let stopPlayback = () => {};
  async function playNotes(notes, owner) {
    stopPlayback();
    if (window.SeviatEffects?.isEnabled() === false) throw Error("شغّل الصوت أولًا.");
    const ctx = getContext();
    if (!ctx) throw Error("المتصفح لا يدعم تشغيل الأصوات.");
    await ctx.resume();
    if (owner && !owner.isConnected) return false;
    return new Promise((resolve, reject) => {
      const oscillators = [];
      let ended = 0, settled = false, watch = null;
      function finish(completed) {
        if (settled) return;
        settled = true;
        clearInterval(watch);
        oscillators.forEach(o => { o.onended = null; try { o.stop(); o.disconnect(); } catch {} });
        stopPlayback = () => {};
        resolve(completed);
      }
      stopPlayback = () => finish(false);
      watch = setInterval(() => {
        if ((owner && !owner.isConnected) || window.SeviatEffects?.isEnabled() === false) finish(false);
      }, 50);
      let offset = 0;
      const start = ctx.currentTime + 0.08;
      try {
        notes.forEach(note => {
          const oscillator = ctx.createOscillator(), gain = ctx.createGain();
          oscillators.push(oscillator);
          oscillator.type = "sine";
          oscillator.frequency.value = note.frequency;
          oscillator.connect(gain); gain.connect(ctx.destination);
          const begin = start + offset, end = begin + note.duration;
          gain.gain.setValueAtTime(0.0001, begin);
          gain.gain.exponentialRampToValueAtTime(0.15, begin + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, end);
          oscillator.onended = () => { gain.disconnect(); if (++ended === notes.length) finish(true); };
          oscillator.start(begin); oscillator.stop(end + 0.02);
          offset += note.duration + (note.gap ?? 0.3);
        });
        if (!notes.length) finish(false);
      } catch (error) { finish(false); }
    });
  }
  window.addEventListener('seviat-access-changed', () => { session++; stopPlayback(); });

  function note(frequency, duration = 0.3, gap = 0.3) {
    return { frequency, duration, gap };
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(items) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = randomInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function unlocked() {
    return Math.max(
      1,
      Math.min(5, Number(localStorage.getItem(KEY)) || 1)
    );
  }

  function createQuestion(level) {
    const tones = [330, 440, 550, 660];

    if (level === 1) {
      const same = Math.random() < 0.5;
      const first = randomInt(0, 2);
      const second = same ? first : (first + randomInt(1, 3)) % 4;

      return {
        instruction: "استمع إلى الصوتين. هل هما متشابهان أم مختلفان",
        sounds: [
          note(tones[first], 0.4),
          note(tones[second], 0.4)
        ],
        options: ["متشابهان", "مختلفان"],
        answer: same ? "متشابهان" : "مختلفان"
      };
    }

    if (level === 2) {
      const firstLong = Math.random() < 0.5;

      return {
        instruction: "استمع إلى الصوتين. أيهما أطول",
        sounds: firstLong
          ? [note(440, 0.8), note(440, 0.2)]
          : [note(440, 0.2), note(440, 0.8)],
        options: ["الأول", "الثاني"],
        answer: firstLong ? "الأول" : "الثاني"
      };
    }

    if (level === 3) {
      const count = randomInt(2, 5);

      return {
        instruction: "استمع جيدا. كم صوتا سمعت",
        sounds: Array.from(
          { length: count },
          () => note(440, 0.2, 0.25)
        ),
        options: ["2", "3", "4", "5"],
        answer: String(count)
      };
    }

    if (level === 4) {
      const length = randomInt(2, 3);
      const sequence = Array.from(
        { length },
        () => randomInt(0, 2)
      );

      return {
        instruction: "استمع إلى ترتيب النغمات ثم أعده.",
        sounds: sequence.map(i => note(tones[i], 0.35)),
        sequence,
        options: ["منخفض", "متوسط", "مرتفع"],
        answer: sequence.map(i => ["منخفض", "متوسط", "مرتفع"][i])
      };
    }

    const targetCount = randomInt(1, 3);
    const total = 5;

    const pattern = shuffle([
      ...Array(targetCount).fill(660),
      ...Array(total - targetCount).fill(330)
    ]);

    return {
      instruction: "عُدَّ النَّغَمَاتِ الْحَادَّةَ (الْأَعْلَى طَبَقَةً) بَيْنَ النَّغَمَاتِ الْخَمْسِ. يَشْرَحُ الْمُعَلِّمُ الْفَرْقَ قَبْلَ الْبَدْءِ.",
      sounds: pattern.map(f => note(f, 0.25, 0.25)),
      options: ["1", "2", "3", "4"],
      answer: String(targetCount)
    };
  }

  function openAuditoryLevels() {
    if(window.SeviatAccessGuard&&!window.SeviatAccessGuard.coarseAllowed('preparation'))return;
    session++;
    stopPlayback();
    const area = createActivityArea();

    area.innerHTML = `
      <h2>🎧 التمييز السمعي</h2>
      <p>استمع جيدا ثم اختر الإجابة.</p>
      <div id="auditoryLevels" style="display:grid;gap:12px"></div>
      <button id="auditoryBack" class="sound-button">
        العودة إلى التهيئة
      </button>
    `;

    const list = document.getElementById("auditoryLevels");

    LEVELS.forEach((name, i) => {
      const level = i + 1;
      const row = document.createElement("div");
      row.style.cssText =
        "padding:15px;background:#f2f7ff;border-radius:15px";

      const heading = document.createElement("h3");
      heading.textContent = `المستوى ${level}: ${name}`;
      row.appendChild(heading);

      ["practice", "assessment"].forEach(mode => {
        const button = document.createElement("button");
        button.className =
          mode === "practice" ? "primary-button" : "sound-button";
        button.textContent =
          mode === "practice" ? "التدريب" : "اختبار المستوى";
        button.disabled = level > unlocked();
        button.style.margin = "6px";
        button.onclick = () => startAuditory(level, mode);
        row.appendChild(button);
      });

      list.appendChild(row);
    });

    document.getElementById("auditoryBack").onclick =
      () => window.openPreparation();

    area.scrollIntoView({ behavior: "smooth" });
  }

  function startAuditory(level, mode) {
    if(window.SeviatAccessGuard&&!window.SeviatAccessGuard.coarseAllowed('preparation'))return;
    stopPlayback();
    const mySession = ++session;
    const total = mode === "assessment" ? 5 : 3;
    let round = 0;
    let correct = 0;

    function render() {
    if(window.SeviatAccessGuard&&!window.SeviatAccessGuard.coarseAllowed('preparation'))return;
      if (mySession !== session) return;

      if (round >= total) {
        finish();
        return;
      }

      const q = createQuestion(level);
      const area = createActivityArea();
      const chosen = [];
      let finished = false;
      let playing = false;

      area.innerHTML = `
        <h2>🎧 ${LEVELS[level - 1]}</h2>
        <p>${mode === "practice" ? "التدريب" : "اختبار المستوى"}
        — السؤال ${round + 1} من ${total}</p>
        <h3>${q.instruction}</h3>
        <button id="playAuditory" class="primary-button">
          🔊 استمع إلى الأصوات
        </button>
        <div id="auditoryOptions"
          style="display:flex;gap:12px;flex-wrap:wrap;margin:25px 0"></div>
        <p id="auditoryFeedback" aria-live="polite"></p>
        <button id="auditoryNext" class="primary-button" disabled>
          السؤال التالي
        </button>
        <button id="auditoryExit" class="sound-button">
          العودة إلى المستويات
        </button>
      `;

      const playButton = document.getElementById("playAuditory");
      const options = document.getElementById("auditoryOptions");
      const feedback = document.getElementById("auditoryFeedback");
      const next = document.getElementById("auditoryNext");

      let listened = false;

      playButton.onclick = async () => {
        if (playing || finished) return;
        playing = true;
        listened = false;
        chosen.length = 0;
        playButton.disabled = true;

        try {
          const completed = await playNotes(q.sounds, playButton);
          listened = completed && mySession === session && playButton.isConnected;
          if (!listened && playButton.isConnected) feedback.textContent = "لم يكتمل الاستماع. شغّل الصوت وأعد المحاولة.";
        } catch (error) {
          if (playButton.isConnected) feedback.textContent = error.message;
        } finally {
          playing = false;
          if (!finished && mySession === session && playButton.isConnected) {
            playButton.disabled = false;
          }
        }
      };

      function submit(success) {
        if (finished) return;

        if (mode === "practice" && !success) {
          feedback.textContent = "حاول مرة أخرى واستمع جيدا.";
          window.SeviatEffects?.play("wrong");
          chosen.length = 0;
          return;
        }

        finished = true;
        if (success) correct++;

        feedback.textContent = success
          ? "أحسنت! إجابة صحيحة."
          : "تم تسجيل الإجابة.";

        window.SeviatEffects?.play(success ? "correct" : "wrong");

        options.querySelectorAll("button").forEach(b => {
          b.disabled = true;
        });

        next.disabled = false;
      }

      q.options.forEach(option => {
        const button = document.createElement("button");
        button.className = "primary-button";
        button.textContent = option;
        button.style.margin = "5px";

        button.onclick = () => {
          if (!listened || playing || finished || !playButton.isConnected || mySession !== session) {
            if (!listened) feedback.textContent = "استمع أولا.";
            return;
          }

          if (level === 4) {
            chosen.push(option);

            const expected = q.answer[chosen.length - 1];

            if (option !== expected) {
              submit(false);
              return;
            }

            feedback.textContent =
              `اخترت ${chosen.length} من ${q.answer.length}`;

            if (chosen.length === q.answer.length) submit(true);
          } else {
            submit(option === q.answer);
          }
        };

        options.appendChild(button);
      });

      next.onclick = () => {
        round++;
        render();
      };

      document.getElementById("auditoryExit").onclick =
        openAuditoryLevels;

      area.scrollIntoView({ behavior: "smooth" });
    }

    function finish() {
    if(window.SeviatAccessGuard&&!window.SeviatAccessGuard.coarseAllowed('preparation'))return;
      const passed =
        mode === "assessment" && correct >= 4;

      if (passed) {
        localStorage.setItem(
          KEY,
          String(Math.max(unlocked(), Math.min(5, level + 1)))
        );
      }

      const area = createActivityArea();

      area.innerHTML = `
        <h2>${mode === "assessment"
          ? "نتيجة اختبار التمييز السمعي"
          : "انتهى التدريب"}</h2>
        <p>الإجابات الصحيحة: ${correct} من ${total}</p>
        <p>${passed
          ? "أحسنت! تم فتح المستوى التالي."
          : mode === "assessment"
            ? "تحتاج إلى 4 إجابات صحيحة من 5."
            : "يمكنك إعادة التدريب أو بدء اختبار المستوى."}</p>
        <button id="auditoryRepeat" class="primary-button">
          إعادة النشاط
        </button>
        <button id="auditoryLevelsBack" class="sound-button">
          العودة إلى المستويات
        </button>
      `;

      document.getElementById("auditoryRepeat").onclick =
        () => startAuditory(level, mode);

      document.getElementById("auditoryLevelsBack").onclick =
        openAuditoryLevels;
    }

    render();
  }

  window.openAuditoryLevels = openAuditoryLevels;
})();
