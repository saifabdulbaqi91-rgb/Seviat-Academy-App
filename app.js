
const DATA_FILES = {
  curriculum: "./data/curriculum.json",
  skills: "./data/skills.json",
  questions: "./data/questions.json"
};

const STORAGE_KEY = "seviatLearningProgress";

let curriculumData;
let skillsData;
let questionsData;

let soundEnabled = window.SeviatEffects?.isEnabled() ?? true;
let score = 0;
let answeredQuestions = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let currentLetter = "";
let selectedStage = "";

const stages = document.getElementById("stages");
const startButton = document.getElementById("startButton");
const soundToggle = document.getElementById("soundToggle");

const letterNames = {
  preparation: "التهيئة والاستعداد",
  letters: "عالم الحروف",
  movements: "الحركات والمدود",
  combination: "تركيب الكلمات",
  writing: "الكتابة والتدريب",
  games: "الألعاب والتحديات"
};

let legacyProgressStatus = "unloaded";
let legacyProgressRaw;
let legacyProgressFields;
let legacyProgressPending = false;

// Presentation only: never localize score digits or change persisted values.
function legacyPointsLabel() {
  return "⭐ نقاطك: " + String(score) +
    (legacyProgressPending ? " (غير محفوظة)" : "");
}

function validLegacyScore(value) {
  return (typeof value === "number" ||
    (typeof value === "string" && /^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) &&
    Number.isFinite(Number(value)) && Number(value) >= 0;
}

function validLegacyProgress(value) {
  // Missing fields were supported by the legacy reader. Unknown fields and
  // retired question IDs belong to the student record and must be retained.
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    (!Object.hasOwn(value, "score") ||
      validLegacyScore(value.score)) &&
    (!Object.hasOwn(value, "answeredQuestions") ||
      (Array.isArray(value.answeredQuestions) && value.answeredQuestions.every(id =>
        typeof id === "string" && id.length > 0))) &&
    (!Object.hasOwn(value, "updatedAt") ||
      (typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt))));
}

function loadProgress() {
  // Corruption, an unreadable store or a conflict disables writes until reload.
  // Never repair, normalize or back up the original value as a side effect.
  if (legacyProgressStatus === "blocked") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw === null ? {} : JSON.parse(raw);
    if (!validLegacyProgress(saved)) throw new Error("Invalid legacy progress schema");
    legacyProgressRaw = raw;
    legacyProgressFields = saved;
    score = Number(saved.score ?? 0);
    answeredQuestions = [...(saved.answeredQuestions ?? [])];
    legacyProgressStatus = "ready";
    return true;
  } catch {
    legacyProgressStatus = "blocked";
    console.warn("Legacy progress unavailable; original storage preserved and saving disabled.");
    return false;
  }
}

function saveProgress() {
  if (legacyProgressStatus !== "ready") return false;
  const next = {...legacyProgressFields, score, answeredQuestions,
    updatedAt: new Date().toISOString()};
  if (!validLegacyProgress(next)) return false;
  let bytes;
  try {
    bytes = JSON.stringify(next);
    // Compare exact strings, including whitespace. localStorage has no atomic
    // compare-and-set: a simultaneous writer between getItem and setItem can
    // still race. See docs/LEGACY_PROGRESS_PERSISTENCE.md for the boundary.
    if (localStorage.getItem(STORAGE_KEY) !== legacyProgressRaw) {
      legacyProgressStatus = "blocked";
      console.warn("Legacy progress changed in another tab; saving disabled until reload.");
      return false;
    }
  } catch {
    legacyProgressStatus = "blocked";
    console.warn("Legacy progress cannot be read safely; saving disabled until reload.");
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, bytes);
  } catch {
    // A failed setItem (including quota/security errors) leaves the stored
    // value unchanged. Keep the old comparison baseline so a retry is safe.
    console.warn("Legacy progress was not saved; original storage preserved.");
    return false;
  }
  legacyProgressRaw = bytes;
  legacyProgressFields = next;
  legacyProgressPending = false;
  updateProgressDisplay();
  return true;
}

