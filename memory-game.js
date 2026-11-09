(function () {
  "use strict";

  const COLORS = [
    { name: "أحمر", value: "#e53935" },
    { name: "أزرق", value: "#1e88e5" },
    { name: "أخضر", value: "#43a047" },
    { name: "أصفر", value: "#fdd835" },
    { name: "بنفسجي", value: "#8e24aa" }
  ];

  const LEVELS = [
    { length: 2, seconds: 5 },
    { length: 3, seconds: 5 },
    { length: 3, seconds: 3 },
    { length: 4, seconds: 4 },
    { length: 5, seconds: 4 }
  ];

  const STORAGE_KEY = "seviat-memory-unlocked-v1";
  let timer = null;

  function stopTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function unlocked() {
    return Math.max(
      1,
      Math.min(5, Number(localStorage.getItem(STORAGE_KEY)) || 1)
    );
  }

  function randomSequence(length) {
    return Array.from(
      { length },
      () => Math.floor(Math.random() * COLORS.length)
    );
  }

  function openMemoryLevels() {
    stopTimer();

    const area = createActivityArea();

    area.innerHTML = `
      <h2>🧠 الذاكرة البصرية</h2>
      <p>شاهد الألوان وتذكر ترتيبها ثم أعد اختيارها.</p>
      <div id="memoryLevels" style="display:grid;gap:12px"></div>
      <button id="memoryBack" class="sound-button">
        العودة إلى التهيئة
      </button>
    `;

    const list = document.getElementById("memoryLevels");

    LEVELS.forEach((level, index) => {
      const number = index + 1;
      const row = document.createElement("div");

      row.style.cssText =
        "padding:15px;background:#f2f7ff;border-radius:15px";

      const title = document.createElement("h3");
      title.textContent = `المستوى ${number} — تذكر ${level.length} ألوان`;
      row.appendChild(title);

      ["practice", "assessment"].forEach(mode => {
        const button = document.createElement("button");
        button.className =
          mode === "practice" ? "primary-button" : "sound-button";
        button.textContent =
          mode === "practice" ? "التدريب" : "اختبار الإتقان";
        button.disabled = number > unlocked();
        button.style.margin = "6px";

        button.onclick = () => startMemory(number, mode);

        row.appendChild(button);
      });

      list.appendChild(row);
    });

    document.getElementById("memoryBack").onclick =
      () => window.openPreparation();

    area.scrollIntoView({ behavior: "smooth" });
  }

  function startMemory(levelNumber, mode) {
    stopTimer();

    const settings = LEVELS[levelNumber - 1];
    const totalRounds = mode === "assessment" ? 5 : 3;

    let round = 0;
    let correctRounds = 0;

    function showRound() {
      stopTimer();

      if (round >= totalRounds) {
        finish();
        return;
      }

      const sequence = randomSequence(settings.length);
      const selected = [];
      let completed = false;

      const area = createActivityArea();

      area.innerHTML = `
        <h2>🧠 الذاكرة البصرية — المستوى ${levelNumber}</h2>
        <p>${mode === "practice" ? "تدريب" : "اختبار إتقان"}
          — الجولة ${round + 1} من ${totalRounds}</p>
        <h3 id="memoryInstruction">تذكر ترتيب الألوان</h3>
        <div id="memoryDisplay"
          style="display:flex;justify-content:center;gap:10px;
          flex-wrap:wrap;min-height:100px;margin:25px 0"></div>
        <div id="memoryChoices"
          style="display:none;justify-content:center;gap:12px;
          flex-wrap:wrap;margin:20px 0"></div>
        <p id="memoryFeedback" aria-live="polite"></p>
        <button id="memoryNext" class="primary-button" disabled>
          التالي
        </button>
        <button id="memoryExit" class="sound-button">
          العودة إلى المستويات
        </button>
      `;

      const display = document.getElementById("memoryDisplay");
      const choices = document.getElementById("memoryChoices");
      const feedback = document.getElementById("memoryFeedback");
      const next = document.getElementById("memoryNext");

      sequence.forEach(colorIndex => {
        const square = document.createElement("div");
        square.style.cssText = `
          width:65px;height:65px;border-radius:14px;
          background:${COLORS[colorIndex].value};
          border:2px solid #ffffff;
        `;
        display.appendChild(square);
      });

      function finishRound(success) {
        if (completed) return;
        completed = true;

        if (success) {
          correctRounds++;
          feedback.textContent = "أحسنت! تذكرت الترتيب الصحيح.";
          window.SeviatEffects?.play("correct");
        } else {
          feedback.textContent = mode === "practice"
            ? "حاول أن تتذكر ترتيب الألوان في الجولة القادمة."
            : "تم تسجيل الإجابة.";
          window.SeviatEffects?.play("wrong");
        }

        choices.querySelectorAll("button").forEach(b => {
          b.disabled = true;
        });

        next.disabled = false;
      }

      COLORS.forEach((color, colorIndex) => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("aria-label", color.name);
        button.textContent = color.name;
        button.style.cssText = `
          background:${color.value};
          color:${colorIndex === 3 ? "#222" : "#fff"};
          border:2px solid #444;border-radius:14px;
          padding:18px 12px;min-width:95px;
          font-size:18px;cursor:pointer;
        `;

        button.onclick = () => {
          if (completed) return;

          const expected = sequence[selected.length];

          if (mode === "assessment" && colorIndex !== expected) {
            finishRound(false);
            return;
          }

          if (mode === "practice" && colorIndex !== expected) {
            feedback.textContent = "ليس هذا اللون التالي حاول مجددا.";
            window.SeviatEffects?.play("wrong");
            return;
          }

          selected.push(colorIndex);
          feedback.textContent =
            `اخترت ${selected.length} من ${sequence.length}`;

          if (selected.length === sequence.length) {
            finishRound(true);
          }
        };

        choices.appendChild(button);
      });

      timer = setTimeout(() => {
        display.replaceChildren();
        document.getElementById("memoryInstruction").textContent =
          "اختر الألوان بالترتيب الذي شاهدته";
        choices.style.display = "flex";
        timer = null;
      }, settings.seconds * 1000);

      next.onclick = () => {
        round++;
        showRound();
      };

      document.getElementById("memoryExit").onclick = openMemoryLevels;

      area.scrollIntoView({ behavior: "smooth" });
    }

    function finish() {
      const passed =
        mode === "assessment" && correctRounds >= 4;

      if (passed) {
        localStorage.setItem(
          STORAGE_KEY,
          String(Math.max(unlocked(), Math.min(5, levelNumber + 1)))
        );
      }

      const area = createActivityArea();

      area.innerHTML = `
        <h2>${mode === "assessment"
          ? "نتيجة اختبار الذاكرة"
          : "انتهى التدريب"}</h2>
        <p>الجولات الصحيحة: ${correctRounds} من ${totalRounds}</p>
        <p>${passed
          ? "أحسنت! اجتزت المستوى."
          : mode === "assessment"
            ? "تحتاج إلى 4 إجابات صحيحة من 5 لاجتياز المستوى."
            : "يمكنك التدريب مرة أخرى أو تجربة اختبار الإتقان."}</p>
        <button id="memoryRepeat" class="primary-button">
          إعادة النشاط
        </button>
        <button id="memoryLevelsBack" class="sound-button">
          العودة إلى المستويات
        </button>
      `;

      document.getElementById("memoryRepeat").onclick =
        () => startMemory(levelNumber, mode);

      document.getElementById("memoryLevelsBack").onclick =
        openMemoryLevels;
    }

    showRound();
  }

  window.openMemoryLevels = openMemoryLevels;
})();
