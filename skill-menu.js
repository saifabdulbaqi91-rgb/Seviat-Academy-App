const SEVIAT_SKILLS = [
  { id: "letter-shape", name: "التعرف على الحرف" },
  { id: "letter-sound", name: "اسم الحرف وصوته" },
  { id: "short-vowels", name: "الفتحة والكسرة والضمة" },
  { id: "sukoon", name: "السكون" },
  { id: "long-vowels", name: "المدود" },
  { id: "letter-positions", name: "مواضع الحرف" },
  { id: "sound-analysis", name: "تحليل الأصوات" },
  { id: "syllable-building", name: "تركيب المقاطع" },
  { id: "word-reading", name: "قراءة الكلمات" },
  { id: "word-builder-game", name: "لعبة تركيب الكلمات (تجريبية)" },
  { id: "letter-writing", name: "كتابة الحرف" }
];

function openLetterPractice() {
  const area = createActivityArea();
  const questions = questionsData.questions.filter(
    q => q.letter === currentLetter
  );

  area.innerHTML = "";

  const title = document.createElement("h2");
  title.textContent = "مهارات حرف " + currentLetter;
  area.appendChild(title);

  const description = document.createElement("p");
  description.textContent =
    "اختر المهارة ثم يقرأ المعلم السؤال ويجيب الطفل.";
  area.appendChild(description);

  const grid = document.createElement("div");
  grid.style.cssText =
    "display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:20px 0";

  SEVIAT_SKILLS.forEach(skill => {
    const available = questions.filter(q => q.skill === skill.id);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary-button";
    button.style.cssText =
      "padding:18px 12px;font-size:17px;min-height:85px;";

    button.textContent =
      skill.name + " (" + available.length + " أسئلة)";

    button.disabled =
      available.length === 0 && skill.id !== "letter-writing" && skill.id !== "word-builder-game";

    button.addEventListener("click", () => {
      if (skill.id === "word-builder-game") {
        window.openWordBuilder(currentLetter);
        return;
      }

      if (skill.id === "letter-writing") {
        window.openWritingBoard(currentLetter);
        return;
      }

      currentQuestions = shuffleArray(available);
      currentQuestionIndex = 0;
      renderQuiz();
    });

    grid.appendChild(button);
  });

  area.appendChild(grid);

  const back = document.createElement("button");
  back.className = "sound-button";
  back.textContent = "العودة إلى الحروف";
  back.addEventListener("click", renderLetterPicker);
  area.appendChild(back);

  area.scrollIntoView({ behavior: "smooth" });
}