function showLegacyProgressWarning() {
  let notice = document.getElementById("legacy-progress-warning");
  if (!notice) {
    notice = document.createElement("section");
    notice.id = "legacy-progress-warning";
    notice.setAttribute("role", "alert");
    document.body.append(notice);
  }
  notice.replaceChildren();
  const message = document.createElement("p");
  message.textContent = legacyProgressStatus === "ready"
    ? "تعذر حفظ تقدمك. النقاط الجديدة مؤقتة وستفقد عند إغلاق الصفحة ما لم تنجح إعادة الحفظ."
    : "تعذر حفظ التقدم بأمان. لم نستبدل السجل المخزن؛ لا تغلق الصفحة قبل طلب مساعدة المعلم. النقاط الجديدة غير محفوظة.";
  notice.append(message);
  if (legacyProgressStatus === "ready") {
    const retry = document.createElement("button");
    retry.id = "legacy-progress-retry";
    retry.type = "button";
    retry.textContent = "إعادة حفظ التقدم";
    retry.onclick = saveLegacyProgressFromUI;
    notice.append(retry);
  }
}

function saveLegacyProgressFromUI() {
  const saved = saveProgress();
  if (saved) document.getElementById("legacy-progress-warning")?.remove();
  else showLegacyProgressWarning();
  const points = document.getElementById("gameScore");
  if (points) points.textContent = legacyPointsLabel();
  return saved;
}

function updateProgressDisplay() {
  const total = questionsData?.questions?.length || 0;
  const activeIds = new Set((questionsData?.questions || []).map(q => q.id));
  const completed = answeredQuestions.filter(id => activeIds.has(id)).length;
  const percentage = total
    ? Math.round((completed / total) * 100)
    : 0;

  const progressText = document.getElementById("progressText");
  const progressBar = document.getElementById("progressBar");

  if (progressText) {
    progressText.textContent = `${percentage}% من الأسئلة أُنجزت`;
  }

  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
  }
}



function speak() {
  // Educational pronunciation requires a reviewed recording or the teacher.
  return false;
}


function createGlobalBackButton() {
  if (document.getElementById("afaq-global-back")) return;

  const button = document.createElement("button");
  button.id = "afaq-global-back";
  button.type = "button";
  button.textContent = "↩ رجوع خطوة";
  button.disabled = false;

  button.addEventListener("click", () => {
    const smartAudio = document.getElementById("afaq-smart-audio-panel");
    if (smartAudio) {
      smartAudio.remove();window.AfaqAdult.lock();
      return;
    }

    const audioEditor = document.getElementById("afaq-audio-library");
    if (audioEditor) {
      audioEditor.remove();window.AfaqAdult.lock();
      return;
    }

    const area = document.getElementById("activityArea");
    if (!area) {
      stages.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (area.querySelector("#answerOptions, #nextQuestion")) {
      openLetterActivity();
      return;
    }

    if (area.querySelector("#startPractice, #startAssessment")) {
      renderLetterPicker();
      return;
    }

    area.remove();
    stages.scrollIntoView({ behavior: "smooth" });
  });
  button.title = "سيتم تفعيل الرجوع بعد ربط سجل التنقل";

  button.style.cssText = `
    position:fixed;
    bottom:calc(16px + env(safe-area-inset-bottom, 0px));
    left:50%;transform:translateX(-50%);
    z-index:100000;
    padding:10px 16px;
    border:2px solid #173b70;
    border-radius:12px;
    background:#ffffff;
    color:#173b70;
    font-family:Tajawal,Arial,sans-serif;
    font-size:15px;
    font-weight:bold;
    cursor:pointer;
  `;

  document.body.appendChild(button);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", createGlobalBackButton);
} else {
  createGlobalBackButton();
}
function createActivityArea() {
  let area = document.getElementById("activityArea");

  if (!area) {
    area = document.createElement("section");
    area.id = "activityArea";
    area.className = "progress-section";
    stages.insertAdjacentElement("afterend", area);
  }

  return area;
}

function showMessage(title, message) {
  const area = createActivityArea();

  area.innerHTML = `
    <div class="section-heading">
      <h2>${title}</h2>
      <span>آفاق</span>
    </div>
    <div style="text-align:center;padding:25px">
      <p>${message}</p>
      <button id="closeActivity" class="sound-button">
        العودة إلى المراحل
      </button>
    </div>
  `;

  document.getElementById("closeActivity").addEventListener("click", () => {
    area.remove();
    stages.scrollIntoView({ behavior: "smooth" });
  });

  area.scrollIntoView({ behavior: "smooth" });
}

function renderLetterPicker() {
  const area = createActivityArea();
  const units = curriculumData.curriculum.units;

  area.innerHTML = `
    <div class="section-heading">
      <h2>🔤 اختر الحرف الذي تريد تعلمه</h2>
      <span>منهج الصف الأول</span>
    </div>
    <div id="unitList"></div>
    <button id="closeActivity" class="sound-button">
      العودة إلى المراحل
    </button>
  `;

  const unitList = document.getElementById("unitList");

  units.filter(unit => unit.letters.length > 0).forEach(unit => {
    const unitBox = document.createElement("div");
    unitBox.style.cssText = "margin:20px 0;padding:15px;background:#f2f7ff;border-radius:16px";

    const heading = document.createElement("h3");
    heading.textContent = `الوحدة ${unit.id}: ${unit.title}`;
    unitBox.appendChild(heading);

    const grid = document.createElement("div");
    grid.style.cssText = "display:flex;flex-wrap:wrap;gap:10px";

    unit.letters.forEach(letter => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = letter;
      button.style.cssText = `
        min-width:58px;
        padding:12px;
        border:2px solid #2878cf;
        border-radius:14px;
        background:white;
        color:#173b70;
        font-size:28px;
        cursor:pointer;
        font-family:inherit;
      `;

      button.addEventListener("click", () => {
        currentLetter = letter;
        window.location.hash = 'letter-' + encodeURIComponent(letter);
        openLetterActivity();
      });

      grid.appendChild(button);
    });

    unitBox.appendChild(grid);
    unitList.appendChild(unitBox);
  });

  document.getElementById("closeActivity").addEventListener("click", () => {
    area.remove();
    stages.scrollIntoView({ behavior: "smooth" });
  });

  area.scrollIntoView({ behavior: "smooth" });
}

