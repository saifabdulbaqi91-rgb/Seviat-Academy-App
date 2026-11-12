(function () {
  "use strict";

  const translations = {
    "التتبع والتمييز والانتباه": "Tracing, Recognition & Attention",
    "أشكال الحروف وأصواتها": "Letter Shapes & Sounds",
    "الفتحة والضمة والكسرة والسكون": "Fatha, Damma, Kasra & Sukoon",
    "نجمع الحروف ونبني الكلمات": "Combine Letters & Build Words",
    "نتدرب على الكتابة والتتبع": "Practice Writing & Tracing",
    "نتعلم ونلعب ونكسب النجوم": "Learn, Play & Earn Stars",
    "نتعلم الحروف وأصواتها": "Learn Letters & Their Sounds",
    "نتعلم الحركات والمدود": "Learn Short & Long Vowels",
    "نتدرب على التمييز والانتباه": "Practice Recognition & Attention",
    "هل أنت مستعد لاكتشاف حرف جديد": "Ready to Discover a New Letter?",
    "ابدأ رحلتك واكتشف عالم اللغة العربية.":
      "Start Your Journey into the Arabic Language.",
    "التعلم رحلة ممتعة تبدأ بخطوة.":
      "Learning Is a Journey That Begins with One Step."
  };

  function update() {
    if (localStorage.getItem("seviat-language") !== "en") return;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script,style,#seviat-settings-panel")) continue;

      const text = node.textContent.trim();
      if (translations[text]) {
        node.textContent = node.textContent.replace(text, translations[text]);
      }
    }

    // Keep the Arabic letter itself in the learning heading.
    document.querySelectorAll("h2,h3").forEach(el => {
      const text = el.textContent.trim();
      const match = text.match(/^([مبلدنر])\s+Practice Letter$/);
      if (match) {
        el.textContent = "Practice Letter " + match[1];
      }
    });
  }

  let scheduled = false;

  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      observer.disconnect();
      update();
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      scheduled = false;
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  update();
})();
