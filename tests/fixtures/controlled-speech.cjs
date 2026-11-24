'use strict';
// Lifecycle events only. Never call native synthesis or create an audio asset.
module.exports=`(()=>{
 const voice={voiceURI:'afaq-controlled',name:'Controlled Arabic lifecycle fixture',lang:'ar-SA',localService:true,default:true};
 let jobs=[];window.fixtureHoldSpeech=true;window.fixtureSpeechRequests=[];
 class Utterance extends EventTarget{constructor(text){super();this.text=text;}emit(type){const e=new Event(type);this.dispatchEvent(e);this['on'+type]?.(e);}}
 window.SpeechSynthesisUtterance=Utterance;
 const synth={getVoices:()=>[voice],speaking:false,paused:false,addEventListener(){},removeEventListener(){},resume(){},cancel(){for(const job of jobs)clearTimeout(job);jobs=[];synth.speaking=false;},speak(u){fixtureSpeechRequests.push(u.text);synth.speaking=true;jobs.push(setTimeout(()=>u.emit('start'),20));if(!fixtureHoldSpeech)jobs.push(setTimeout(()=>{synth.speaking=false;u.emit('end');},300));}};
 Object.defineProperty(window,'speechSynthesis',{configurable:true,value:synth});
 // Silence feedback as well. This test verifies application state, not acoustics.
 window.AudioContext=undefined;window.webkitAudioContext=undefined;
})();`;