function openLetterActivity() {
  if (['ص','ف','س','ق','ت','ح'].includes(currentLetter) && window.SeviatUnit2?.openLetter) {
    window.SeviatUnit2.openLetter(currentLetter);
    return;
  }
  const area = createActivityArea();
  area.innerHTML = `
    <h2>حرف ${currentLetter}</h2>
    <p>اختر نوع النشاط:</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin:20px 0">
      <button id="startPractice" class="primary-button">📚 التدريب والتعلم</button>
      <button id="startAssessment" class="primary-button">📝 الاختبار النهائي للحرف</button>
      <button id="backToLetters" class="sound-button">العودة للحروف</button>
    </div>
  `;

  document.getElementById("startPractice").onclick = openLetterPractice;
  document.getElementById("startAssessment").onclick = openLetterAssessment;
  document.getElementById("backToLetters").onclick = renderLetterPicker;
  area.scrollIntoView({ behavior: "smooth" });
}

function openLetterAssessment() {
  const letterQuestions = questionsData.questions.filter(
    question => question.letter === currentLetter
  );

  if (letterQuestions.length < 5) {
    showMessage(
      "الاختبار غير متاح",
      "لا توجد أسئلة كافية لتقييم هذا الحرف حاليا."
    );
    return;
  }

  quizMode = "assessment";
  currentQuestions = spreadQuestionTypes(letterQuestions);
  currentQuestionIndex = 0;
  quizResults = [];
  renderQuiz();
}

function openLegacyLetterPractice() {
  quizMode = 'practice';
  const allQuestions = questionsData.questions;

  const letterQuestions = allQuestions.filter(
    question => question.letter === currentLetter
  );

  if (letterQuestions.length === 0) {
    showMessage(
      `حرف ${currentLetter}`,
      `لم نضف أسئلة هذا الحرف بعد. سنضيف تدريباته واختباراته قبل اعتماده في التعلم.`
    );
    return;
  }

  currentQuestions = spreadQuestionTypes(letterQuestions);
  currentQuestionIndex = 0;  quizResults = [];

  renderQuiz();
}

