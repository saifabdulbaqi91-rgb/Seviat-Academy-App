(function () {
  "use strict";

  const SHAPES = ["●", "■", "▲", "★", "◆", "♥"];
  const LEVELS = 5;
  const STORAGE = "seviat-extra-games-v2";
  const GAMES = [
    { id: "attention", title: "🎯 الانتباه والتركيز" },
    { id: "observation", title: "⚡ سرعة الملاحظة" },
    { id: "sequence", title: "🧠 التسلسل والذاكرة" }
  ];

  let activeTimer = null;
  let runId = 0;

  function clearGameTimer() {
    if (activeTimer !== null) clearTimeout(activeTimer);
    activeTimer = null;
  }

  function random(max) {
    return Math.floor(Math.random() * max);
  }

  function shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = random(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function getProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE)) || {};
    } catch {
      return {};
    }
  }

  function unlocked(id) {
    return Math.min(LEVELS, Math.max(1, getProgress()[id] || 1));
  }

  function unlock(id, level) {
    const progress = getProgress();
    progress[id] = Math.max(unlocked(id), Math.min(LEVELS, level + 1));
    localStorage.setItem(STORAGE, JSON.stringify(progress));
  }

  function area() {
    return createActivityArea();
  }

  function button(label, handler, className = "primary-button") {
    const b = document.createElement("button");
    b.type = "button";
    b.className = className;
    b.textContent = label;
    b.style.margin = "6px";
    b.onclick = handler;
    return b;
  }

  function feedback(success) {
    window.SeviatEffects?.play(success ? "correct" : "wrong");
  }

  function openLevels(id) {
    runId++;
    clearGameTimer();

    const game = GAMES.find(g => g.id === id);
    if (!game) return;

    const root = area();
    root.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = game.title;
    root.appendChild(heading);

    const description = document.createElement("p");
    description.textContent =
      "ابدأ بالتدريب ثم اجتز اختبار الإتقان لفتح المستوى التالي.";
    root.appendChild(description);

    for (let level = 1; level <= LEVELS; level++) {
      const row = document.createElement("div");
      row.style.cssText =
        "background:#eef6ff;padding:12px;border-radius:14px;margin:12px 0";

      const title = document.createElement("h3");
      title.textContent = "المستوى " + level;
      row.appendChild(title);

      ["practice", "assessment"].forEach(mode => {
        const b = button(
          mode === "practice" ? "التدريب" : "اختبار الإتقان",
          () => startGame(id, level, mode),
          mode === "practice" ? "primary-button" : "sound-button"
        );
        b.disabled = level > unlocked(id);
        row.appendChild(b);
      });

      root.appendChild(row);
    }

    root.appendChild(
      button("العودة إلى التهيئة", () => window.openPreparation(), "sound-button")
    );
  }

  function makeQuestion(id, level) {
    if (id === "attention") {
      const common = random(SHAPES.length);
      let different = random(SHAPES.length - 1);
      if (different >= common) different++;

      const count = 5 + level * 3;
      const position = random(count);

      return {
        instruction: "ابحث عن الشكل المختلف وسط الأشكال المتشابهة.",
        items: Array.from(
          { length: count },
          (_, i) => i === position ? SHAPES[different] : SHAPES[common]
        ),
        answer: position
      };
    }

    if (id === "observation") {
      const targetIndex = random(SHAPES.length);
      const target = SHAPES[targetIndex];
      const count = 7 + level * 4;
      const position = random(count);

      return {
        instruction: "ابحث عن الشكل المطلوب بأسرع وقت مع الحفاظ على الدقة.",
        target,
        items: Array.from({ length: count }, (_, i) => {
          if (i === position) return target;
          const choices = SHAPES.filter(s => s !== target);
          return choices[random(choices.length)];
        }),
        answer: position
      };
    }

    const length = Math.min(5, level + 1);
    const sequence = Array.from(
      { length },
      () => SHAPES[random(4)]
    );

    return {
      instruction: "احفظ ترتيب الأشكال ثم أعد اختيارها بعد اختفائها.",
      sequence
    };
  }

  function startGame(id, level, mode) {
    const currentRun = ++runId;
    clearGameTimer();

    const total = mode === "assessment" ? 5 : 3;
    let round = 0;
    let correct = 0;
    let totalReaction = 0;
    let reactionCount = 0;

    function nextRound() {
      if (currentRun !== runId) return;
      clearGameTimer();

      if (round >= total) {
        finish();
        return;
      }

      const q = makeQuestion(id, level);
      const root = area();
      root.replaceChildren();

      const heading = document.createElement("h2");
      heading.textContent = GAMES.find(g => g.id === id).title;
      root.appendChild(heading);

      const progress = document.createElement("p");
      progress.textContent =
        `المستوى ${level} — ${mode === "practice" ? "تدريب" : "اختبار"} — ${round + 1}/${total}`;
      root.appendChild(progress);

      const instruction = document.createElement("h3");
      instruction.textContent = q.instruction;
      root.appendChild(instruction);

      const content = document.createElement("div");
      content.style.cssText =
        "display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:20px 0";
      root.appendChild(content);

      const status = document.createElement("p");
      status.setAttribute("aria-live", "polite");
      root.appendChild(status);

      const next = button("التالي", () => {
        round++;
        nextRound();
      });
      next.disabled = true;

      let finished = false;
      let startedAt = 0;

      function complete(success) {
        if (finished) return;

        if (!success && mode === "practice") {
          status.textContent = "حاول مرة أخرى.";
          feedback(false);
          return;
        }

        finished = true;
        if (success) correct++;
        feedback(success);

        status.textContent = success
          ? "أحسنت! إجابة صحيحة."
          : "الإجابة غير صحيحة. جرب التدريب مرة أخرى.";

        content.querySelectorAll("button").forEach(b => b.disabled = true);
        next.disabled = false;
      }

      if (id === "sequence") {
        const display = document.createElement("div");
        display.style.cssText =
          "font-size:48px;direction:ltr;text-align:center;width:100%";
        display.textContent = q.sequence.join("  ");
        content.appendChild(display);

        const chosen = [];
        const seconds = Math.max(2, 6 - level);

        status.textContent = `احفظ الأشكال خلال ${seconds} ثوان`;

        activeTimer = setTimeout(() => {
          if (currentRun !== runId) return;

          content.replaceChildren();
          status.textContent = "أعد اختيار الأشكال بالترتيب.";

          SHAPES.slice(0, 4).forEach(shape => {
            const b = button(shape, () => {
              if (finished) return;

              const expected = q.sequence[chosen.length];

              if (shape !== expected) {
                if (mode === "practice") {
                  chosen.length = 0;
                  status.textContent = "ترتيب غير صحيح ابدأ من أول السلسلة.";
                  feedback(false);
                } else {
                  complete(false);
                }
                return;
              }

              chosen.push(shape);
              status.textContent = `اخترت ${chosen.length} من ${q.sequence.length}`;

              if (chosen.length === q.sequence.length) complete(true);
            });

            b.style.fontSize = "35px";
            content.appendChild(b);
          });
        }, seconds * 1000);
      } else {
        if (id === "observation") {
          const target = document.createElement("p");
          target.textContent = "الشكل المطلوب: " + q.target;
          target.style.cssText = "font-size:30px;font-weight:bold";
          root.insertBefore(target, content);
        }

        startedAt = performance.now();

        q.items.forEach((shape, index) => {
          const b = button(shape, () => {
            if (finished) return;

            const success = index === q.answer;

            if (success && id === "observation") {
              totalReaction += performance.now() - startedAt;
              reactionCount++;
            }

            if (!success && mode === "practice") {
              b.disabled = true;
            }

            complete(success);
          });

          b.style.cssText =
            "font-size:35px;min-width:55px;min-height:60px;margin:3px";
          content.appendChild(b);
        });
      }

      root.appendChild(next);
      root.appendChild(
        button("العودة إلى المستويات", () => openLevels(id), "sound-button")
      );
    }

    function finish() {
      const passed = mode === "assessment" && correct >= 4;

      if (passed) unlock(id, level);

      const root = area();
      root.replaceChildren();

      const title = document.createElement("h2");
      title.textContent = mode === "assessment"
        ? "نتيجة اختبار الإتقان"
        : "انتهى التدريب";
      root.appendChild(title);

      const result = document.createElement("p");
      result.textContent = `الإجابات الصحيحة: ${correct} من ${total}`;
      root.appendChild(result);

      if (id === "observation" && reactionCount) {
        const speed = document.createElement("p");
        speed.textContent =
          "متوسط زمن الإجابات الصحيحة: " +
          (totalReaction / reactionCount / 1000).toFixed(2) +
          " ثانية";
        root.appendChild(speed);
      }

      const message = document.createElement("p");
      message.textContent = passed
        ? "أحسنت! اجتزت المستوى."
        : mode === "assessment"
          ? "تحتاج إلى 4 إجابات صحيحة من 5 لاجتياز المستوى."
          : "يمكنك إعادة التدريب أو تجربة اختبار الإتقان.";
      root.appendChild(message);

      root.appendChild(
        button("إعادة النشاط", () => startGame(id, level, mode))
      );
      root.appendChild(
        button("العودة إلى المستويات", () => openLevels(id), "sound-button")
      );
    }

    nextRound();
  }

  function addGames() {
    const original = window.openPreparation;
    if (typeof original !== "function") {
      console.warn("Seviat: openPreparation is unavailable");
      return;
    }

    window.openPreparation = function (...args) {
      const result = original.apply(this, args);
      const root = document.getElementById("activityArea");
      if (!root) return result;

      GAMES.forEach(game => {
        if (document.getElementById("game-" + game.id)) return;

        const b = button(game.title, () => openLevels(game.id));
        b.id = "game-" + game.id;
        root.appendChild(b);
      });

      return result;
    };
  }

  window.SeviatExtraGames = { openLevels, startGame };
  addGames();
})();
