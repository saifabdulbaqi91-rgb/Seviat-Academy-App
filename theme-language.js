(function () {
  "use strict";

  const THEME_KEY = "seviat-theme";
  const LANG_KEY = "seviat-language";

  const dictionary = {
    "أكاديمية سيفيات": "Seviat Academy",
    "التهيئة والاستعداد": "Preparation & Readiness",
    "عالم الحروف": "Letter World",
    "الحركات والمدود": "Vowels & Long Sounds",
    "تركيب الكلمات": "Word Building",
    "الكتابة والتدريب": "Writing Practice",
    "الألعاب والتحديات": "Games & Challenges",
    "التتبع والتمييز والانتباه": "Tracing, Recognition & Attention",
    "أشكال الحروف وأصواتها": "Letter Shapes & Sounds",
    "الفتحة والضمة والكسرة والسكون": "Short Vowels & Sukoon",
    "نجمع الحروف ونبني الكلمات": "Combine Letters & Build Words",
    "نتدرب على الكتابة والتتبع": "Practice Writing & Tracing",
    "نتعلم ونلعب ونكسب النجوم": "Learn, Play & Earn Stars",
    "تحدي اليوم": "Today's Challenge",
    "هل أنت مستعد لاكتشاف حرف جديد": "Ready to Discover a New Letter?",
    "ابدأ رحلتك واكتشف عالم اللغة العربية.": "Start Your Journey into Arabic.",
    "التعلم رحلة ممتعة تبدأ بخطوة.": "Learning Begins with One Step.",
    "اختر نوع النشاط:": "Choose an activity:",
    "التدريب والتعلم": "Practice & Learn",
    "الاختبار النهائي للحرف": "Final Letter Test",
    "العودة للحروف": "Back to Letters",
    "العودة إلى الحروف": "Back to Letters",
    "العودة إلى المراحل": "Back to Stages",
    "التالي": "Next",
    "السابق": "Previous",
    "السؤال التالي": "Next Question",
    "اختيار حرف آخر": "Choose Another Letter",
    "اختر الإجابة الصحيحة.": "Choose the correct answer.",
    "المعلم يقرأ السؤال ثم يختار الطفل الإجابة.": "The teacher reads the question; the child answers.",
    "التهيئة": "Preparation",
    "التمييز البصري": "Visual Recognition",
    "التمييز السمعي": "Auditory Recognition",
    "التدريب": "Practice",
    "اختبار الإتقان": "Mastery Test",
    "نتيجة الاختبار": "Test Results",
    "إعادة التدريب": "Practice Again",
    "إجابة صحيحة": "Correct Answer",
    "حاول مرة أخرى": "Try Again",
    "التعرف على الحرف": "Letter Recognition",
    "اسم الحرف وصوته": "Letter Name & Sound",
    "الفتحة والكسرة والضمة": "Short Vowels",
    "السكون": "Sukoon",
    "المدود": "Long Vowels",
    "مواضع الحرف": "Letter Positions",
    "تحليل الأصوات": "Sound Analysis",
    "تركيب المقاطع": "Syllable Building",
    "قراءة الكلمات": "Word Reading",
    "كتابة الحرف": "Letter Writing",
    "كتابة الكلمات": "Word Writing",
    "أسئلة": "Questions",
    "اختر المهارة ثم يقرأ المعلم السؤال ويجيب الطفل.":
      "Choose a skill. The teacher reads the question and the child answers."
  };

  const reverse = Object.fromEntries(
    Object.entries(dictionary).map(([ar, en]) => [en, ar])
  );

  const patterns = [
    [/^تدريب حرف\s+([مبلدنر])$/, (_, l) => `Practice Letter ${l}`],
    [/^حرف\s+([مبلدنر])$/, (_, l) => `Letter ${l}`],
    [/^مهارات حرف\s+([مبلدنر])$/, (_, l) => `Letter Skills: ${l}`],
    [/^السؤال\s+(\d+)\s+من\s+(\d+)$/, (_, n, t) => `Question ${n} of ${t}`],
    [/^المستوى\s+(\d+)$/, (_, n) => `Level ${n}`],
    [/^(\d+)\s+أسئلة$/, (_, n) => `${n} Questions`],
    [/^⭐\s*نقاطك:\s*(\d+)$/, (_, n) => `⭐ Your Points: ${n}`]
  ];

  const originals = new WeakMap();
  const translatedValues = new WeakMap();

  const css = document.createElement("style");
  css.textContent = `
    #seviat-settings-toggle {
      position:fixed;left:12px;bottom:18px;z-index:99999;
      width:48px;height:48px;border-radius:50%;
      background:#fff;color:#17345a;border:1px solid #aac1db;
      font-size:24px;cursor:pointer;box-shadow:0 4px 15px #0003;
    }
    #seviat-settings-panel {
      position:fixed;left:12px;bottom:76px;z-index:99999;
      width:min(250px,calc(100vw - 30px));padding:15px;
      border-radius:18px;background:#fff;color:#17345a;
      box-shadow:0 6px 25px #0003;border:1px solid #c7d7e8;
      direction:rtl;
    }
    #seviat-settings-panel[hidden]{display:none!important}
    #seviat-settings-panel button {
      display:block;width:100%;margin:8px 0;padding:11px;
      border-radius:12px;border:1px solid #a9c3df;
      background:#eaf4ff;color:#17345a;font-weight:bold;cursor:pointer;
    }
    html[data-seviat-theme="dark"]{color-scheme:dark}
    html[data-seviat-theme="dark"] body {
      background:#101827!important;color:#f1f5ff!important;
    }
    html[data-seviat-theme="dark"] main,
    html[data-seviat-theme="dark"] section,
    html[data-seviat-theme="dark"] article,
    html[data-seviat-theme="dark"] .stage-card,
    html[data-seviat-theme="dark"] .today-card,
    html[data-seviat-theme="dark"] #activityArea {
      background-color:#19283d!important;color:#f1f5ff!important;
    }
    html[data-seviat-theme="dark"] #activityArea > div,
    html[data-seviat-theme="dark"] #activityArea > section {
      background-color:#243650!important;color:#fff!important;
    }
    html[data-seviat-theme="dark"] h1,
    html[data-seviat-theme="dark"] h2,
    html[data-seviat-theme="dark"] h3,
    html[data-seviat-theme="dark"] p,
    html[data-seviat-theme="dark"] small,
    html[data-seviat-theme="dark"] strong {
      color:#f1f5ff!important;
    }
    html[data-seviat-theme="dark"] #activityArea button {
      background-color:#344c6e!important;color:#fff!important;
      border:2px solid #89b9ee!important;
    }
    html[data-seviat-theme="dark"] #activityArea button:disabled {
      opacity:.5;cursor:not-allowed;
    }
    html[data-seviat-theme="dark"] #seviat-settings-panel,
    html[data-seviat-theme="dark"] #seviat-settings-toggle {
      background:#243650!important;color:#fff!important;
    }
    html[data-seviat-theme="dark"] #seviat-settings-panel button {
      background:#344c6e!important;color:#fff!important;
    }
  `;
  document.head.appendChild(css);

  const toggle = document.createElement("button");
  toggle.id = "seviat-settings-toggle";
  toggle.type = "button";
  toggle.textContent = "⚙️";

  const panel = document.createElement("div");
  panel.id = "seviat-settings-panel";
  panel.hidden = true;

  const heading = document.createElement("strong");
  const themeButton = document.createElement("button");
  const langButton = document.createElement("button");

  panel.append(heading, themeButton, langButton);
  document.body.append(toggle, panel);

  function language() {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "ar";
  }

  function translateValue(ar) {
    const trimmed = ar.trim();

    if (dictionary[trimmed]) return dictionary[trimmed];

    for (const [pattern, replacement] of patterns) {
      if (pattern.test(trimmed)) {
        return trimmed.replace(pattern, replacement);
      }
    }

    const skill = trimmed.match(/^(.+?)\s*\((\d+)\s+أسئلة?\)$/u);
    if (skill) {
      const name = dictionary[skill[1]];
      if (name) return `${name} (${skill[2]} Questions)`;
    }

    return null;
  }

  function isProtected(node) {
    const p = node.parentElement;
    if (!p) return true;

    return !!p.closest(
      "script,style,textarea,input," +
      "#seviat-settings-panel,#seviat-settings-toggle," +
      "#quizOptions,#visualOptions,#gameOptions,#letterGrid," +
      ".question-text,.question-prompt,#questionText,#questionPrompt," +
      "[data-question]"
    );
  }

  let busy = false;

  function translatePage() {
    if (busy) return;
    busy = true;

    const english = language() === "en";

    document.documentElement.lang = english ? "en" : "ar";
    document.documentElement.dir = "rtl";

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      if (isProtected(node)) continue;

      const current = node.textContent;
      const trimmed = current.trim();
      if (!trimmed) continue;

      const knownOriginal = originals.get(node);
      const knownTranslation = translatedValues.get(node);

      if (
        knownOriginal === undefined ||
        (trimmed !== knownOriginal && trimmed !== knownTranslation)
      ) {
        originals.set(node, trimmed);
        translatedValues.set(node, translateValue(trimmed));
      }

      const original = originals.get(node);
      const translated = translatedValues.get(node);
      const target = english && translated ? translated : original;

      if (trimmed !== target) {
        node.textContent = current.replace(trimmed, target);
      }
    }

    heading.textContent = english ? "Settings" : "الإعدادات";

    const dark = document.documentElement.dataset.seviatTheme === "dark";
    themeButton.textContent = dark
      ? (english ? "☀️ Light Mode" : "☀️ الوضع النهاري")
      : (english ? "🌙 Dark Mode" : "🌙 الوضع الليلي");

    langButton.textContent = english ? "🌐 العربية" : "🌐 English";

    busy = false;
  }

  function setTheme(theme) {
    const dark = theme === "dark";
    document.documentElement.dataset.seviatTheme =
      dark ? "dark" : "light";
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    translatePage();
  }

  toggle.onclick = () => {
    panel.hidden = !panel.hidden;
  };

  themeButton.onclick = () => {
    const dark =
      document.documentElement.dataset.seviatTheme === "dark";
    setTheme(dark ? "light" : "dark");
    panel.hidden = true;
  };

  langButton.onclick = () => {
    localStorage.setItem(
      LANG_KEY,
      language() === "ar" ? "en" : "ar"
    );
    translatePage();
    panel.hidden = true;
  };

  const observer = new MutationObserver(() => {
    observer.disconnect();
    translatePage();
    observer.observe(document.body, {
      childList:true,
      subtree:true,
      characterData:true
    });
  });

  observer.observe(document.body, {
    childList:true,
    subtree:true,
    characterData:true
  });

  setTheme(localStorage.getItem(THEME_KEY) || "light");
})();