function shuffleArray(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

let quizResults = [];
let quizMode = 'practice';


let autoNextTimer = null;

function spreadQuestionTypes(items) {
  const groups = new Map();

  shuffleArray([...items]).forEach(q => {
    const type = q.skill || q.skillId || q.category || q.type || "other";
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(q);
  });

  const result = [];
  let previous = null;

  while ([...groups.values()].some(group => group.length)) {
    const candidates = [...groups.entries()]
      .filter(([type, group]) => group.length && type !== previous);

    const available = candidates.length
      ? candidates
      : [...groups.entries()].filter(([, group]) => group.length);

    available.sort((a, b) => b[1].length - a[1].length);

    const [type, group] = available[0];
    result.push(group.shift());
    previous = type;
  }

  return result;
}

function advanceQuiz() {
  if (autoNextTimer !== null) {
    clearTimeout(autoNextTimer);
    autoNextTimer = null;
  }
  currentQuestionIndex++;
  renderQuiz();
}

function renderQuiz() {
  if (autoNextTimer !== null) {
    clearTimeout(autoNextTimer);
    autoNextTimer = null;
  }
  const area = createActivityArea();
  const question = currentQuestions[currentQuestionIndex];

  if (!question) {
    window.SeviatEffects?.play("complete");
    if (quizMode === "assessment") { showAssessmentResults(); } else { showMessage("انتهى التدريب", "أحسنت يا بطل! انتهيت من التدريب."); }
    return;
  }

  area.innerHTML = "";

  const heading = document.createElement("h2");
  heading.textContent = "تدريب حرف " + currentLetter;
  area.appendChild(heading);

  const counter = document.createElement("p");
  counter.textContent =
    "السؤال " + (currentQuestionIndex + 1) + " من " + currentQuestions.length;
  area.appendChild(counter);

  const prompt = document.createElement("h3");
  prompt.textContent =
    question.type === "listening"
      ? "المعلم ينطق الحرف ثم يختار الطفل الإجابة"
      : question.prompt;
  area.appendChild(prompt);

  const instruction = document.createElement("p");
  instruction.textContent = "المعلم يقرأ السؤال ثم يختار الطفل الإجابة.";
  area.appendChild(instruction);

  const options = document.createElement("div");
  options.id = "answerOptions";
  options.style.cssText =
    "display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:25px 0";
  area.appendChild(options);

  const feedback = document.createElement("p");
  feedback.id = "gameFeedback";
  feedback.textContent = "اختر الإجابة الصحيحة.";
  feedback.setAttribute("aria-live", "polite");

  const points = document.createElement("p");
  points.id = "gameScore";
  points.textContent = legacyPointsLabel();

  const next = document.createElement("button");
  next.id = "nextQuestion";
  next.className = "primary-button";
  next.textContent = "السؤال التالي";
  next.disabled = true;

  const back = document.createElement("button");
  back.className = "sound-button";
  back.textContent = "اختيار حرف آخر";
  back.style.marginInlineStart = "10px";
  back.addEventListener("click", renderLetterPicker);

  area.append(feedback, points, next, back);

  shuffleArray(question.options).forEach(option => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option;
    button.style.cssText =
      "padding:18px 8px;font-size:30px;border:2px solid #2878cf;border-radius:16px;background:#eaf4ff;cursor:pointer;font-family:inherit";

    button.addEventListener("click", () => {
      checkAnswer(option, button);
    });

    options.appendChild(button);
  });

  next.addEventListener("click", () => {
    if (next.dataset.answered === "yes") advanceQuiz();
  });

  area.scrollIntoView({ behavior: "smooth" });
}

