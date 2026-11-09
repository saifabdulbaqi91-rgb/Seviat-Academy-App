
(function () {
  "use strict";

  // كل كلمة تُعرض فقط بعد تعلّم حروفها.
  // المستوى الأول يبدأ بكلمات من حرفين.
  const ACTIVITIES = [
    { level: 1, letter: "ن", word: "مَنْ", parts: ["مَ", "نْ"] },
    { level: 1, letter: "ن", word: "لَنْ", parts: ["لَ", "نْ"] },
    { level: 1, letter: "ن", word: "مِنْ", parts: ["مِ", "نْ"] },
    { level: 1, letter: "ن", word: "بَلْ", parts: ["بَ", "لْ"] },
    { level: 1, letter: "ر", word: "مَرْ", parts: ["مَ", "رْ"] },

    { level: 2, letter: "د", word: "مَدَدْ", parts: ["مَ", "دَ", "دْ"] },
    { level: 2, letter: "ن", word: "لَبَنْ", parts: ["لَ", "بَ", "نْ"] },
    { level: 2, letter: "ن", word: "بَدَنْ", parts: ["بَ", "دَ", "نْ"] },
    { level: 2, letter: "ر", word: "رَمْلْ", parts: ["رَ", "مْ", "لْ"] },
    { level: 2, letter: "ر", word: "بَرَدْ", parts: ["بَ", "رَ", "دْ"] },

    { level: 3, letter: "ب", word: "بَابْ", parts: ["بَا", "بْ"] },
    { level: 3, letter: "ن", word: "نَامْ", parts: ["نَا", "مْ"] },
    { level: 3, letter: "ر", word: "نُورْ", parts: ["نُو", "رْ"] },
    { level: 3, letter: "ر", word: "دَارْ", parts: ["دَا", "رْ"] },
    { level: 3, letter: "ر", word: "مُرُورْ", parts: ["مُ", "رُو", "رْ"] },

    { level: 4, letter: "ر", word: "مِنْبَرْ", parts: ["مِنْ", "بَرْ"] },
    { level: 4, letter: "ر", word: "رُمَّانْ", parts: ["رُمَّ", "مَا", "نْ"] },
    { level: 4, letter: "ر", word: "بُلْبُلْ", parts: ["بُلْ", "بُلْ"] },
    { level: 4, letter: "ر", word: "مَرْمَرْ", parts: ["مَرْ", "مَرْ"] }
  ];

  const LEVEL_NAMES = [
    "كلمات من حرفين",
    "كلمات من ثلاثة أحرف",
    "المقاطع الطويلة والمدود",
    "كلمات أكثر تعقيدًا"
  ];

  const LETTER_ORDER = ["م", "ب", "ل", "د", "ن", "ر"];
  const STORAGE_KEY = "seviat-word-builder-levels-v1";

  let selectedLetter = "م";
  let selectedLevel = 1;
  let activities = [];
  let activityIndex = 0;
  let selectedParts = [];
  let mistakes = 0;
  let completed = false;

  function getProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveLevel(level) {
    const progress = getProgress();
    progress[selectedLetter] = Math.max(
      progress[selectedLetter] || 1,
      Math.min(4, level + 1)
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  function isUnlocked(level) {
    return level === 1 ||
      (getProgress()[selectedLetter] || 1) >= level;
  }

  function effect(name) {
    window.SeviatEffects?.play(name);
  }

  function encourage(correct) {
    const messages = correct
      ? [
          "أحسنتَ يا بطل!",
          "ممتاز! إجابة صحيحة!",
          "رائع! واصل التقدّم!",
          "ما شاء الله عليك!"
        ]
      : [
          "حاول مرة أخرى يا بطل!",
          "فكّر قليلًا ثم حاول من جديد!",
          "أنت تستطيع!"
        ];

    const message = messages[
      Math.floor(Math.random() * messages.length)
    ];

    if (typeof speak === "function") speak(message);
    return message;
  }

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function openWordBuilder(letter) {
    selectedLetter = LETTER_ORDER.includes(letter) ? letter : "م";
    showLevels();
  }

  function showLevels() {
    const area = createActivityArea();
    const knownIndex = LETTER_ORDER.indexOf(selectedLetter);
    const available = ACTIVITIES.filter(item =>
      LETTER_ORDER.indexOf(item.letter) <= knownIndex
    );

    area.innerHTML = `
      <h2>🧩 مستويات تركيب الكلمات</h2>
      <p>اختر المستوى المناسب. تبدأ بالكلمات السهلة ثم تتدرّج.</p>
      <div id="builderLevels"></div>
      <button id="builderBack" class="sound-button">
        العودة إلى المهارات
      </button>
    `;

    const container = document.getElementById("builderLevels");
    container.style.cssText =
      "display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:20px 0";

    LEVEL_NAMES.forEach((name, index) => {
      const level = index + 1;
      const count = available.filter(a => a.level === level).length;
      const unlocked = isUnlocked(level);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "primary-button";
      button.style.cssText = "padding:20px 12px;min-height:90px";
      button.textContent = `المستوى ${level}: ${name} (${count} تدريبات)`;

      button.disabled = !unlocked || count === 0;
      button.title = !unlocked
        ? "أكمل المستوى السابق أولًا"
        : count === 0
          ? "لا توجد كلمات مناسبة للحروف التي تعلمتها بعد"
          : "";

      button.onclick = () => startLevel(level, available);
      container.appendChild(button);
    });

    document.getElementById("builderBack").onclick =
      () => openLetterPractice();

    area.scrollIntoView({ behavior: "smooth" });
  }

  function startLevel(level, available) {
    selectedLevel = level;
    activities = shuffle(available.filter(a => a.level === level));
    activityIndex = 0;
    mistakes = 0;
    renderActivity();
  }

  function renderActivity() {
    const area = createActivityArea();
    const item = activities[activityIndex];

    if (!item) {
      showLevels();
      return;
    }

    completed = false;
    selectedParts = [];

    area.innerHTML = `
      <h2>🧩 ${LEVEL_NAMES[selectedLevel - 1]}</h2>
      <p>التدريب ${activityIndex + 1} من ${activities.length}</p>
      <h3 style="text-align:center">كوّن: ${item.word}</h3>
      <div id="builderResult"></div>
      <div id="builderOptions"></div>
      <p id="builderFeedback" aria-live="polite"></p>
      <div id="builderControls"></div>
      <button id="builderBack" class="sound-button">
        العودة إلى المستويات
      </button>
    `;

    const result = document.getElementById("builderResult");
    result.style.cssText =
      "padding:25px;min-height:90px;background:#f2f8ff;" +
      "border:2px dashed #2878cf;border-radius:18px;" +
      "text-align:center;font-size:38px;margin:20px 0";
    result.textContent = "اختر المقاطع بالترتيب";

    const options = document.getElementById("builderOptions");
    options.style.cssText =
      "display:flex;justify-content:center;flex-wrap:wrap;gap:12px";

    const feedback = document.getElementById("builderFeedback");
    feedback.style.cssText =
      "min-height:40px;text-align:center;font-size:20px";

    const controls = document.getElementById("builderControls");
    controls.style.cssText =
      "display:flex;justify-content:center;gap:12px;margin:20px 0;flex-wrap:wrap";

    const next = document.createElement("button");
    next.className = "primary-button";
    next.textContent = "التالي";
    next.disabled = true;

    const reset = document.createElement("button");
    reset.className = "sound-button";
    reset.textContent = "إعادة المحاولة";

    const buttons = [];

    shuffle(item.parts.map((part, index) => ({ part, index })))
      .forEach(piece => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = piece.part;
        button.style.cssText =
          "padding:20px;font-size:32px;border:2px solid #2878cf;" +
          "border-radius:15px;background:#eaf4ff;cursor:pointer";

        button.onclick = () => {
          if (completed || button.disabled) return;

          effect("click");

          if (piece.index !== selectedParts.length) {
            mistakes++;
            feedback.textContent = encourage(false);
            effect("wrong");
            return;
          }

          selectedParts.push(piece.part);
          button.disabled = true;
          button.style.background = "#d8f7e8";
          result.textContent = selectedParts.join(" + ");
          feedback.textContent = "";

          if (selectedParts.length === item.parts.length) {
            completed = true;
            result.textContent = item.word;
            result.style.color = "#15803d";
            feedback.textContent = encourage(true);
            effect("correct");
            next.disabled = false;
          }
        };

        buttons.push(button);
        options.appendChild(button);
      });

    reset.onclick = () => {
      selectedParts = [];
      completed = false;
      result.textContent = "اختر المقاطع بالترتيب";
      result.style.color = "";
      feedback.textContent = "";
      next.disabled = true;

      buttons.forEach(button => {
        button.disabled = false;
        button.style.background = "#eaf4ff";
      });

      effect("click");
    };

    next.onclick = () => {
      activityIndex++;

      if (activityIndex >= activities.length) {
        finishLevel();
      } else {
        renderActivity();
      }
    };

    controls.append(reset, next);
    document.getElementById("builderBack").onclick = showLevels;
    area.scrollIntoView({ behavior: "smooth" });
  }

  function finishLevel() {
    const area = createActivityArea();
    const passed = mistakes === 0 && activities.length >= 5;

    if (passed) {
      saveLevel(selectedLevel);
      effect("complete");
    }

    area.innerHTML = `
      <h2>${passed ? "🎉 أحسنت! أكملت المستوى" : "⭐ انتهى التدريب"}</h2>
      <p>${passed
        ? "تم فتح المستوى التالي إن كان متاحًا."
        : "يمكنك إعادة التدريب لتحسين مستواك."}</p>
      <p>عدد الأخطاء أثناء التدريب: ${mistakes}</p>
      <button id="repeatLevel" class="primary-button">إعادة المستوى</button>
      <button id="backLevels" class="sound-button">المستويات</button>
    `;

    document.getElementById("repeatLevel").onclick =
      () => startLevel(selectedLevel, ACTIVITIES.filter(a =>
        LETTER_ORDER.indexOf(a.letter) <=
        LETTER_ORDER.indexOf(selectedLetter)
      ));

    document.getElementById("backLevels").onclick = showLevels;
  }

  window.openWordBuilder = openWordBuilder;
})();
