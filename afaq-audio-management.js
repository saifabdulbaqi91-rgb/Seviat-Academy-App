(function () {
  'use strict';

  const DB_NAME = 'afaq-audio-studio-v1';
  const STORE = 'clips';

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        request.transaction.abort();
        reject(new Error('قاعدة التسجيلات غير موجودة'));
      };
    });
  }

  async function dbAction(mode, callback) {
    const db = await openDB();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        let result;
        try {
          const request = callback(store);
          request.onsuccess = () => { result = request.result; };
          request.onerror = () => reject(request.error);
        } catch (error) {
          tx.abort();
          reject(error);
        }
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  }

  function readAsDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function exportBackup() {
    const ids = await window.AfaqAudioLibrary.listIds();
    const clips = [];

    for (const id of ids) {
      const blob = await window.AfaqAudioLibrary.getClip(id);
      if (blob) {
        clips.push({
          id,
          data: await readAsDataURL(blob)
        });
      }
    }

    if (!clips.length) {
      alert('لا توجد تسجيلات لتصديرها.');
      return;
    }

    const backup = {
      format: 'afaq-audio-backup-v1',
      exportedAt: new Date().toISOString(),
      clips
    };

    const file = new Blob(
      [JSON.stringify(backup)],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'afaq-audio-backup-' +
      new Date().toISOString().slice(0, 10) + '.json';

    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    alert('تم تجهيز نسخة احتياطية من ' +
      clips.length + ' تسجيلات.');
  }

  async function importBackup(file) {
    if (!file) return;

    const backup = JSON.parse(await file.text());

    if (
      backup.format !== 'afaq-audio-backup-v1' ||
      !Array.isArray(backup.clips)
    ) {
      throw new Error('صيغة النسخة الاحتياطية غير صحيحة.');
    }

    const prepared = [];

    for (const clip of backup.clips) {
      if (
        typeof clip.id !== 'string' ||
        !/^(text:|syllable:)/.test(clip.id) ||
        typeof clip.data !== 'string' ||
        !/^data:audio\/[^,]+;base64,/.test(clip.data)
      ) {
        throw new Error('توجد بيانات تسجيل غير صالحة.');
      }

      const response = await fetch(clip.data);
      const blob = await response.blob();

      if (!blob.size || !blob.type.startsWith('audio/')) {
        throw new Error('ملف صوتي غير صالح: ' + clip.id);
      }

      prepared.push({ id: clip.id, blob });
    }

    if (!prepared.length) {
      alert('النسخة الاحتياطية فارغة.');
      return;
    }

    const existingIds = await window.AfaqAudioLibrary.listIds();
    const existing = new Set(existingIds);
    const conflicts = prepared.filter(x => existing.has(x.id));

    let toImport = prepared;

    if (conflicts.length) {
      const overwrite = confirm(
        'يوجد ' + conflicts.length +
        ' تسجيلات محفوظة بالفعل.' +
        '\n\nموافق: استبدال التسجيلات الموجودة.' +
        '\nإلغاء: استعادة التسجيلات المفقودة فقط.'
      );

      if (!overwrite) {
        toImport = prepared.filter(x => !existing.has(x.id));
      }
    }

    if (!toImport.length) {
      alert('لا توجد تسجيلات مفقودة لاستعادتها.');
      return;
    }

    await dbAction('readwrite', store => {
      for (const clip of toImport) {
        store.put(clip.blob, clip.id);
      }
      return store.count();
    });

    alert('تم استيراد ' + toImport.length +
      ' تسجيلات بنجاح. سيتم تحديث الصفحة.');
    location.reload();
  }

  function makeButton(text, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.style.cssText =
      'padding:9px;min-height:40px;cursor:pointer';
    button.addEventListener('click', handler);
    return button;
  }

  function addManagement() {
    const root = document.getElementById('afaq-audio-library');
    if (!root || root.dataset.managementReady) return;

    const input = root.querySelector(
      'input[aria-label="النص المطلوب تسجيله"]'
    );

    const heading = [...root.querySelectorAll('h4')]
      .find(x => x.textContent.includes('التسجيلات المعتمدة'));

    const list = heading?.nextElementSibling;
    if (!input || !list) return;

    root.dataset.managementReady = 'true';

    const tools = document.createElement('div');
    tools.style.cssText =
      'display:grid;grid-template-columns:1fr 1fr;' +
      'gap:8px;margin:12px 0';

    const exportButton = makeButton(
      'تصدير نسخة احتياطية',
      async () => {
        try {
          await exportBackup();
        } catch (error) {
          alert('تعذر التصدير: ' + error.message);
        }
      }
    );

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.hidden = true;

    fileInput.onchange = async () => {
      try {
        await importBackup(fileInput.files[0]);
      } catch (error) {
        alert('تعذر الاستيراد: ' + error.message);
      } finally {
        fileInput.value = '';
      }
    };

    const importButton = makeButton(
      'استيراد التسجيلات',
      () => fileInput.click()
    );

    tools.append(exportButton, importButton, fileInput);
    heading.before(tools);

    function addActions() {
      for (const item of [...list.children]) {
        if (item.tagName !== 'BUTTON') continue;
        if (item.dataset.actionsReady) continue;

        item.dataset.actionsReady = 'true';

        const text = item.textContent.trim();
        const id = text === 'ق'
          ? 'syllable:qa'
          : 'text:' + text.normalize('NFC');

        const wrapper = document.createElement('div');
        wrapper.style.cssText =
          'display:flex;gap:5px;align-items:center;margin:6px 0';

        item.style.flex = '1';

        const replace = makeButton('استبدال', () => {
          item.click();
          const retry = [...root.querySelectorAll('button')]
            .find(b => b.textContent.includes('التسجيل') &&
              b.textContent.includes('أعد'));
          retry?.click();

          const record = [...root.querySelectorAll('button')]
            .find(b => b.textContent === 'سجل');
          record?.focus();
        });

        const remove = makeButton('حذف', async () => {
          if (!confirm(
            'هل تريد حذف تسجيل «' + text +
            '» نهائيا من المكتبة'
          )) return;

          try {
            await dbAction('readwrite', store => store.delete(id));
            wrapper.remove();
            alert('تم حذف تسجيل «' + text + '».');
          } catch (error) {
            alert('تعذر الحذف: ' + error.message);
          }
        });

        remove.style.color = '#b42318';
        wrapper.append(item, replace, remove);
        list.appendChild(wrapper);
      }
    }

    const listObserver = new MutationObserver(addActions);
    listObserver.observe(list, { childList: true });
    addActions();
  }

  const observer = new MutationObserver(addManagement);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  addManagement();
})();
