'use strict';
const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');let checks=0;const check=(v,s)=>{assert(v,s);checks++;};
const preferences=JSON.stringify({version:1,muted:true,volume:.45}),audio=[],revoked=[];
class FakeAudio{constructor(url){this.url=url;audio.push(this);}play(){return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){}}
const window={addEventListener(){},indexedDB:null},context={window,localStorage:{getItem:key=>key==='seviat-instruction-preferences-v1'?preferences:null,setItem(){throw Error('No preference writes allowed');}},Audio:FakeAudio,Blob,URL:{createObjectURL:()=> 'blob:fixture',revokeObjectURL:url=>revoked.push(url)},setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync('afaq-testing-audio.js','utf8'),context);
(async()=>{const library=window.AfaqAudioLibrary,settings=window.AfaqTestingAudio,blob=new Blob(['fixture'],{type:'audio/wav'});
 check(settings.settings().muted,'existing mute preference respected');check(!await library.playBlob(blob),'muted recording blocked');
 settings.setMuted(false);check(!settings.settings().muted,'can unmute in memory even when saved preference was muted');
 check(await library.playBlob(blob),'approved blob playback starts');const finished=library.done();check(audio.at(-1).volume===.45,'saved volume used');audio.at(-1).onended();check(await finished,'completion follows ended event');
 await library.playBlob(blob);const interrupted=library.done();library.stop();check(!await interrupted,'navigation stops previous playback');
 check(!await library.getClip('text:fixture'),'missing recording returns no substitute');
 check(!library.saveClip&&!library.approvePronunciation&&!library.mount&&!library.record,'no write/review/recording APIs');
 check(revoked.length>=2,'owned playback URLs released');
 console.log(JSON.stringify({passed:true,checks,audioMode:'controlled playback lifecycle; no acoustic assertion'}));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>window.AfaqAudioLibrary.stop());
