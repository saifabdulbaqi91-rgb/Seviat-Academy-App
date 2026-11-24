/* Public read-only speech playback. Owner tooling remains in arabic-speech.js locally. */
(function(host){'use strict';
const instructions={welcome:'اِضْغَطِ الزِّرَّ الْكَبِيرَ لِنَبْدَأَ.',diagnostic:'اُنْظُرْ إِلَى النَّمُوذَجِ، ثُمَّ اخْتَرِ الْبِطَاقَةَ الْمُنَاسِبَةَ.',matching:'اِخْتَرِ الْبِطَاقَةَ الَّتِي تُشْبِهُ النَّمُوذَجَ.',choose:'اُنْظُرْ جَيِّدًا، ثُمَّ اخْتَرْ إِجَابَتَكَ.',memory:'اُنْظُرْ وَاحْفَظْ، ثُمَّ اخْتَرْ مَا تَتَذَكَّرُهُ.',listening:'اِضْغَطْ اِسْتَمِعْ، ثُمَّ اخْتَرْ بَعْدَ انْتِهَاءِ الصَّوْتِ.',construction:'اُنْظُرْ إِلَى الْبِطَاقَاتِ، ثُمَّ اخْتَرْ تَرْكِيبَهَا.',writing:'جَرِّبِ الْكِتَابَةَ عَلَى اللَّوْحَةِ. يُمْكِنُ لِلْمُعَلِّمِ مُسَاعَدَتُكَ.',speaking:'قُلْ مَا تَعْرِفُهُ بِصَوْتِكَ. لَا بَأْسَ أَنْ تُجَرِّبَ مَرَّةً أُخْرَى.'};
function identity(text){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16);}
function prepare({id,display,spoken=display,category='instruction',reading='connected'}){if(typeof display!=='string'||typeof spoken!=='string'||!spoken.trim()||spoken.length>1200||!['connected','pause'].includes(reading))throw Error('Invalid speech text');return {version:1,id:id||'text:'+identity(display),display,spoken:spoken.normalize('NFC').replace(/[\t\n ]+/g,' ').trim(),category,reading,needsHumanReview:true};}
function reviewedEntry(raw,saved){if(saved?.version===1&&saved.display===raw.display){try{return prepare(saved);}catch{}}return raw;}
function modelExample(skill,text){const category=['letter-name','letter-shape','letter-positions','letter-detection'].includes(skill)?'letter-name':['letter-sound','short-vowels'].includes(skill)?'letter-sound':skill==='long-vowels'?'long-vowel':skill==='sukoon'?'sukoon':['sound-analysis','syllable-building'].includes(skill)?'syllable':['word-reading','word-writing','word-building'].includes(skill)?'word':null;return category&&typeof text==='string'&&text.trim()?prepare({id:'example:'+skill+':'+identity(text),display:text,category}):null;}
function signature(entry,voice,rate){return JSON.stringify([1,entry.id,entry.display,entry.spoken,entry.category,entry.reading,voice?.voiceURI,voice?.name,voice?.lang,rate]);}
function localArabic(voices){return (voices||[]).filter(v=>v&&/^ar(?:[-_]|$)/i.test(v.lang)&&v.localService===true);}
// General fallback is limited to ordinary guidance. Curated literacy entries
// below have explicit vocabulary and remain unreviewed.
function ordinary(entry){const instructionText=(entry?.spoken||entry?.display||'').replace(/(^|[.؟!]\s*)مَ?ا(?=\s+(?:اسْم|اسم|نَوْع|نوع|عَلَامَة|علامة)(?:[\u064b-\u065f]|\s|$))/gu,'$1');if(/(?:^|[\s:\u060c\u00ab\x22(])[\u0621-\u064a][\u064B-\u065F\u0670]*(?:[\u0627\u0648\u064a][\u064B-\u065F\u0670]*)?(?=$|[\s.\u060c\u061f!\u00bb:;)])/u.test(instructionText))return false;const words=typeof entry?.display==='string'?(entry.display.replace(/[\u064B-\u065F\u0670]/g,'').match(/[\u0621-\u064A]+/g)||[]):[];return !!entry&&((entry.category==='instruction'&&Object.hasOwn(instructions,entry.id.replace(/^instruction:/,''))&&entry.id.startsWith('instruction:'))||(entry.category==='question'&&(entry.id.startsWith('question:')||entry.id.startsWith('question-id:'))&&words.length>=2&&words.some(w=>w.length>=3)));}
// Scoped delivery fallback: use the existing engine for the first letter only.
// These drafts never imply human approval and never alter mastery evidence.
function meemLessonEntry(kind,text){
 const sounds={'م':'مِيمْ','ميم':'مِيمْ','مَ':'مَ','مِ':'مِ','مُ':'مُ','مَا':'مَا','مِي':'مِي','مُو':'مُو'};
 let spoken,category;
 if(kind==='model'&&Object.hasOwn(sounds,text)){spoken=sounds[text];category=['م','ميم'].includes(text)?'letter-name':text.length===2?'letter-sound':'long-vowel';}
 else if(kind==='question'&&typeof text==='string'&&text.trim()&&text.length<500){spoken=text.replace(/(^|[^\u0621-\u064a\u064b-\u065f])م(?=$|[^\u0621-\u064a\u064b-\u065f])/gu,'$1مِيمْ');category='question';}
 else if(kind==='feedback'&&['أَحْسَنْتَ!','لِنُحَاوِلْ مَرَّةً أُخْرَى.'].includes(text)){spoken=text;category='feedback';}
 else return null;
 return prepare({id:'lesson:meem:'+kind+':'+identity(text),display:text,spoken,category});
}
function automaticMeem(entry){const kind=entry?.id?.split(':')[2],expected=meemLessonEntry(kind,entry?.display);return !!expected&&entry.id===expected.id&&entry.spoken===expected.spoken&&entry.category===expected.category&&entry.reading===expected.reading;}
// Only letters already present in the active journey. This does not grant access.
const literacyNames={
 "م":{"name":"ميم","spoken":"مِيمْ","questionName":"الْمِيمَ"},
 "ب":{"name":"باء","spoken":"بَاءْ","questionName":"الْبَاءَ"},
 "ل":{"name":"لام","spoken":"لَامْ","questionName":"اللَّامَ"},
 "د":{"name":"دال","spoken":"دَالْ","questionName":"الدَّالَ"},
 "ن":{"name":"نون","spoken":"نُونْ","questionName":"النُّونَ"},
 "ر":{"name":"راء","spoken":"رَاءْ","questionName":"الرَّاءَ"},
 "ص":{"name":"صاد","spoken":"صَادْ","questionName":"الصَّادَ"},
 "ف":{"name":"فاء","spoken":"فَاءْ","questionName":"الْفَاءَ"},
 "س":{"name":"سين","spoken":"سِينْ","questionName":"السِّينَ"},
 "ق":{"name":"قاف","spoken":"قَافْ","questionName":"الْقَافَ"},
 "ت":{"name":"تاء","spoken":"تَاءْ","questionName":"التَّاءَ"},
 "ح":{"name":"حاء","spoken":"حَاءْ","questionName":"الْحَاءَ"},
 "أ":{"name":"ألف","spoken":"أَلِفْ","questionName":"ألف"},
 "ط":{"name":"طاء","spoken":"طَاءْ","questionName":"طاء"},
 "ز":{"name":"زاي","spoken":"زَايْ","questionName":"زاي"},
 "و":{"name":"واو","spoken":"وَاوْ","questionName":"واو"},
 "ج":{"name":"جيم","spoken":"جِيمْ","questionName":"جيم"},
 "ش":{"name":"شين","spoken":"شِينْ","questionName":"شين"},
 "ض":{"name":"ضاد","spoken":"ضَادْ","questionName":"ضاد"},
 "ع":{"name":"عين","spoken":"عَيْنْ","questionName":"عين"},
 "ك":{"name":"كاف","spoken":"كَافْ","questionName":"كاف"},
 "خ":{"name":"خاء","spoken":"خَاءْ","questionName":"خاء"},
 "ي":{"name":"ياء","spoken":"يَاءْ","questionName":"ياء"},
 "ذ":{"name":"ذال","spoken":"ذَالْ","questionName":"ذال"},
 "ه":{"name":"هاء","spoken":"هَاءْ","questionName":"هاء"},
 "ث":{"name":"ثاء","spoken":"ثَاءْ","questionName":"ثاء"},
 "غ":{"name":"غين","spoken":"غَيْنْ","questionName":"غين"},
 "ظ":{"name":"ظاء","spoken":"ظَاءْ","questionName":"ظاء"}
};
function literacyLessonEntry(letter,kind,text){
 if(letter==='م')return meemLessonEntry(kind,text); // preserve existing reviews/recording IDs
 const info=literacyNames[letter];if(!info)return null;
 let spoken,category;
 const models=letter==='أ'?['أ',info.name,'أَ','إِ','أُ','آ','إِي','أُو']:[letter,info.name,letter+'َ',letter+'ِ',letter+'ُ',letter+'َا',letter+'ِي',letter+'ُو'];
 if(kind==='model'&&models.includes(text)){
  spoken=[letter,info.name].includes(text)?info.spoken:text;
  category=[letter,info.name].includes(text)?'letter-name':models.slice(2,5).includes(text)?'letter-sound':'long-vowel';
 }else if(kind==='question'&&typeof text==='string'&&text.trim()&&text.length<500){
  spoken=text.replace(new RegExp('(^|[^\\u0621-\\u064a\\u064b-\\u065f])'+letter+'(?=$|[^\\u0621-\\u064a\\u064b-\\u065f])','gu'),'$1'+info.spoken);category='question';
 }else if(kind==='feedback'&&['أَحْسَنْتَ!','لِنُحَاوِلْ مَرَّةً أُخْرَى.'].includes(text)){spoken=text;category='feedback';}
 else return null;
 return prepare({id:'lesson:literacy:'+letter+':'+kind+':'+identity(text),display:text,spoken,category});
}
function automaticLiteracy(entry){const parts=entry?.id?.split(':')||[],expected=parts[1]==='literacy'&&literacyLessonEntry(parts[2],parts[3],entry.display);return !!expected&&entry.id===expected.id&&entry.spoken===expected.spoken&&entry.category===expected.category&&entry.reading===expected.reading;}
function playbackChoice(entry,voices,rate,reviews,history=null){if(!entry||!reviews)return null;const local=localArabic(voices).filter(v=>!['rejected','recording-needed'].includes(history?.resolve(entry,v,rate)?.event.decision));for(const voice of local){const reviewed=history?.resolve(entry,voice,rate);if(reviewed?.event.decision==='approved')return {entry:reviewed.entry,voice,reviewed:true};}const approved=local.find(v=>reviews.approved(entry,v,rate));if(approved)return {entry,voice:approved,reviewed:true};const saved=reviews.read().entries[entry.id];if(saved?.status==='rejected'&&saved.display===entry.display)return null;if(!ordinary(entry)&&!automaticMeem(entry)&&!automaticLiteracy(entry))return null;const voice=local.find(v=>/^ar[-_]SA$/i.test(v.lang))||local.find(v=>v.default)||local[0];return voice?{entry,voice,reviewed:false}:null;}
function validationCases(){const entries=[];const names=['مِيمْ','بَاءْ','لَامْ','دَالْ','نُونْ','رَاءْ','صَادْ','فَاءْ','سِينْ','قَافْ','تَاءْ','حَاءْ'];'مبلدنرصفسقتح'.split('').forEach((letter,i)=>entries.push(prepare({id:'name:'+letter,display:letter,spoken:names[i],category:'letter-name',reading:'pause'})));for(const [id,text,category,reading]of [['fatha','مَ','letter-sound'],['kasra','مِ','letter-sound'],['damma','مُ','letter-sound'],['long-a','مَا','long-vowel'],['long-i','مِي','long-vowel'],['long-u','مُو','long-vowel'],['sukoon','مْ','sukoon'],['shadda','مَدَّ','shadda'],['tanwin','بَابٌ','tanwin'],['hamza','أَمَلٌ','hamza'],['word','نَمِرٌ','word'],['sentence','رَسَمَ مَامَا.','sentence'],['waqf','بَابْ','word','pause'],['wasl','بَابٌ مَرْسُومٌ.','sentence','connected']])entries.push(prepare({id:'validation:'+id,display:text,category,reading:reading||'connected'}));return entries;}
function createEngine({synth,Utterance,voices=()=>synth?.getVoices?.()||[],schedule=setTimeout,cancelTimer=clearTimeout}){
 let generation=0,current=null,finish=null,done=Promise.resolve(false);
 function stop(){generation++;const owned=!!current;current=null;finish?.(false);finish=null;if(owned)synth?.cancel?.();}
 return {voices:()=>localArabic(voices()),stop,done:()=>done,async speak(entry,voice,{rate=.85,volume=.8}={}){
  stop();if(!synth||!Utterance||!localArabic([voice]).length||!voices().some(v=>v.voiceURI===voice.voiceURI&&v.localService&&v.lang===voice.lang))return {ok:false,reason:'no-local-voice'};
  const token=generation;let complete;done=new Promise(r=>complete=r);
  return new Promise(resolve=>{let started=false,settled=false,attempt=0,retryTimer,timer,endTimer;const settle=r=>{if(!settled){settled=true;resolve(r);}};const clear=()=>{cancelTimer(timer);cancelTimer(retryTimer);cancelTimer(endTimer);};
   finish=value=>{clear();complete(value);settle({ok:false,reason:'cancelled'});};
   function issue(){const serial=++attempt,u=new Utterance(entry.spoken);current=u;u.voice=voice;u.lang=voice.lang;u.rate=rate;u.volume=Math.max(0,Math.min(1,volume));const active=()=>token===generation&&serial===attempt;
    u.onstart=()=>{if(!active()||started)return;started=true;clear();endTimer=schedule(()=>{if(active())stop();},Math.max(10000,Math.min(180000,entry.spoken.length*180/rate)));settle({ok:true});};
    u.onend=()=>{if(!active())return;clear();complete(started);finish=null;current=null;settle({ok:started,reason:started?undefined:'failed'});};
    u.onerror=e=>{console.error('AFAQ NATIVE SPEECH ERROR', {error:e.error,active:active(),voice:u.voice?.name});if(!active())return;clear();current=null;finish=null;complete(false);settle({ok:false,reason:e.error==='not-allowed'?'blocked':'failed'});};
    try{if(synth.paused)synth.resume?.();synth.speak(u);}catch(error){console.error('AFAQ SPEECH EXCEPTION:',error);clear();settle({ok:false,reason:'failed'});stop();}
   }
   // Do not retry native requests automatically: a delayed first request can overlap
   // its retry. Keep the 8s deadline and let the accessible replay/fallback handle it.
   retryTimer=null; // Disable early retry; retain the existing 8-second timeout.
   timer=schedule(()=>{if(token===generation&&!started&&!settled){settle({ok:false,reason:'start-timeout'});stop();}},8000);issue();
  });
 }};
}
function pronunciationRecordingKey(entry){return entry&&['letter-name','letter-sound','long-vowel','sukoon','syllable','word'].includes(entry.category)?'text:pronunciation-v1:'+JSON.stringify([prepare(entry).spoken,entry.category,entry.reading]):null;}
function reviewVoiceKey(voice){return JSON.stringify(voice?[voice.voiceURI,voice.name,voice.lang,voice.localService]:null);}

function reviewGroupKey(entry,voice,rate){return JSON.stringify([entry.spoken.normalize('NFC'),entry.category,entry.reading,voice?.voiceURI||null,voice?.name||null,voice?.lang||null,rate]);}
function groupPronunciations(items,voice,rate){const groups=new Map();for(const item of items){const key=reviewGroupKey(item.entry,voice,rate);if(!groups.has(key))groups.set(key,{key,items:[]});groups.get(key).items.push(item);}return [...groups.values()];}
function reviewBatchSignature(entries,voice,rate){return JSON.stringify(entries.map(e=>signature(e,voice,rate)).sort());}
function validatePronunciationHistory(value){
 try{
  if(!value||value.version!==1||!Array.isArray(value.events))return false;
  const text=(v,max=1200)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
  return value.events.every(event=>{
   if(!event||event.version!==1||!['approved','rejected','recording-needed'].includes(event.decision)||!text(event.reviewer,2000)||typeof event.at!=='string'||!Number.isFinite(Date.parse(event.at))||!Number.isFinite(event.rate)||event.rate<.65||event.rate>1.1||!Array.isArray(event.entries)||!event.entries.length)return false;
   const v=event.voice;
   if(v===null){if(event.decision!=='recording-needed')return false;}else if(!v||!text(v.voiceURI,2000)||!text(v.name,2000)||!text(v.lang,100)||v.localService!==true||!/^ar(?:[-_]|$)/i.test(v.lang))return false;
   if(new Set(event.entries.map(row=>row?.id)).size!==event.entries.length)return false;
   if(!event.entries.every(row=>row&&row.version===1&&text(row.id,4096)&&text(row.display)&&text(row.spoken)&&text(row.sourceSpoken)&&text(row.category,100)&&['connected','pause'].includes(row.reading)&&row.spoken===prepare(row).spoken&&row.signature===signature(prepare(row),v,event.rate)))return false;
   return new Set(event.entries.map(row=>reviewGroupKey(row,v,event.rate))).size===1;
  });
 }catch{return false;}
}

let broken=false,value={version:1,entries:{},preferences:{questionReading:false,pronunciationExamples:false,rate:.85,music:false}},history={version:1,events:[]};
try{const raw=localStorage.getItem('afaq-speech-reviews-v1');if(raw!==null)value=JSON.parse(raw);if(value?.version!==1||!value.entries||!value.preferences||!Number.isFinite(value.preferences.rate)||value.preferences.rate<.65||value.preferences.rate>1.1)throw Error('Invalid preferences');const h=localStorage.getItem('afaq-pronunciation-review-v1');if(h!==null)history=JSON.parse(h);if(!validatePronunciationHistory(history))throw Error('Invalid history');}catch{broken=true;}
const reviews={read:()=>structuredClone(value),approved(e,v,r){const x=value.entries[e.id];return x?.status==='approved'&&x.signature===signature(e,v,r)&&!!x.reviewer?.trim()&&Number.isFinite(Date.parse(x.reviewedAt));}};
const reviewHistory={resolve(entry,voice,rate){for(const event of [...history.events].reverse()){const row=event.entries.find(r=>event.rate===rate&&reviewVoiceKey(event.voice)===reviewVoiceKey(voice)&&r.id===entry.id&&r.display===entry.display&&r.category===entry.category&&r.reading===entry.reading&&r.sourceSpoken===entry.spoken);if(row)return {event,entry:prepare(row)};}return null;}};
const engine=createEngine({synth:host.speechSynthesis,Utterance:host.SpeechSynthesisUtterance}),candidates=new Map();
for(const [kind,text]of Object.entries(instructions))candidates.set('instruction:'+kind,prepare({id:'instruction:'+kind,display:text,spoken:text}));
for(const e of validationCases())candidates.set(e.id,e);
function settings(){return reviews?.read().preferences||{questionReading:false,pronunciationExamples:false,rate:.85,music:false};}
function candidate(id,display,category='question'){const old=candidates.get(id);if(old?.display===display)return old;const e=prepare({id,display,category});candidates.set(id,e);return e;}
function lessonCandidate(kind,text,letter='م'){const e=literacyLessonEntry(letter,kind,text);if(e)candidates.set(e.id,e);return e;}
function entry(id){const raw=candidates.get(id);if(!raw)return null;const saved=reviews?.read().entries[id];return reviewedEntry(raw,saved);}
function selection(id){const picked=playbackSelection(id);return picked?.reviewed?picked:null;}
function playbackSelection(id){return broken?null:playbackChoice(entry(id),engine.voices(),settings().rate,reviews,reviewHistory);}
function availability(id){const supported=!!host.speechSynthesis&&!!host.SpeechSynthesisUtterance,picked=playbackSelection(id),voices=engine.voices();return {supported,reason:!supported?'unsupported':broken?'preferences-unreadable':picked?'available':!voices.length?'no-local-voice':reviews.read().entries[id]?.status==='rejected'?'rejected':'unapproved',voices:voices.map(v=>({name:v.name,lang:v.lang,localService:v.localService,voiceURI:v.voiceURI})),selected:picked?.voice.name||null,reviewed:!!picked?.reviewed};}

async function clip(id){const e=entry(id),key=pronunciationRecordingKey(e);if(key){const blob=await host.AfaqAudioLibrary?.getClip(key);if(blob instanceof Blob&&blob.size)return {id,blob,approved:true};}
return new Promise(resolve=>{const request=indexedDB.open('afaq-instruction-overrides-v1',1);request.onupgradeneeded=()=>request.transaction.abort();request.onerror=()=>resolve(null);request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains('clips')){db.close();resolve(null);return;}const tx=db.transaction('clips','readonly'),r=tx.objectStore('clips').get(id);r.onsuccess=()=>{const c=r.result;resolve(c?.version===1&&c.approved===true&&c.blob instanceof Blob&&c.blob.size>0&&c.blob.size<=2*1024*1024&&c.blob.type.startsWith('audio/')&&c.reviewer?.trim()&&c.display===e?.display&&Number.isFinite(Date.parse(c.reviewedAt))?c:null);};r.onerror=()=>resolve(null);tx.oncomplete=()=>db.close();};});}
function stop(){host.AfaqTestingAudio?.release(stop);engine.stop();host.AfaqAudioLibrary?.stop();host.SeviatEffects?.stop();}
async function speak(id,options={}){if(!host.speechSynthesis||!host.SpeechSynthesisUtterance)return {ok:false,reason:'unsupported'};const picked=playbackSelection(id);if(!picked)return {ok:false,reason:engine.voices().length?'unapproved':'no-local-voice'};host.SeviatSound?.stop();document.querySelectorAll('audio').forEach(a=>a.pause());const volume=options.volume??.8;if(host.AfaqTestingAudio?.settings().muted||volume<=0)return {ok:false,reason:'muted'};host.AfaqTestingAudio?.claim(stop);return engine.speak(picked.entry,picked.voice,{rate:settings().rate,volume});}

host.AfaqSpeech=Object.freeze({settings,entry,candidate,lessonCandidate,selection,playbackSelection,availability,speak,stop,done:()=>engine.done(),voices:()=>engine.voices(),clip,dispose:stop});
host.addEventListener('pagehide',stop);
})(window);
