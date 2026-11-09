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

  async function playNotes(notes) {
    const ctx = getContext();
    if (!ctx) {
      alert("المتصفح لا يدعم تشغيل الأصوات.");
      return;
    }

    await ctx.resume();
    const start = ctx.currentTime + 0.08;

    let offset = 0;

    notes.forEach(note => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = note.frequency;

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      const begin = start + offset;
      const end = begin + note.duration;

      gain.gain.setValueAtTime(0.0001, begin);
      gain.gain.exponentialRampToValueAtTime(0.15, begin + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.start(begin);
      oscillator.stop(end + 0.02);

      offset += note.duration + (note.gap ?? 0.3);
    });
  }

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
      instruction: "عد مرات ظهور الصوت المرتفع.",
      sounds: [
        note(660, 0.45, 0.6),
        ...pattern.map(f => note(f, 0.25, 0.25))
      ],
      options: ["1", "2", "3", "4"],
      answer: String(targetCount)
    };
  }

  function openAuditoryLevels() {
    session++;
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
          mode === "practice" ? "التدريب" : "اختبار الإتقان";
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
    const mySession = ++session;
    const total = mode === "assessment" ? 5 : 3;
    let round = 0;
    let correct = 0;

    function render() {
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
        <p>${mode === "practice" ? "التدريب" : "اختبار الإتقان"}
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
        playButton.disabled = true;

        try {
          await playNotes(q.sounds);
          listened = true;
        } finally {
          playing = false;
          if (!finished && mySession === session) {
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
          if (!listened || finished) {
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
            : "يمكنك إعادة التدريب أو بدء اختبار الإتقان."}</p>
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
