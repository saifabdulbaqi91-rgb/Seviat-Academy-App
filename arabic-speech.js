/* Local-only speech preparation/review. No automatic diacritizer or pronunciation scoring. */
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
function createReviews(storage,key='afaq-speech-reviews-v1'){let raw=storage.getItem(key),value=raw===null?{version:1,entries:{},preferences:{questionReading:false,pronunciationExamples:false,rate:.85,music:false}}:JSON.parse(raw);const valid=v=>v?.version===1&&v.entries&&typeof v.entries==='object'&&!Array.isArray(v.entries)&&v.preferences&&typeof v.preferences.questionReading==='boolean'&&typeof v.preferences.pronunciationExamples==='boolean'&&Number.isFinite(v.preferences.rate)&&v.preferences.rate>=.65&&v.preferences.rate<=1.1&&typeof v.preferences.music==='boolean';if(!valid(value))throw Error('Unreadable speech reviews');function save(next){if(storage.getItem(key)!==raw)throw Error('Speech preferences changed elsewhere');if(!valid(next))throw Error('Invalid speech preferences');const bytes=JSON.stringify(next);storage.setItem(key,bytes);raw=bytes;value=next;return structuredClone(value);}return {read:()=>structuredClone(value),preferences:patch=>save({...value,preferences:{...value.preferences,...patch}}),review(entry,voice,rate,status,reviewer){if(typeof window!=='undefined')window.AfaqAdult.assert();if(!['approved','rejected'].includes(status)||!reviewer.trim()||!localArabic([voice]).length)throw Error('Invalid speech review');return save({...value,entries:{...value.entries,[entry.id]:{...entry,status,reviewer:reviewer.trim(),reviewedAt:new Date().toISOString(),signature:signature(entry,voice,rate)}}});},approved(entry,voice,rate){const r=value.entries[entry.id];return r?.version===1&&r.status==='approved'&&r.signature===signature(entry,voice,rate)&&!!r.reviewer?.trim()&&Number.isFinite(Date.parse(r.reviewedAt));}};}
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
// Review inventory and append-only companion decisions. Legacy stores are never rewritten.
function pronunciationInventory(questions=[],unit2=[]){
 const items=[],seen=new Set();
 const add=(entry,letter,kind,baseline=false,source=null)=>{if(!entry)return;const key=entry.id;if(seen.has(key)){const item=items.find(x=>x.entry.id===key);if(source)item.sources.push(source);if(!item.letters.includes(letter))item.letters.push(letter);return;}seen.add(key);items.push({entry,letter,letters:[letter],kind,baseline,sources:source?[source]:[]});};
 for(const letter of Object.keys(literacyNames))for(const [kind,text]of [['name',letter],['fatha',letter+'َ'],['kasra',letter==='أ'?'إِ':letter+'ِ'],['damma',letter+'ُ'],['long-alif',letter==='أ'?'آ':letter+'َا'],['long-waw',letter+'ُو'],['long-ya',letter==='أ'?'إِي':letter+'ِي']])add(literacyLessonEntry(letter,'model',text),letter,kind,true);
 for(const q of [...questions,...unit2]){
  if(!literacyNames[q.letter])continue;
  const word=q.skill==='word-reading',text=word?(q.audioText||q.stimulus):q.audioText||(['sukoon','syllable-building'].includes(q.skill)?q.answer:null);
  if(typeof text!=='string'||!text.trim()||(!word&&(!text.includes('ْ')||(text.match(/[ء-غف-ي]/g)||[]).length<2)))continue;
  const category=word?'word':'syllable',reading=text.endsWith('ْ')?'pause':'connected';
  add(prepare({id:'review:'+category+':'+identity(text),display:text,category,reading}),q.letter,word?'word':'closed',false,q.id);
 }
 return items;
}
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
function pronunciationRecordingKey(entry){return entry&&['letter-name','letter-sound','long-vowel','sukoon','syllable','word'].includes(entry.category)?'text:pronunciation-v1:'+JSON.stringify([prepare(entry).spoken,entry.category,entry.reading]):null;}
function reviewVoiceKey(voice){return JSON.stringify(voice?[voice.voiceURI,voice.name,voice.lang,voice.localService]:null);}
function createReviewHistory(storage,{key='afaq-pronunciation-review-v1',authorize=()=>{if(typeof window!=='undefined')host.AfaqAdult.assert();},now=()=>new Date().toISOString()}={}){
 let raw=storage.getItem(key),value=raw===null?{version:1,events:[]}:JSON.parse(raw);
 const valid=validatePronunciationHistory;
 if(!valid(value))throw Error('Unreadable pronunciation review history');
 const latest=(test)=>{for(let i=value.events.length-1;i>=0;i--){const event=value.events[i],row=event.entries.find(r=>test(r,event));if(row)return {event,entry:prepare(row)};}return null;};
 return {read:()=>structuredClone(value),exact:(entry,voice,rate)=>latest((r,e)=>r.signature===signature(entry,voice,rate)),
 resolve:(entry,voice,rate)=>latest((r,e)=>e.rate===rate&&reviewVoiceKey(e.voice)===reviewVoiceKey(voice)&&r.id===entry.id&&r.display===entry.display&&r.category===entry.category&&r.reading===entry.reading&&r.sourceSpoken===entry.spoken),
 record(entries,voice,rate,decision,reviewer,{heard=false,listened=null}={}){
  authorize();if(storage.getItem(key)!==raw)throw Error('Pronunciation reviews changed elsewhere');
  if(!entries.length||!['approved','rejected','recording-needed'].includes(decision)||!reviewer?.trim()||!Number.isFinite(rate)||rate<.65||rate>1.1)throw Error('Invalid pronunciation review');
  if(decision!=='recording-needed'&&!localArabic([voice]).length)throw Error('No local review voice');
  const prepared=entries.map(e=>({...prepare(e),sourceSpoken:e.sourceSpoken??e.spoken}));if(new Set(prepared.map(e=>e.id)).size!==prepared.length||new Set(prepared.map(e=>reviewGroupKey(e,voice,rate))).size!==1)throw Error('Only equivalent unique cases may share a review');
  if(decision==='approved'&&(!heard||listened!==reviewBatchSignature(prepared,voice,rate)))throw Error('Complete listening and explicit confirmation required');
  const event={version:1,at:now(),decision,reviewer:reviewer.trim(),rate,voice:voice?{voiceURI:voice.voiceURI,name:voice.name,lang:voice.lang,localService:voice.localService}:null,entries:prepared.map(e=>({...e,signature:signature(e,voice,rate)}))};
  const next={...value,events:[...value.events,event]};if(!valid(next))throw Error('Invalid pronunciation history');authorize();storage.setItem(key,JSON.stringify(next));raw=storage.getItem(key);value=next;return structuredClone(event);
 }};
}
function createReviewListening(){let epoch=0,proof=null;return {invalidate(){epoch++;proof=null;},begin(key){proof=null;return {epoch:++epoch,key};},complete(ticket,key,ok){if(ticket.epoch===epoch&&ticket.key===key&&ok)proof=key;},current:(ticket,key)=>ticket.epoch===epoch&&ticket.key===key,proof:()=>proof};}

