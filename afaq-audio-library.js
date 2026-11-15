
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

  async function dbRequest(mode, action) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let result;

      try {
        const request = action(store);
        if (request) {
          request.onsuccess = () => { result = request.result; };
          request.onerror = () => reject(request.error);
        }
      } catch (error) {
        db.close();
        reject(error);
        return;
      }

      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  function getClip(id = currentId) {
    return dbRequest('readonly', store => store.get(id));
  }

  function saveClip(id, blob) {
    return dbRequest('readwrite', store => store.put(blob, id));
  }

  function listIds() {
    return dbRequest('readonly', store => store.getAllKeys());
  }

  function stopPlayback() {
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
    playerURL = URL.createObjectURL(blob);
    const audio = new Audio(playerURL);
    player = audio;

    audio.onended = stopPlayback;
    audio.onerror = stopPlayback;

    try {
      await audio.play();
    } catch (error) {
      stopPlayback();
      throw error;
    }
  }

  function stopMicrophone() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
  }

  function mount() {
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

    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'جاهز للتسجيل';

    const savedHeading = document.createElement('h4');
    savedHeading.textContent = 'التسجيلات المعتمدة';

    const savedList = document.createElement('div');

    root.append(
      heading, label, input, preview, buttons,
      status, savedHeading, savedList
    );
    document.body.appendChild(root);

    function setBusy(busy) {
      input.disabled = busy;
      listen.disabled = busy;
      approve.disabled = busy || !draft;
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
          item.textContent =
            id === 'syllable:qa'
              ? LEGACY[id]
              : String(id).replace(/^text:/, '');

          item.onclick = async () => {
            if (recorder?.state === 'recording') return;
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

      const text = input.value.normalize('NFC').trim();
      stopPlayback();
      draft = null;
      approve.disabled = true;

      if (!text) {
        preview.textContent = '';
        status.textContent = 'اكتب حرفًا أو مقطعًا أو كلمة أولًا.';
        return;
      }

      currentId = clipId(text);
      preview.textContent = text;

      try {
        const existing = await getClip(currentId);
        status.textContent = existing
          ? 'يوجد تسجيل معتمد لهذا النص.'
          : 'هذا النص يحتاج إلى تسجيل.';
      } catch (error) {
        status.textContent = 'تعذر فحص التسجيل: ' + error.message;
      }
    }

    input.addEventListener('change', selectText);

    async function startRecording() {
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
        stopPlayback();
        currentId = clipId(text);
        preview.textContent = text;
        draft = null;
        setBusy(true);

        stream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });

        chunks = [];
        const activeRecorder = new MediaRecorder(stream);
        recorder = activeRecorder;

        activeRecorder.ondataavailable = event => {
          if (event.data.size) chunks.push(event.data);
        };

        activeRecorder.onstop = () => {
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
        record.textContent = 'إيقاف التسجيل';
        status.textContent = 'جارٍ التسجيل...';
      } catch (error) {
        stopMicrophone();
        setBusy(false);
        status.textContent =
          'تعذر تشغيل الميكروفون: ' + error.message;
      }
    }

    record.onclick = () => {
      if (recorder?.state === 'recording') {
        recorder.stop();
      } else {
        startRecording();
      }
    };

    listen.onclick = async () => {
      try {
        const blob = draft || await getClip(currentId);

        if (!blob) {
          status.textContent = 'لا يوجد تسجيل للاستماع.';
          return;
        }

        await playBlob(blob);
        status.textContent = 'جارٍ تشغيل التسجيل.';
      } catch (error) {
        status.textContent =
          'تعذر تشغيل الصوت: ' + error.message;
      }
    };

    approve.onclick = async () => {
      if (!draft || recorder?.state === 'recording') return;

      try {
        const existing = await getClip(currentId);

        if (existing && !window.confirm(
          'يوجد تسجيل معتمد. هل تريد استبداله؟'
        )) return;

        await saveClip(currentId, draft);
        draft = null;
        approve.disabled = true;
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
      approve.disabled = true;
      status.textContent = 'جاهز لإعادة التسجيل.';
    };

    selectText();
    refreshList();
  }

  window.AfaqAudioLibrary = {
    mount,
    getClip,
    listIds,
    play: async text => {
      const blob = await getClip(clipId(text));
      if (!blob) return false;
      await playBlob(blob);
      return true;
    }
  };
})();
