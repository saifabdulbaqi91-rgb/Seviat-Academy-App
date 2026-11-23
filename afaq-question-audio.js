(function (host) {
  'use strict';

  let active = 0;

  function stop() {
    active++;
    host.AfaqSpeech?.stop();
    host.AfaqAudioLibrary?.stop?.();
    host.SeviatGuidedAudio?.stop?.();
    host.AfaqVowelAudio?.stop?.();
    host.SeviatAudioQuestions?.stop?.();
    host.SeviatSound?.stop?.();
  }

  async function recorded(blob, ticket) {
    const library=host.AfaqAudioLibrary;
    if(!library?.playBlob||!library.done)return {ok:false,reason:'approved-playback-unavailable'};
    const started=await library.playBlob(blob), completion=library.done();
    if(ticket!==active)return {ok:false,reason:'cancelled'};
    const ended=started&&await completion;
    return ticket!==active?{ok:false,reason:'cancelled'}:{ok:!!ended,source:'approved-recording',reason:ended?'completed':'approved-playback-failed'};
  }

  async function automated(id,ticket) {
    const speech=host.AfaqSpeech;
    if(!speech?.speak)return {ok:false,reason:'speech-unavailable'};
    const started=await speech.speak(id),completion=speech.done?.();
    if(ticket!==active)return {ok:false,reason:'cancelled'};
    if(!started?.ok)return started;
    const ended=completion&&await completion;
    return ticket!==active?{ok:false,reason:'cancelled'}:{ok:!!ended,source:'automated-speech',humanApproved:false,reason:ended?'completed':'speech-incomplete'};
  }

  async function play(text, id, registered=false, fallback=null) {
    if (typeof text !== 'string' || !text.trim()) {
      return { ok: false, reason: 'empty-text' };
    }

    stop();

    const ticket = active;
    const speech = host.AfaqSpeech;
    const library = host.AfaqAudioLibrary;
    const value = text.normalize('NFC').trim();

    try {
      if (!registered && speech?.candidate && typeof id === 'string' && id) {
        speech.candidate(id, value, 'question');
      }

      if (speech?.clip && id) {
        const saved = await speech.clip(id);

        if (ticket !== active) {
          return { ok: false, reason: 'cancelled' };
        }

        if (saved?.approved === true && saved.blob instanceof Blob &&
            saved.blob.size > 0) {
          if (!library?.playBlob) {
            return { ok: false, reason: 'approved-playback-unavailable' };
          }

          // A failed human recording never silently changes into an automated model.
          return await recorded(saved.blob,ticket);
        }
      }

      if (library?.getClip && library?.playBlob) {
        const key = library.keyForText
          ? library.keyForText(value)
          : 'text:' + value;

        const blob = await library.getClip(key);

        if (ticket !== active) {
          return { ok: false, reason: 'cancelled' };
        }

        if (blob instanceof Blob && blob.size > 0) {
          return await recorded(blob,ticket);
        }
      }

      if (!speech?.speak) {
        return { ok: false, reason: 'speech-unavailable' };
      }

      if (ticket !== active) {
        return { ok: false, reason: 'cancelled' };
      }

      if(fallback && !speech.playbackSelection?.(id))return await fallback();
      return await automated(id,ticket);

    } catch (error) {
      console.warn('[AFAQ question audio]', error);
      return { ok: false, reason: 'playback-error' };
    }
  }

  async function letterName(letter) {
    const speech = host.AfaqSpeech;
    const library = host.AfaqAudioLibrary;

    if (typeof letter !== 'string' || !letter.trim()) {
      return { ok: false, reason: 'invalid-letter' };
    }

    if (!speech?.lessonCandidate) {
      return { ok: false, reason: 'lesson-speech-unavailable' };
    }

    stop();
    const ticket = active;

    try {
      const entry = speech.lessonCandidate('model', letter, letter);

      if (!entry || entry.category !== 'letter-name') {
        return { ok: false, reason: 'unsupported-letter' };
      }

      const saved = await speech.clip?.(entry.id);

      if (ticket !== active) {
        return { ok: false, reason: 'cancelled' };
      }

      if (saved?.approved === true && saved.blob instanceof Blob &&
          saved.blob.size > 0) {
        if (!library?.playBlob) {
          return { ok: false, reason: 'approved-playback-unavailable' };
        }

        return await recorded(saved.blob,ticket);
      }

      if (ticket !== active) {
        return { ok: false, reason: 'cancelled' };
      }

      if (!speech.speak) {
        return { ok: false, reason: 'speech-unavailable' };
      }

      return await automated(entry.id,ticket);

    } catch (error) {
      console.warn('[AFAQ letter-name audio]', error);
      return { ok: false, reason: 'playback-error' };
    }
  }

  function questionPrompt(question) {
    return play(
      question.spokenPrompt || question.visiblePrompt,
      'question-id:' + question.id
    );
  }

  function instruction(question){const id='question-id:activity:'+question.type,e=host.AfaqSpeech?.entry(id);return e?play(e.display,id,true):Promise.resolve({ok:false,reason:'instruction-unavailable'});}

  function option(question, index) {
    const value = question.options?.[index];

    if (typeof value !== 'string') {
      return Promise.resolve({
        ok: false,
        reason: 'invalid-option'
      });
    }

    const id='question-id:' + question.id + ':option:' + index;
    if(value===question.letter)return play(value,id,false,()=>letterName(value));
    const model=host.AfaqSpeech?.lessonCandidate?.('model',value,question.letter);
    if(model)return play(value,id,false,()=>play(value,model.id,true));
    const numbers={'0':'صفر','1':'واحد','2':'اثنان','3':'ثلاثة'};
    return play(Object.hasOwn(numbers,value)?'العدد '+numbers[value]+'.':value,id);
  }

  host.AfaqQuestionAudio = {
    play,
    stop,
    letterName,
    questionPrompt,
    instruction,
    option
  };

})(window);