function showAssessmentResults() {
  const area = createActivityArea();
  const total = quizResults.length;
  const correct = quizResults.filter(r => r.correct).length;
  const wrong = quizResults.filter(r => !r.correct);
  const percent = total ? Math.round(correct / total * 100) : 0;
  const passed = total >= 5 && percent >= 80;

  area.innerHTML = "";

  const heading = document.createElement("h2");
  heading.textContent = "📊 نتيجة الاختبار";

  const summary = document.createElement("p");
  summary.textContent =
    `الإجابات الصحيحة: ${correct} من ${total} | الأخطاء: ${wrong.length} | نسبة الإجابات الصحيحة: ${percent}%`;

  const status = document.createElement("h3");
  status.textContent = passed
    ? "🎉 أحسنت! اجتزت الاختبار."
    : "تحتاج إلى مزيد من التدريب قبل اجتياز الاختبار.";

  const review = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = "الأسئلة التي تحتاج مراجعة";
  review.appendChild(title);

  if (!wrong.length) {
    const message = document.createElement("p");
    message.textContent = "لا توجد إجابات خاطئة.";
    review.appendChild(message);
  }

  wrong.forEach((result, index) => {
    const question = currentQuestions.find(q => q.id === result.id);
    const item = document.createElement("p");
    item.textContent =
      `${index + 1}. ${question?.prompt || "السؤال"} | إجابتك: ${result.answer} | الصحيح: ${result.expected}`;
    review.appendChild(item);
  });

  const back = document.createElement("button");
  back.className = "primary-button";
  back.textContent = "العودة إلى الحروف";
  back.onclick = renderLetterPicker;

  area.append(heading, summary, status, review, back);
  area.scrollIntoView({ behavior: "smooth" });
}

