
(function () {
  "use strict";

  const LETTERS = ["م", "ب", "ل", "د", "ن", "ر"];

  const MARKS = {
    fatha: "\u064E",
    kasra: "\u0650",
    damma: "\u064F",
    sukoon: "\u0652"
  };

  const NAMES = {
    "م": "ميم",
    "ب": "باء",
    "ل": "لام",
    "د": "دال",
    "ن": "نون",
    "ر": "راء"
  };

  const SHAPES = {
    "م": ["م", "مـ", "ـمـ", "ـم"],
    "ب": ["ب", "بـ", "ـبـ", "ـب"],
    "ل": ["ل", "لـ", "ـلـ", "ـل"],
    "د": ["د", "د", "ـد", "ـد"],
    "ن": ["ن", "نـ", "ـنـ", "ـن"],
    "ر": ["ر", "ر", "ـر", "ـر"]
  };

  const QUESTIONS = [];

  function add(letter, skill, prompt, options, answer) {
    const unique = [...new Set(options)];

    if (unique.length < 2 || !unique.includes(answer)) {
      throw new Error("سؤال غير صالح: " + prompt);
    }

    QUESTIONS.push({
      id: "g1-" + QUESTIONS.length.toString().padStart(4, "0"),
      letter,
      unit: 1,
      skill,
      type: "multiple-choice",
      difficulty: 1,
      prompt,
      options: unique,
      answer,
      explanation: "راجع الإجابة مع المعلم."
    });
  }

  LETTERS.forEach((letter, index) => {
    const name = NAMES[letter];
    const others = LETTERS.filter(l => l !== letter);

    // اسم الحرف والتمييز البصري
    for (let i = 0; i < 3; i++) {
      add(
        letter,
        "letter-shape",
        "ابحث عن حرف " + name,
        [letter, others[i], others[(i + 2) % others.length]],
        letter
      );
    }

    for (let i = 0; i < 2; i++) {
      add(
        letter,
        "letter-sound",
        "المعلم يقول اسم الحرف: " + name + ". اختر شكله.",
        [others[i], letter, others[(i + 1) % others.length]],
        letter
      );
    }

    // الحركات القصيرة
    const vowels = [
      { label: "الفتحة", mark: MARKS.fatha },
      { label: "الكسرة", mark: MARKS.kasra },
      { label: "الضمة", mark: MARKS.damma }
    ];

    const vowelOptions = vowels.map(v => letter + v.mark);

    vowels.forEach(v => {
      add(
        letter,
        "short-vowels",
        "اختر حرف " + name + " مع " + v.label,
        vowelOptions,
        letter + v.mark
      );

      add(
        letter,
        "short-vowels",
        "المعلم ينطق المقطع، ثم يختار الطفل ما سمعه: " +
          letter + v.mark,
        vowelOptions,
        letter + v.mark
      );
    });

    // السكون
    const silent = letter + MARKS.sukoon;

    add(
      letter,
      "sukoon",
      "اختر حرف " + name + " وعليه سكون",
      [
        letter + MARKS.fatha,
        silent,
        letter + MARKS.damma
      ],
      silent
    );

    add(
      letter,
      "sukoon",
      "أي حرف يحمل علامة السكون؟",
      [
        letter + MARKS.kasra,
        silent,
        letter + MARKS.fatha
      ],
      silent
    );

    // المدود
    const madd = [
      { label: "الألف", text: letter + MARKS.fatha + "ا" },
      { label: "الياء", text: letter + MARKS.kasra + "ي" },
      { label: "الواو", text: letter + MARKS.damma + "و" }
    ];

    const maddOptions = madd.map(m => m.text);

    madd.forEach(m => {
      add(
        letter,
        "long-vowels",
        "اختر حرف " + name + " الممدود بـ" + m.label,
        maddOptions,
        m.text
      );

      add(
        letter,
        "long-vowels",
        "المعلم ينطق المد التالي، ثم يختار الطفل: " + m.text,
        maddOptions,
        m.text
      );
    });

    // الأشكال المتصلة والمنفصلة
    // الدال والراء لا يتصلان بما بعدهما
    const shapes = [...new Set(SHAPES[letter])];

    if (shapes.length >= 3) {
      const shapeTasks = [
        ["اختر الشكل المنفصل", SHAPES[letter][0]],
        ["اختر الشكل المتصل بما قبله", SHAPES[letter][3]]
      ];

      if (shapes.length === 4) {
        shapeTasks.push(
          ["اختر الشكل المتصل بما بعده", SHAPES[letter][1]],
          ["اختر الشكل المتصل من الجانبين", SHAPES[letter][2]]
        );
      }

      shapeTasks.forEach(([prompt, answer]) => {
        add(
          letter,
          "letter-positions",
          prompt + " لحرف " + name,
          shapes,
          answer
        );
      });
    }
  });


  // SEVIAT_GROUP1_READING_GAMES_V2
  // Teacher reads aloud; the child selects the answer.

  const G1_LEARNED = ["م", "ب", "ل", "د", "ن", "ر"];


  const G1_WORDS = [
    { letter: "ب", word: "بَابْ", parts: ["بَا", "بْ"] },
    { letter: "ل", word: "لَمْ", parts: ["لَ", "مْ"] },
    { letter: "د", word: "دَمْ", parts: ["دَ", "مْ"] },
    { letter: "ن", word: "لَبَنْ", parts: ["لَ", "بَ", "نْ"] },
    { letter: "ر", word: "رَمْلْ", parts: ["رَ", "مْ", "لْ"] }
  ];

  const G1_MARKS = /[\u064B-\u0652]/g;

  function g1LettersKnown(word, currentLetter) {
    const index = G1_LEARNED.indexOf(currentLetter);
    if (index < 0) return false;

    const known = G1_LEARNED.slice(0, index + 1);
    const plain = word.replace(G1_MARKS, "");

    return [...plain].every(ch => known.includes(ch));
  }

  // Build syllables using short and long vowels.
  G1_LEARNED.forEach(letter => {
    const options = [
      letter + "\u064E\u0627",
      letter + "\u0650\u064A",
      letter + "\u064F\u0648"
    ];

    const labels = [
      "المد بالألف",
      "المد بالياء",
      "المد بالواو"
    ];

    options.forEach((answer, index) => {
      add(
        letter,
        "syllable-building",
        "اختر المقطع الذي يحتوي على " + labels[index],
        options,
        answer
      );
    });
  });

  // Word reading and sound analysis.
  G1_WORDS.forEach(item => {
    if (!g1LettersKnown(item.word, item.letter)) return;

    const analysis = item.parts.join(" + ");

    const reversed = [...item.parts].reverse().join(" + ");
    const wrong = item.parts.map((part, i) =>
      i === 0 ? part.replace("\u064E", "\u064F") : part
    ).join(" + ");

    const choices = [...new Set([analysis, reversed, wrong])];

    if (choices.length === 3) {
      add(
        item.letter,
        "sound-analysis",
        "اختر التحليل الصحيح: " + item.word,
        choices,
        analysis
      );
    }

    const distractors = G1_WORDS
      .filter(other =>
        other.word !== item.word &&
        g1LettersKnown(other.word, item.letter)
      )
      .map(other => other.word)
      .slice(0, 2);

    if (distractors.length === 2) {
      add(
        item.letter,
        "word-reading",
        "المعلم يقرأ: " + item.word + "، ثم يختار الطفل الكلمة",
        [item.word, ...distractors],
        item.word
      );
    }
  });

  function validateQuestions() {
    const ids = new Set();

    for (const q of QUESTIONS) {
      if (ids.has(q.id)) {
        throw new Error("رقم سؤال مكرر: " + q.id);
      }

      ids.add(q.id);

      if (
        q.options.length !== new Set(q.options).size ||
        !q.options.includes(q.answer)
      ) {
        throw new Error("اختيارات غير صالحة: " + q.id);
      }
    }

    return true;
  }

  function installQuestions() {
    if (
      typeof questionsData === "undefined" ||
      !questionsData ||
      !Array.isArray(questionsData.questions)
    ) {
      return false;
    }

    const existing = new Set(
      questionsData.questions.map(q => q.id)
    );

    QUESTIONS.forEach(q => {
      if (!existing.has(q.id)) {
        questionsData.questions.push(q);
        existing.add(q.id);
      }
    });

    return true;
  }

  validateQuestions();

  // أضف الأسئلة قبل فتح قائمة الحروف
  if (typeof renderLetterPicker === "function") {
    const originalPicker = renderLetterPicker;

    renderLetterPicker = function (...args) {
      installQuestions();
      return originalPicker.apply(this, args);
    };
  }

  // تشجيع متنوع مع الإبقاء على المؤثرات الأصلية
  const encouragement = {
    correct: [
      "أحسنت يا بطل!",
      "ممتاز!",
      "إجابة رائعة!",
      "ما شاء الله عليك!",
      "أنت نجم!"
    ],
    wrong: [
      "حاول مرة أخرى يا بطل!",
      "فكر قليلًا!",
      "أنت تستطيع!",
      "جرّب اختيارًا آخر!"
    ]
  };

  window.SeviatGroup1 = {
    letters: LETTERS,
    questions: QUESTIONS,
    validate: validateQuestions,
    install: installQuestions,
    encouragement,
    randomPraise(type) {
      const messages = encouragement[type] || encouragement.correct;
      return messages[Math.floor(Math.random() * messages.length)];
    }
  };

  console.log(
    "أكاديمية سيفيات: تم تجهيز " +
    QUESTIONS.length +
    " سؤالًا للمجموعة الأولى."
  );
})();
