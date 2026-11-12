(function(){
'use strict';
const KEY='seviat-sound-preferences-v1';
let settings={buttons:true,feedback:true};
try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');settings={buttons:saved.buttons!==false,feedback:saved.feedback!==false};}catch{}
let context=null,voice=null,last={};
function ctx(){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;return context||(context=new C());}
function beep(freq,duration=.09,type='sine',volume=.055,delay=0){try{const c=ctx();if(!c)return;if(c.state==='suspended')c.resume().catch(()=>{});const o=c.createOscillator(),g=c.createGain(),start=c.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,start);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(volume,start+.012);g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g);g.connect(c.destination);o.start(start);o.stop(start+duration+.02);}catch{}}
function tone(kind){if(!settings.buttons)return;if(kind==='correct'){beep(660,.12);beep(880,.15,'sine',.055,.12);}else if(kind==='wrong'){beep(290,.17,'triangle');beep(220,.2,'triangle',.045,.16);}else if(kind==='complete'||kind==='success'){beep(523,.12);beep(659,.12,'sine',.055,.13);beep(784,.25,'sine',.06,.26);}else beep(520,.055,'sine',.025);}
const library={correct:['correct-1.mp3','correct-2.mp3','correct-3.mp3','correct-4.mp3'],wrong:['wrong-1.mp3','wrong-2.mp3','wrong-3.mp3'],complete:['success-1.mp3','success-2.mp3','success-3.mp3']};
function stopVoice(){if(voice){voice.pause();voice.currentTime=0;voice=null;}}
function say(kind){if(!settings.feedback)return;const list=library[kind];if(!list)return;let n=Math.floor(Math.random()*list.length);if(n===last[kind]&&list.length>1)n=(n+1)%list.length;last[kind]=n;stopVoice();const a=new Audio('sounds/teacher/'+list[n]);voice=a;a.play().catch(()=>{});}
function play(kind){if(kind==='retry')kind='wrong';if(kind==='success')kind='complete';tone(kind);if(kind==='correct'||kind==='wrong'||kind==='complete')say(kind);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(settings));}catch{}window.dispatchEvent(new Event('seviat-sound-settings-changed'));}
function set(which,value){if(!(which in settings))return;settings[which]=!!value;if(which==='feedback'&&!value)stopVoice();save();}
function isEnabled(){return settings.buttons||settings.feedback;}
window.SeviatSound={play,settings:()=>({...settings}),set,stop:stopVoice};
// Preserve the existing sound interface used by earlier lessons and games.
window.SeviatEffects={play,stop:stopVoice,isEnabled,setEnabled(value){set('buttons',value);set('feedback',value);}};
function render(){const side=document.getElementById('seviat-sidebar');if(!side||document.getElementById('seviat-sound-panel'))return;const panel=document.createElement('section');panel.id='seviat-sound-panel';panel.dir='rtl';panel.style.cssText='margin-top:18px;padding:14px;border:1px solid #7794b2;border-radius:14px;color:#fff;background:#1b3853';const heading=document.createElement('h3');heading.textContent='🔊 إعدادات الصوت';heading.style.margin='0 0 12px';panel.append(heading);[['buttons','أصوات الأزرار والصواب والخطأ والإنجاز'],['feedback','صوت التشجيع والتغذية الراجعة']].forEach(([key,label])=>{const row=document.createElement('label');row.style.cssText='display:flex;gap:12px;align-items:center;padding:10px 0;font-size:16px;cursor:pointer';const input=document.createElement('input');input.type='checkbox';input.checked=settings[key];input.style.cssText='width:23px;height:23px;flex-shrink:0';input.addEventListener('change',()=>set(key,input.checked));row.append(input,document.createTextNode(label));panel.append(row);});const demo=document.createElement('button');demo.type='button';demo.textContent='▶ تجربة صوت النجاح';demo.style.cssText='padding:12px;border:1px solid #9bc1e4;border-radius:10px;background:#1769aa;color:white;cursor:pointer';demo.addEventListener('click',()=>play('complete'));panel.append(demo);side.append(panel);
const toggle=document.getElementById('soundToggle');if(toggle){const sync=()=>{toggle.textContent=isEnabled()?'🔊 الصوت':'🔇 الصوت';};toggle.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();const value=!isEnabled();set('buttons',value);set('feedback',value);sync();},true);window.addEventListener('seviat-sound-settings-changed',sync);sync();}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
// Click feedback for normal buttons without overriding game-specific correct/wrong sounds.
document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(!b)return;if(b.id==='soundToggle'||b.closest('#seviat-sound-panel'))return;if(b.closest('.sv2-options')||b.closest('#u1-options')||b.closest('#auditoryOptions'))return;tone('click');},true);
})();
