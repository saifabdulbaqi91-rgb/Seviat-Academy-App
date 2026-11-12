(function () {
  "use strict";

  const activities = [
    {
      prompt: "اختر الشكل المطابق للدائرة",
      target: "●",
      options: ["■", "●", "▲"],
      answer: "●"
    },
    {
      prompt: "اختر الشكل المطابق للمثلث",
      target: "▲",
      options: ["▲", "●", "■"],
      answer: "▲"
    },
    {
      prompt: "اختر الشكل المطابق للمربع",
      target: "■",
      options: ["●", "■", "▲"],
      answer: "■"
    },
    {
      prompt: "اختر الشكل المطابق للنجمة",
      target: "★",
      options: ["◆", "★", "●"],
      answer: "★"
    },
    {
      prompt: "اختر الشكل المطابق للمعين",
      target: "◆",
      options: ["■", "▲", "◆"],
      answer: "◆"
    }
  ];

  function openPreparation() {
    if(window.SeviatAccessGuard&&!window.SeviatAccessGuard.coarseAllowed('preparation'))return;
    const area = createActivityArea();

    area.innerHTML = `
      <h2>🌟 التهيئة والاستعداد</h2>
      <p>اختر النشاط الذي تريد التدرب عليه.</p>
      <button id="visualTraining" class="primary-button">
        👁️ التمييز البصري
      </button>
      <button id="memoryTraining" class="primary-button">
  🧠 الذاكرة البصرية
</button>
<button id="auditoryTraining" class="primary-button">
  🎧 التمييز السمعي
</button>
<button id="preparationBack" class="sound-button">
        العودة إلى المراحل
      </button>
    `;

    document.getElementById("visualTraining").onclick =
      () => window.openVisualLevels();

    document.getElementById("memoryTraining").onclick =
      () => window.openMemoryLevels();

    document.getElementById("auditoryTraining").onclick =
      () => window.openAuditoryLevels();
    document.getElementById("preparationBack").onclick = () => {
      area.remove();
      document.getElementById("stages").scrollIntoView({
        behavior: "smooth"
      });
    };

    area.scrollIntoView({ behavior: "smooth" });
  }

  function startVisualTraining() {
    if(window.SeviatAccessGuard&&!window.SeviatAccessGuard.coarseAllowed('preparation'))return;
    let index = 0;
    let mistakes = 0;

    function render() {
    if(window.SeviatAccessGuard&&!window.SeviatAccessGuard.coarseAllowed('preparation'))return;
      const area = createActivityArea();

      if (index >= activities.length) {
        area.innerHTML = `
          <h2>🎉 انتهى تدريب التمييز البصري</h2>
          <p>أكملت ${activities.length} تدريبات.</p>
          <p>عدد المحاولات الخاطئة: ${mistakes}</p>
          <p>هذا تدريب تعليمي وليس اختبار إتقان.</p>
          <button id="repeatVisual" class="primary-button">
            إعادة التدريب
          </button>
          <button id="backPreparation" class="sound-button">
            العودة إلى التهيئة
          </button>
        `;

        document.getElementById("repeatVisual").onclick =
          startVisualTraining;

        document.getElementById("backPreparation").onclick =
          openPreparation;

        return;
      }

      const item = activities[index];

      area.innerHTML = `
        <h2>👁️ التمييز البصري</h2>
        <p>التدريب ${index + 1} من ${activities.length}</p>
        <h3>${item.prompt}</h3>
        <div style="font-size:90px;text-align:center;margin:20px">
          ${item.target}
        </div>
        <div id="visualOptions"
          style="display:flex;justify-content:center;gap:15px;flex-wrap:wrap">
        </div>
        <p id="visualFeedback"
          style="text-align:center;font-size:22px;min-height:40px"
          aria-live="polite"></p>
        <button id="visualNext" class="primary-button" disabled>
          التالي
        </button>
        <button id="visualBack" class="sound-button">
          العودة إلى التهيئة
        </button>
      `;

      const options = document.getElementById("visualOptions");
      const feedback = document.getElementById("visualFeedback");
      const next = document.getElementById("visualNext");

      item.options.forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = option;
        button.style.cssText =
          "font-size:65px;padding:15px 30px;border-radius:18px;" +
          "border:2px solid #2878cf;background:#eaf4ff;cursor:pointer";

        button.onclick = () => {
          if (option === item.answer) {
            feedback.textContent = "أحسنت! إجابة صحيحة.";
            feedback.style.color = "#15803d";
            window.SeviatEffects?.play("correct");
            options.querySelectorAll("button").forEach(b => {
              b.disabled = true;
            });
            next.disabled = false;
          } else {
            mistakes++;
            feedback.textContent = "حاول مرة أخرى.";
            feedback.style.color = "#b91c1c";
            window.SeviatEffects?.play("wrong");
            button.disabled = true;
          }
        };

        options.appendChild(button);
      });

      next.onclick = () => {
        index++;
        render();
      };

      document.getElementById("visualBack").onclick =
        openPreparation;

      area.scrollIntoView({ behavior: "smooth" });
    }

    render();
  }

  window.openPreparation = openPreparation;
})();
