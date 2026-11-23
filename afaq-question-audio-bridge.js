(function (host) {
  'use strict';

  function register(plan) {
    if (!plan || plan.version !== 1 || !Array.isArray(plan.items)) {
      throw new Error('Invalid AFAQ audio plan');
    }

    const speech = host.AfaqSpeech;
    if (!speech || typeof speech.candidate !== 'function') {
      throw new Error('AFAQ speech engine is unavailable');
    }

    let registered = 0;
    for(const [type,text]of Object.entries(plan.typeCommands||{})){if(typeof text!=='string'||!text.trim())throw Error('Invalid type command');speech.candidate('question-id:activity:'+type,text,'question');registered++;}

    for (const item of plan.items) {
      if (!item.questionId || !item.prompt?.text) {
        throw new Error('Invalid question audio entry');
      }

      speech.candidate(
        'question-id:' + item.questionId,
        item.prompt.text,
        'question'
      );
      registered++;

      for (const option of item.options || []) {
        if (!option.key || !option.text) {
          throw new Error('Invalid option audio entry');
        }

        speech.candidate(option.key, option.text, 'question');
        registered++;
      }
      if(item.target){
        if(!item.target.key||!item.target.text||item.target.visibility!=='hidden')throw Error('Invalid concealed target');
        speech.candidate(item.target.key,item.target.text,'question');registered++;
      }
    }

    return {
      questions: plan.items.length,
      audioEntries: registered,
      runtimeEnabled: false
    };
  }

  async function load(url) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Cannot load audio plan: ' + response.status);
    }

    const plan = await response.json();

    if (plan.runtimeEnabled !== false) {
      throw new Error('Only disabled draft plans are accepted');
    }

    return register(plan);
  }

  const api = { register, load };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    host.AfaqQuestionAudioBridge = api;
  }
})(typeof window === 'undefined' ? globalThis : window);
