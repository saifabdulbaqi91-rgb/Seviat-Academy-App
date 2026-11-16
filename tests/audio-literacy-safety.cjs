'use strict';
const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const S=require('../arabic-speech'),G=require('../guided-audio');
const voice={voiceURI:'fixture',name:'fixture',lang:'ar-SA',localService:true};
const storage={getItem:()=>null,setItem(){}};
const reviews=S.createReviews(storage);
for(const text of ['اختر مَ','استمع إلى مِي ثم اختر','هذا صوت مْ','اختر آ']) {
 const entry=S.prepare({id:'question:test',display:text,category:'question'});
 assert.equal(S.playbackChoice(entry,[voice],.85,reviews),null,text);
}
assert(S.playbackChoice(S.prepare({id:'question:description',display:'اختر الميم المفتوحة',category:'question'}),[voice],.85,reviews));
const context={window:{},console:{log(){}}};
vm.runInNewContext(fs.readFileSync('group1-engine.js','utf8'),context);
const listening=context.window.SeviatGroup1.questions.filter(q=>q.type==='teacher-listening');
assert(listening.length>30);
for(const q of listening){assert(q.audioText===q.answer);assert(!q.prompt.includes(q.answer));assert(!q.prompt.includes('?'));}
const pilot=require('../unit3-alif-pilot');assert.deepEqual(pilot.validate(),[]);
const ui=fs.readFileSync('unit3-alif-pilot-ui.js','utf8');
assert(ui.includes('shuffleArray([...item.options])'));
assert(!ui.includes('speakInstructionWithHamed(instruction'));
// Exercise the application's actual Fisher-Yates implementation without its DOM bootstrap.
const app=fs.readFileSync('app.js','utf8'),start=app.indexOf('function shuffleArray('),end=app.indexOf('\n}',start)+2;
const shuffle=vm.runInNewContext('('+app.slice(start,end)+')');
const positions=new Set(),source=['مَ','مِ','مُ'];
for(let i=0;i<100;i++){const result=shuffle([...source]);assert.equal(new Set(result).size,3);positions.add(result.indexOf('مَ'));}
assert.equal(positions.size,3);assert.deepEqual(source,['مَ','مِ','مُ']);
// An unreviewed asset is preserved, but must not be presented as approved pronunciation.
(async()=>{
 let manifest={version:1,clips:[]},audios=[];
 const win={SeviatGuidedAudioCore:G,AfaqSpeech:{stop(){}},SeviatGuidedAudio:{stop(){}},AfaqAudioLibrary:{stop(){}}};
 const sandbox={window:win,setTimeout,clearTimeout,fetch:async()=>({ok:true,json:async()=>manifest}),Audio:function(src){this.src=src;this.play=async()=>{};this.pause=()=>{};audios.push(this);}};
 vm.runInNewContext(fs.readFileSync('afaq-vowel-audio.js','utf8'),sandbox);
 assert.equal(await win.AfaqVowelAudio.play('أَ'),false);assert.equal(audios.length,0);
 manifest.clips.push({kind:'phoneme:أَ',src:'sounds/fatha_short.wav',approved:true,reviewedBy:'TEST FIXTURE ONLY',reviewedAt:'2026-11-16'});
 assert(await win.AfaqVowelAudio.play('أَ'));const completed=win.AfaqVowelAudio.done();audios.at(-1).onended();assert(await completed);
 assert(await win.AfaqVowelAudio.play('أَ'));const cancelled=win.AfaqVowelAudio.done();win.AfaqVowelAudio.stop();assert.equal(await cancelled,false);
 assert(await win.AfaqVowelAudio.play('أَ'));const failed=win.AfaqVowelAudio.done();audios.at(-1).onerror();assert.equal(await failed,false);
 console.log(JSON.stringify({passed:true,listeningQuestions:listening.length,answerPositions:positions.size,checks:['phonetic TTS review gate','descriptive TTS allowed','concealed listening targets','pilot curriculum','shuffle correctness','recording approval/completion/cancellation/error']}));
})().catch(e=>{console.error(e);process.exitCode=1;});
