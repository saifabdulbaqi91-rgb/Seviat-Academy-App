(function () {
  "use strict";

  const SOURCES = [
    "data/unit1-reviewed.json",
    "data/questions.json",
    "data/group1-extra.json",
    "data/group1-reading-extra.json",
    "data/meem-questions.json"
  ];

  const entries = new Map();

  function add(text, category, letter, source) {
    if (typeof text !== "string") return;

    text = text.normalize("NFC").trim();
    if (!text || text.length > 250) return;

    const key = category + ":" + text;
    const existing = entries.get(key);

    if (existing) {
      if (letter) existing.letters.add(letter);
      existing.sources.add(source);
      return;
    }

    entries.set(key, {
      id: key,
      text,
      category,
      letters: new Set(letter ? [letter] : []),
      sources: new Set([source])
    });
  }

  function collect(question, source) {
    if (!question || typeof question !== "object") return;

    const letter = question.letter || "";

    add(question.prompt, "??????? ???????", letter, source);
    add(question.stimulus, "??????? ????????", letter, source);
    add(question.target, "????? ???????", letter, source);

    if (Array.isArray(question.options)) {
      question.options.forEach(option => {
        if (typeof option === "string") {
          add(option, "??????????", letter, source);
        }
      });
    }
  }

  async function load() {
    entries.clear();

    const results = await Promise.allSettled(
      SOURCES.map(async source => {
        const response = await fetch(source, { cache: "no-store" });
        if (!response.ok) throw new Error(source);
        return { source, data: await response.json() };
      })
    );

    const failed = [];

    results.forEach((result, index) => {
      if (result.status !== "fulfilled") {
        failed.push(SOURCES[index]);
        return;
      }

      const { source, data } = result.value;

      if (Array.isArray(data.questions)) {
        data.questions.forEach(q => collect(q, source));
      }

      if (Array.isArray(data.letters)) {
        data.letters.forEach(letter =>
          add(letter, "???? ??????", letter, source)
        );
      }

      if (Array.isArray(data.wordGlossary)) {
        data.wordGlossary.forEach(word =>
          add(word, "???????", "", source)
        );
      }

      if (Array.isArray(data.writingActivities)) {
        data.writingActivities.forEach(activity =>
          collect(activity, source)
        );
      }
    });

    return {
      entries: list(),
      failed
    };
  }

  function list() {
    return Array.from(entries.values()).map(item => ({
      ...item,
      letters: Array.from(item.letters),
      sources: Array.from(item.sources)
    }));
  }

  window.AfaqAudioCatalog = {
    load,
    list,
    add
  };
})();
