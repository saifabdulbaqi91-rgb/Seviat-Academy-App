(function () {
  "use strict";

  const LEVELS = [
    { name: "المطابقة المباشرة", instruction: "اختر الشكل المطابق للنموذج." },
    { name: "تمييز الشكل رغم اختلاف اللون والحجم", instruction: "ابحث عن الشكل نفسه حتى لو اختلف لونه أو حجمه." },
    { name: "اكتشاف الشكل المختلف", instruction: "اختر الشكل المختلف عن بقية الأشكال." },
    { name: "التمييز الدقيق والاتجاهات", instruction: "لاحظ التفاصيل والاتجاهات جيدا." },
    { name: "الذاكرة البصرية", instruction: "تذكر الشكل الذي يظهر ثم اختره بعد اختفائه." }
  ];

  const SHAPES = ["circle", "square", "triangle", "diamond", "star"];
  const COLORS = ["#2563eb", "#e87932", "#16a34a", "#9333ea", "#dc2626"];

  const KEY = "seviat-visual-levels-v1";
  let level = 1;
  let mode = "practice";
  let questions = [];
  let index = 0;
  let results = [];
  let answered = false;
  let memoryTimer = null;

  function getSaved() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { unlocked: 1 };
    } catch {
      return { unlocked: 1 };
    }
  }

  function saveUnlocked(nextLevel) {
    const data = getSaved();
    data.unlocked = Math.max(data.unlocked || 1, Math.min(5, nextLevel));
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function shapeSVG(shape, color, size = 90, direction = 0) {
    const forms = {
      circle: '<circle cx="50" cy="50" r="32"/>',
      square: '<rect x="20" y="20" width="60" height="60" rx="3"/>',
      triangle: '<polygon points="50,12 87,82 13,82"/>',
      diamond: '<polygon points="50,10 90,50 50,90 10,50"/>',
      star: '<polygon points="50,8 61,36 91,36 67,55 76,86 50,68 24,86 33,55 9,36 39,36"/>',
      arrow: '<polygon points="50,8 89,48 65,48 65,90 35,90 35,48 11,48"/>'
    };

    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100"
      role="img" aria-label="شكل هندسي">
      <g fill="${color}" transform="rotate(${direction} 50 50)">
        ${forms[shape] || forms.circle}
      </g>
    </svg>`;
  }

  function makeQuestions(selectedLevel) {
    const generated = [];

    for (let i = 0; i < 5; i++) {
      const target = SHAPES[i];
      const others = shuffle(SHAPES.filter(s => s !== target)).slice(0, 2);

      if (selectedLevel === 1) {
        generated.push({
          prompt: "اختر الشكل المطابق للنموذج",
          target: { shape: target, color: COLORS[i], size: 90 },
          options: shuffle([
            { shape: target, color: COLORS[i], size: 90, correct: true },
            ...others.map((s, j) => ({
              shape: s, color: COLORS[(i + j + 1) % 5], size: 90
            }))
          ])
        });
      } else if (selectedLevel === 2) {
        // Shared within each question: size and color cannot identify the answer.
        const optionSize = shuffle([65, 85])[0];
        const optionColor = shuffle(COLORS.filter(c => c !== COLORS[i]))[0];
        generated.push({
          prompt: "اختر الشكل نفسه رغم اختلاف اللون والحجم",
          target: { shape: target, color: COLORS[i], size: 90 },
          options: shuffle([
            { shape: target, color: optionColor, size: optionSize, correct: true },
            ...others.map((s, j) => ({
              shape: s, color: optionColor, size: optionSize
            }))
          ])
        });
      } else if (selectedLevel === 3) {
        generated.push({
          prompt: "أي شكل يختلف عن البقية",
          target: null,
          options: shuffle([
            { shape: target, color: COLORS[i], size: 80 },
            { shape: target, color: COLORS[i], size: 80 },
            { shape: target, color: COLORS[i], size: 80 },
            { shape: others[0], color: COLORS[i], size: 80, correct: true }
          ])
        });
      } else if (selectedLevel === 4) {
        const angles = [0, 90, 180, 270];
        generated.push({
          prompt: "اختر السهم الذي يشير في الاتجاه نفسه",
          target: { shape: "arrow", color: COLORS[i], size: 90, direction: angles[i % 4] },
          options: shuffle([
            { shape: "arrow", color: COLORS[(i + 1) % 5], size: 85, direction: angles[i % 4], correct: true },
            { shape: "arrow", color: COLORS[(i + 2) % 5], size: 85, direction: angles[(i + 1) % 4] },
            { shape: "arrow", color: COLORS[(i + 3) % 5], size: 85, direction: angles[(i + 2) % 4] }
          ])
        });
      } else {
        generated.push({
          prompt: "تذكر الشكل ثم اختره من الذاكرة",
          target: { shape: target, color: COLORS[i], size: 90 },
          options: shuffle([
            { shape: target, color: COLORS[i], size: 80, correct: true },
            ...others.map(s => ({
              shape: s, color: COLORS[i], size: 80
            }))
          ]),
          memory: true
        });
      }
    }

    return shuffle(generated);
  }

  function clearTimer() {
    if (memoryTimer !== null) {
      clearTimeout(memoryTimer);
      memoryTimer = null;
    }
  }

  function openLevels() {
    if(window.SeviatAccessGuard&&!window.SeviatAccessGuard.coarseAllowed('preparation'))return;
    clearTimer();
    const area = createActivityArea();
    const saved = getSaved();

    area.innerHTML = `
      <h2>👁️ مستويات التمييز البصري</h2>
      <p>نتدرب أولا ثم نختبر الأداء قبل الانتقال للمستوى التالي.</p>
      <div id="visualLevelList" style="display:grid;gap:12px;margin:20px 0"></div>
      <button id="visualHome" class="sound-button">العودة إلى التهيئة</button>
    `;

    const list = document.getElementById("visualLevelList");

    LEVELS.forEach((item, i) => {
      const number = i + 1;
      const unlocked = number <= (saved.unlocked || 1);
      const row = document.createElement("div");
      row.style.cssText =
        "padding:15px;background:#f2f7ff;color:#17345a;border-radius:15px";

      row.innerHTML = `
        <h3>المستوى ${number}: ${item.name}</h3>
        <p>${item.instruction}</p>
      `;

      const practice = document.createElement("button");
      practice.className = "primary-button";
      practice.textContent = "التدريب";
      practice.disabled = !unlocked;
      practice.onclick = () => start(number, "practice");

      const test = document.createElement("button");
      test.className = "sound-button";
      test.textContent = "اختبار المستوى";
      test.disabled = !unlocked;
      test.style.margin = "8px";
      test.onclick = () => start(number, "assessment");

      row.append(practice, test);
      list.appendChild(row);
    });

    document.getElementById("visualHome").onclick = () =>
      window.openPreparation();

    area.scrollIntoView({ behavior: "smooth" });
  }

  function start(selectedLevel, selectedMode) {
    if(window.SeviatAccessGuard&&!window.SeviatAccessGuard.coarseAllowed('preparation'))return;
    clearTimer();
    level = selectedLevel;
    mode = selectedMode;
    questions = makeQuestions(level);
    index = 0;
    results = [];
    render();
  }

  function render() {
    if(window.SeviatAccessGuard&&!window.SeviatAccessGuard.coarseAllowed('preparation'))return;
    clearTimer();

    if (index >= questions.length) {
      finish();
      return;
    }

    answered = false;
    const item = questions[index];
    const area = createActivityArea();

    area.innerHTML = `
      <h2>${LEVELS[level - 1].name}</h2>
      <p>${mode === "practice" ? "التدريب" : "اختبار المستوى"}
        — السؤال ${index + 1} من ${questions.length}</p>
      <h3 style="text-align:center">${item.prompt}</h3>
      <div id="visualTarget" style="text-align:center;min-height:115px;margin:15px"></div>
      <div id="visualChoices"
        style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap"></div>
      <p id="visualResponse" aria-live="polite"
        style="text-align:center;min-height:40px;font-size:20px"></p>
      <button id="visualContinue" class="primary-button" disabled>التالي</button>
      <button id="visualExit" class="sound-button">المستويات</button>
    `;

    const target = document.getElementById("visualTarget");
    const choices = document.getElementById("visualChoices");
    const feedback = document.getElementById("visualResponse");
    const next = document.getElementById("visualContinue");

    if (item.target) {
      target.innerHTML = shapeSVG(
        item.target.shape,
        item.target.color,
        item.target.size,
        item.target.direction || 0
      );
    }

    const optionButtons = [];

    item.options.forEach(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.style.cssText =
        "padding:12px;min-width:95px;min-height:105px;" +
        "border:2px solid #2878cf;border-radius:16px;" +
        "background:#eaf4ff;cursor:pointer";

      button.innerHTML = shapeSVG(
        option.shape, option.color, option.size, option.direction || 0
      );

      button.setAttribute("aria-label", "اختر هذا الشكل");

      button.onclick = () => {
        if (answered) return;

        const correct = option.correct === true;

        if (mode === "assessment") {
          answered = true;
          results.push(correct);
          optionButtons.forEach(b => b.disabled = true);
          feedback.textContent = correct
            ? "تم تسجيل إجابتك."
            : "تم تسجيل الإجابة. انتقل للسؤال التالي.";
          next.disabled = false;
          return;
        }

        if (correct) {
          answered = true;
          feedback.textContent = "أحسنت! إجابة صحيحة.";
          feedback.style.color = "#15803d";
          window.SeviatEffects?.play("correct");
          optionButtons.forEach(b => b.disabled = true);
          next.disabled = false;
        } else {
          feedback.textContent = "حاول مرة أخرى ولاحظ الشكل جيدا.";
          feedback.style.color = "#b91c1c";
          window.SeviatEffects?.play("wrong");
          button.disabled = true;
        }
      };

      optionButtons.push(button);
      choices.appendChild(button);
    });

    if (item.memory) {
      choices.style.visibility = "hidden";
      feedback.textContent = "تذكر الشكل جيدا...";
      memoryTimer = setTimeout(() => {
        if (!document.getElementById("visualChoices")) return;
        target.textContent = "ما الشكل الذي رأيته";
        choices.style.visibility = "visible";
        feedback.textContent = "اختر من ذاكرتك.";
      }, 3000);
    }

    next.onclick = () => {
      index++;
      render();
    };

    document.getElementById("visualExit").onclick = openLevels;
    area.scrollIntoView({ behavior: "smooth" });
  }

  function finish() {
    if(window.SeviatAccessGuard&&!window.SeviatAccessGuard.coarseAllowed('preparation'))return;
    clearTimer();
    const area = createActivityArea();
    const correct = results.filter(Boolean).length;
    const percent = mode === "assessment"
      ? Math.round(correct / questions.length * 100)
      : null;
    const passed = mode === "assessment" && percent >= 80;

    if (passed) saveUnlocked(level + 1);

    area.innerHTML = `
      <h2>${mode === "assessment" ? "نتيجة اختبار المستوى" : "أحسنت! انتهى التدريب"}</h2>
      <p>${mode === "assessment"
        ? `الإجابات الصحيحة: ${correct} من ${questions.length} — نسبة الإجابات الصحيحة: ${percent}%`
        : "أكملت التدريب. يمكنك الآن أداء اختبار المستوى."}</p>
      <p>${passed
        ? "أحسنت! تم فتح المستوى التالي."
        : mode === "assessment"
          ? "تدرب مرة أخرى ثم أعد الاختبار."
          : "التدريب لا يحسب اختبارا."}</p>
      <button id="visualAgain" class="primary-button">إعادة النشاط</button>
      <button id="visualLevelsBack" class="sound-button">المستويات</button>
    `;

    document.getElementById("visualAgain").onclick =
      () => start(level, mode);
    document.getElementById("visualLevelsBack").onclick = openLevels;
  }

  window.openVisualLevels = openLevels;
})();
