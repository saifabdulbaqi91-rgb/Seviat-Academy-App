(function () {
  "use strict";

  if (window.AfaqSmartAudioUI) return;

  const state = {
    entries: [],
    saved: new Set(),
    search: "",
    letter: "",
    category: "",
    status: ""
  };

  function el(tag, text) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function recorded(item) {
    return state.saved.has("text:" + item.text.normalize("NFC"));
  }

  function valid(item) {
    return /[\u0621-\u064A]/.test(item.text);
  }

  function renderList(container) {
    container.replaceChildren();

    const filtered = state.entries.filter(item =>
      valid(item) &&
      (!state.search || item.text.includes(state.search)) &&
      (!state.letter || item.letters.includes(state.letter)) &&
      (!state.category || item.category === state.category) &&
      (!state.status || (recorded(item) ? "recorded" : "missing") === state.status)
    );

    const summary = el("p", "العناصر المعروضة: " + filtered.length);
    container.appendChild(summary);

    filtered.slice(0, 100).forEach(item => {
      const row = el("div");
      row.style.cssText =
        "display:flex;gap:10px;align-items:center;justify-content:space-between;" +
        "padding:10px;border-bottom:1px solid #ddd;flex-wrap:wrap";

      const info = el("span", item.text);
      info.style.flex = "1";

      const status = el("small", recorded(item) ? "مسجل" : "غير مسجل");

      const play = el("button", "استماع");
      play.type = "button";
      play.disabled = !recorded(item);
      play.onclick = () => window.AfaqAudioLibrary.play(item.text);

      const recordButton = el("button", "سجل");
      recordButton.type = "button";
      recordButton.onclick = () => {
        window.AfaqAudioLibrary.mount();

        const input = document.querySelector(
          '#afaq-audio-library input[aria-label="النص المطلوب تسجيله"]'
        );

        if (!input) {
          alert("تعذر فتح مسجل الصوت");
          return;
        }

        input.value = item.text;
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.focus();
      };

      row.append(info, status, play, recordButton);
      container.appendChild(row);
    });

    if (filtered.length > 100) {
      container.appendChild(
        el("p", "تعرض أول 100 نتيجة. استخدم البحث لتضييق النتائج.")
      );
    }
  }

  async function open() {window.AfaqAdult.assert();
    const result = await window.AfaqAudioCatalog.load();
    state.entries = result.entries;
    state.saved = new Set(await window.AfaqAudioLibrary.listIds());

    window.AfaqAdult.assert();
    document.getElementById("afaq-smart-audio-panel")?.remove();

    const panel = el("section");
    panel.id = "afaq-smart-audio-panel";
    panel.dir = "rtl";
    panel.style.cssText =
      "position:fixed;inset:5%;z-index:99999;background:white;color:#173b70;" +
      "border:2px solid #173b70;border-radius:16px;padding:20px;" +
      "overflow:auto;font-family:Tajawal,Arial,sans-serif;" +
      "box-shadow:0 10px 40px #0004";

    const heading = el("h2", "آفاق | المكتبة الصوتية الذكية");
    const close = el("button", "إغلاق");
    close.onclick = () => {panel.remove();window.AfaqAdult.lock();};

    const controls = el("div");
    controls.style.cssText =
      "display:flex;gap:10px;flex-wrap:wrap;margin:15px 0";

    const search = el("input");
    search.placeholder = "ابحث عن حرف أو كلمة أو عبارة";

    function makeSelect(placeholder, values) {
      const select = el("select");
      select.appendChild(new Option(placeholder, ""));
      values.forEach(value => select.appendChild(new Option(value, value)));
      return select;
    }

    const letters = [...new Set(state.entries.flatMap(x => x.letters))]
      .filter(Boolean).sort();

    const categories = [...new Set(state.entries.map(x => x.category))].sort();

    const letter = makeSelect("جميع الحروف", letters);
    const category = makeSelect("جميع التصنيفات", categories);

    const status = el("select");
    [
      ["جميع الحالات", ""],
      ["مسجل", "recorded"],
      ["غير مسجل", "missing"]
    ].forEach(([label, value]) =>
      status.appendChild(new Option(label, value))
    );

    const list = el("div");

    search.oninput = () => {
      state.search = search.value.trim();
      renderList(list);
    };

    letter.onchange = () => {
      state.letter = letter.value;
      renderList(list);
    };

    category.onchange = () => {
      state.category = category.value;
      renderList(list);
    };

    status.onchange = () => {
      state.status = status.value;
      renderList(list);
    };

    controls.append(search, letter, category, status);
    const management = el("button", "إدارة التسجيلات والنسخ الاحتياطي");
management.type = "button";
management.onclick = () => {
  window.AfaqAudioLibrary.mount();
  const oldPanel = document.getElementById("afaq-audio-library");
  if (oldPanel) {
    oldPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};
panel.append(heading, close, management, controls, list);
    document.body.appendChild(panel);

    renderList(list);
  }

  async function refresh() { state.saved = new Set(await window.AfaqAudioLibrary.listIds()); const panel = document.getElementById("afaq-smart-audio-panel"); if (panel) { const list = panel.lastElementChild; if (list) renderList(list); } } window.AfaqSmartAudioUI = { open, refresh };
})();
