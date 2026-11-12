(function () {
  'use strict';
  const R=window.Unit1Rules;
  const STORAGE='seviat-unit1-learning-v2';
  const titles={
    'letter-name':'اسم الحرف','letter-shape':'شكل الحرف','letter-sound':'صوت الحرف',
    'short-vowels':'الحركات القصيرة','sukoon':'السكون','long-vowels':'المدود',
    'letter-positions':'أشكال الحرف واتصاله','letter-detection':'تمييز الحرف في سلسلة',
    'sound-analysis':'تحليل الأصوات','syllable-building':'تركيب المقاطع','word-reading':'قراءة الكلمات',
    'letter-writing':'كتابة الحرف','word-writing':'كتابة الكلمات'
  };
  const nameMap={'م':'ميم','ب':'باء','ل':'لام','د':'دال','ن':'نون','ر':'راء'};
  let bank=[],activities=[],state={version:2,attempts:[],practice:{},writing:[]};
  let activeLetter='م',session=null,storageError=false;
  const freeBoard=(...args)=>window.openWritingBoard(...args);
  const oldPicker=renderLetterPicker;
  const oldStage=openStage;
  const api={ready:false,configure,openLetters,openSkill,openWriting,canWrite};
  window.Unit1Learning=api;
  function configure(data,legacy) {
    R.merge(data.questions,legacy);
    if(!Array.isArray(data.writingActivities)||data.writingActivities.length!==60)throw Error('Invalid writing activities');
    bank=data.questions;activities=data.writingActivities;
    const saved=localStorage.getItem(STORAGE);
    if(saved){
      try{const parsed=JSON.parse(saved);if(parsed.version!==2||!Array.isArray(parsed.attempts)||!Array.isArray(parsed.writing)||!parsed.practice)throw Error('state');if(parsed.confirmations!==undefined&&!Array.isArray(parsed.confirmations))throw Error('confirmations');if(parsed.practiceHistory!==undefined&&!Array.isArray(parsed.practiceHistory))throw Error('practiceHistory');state=parsed;}
      catch{storageError=true;throw Error('سجل التقدم الجديد غير قابل للقراءة. حُفظ دون تغيير؛ يلزم إصلاحه قبل متابعة التقييم.');}
    }
  }
  function persist(next) {
    if(storageError)throw Error('Progress is unreadable; refusing to overwrite');
    localStorage.setItem(STORAGE,JSON.stringify(next));state=next;
  }
  function el(tag,text,parent) {const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(parent)parent.appendChild(node);return node;}
  function button(parent,text,fn,id,disabled=false) {
    const b=el('button',text,parent);b.type='button';b.className='primary-button';b.style.cssText='margin:6px;padding:12px;min-height:46px';b.disabled=disabled;if(id)b.id=id;b.onclick=fn;return b;
  }
  function clear(title,cancel=true) {
    if(autoNextTimer!==null){clearTimeout(autoNextTimer);autoNextTimer=null;}
    if(cancel)session=null;
    const area=createActivityArea();area.innerHTML='';area.style.direction='rtl';el('h2',title,area);area.scrollIntoView({behavior:'smooth'});return area;
  }
  function note(parent,text){return el('p',text,parent);}
  function teacherPanel(parent,text) {
    const details=el('details',undefined,parent);details.style.cssText='margin:15px 0;padding:12px;border:1px solid #7995af;border-radius:8px';el('summary','للمعلم أو ولي الأمر — يُفتح بعيدًا عن نظر الطفل',details);note(details,text);details.querySelector('summary').addEventListener('click',event=>{if(!window.SeviatParentControls.isAuthenticated()){event.preventDefault();window.SeviatParentControls.requireTeacher(()=>{if(details.isConnected)details.open=true;});}});return details;
  }
  function checkbox(parent,text,id) {const label=el('label',undefined,parent);label.style.display='block';const input=el('input',undefined,label);input.type='checkbox';if(id)input.id=id;label.append(document.createTextNode(' '+text));return input;}

  const A=()=>window.SeviatAccessGuard;
  function poolFor(l,s,phase,mode,sub='all'){
    const pool=bank.filter(q=>q.letter===l&&q.skill===s&&q.phase===phase);
    return A().filterQuestions(pool,l,s,mode).filter(q=>(mode!=='assessment'||R.assessmentEligible(q))&&(sub==='all'||A().subskill(q)===sub));
  }
  function assessable(l,s,phase){
    const original=bank.filter(q=>q.letter===l&&q.skill===s&&q.phase===phase);
    const pool=poolFor(l,s,phase,'assessment');
    return R.letters.includes(l)&&R.selectAssessment(pool).length===5&&new Set(pool.map(q=>A().subskill(q))).size===new Set(original.map(q=>A().subskill(q))).size;
  }
  function canWrite(l,skill,mode='practice'){
    return R.letters.includes(l)&&A().isAllowed(l,skill,'all',mode);
  }
  function deny(){clear('النشاط غير متاح');note(createActivityArea(),'راجع صلاحيات المعلم ومتطلبات التدرج. لم يتغير سجل التقدم.');button(createActivityArea(),'العودة إلى الحروف',openLetters,'u1-denied-back');}
  function runAllowed(run){return run.mode==='assessment'?assessable(run.letter,run.skill,run.phase):run.questions.every(q=>A().isAllowed(q.letter,q.skill,A().subskill(q),'practice'));}
  window.addEventListener('seviat-access-changed',()=>{clear('تم تحديث إتاحة الأنشطة');A().denied();});
  function guard(){if(api.ready)return true;showMessage('تحميل الوحدة','انتظر اكتمال تحميل الأسئلة. إذا ظهرت رسالة خطأ، أصلح الملف المطلوب ثم أعد تحميل الصفحة.');return false;}
  function letterUnlocked(l){return R.letters.includes(l);}
  function statusText(l,s,phase='training'){if(bank.some(q=>q.letter===l&&q.skill===s&&q.phase===phase&&!R.assessmentEligible(q)))return (R.passed(state,l,s,phase)?'نتيجة سابقة محفوظة — ':'')+'التقييم بحاجة إلى مراجعة المعلم';return R.mastered(state,l,s,phase)?'إتقان مؤكد':R.passed(state,l,s,phase)?'اجتاز المهارة':'قيد التدريب';}
  function openLetters() {
    if(!guard())return;
    const area=clear('الوحدة الأولى — الحروف');
    note(area,'اختر أي حرف. ترتيب المنهج موصى به، وليس شرطًا لفتح الدروس.');
    note(area,'نتائج الاختبارات تُستخدم لتقييم التعلم، ولا تمنع فتح الحروف. يمكن للمعلم قفل الأنشطة من الإعدادات.');
    R.letters.forEach((l,i)=>button(area,(letterUnlocked(l)?'':'🔒 ')+l+(R.letterComplete(state,l)?' — المهارات الأساسية مجتازة':''),()=>openLetter(l),'u1-letter-'+i,!A().coarseAllowed('letter:'+l)));
    button(area,'المراجعة التراكمية للوحدة',openCumulative,'u1-cumulative',false);
    note(area,'المراجعة التراكمية متاحة، ويُفضّل تقديمها بعد تعلم الحروف الستة.');
    button(area,'بقية وحدات المنهج',()=>{session=null;oldPicker();},'u1-other-units');
  }
  function openLetter(l) {
    if(!guard())return;
    if(!R.letters.includes(l)){showMessage('الحرف خارج الوحدة الأولى','هذا التحديث يختص بالحروف م، ب، ل، د، ن، ر.');return;}
    if(!A().coarseAllowed('letter:'+l))return deny();
    activeLetter=l;currentLetter=l;
    const area=clear('مهارات حرف '+l);
    note(area,'التدريب يساعد على التعلم. اختبار المهارة وحده يسجل نتيجة؛ اعتمادها يتطلب تكرار النجاح وملاحظة المعلم.');
    R.coreSkills.forEach((s,i)=>{
      const count=poolFor(l,s,'training','practice').length;
      const unlocked=(count>0||assessable(l,s,'training'));
      button(area,(unlocked?'':'🔒 ')+titles[s]+' — '+count+' أسئلة تدريب متاحة — '+statusText(l,s),()=>openSkill(l,s),'u1-skill-'+s,!unlocked);
    });
    button(area,'كتابة الحرف — نشاط عملي وتقييم المعلم',()=>openWriting(l,'letter-writing'),'u1-writing',!canWrite(l,'letter-writing'));
    button(area,'العودة إلى الحروف',openLetters,'u1-back-letters');
  }
  function openCumulative() {
    if(!guard())return;
    
    const area=clear('المراجعة التراكمية — كلمات من حروف الوحدة');
    note(area,'تقرأ الكلمات بعد تعلم الحروف الستة والحركات والسكون والمدود. يشرح المعلم المعاني ويستمع لقراءة الطفل.');
    R.letters.forEach((l,i)=>{
      const section=el('section',undefined,area);el('h3','حرف '+l,section);
      button(section,'قراءة الكلمات',()=>openSkill(l,'word-reading','cumulative'),'u1-review-read-'+i);
      button(section,'تمييز الحرف داخل الكلمات',()=>openSkill(l,'letter-detection','cumulative'),'u1-review-detect-'+i);
      button(section,'كتابة الكلمات — مراجعة المعلم',()=>openWriting(l,'word-writing'),'u1-review-write-'+i);
    });
    button(area,'العودة إلى الحروف',openLetters);
  }
  function lesson(l,s) {
    const name=nameMap[l];
    return {
      'letter-name':'اسم هذا الحرف '+name+'. يشير المعلم إلى الحرف ويذكر اسمه. يقرأ المعلم الاختيارات المكتوبة؛ لا يشترط أن يقرأ الطفل كلمات أسماء الحروف.',
      'letter-shape':'تأمل شكل الحرف '+l+' ونقاطه. الأشكال الهندسية مشتتات بصرية وليست حروفًا جديدة.',
      'letter-sound':'ينطق المعلم صوت الحرف في أمثلة قصيرة ويشير إلى رسمه. اسم الحرف يختلف عن صوته؛ لا نعتمد على نطق آلي.',
      'short-vowels':l+'َ بالفتحة، '+l+'ِ بالكسرة، '+l+'ُ بالضمة. يعرض المعلم الحركة وينطق الصوت الصحيح.',
      'sukoon':'علامة السكون تعني عدم وجود حركة. ينطق الساكن مع ما قبله، مثل مَ'+l+'ْ. المقاطع هنا للتدريب، وليست كلها كلمات.',
      'long-vowels':'المد بالألف بعد الفتحة: '+l+'َا. وبالياء بعد الكسرة: '+l+'ِي. وبالواو بعد الضمة: '+l+'ُو.',
      'letter-positions':['د','ر'].includes(l)?'لحرف '+name+' شكل منفصل '+l+'، ومتصل بما قبله ـ'+l+'. لا يتصل بما بعده.':'أشكال الحرف: '+l+' منفصل، '+l+'ـ متصل بما بعده، ـ'+l+'ـ متصل من الجانبين، ـ'+l+' متصل بما قبله. شكل الحرف يتبع الاتصال، لا موضعه وحده.',
      'letter-detection':'نبحث عن الحرف داخل سلسلة، من اليمين إلى اليسار، ثم نحدد موضعه أو عدد مرات ظهوره. هذه تهيئة بصرية لتمييزه داخل الكلمات.',
      'sound-analysis':'نحلل هنا أصوات مقاطع قصيرة: صوت متحرك يتبعه ساكن. تحليل الأصوات ليس تقسيم الكلمة إلى مقاطع نطقية؛ يوضح المعلم الفرق.',
      'syllable-building':'نركب صوتًا متحركًا مع ساكن، أو نضيف حرف المد الموافق للحركة. المقاطع التدريبية لا تقدم بوصفها كلمات ذات معنى.',
      'word-reading':'يشرح المعلم معنى الكلمة، ثم يطلب قراءتها والاستماع إلى النموذج البشري. تقرأ الأسماء هنا بالوقف. مطابقة البطاقة ليست وحدها دليلًا على طلاقة القراءة.'
    }[s];
  }
  function openSkill(l,s,phase='training') {
    if(!guard())return;
    if((!poolFor(l,s,phase,'practice').length&&!assessable(l,s,phase)))return deny();
    activeLetter=l;currentLetter=l;
    const area=clear(titles[s]+' — '+l);note(area,phase==='cumulative'&&s==='letter-detection'?'نحدد الحرف داخل كلمات من حروف الوحدة الستة، بعد تعلمها جميعًا. يقرأ المعلم الكلمة ويشرح معناها.':lesson(l,s));
    const attempts=state.attempts.filter(a=>a.key===R.stateKey(l,s,phase));
    const latest=attempts.at(-1);
    note(area,statusText(l,s,phase)+' — الإتاحة منفصلة عن اجتياز الاختبار.');
    if(latest)note(area,'آخر محاولة: '+latest.results.filter(r=>r.correct).length+' من '+latest.results.length+'. إعادة الاختبار المبكرة للتدريب على الاختبار؛ لا تضيف نجاحًا متباعدًا قبل مرور ٢٤ ساعة.');
    
    if(bank.some(q=>q.letter===l&&q.skill===s&&q.phase===phase&&!R.assessmentEligible(q)))note(area,'هذه الأسئلة تدريب بإشراف المعلم فقط؛ إجابتها الثابتة لا تثبت التمييز السمعي. الاختبار الآلي معلّق حتى مراجعة بديل صالح. النتائج السابقة محفوظة دون تغيير، وقد يتوقف فتح المهارات التالية للمتعلم الجديد.');
    if(latest)showSubskills(area,latest);
    const pool=poolFor(l,s,phase,'practice');
    const subskills=[...new Set(pool.map(q=>A().subskill(q)))];
    const label=el('label','جزء التدريب: ',area),selector=el('select',undefined,label);selector.id='u1-subskill';
    for(const sub of ['all',...subskills.filter(x=>x!=='all')]){const option=el('option',({all:'كل الأجزاء المتاحة',fatha:'الفتحة',kasra:'الكسرة',damma:'الضمة',alif:'المد بالألف',waw:'المد بالواو',ya:'المد بالياء'})[sub]||sub,selector);option.value=sub;}
    note(area,'المتاح الآن: '+pool.length+' سؤال تدريب. الاختبار يتطلب خمسة أسئلة وتغطية جميع أجزاء المهارة.');
    button(area,'ابدأ التدريب',()=>start(l,s,phase,'practice',selector.value),'u1-start-practice',pool.length===0);
    button(area,'اختبار المهارة',()=>start(l,s,phase,'assessment'),'u1-start-assessment',!assessable(l,s,phase));
    if(!assessable(l,s,phase))note(area,'الاختبار غير متاح: يلزم خمسة أسئلة صالحة تغطي جميع أجزاء المهارة، مع السماح من إعدادات المعلم.');
    button(area,'العودة إلى المهارات',()=>phase==='cumulative'?openCumulative():openLetter(l),'u1-back-skills');
  }
  function start(l,s,phase,mode,sub='all') {
    if(mode==='assessment'?!assessable(l,s,phase):!poolFor(l,s,phase,'practice').length)return deny();
    const pool=poolFor(l,s,phase,mode,mode==='practice'?sub:'all');
    if(!pool.length)return deny();
    const shuffled=shuffleArray(pool);
    const selected=mode==='assessment'?R.selectAssessment(shuffled):shuffled;
    if(mode==='assessment'&&selected.length!==5)return deny();
    session={id:crypto.randomUUID(),key:R.stateKey(l,s,phase),letter:l,skill:s,phase,mode,questions:selected,index:0,results:[],saved:false};
    render();
  }
  function render() {
    if (!session) return;
    if (session.index >= session.questions.length) {
      finish();
      return;
    }

    const run = session;
    if(!runAllowed(run))return deny();
    const q = run.questions[run.index];
    const practiceMode = run.mode === 'practice';

    const area = clear(
      (practiceMode ? 'تدريب: ' : 'اختبار: ') + titles[run.skill],
      false
    );

    area.dataset.questionId = q.id;

    note(area, 'السؤال ' + (run.index + 1) + ' من ' + run.questions.length);
    el('h3', q.prompt, area);

    const options = el('div', undefined, area);
    options.id = 'u1-options';
    options.style.cssText =
      'display:flex;gap:10px;flex-wrap:wrap';

    const feedback = el('p', 'اختر الإجابة الصحيحة.', area);
    feedback.id = 'u1-feedback';
    feedback.setAttribute('aria-live', 'polite');

    let teacherReady = q.type !== 'teacher-listening';
    let answered = false;
    let transitioning = false;
    const tried = new Set();

    const next = button(
      area,
      'التالي',
      () => {
        if (answered && session === run && !transitioning) {
          transitioning = true;
          run.index++;
          render();
        }
      },
      'u1-next',
      true
    );

    next.style.display = 'none';

    function advance() {
      if (transitioning || session !== run) return;
      transitioning = true;

      autoNextTimer=setTimeout(() => {
        if (session !== run) return;
        if(!runAllowed(run))return deny();
        run.index++;
        render();
      }, 2000);
    }

    const buttons = shuffleArray(q.options).map(option => {
      const b = button(options, option, () => {
        if (answered || !teacherReady || session !== run) return;
        if(!runAllowed(run))return deny();

        const correct = option === q.answer;

        window.SeviatEffects?.play(correct ? 'correct' : 'wrong');

        if (practiceMode && !correct) {
          tried.add(option);

          b.style.setProperty('background', '#fee2e2', 'important');
          b.style.setProperty('border-color', '#dc2626', 'important');
          b.style.setProperty('color', '#7f1d1d', 'important');

          b.disabled = true;

          feedback.textContent =
            'حاول مرة أخرى، أنت تستطيع!';

          feedback.style.color = '#f87171';

          return;
        }

        answered = true;

        run.results.push({
          id: q.id,
          answer: option,
          correct
        });

        buttons.forEach(x => {
          x.disabled = true;

          if (x.dataset.answerValue === q.answer && practiceMode) {
            x.style.setProperty('background', '#bbf7d0', 'important');
            x.style.setProperty('border-color', '#15803d', 'important');
            x.style.setProperty('color', '#14532d', 'important');
            x.textContent = '✓ ' + x.textContent;
          }
        });

        if (practiceMode) {
          feedback.textContent = '✓ أحسنت! إجابة صحيحة.';
          feedback.style.color = '#22c55e';

          const practice = {
            ...state.practice,
            [q.id]: {
              correct: true,
              at: Date.now()
            }
          };

          try {
            persist({
              ...state,
              practice,
              practiceHistory: [
                ...(state.practiceHistory || []),
                {
                  id: crypto.randomUUID(),
                  questionId: q.id,
                  answer: option,
                  correct: true,
                  retries: tried.size,
                  at: Date.now()
                }
              ]
            });
          } catch (error) {
            feedback.textContent +=
              ' تعذر حفظ التدريب: ' + error.message;
          }
        } else {
          feedback.textContent =
            'تم تسجيل إجابتك. ننتقل للسؤال التالي.';
        }

        advance();
      });

      b.dataset.answerValue = option;
      b.style.fontSize = '26px';
      b.disabled = !teacherReady;

      return b;
    });

    if (q.type === 'teacher-listening') {
      const teacher = teacherPanel(
        area,
        'النص الذي ينطقه المعلم: ' +
          q.audioText + '. ' +
          (q.teacherNote || 'ينطق المعلم بوضوح دون عرض الإجابة.')
      );

      button(
        teacher,
        'قرأت النموذج للطفل وأغلقت الإرشادات',
        () => {
          teacher.open = false;
          teacherReady = true;
          if (!answered) {
            buttons.forEach(b => {
              if (!tried.has(b.dataset.answerValue)) b.disabled = false;
            });
          }
        },
        'u1-teacher-read'
      );

      note(
        area,
        'يقرأ المعلم النموذج بعيدًا عن نظر الطفل قبل إتاحة الخيارات.'
      );
    } else if (q.teacherNote) {
      const hint=el('details',undefined,area);el('summary','إرشادات إضافية للمعلم',hint);note(hint,q.teacherNote);
    }

    button(
      area,
      'إيقاف والعودة دون احتساب اختبار',
      () => openSkill(run.letter, run.skill, run.phase),
      'u1-cancel'
    );
  }
  function showSubskills(area,attempt) {
    const labels={fatha:'الفتحة',kasra:'الكسرة',damma:'الضمة',alif:'المد بالألف',ya:'المد بالياء',waw:'المد بالواو'};
    const report=R.subskillReport(attempt,bank);
    if(!report.length)return;
    const section=el('section',undefined,area);section.id='u1-subskill-report';
    el('h3','ملاحظات أجزاء المهارة في هذه المحاولة',section);
    for(const r of report)note(section,labels[r.subskill]+': '+r.correct+' من '+r.total+' — '+(!r.total?'لم يُقيَّم في هذه المحاولة':r.correct<r.total?'يحتاج إلى مراجعة وتدريب':'إجابات صحيحة في هذه العينة المحدودة'));
    note(section,'اجتياز ٤ من ٥ يبقى نتيجة المهارة الإجمالية؛ لا يثبت إتقان كل حركة أو مد. تُراجع الأجزاء الضعيفة مستقلة.');
  }
  function finish() {
    const run=session;if(!run)return;
    if(!runAllowed(run))return deny();
    const area=clear(run.mode==='assessment'?'نتيجة المحاولة':'انتهى التدريب',false);
    const correct=run.results.filter(r=>r.correct).length;
    note(area,'الإجابات الصحيحة: '+correct+' من '+run.results.length+'. هذه نتيجة محاولة وليست حكمًا منفردًا بالإتقان.');
    for(const result of run.results.filter(r=>!r.correct)){
      const q=run.questions.find(x=>x.id===result.id);
      note(area,q.prompt+' — إجابتك: '+result.answer+' — الصحيح: '+q.answer);
    }
    if(run.mode==='assessment'){
      showSubskills(area,run);

      const status=note(area,'');status.id='u1-attempt-status';
      function saveResult(){
        if(run.saved)return true;
        if(!runAllowed(run))return false;
        const attempt={id:run.id,key:run.key,mode:run.mode,completedAt:Date.now(),independent:false,teacherConfirmed:false,results:run.results};
        try{persist(R.record(state,attempt,bank));run.saved=true;
          status.textContent=statusText(run.letter,run.skill,run.phase)+' — حُفظت المحاولة.';
          if(R.successful(attempt))window.SeviatEffects?.play('success');
          return true;
        }catch(error){status.textContent='تعذر حفظ المحاولة؛ أعد المحاولة قبل المغادرة: '+error.message;return false;}
      }
      if(!saveResult())button(area,'إعادة حفظ المحاولة',saveResult,'u1-retry-save');
      const teacher=teacherPanel(area,'المحاولة محفوظة تلقائيًا. تأكيدك مستقل عن الاجتياز وفتح المهارة التالية. يؤكد الإتقان نجاح مراجعة بعد ٢٤ ساعة بأداء مستقل.');
      const independent=checkbox(teacher,'أجاب الطفل بصورة مستقلة دون تلميح إلى الإجابة.','u1-independent');
      const confirmed=checkbox(teacher,'أنا المعلم أو ولي الأمر، وقد راجعت أداء الطفل.','u1-confirmed');
      const save=button(teacher,'حفظ تأكيد المعلم',()=>{
        if(session!==run)return;
        if(!window.SeviatParentControls.isAuthenticated()){window.SeviatParentControls.requireTeacher(()=>{});status.textContent='سجّل الدخول ثم أعد حفظ التأكيد.';return;}
        if(!confirmed.checked){status.textContent='المحاولة محفوظة؛ يلزم تحديد تأكيد المعلم لتسجيل ملاحظته.';return;}
        if(!saveResult())return;
        try{persist(R.confirm(state,run.id,independent.checked));save.disabled=true;status.textContent=statusText(run.letter,run.skill,run.phase)+' — حُفظ تأكيد المعلم.';}
        catch(error){status.textContent='تعذر حفظ تأكيد المعلم: '+error.message;}
      },'u1-save-attempt');
    }else note(area,'التدريب لا يفتح مهارة ولا يعد اختبار إتقان.');
    button(area,'العودة إلى المهارات',()=>run.phase==='cumulative'?openCumulative():openLetter(run.letter),'u1-finish-back');
  }
  function openWriting(l,skill) {
    if(!guard())return;
    const phase=skill==='word-writing'?'cumulative':'training';
    if(!canWrite(l,skill))return deny();
    const area=clear(titles[skill]+' — نشاط عملي');
    note(area,'يكتب الطفل على الورق. يراجع المعلم الخط بنفسه؛ لا توجد إجابات اختيار من متعدد، ولا تصحيح آلي، ولا نقاط لهذا النشاط.');
    const list=activities.filter(a=>a.letter===l&&a.skill===skill);
    list.forEach((a,i)=>{
      const section=el('section',undefined,area);section.style.cssText='border:1px solid #aaa;padding:12px;margin:14px 0;border-radius:10px';
      el('h3','النشاط '+(i+1)+' — '+(a.mode==='copy'?'انسخ: '+a.target:'استمع إلى المعلم ثم اكتب.'),section);
      const teacher=teacherPanel(section,'النموذج: '+a.target+'. راجع الحروف والنقاط والاتصال والحركات.');
      const criteria=a.rubric.map((text,j)=>checkbox(teacher,text,'u1-writing-'+i+'-'+j));
      const observation=el('textarea',undefined,teacher);observation.setAttribute('aria-label','ملاحظات المعلم للنشاط '+(i+1));observation.placeholder='ملاحظات المعلم وخطوة التدريب التالية';
      const confirmation=checkbox(teacher,'أنا المعلم أو ولي الأمر وقد شاهدت الكتابة الفعلية.','u1-writing-confirm-'+i);
      const status=note(section,'');status.id='u1-writing-status-'+i;
      const saved=state.writing.filter(x=>x.activityId===a.id).at(-1);
      if(saved)status.textContent='يوجد تقييم سابق محفوظ؛ يمكن تسجيل مراجعة جديدة.';
      button(teacher,'حفظ ملاحظة المعلم',()=>{
        if(!canWrite(l,skill,'assessment')){status.textContent='تقييم الكتابة مغلق من إعدادات المعلم.';return;}
        if(!window.SeviatParentControls.isAuthenticated()){window.SeviatParentControls.requireTeacher(()=>{});status.textContent='سجّل الدخول ثم أعد حفظ التقييم.';return;}
        if(!confirmation.checked){status.textContent='يلزم الاطلاع على الكتابة وتأكيد المعلم.';return;}
        const entry={id:crypto.randomUUID(),activityId:a.id,at:Date.now(),criteria:a.rubric.map((criterion,j)=>({criterion,observed:criteria[j].checked})),note:observation.value,teacherConfirmed:true};
        try{persist({...state,writing:[...state.writing,entry]});status.textContent='حُفظ تقييم المعلم منفصلًا؛ لم تتغير النقاط أو نتائج الاختبارات.';confirmation.checked=false;}
        catch(error){status.textContent='تعذر الحفظ: '+error.message;}
      },'u1-save-writing-'+i);
    });
    if(skill==='letter-writing'&&freeBoard)button(area,'سبورة حرة إضافية دون تقييم آلي',()=>{freeBoard(l);button(createActivityArea(),'العودة إلى أنشطة الكتابة',()=>openWriting(l,skill));},'u1-free-board');
    button(area,'العودة',()=>phase==='cumulative'?openCumulative():openLetter(l),'u1-writing-back');
  }
  renderLetterPicker=openLetters;
  openLetterActivity=function(){openLetter(currentLetter);};
  openLetterPractice=function(){openLetter(currentLetter||activeLetter);};
  openLegacyLetterPractice=openLetterPractice;
  openLetterAssessment=function(){openLetter(currentLetter||activeLetter);};
  openStage=function(stage){
    if(!guard())return;
    if(!A().coarseAllowed(stage))return deny();
    clear('');
    if(['letters','movements','combination','writing','games'].includes(stage)){openLetters();return;}
    oldStage(stage);
  };
  window.openWordBuilder=function(l){openSkill(l||activeLetter,'syllable-building');};
})();