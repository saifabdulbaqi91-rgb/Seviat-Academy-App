(function () {
  "use strict";

  const KEY = "seviat-language";

  const exact = {
    "عالم الحروف": "Letter World",
    "منهج الصف الأول": "Grade 1 Curriculum",
    "اختر الحرف الذي تريد تعلمه": "Choose a letter to learn",
    "اختر نوع النشاط:": "Choose an activity:",
    "العودة للحروف": "Back to Letters",
    "السؤال التالي": "Next Question",
    "اختيار حرف آخر": "Choose Another Letter",
    "نتيجة الاختبار": "Test Results",
    "الأسئلة التي تحتاج مراجعة": "Questions to Review",
    "لا توجد إجابات خاطئة.": "No incorrect answers.",
    "اختر الإجابة الصحيحة.": "Choose the correct answer.",
    "تم تسجيل إجابتك. انتقل إلى السؤال التالي.": "Answer recorded. Move to the next question.",
    "أحسنت يا بطل! إجابة صحيحة.": "Excellent! Correct answer.",
    "حاول مرة أخرى يا بطل!": "Try again!",
    "الاختبار غير متاح": "Test Unavailable",
    "لا توجد أسئلة كافية لتقييم هذا الحرف حاليا.": "Not enough questions to assess this letter yet.",
    "المعلم يقرأ السؤال ثم يختار الطفل الإجابة.": "Listen to the teacher, then choose an answer.",
    "المعلم ينطق الحرف ثم يختار الطفل الإجابة": "Listen to the letter sound, then choose an answer.",
    "انتهى التدريب": "Practice Complete",
    "أحسنت يا بطل! انتهيت من التدريب.": "Well done! You completed the practice.",
    "أحسنت! اجتزت الاختبار.": "Well done! You passed the test.",
    "تحتاج إلى مزيد من التدريب قبل اجتياز الاختبار.": "More practice is needed before passing.",
    "الكتابة والتدريب": "Writing Practice",
    "عالم الحروف": "Letter World",
    "الصوت": "Sound",
    "متشابهان": "Same",
    "مختلفان": "Different",
    "الأول": "First",
    "الثاني": "Second",
    "منخفض": "Low",
    "متوسط": "Medium",
    "مرتفع": "High",
    "استمع جيدا ثم اختر الإجابة.": "Listen carefully, then choose an answer.",
    "استمع إلى الصوتين. هل هما متشابهان أم مختلفان": "Listen to the two sounds. Are they the same or different?",
    "استمع إلى الصوتين. أيهما أطول": "Listen to the two sounds. Which one is longer?",
    "استمع جيدا. كم صوتا سمعت": "Listen carefully. How many sounds did you hear?",
    "استمع إلى ترتيب النغمات ثم أعده.": "Listen to the tone sequence, then repeat it.",
    "عد مرات ظهور الصوت المرتفع.": "Count how many times you hear the high tone.",
    "التمييز السمعي": "Auditory Recognition",
    "استمع إلى الأصوات": "Listen to the Sounds",
    "تمييز الصوتين المتشابهين والمختلفين": "Same or Different Sounds",
    "الصوت القصير والطويل": "Short and Long Sounds",
    "عد الأصوات": "Count the Sounds",
    "الذاكرة السمعية": "Auditory Memory",
    "الانتباه السمعي": "Auditory Attention",
    "المتصفح لا يدعم تشغيل الأصوات.": "Your browser does not support audio playback."
  };

  const patterns = [
    [/^الوحدة\s+(\d+):\s*(.+)$/u, (_, n, title) => `Unit ${n}: ${title}`],
    [/^حرف\s+(.+)$/u, (_, letter) => `Letter ${letter}`],
    [/^تدريب حرف\s+(.+)$/u, (_, letter) => `Practice Letter ${letter}`],
    [/^المستوى\s+(\d+)(.*)$/u, (_, n, rest) => `Level ${n}${rest}`],
    [/^السؤال\s+(\d+)\s+من\s+(\d+)$/u, (_, n, total) => `Question ${n} of ${total}`],
    [/^الإجابات الصحيحة:\s*(\d+)\s+من\s+(\d+)$/u, (_, n, total) => `Correct answers: ${n} of ${total}`],
    [/^⭐\s*نقاطك:\s*(\d+)$/u, (_, n) => `⭐ Your points: ${n}`],
    [/^(\d+)%\s+من الأسئلة أنجزت$/u, (_, n) => `${n}% of questions completed`],
    [/^🔊\s*الصوت$/u, () => "🔊 Sound"],
    [/^🔇\s*الصوت$/u, () => "🔇 Sound"]
  ];

  const original = new WeakMap();

  function protectedContent(node) {
    const parent = node.parentElement;
    if (!parent) return true;

    if (parent.closest(
      "script,style,textarea,input,#seviat-settings-panel,#seviat-settings-toggle"
    )) return true;

    if (parent.closest(
      "#quizOptions,#visualOptions,#gameOptions,#letterGrid"
    )) return true;

    // Keep actual curriculum question text in Arabic.
    if (parent.matches(
      "[data-question],.question-text,.question-prompt,#questionText,#questionPrompt"
    )) return true;

    return false;
  }

  function convert(value) {
    if (exact[value]) return exact[value];

    for (const [regex, replacement] of patterns) {
      if (regex.test(value)) {
        return value.replace(regex, replacement);
      }
    }

    return null;
  }

  let busy = false;

  function update() {
    if (busy) return;
    busy = true;

    const english = localStorage.getItem(KEY) === "en";
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      if (protectedContent(node)) return;

      const current = node.textContent;
      const trimmed = current.trim();
      if (!trimmed) return;

      if (!original.has(node)) original.set(node, trimmed);

      const source = original.get(node);

      // Refresh source when the application reuses a text node.
      if (current.trim() !== source && current.trim() !== convert(source)) {
        if (/[\u0600-\u06FF]/u.test(trimmed)) {
          original.set(node, trimmed);
        }
      }

      const arabic = original.get(node);
      const translated = convert(arabic);

      if (translated) {
        const target = english ? translated : arabic;
        if (trimmed !== target) {
          node.textContent = current.replace(trimmed, target);
        }
      }
    });

    busy = false;
  }

  const observer = new MutationObserver(update);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true
  });

  document.addEventListener("click", () => {
    queueMicrotask(update);
  });

  update();
})();
