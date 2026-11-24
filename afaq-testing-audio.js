/* Public, read-only recording playback. No recorder, review, import or storage-write API. */
(function(host){
'use strict';
let muted=null,player=null,url=null,finish=null,timer=null,done=Promise.resolve(false),generation=0;
let ownerStop=null;
function release(owner){if(ownerStop===owner)ownerStop=null;}
function claim(owner){const previous=ownerStop;ownerStop=null;previous?.();ownerStop=owner;}
function stopAll(){const previous=ownerStop;ownerStop=null;previous?.();host.AfaqQuestionAudio?.stop();host.AfaqAudioLibrary?.stop();host.SeviatEffects?.stop();host.AfaqSpeech?.stop();}
function settings(){try{const value=JSON.parse(localStorage.getItem('seviat-instruction-preferences-v1')||'null');return {muted:muted===null?value?.muted===true:muted,volume:Number.isFinite(value?.volume)?Math.max(0,Math.min(1,value.volume)):.8};}catch{return {muted:true,volume:0};}}
function stop(){release(stop);generation++;clearTimeout(timer);finish?.(false);finish=null;if(player){player.pause();player.removeAttribute('src');player=null;}if(url){URL.revokeObjectURL(url);url=null;}}
async function getClip(id){
 if(typeof id!=='string'||!host.indexedDB)return null;
 // Read approved teaching audio only; never open student voice databases.
 return new Promise(resolve=>{const request=indexedDB.open('afaq-audio-studio-v1',1);request.onupgradeneeded=()=>{request.transaction.abort();resolve(null);};request.onerror=()=>resolve(null);request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains('clips')){db.close();resolve(null);return;}const tx=db.transaction('clips','readonly'),r=tx.objectStore('clips').get(id);r.onsuccess=()=>{const blob=r.result;resolve(blob instanceof Blob&&blob.size>0&&blob.size<=2*1024*1024&&blob.type.startsWith('audio/')?blob:null);};r.onerror=()=>resolve(null);tx.oncomplete=()=>db.close();tx.onabort=()=>{db.close();resolve(null);};};});
}
async function playBlob(blob){stop();const preference=settings();if(preference.muted||preference.volume===0||!(blob instanceof Blob))return false;claim(stop);const ticket=generation;url=URL.createObjectURL(blob);const audio=new Audio(url);player=audio;audio.volume=preference.volume;try{const rate=Number(localStorage.getItem('afaq-student-audio-speed-v1'));audio.playbackRate=[.75,.9,1].includes(rate)?rate:1;}catch{}done=new Promise(resolve=>{finish=resolve;});const settle=value=>{if(ticket!==generation)return;const complete=finish;finish=null;complete?.(value);stop();};audio.onended=()=>settle(true);audio.onerror=()=>settle(false);timer=setTimeout(()=>settle(false),180000);try{await audio.play();return ticket===generation;}catch{settle(false);return false;}}
host.AfaqAudioLibrary=Object.freeze({getClip,playBlob,done:()=>done,stop,keyForText:text=>text.normalize('NFC').trim()==='قَ'?'syllable:qa':'text:'+text.normalize('NFC').trim()});
host.SeviatGuidedAudio=Object.freeze({settings,stop:()=>{}});
host.AfaqTestingAudio=Object.freeze({settings,claim,release,stop:stopAll,setMuted(value){muted=!!value;if(muted)stopAll();}});
host.addEventListener('pagehide',stopAll);
})(window);
