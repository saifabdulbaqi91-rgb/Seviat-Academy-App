(function () {
  'use strict';

  const DB_NAME = 'afaq-audio-studio-v1';
  const STORE = 'clips';
  const REVIEW_KEY='afaq-pronunciation-review-v1';
  const SpeechCore=typeof module!=='undefined'&&module.exports?require('./arabic-speech'):window.AfaqSpeechCore;
  const MAX_FILE=64*1024*1024,MAX_CLIP=16*1024*1024;
  const INVENTORY_URL='docs/recording-readiness/recording-inventory.csv';
  const MEEM_URL='docs/recording-readiness/meem-first-batch.csv';
  function parseInventoryCSV(text){
    if(typeof text!=='string'||text.length>4*1024*1024)throw Error('ملف خطة التسجيل غير صالح.');
    const rows=[];let row=[],cell='',quoted=false;
    text=text.replace(/^\uFEFF/,'');
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell)throw Error('CSV غير صالح.');else quoted=!quoted;}
      else if(!quoted&&(c===','||c==='\n'||c==='\r')){row.push(cell);cell='';if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[];}}
      else cell+=c;
    }
    if(quoted)throw Error('CSV غير مكتمل.');if(cell||row.length){row.push(cell);rows.push(row);}
    const header=rows.shift()||[],required=['recordingId','category','reading','script','runtimeIds','libraryKeys','uses'];
    if(required.some(k=>!header.includes(k))||new Set(header).size!==header.length)throw Error('أعمدة خطة التسجيل غير صالحة.');
    const seen=new Set();
    return rows.map(values=>{
      if(values.length!==header.length)throw Error('صف خطة التسجيل غير مكتمل.');
      const r=Object.fromEntries(header.map((key,i)=>[key,values[i]]));
      for(const key of ['runtimeIds','libraryKeys','uses'])r[key]=JSON.parse(r[key]);
      const entry=SpeechCore.prepare({display:r.script,category:r.category,reading:r.reading});
      if(entry.spoken!==r.script||!['instruction','question','feedback','letter-name','letter-sound','long-vowel','sukoon','syllable','word','sentence'].includes(r.category)||
        r.recordingId!=='recording-'+SpeechCore.identity(JSON.stringify([r.script,r.category,r.reading]))||seen.has(r.recordingId)||
        !Array.isArray(r.runtimeIds)||!r.runtimeIds.length||r.runtimeIds.some(id=>typeof id!=='string'||id.length>4096||/[\u0000-\u001f]/.test(id))||
        !Array.isArray(r.libraryKeys)||r.libraryKeys.some(id=>typeof id!=='string'||!id.startsWith('text:')||id.length>4096)||
        !Array.isArray(r.uses)||r.uses.some(use=>!use||typeof use!=='object'))throw Error('هوية نص التسجيل أو روابطه غير صالحة.');
      seen.add(r.recordingId);return r;
    });
  }
  // A semantic key in the EXISTING Blob store; no alias copies or new database.
  const inventoryKey=row=>'text:inventory-v1:'+JSON.stringify([row.recordingId,row.script,row.category,row.reading]);
  function describeInventoryKey(key){try{if(!key.startsWith('text:inventory-v1:'))return null;const [recordingId,script,category,reading]=JSON.parse(key.slice('text:inventory-v1:'.length));const row={recordingId,script,category,reading};return typeof script==='string'&&recordingId==='recording-'+SpeechCore.identity(JSON.stringify([script,category,reading]))&&inventoryKey(row)===key?row:null;}catch{return null;}}
  function matchesInventory(row,entry){return !!entry&&row.runtimeIds.includes(entry.id)&&entry.spoken===row.script&&entry.category===row.category&&entry.reading===row.reading;}
  function storedOverrideMatches(row,clip){return !!clip&&row.runtimeIds.includes(clip.id)&&clip.version===1&&clip.approved===true&&typeof clip.reviewer==='string'&&!!clip.reviewer.trim()&&Number.isFinite(Date.parse(clip.reviewedAt))&&typeof clip.display==='string'&&row.libraryKeys.includes('text:'+clip.display.normalize('NFC').trim());}
  function stableJSON(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(stableJSON).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableJSON(value[k])).join(',')+'}';}
  function eventKey(event){return stableJSON({...event,entries:[...event.entries].sort((a,b)=>a.signature.localeCompare(b.signature))});}
  function scopeKey(row,event){return stableJSON([row.id,row.display,row.category,row.reading,row.sourceSpoken,SpeechCore.reviewVoiceKey(event.voice),event.rate]);}
  function validateHistory(value){if(!SpeechCore?.validatePronunciationHistory(value)||value.events.length>10000||value.events.some(e=>e.entries.length>256))throw Error('سجل مراجعات النطق غير صالح أو غير مدعوم.');return value;}
  function validateBackup(backup){
    if(!backup||!['afaq-audio-backup-v1','afaq-audio-backup-v2'].includes(backup.format)||!Array.isArray(backup.clips)||backup.clips.length>2000)throw Error('صيغة النسخة الاحتياطية غير صحيحة أو غير مدعومة.');
    if(backup.exportedAt!==undefined&&(typeof backup.exportedAt!=='string'||!Number.isFinite(Date.parse(backup.exportedAt))))throw Error('تاريخ النسخة غير صالح.');
    const ids=new Set();let total=0;
    const clips=backup.clips.map(clip=>{
      if(!clip||typeof clip.id!=='string'||clip.id.length>4096||!/^(?:text:|syllable:)\S[\s\S]*$/u.test(clip.id)||/[\u0000-\u001f\u007f]/u.test(clip.id)||ids.has(clip.id)||typeof clip.data!=='string')throw Error('معرّف تسجيل مكرر أو غير صالح.');ids.add(clip.id);
      const match=/^data:(audio\/[a-z0-9.+-]+(?:;[a-z0-9=.+ "'-]+)*);base64,([a-z0-9+/]+={0,2})$/i.exec(clip.data);
      if(!match||match[2].length%4!==0)throw Error('بيانات التسجيل ليست صوتًا محليًا صالحًا.');
      let binary;try{binary=atob(match[2]);if(btoa(binary)!==match[2])throw Error();}catch{throw Error('ترميز التسجيل غير صالح.');}
      if(!binary.length||binary.length>MAX_CLIP||(total+=binary.length)>MAX_FILE)throw Error('حجم التسجيلات يتجاوز الحد المدعوم.');
      return {id:clip.id,data:clip.data,size:binary.length};
    });
    let review=null;
    if(backup.format==='afaq-audio-backup-v2')review=validateHistory(backup.pronunciationReviews);
    else if(Object.hasOwn(backup,'pronunciationReviews'))throw Error('قسم المراجعات يتطلب نسخة احتياطية بالإصدار الثاني.');
    return {clips,review};
  }
  function mergeReviewHistory(raw,incoming){
    if(incoming===null)return {raw,changed:false,added:0,duplicates:0,conflicts:0};
    validateHistory(incoming);const local=raw===null?{version:1,events:[]}:validateHistory(JSON.parse(raw));
    const known=new Set(local.events.map(eventKey)),added=[];let duplicates=0;
    for(const event of incoming.events){const key=eventKey(event);if(known.has(key)){duplicates++;continue;}known.add(key);added.push(event);}
    const latest=events=>{const map=new Map();for(const event of events)for(const row of event.entries)map.set(scopeKey(row,event),stableJSON([event.decision,row.spoken]));return map;};
    const existing=latest(local.events),restored=latest(incoming.events);let conflicts=0;for(const [key,value]of restored)if(existing.has(key)&&existing.get(key)!==value)conflicts++;
    // Imported historical events precede local history: local decisions always retain precedence.
    const merged={...local,events:[...added,...local.events]};validateHistory(merged);
    return {raw:added.length?JSON.stringify(merged):raw,changed:added.length>0,added:added.length,duplicates,conflicts};
  }
  const core={parseInventoryCSV,inventoryKey,describeInventoryKey,matchesInventory,storedOverrideMatches};
  if(typeof module!=='undefined'&&module.exports){module.exports={validateBackup,mergeReviewHistory,eventKey,scopeKey,MAX_FILE,...core};return;}

  let inventoryLoad=null,overrideLoad=null;
  const usable=blob=>blob instanceof Blob&&blob.size>0&&blob.size<=MAX_CLIP&&blob.type.startsWith('audio/');
  async function loadInventory(){
    if(!inventoryLoad)inventoryLoad=(async()=>{
      const read=async url=>{const r=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('تعذر تحميل خطة التسجيل.');return parseInventoryCSV(await r.text());};
      const [entries,firstBatch]=await Promise.all([read(INVENTORY_URL),read(MEEM_URL)]),byId=new Map(entries.map(r=>[r.recordingId,r]));
      for(const row of firstBatch)if(!byId.has(row.recordingId)||inventoryKey(byId.get(row.recordingId))!==inventoryKey(row)||stableJSON(byId.get(row.recordingId).runtimeIds)!==stableJSON(row.runtimeIds))throw Error('دفعة الميم لا تطابق خطة التسجيل.');
      const byRuntimeId=new Map();for(const row of entries)for(const id of row.runtimeIds){if(!byRuntimeId.has(id))byRuntimeId.set(id,[]);byRuntimeId.get(id).push(row);}
      return {entries,firstBatch:firstBatch.map(r=>byId.get(r.recordingId)),byRuntimeId};
    })().catch(error=>{inventoryLoad=null;throw error;});
    return inventoryLoad;
  }
  async function approvedInventoryRecording(row,{overrides=true}={}){
    const pronunciation=row.libraryKeys.filter(key=>key.startsWith('text:pronunciation-v1:'));
    for(const key of pronunciation){const blob=await window.AfaqAudioLibrary.getClip(key);if(usable(blob))return {blob,key,source:'existing-library'};}
    if(overrides){const clips=await(overrideLoad||(overrideLoad=window.AfaqSpeech.recordingSnapshot().catch(error=>{overrideLoad=null;throw error;})));const clip=clips.find(c=>storedOverrideMatches(row,c)&&usable(c.blob)&&c.blob.size<=2*1024*1024);if(clip)return {...clip,source:'existing-override'};}
    const keys=[inventoryKey(row),...row.libraryKeys.filter(key=>!pronunciation.includes(key))];
    for(const key of [...new Set(keys)]){const blob=await window.AfaqAudioLibrary.getClip(key);if(usable(blob))return {blob,key,source:key===keys[0]?'inventory':'existing-library'};}
    return null;
  }
  async function inventoryClip(entry){
    if(!entry)return null;
    const loaded=await loadInventory(),row=loaded.byRuntimeId.get(entry.id)?.find(row=>matchesInventory(row,entry));
    if(!row)return null;
    const clip=await approvedInventoryRecording(row);return clip?{...clip,id:entry.id,approved:true,library:true}:null;
  }
  async function inventoryStatuses(rows){
    return new Map(await Promise.all(rows.map(async row=>{try{return [row.recordingId,{state:await approvedInventoryRecording(row)?'approved':'missing'}];}catch{return [row.recordingId,{state:'unknown'}];}})));
  }
  window.addEventListener('afaq-instruction-settings',()=>{overrideLoad=null;});
  window.AfaqAudioManagement={...core,loadInventory,approvedInventoryRecording,inventoryClip,inventoryStatuses,exportBackup,importBackup};


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

  async function dbAction(mode, callback) {return authorizedBackup(async check => {
    const db = await openDB();
    let tx;
    const revoke = () => { if (tx && mode === 'readwrite') try { tx.abort(); } catch {} };
    window.addEventListener('afaq-adult-locked', revoke);
    try {
      check();
      return await new Promise((resolve, reject) => {
        tx = db.transaction(STORE, mode);
        let result, failure;
        const fail = error => { failure = error; try { tx.abort(); } catch {} reject(error); };
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(failure || tx.error || new Error('Audio transaction failed'));
        tx.onabort = () => reject(failure || tx.error || new Error('Audio transaction aborted'));
        try {
          check();
          const request = callback(tx.objectStore(STORE));
          request.onsuccess = () => { try { check(); result = request.result; } catch (error) { fail(error); } };
          request.onerror = () => fail(request.error);
        } catch (error) { fail(error); }
      });
    } finally {
      window.removeEventListener('afaq-adult-locked', revoke);
      db.close();
    }
  });}

  function readAsDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  // A new adult login must not revive a backup operation revoked during an await.
  async function authorizedBackup(work) {
    window.AfaqAdult.assert();
    let revoked = false;
    const revoke = () => { revoked = true; };
    const check = () => { if (revoked) throw new Error('Adult operation revoked'); window.AfaqAdult.assert(); };
    window.addEventListener('afaq-adult-locked', revoke);
    try { return await work(check); }
    finally { window.removeEventListener('afaq-adult-locked', revoke); }
  }

  async function clipSnapshot(check){
    await window.AfaqAudioLibrary.listIds();check(); // Also ensures the existing library database is initialized.
    const db=await openDB();check();
    try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE),keys=store.getAllKeys(),values=store.getAll();
      tx.oncomplete=()=>{try{check();resolve(keys.result.map((id,i)=>({id,blob:values.result[i]})));}catch(e){reject(e);}};
      tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('تعذر قراءة التسجيلات.'));
    });}finally{db.close();}
  }
  async function exportBackup(){return authorizedBackup(async check=>{
    const reviewRaw=localStorage.getItem(REVIEW_KEY),pronunciationReviews=validateHistory(reviewRaw===null?{version:1,events:[]}:JSON.parse(reviewRaw));
    const stable=()=>{check();if(localStorage.getItem(REVIEW_KEY)!==reviewRaw)throw Error('تغير سجل المراجعات أثناء التصدير. أعد المحاولة.');};
    const snapshot=await clipSnapshot(stable),clips=[];stable();
    for(const item of snapshot){if(!(item.blob instanceof Blob))throw Error('يوجد تسجيل غير صالح؛ لم تُحذف البيانات.');const data=await readAsDataURL(item.blob);stable();clips.push({id:item.id,data});}
    if(!clips.length&&!pronunciationReviews.events.length){alert('لا توجد تسجيلات أو مراجعات لتصديرها.');return null;}
    const backup={format:'afaq-audio-backup-v2',exportedAt:new Date().toISOString(),clips,pronunciationReviews};validateBackup(backup);
    const file=new Blob([JSON.stringify(backup)],{type:'application/json'});if(file.size>MAX_FILE)throw Error('حجم النسخة يتجاوز الحد المدعوم.');
    const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download='afaq-audio-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(link);
    try{stable();link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
    alert('تم تصدير '+clips.length+' تسجيلات و'+pronunciationReviews.events.length+' قرارات مراجعة، بما فيها علامات الحاجة إلى تسجيل بشري.');return backup;
  });}
  async function commitRestore(clips,reviewRaw,merged,check){
    const unchanged=()=>{check();if(localStorage.getItem(REVIEW_KEY)!==reviewRaw)throw Error('تغير سجل المراجعات في نافذة أخرى. أعد الاستيراد.');};
    unchanged();
    if(!clips.length){if(merged.changed){unchanged();localStorage.setItem(REVIEW_KEY,merged.raw);}return;}
    const db=await openDB();let tx,wroteHistory=false;const revoke=()=>{try{tx?.abort();}catch{}};window.addEventListener('afaq-adult-locked',revoke);
    try{unchanged();await new Promise((resolve,reject)=>{
      tx=db.transaction(STORE,'readwrite');const store=tx.objectStore(STORE);let pending=clips.length,failure=null;
      const fail=e=>{failure=e;try{tx.abort();}catch{}};
      tx.oncomplete=resolve;tx.onerror=()=>{failure=failure||tx.error;};
      tx.onabort=()=>{
        let rollbackFailure=false;
        if(wroteHistory){try{if(localStorage.getItem(REVIEW_KEY)===merged.raw){if(reviewRaw===null)localStorage.removeItem(REVIEW_KEY);else localStorage.setItem(REVIEW_KEY,reviewRaw);}else rollbackFailure=true;}catch{rollbackFailure=true;}}
        reject(rollbackFailure?Error('توقفت الاستعادة. لم تُستبدل البيانات المحلية، لكن قد تبقى مراجعات مستوردة لأن السجل تغير أثناء العملية. راجع التاريخ قبل إعادة المحاولة.'):failure||Error('أُلغيت الاستعادة دون حفظ التسجيلات.'));
      };
      for(const item of clips){const read=store.get(item.id);read.onerror=()=>fail(read.error);read.onsuccess=()=>{try{
        unchanged();if(read.result!==undefined)throw Error('ظهر تسجيل بنفس المعرّف أثناء الاستعادة؛ لم يتم استبداله.');
        const write=store.add(item.blob,item.id);write.onerror=()=>fail(write.error);write.onsuccess=()=>{try{unchanged();if(--pending===0&&merged.changed){localStorage.setItem(REVIEW_KEY,merged.raw);wroteHistory=true;check();}}catch(e){fail(e);}};
      }catch(e){fail(e);}};}
    });}finally{window.removeEventListener('afaq-adult-locked',revoke);db.close();}
  }
  async function importBackup(file){return authorizedBackup(async check=>{
    if(!file)return null;if(file.size>MAX_FILE)throw Error('حجم النسخة يتجاوز الحد المدعوم.');
    const text=await file.text();check();if(new Blob([text]).size>MAX_FILE)throw Error('حجم النسخة يتجاوز الحد المدعوم.');
    const parsed=validateBackup(JSON.parse(text)),prepared=[];
    // Validate the entire document before decoding or writing any record.
    for(const clip of parsed.clips){const response=await fetch(clip.data);check();if(!response.ok)throw Error('تعذر قراءة التسجيل.');const blob=await response.blob();check();if(blob.size!==clip.size||!blob.type.startsWith('audio/'))throw Error('ملف صوتي غير صالح.');prepared.push({id:clip.id,blob});}
    const reviewRaw=localStorage.getItem(REVIEW_KEY),merged=mergeReviewHistory(reviewRaw,parsed.review);
    const existing=prepared.length?new Set(await window.AfaqAudioLibrary.listIds()):new Set();check();
    const missing=prepared.filter(c=>!existing.has(c.id)),kept=prepared.length-missing.length;
    const summary={recordingsAdded:missing.length,recordingsKept:kept,reviewsAdded:merged.added,reviewsDuplicate:merged.duplicates,reviewConflicts:merged.conflicts,changed:missing.length>0||merged.changed};
    if(!summary.changed){alert('لا توجد بيانات جديدة. بقيت التسجيلات والمراجعات المحلية دون تغيير.');return summary;}
    const proceed=confirm('استعادة نسخة الصوت:\nتسجيلات جديدة: '+missing.length+'\nتسجيلات موجودة ستبقى دون استبدال: '+kept+'\nقرارات مراجعة ستضاف للتاريخ: '+merged.added+'\nقرارات مكررة ستُتجاهل: '+merged.duplicates+'\nإعدادات مراجعة متعارضة: '+merged.conflicts+'\n\nعند التعارض تبقى القرارات المحلية هي النافذة؛ المراجعات المستوردة تحفظ كتاريخ سابق. لن يتغير تقدم الطالب أو إعداداته.\n\nموافق: تنفيذ الإضافات المذكورة. إلغاء: عدم استعادة أي شيء.');
    check();if(!proceed)return {...summary,changed:false,cancelled:true};
    await commitRestore(missing,reviewRaw,merged,check);
    alert('اكتملت الاستعادة: '+missing.length+' تسجيلات جديدة و'+merged.added+' قرارات مراجعة. لم تُستبدل التسجيلات أو القرارات المحلية.');return summary;
  });}

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
        const result=await importBackup(fileInput.files[0]);if(result?.changed)location.reload();
      } catch (error) {
        alert('تعذر الاستيراد: ' + error.message);
      } finally {
        fileInput.value = '';
      }
    };

    const importButton = makeButton(
      'استيراد التسجيلات والمراجعات',
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
        const id = item.dataset.audioId || (text === 'ق'
          ? 'syllable:qa'
          : 'text:' + text.normalize('NFC'));

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
        if(id.startsWith('text:inventory-v1:')){replace.disabled=true;replace.title='التسجيل المعتمد للخطة محفوظ دون استبدال.';}

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
