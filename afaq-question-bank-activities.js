(function () {
  "use strict";

  const TYPES = {
    "single-choice": "اختر الإجابة الصحيحة",
    "oral-response": "تحدث وأجب",
    "teacher-observation": "نشاط مع المعلم",
    "teacher-listening": "استمع وأجب",
    "construction": "ركب الكلمة",
    "tracing": "تتبع الحرف",
    "handwriting": "اكتب بخط يدك",
    "dictation": "استمع واكتب",
    "written-response": "اكتب إجابتك"
  };

  function element(tag, text, parent) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }

  function order(items,seed){let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619);const result=[...items];for(let i=result.length-1;i>0;i--){n^=n<<13;n^=n>>>17;n^=n<<5;const j=(n>>>0)%(i+1);[result[i],result[j]]=[result[j],result[i]];}return result;}

  function mount(container, question, onComplete) {
    if (!container || !question || !TYPES[question.type]) {
      throw new Error("Unsupported question activity");
    }

    const previousAudio = window.AfaqQuestionAudio;
    previousAudio?.stop?.();

    container.replaceChildren();

    const panel = element("section", null, container);
    panel.className = "afaq-bank-activity";
    panel.dir = "rtl";

    element("h3", TYPES[question.type], panel);
    element("p", question.visiblePrompt || "", panel);

    const audio = window.AfaqQuestionAudio;
    const audioStatus=element('p','',panel);audioStatus.setAttribute('role','status');
    let playback=0;
    async function playAudio(action){const token=++playback;try{const result=await action();if(panel.isConnected&&token===playback)audioStatus.textContent=result?.ok?(result.source==='automated-speech'?'انتهت معاينة صوت آلي؛ ليست تسجيلًا بشريًا معتمدًا.':'انتهى الصوت. يمكنك الاستماع مجددًا.'):'تعذر تشغيل الصوت المعتمد. أعد المحاولة أو اطلب من المعلم قراءة المطلوب دون إظهار الإجابة.';}catch(error){console.error('AFAQ bank audio failed',question.id,error);if(panel.isConnected&&token===playback)audioStatus.textContent='تعذر تشغيل الصوت. اطلب مساعدة المعلم.';}}

    if(audio?.instruction){const method=element('button','طريقة النشاط',panel);method.type='button';method.className='afaq-bank-listen-instruction';method.addEventListener('click',()=>void playAudio(()=>audio.instruction(question)));}
    if (audio?.questionPrompt) {
      const listen = element("button", null, panel);
      listen.type = "button";
      listen.textContent = "\u{1F50A} " +
        "\u0627\u0633\u062A\u0645\u0639 \u0644\u0644\u0633\u0624\u0627\u0644";
      listen.className = "afaq-bank-listen-prompt";
      listen.addEventListener("click", () => {
        void playAudio(()=>audio.questionPrompt(question));
      });
    }

    const stimulus = question.stimulus || {};
    const concealed = stimulus.visibility === "hidden" ||
      ["dictation", "teacher-listening", "construction"].includes(question.type) ||
      (question.type === "handwriting" && question.skill !== "word-writing");

    if (!concealed && stimulus.text) {
      const model = element("div", stimulus.text, panel);
      model.className = "afaq-bank-stimulus";
    }

    const controls = element("div", null, panel);
    controls.className = "afaq-bank-controls";

    let response = null;
    let completed = false;

    function finish(value) {
      if (completed) return;
      completed = true;

      audio?.stop?.();

      if (typeof onComplete === "function") {
        onComplete({
          questionId: question.id,
          type: question.type,
          response: value,
          teacherReview: true,
          independentMastery: false,
          evidenceEligible: false
        });
      }
    }

    if (question.type === "single-choice") {
      for (const {index,option} of order((question.options || []).map((option,index)=>({index,option})),question.id+':options')) {
        const row = element("div", null, controls);
        row.className = "afaq-bank-option-row";

        const button = element("button", option, row);
        button.type = "button";
        button.addEventListener("click", () => {
          response = option;
          finish(response);
        });

        if (audio?.option) {
          const listen = element("button", null, row);
          listen.type = "button";
          listen.textContent = "\u{1F50A}";
          listen.className = "afaq-bank-listen-option";
          listen.setAttribute(
            "aria-label",
            "\u0627\u0633\u062A\u0645\u0639 \u0644\u0644\u0627\u062E\u062A\u064A\u0627\u0631 " +
              (index + 1)
          );
          listen.addEventListener("click", () => {
            void playAudio(()=>audio.option(question, index));
          });
        }
      }
    } else if (question.type === "construction") {
      const tokens = Array.isArray(question.tokens)
        ? question.tokens.filter(x => typeof x === "string" && x.trim())
        : [];

      const target = typeof question.correctAnswer === "string"
        ? question.correctAnswer.trim()
        : "";

      if (tokens.length < 2 || !target) {
        element("p", "هذا النشاط يحتاج إلى مراجعة المعلم قبل تشغيله.", controls);
        return panel;
      }

      const normalize = value =>
        String(value).trim().replace(/[.!]+$/u, "").trim();

      const expected = normalize(target);
      if(question.teacherTarget&&audio?.play){const listen=element('button','استمع إلى المطلوب',controls);listen.type='button';listen.className='afaq-bank-listen-construction';listen.setAttribute('aria-label','استمع إلى المطلوب');listen.addEventListener('click',()=>void playAudio(()=>audio.play(question.teacherTarget,'question-id:'+question.id+':target')));}

      const cards = order(tokens.map((text, id) => ({ text, id })),question.id+':tokens');

      const selected = [];
      const answerArea = element("div", "", controls);
      answerArea.className = "afaq-bank-constructed-answer";

      const cardArea = element("div", null, controls);
      cardArea.className = "afaq-bank-word-cards";

      const feedback = element("p", "", controls);

      const checkButton = element("button", "تحقق من التركيب", controls);
      checkButton.type = "button";

      const resetButton = element("button", "أعد ترتيب البطاقات", controls);
      resetButton.type = "button";

      let submitted = false;

      function render() {
        answerArea.textContent = selected.map(x => x.text).join(" ");
        cardArea.replaceChildren();

        for (const card of cards) {
          if (selected.some(x => x.id === card.id)) continue;

          const cardRow = element("div", null, cardArea);
          cardRow.className = "afaq-bank-option-row";

          const button = element("button", card.text, cardRow);
          button.type = "button";
          button.disabled = submitted;

          if (audio?.play) {
            const listen = element("button", null, cardRow);
            listen.type = "button";
            listen.textContent = "\u{1F50A}";
            listen.className = "afaq-bank-listen-option";
            listen.setAttribute(
              "aria-label",
              "\u0627\u0633\u062A\u0645\u0639 \u0644\u0644\u0628\u0637\u0627\u0642\u0629"
            );
            listen.addEventListener("click", () => {
              void playAudio(()=>audio.play(
                card.text,
                question.id + ":token:" + card.id
              ));
            });
          }
          button.addEventListener("click", () => {
            if (submitted) return;
            selected.push(card);
            feedback.textContent = "";
            render();
          });
        }

        checkButton.disabled = submitted || selected.length !== cards.length;
      }

      checkButton.addEventListener("click", () => {
        if (submitted || selected.length !== cards.length) return;

        submitted = true;

        const answer = selected.map(x => x.text).join(question.skill==='word-building'?"":" ");
        const correct = normalize(answer) === expected;

        feedback.textContent = correct
          ? "أحسنت، تركيبك صحيح."
          : "راجع تركيبك مع المعلم دون كشف الإجابة.";

        render();

        finish({
          answer,
          correct,
          teacherReviewRequired: true
        });
      });

      resetButton.addEventListener("click", () => {
        if (submitted) return;
        selected.length = 0;
        feedback.textContent = "";
        render();
      });

      render();
    } else {
      if (question.type === "teacher-listening") {
        const target = typeof question.teacherTarget === "string"
          ? question.teacherTarget.trim()
          : "";

        if (target && audio?.play) {
          const listen = element("button", null, controls);
          listen.type = "button";
          listen.className = "afaq-bank-listen-target";
          listen.textContent = "استمع إلى المطلوب";
          listen.setAttribute("aria-label", "استمع إلى المطلوب الصوتي");
          listen.addEventListener("click", () => {
            void playAudio(()=>audio.play(target, 'question-id:' + question.id + ":target"));
          });
        }
      }

      if (
        question.type === "handwriting" &&
        question.skill === "letter-writing"
      ) {
        const letter = typeof question.teacherTarget === "string"
          ? question.teacherTarget.trim()
          : "";

        if (letter && audio?.letterName) {
          const listen = element("button", null, controls);
          listen.type = "button";
          listen.className = "afaq-bank-listen-letter-name";
          listen.textContent = "استمع إلى اسم الحرف";
          listen.setAttribute("aria-label", "استمع إلى اسم الحرف");

          listen.addEventListener("click", () => {
            void playAudio(()=>audio.letterName(letter));
          });
        }
      }

      if (question.type === "dictation") {
        const target = typeof question.teacherTarget === "string"
          ? question.teacherTarget.trim()
          : "";

        if (target && audio?.play) {
          const listen = element("button", null, controls);
          listen.type = "button";
          listen.className = "afaq-bank-listen-dictation";
          listen.textContent = "\u{1F50A} " +
            "\u0627\u0633\u062A\u0645\u0639 \u0625\u0644\u0649 \u0627\u0644\u0625\u0645\u0644\u0627\u0621";
          listen.addEventListener("click", () => {
            void playAudio(()=>audio.play(target, 'question-id:' + question.id + ":target"));
          });
        }
      }

      if (question.type === "written-response") {
        const input = element("textarea", null, controls);
        input.placeholder = "اكتب إجابتك هنا";
        input.rows = 3;
        input.addEventListener("input", () => {
          response = input.value;
        });
      }

      if (["tracing", "handwriting", "dictation"].includes(question.type)) {
        element(
          "p",
          "نفذ النشاط على لوحة الكتابة أو مع المعلم. لا تحتسب هذه الخطوة إتقانا مستقلا.",
          controls
        );
      }

      const button = element("button", "أنهيت النشاط", controls);
      button.type = "button";
      button.addEventListener("click", () => finish(response));
    }

    return panel;
  }

  window.AfaqQuestionBankActivities = Object.freeze({
    types: TYPES,
    order,
    mount
  });
})();
