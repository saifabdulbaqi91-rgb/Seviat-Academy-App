(function () {
  window.openWritingBoard = function (letter = "م") {
    if (typeof createActivityArea !== "function") {
      alert("تعذر فتح سبورة الكتابة.");
      return;
    }

    const area = createActivityArea();
    area.innerHTML = "";

    const shapes = [
      { name: "منفصل", value: letter },
      { name: "أول الكلمة", value: letter + "\u0640" },
      { name: "وسط الكلمة", value: "\u0640" + letter + "\u0640" },
      { name: "آخر الكلمة متصل", value: "\u0640" + letter }
    ];

    // UNIT1_NON_JOINING
    if (["د", "ر", "ا", "أ", "و", "ز", "ذ"].includes(letter)) shapes.splice(1, 2);

    let currentShape = shapes[0];
    let drawing = false;
    let hasDrawn = false;

    const title = document.createElement("h2");
    title.textContent = "✏️ أتعلم كتابة حرف " + letter;

    const instructions = document.createElement("p");
    instructions.textContent =
      "اختر شكل الحرف وتتبعه بإصبعك أو بالماوس ثم اكتبه دون مساعدة.";

    const selector = document.createElement("div");
    selector.style.cssText =
      "display:grid;grid-template-columns:repeat(2,minmax(0,1fr));" +
      "gap:12px;margin:20px 0;";

    const board = document.createElement("div");
    board.style.cssText =
      "position:relative;width:100%;max-width:650px;height:320px;" +
      "margin:20px auto;background:white;border:3px solid #7bc6e8;" +
      "border-radius:20px;overflow:hidden;touch-action:none;";

    const guide = document.createElement("div");
    guide.style.cssText =
      "position:absolute;inset:0;display:flex;align-items:center;" +
      "justify-content:center;font-size:150px;color:#d5e5f0;" +
      "font-family:Arial,sans-serif;direction:rtl;" +
      "pointer-events:none;user-select:none;";

    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;" +
      "touch-action:none;cursor:crosshair;";

    board.append(guide, canvas);

    const controls = document.createElement("div");
    controls.style.cssText =
      "display:flex;justify-content:center;gap:12px;flex-wrap:wrap;";

    const clearButton = document.createElement("button");
    clearButton.textContent = "🧽 امسح وأعد المحاولة";
    clearButton.className = "primary-button";

    const guideButton = document.createElement("button");
    guideButton.textContent = "👁️ إخفاء الحرف";
    guideButton.className = "sound-button";

    const doneButton = document.createElement("button");
    doneButton.textContent = "⭐ انتهيت من الكتابة";
    doneButton.className = "primary-button";

    const feedback = document.createElement("p");
    feedback.style.cssText =
      "text-align:center;font-size:20px;font-weight:bold;min-height:35px;";

    controls.append(clearButton, guideButton, doneButton);
    area.append(title, instructions, selector, board, controls, feedback);

    const ctx = canvas.getContext("2d");

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;

      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1769aa";
    }

    function clearDrawing() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawn = false;
      feedback.textContent = "";
    }

    function selectShape(shape) {
      currentShape = shape;
      guide.textContent = shape.value;
      guide.style.display = "flex";
      guideButton.textContent = "👁️ إخفاء الحرف";

      clearDrawing();

      selector.querySelectorAll("button").forEach(button => {
        button.style.background =
          button.dataset.shape === shape.name
            ? "#b9e8ff"
            : "#fff3e7";
      });

      window.SeviatEffects?.play("select");
    }

    shapes.forEach(shape => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.shape = shape.name;
      button.className = "primary-button";
      button.style.cssText =
        "padding:14px 8px;min-height:95px;font-family:inherit;";

      const name = document.createElement("div");
      name.textContent = shape.name;
      name.style.fontSize = "15px";

      const symbol = document.createElement("div");
      symbol.textContent = shape.value;
      symbol.style.cssText =
        "font-size:38px;direction:rtl;margin-top:6px;";

      button.append(name, symbol);
      button.addEventListener("click", () => selectShape(shape));
      selector.appendChild(button);
    });

    resizeCanvas();
    selectShape(shapes[0]);

    function getPoint(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }

    canvas.addEventListener("pointerdown", event => {
      drawing = true;
      hasDrawn = true;
      canvas.setPointerCapture(event.pointerId);

      const point = getPoint(event);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + 0.1, point.y + 0.1);
      ctx.stroke();
    });

    canvas.addEventListener("pointermove", event => {
      if (!drawing) return;

      const point = getPoint(event);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    });

    canvas.addEventListener("pointerup", () => {
      drawing = false;
    });

    canvas.addEventListener("pointercancel", () => {
      drawing = false;
    });

    clearButton.addEventListener("click", () => {
      clearDrawing();
      window.SeviatEffects?.play("retry");
    });

    guideButton.addEventListener("click", () => {
      const hidden = guide.style.display === "none";
      guide.style.display = hidden ? "flex" : "none";

      guideButton.textContent = hidden
        ? "👁️ إخفاء الحرف"
        : "👁️ إظهار الحرف";
    });

    doneButton.addEventListener("click", () => {
      if (!hasDrawn) {
        feedback.textContent = "ارسم الحرف أولا يا بطل!";
        window.SeviatEffects?.play("wrong");
        return;
      }

      feedback.textContent =
        "🌟 رائع يا بطل! اعرض كتابتك على المعلم.";
      window.SeviatEffects?.play("star");
    });

    area.scrollIntoView({ behavior: "smooth" });
  };
})();
