(function(){
'use strict';
const letters=['ص','ف','س','ق','ت','ح'];
const names=['صاد','فاء','سين','قاف','تاء','حاء'];
const old=['م','ب','ل','د','ن','ر'];
const skills=[['name','اسم الحرف'],['shape','شكل الحرف'],['vowels','الحركات القصيرة'],['sukoon','السكون داخل مقطع'],['madd','المدود'],['position','أشكال الحرف في الكلمة'],['syllable','تركيب المقاطع'],['writing','الكتابة بإشراف المعلم']];
const vowels=['َ','ِ','ُ'];
const $=(tag,text,cls)=>{let e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
function sound(kind){try{if(window.SeviatEffects?.isEnabled?.()===false)return; if(kind==='correct'||kind==='wrong'){window.SeviatEffects?.play?.(kind);return;} const A=window.AudioContext||window.webkitAudioContext;if(!A)return;const c=window.__sv2Audio||(window.__sv2Audio=new A());if(c.state==='suspended')c.resume();const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=kind==='next'?680:480;g.gain.setValueAtTime(.045,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.075);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.08);}catch(e){console.warn('sound',e);}}
function button(parent,text,fn){let b=$('button',text,'sv2-btn');b.type='button';b.addEventListener('click',()=>{sound('click');fn();});parent.append(b);return b;}
function area(title,desc){const a=typeof createActivityArea==='function'?createActivityArea():document.getElementById('activityArea');if(!a)return null;a.replaceChildren();a.classList.add('sv2-area');a.append($('h2',title),$('p',desc));a.scrollIntoView({block:'start',behavior:'smooth'});return a;}
function storage(){try{return JSON.parse(localStorage.getItem('seviat-unit2-practice-v1')||'{}');}catch{return {};}}
function save(l,s,correct,total){try{const d=storage();const k=l+':'+s;const v=d[k]||{attempts:0,correct:0,total:0};v.attempts++;v.correct+=correct;v.total+=total;d[k]=v;localStorage.setItem('seviat-unit2-practice-v1',JSON.stringify(d));}catch(e){console.warn('تعذر حفظ التدريب',e);}}
function shuffle(a){return [...a].sort(()=>Math.random()-.5);}
function questions(l,skill){
 const i=letters.indexOf(l),name=names[i],list=[];
 const other=letters.filter(x=>x!==l);
 const optionSet=(correct,alternatives)=>shuffle([correct,...alternatives.filter(x=>x!==correct).slice(0,3)]);
 if(skill==='name'){
  for(let j=0;j<6;j++){
   const distract=other.slice(j%5).concat(other.slice(0,j%5));
   list.push({prompt:'أين حرف '+name+'؟',answer:l,options:optionSet(l,distract),hint:'يقرأ المعلم اسم الحرف بصوت واضح. لا يُعتمد النطق آليًا.'});
  }
 }else if(skill==='shape'){
  const forms=[l,l+'َ',l+'ِ',l+'ُ',l+'ْ',l];
  for(let j=0;j<6;j++){
   const distract=other.slice(j%5).concat(other.slice(0,j%5));
   list.push({prompt:'اختر الحرف المطابق للنموذج: '+forms[j],answer:l,options:optionSet(l,distract),hint:'انظر إلى جسم الحرف ونقاطه؛ الحركات لا تغير هوية الحرف.'});
  }
 }else if(skill==='vowels'){
  for(let j=0;j<6;j++){const v=j%3;list.push({prompt:'اختر '+l+[' بالفتحة',' بالكسرة',' بالضمة'][v],answer:l+vowels[v],options:shuffle(vowels.map(x=>l+x)),hint:'اقرأ الحركة القصيرة دون مد زائد.'});}
 }else if(skill==='sukoon'){
  const bases=['مَ','بَ','لَ','نَ','رَ','دَ'];
  for(let j=0;j<6;j++)list.push({prompt:'اختر المقطع الذي ينتهي بحرف '+name+' الساكن',answer:bases[j]+l+'ْ',options:shuffle([bases[j]+l+'ْ',bases[j]+letters[(i+1)%6]+'ْ',bases[j]+letters[(i+2)%6]+'ْ']),hint:'يقرأ المعلم المقطع كاملًا؛ لا ينطق الساكن وحده.'});
 }else if(skill==='madd'||skill==='syllable'){
  const forms=[l+'َا',l+'ُو',l+'ِي'];
  for(let j=0;j<6;j++){const k=j%3;list.push({prompt:skill==='madd'?['اختر المد بالألف','اختر المد بالواو','اختر المد بالياء'][k]:'ركّب المقطع الطويل: '+['فتحة + ألف','ضمة + واو','كسرة + ياء'][k],answer:forms[k],options:shuffle(forms),hint:'يقرأ المعلم النموذج ويراجع النطق.'});}
 }else if(skill==='position'){
  const nonJoining=new Set(['د','ر']);
  const forms=nonJoining.has(l)?[l,l+'ـ','ـ'+l]:[l,l+'ـ','ـ'+l+'ـ','ـ'+l];
  const unique=[...new Set(forms)];
  for(let j=0;j<6;j++){
   const target=unique[j%unique.length];
   list.push({prompt:'اختر شكل الحرف المطابق: '+target,answer:target,options:shuffle(unique),hint:'أشكال توضيحية للاتصال؛ يراجع المعلم اتصال الحرف في الكلمات.'});
  }
 }
 return list;
}
function practice(l,skill) {
  if (skill === 'writing') {
    window.openIndependentWriting?.();
    setTimeout(() => {
      const sel = document.querySelector('.sw-settings select');
      if (sel) {
        sel.value = l;
        sel.dispatchEvent(new Event('change', {bubbles:true}));
      }
    }, 0);
    return;
  }

  const bank = questions(l,skill);
  if (!bank.length) return;

  let n = 0;
  let score = 0;
  let timer = null;

  const a = area(
    'حرف ' + l + ' — ' + skills.find(x => x[0] === skill)[1],
    'استمع إلى السؤال ثم اختر الإجابة الصحيحة.'
  );
  if (!a) return;

  const prompt = $('div','','sv2-prompt');
  const hint = $('p','','sv2-hint');
  const opts = $('div','','sv2-options');
  const feed = $('p','','sv2-feedback');

  a.append(prompt,hint,opts,feed);

  function speak(text) {
    if (!window.AfaqAudioLibrary?.play) return;
    Promise.resolve(window.AfaqAudioLibrary.play(text))
      .catch(error => console.warn('Unit 2 audio:',error));
  }

  const next = button(a,'التالي',() => {
    clearTimeout(timer);
    window.AfaqAudioLibrary?.stop?.();
    n++;
    show();
  });

  next.hidden = true;

  function show() {
    clearTimeout(timer);

    if (n >= bank.length) {
      window.AfaqAudioLibrary?.stop?.();
      save(l,skill,score,bank.length);

      a.replaceChildren(
        $('h2','انتهى التدريب'),
        $('p','إجابات صحيحة: '+score+' من '+bank.length),
        $('p','هذه نتيجة تدريب وليست اعتماد إتقان.')
      );

      button(a,'إعادة التدريب',()=>practice(l,skill));
      button(a,'العودة إلى المهارات',()=>openLetter(l));
      return;
    }

    const q = bank[n];

    prompt.textContent =
      (n+1)+' / '+bank.length+' — '+q.prompt;

    hint.textContent = q.hint;
    opts.replaceChildren();
    feed.textContent = '';
    next.hidden = true;

    q.options.forEach(o => {
      const row = document.createElement('div');
      row.style.cssText =
        'display:flex;align-items:center;gap:8px;margin:6px 0';

      opts.appendChild(row);

      const listen = document.createElement('button');
      listen.type = 'button';
      listen.textContent = '🔊';
      listen.title = 'استمع إلى الاختيار';
      listen.setAttribute('aria-label','استمع إلى '+o);

      listen.addEventListener('click',() => speak(o));
      row.appendChild(listen);

      const choice = button(row,o,() => {
        if (!next.hidden) return;

        const ok = o === q.answer;
        if (ok) score++;

        window.AfaqAudioLibrary?.stop?.();
        sound(ok ? 'correct' : 'wrong');

        feed.textContent = ok
          ? '✓ إجابة صحيحة'
          : '✗ الإجابة الصحيحة: '+q.answer;

        [...opts.querySelectorAll('button')]
          .forEach(b => b.disabled = true);

        next.hidden = false;

        timer = setTimeout(() => {
          if (a.isConnected && next.isConnected && !next.hidden) {
            next.click();
          }
        }, 1800);
      });

      choice.style.flex = '1';
    });

    speak(q.prompt);
  }

  show();
}
function openLetter(l){let a=area('الوحدة الثانية — حرف '+l,'اختر المهارة. التدريب متاح دون اشتراط اجتياز حرف سابق.');if(!a)return;skills.forEach(([s,title])=>button(a,title,()=>practice(l,s)));button(a,'العودة إلى حروف الوحدة',openUnit2);}
function openUnit2(){let a=area('الوحدة الثانية — مدرستي','الحروف حسب ترتيب منهج لغتي: ص، ف، س، ق، ت، ح. هذه تدريبات تأسيسية، وليست تقييمات إتقان معتمدة.');if(!a)return;letters.forEach((l,i)=>button(a,l+' — '+names[i],()=>openLetter(l)));button(a,'سجل التدريبات',()=>{let b=area('سجل تدريبات الوحدة الثانية','يُحفظ في المتصفح الحالي فقط.');let d=storage();Object.keys(d).sort().forEach(k=>b.append($('p',k+' — '+d[k].correct+' / '+d[k].total+' صحيحة، '+d[k].attempts+' محاولات')));button(b,'عودة',openUnit2);});}
const prepLevels=[
 {title:'تمييز الاتجاهات',type:'direction',items:[
  {target:'←',choices:['←','→','↑','↓']},{target:'↑',choices:['↑','↓','←','→']},
  {target:'↗',choices:['↗','↘','↖','↙']},{target:'↙',choices:['↙','↗','↖','↘']}]},
 {title:'مطابقة الأنماط',type:'pattern',items:[
  {target:'● ■ ●',choices:['● ■ ●','■ ● ■','● ● ■']},
  {target:'▲ ● ▲ ●',choices:['▲ ● ▲ ●','● ▲ ● ▲','▲ ▲ ● ●']},
  {target:'◆ ■ ● ◆',choices:['◆ ■ ● ◆','◆ ● ■ ◆','■ ◆ ● ◆']},
  {target:'● ▲ ■ ◆ ●',choices:['● ▲ ■ ◆ ●','● ■ ▲ ◆ ●','◆ ▲ ■ ● ●']}]},
 {title:'الذاكرة والتسلسل',type:'memory',items:[
  {target:'● ■',choices:['● ■','■ ●','● ▲'],duration:2300},
  {target:'▲ ● ■',choices:['▲ ● ■','■ ● ▲','▲ ■ ●'],duration:2600},
  {target:'◆ ■ ● ▲',choices:['◆ ■ ● ▲','◆ ● ■ ▲','▲ ■ ● ◆'],duration:3000},
  {target:'● ▲ ◆ ■ ●',choices:['● ▲ ◆ ■ ●','● ◆ ▲ ■ ●','■ ▲ ◆ ● ●'],duration:3400}]},
 {title:'الانتباه البصري',type:'attention',items:[
  {target:'★',choices:['★','☆','▲','●']},
  {target:'◀',choices:['◀','▶','▲','▼']},
  {target:'⬟',choices:['⬟','⬢','⬡','◆']},
  {target:'↖',choices:['↖','↗','↙','↘']}]}
];
function openPrep(){
 const a=area('التهيئة والاستعداد — المستوى الثاني','اختر مهارة. أربعة مستويات متدرجة لكل مهارة؛ لا تُحسب درجات إتقان تلقائية.');
 if(!a)return;
 prepLevels.forEach((g,gi)=>button(a,g.title+' — 4 مستويات',()=>prepLevel(gi,0)));
 button(a,'العودة للتهيئة الأساسية',()=>window.openPreparation?.());
}
let prepTimer=null;
function stopPrepTimer(){if(prepTimer!==null){clearTimeout(prepTimer);prepTimer=null;}}
function prepLevel(gi,level){
 stopPrepTimer();const group=prepLevels[gi],item=group.items[level];
 const memory=group.type==='memory';
 const a=area(group.title+' — المستوى '+(level+1)+' من 4',memory?'احفظ ترتيب الرموز؛ سيختفي النموذج ثم اختر التسلسل الصحيح.':'انظر إلى النموذج واختر الشكل أو التسلسل المطابق.');
 if(!a)return;
 const target=$('div',item.target,'sv2-target');target.setAttribute('aria-label','النموذج');a.append(target);
 const options=$('div','','sv2-options');a.append(options);
 const feedback=$('p',memory?'احفظ التسلسل الآن':'اختر الإجابة','sv2-feedback');a.append(feedback);
 let ready=!memory,answered=false;
 const next=button(a,level===3?'العودة للمجموعات':'المستوى التالي',()=>level===3?openPrep():prepLevel(gi,level+1));next.hidden=true;
 const back=button(a,'العودة للمستويات',openPrep);
 function enableChoices(){
  if(!a.isConnected)return;
  ready=true;if(memory){target.textContent='؟ ؟ ؟';feedback.textContent='اختر التسلسل الذي شاهدته.';}
  shuffle(item.choices).forEach(x=>button(options,x,()=>{
   if(!ready||answered)return;
   if(x===item.target){answered=true;sound('correct');feedback.textContent='✓ أحسنت، إجابة صحيحة';[...options.children].forEach(b=>b.disabled=true);next.hidden=false;}
   else{sound('wrong');feedback.textContent='حاول مرة أخرى، راجع ترتيب الرموز.';}
  }));
 }
 if(memory){prepTimer=setTimeout(()=>{prepTimer=null;enableChoices();},item.duration);}else enableChoices();
}
function integrate(){
 const host=document.getElementById('stages');document.getElementById('sv2-entry')?.remove();
 if(!host)return;
 // Capture only the two relevant cards, preventing the old click handler from replacing the new view.
 host.addEventListener('click',function(e){
   const card=e.target.closest('[data-stage]');if(!card)return;
   const stage=card.dataset.stage;
   if(stage!=='preparation')return;
   e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();sound('click');
   if(stage==='letters'){
     if(typeof renderLetterPicker==='function')renderLetterPicker();
     const area=document.getElementById('activityArea');
   }else{
     window.openPreparation?.();
     const area=document.getElementById('activityArea');
     if(area){const b=button(area,'🌟 المستوى الثاني — التهيئة والاستعداد',openPrep);b.classList.add('sv2-integrated-entry');}
   }
 },true);
}
window.SeviatUnit2={questions,prepLevels,open:openUnit2,openLetter,openPreparationLevels:openPrep,questionCount:letters.length*7*6};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',integrate);else integrate();
})();
