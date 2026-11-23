
(function () {
  'use strict';

  const DB_NAME = 'afaq-audio-studio-v1';
  const STORE = 'clips';

  let recorder = null;
  let stream = null;
  let chunks = [];
  let draft = null;
  let player = null;
  let playerURL = null;
  let currentId = 'syllable:qa';
  let captureEpoch=0;
  let requestingMicrophone=false;
  let playbackGeneration = 0, playbackTimer = null;
  let completion = Promise.resolve(false), finishPlayback = null;

  const LEGACY = {
    'syllable:qa': '\u0642\u064E'
  };

  function clipId(text) {
    const normalized = text.normalize('NFC').trim();
    if (normalized === LEGACY['syllable:qa']) return 'syllable:qa';
    return 'text:' + normalized;
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function authorizedWrite(work) {
    window.AfaqAdult.assert();
    let revoked = false, tx;
    const revoke = () => { revoked = true; if (tx) try { tx.abort(); } catch {} };
    const check = () => { if (revoked) throw new Error('Adult operation revoked'); window.AfaqAdult.assert(); };
    window.addEventListener('afaq-adult-locked', revoke);
    try { return await work(check, transaction => { check(); tx = transaction; }); }
    finally { window.removeEventListener('afaq-adult-locked', revoke); }
  }

  async function dbRequest(mode, action) {
    const run = async (check = () => {}, track = () => {}) => {
      const db = await openDB();
      try {
        check();
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, mode);
          let result, failure;
          const fail = error => { failure = error; try { tx.abort(); } catch {} reject(error); };
          tx.oncomplete = () => resolve(result);
          tx.onerror = () => reject(failure || tx.error || new Error('Audio transaction failed'));
          tx.onabort = () => reject(failure || tx.error || new Error('Audio transaction aborted'));
          try {
            track(tx); check();
            const request = action(tx.objectStore(STORE));
            if (request) {
              request.onsuccess = () => { try { check(); result = request.result; } catch (error) { fail(error); } };
              request.onerror = () => fail(request.error);
            }
          } catch (error) { fail(error); }
        });
      } finally { db.close(); }
    };
    return mode === 'readwrite' ? authorizedWrite(run) : run();
  }

  function getClip(id = currentId) {
    return dbRequest('readonly', store => store.get(id));
  }

  function saveClip(id, blob) {window.AfaqAdult.assert();
    return dbRequest('readwrite', store => store.put(blob, id));
  }

  async function approveInventory(row,blob,guard=()=>{}){
    return authorizedWrite(async check=>{
      const loaded=await window.AfaqAudioManagement.loadInventory();check();guard();
      const known=loaded.entries.find(r=>r.recordingId===row.recordingId);
      if(!known||window.AfaqAudioManagement.inventoryKey(known)!==window.AfaqAudioManagement.inventoryKey(row)||!(blob instanceof Blob)||!blob.size||blob.size>2*1024*1024||!blob.type.startsWith('audio/'))throw Error('بيانات تسجيل الخطة غير صالحة.');
      if(await window.AfaqAudioManagement.approvedInventoryRecording(known))throw Error('يوجد تسجيل معتمد؛ بقي دون استبدال.');
      check();guard();
      await dbRequest('readwrite',store=>{check();guard();return store.add(blob,window.AfaqAudioManagement.inventoryKey(known));});
      window.dispatchEvent(new Event('afaq-instruction-settings'));
    });
  }

  // Exact-key teacher approval with atomic, byte-accurate comparison.
  async function approvePronunciation(entry, blob, reviewer, expected, guard=()=>{}) {
    return authorizedWrite(async check => {
      const key = window.AfaqSpeechCore.pronunciationRecordingKey(entry);
      if (!key || !reviewer?.trim() || !(blob instanceof Blob) ||
          !blob.size || blob.size > 2 * 1024 * 1024 ||
          !blob.type.startsWith('audio/')) {
        throw Error('Invalid pronunciation recording');
      }

      const fingerprint = async value => value instanceof Blob
        ? JSON.stringify([value.type, Array.from(new Uint8Array(await value.arrayBuffer()))])
        : null;

      const original = await getClip(key);
      check();
      guard();

      const originalBytes = await fingerprint(original);
      if (originalBytes !== await fingerprint(expected)) {
        throw Error('Recording changed; review it again before replacing.');
      }

      check();
      guard();

      // Compare exact bytes before writing; do not await inside the transaction.
      await dbRequest('readwrite', store => {
        const tx = store.transaction;
        const read = store.get(key);

        read.onsuccess = () => {
          try {
            check();
            guard();

            const current = read.result;
            if ((current instanceof Blob) !== (original instanceof Blob) ||
                (current instanceof Blob &&
                 (current.size !== original.size || current.type !== original.type))) {
              throw Error('Recording changed; retry approval.');
            }

            store.put(blob, key);
          } catch (error) {
            try { tx.abort(); } catch {}
          }
        };
      });

      return true;
    });
  }
  function listIds() {
    return dbRequest('readonly', store => store.getAllKeys());
  }

  function stopPlayback() {
    window.speechSynthesis?.cancel();
    playbackGeneration++;
    clearTimeout(playbackTimer); playbackTimer = null;
    finishPlayback?.(false); finishPlayback = null;
    if (player) {
      player.pause();
      player.removeAttribute('src');
      player.load();
      player = null;
    }
    if (playerURL) {
      URL.revokeObjectURL(playerURL);
      playerURL = null;
    }
  }

  async function playBlob(blob) {
    stopPlayback();
    window.SeviatGuidedAudio?.stop();
    window.AfaqVowelAudio?.stop();
    window.AfaqSpeech?.stop();
    const token = playbackGeneration;
    playerURL = URL.createObjectURL(blob);
    const audio = new Audio(playerURL);
    player = audio;
    const allowedSpeeds = [0.75, 0.90, 1.00];
    let speed = 1.00;
    try {
      const stored = Number(localStorage.getItem("afaq-student-audio-speed-v1"));
      if (allowedSpeeds.includes(stored)) speed = stored;
    } catch (_) {}
    audio.playbackRate = speed;
    if ("preservesPitch" in audio) audio.preservesPitch = true;

    completion = new Promise(resolve => { finishPlayback = resolve; });
    playbackTimer = setTimeout(() => { if (token === playbackGeneration) stopPlayback(); }, 120000);
    audio.onended = () => { if (token === playbackGeneration) { finishPlayback?.(true); finishPlayback = null; stopPlayback(); } };
    audio.onerror = () => { if (token === playbackGeneration) stopPlayback(); };

    try {
      await audio.play();
      return token === playbackGeneration;
    } catch (error) {
      if (token === playbackGeneration) stopPlayback();
      throw error;
    }
  }

  function stopMicrophone() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }

  function mount() {window.AfaqAdult.assert();
    if (document.getElementById('afaq-audio-library')) return;

    const root = document.createElement('section');
    root.id = 'afaq-audio-library';
    root.dir = 'rtl';

    Object.assign(root.style, {
      position: 'fixed',
      bottom: '16px',
      left: '16px',
      zIndex: '99999',
      background: '#fff',
      color: '#173b70',
      padding: '18px',
      borderRadius: '16px',
      boxShadow: '0 5px 25px #0003',
      width: 'min(350px, 90vw)',
      maxHeight: '85vh',
      overflowY: 'auto',
      fontFamily: 'Tajawal, sans-serif'
    });

    const heading = document.createElement('h3');
    heading.textContent = 'مكتبة آفاق الصوتية';

    const label = document.createElement('label');
    label.textContent = 'الحرف أو المقطع أو الكلمة:';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = LEGACY['syllable:qa'];
    input.dir = 'rtl';
    input.setAttribute('aria-label', 'النص المطلوب تسجيله');
    input.style.cssText =
      'display:block;width:100%;box-sizing:border-box;' +
      'padding:10px;margin:8px 0;font-size:26px';

    const preview = document.createElement('p');
    preview.style.fontSize = '32px';
    let inventoryRow=null,selectionEpoch=0,heardDraft=null,checking=false;
    const inventoryInfo=document.createElement('p');inventoryInfo.id='afaq-recording-selected-id';inventoryInfo.hidden=true;
    const freeText=document.createElement('button');freeText.type='button';freeText.textContent='نص حر خارج الخطة';freeText.hidden=true;
    const consentLabel=document.createElement('label');consentLabel.hidden=true;
    const consent=document.createElement('input');consent.type='checkbox';consent.id='afaq-inventory-recording-consent';
    consentLabel.append(consent,document.createTextNode(' استمعت إلى التسجيل كاملًا وأؤكد مطابقة النص وصحة النطق.'));

    const buttons = document.createElement('div');
    buttons.style.cssText =
      'display:grid;grid-template-columns:1fr 1fr;gap:8px';

    function makeButton(text) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = text;
      button.style.cssText = 'padding:10px;min-height:44px';
      buttons.appendChild(button);
      return button;
    }

    const record = makeButton('سجّل');
    const listen = makeButton('استمع');
    const approve = makeButton('اعتمد');
    const retry = makeButton('أعِد التسجيل');
    record.id='afaq-library-record';listen.id='afaq-library-listen';approve.id='afaq-library-approve';retry.id='afaq-library-retry';

    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'جاهز للتسجيل';

    const backToList = document.createElement('button');
    backToList.type = 'button';
    backToList.id = 'afaq-library-back-to-list';
    backToList.textContent = 'العودة إلى قائمة التسجيلات';
    backToList.style.cssText = 'display:block;width:100%;padding:12px;margin:10px 0;font-weight:bold';
    backToList.onclick = () => {
      if (recorder?.state === 'recording' || requestingMicrophone || checking) {
        status.textContent = 'أوقف التسجيل أو انتظر اكتمال العملية.';
        return;
      }
      if (draft && !window.confirm('???? ????? ?? ????? ???. ?? ???? ?????? ??? ????')) return;
      const panel = document.getElementById('afaq-smart-audio-panel');
      if (!panel) {
        status.textContent = '???? ????? ????????? ????.';
        return;
      }
      stopPlayback();
      root.style.display = 'none';
      panel.style.display = '';
      panel.style.zIndex = '100000';
      window.AfaqSmartAudioUI?.refresh();
    };

    const savedHeading = document.createElement('h4');
    savedHeading.textContent = 'التسجيلات المعتمدة';

    const savedList = document.createElement('div');

    root.append(
      heading, backToList, label, input, preview, inventoryInfo,freeText, buttons,consentLabel,
      status, savedHeading, savedList
    );
    document.body.appendChild(root);

    function setBusy(busy) {
      input.disabled = busy;
      listen.disabled = busy;
      approve.disabled = busy || !draft || !!inventoryRow&&(heardDraft!==draft||!consent.checked);
      retry.disabled = busy;
    }

    async function refreshList() {
      try {
        const ids = await listIds();
        savedList.replaceChildren();

        if (!ids.length) {
          savedList.textContent = 'لا توجد تسجيلات معتمدة بعد.';
          return;
        }

        ids.forEach(id => {
          const item = document.createElement('button');
          item.type = 'button';
          item.style.cssText =
            'display:block;width:100%;padding:8px;margin:5px 0';
          item.dataset.audioId=id;
          const planned=window.AfaqAudioManagement?.describeInventoryKey(String(id));
          item.textContent = planned?planned.script:
            id === 'syllable:qa'
              ? LEGACY[id]
              : String(id).replace(/^text:/, '');

          item.onclick = async () => {
            if (recorder?.state === 'recording') return;
            if(String(id).startsWith('text:inventory-v1:')){try{const data=await window.AfaqAudioManagement.loadInventory(),row=data.entries.find(r=>window.AfaqAudioManagement.inventoryKey(r)===id);if(!row)throw Error('النص غير موجود في الخطة الحالية؛ بقي التسجيل محفوظًا.');await root.selectInventory(row);const blob=await getClip(id);if(blob)await playBlob(blob);}catch(error){status.textContent=error.message;}return;}
            inventoryRow=null;inventoryInfo.hidden=true;freeText.hidden=true;consentLabel.hidden=true;input.readOnly=false;
            input.value = item.textContent;
            await selectText();
            const blob = await getClip(currentId);
            if (blob) await playBlob(blob);
          };

          savedList.appendChild(item);
        });
      } catch (error) {
        status.textContent = 'تعذر قراءة المكتبة: ' + error.message;
      }
    }

    async function selectText() {
      if (recorder?.state === 'recording') return;
      const own=++selectionEpoch;
      const text = input.value.normalize('NFC').trim();
      stopPlayback();
      draft = null;heardDraft=null;consent.checked=false;
      approve.disabled = true;

      if (!text) {
        preview.textContent = '';
        status.textContent = 'اكتب حرفًا أو مقطعًا أو كلمة أولًا.';
        return;
      }

      currentId = inventoryRow?window.AfaqAudioManagement.inventoryKey(inventoryRow):clipId(text);
      preview.textContent = text;

      try {
        checking=true;record.disabled=true;
        const existing = inventoryRow?await window.AfaqAudioManagement.approvedInventoryRecording(inventoryRow):await getClip(currentId);
        if(own!==selectionEpoch||!root.isConnected)return;
        record.disabled=!!inventoryRow&&!!existing;
        status.textContent = existing
          ? 'يوجد تسجيل معتمد لهذا النص.'
          : 'هذا النص يحتاج إلى تسجيل.';
      } catch (error) {
        status.textContent = 'تعذر فحص التسجيل: ' + error.message;
      }finally{if(own===selectionEpoch)checking=false;}
    }

    input.addEventListener('change',()=>{if(!inventoryRow)selectText();});
    root.selectInventory=async row=>{window.AfaqAdult.assert();if(recorder?.state==='recording'||checking)throw Error('أوقف التسجيل أو انتظر اكتمال الفحص أولًا.');inventoryRow=row;input.value=row.script;input.readOnly=true;freeText.hidden=false;inventoryInfo.hidden=false;inventoryInfo.textContent='معرّف الصوت: '+row.recordingId;consentLabel.hidden=false;await selectText();};
    root.selectFreeText=async text=>{window.AfaqAdult.assert();if(recorder?.state==='recording'||checking)throw Error('أوقف التسجيل أو انتظر اكتمال الفحص أولًا.');inventoryRow=null;inventoryInfo.hidden=true;freeText.hidden=true;consentLabel.hidden=true;input.readOnly=false;input.value=text;await selectText();};
    freeText.onclick=()=>root.selectFreeText(input.value).catch(error=>{status.textContent=error.message;});
    consent.onchange=()=>{approve.disabled=!draft||heardDraft!==draft||!consent.checked;};

    async function startRecording() {
      if(checking||requestingMicrophone)return;
      const text = input.value.normalize('NFC').trim();
      if (!text) {
        status.textContent = 'اكتب النص المطلوب أولًا.';
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia ||
          !window.MediaRecorder) {
        status.textContent = 'المتصفح لا يدعم التسجيل الصوتي.';
        return;
      }

      try {
        const ownedCapture=++captureEpoch,ownedSelection=selectionEpoch;
        const guard=()=>{window.AfaqAdult.assert();if(ownedCapture!==captureEpoch||ownedSelection!==selectionEpoch||!root.isConnected)throw Error('انتهت صلاحية طلب التسجيل.');};
        guard();requestingMicrophone=true;record.disabled=true;
        if(inventoryRow&&(text!==inventoryRow.script||await window.AfaqAudioManagement.approvedInventoryRecording(inventoryRow)))throw Error('يوجد تسجيل معتمد أو تغير النص؛ لم يُستبدل شيء.');
        guard();
        stopPlayback();
        window.SeviatGuidedAudio?.stop();
        currentId = inventoryRow?window.AfaqAudioManagement.inventoryKey(inventoryRow):clipId(text);
        const ownedId=currentId;
        preview.textContent = text;
        draft = null;heardDraft=null;consent.checked=false;
        setBusy(true);

        window.AfaqAdult.assert();
        const acquired = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
        try{guard();}catch(error){acquired.getTracks().forEach(track=>track.stop());throw error;}
        stream=acquired;

        chunks = [];
        if(!window.AfaqAdult.authenticated()){stopMicrophone();throw Error('انتهت جلسة البالغين.');}
        const activeRecorder = new MediaRecorder(stream);
        recorder = activeRecorder;

        activeRecorder.ondataavailable = event => {
          if (event.data.size) chunks.push(event.data);
        };

        activeRecorder.onstop = () => {
          if(ownedCapture!==captureEpoch||ownedSelection!==selectionEpoch||ownedId!==currentId||!root.isConnected||!window.AfaqAdult.authenticated()){stopMicrophone();return;}
          draft = new Blob(chunks, {
            type: activeRecorder.mimeType || 'audio/webm'
          });

          stopMicrophone();
          record.textContent = 'سجّل';
          setBusy(false);
          status.textContent =
            'تم التسجيل. استمع أولًا ثم اضغط اعتمد.';
        };

        activeRecorder.onerror = () => {
          stopMicrophone();
          record.textContent = 'سجّل';
          setBusy(false);
          status.textContent = 'حدث خطأ أثناء التسجيل.';
        };

        activeRecorder.start();
        record.disabled=false;
        record.textContent = 'إيقاف التسجيل';
        status.textContent = 'جارٍ التسجيل...';
      } catch (error) {
        stopMicrophone();
        setBusy(false);
        status.textContent =
          'تعذر تشغيل الميكروفون: ' + error.message;
      }finally{requestingMicrophone=false;if(root.isConnected&&recorder?.state!=='recording')record.disabled=false;}
    }

    record.onclick = () => {
      if (recorder?.state === 'recording') {
        recorder.stop();
      } else {
        return startRecording();
      }
    };

    listen.onclick = async () => {
      try {
        if(recorder?.state==='recording')return;
        const own=selectionEpoch,blob = draft || (inventoryRow?(await window.AfaqAudioManagement.approvedInventoryRecording(inventoryRow))?.blob:await getClip(currentId));

        if (!blob) {
          status.textContent = 'لا يوجد تسجيل للاستماع.';
          return;
        }

        await playBlob(blob);
        status.textContent = 'جارٍ تشغيل التسجيل.';
        if(inventoryRow){const ended=completion;if(await ended&&own===selectionEpoch&&draft===blob&&root.isConnected&&window.AfaqAdult.authenticated()){heardDraft=blob;approve.disabled=!consent.checked;status.textContent='انتهى الاستماع؛ أكد مطابقة النص قبل الاعتماد.';}}
      } catch (error) {
        status.textContent =
          'تعذر تشغيل الصوت: ' + error.message;
      }
    };

    approve.onclick = async () => {window.AfaqAdult.assert();
      if (!draft || recorder?.state === 'recording') return;
      if(inventoryRow&&(heardDraft!==draft||!consent.checked)){status.textContent='استمع إلى التسجيل كاملًا وأكد مطابقته قبل الاعتماد.';return;}

      try {
        const saved = await authorizedWrite(async check => {
          const id = currentId, recording = draft;
          const own=selectionEpoch;
          if(inventoryRow){await approveInventory(inventoryRow,recording,()=>{check();if(own!==selectionEpoch||recording!==draft||!root.isConnected||heardDraft!==recording||!consent.checked)throw Error('تغير اختيار التسجيل أو تأكيده.');});return true;}
          const existing = await getClip(id);
          check();

          if (existing && !window.confirm(
            'يوجد تسجيل معتمد. هل تريد استبداله؟'
          )) return;

          check();
          await saveClip(id, recording);
          return true;
        });
        if (!saved) return;
        draft = null;
        approve.disabled = true;
        if(inventoryRow)record.disabled=true;
        status.textContent =
          'تم اعتماد التسجيل وحفظه على هذا الجهاز.';
        await refreshList(); if (window.AfaqSmartAudioUI?.refresh) await window.AfaqSmartAudioUI.refresh();
      } catch (error) {
        status.textContent =
          'تعذر حفظ التسجيل: ' + error.message;
      }
    };

    retry.onclick = () => {
      if (recorder?.state === 'recording') {
        status.textContent = 'أوقف التسجيل أولًا.';
        return;
      }

      stopPlayback();
      draft = null;
      heardDraft=null;consent.checked=false;
      approve.disabled = true;
      status.textContent = 'جاهز لإعادة التسجيل.';
    };

    root.ready=selectText();
    refreshList();
  }

  window.AfaqAudioLibrary = {
    approveInventory,
    keyForText:clipId,
    selectInventory:async row=>{mount();const root=document.getElementById('afaq-audio-library');await root.ready;await root.selectInventory(row);},
    selectText:async text=>{mount();const root=document.getElementById('afaq-audio-library');await root.ready;await root.selectFreeText(text);},
    isRecording:()=>recorder?.state==='recording',
    approvePronunciation,
    stop: stopPlayback,
    dispose: () => {captureEpoch++;stopMicrophone();if(recorder?.state==='recording')recorder.stop();stopPlayback();draft=null;},
    done: () => completion,
    mount,
    getClip,
    playBlob,
    listIds,
    play: async text => {
      stopPlayback();
      window.speechSynthesis?.cancel();

      const token = playbackGeneration;
      const blob = await getClip(clipId(text));

      if (token !== playbackGeneration) return false;

      if (blob) {
        return await playBlob(blob);
      }

      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        return false;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices();

      let approvedVoice = null;

      try {
        const overrides = JSON.parse(
          localStorage.getItem("afaq-audio-voice-overrides-v1") || "{}"
        );

        const choice = overrides[text];

        if (choice?.approved === true) {
          approvedVoice = voices.find(
            v => v.name === choice.voice && v.lang === choice.lang
          ) || null;
        }
      } catch (error) {
        console.warn("Audio voice preferences unavailable", error);
      }

      utterance.voice =
        approvedVoice ||
        voices.find(v => v.name.includes('Microsoft Hamed')) ||
        voices.find(v => v.lang.startsWith('ar')) ||
        null;

      utterance.lang = utterance.voice?.lang || 'ar-SA';
      utterance.rate = 0.8;
      utterance.volume = 1;

      speechSynthesis.speak(utterance);
      return true;
    }
  };
})();