const core={pronunciationRecordingKey,validatePronunciationHistory,reviewVoiceKey,pronunciationInventory,reviewGroupKey,groupPronunciations,reviewBatchSignature,createReviewHistory,createReviewListening,instructions,identity,prepare,reviewedEntry,modelExample,meemLessonEntry,literacyLessonEntry,literacyNames,signature,localArabic,ordinary,playbackChoice,createReviews,validationCases,createEngine};if(typeof module!=='undefined'){module.exports=core;return;}host.AfaqSpeechCore=core;
let reviews,reviewHistory,broken=false;try{reviews=createReviews(localStorage);reviewHistory=createReviewHistory(localStorage);}catch{broken=true;}const engine=createEngine({synth:host.speechSynthesis,Utterance:host.SpeechSynthesisUtterance});const candidates=new Map();for(const [kind,text]of Object.entries(instructions))candidates.set('instruction:'+kind,prepare({id:'instruction:'+kind,display:host.SeviatGuidedAudioCore?.prompts[kind]||text,spoken:text}));for(const e of validationCases())candidates.set(e.id,e);for(const saved of Object.values(reviews?.read().entries||{})){if(saved?.version!==1||typeof saved.id!=='string'||candidates.has(saved.id))continue;try{candidates.set(saved.id,prepare(saved));}catch{}}
function settings(){return reviews?.read().preferences||{questionReading:false,pronunciationExamples:false,rate:.85,music:false};}
function candidate(id,display,category='question'){const old=candidates.get(id);if(old?.display===display)return old;const e=prepare({id,display,category});candidates.set(id,e);return e;}
function lessonCandidate(kind,text,letter='م'){const e=literacyLessonEntry(letter,kind,text);if(e)candidates.set(e.id,e);return e;}
function entry(id){const raw=candidates.get(id);if(!raw)return null;const saved=reviews?.read().entries[id];return reviewedEntry(raw,saved);}
function selection(id){const picked=playbackSelection(id);return picked?.reviewed?picked:null;}
function playbackSelection(id){return broken?null:playbackChoice(entry(id),engine.voices(),settings().rate,reviews,reviewHistory);}
function availability(id){const supported=!!host.speechSynthesis&&!!host.SpeechSynthesisUtterance,picked=playbackSelection(id),voices=engine.voices();return {supported,reason:!supported?'unsupported':broken?'preferences-unreadable':picked?'available':!voices.length?'no-local-voice':reviews.read().entries[id]?.status==='rejected'?'rejected':'unapproved',voices:voices.map(v=>({name:v.name,lang:v.lang,localService:v.localService,voiceURI:v.voiceURI})),selected:picked?.voice.name||null,reviewed:!!picked?.reviewed};}
function update(patch){if(broken)throw Error('Original speech preferences preserved');reviews.preferences(patch);engine.stop();host.dispatchEvent(new Event('afaq-instruction-settings'));}
// Separate local database: no student voices, assessment records or profile keys are modified.
let database;
function db(){return database||(database=new Promise((resolve,reject)=>{const r=indexedDB.open('afaq-instruction-overrides-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('clips',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));}
async function recordingSnapshot(){const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('clips').objectStore('clips').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function clip(id){const e=entry(id),key=pronunciationRecordingKey(e);if(key){const blob=await host.AfaqAudioLibrary?.getClip(key);if(blob instanceof Blob&&blob.size&&blob.size<=2*1024*1024&&blob.type.startsWith('audio/'))return {id,blob,approved:true,library:true};}const d=await db();const existing=await new Promise((resolve,reject)=>{const r=d.transaction('clips').objectStore('clips').get(id);r.onsuccess=()=>{const c=r.result;resolve(c?.version===1&&c.approved===true&&c.blob instanceof Blob&&c.blob.size>0&&c.blob.size<=2*1024*1024&&c.reviewer?.trim()&&c.display===entry(id)?.display&&Number.isFinite(Date.parse(c.reviewedAt))?c:null);};r.onerror=()=>reject(r.error);});if(existing)return existing;try{return await host.AfaqAudioManagement?.inventoryClip(e)||null;}catch{return null;}}
// Keep authorization tied to this operation, including while opening the database.
// A lock aborts an active transaction; a subsequent login cannot revive it.
async function instructionMutation(work){
 host.AfaqAdult.assert();
 let revoked=false,tx=null,failure=null;
 const revoke=()=>{revoked=true;if(tx)try{tx.abort();}catch{}};
 const check=()=>{if(revoked)throw Error('Adult operation revoked');host.AfaqAdult.assert();};
 host.addEventListener('afaq-adult-locked',revoke);
 try{
  const d=await db();
  check();
  return await new Promise((resolve,reject)=>{
   tx=d.transaction('clips','readwrite');
   const fail=error=>{failure=error;try{tx.abort();}catch{}reject(error);};
   const guarded=fn=>()=>{try{check();fn();}catch(error){fail(error);}};
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(failure||tx.error||Error('Instruction recording transaction failed'));
   tx.onabort=()=>reject(failure||tx.error||Error('Instruction recording transaction aborted'));
   try{check();work(tx.objectStore('clips'),guarded,check);}catch(error){fail(error);}
  });
 }finally{host.removeEventListener('afaq-adult-locked',revoke);}
}
async function storeClip(id,blob,reviewer){
 host.AfaqAdult.assert();
 if(!blob?.size||blob.size>2*1024*1024||!blob.type.startsWith('audio/')||!reviewer.trim())throw Error('Invalid instruction recording');
 return instructionMutation((store,guarded,check)=>{
  check();
  const request=store.get(id);
  request.onsuccess=guarded(()=>{if(request.result!==undefined)throw Error('Existing recording preserved');check();const write=store.add({id,version:1,display:entry(id)?.display,blob,approved:true,reviewer:reviewer.trim(),reviewedAt:new Date().toISOString()});write.onsuccess=guarded(()=>{});});
 });
}
async function deleteInstructionClip(id){
 return instructionMutation((store,guarded,check)=>{
  const request=store.get(id);
  request.onsuccess=guarded(()=>{
   if(request.result&&request.result.version!==1)throw Error('Unrecognized instruction recording');
   check(); // The get callback is an asynchronous boundary: check immediately before delete.
   const deletion=store.delete(id);
   deletion.onsuccess=guarded(()=>{});
  });
 });
}
let recordingAudio=null,objectURL=null,capture=null;
function stop(options={}){engine.stop();host.SeviatSound?.stop();document.querySelectorAll('audio').forEach(a=>{if(a!==options?.keepAudio)a.pause();});if(recordingAudio){recordingAudio.pause();recordingAudio.removeAttribute('src');recordingAudio.load();recordingAudio=null;}if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}}
async function speak(id,options={}){if(!host.speechSynthesis||!host.SpeechSynthesisUtterance)return {ok:false,reason:'unsupported'};const picked=playbackSelection(id);if(!picked)return {ok:false,reason:engine.voices().length?'unapproved':'no-local-voice'};host.SeviatSound?.stop();document.querySelectorAll('audio').forEach(a=>a.pause());const volume=options.volume??.8;if(volume<=0)return {ok:false,reason:'muted'};return engine.speak(picked.entry,picked.voice,{rate:settings().rate,volume});}
function mountTeacher(parent){
 host.AfaqAdult.assert();if(document.body.dataset.mode!=='teacher'||parent.querySelector('#afaq-speech-review'))return;
 capture?.dispose();capture=null;stop();const root=document.createElement('section');root.id='afaq-speech-review';root.dir='rtl';parent.append(root);
 const add=(tag,text,p=root)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;p.append(e);return e;};
 add('h3','مراجعة النطق العربي — الحروف الاثنا عشر');
 add('p','الاعتماد قرار بشري بعد الاستماع؛ انتهاء التشغيل لا يثبت صحة النطق. نمط الوقف والوصل وصف للمراجعة ولا يحوّل النطق تلقائيًا. لا يتغير تقدم الطالب أو إعداد الصوت العام.');
 const voice=add('select');voice.id='afaq-review-voice';voice.setAttribute('aria-label','صوت عربي محلي');
 const select=add('select');select.id='afaq-review-case';select.setAttribute('aria-label','نص مراجعة النطق');
 const filters=add('div');filters.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin:12px 0';
 const search=add('input','',filters);search.id='afaq-review-search';search.placeholder='بحث في النص أو المعرّف';search.setAttribute('aria-label','بحث النطق');
 const filter=(id,label,values)=>{const lab=add('label',label+' ',filters),s=add('select','',lab);s.id=id;for(const [v,t]of [['','الجميع'],...values]){const o=add('option',t,s);o.value=v;}return s;};
 const letterFilter=filter('afaq-review-letter','الحرف',Object.keys(literacyNames).map(l=>[l,l+' — '+literacyNames[l].name]));
 const kindLabels={name:'اسم الحرف',fatha:'فتحة',kasra:'كسرة',damma:'ضمة','long-alif':'مد بالألف','long-waw':'مد بالواو','long-ya':'مد بالياء',closed:'سكون ومقطع مغلق',word:'كلمة',other:'مراجعات أخرى موجودة'};
 const categoryFilter=filter('afaq-review-category','الفئة',Object.entries(kindLabels));
 const stateLabels={pending:'بانتظار المراجعة',approved:'معتمد',rejected:'مرفوض','recording-needed':'يحتاج تسجيلًا بشريًا'};
 const stateFilter=filter('afaq-review-state','الحالة',Object.entries(stateLabels));
 const summary=add('p');summary.id='afaq-review-summary';const coverage=add('p');coverage.id='afaq-review-coverage';
 const display=add('p');display.id='afaq-review-display';
 const input=add('textarea');input.id='afaq-review-text';input.setAttribute('aria-label','نص النطق للمراجعة');
 const reading=add('select');reading.id='afaq-review-reading';reading.setAttribute('aria-label','الوصل والوقف');for(const [v,t]of [['connected','وصل'],['pause','وقف']]){const o=add('option',t,reading);o.value=v;}
 const rateLabel=add('label','سرعة هذه المراجعة فقط '),rate=add('input','',rateLabel);rate.id='afaq-review-rate';rate.type='number';rate.min='.65';rate.max='1.1';rate.step='.05';rate.value=String(settings().rate);rate.setAttribute('aria-label','سرعة مراجعة النطق');
 const exact=add('p');exact.id='afaq-review-exact';exact.style.whiteSpace='pre-wrap';
 const aliases=add('p');aliases.id='afaq-review-aliases';const recordingStatus=add('p');recordingStatus.id='afaq-review-recording-status';
 const name=add('input');name.id='afaq-review-reviewer';name.placeholder='اسم المراجع';name.setAttribute('aria-label','اسم مراجع الصوت');
 const consent=add('label','استمعت إلى النص كاملًا وراجعت المعنى والحركات والوقف '),heard=add('input','',consent);heard.type='checkbox';heard.id='afaq-review-heard';
 const status=add('p');status.id='afaq-review-status';status.setAttribute('role','status');
 const historyBox=add('details');add('summary','سجل المراجعات المحفوظة',historyBox);const historyList=add('div','',historyBox);historyList.id='afaq-review-history';
 const listening=createReviewListening();let listened=null,blob=null,recordingHeard=null,groups=[],items=[],initializing=true,selectionVersion=0;
 const selectedVoice=()=>engine.voices().find(v=>v.voiceURI===voice.value);
 const selectedGroup=()=>groups.find(g=>g.items.some(x=>x.entry.id===select.value));
 const configuration=()=>{const group=selectedGroup();return group?group.items.map(x=>({...prepare({...x.entry,spoken:input.value,reading:reading.value}),sourceSpoken:(x.sourceEntry||x.entry).spoken})):[];};
 function invalidate(){capture?.dispose();capture=null;selectionVersion++;listening.invalidate();listened=null;heard.checked=false;blob=null;recordingHeard=null;stop();}
 function itemState(item){const e=item.entry,v=selectedVoice(),r=Number(rate.value),saved=reviewHistory?.resolve(item.sourceEntry||e,v,r);if(saved)return saved.event.decision;return v&&reviews?.approved(e,v,r)?'approved':'pending';}
 function details(){const entries=configuration(),e=entries[0],v=selectedVoice();if(!e){exact.textContent='لا توجد نتائج لهذه المرشحات.';aliases.textContent='';display.textContent='';return;}
  const current=reviewHistory?.exact(e,v,Number(rate.value));
  exact.textContent='النص المرسل حرفيًا: '+e.spoken+'\nالصوت: '+(v?v.name+' | '+v.lang:'لا يوجد صوت عربي محلي')+' | السرعة: '+rate.value+' | النمط: '+(e.reading==='pause'?'وقف':'وصل')+'\nالحالة لهذا الإعداد: '+(stateLabels[current?.event.decision||(v&&reviews?.approved(e,v,Number(rate.value))?'approved':'pending')]);
  aliases.textContent='تطبق المراجعة الصريحة على '+entries.length+' معرّف متكافئ فقط: '+entries.map(e=>e.id).join('، ');
  historyList.replaceChildren();const ids=new Set(entries.map(e=>e.id));for(const event of (reviewHistory?.read().events||[]).filter(ev=>ev.entries.some(e=>ids.has(e.id))).reverse()){const row=event.entries.find(e=>ids.has(e.id));add('p',stateLabels[event.decision]+' — '+event.reviewer+' — '+event.at+' | '+(event.voice?.name||'دون صوت')+' | '+event.rate+' | '+row.reading+' | '+row.spoken,historyList);}
  for(const id of ids){const legacy=reviews?.read().entries[id];if(legacy)add('p','سجل سابق محفوظ دون تعديل: '+legacy.status+' — '+legacy.reviewer+' — '+legacy.reviewedAt+' | '+legacy.spoken+' | '+legacy.reading,historyList);}
 }
 async function showRecording(){const id=select.value,version=selectionVersion,e=configuration()[0];if(!e){recordingStatus.textContent='';return;}recordingStatus.textContent='جارٍ فحص التسجيل...';try{const saved=await clip(id);let library=null;if(!saved&&host.AfaqAudioLibrary)for(const text of [e.display,e.spoken]){library=await host.AfaqAudioLibrary.getClip(text==='قَ'?'syllable:qa':'text:'+text.normalize('NFC').trim());if(library)break;}if(root.isConnected&&version===selectionVersion){recordingStatus.dataset.state=saved||library?'approved':itemState(selectedGroup()?.items[0]||{entry:e})==='recording-needed'?'requires-rerecording':'not-recorded';recordingStatus.textContent=saved?'يوجد تسجيل معتمد ببيانات مراجع.':library?'يوجد تسجيل في المكتبة القديمة؛ لا يُعد اعتمادًا للصوت الآلي.':'لا يوجد تسجيل محفوظ مطابق.';} }catch{if(root.isConnected&&version===selectionVersion)recordingStatus.textContent='تعذر فحص التسجيلات؛ بقيت محفوظة.';}}
 function edit(){invalidate();capture?.dispose();const group=selectedGroup(),raw=group?.items[0]?.entry;input.disabled=reading.disabled=!raw;if(!raw){details();return;}const previous=reviewHistory?.resolve(group.items[0].sourceEntry||raw,selectedVoice(),Number(rate.value));const e=previous?.event.decision==='approved'?previous.entry:raw;
  display.textContent='النص المعروض: '+raw.display;input.value=e.spoken;reading.value=e.reading;details();showRecording();
 }
 const searchKey=text=>text.normalize('NFC').replace(/[\u064b-\u0652]/g,'').trim();
 function renderList(){const keep=select.value,v=selectedVoice(),r=Number(rate.value);const effective=items.map(item=>{const saved=reviewHistory?.resolve(item.entry,v,r);return saved?.event.decision==='approved'?{...item,sourceEntry:item.entry,entry:saved.entry}:item;});groups=groupPronunciations(effective,v,r).filter(g=>g.items.some(x=>(!letterFilter.value||(x.letters||[x.letter]).includes(letterFilter.value))&&(!categoryFilter.value||x.kind===categoryFilter.value)&&(!stateFilter.value||itemState(x)===stateFilter.value)&&(!search.value||[x.entry.display,x.entry.spoken,x.entry.id,...x.sources].some(t=>searchKey(t).includes(searchKey(search.value))))));
  select.replaceChildren();for(const g of groups){const item=g.items[0],o=add('option',(item.letter?item.letter+' — ':'')+(kindLabels[item.kind]||item.entry.category)+': '+item.entry.display+' ['+stateLabels[itemState(item)]+']'+(g.items.length>1?' ×'+g.items.length:''),select);o.value=item.entry.id;}
  if([...select.options].some(o=>o.value===keep))select.value=keep;summary.textContent=(Object.keys(literacyNames).length*7)+' حالة أساسية ('+Object.keys(literacyNames).length+' × ٧)؛ '+items.filter(x=>x.baseline).length+' جاهزة في الفهرس. المجموع: '+items.length+' عنصرًا؛ المعروض: '+groups.length+' مجموعة. لا تجمع أسماء الحروف مع أصواتها أو الوقف مع الوصل.';edit();
 }
 function install(inventory){const ids=new Set();items=[];for(const item of inventory){if(!candidates.has(item.entry.id))candidates.set(item.entry.id,item.entry);items.push({...item,entry:entry(item.entry.id)});ids.add(item.entry.id);}for(const e of candidates.values())if(!ids.has(e.id))items.push({entry:entry(e.id),letter:'',kind:'other',baseline:false,sources:[]});renderList();}
 function voices(){invalidate();const previous=voice.value;voice.replaceChildren();for(const v of engine.voices()){const o=add('option',v.name+' | '+v.lang,voice);o.value=v.voiceURI;}const preferred=!broken&&playbackChoice(pronunciationInventory()[0].entry,engine.voices(),Number(rate.value),reviews,reviewHistory)?.voice.voiceURI;if([...voice.options].some(o=>o.value===previous))voice.value=previous;else if(preferred)voice.value=preferred;if(!initializing)renderList();status.textContent=voice.options.length?'استمع ثم اتخذ قرارًا صريحًا.':'لا يتوفر صوت عربي محلي؛ يمكن وضع علامة يحتاج تسجيلًا بشريًا.';}
 voices();initializing=false;install(pronunciationInventory());coverage.textContent='جارٍ فحص المقاطع والكلمات من المحتوى النشط…';
 const unit2=[];for(const l of Object.keys(literacyNames).slice(6))for(const [i,q]of (host.SeviatUnit2?.questions(l,'sukoon')||[]).entries())unit2.push({...q,letter:l,skill:'sukoon',id:l+':sukoon-'+i});
 fetch('data/unit1-reviewed.json').then(r=>{if(!r.ok)throw Error('Missing active bank');return r.json();}).then(bank=>{if(!root.isConnected||!host.AfaqAdult.authenticated())return;install(pronunciationInventory(bank.questions||[],unit2));coverage.textContent='أضيفت المقاطع المغلقة والكلمات الموجودة فقط. عناصر المراجعة لا تفتح دروسًا ولا تغير التسلسل.';coverage.textContent+=' '+Object.keys(literacyNames).map(l=>l+': '+items.filter(x=>x.kind==='word'&&(x.letters||[x.letter]).includes(l)).length+' كلمات').join(' | ');}).catch(()=>{if(root.isConnected)coverage.textContent='الفهرس الأساسي جاهز؛ تعذر تحميل المقاطع والكلمات. أعد فتح اللوحة للمحاولة دون مسح البيانات.';});
 select.onchange=edit;for(const control of [search,letterFilter,categoryFilter,stateFilter])control.oninput=control.onchange=renderList;
 input.oninput=reading.onchange=()=>{invalidate();details();};voice.onchange=()=>{invalidate();renderList();};rate.oninput=()=>{invalidate();renderList();};
 const action=(text,id,fn)=>{const b=add('button',text);b.type='button';b.id=id;b.onclick=async()=>{try{host.AfaqAdult.assert();await fn();}catch(e){console.error('[AFAQ recording diagnostic]',e);status.textContent=/elsewhere/i.test(e.message)?'تغيرت المراجعات في نافذة أخرى. أعد تحميل الصفحة.':'تعذر تنفيذ الإجراء. بقيت السجلات الأصلية محفوظة.';}};return b;};
 action('استمع إلى المسودة','afaq-speech-preview',async()=>{
  if(isRecording()){status.textContent='أوقف التسجيل أولًا.';return;}invalidate();const entries=configuration(),v=selectedVoice(),r=Number(rate.value);if(!entries.length)return;if(!Number.isFinite(r)||r<.65||r>1.1){status.textContent='اختر سرعة بين 0.65 و 1.1.';return;}
  if(host.SeviatGuidedAudio?.settings().muted||(host.AfaqWorkspace?.audioGain()??1)===0||(host.SeviatGuidedAudio?.settings().volume??.8)===0){status.textContent='فعّل الصوت قبل المراجعة.';return;}
  const key=reviewBatchSignature(entries,v,r),ticket=listening.begin(key);const result=await engine.speak(entries[0],v,{rate:r,volume:(host.SeviatGuidedAudio?.settings().volume??.8)*(host.AfaqWorkspace?.audioGain()??1)});
  const finished=result.ok&&await engine.done();const currentKey=reviewBatchSignature(configuration(),selectedVoice(),Number(rate.value));if(!root.isConnected||!host.AfaqAdult.authenticated()||!listening.current(ticket,currentKey))return;
  listening.complete(ticket,currentKey,finished);listened=listening.proof();heard.checked=false;status.textContent=listened?'انتهى السماع؛ أكد المراجعة ثم اختر اعتماد النطق. لم يُحفظ اعتماد تلقائي.':'لم يكتمل السماع؛ لا يمكن الاعتماد. حاول مجددًا أو اطلب تسجيلًا بشريًا.';details();
 });
 action('أوقف الاستماع','afaq-speech-stop',()=>{invalidate();status.textContent='توقف السماع؛ أعد الاستماع كاملًا قبل الاعتماد.';});
 function decide(decision){const entries=configuration();if(!entries.length)return;if(!name.value.trim()){status.textContent='اكتب اسم المراجع أولًا.';return;}if(!reviewHistory||broken){status.textContent='تعذر قراءة سجل المراجعات؛ لم يُستبدل الأصل.';return;}
  if(decision==='approved'&&(!heard.checked||listening.proof()!==reviewBatchSignature(entries,selectedVoice(),Number(rate.value))||!name.value.trim())){status.textContent='استمع كاملًا، واذكر المراجع وأكد المراجعة أولًا.';return;}
  reviewHistory.record(entries,selectedVoice(),Number(rate.value),decision,name.value,{heard:heard.checked,listened:listening.proof()});invalidate();renderList();host.dispatchEvent(new Event('afaq-instruction-settings'));status.textContent='حُفظ القرار: '+stateLabels[decision]+'؛ السجلات السابقة باقية في التاريخ.';
 }
 action('اعتماد النطق','afaq-speech-approve',()=>decide('approved'));
 action('رفض النطق','afaq-speech-reject',()=>decide('rejected'));
 action('يحتاج تسجيلًا بشريًا','afaq-speech-recording-needed',()=>decide('recording-needed'));
 action('افتح مكتبة تسجيلات المعلم','afaq-review-library',()=>host.AfaqAudioLibrary?.mount());
 action('استمع إلى التسجيل المحفوظ','afaq-review-saved-recording',async()=>{const e=configuration()[0];if(!e)return;invalidate();const version=selectionVersion;const saved=await clip(select.value);let source=saved?.blob;
  if(!source&&host.AfaqAudioLibrary){for(const text of [e.display,e.spoken]){source=await host.AfaqAudioLibrary.getClip(text==='قَ'?'syllable:qa':'text:'+text.normalize('NFC').trim());if(source)break;}}
  host.AfaqAdult.assert();if(!root.isConnected||version!==selectionVersion)return;if(!source){status.textContent='لا يوجد تسجيل محفوظ مطابق لهذا العنصر.';return;}if(host.SeviatGuidedAudio?.settings().muted||(host.AfaqWorkspace?.audioGain()??1)===0||(host.SeviatGuidedAudio?.settings().volume??.8)===0){status.textContent='فعّل الصوت قبل الاستماع.';return;}
  invalidate();objectURL=URL.createObjectURL(source);recordingAudio=new Audio(objectURL);recordingAudio.volume=(host.SeviatGuidedAudio?.settings().volume??.8)*(host.AfaqWorkspace?.audioGain()??1);await recordingAudio.play();status.textContent='تشغيل تسجيل محفوظ؛ لا يمنح اعتمادًا للنطق الآلي.';
 });
add('p','سجّل الهدف الظاهر في «النص المرسل حرفيًا» فقط، دون تعليمات أو إجابات إضافية. اسم الحرف وصوته والمد والوقف والوصل تسجيلات منفصلة. التسجيل محلي ومشمول بنسخة الصوت الاحتياطية.');
action('سجّل النطق المحدد','afaq-instruction-record',async()=>{invalidate();if(!configuration().length)return;const version=selectionVersion;capture=host.SeviatVoiceCore.createCapture({mediaDevices:navigator.mediaDevices,Recorder:host.MediaRecorder,onBlob:b=>{if(!root.isConnected||version!==selectionVersion||!host.AfaqAdult.authenticated())return;blob=b;recordingStatus.dataset.state='awaiting-approval';recordingStatus.textContent='مسجل وبانتظار الاعتماد؛ استمع ثم أكد المراجعة.';status.textContent=recordingStatus.textContent;},onState:s=>{if(version!==selectionVersion)return;if(s==='error'){recordingStatus.dataset.state='requires-rerecording';recordingStatus.textContent='يحتاج إعادة تسجيل.';}status.textContent=s==='recording'?'جارٍ التسجيل؛ الحد الأقصى ٢٠ ثانية.':s==='error'?'لم يكتمل التسجيل. راجع إذن الميكروفون ثم حاول مجددًا.':({idle:'اضغط التسجيل للبدء.',requesting:'اسمح بالميكروفون.',stopping:'نجهز التسجيل…',ready:'التسجيل جاهز.',disposed:'انتهى التسجيل.'}[s]||'راجع إذن الميكروفون.');}});await capture.start();});
action('أوقف التسجيل','afaq-instruction-stop',()=>capture?.stop());
action('أعد المحاولة أو تجاهل التسجيل','afaq-instruction-discard',()=>{invalidate();showRecording();status.textContent='أُهملت المحاولة؛ اضغط التسجيل للمحاولة مجددًا. التسجيل المعتمد السابق باقٍ.';});
action('استمع إلى التسجيل','afaq-instruction-replay',async()=>{if(!blob){status.textContent='سجّل أولًا.';return;}if(host.SeviatGuidedAudio?.settings().muted||(host.AfaqWorkspace?.audioGain()??1)===0||(host.SeviatGuidedAudio?.settings().volume??.8)===0){status.textContent='فعّل صوت الشرح قبل الاستماع.';return;}stop();objectURL=URL.createObjectURL(blob);recordingAudio=new Audio(objectURL);recordingAudio.volume=(host.SeviatGuidedAudio?.settings().volume??.8)*(host.AfaqWorkspace?.audioGain()??1);const playing=blob;recordingAudio.onended=()=>{if(blob===playing){recordingHeard=playing;status.textContent='انتهى سماع التسجيل؛ أكد المراجعة قبل الاعتماد.';}};await recordingAudio.play();});
action('اعتماد التسجيل وحفظه','afaq-instruction-save',async()=>{
 if(!heard.checked||!name.value.trim()||!blob||recordingHeard!==blob){status.textContent='سجّل واستمع وأكد المراجعة واذكر اسمك أولًا.';return;}
 const original=entry(select.value),reviewed=configuration()[0],version=selectionVersion,recording=blob,reviewer=name.value.trim();
 const guard=()=>{host.AfaqAdult.assert();if(!root.isConnected||version!==selectionVersion||blob!==recording||recordingHeard!==recording||!heard.checked||name.value.trim()!==reviewer)throw Error('Recording approval changed; listen and approve again.');};
 if(!reviewed||reviewed.spoken!==original.spoken||reviewed.reading!==original.reading){status.textContent='اختر النص والنمط الأصليين قبل تسجيل هذا الهدف.';return;}
 const key=pronunciationRecordingKey(original);
 if(key){
  const expected=await host.AfaqAudioLibrary.getClip(key),existing=await clip(select.value);guard();
  if((existing||expected)&&!host.confirm('يوجد تسجيل معتمد مطابق. هل تؤكد استبداله بهذا التسجيل بعد مراجعته؟'))return;
  guard();await host.AfaqAudioLibrary.approvePronunciation(original,recording,reviewer,expected,guard);
 }else{if(await clip(select.value)){status.textContent='يوجد تسجيل محفوظ؛ لم يتم استبداله.';return;}guard();await storeClip(select.value,recording,reviewer);}
 invalidate();await showRecording();status.textContent='حُفظ التسجيل المعتمد محليًا؛ له أولوية على النطق الآلي في الحالات المطابقة فقط.';host.dispatchEvent(new Event('afaq-instruction-settings'));
});
action('حذف تسجيل الشرح المحدد','afaq-instruction-delete',async()=>{await deleteInstructionClip(select.value);stop();status.textContent='حُذف تسجيل الشرح المحدد فقط.';});
const onReviewStorage=event=>{if(event.key==='afaq-pronunciation-review-v1'&&root.isConnected)renderList();};host.addEventListener('storage',onReviewStorage);
const watcher=new MutationObserver(()=>{if(!root.isConnected){host.removeEventListener('storage',onReviewStorage);listening.invalidate();capture?.dispose();capture=null;stop();blob=null;recordingHeard=null;host.speechSynthesis?.removeEventListener('voiceschanged',onVoices);watcher.disconnect();}});watcher.observe(document.body,{childList:true,subtree:true});
const onVoices=()=>{if(root.isConnected)voices();else host.speechSynthesis?.removeEventListener('voiceschanged',onVoices);};host.speechSynthesis?.addEventListener('voiceschanged',onVoices);
}
const isRecording=()=>['requesting','recording','stopping'].includes(capture?.state);
const observer=new MutationObserver(()=>{if(capture&&document.body.dataset.mode!=='teacher'){capture.dispose();capture=null;stop();}});observer.observe(document.body,{attributes:true,attributeFilter:['data-mode']});
host.speechSynthesis?.addEventListener('voiceschanged',()=>host.dispatchEvent(new Event('afaq-instruction-settings')));
host.addEventListener('storage',event=>{if(event.key==='afaq-pronunciation-review-v1'){engine.stop();try{reviewHistory=createReviewHistory(localStorage);}catch{broken=true;}host.dispatchEvent(new Event('afaq-instruction-settings'));}});
host.AfaqSpeech={isRecording,settings,update,entry,candidate,lessonCandidate,selection,playbackSelection,availability,speak,speakInstructionWithHamed,stop,done:()=>engine.done(),voices:()=>engine.voices(),clip,recordingSnapshot,mountTeacher,dispose:()=>{capture?.dispose();capture=null;stop();}};
function speakInstructionWithHamed(text, options = {}) {
  // Compatibility entry point: use the same review policy and owned lifecycle.
  if (typeof text !== 'string' || !text.trim()) return false;
  const id = 'question:' + identity(text);
  candidate(id, text);
  if (!playbackSelection(id)) return false;
  speak(id, options).catch(() => {});
  return true;
}

})(typeof window==='undefined'?globalThis:window);