function checkAnswer(answer, selectedButton) {
  const question = currentQuestions[currentQuestionIndex];
  const feedback = document.getElementById("gameFeedback");
  const buttons = [...document.querySelectorAll("#answerOptions button")];
  const next = document.getElementById("nextQuestion");

  if (!question || !feedback || !next ||
      next.dataset.answered === "yes") return;

  next.dataset.answered = "yes";

  const correct = answer === question.answer;
  const alreadyRecorded = quizResults.some(r => r.id === question.id);

  if (!alreadyRecorded) {
    quizResults.push({
      id: question.id,
      correct,
      answer,
      expected: question.answer
    });
  }

  buttons.forEach(button => {
    button.disabled = false;

  button.addEventListener("click", () => {
    const smartAudio = document.getElementById("afaq-smart-audio-panel");
    if (smartAudio) {
      smartAudio.remove();window.AfaqAdult.lock();
      return;
    }

    const audioEditor = document.getElementById("afaq-audio-library");
    if (audioEditor) {
      audioEditor.remove();window.AfaqAdult.lock();
      return;
    }

    const area = document.getElementById("activityArea");
    if (!area) {
      stages.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (area.querySelector("#answerOptions, #nextQuestion")) {
      openLetterActivity();
      return;
    }

    if (area.querySelector("#startPractice, #startAssessment")) {
      renderLetterPicker();
      return;
    }

    area.remove();
    stages.scrollIntoView({ behavior: "smooth" });
  });

    if (button.textContent === question.answer) {
      button.style.setProperty("background", "#bbf7d0", "important");
      button.style.setProperty("border-color", "#15803d", "important");
      button.style.setProperty("color", "#14532d", "important");
      button.textContent = "\u2705 " + button.textContent;
    } else if (button === selectedButton) {
      button.style.setProperty("background", "#fecaca", "important");
      button.style.setProperty("border-color", "#dc2626", "important");
      button.style.setProperty("color", "#7f1d1d", "important");
      button.textContent = "\u274c " + button.textContent;
    }
  });

  feedback.textContent = correct
    ? "\u2705 \u0625\u062c\u0627\u0628\u0629 \u0635\u062d\u064a\u062d\u0629!"
    : "\u274c \u0627\u0644\u0625\u062c\u0627\u0628\u0629 \u0627\u0644\u0635\u062d\u064a\u062d\u0629 \u0628\u0627\u0644\u0623\u062e\u0636\u0631.";

  window.SeviatEffects?.play(correct ? "correct" : "wrong");

  if (correct && quizMode !== "assessment" &&
      !answeredQuestions.includes(question.id)) {
    answeredQuestions.push(question.id);
    score += 10;
    legacyProgressPending = true;
    saveLegacyProgressFromUI();
  }

  const points = document.getElementById("gameScore");
  if (points) {
    points.textContent = legacyPointsLabel();
  }

  next.disabled = true;

  autoNextTimer = setTimeout(() => {
    autoNextTimer = null;
    if (document.getElementById("nextQuestion") === next) {
      advanceQuiz();
    }
  }, 2000);
}

function openStage(stage) {
  if (stage === 'writing') { window.openIndependentWriting(); return; }
  selectedStage = stage;

  if (stage === "preparation") {
    window.openPreparation();
    return;
  }

  if (stage === "letters") {
    renderLetterPicker();
    return;
  }

  if (stage === "games") {
    renderLetterPicker();
    return;
  }

  if (stage === "movements") {
    const movementSkills = [
      "short-vowels",
      "sukoon",
      "long-vowels"
    ];

    const available = questionsData.questions.filter(
      question => movementSkills.includes(question.skill)
    );

    if (!available.length) {
      showMessage("الحركات والمدود", "لا توجد أسئلة لهذه المرحلة حتى الآن.");
      return;
    }

    currentLetter = available[0].letter;
    currentQuestions = shuffleArray(available);
    currentQuestionIndex = 0;    quizResults = [];
    renderQuiz();
    return;
  }

  if (stage === "combination") {
    renderLetterPicker();
    return;
  }

  const stageMessages = {
    preparation: "سنضيف أنشطة التهيئة والتمييز والتتبع في المرحلة القادمة.",
    combination: "سنضيف أنشطة تركيب المقاطع والكلمات بعد تجهيز محتواها.",
    writing: "سنضيف سبورة تفاعلية للتدرب على الكتابة والتتبع."
  };

  showMessage(letterNames[stage], stageMessages[stage] || "سيتم تجهيز هذه المرحلة.");
}

async function initializeApp() {
  if (!loadProgress()) showLegacyProgressWarning();

  try {
    const [curriculumResponse, skillsResponse, questionsResponse] =
      await Promise.all([
        fetch(DATA_FILES.curriculum),
        fetch(DATA_FILES.skills),
        fetch(DATA_FILES.questions)
      ]);

    if (!curriculumResponse.ok || !skillsResponse.ok || !questionsResponse.ok) {
      throw new Error("تعذر تحميل أحد ملفات البيانات.");
    }

    [curriculumData, skillsData, questionsData] = await Promise.all([
      curriculumResponse.json(),
      skillsResponse.json(),
      questionsResponse.json()
    ]);


    // UNIT1_REVIEWED_LOADER: wait for all sources before enabling any activity.
    const sourceFiles = ["data/group1-reading-extra.json", "data/meem-questions.json", "data/group1-extra.json", "data/unit1-reviewed.json"];
    const loaded = await Promise.all(sourceFiles.map(async file => {
      const response = await fetch(file);
      if (!response.ok) throw new Error("تعذر تحميل " + file);
      return response.json();
    }));
    const legacy = [...questionsData.questions, ...loaded.slice(0, 3).flatMap(d => d.questions), ...window.SeviatGroup1.questions];
    window.Unit1Learning.configure(loaded[3], legacy);
    questionsData = window.Unit1Rules.merge(loaded[3].questions, legacy);
    window.Unit1Learning.ready = true;
    window.dispatchEvent(new Event('seviat-curriculum-ready'));

    updateProgressDisplay();

    document.querySelectorAll(".stage-card").forEach(card => {
      card.addEventListener("click", () => {
        openStage(card.dataset.stage);
      });
    });

    startButton.addEventListener("click", () => {
      document.getElementById("stages").scrollIntoView({
        behavior: "smooth"
      });
    });

    soundToggle.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
    window.SeviatEffects?.setEnabled(soundEnabled);

      soundToggle.textContent = soundEnabled ? "🔊 الصوت" : "🔇 الصوت";

      if (!soundEnabled && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    });

    console.log("آفاق جاهزة", {
      units: curriculumData.curriculum.units.length,
      skills: skillsData.letterLearningSequence.length,
      questions: questionsData.questions.length
    });

  } catch (error) {
    if(window.Unit1Learning)window.Unit1Learning.ready=false;
    window.dispatchEvent(new Event('seviat-curriculum-error'));
    console.error(error);
    showMessage(
      "تعذر تحميل المنهج",
      "تأكد من تشغيل التطبيق عبر الخادم المحلي، ومن وجود ملفات البيانات داخل مجلد data."
    );
  }
}

document.addEventListener("DOMContentLoaded", initializeApp, { once: true });


