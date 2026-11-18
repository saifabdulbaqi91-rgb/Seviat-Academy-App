
(function () {
  'use strict';

  const DB_NAME = 'afaq-audio-studio-v1';
  const CLIP_ID = 'syllable:qa';
  const CLIP_TEXT = '\u0642\u064E';

  let recorder = null;
  let stream = null;
  let chunks = [];
  let draft = null;
  let draftURL = null;
  let player = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = () => {
        request.result.createObjectStore('clips');
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveClip(blob) {
    window.AfaqAdult.assert();
    let revoked = false, tx, db;
    const revoke = () => { revoked = true; if (tx) try { tx.abort(); } catch {} };
    const check = () => { if (revoked) throw new Error('Adult operation revoked'); window.AfaqAdult.assert(); };
    window.addEventListener('afaq-adult-locked', revoke);
    try {
      db = await openDB();
      check();
      return await new Promise((resolve, reject) => {
        tx = db.transaction('clips', 'readwrite');
        let failure;
        const fail = error => { failure = error; try { tx.abort(); } catch {} reject(error); };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(failure || tx.error || new Error('Audio transaction failed'));
        tx.onabort = () => reject(failure || tx.error || new Error('Audio transaction aborted'));
        try {
          check();
          const request = tx.objectStore('clips').put(blob, CLIP_ID);
          request.onsuccess = () => { try { check(); } catch (error) { fail(error); } };
        } catch (error) { fail(error); }
      });
    } finally { window.removeEventListener('afaq-adult-locked', revoke); db?.close(); }
  }

  async function getClip() {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('clips', 'readonly');
      const request = tx.objectStore('clips').get(CLIP_ID);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  function stopPlayback() {
    if (player) {
      player.pause();
      player = null;
    }
  }

  async function playBlob(blob) {
    stopPlayback();

    const url = URL.createObjectURL(blob);
    player = new Audio(url);

    player.onended = () => URL.revokeObjectURL(url);
    player.onerror = () => URL.revokeObjectURL(url);

    try {
      await player.play();
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  function mount() {window.AfaqAdult.assert();
    if (document.querySelector('#afaq-audio-studio')) return;

    const root = document.createElement('section');
    root.id = 'afaq-audio-studio';
    root.dir = 'rtl';

    Object.assign(root.style, {
      position: 'fixed',
      bottom: '16px',
      left: '16px',
      zIndex: '99999',
      background: '#ffffff',
      color: '#173b70',
      padding: '18px',
      borderRadius: '16px',
      boxShadow: '0 5px 25px #0003',
      maxWidth: '320px',
      fontFamily: 'Tajawal, sans-serif'
    });

    root.innerHTML = `
      <h3>استوديو آفاق الصوتي</h3>
      <p>تسجيل المقطع: <strong style="font-size:32px">${CLIP_TEXT}</strong></p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button id="afaq-record">سجّل</button>
        <button id="afaq-listen">استمع</button>
        <button id="afaq-approve">اعتمد</button>
        <button id="afaq-retry">أعِد التسجيل</button>
      </div>
      <p id="afaq-record-status" role="status">جاهز للتسجيل</p>
    `;

    document.body.appendChild(root);

    const status = root.querySelector('#afaq-record-status');
    const record = root.querySelector('#afaq-record');
    const listen = root.querySelector('#afaq-listen');
    const approve = root.querySelector('#afaq-approve');
    const retry = root.querySelector('#afaq-retry');

    async function startRecording() {
      try {
        stopPlayback();

        if (!navigator.mediaDevices?.getUserMedia ||
            !window.MediaRecorder) {
          status.textContent = 'المتصفح لا يدعم التسجيل.';
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });

        chunks = [];
        recorder = new MediaRecorder(stream);

        recorder.ondataavailable = event => {
          if (event.data.size) chunks.push(event.data);
        };

        recorder.onstop = () => {
          draft = new Blob(chunks, {
            type: recorder.mimeType || 'audio/webm'
          });

          stream.getTracks().forEach(track => track.stop());
          stream = null;

          status.textContent = 'تم التسجيل. استمع ثم اعتمد.';
          record.textContent = 'سجّل';
          approve.disabled = false;
        };

        recorder.start();
        record.textContent = 'إيقاف التسجيل';
        status.textContent = 'جارٍ التسجيل...';
      } catch (error) {
        status.textContent = 'تعذّر تشغيل الميكروفون: ' + error.message;
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
        const blob = draft || await getClip();

        if (!blob) {
          status.textContent = 'لا يوجد تسجيل للاستماع.';
          return;
        }

        await playBlob(blob);
        status.textContent = 'جارٍ تشغيل التسجيل.';
      } catch (error) {
        status.textContent = 'تعذّر تشغيل الصوت: ' + error.message;
      }
    };

    approve.onclick = async () => {
      if (!draft || recorder?.state === 'recording') return;

      try {
        await saveClip(draft);
        draft = null;
        status.textContent = 'تم اعتماد التسجيل وحفظه على هذا الجهاز.';
        approve.disabled = true;
      } catch (error) {
        status.textContent = 'تعذّر حفظ التسجيل: ' + error.message;
      }
    };

    retry.onclick = () => {
      stopPlayback();
      draft = null;
      approve.disabled = true;
      status.textContent = 'جاهز لإعادة التسجيل.';
    };

    approve.disabled = true;
  }

  window.AfaqAudioStudio = { mount, getClip };

})();
