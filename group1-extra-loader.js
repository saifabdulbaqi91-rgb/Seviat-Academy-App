(function () {
  "use strict";

  async function installExtraQuestions() {
    try {
      const response = await fetch("data/group1-extra.json");

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const data = await response.json();
      const extra = Array.isArray(data) ? data : data.questions;

      if (!Array.isArray(extra)) {
        throw new Error("Invalid questions format");
      }

      let attempts = 0;

      const timer = setInterval(() => {
        attempts++;

        if (
          typeof questionsData === "undefined" ||
          !questionsData ||
          !Array.isArray(questionsData.questions)
        ) {
          if (attempts >= 30) {
            clearInterval(timer);
            console.error("SEVIAT: Questions engine unavailable");
          }
          return;
        }

        clearInterval(timer);

        window.SeviatGroup1?.install?.();
        const existing = new Set(
          questionsData.questions.map(q => q.id)
        );

        let added = 0;

        extra.forEach(q => {
          if (!q.id || existing.has(q.id)) return;

          questionsData.questions.push(q);
          existing.add(q.id);
          added++;
        });

        console.log(
          "SEVIAT EXTRA QUESTIONS:",
          added,
          "added; total:",
          questionsData.questions.length
        );
      }, 200);

    } catch (error) {
      console.error("SEVIAT EXTRA QUESTIONS ERROR:", error);
    }
  }

  installExtraQuestions();
})();
