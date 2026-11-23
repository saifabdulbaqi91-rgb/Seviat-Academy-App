(function () {
  "use strict";

  if (window.AfaqSmartAudioUI) return;

  const state = {
    entries: [],
    saved: new Set(),
    search: "",
    letter: "",
    category: "",
    status: "",
    scope: "meem", inventory: null, statuses: new Map(), refreshEpoch: 0
  };

  function el(tag, text) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function recorded(item) {
    return item.inventory?state.statuses.get(item.id)?.state==="approved":state.saved.has(window.AfaqAudioLibrary.keyForText(item.text));
  }

  function valid(item) {
    return /[ء-ي]/.test(item.text);
  }

  function renderList(container) {
    container.replaceChildren();

    const filtered = state.entries.filter(item =>
      valid(item) &&
      (!state.search || item.text.includes(state.search)||item.id.includes(state.search)) &&
      (!state.letter || item.letters.includes(state.letter)) &&
      (!state.category || item.category === state.category) &&
      (!state.status || (item.inventory?state.statuses.get(item.id)?.state||"unknown":recorded(item)?"approved":"missing") === state.status)
    );

    const summary = el("p", "العناصر المعروضة: " + filtered.length);
    container.appendChild(summary);

    filtered.slice(0, state.visibleCount || 25).forEach(item => {
      const row = el("div");
      row.style.cssText =
        "display:flex;gap:10px;align-items:center;justify-content:space-between;" +
        "padding:10px;border-bottom:1px solid #ddd;flex-wrap:wrap";

      const info = el("span", item.text);
      info.style.flex = "1";

      const status = el('small',recorded(item)?'تسجيل معتمد':item.inventory&&state.statuses.get(item.id)?.state!=='missing'?'تعذر الفحص':'يحتاج تسجيل');
      row.dataset.recordingId=item.id;
      if(item.inventory){const id=el('code',item.id);id.style.direction='ltr';info.append(el('br'),id);const links=el('details');links.append(el('summary','الأنشطة المرتبطة'));for(const runtimeId of item.inventory.runtimeIds)links.append(el('p',runtimeId));info.append(links);}

      const play = el("button", "\u0627\u0633\u062a\u0645\u0627\u0639");
      play.type = "button";
      play.disabled = false;
      play.onclick = async () => {
        try {
          play.disabled = true;
          status.textContent = '';
          const speech = window.AfaqSpeech;
          if (item.inventory) {
            const saved = await window.AfaqAudioManagement.approvedInventoryRecording(item.inventory);
            if (saved?.blob) {
              const url = URL.createObjectURL(saved.blob);
              const audio = new Audio(url);
              try {
                await new Promise((resolve, reject) => {
                  audio.onended = resolve;
                  audio.onerror = () => reject(new Error('Audio playback failed'));
                  audio.play().catch(reject);
                });
              } finally {
                audio.pause();
                URL.revokeObjectURL(url);
              }
            } else {
              const overrides = JSON.parse(
                localStorage.getItem("afaq-audio-voice-overrides-v1") || "{}"
              );

              const approvedVoice = overrides[item.text];

              if (approvedVoice?.approved === true) {
                const played = await window.AfaqAudioLibrary.play(item.text);
                if (!played) throw new Error("Approved voice unavailable");
                return;
              }

              const ids = item.inventory.runtimeIds || [];
              const id = ids.find(x => speech?.entry(x));
              if (!id) {
                const fallback = await window.AfaqAudioLibrary.play(item.text);
                if (!fallback) throw new Error('Automatic speech unavailable');
                return;
              }
              const result = await speech.speak(id);
              if (!result?.ok) {
                const fallback = await window.AfaqAudioLibrary.play(item.text);
                if (!fallback) throw new Error('Automatic speech unavailable');
              }
            }
          } else {
            await window.AfaqAudioLibrary.play(item.text);
          }
        } catch (error) {
          status.textContent = error.message;
        } finally {
          play.disabled = false;
        }
      };

      const recordButton = el("button", "\u0625\u0639\u0627\u062f\u0629 \u062a\u0633\u062c\u064a\u0644");
      recordButton.type = "button";
      recordButton.onclick = async () => {
        try {
          window.AfaqAudioLibrary.mount();
          const recorder = document.getElementById('afaq-audio-library');
          if (!recorder) throw Error('Recorder unavailable');
          if (item.inventory) {
            await window.AfaqAudioLibrary.selectInventory(item.inventory);
          } else {
            await window.AfaqAudioLibrary.selectText(item.text);
          }
          const panel = document.getElementById('afaq-smart-audio-panel');
          if (panel) panel.style.display = 'none';
          recorder.style.display = '';
          recorder.style.zIndex = '100001';
          recorder.scrollTop = 0;
        } catch (error) {
          status.textContent = error.message;
        }
      };

      const reportButton = el("button", "الإبلاغ عن خطأ");
      reportButton.type = "button";

      const reportKey = "afaq-audio-pronunciation-reports-v1";
      const itemKey = item.inventory
        ? "inventory:" + item.id
        : window.AfaqAudioLibrary.keyForText(item.text);

      reportButton.onclick = () => {
        try {
          window.AfaqAdult.assert();

          const reports = JSON.parse(localStorage.getItem(reportKey) || "{}");
          const previous = reports[itemKey]?.description || "";

          const description = window.prompt(
            "صف خطأ النطق في: " + item.text +
            "\nمثال: ينطق نون كأنها نان أو المد قصير.",
            previous
          );

          if (description === null) return;

          const cleaned = description.trim();

          if (!cleaned) {
            window.alert("اكتب وصف الخطأ قبل الحفظ.");
            return;
          }

          reports[itemKey] = {
            text: item.text,
            description: cleaned,
            updatedAt: new Date().toISOString(),
            status: "pending"
          };

          localStorage.setItem(reportKey, JSON.stringify(reports));

          reportButton.textContent = "تعديل بلاغ النطق";
          window.alert("تم حفظ بلاغ النطق بنجاح.");
        } catch (error) {
          window.alert("تعذر حفظ البلاغ: " + error.message);
        }
      };

      try {
        const existing = JSON.parse(localStorage.getItem(reportKey) || "{}");
        if (existing[itemKey]) {
          reportButton.textContent = "تعديل بلاغ النطق";
        }
      } catch (error) {
        console.warn("Audio report storage unavailable", error);
      }

      const ttsButton = el("button", "استماع آلي");
      ttsButton.type = "button";
      ttsButton.onclick = () => {
        try {
          window.AfaqAdult.assert();

          const synth = window.speechSynthesis;
          if (!synth || !window.SpeechSynthesisUtterance) {
            throw new Error("النطق الآلي غير متاح في المتصفح");
          }

          const voices = synth.getVoices();
          const overrides = JSON.parse(
            localStorage.getItem("afaq-audio-voice-overrides-v1") || "{}"
          );
          const choice = overrides[item.text];

          const selected = choice?.approved === true
            ? voices.find(v => v.name === choice.voice && v.lang === choice.lang)
            : null;

          const voice = selected ||
            voices.find(v => v.name.includes("Microsoft Hamed")) ||
            voices.find(v => v.lang.startsWith("ar"));

          if (!voice) throw new Error("لا يوجد صوت عربي متاح");

          window.AfaqSpeech?.stop();
          synth.cancel();

          const utterance = new SpeechSynthesisUtterance(item.text);
          utterance.voice = voice;
          utterance.lang = voice.lang;
          utterance.rate = window.AfaqSpeech?.settings()?.rate ?? 0.8;
          utterance.volume = 1;

          utterance.onerror = () => {
            status.textContent = "تعذر تشغيل النطق الآلي";
          };

          synth.speak(utterance);
        } catch (error) {
          status.textContent = error.message;
        }
      };

      row.append(info, status, play, ttsButton, recordButton, reportButton);
      container.appendChild(row);
    });

    if (filtered.length > (state.visibleCount || 25)) {
      container.appendChild(
        Object.assign(el("button", "عرض 25 نتيجة إضافية"), { onclick: () => { state.visibleCount = (state.visibleCount || 25) + 25; renderList(container); } })
      );
    }
  }

  async function open() {window.AfaqAdult.assert();
    let revoked=false;const revoke=()=>{revoked=true;};window.addEventListener('afaq-adult-locked',revoke);
    let result,inventory,error;
    try{[result,inventory]=await Promise.all([window.AfaqAudioCatalog.load(),window.AfaqAudioManagement.loadInventory().catch(e=>{error=e;return null;})]);state.saved=new Set(await window.AfaqAudioLibrary.listIds());state.statuses=inventory?await window.AfaqAudioManagement.inventoryStatuses(inventory.firstBatch):new Map();if(revoked)throw Error('Adult operation revoked');window.AfaqAdult.assert();state.inventory=inventory;state.legacy=result.entries;state.scope=inventory?'meem':'legacy';state.search='';state.letter='';state.category='';state.status='';}
    finally{window.removeEventListener('afaq-adult-locked',revoke);}
    const planned=rows=>rows.map(row=>({id:row.recordingId,text:row.script,category:row.category,letters:[...new Set(row.uses.map(u=>u.letter).filter(Boolean))],inventory:row}));
    const chooseScope=()=>{state.entries=state.scope==='legacy'?state.legacy:planned(state.scope==='meem'?state.inventory.firstBatch:state.inventory.entries);};chooseScope();

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
      ['تسجيل معتمد','approved'],
      ['يحتاج تسجيل','missing'],
      ['تعذر الفحص','unknown']
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

    const scope=el('select');scope.id='afaq-audio-scope';scope.setAttribute('aria-label','خطة التسجيل');
    if(inventory){scope.append(new Option('دفعة الميم والمشترك ('+inventory.firstBatch.length+')','meem'),new Option('خطة التسجيل كاملة','inventory'));}scope.append(new Option('كتالوج النصوص السابق','legacy'));scope.value=state.scope;
    scope.onchange=async()=>{state.scope=scope.value;state.letter='';state.category='';chooseScope();letter.replaceChildren(new Option('جميع الحروف',''),...[...new Set(state.entries.flatMap(x=>x.letters))].filter(Boolean).sort().map(v=>new Option(v,v)));category.replaceChildren(new Option('جميع التصنيفات',''),...[...new Set(state.entries.map(x=>x.category))].sort().map(v=>new Option(v,v)));renderList(list);await refresh();};
    controls.append(scope,search, letter, category, status);
    const management = el("button", "إدارة التسجيلات والنسخ الاحتياطي");
management.type = "button";
management.onclick = () => {
  window.AfaqAudioLibrary.mount();
  const oldPanel = document.getElementById("afaq-audio-library");
  if (oldPanel) {
    oldPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};
const notice=el('p',error?error.message:'اختر نصًا لفتح المسجل الحالي. تبقى التسجيلات المعتمدة محفوظة.');notice.setAttribute('role','status');
    panel.append(heading, close, management, controls,notice, list);
    document.body.appendChild(panel);

    renderList(list);
  }

  async function refresh(){const own=++state.refreshEpoch;const panel=document.getElementById('afaq-smart-audio-panel');if(!panel||!window.AfaqAdult.authenticated())return;const [saved,statuses]=await Promise.all([window.AfaqAudioLibrary.listIds(),window.AfaqAudioManagement.inventoryStatuses(state.entries.filter(x=>x.inventory).map(x=>x.inventory))]);if(own!==state.refreshEpoch||!panel.isConnected||!window.AfaqAdult.authenticated())return;state.saved=new Set(saved);state.statuses=statuses;renderList(panel.lastElementChild);}
  window.AfaqSmartAudioUI={open,refresh};
})();
