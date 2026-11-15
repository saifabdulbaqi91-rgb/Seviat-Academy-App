'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),stage=path.join(root,'.unit1-staging');
const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
const json=f=>JSON.parse(read(f));
const rules=require(path.join(stage,'unit1-rules.js'));
const letters=rules.letters,names=['ميم','باء','لام','دال','نون','راء'];
const sourceFiles=['data/questions.json','data/group1-reading-extra.json','data/meem-questions.json','data/group1-extra.json'];
const ctx={window:{},console:{log(){}},questionsData:{questions:[]}};
vm.runInNewContext(read('group1-engine.js'),ctx);
const history=sourceFiles.flatMap(f=>json(f).questions).concat(JSON.parse(JSON.stringify(ctx.window.SeviatGroup1.questions)));
assert.equal(new Set(history.map(q=>q.id)).size,history.length);
const bank=[],writing=[],dictionary=[
 ['مَالْ','مال'],['رَمْلْ','رمل'],['مَنَارْ','منار'],['مِبْرَدْ','مبرد'],['مِنْدِيلْ','منديل'],
 ['بَابْ','باب'],['لَبَنْ','لبن'],['بَلَدْ','بلد'],['بَلَلْ','بلل'],['بَدْرْ','بدر'],
 ['دَارْ','دار'],['دُولَابْ','دولاب'],['نَارْ','نار'],['نُورْ','نور'],['مِنْبَرْ','منبر']
];
const wordIndexes=[[0,1,2,3,4],[5,6,7,8,9],[0,1,6,7,8],[10,11,9,4,3],[12,13,6,2,14],[1,12,13,10,9]];
function add(l,s,op,stimulus,prompt,options,answer,extra={}) {
 const q={id:'u1-v2-'+l.codePointAt(0).toString(16)+'-'+s+'-'+bank.filter(x=>x.letter===l&&x.skill===s).length,unit:1,letter:l,skill:s,type:'multiple-choice',phase:'training',operation:op,stimulus,prompt,options,answer,requiredLetters:letters.slice(0,letters.indexOf(l)+1),...extra};
 bank.push(q);return q;
}
letters.forEach((l,i)=>{
 const name=names[i],known=letters.slice(0,i+1),other=known.filter(x=>x!==l),distractors=[...other,'○','□'].slice(0,2);
 const forms=['د','ر'].includes(l)?[l,'ـ'+l]:[l,l+'ـ','ـ'+l+'ـ','ـ'+l];
 const vowels=[l+'َ',l+'ِ',l+'ُ'],longs=[l+'َا',l+'ِي',l+'ُو'];
 // Name choices are read by the teacher, not independently decoded by the child.
 add(l,'letter-name','name-glyph',l,'ما اسم الحرف المعروض: '+l+'؟',[name,...names.filter(n=>n!==name).slice(0,2)],name,{teacherNote:'يقرأ المعلم أسماء الاختيارات؛ لا يطلب من الطفل تهجئة كلمات الأسماء.'});
 add(l,'letter-name','hear-name',name,'استمع إلى اسم الحرف، ثم اختر بطاقته.',[l,...distractors],l,{type:'teacher-listening',audioText:name});
 add(l,'letter-name','named-position',distractors[0]+'، '+l+'، '+distractors[1],'أي موضع يحمل حرف '+name+' في السطر: '+distractors[0]+'، '+l+'، '+distractors[1]+'؟',['الأول','الثاني','الثالث'],'الثاني');
 add(l,'letter-name','name-symbol-pair',l+'|'+name,'أي بطاقة تجمع اسم الحرف ورسمه الصحيح؟',[name+' : '+l,name+' : ○',name+' : □'],name+' : '+l);
 add(l,'letter-name','name-from-context',l+'، ○، '+l,'ما اسم الحرف الذي تكرر في: '+l+'، ○، '+l+'؟',[name,...names.filter(n=>n!==name).slice(-2)],name,{teacherNote:'يقرأ المعلم أسماء الاختيارات.'});
 add(l,'letter-shape','identify-letter',name,'ابحث عن حرف '+name+'.',[l,...distractors],l);
 add(l,'letter-shape','match-shape',l,'أي بطاقة تماثل هذا النموذج: '+l+'؟',[l,...distractors],l);
 add(l,'letter-shape','matching-pair',l,'أي بطاقة تحتوي على حرفين متماثلين؟',[l+' '+l,l+' ○',l+' □'],l+' '+l);
 const dotCount=['ب','ن'].includes(l)?'نقطة واحدة':'بلا نقاط';
 add(l,'letter-shape','count-dots',l,'كم نقطة في رسم الحرف '+l+'؟',['بلا نقاط','نقطة واحدة','نقطتان'],dotCount);
 add(l,'letter-shape','visual-difference',l+' '+l+' □','أي بطاقة تختلف عن الحرفين في: '+l+'، '+l+'، □؟',[l,'□'],'□');
 [...vowels,...longs.slice(0,2)].forEach((sound,j)=>add(l,'letter-sound','identify-heard-consonant',sound,'استمع إلى الصوت، ثم اختر الحرف الذي ينطقه المعلم.',[l,...distractors],l,{type:'teacher-listening',audioText:sound,teacherNote:'المعلم ينطق الصوت طبيعيًا دون تحويله إلى اسم الحرف. لا يتطلب هذا السؤال تسمية الحركة أو المد.'}));
 ['الفتحة','الكسرة','الضمة'].forEach((v,j)=>{
 add(l,'short-vowels','identify-mark',v,'اختر حرف '+name+' مع '+v+'.',vowels,vowels[j],{validation:{kind:'vowel',index:j}});
 add(l,'short-vowels','hear-short',vowels[j],'استمع إلى المعلم، ثم اختر الصوت الصحيح.',vowels,vowels[j],{type:'teacher-listening',audioText:vowels[j],validation:{kind:'heard'}});
 });
 add(l,'sukoon','identify-sukoon',l+'ْ','اختر حرف '+name+' وعليه سكون.',[l+'ْ',vowels[0],vowels[2]],l+'ْ',{validation:{kind:'sukoon'}});
 add(l,'sukoon','name-sukoon',l+'ْ','ما اسم العلامة فوق الحرف في '+l+'ْ؟',['السكون','الفتحة','الضمة'],'السكون');
 add(l,'sukoon','silent-ending','مَ'+l,'أي مقطع ينتهي بحرف ساكن؟',['مَ'+l+'ْ','مَ'+l+'َ','مَ'+l+'ُ'],'مَ'+l+'ْ',{validation:{kind:'silent-ending'}});
 ['مَ','مُ'].forEach(v=>add(l,'sukoon','hear-closed',v+l+'ْ','استمع إلى المقطع، ثم اختر ما سمعت.',[v+l+'ْ',v+l+'َ',v+l+'ُ'],v+l+'ْ',{type:'teacher-listening',audioText:v+l+'ْ',validation:{kind:'heard'},teacherNote:'مقطع للتدريب وليس كلمة. ينطق الساكن مع ما قبله دون إضافة حركة.'}));
 ['الألف','الياء','الواو'].forEach((v,j)=>{
 add(l,'long-vowels','identify-madd',v,'اختر حرف '+name+' الممدود بـ'+v+'.',longs,longs[j],{validation:{kind:'madd',index:j}});
 add(l,'long-vowels','hear-madd',longs[j],'استمع إلى المعلم، ثم اختر المقطع الممدود.',longs,longs[j],{type:'teacher-listening',audioText:longs[j],validation:{kind:'heard'}});
 });
 if(forms.length===4){
 ['المنفصل','المتصل بما بعده فقط','المتصل من الجانبين','المتصل بما قبله فقط'].forEach((v,j)=>add(l,'letter-positions','connection-form',String(j),'اختر الشكل '+v+' لحرف '+name+'.',forms,forms[j],{validation:{kind:'form',index:j}}));
 add(l,'letter-positions','first-in-chain',l+'م','انظر إلى سلسلة الحروف '+l+'م. ما شكل الحرف الأول؟',forms,l+'ـ',{validation:{kind:'form',index:1}});
 }else{
 add(l,'letter-positions','connection-form','0','اختر الشكل المنفصل لحرف '+name+'.',forms,l,{validation:{kind:'form',index:0}});
 add(l,'letter-positions','connection-form','1','اختر شكل حرف '+name+' المتصل بما قبله.',forms,'ـ'+l,{validation:{kind:'form',index:1}});
 add(l,'letter-positions','joins-next',l,'هل يتصل حرف '+name+' بالحرف الذي يأتي بعده؟',['نعم','لا'],'لا');
 add(l,'letter-positions','first-in-chain',l+'م','في سلسلة الحروف '+l+'م، ما شكل الحرف الأول؟',forms,l,{validation:{kind:'form',index:0}});
 add(l,'letter-positions','last-in-chain','م'+l,'في سلسلة الحروف م'+l+'، ما شكل الحرف الأخير؟',forms,'ـ'+l,{validation:{kind:'form',index:1}});
 }
 const sequences=[l+' ○ '+l,'○ '+l+' □',l+' □ ○','○ □ '+l,l+' '+l+' '+l];
 sequences.forEach((seq,j)=>{
 if(j===0||j===4)add(l,'letter-detection','count-in-sequence',seq,'كم مرة يظهر حرف '+name+' في: '+seq+'؟',['١','٢','٣'],j===0?'٢':'٣',{validation:{kind:'count',sequence:seq}});
 else add(l,'letter-detection','locate-in-sequence',seq,'أين حرف '+name+' في السطر: '+seq+'؟',['أول السطر','وسط السطر','آخر السطر'],['','وسط السطر','أول السطر','آخر السطر'][j],{validation:{kind:'locate',sequence:seq}});
 });
 const closed='مُ'+l+'ْ',parts=['مُ',l+'ْ'];
 add(l,'sound-analysis','first-sound','مَ'+l+'ْ','ما الصوت الأول في المقطع مَ'+l+'ْ؟',['مَ','مِ','مُ'],'مَ');
 add(l,'sound-analysis','last-sound','مِ'+l+'ْ','ما الصوت الأخير في المقطع مِ'+l+'ْ؟',[l+'ْ',l+'َ',l+'ُ'],l+'ْ');
 add(l,'sound-analysis','split-closed',closed,'اختر تحليل المقطع إلى صوت متحرك ثم ساكن: '+closed,[parts.join(' + '),[...parts].reverse().join(' + '),'مَ + '+l+'ْ'],parts.join(' + '),{validation:{kind:'parts',parts}});
 add(l,'sound-analysis','recognize-closed',l+'م','أي مقطع يتكون من صوت مفتوح يتبعه صوت ساكن؟',[l+'َمْ',l+'َمَ',l+'ُمُ'],l+'َمْ');
 add(l,'sound-analysis','heard-sound-order',l+'ُ|مْ','استمع إلى المقطع، ثم اختر ترتيب صوتيه.',[l+'ُ + مْ','مْ + '+l+'ُ',l+'ِ + مْ'],l+'ُ + مْ',{type:'teacher-listening',audioText:l+'ُمْ',teacherNote:'ينطق المعلم المقطع كاملًا دون إضافة حركة إلى الساكن. يختار الطفل ترتيب الصوت المتحرك والساكن؛ هذا تحليل أصوات.'});
 longs.forEach((v,j)=>add(l,'syllable-building','combine-madd',vowels[j]+'|'+['ا','ي','و'][j],'أضف حرف المد '+['ا','ي','و'][j]+' إلى '+vowels[j]+'. أي مقطع يتكون؟',longs,v,{validation:{kind:'madd',index:j}}));
 ['َ','ُ'].forEach(v=>add(l,'syllable-building','combine-closed',l+v+'|مْ','ركّب المقطع من '+l+v+' ثم مْ.',[l+'َمْ',l+'ُمْ',l+'ِمْ'],l+v+'مْ',{validation:{kind:'combine',parts:[l+v,'مْ']},teacherNote:'هذا مقطع للتدريب؛ لا نقدمه للطفل بوصفه كلمة ذات معنى.'}));
 wordIndexes[i].forEach((wi,j)=>{
 const word=dictionary[wi][0],alternatives=dictionary.filter(([w])=>w!==word).slice(j,j+2).map(x=>x[0]);
 add(l,'word-reading','read-heard-word',word,'استمع إلى الكلمة، ثم اقرأ البطاقات واختر ما سمعت.',[word,...alternatives],word,{phase:'cumulative',requiredLetters:letters,type:'teacher-listening',audioText:word,validation:{kind:'heard'},teacherNote:'تقرأ الأسماء بالوقف. يوضح المعلم المعنى شفهيًا، ويستمع أيضًا لقراءة الطفل؛ اختيار البطاقة وحده لا يثبت الطلاقة.'});
 const occurrences=[...dictionary[wi][1]].filter(ch=>ch===l).length;
 add(l,'letter-detection','count-in-word',word,'كم مرة ترى حرف '+name+' داخل كلمة '+word+'؟',['١','٢','٣'],['٠','١','٢','٣'][occurrences],{phase:'cumulative',requiredLetters:letters,teacherNote:'يقرأ المعلم الكلمة ويشرح معناها. يحدد الطفل الحرف داخل كلمة حقيقية بعد تعلم حروف الوحدة.'});
 writing.push({id:'u1-write-word-'+i+'-'+j,letter:l,skill:'word-writing',phase:'cumulative',target:word,mode:j%2?'dictation':'copy',rubric:['ترتيب الحروف','صحة الاتصال','الحركات والمدود','الاستقلال دون مساعدة']});
 });
 [l,'ـ'+l,l+'َ',l+'ِ',l+'ُ'].forEach((target,j)=>writing.push({id:'u1-write-letter-'+i+'-'+j,letter:l,skill:'letter-writing',phase:'training',target,mode:j<2?'copy':'dictation',rubric:['شكل الحرف والنقاط','اتجاه الكتابة','الاتصال أو الحركة','الاستقلال دون مساعدة']}));
});
// Reuse an ID only for an equivalent task. All source records remain byte-for-byte intact.
function equivalent(q) {
 const l=q.letter,p=q.prompt||'',a=q.answer||'';
 if(!letters.includes(l))return null;
 const find=(s,op,stim)=>bank.find(n=>n.letter===l&&n.skill===s&&n.operation===op&&n.stimulus===stim);
 if(q.skill==='letter-name'&&p.includes('اسم الحرف'))return find('letter-name','hear-name',names[letters.indexOf(l)]);
 if(q.skill==='letter-shape'&&!p.includes('دائرة'))return find('letter-shape','identify-letter',names[letters.indexOf(l)]);
 if(q.skill==='short-vowels'){
 const j=['َ','ِ','ُ'].findIndex(v=>a.includes(v));if(j<0)return null;
 return find(q.skill,p.includes('ينطق')||q.type.includes('listening')?'hear-short':'identify-mark',p.includes('ينطق')||q.type.includes('listening')?l+['َ','ِ','ُ'][j]:['الفتحة','الكسرة','الضمة'][j]);
 }
 if(q.skill==='sukoon'&&!p.includes('كلمة'))return find(q.skill,'identify-sukoon',l+'ْ');
 if(q.skill==='long-vowels'){
 const j=['ا','ي','و'].findIndex(v=>a.endsWith(v));if(j<0)return null;
 const hearing=p.includes('ينطق')||q.type.includes('listening');
 return find(q.skill,hearing?'hear-madd':'identify-madd',hearing?[l+'َا',l+'ِي',l+'ُو'][j]:['الألف','الياء','الواو'][j]);
 }
 if(q.skill==='letter-positions'&&!p.includes('كلمة موز')&&!p.includes('كلمة قلم')&&!p.includes('كلمة تمر')){
 const forms=['د','ر'].includes(l)?[l,'ـ'+l]:[l,l+'ـ','ـ'+l+'ـ','ـ'+l];const j=forms.indexOf(a);
 if(j>=0)return find(q.skill,'connection-form',String(j));
 }
 return null;
}
const adopted=new Set(),audit=[];
for(const q of history){const target=equivalent(q);if(target){const key=rules.taskKey(target);if(!adopted.has(key)){target.id=q.id;adopted.add(key);audit.push({id:q.id,status:'retained-equivalent',activeId:target.id,reason:'نفس المهمة التعليمية؛ ضبط الصياغة والحركات عند الحاجة.'});}else audit.push({id:q.id,status:'duplicate-preserved',activeId:target.id,reason:'مهمة مكافئة موجودة بالفعل؛ السجل الأصلي محفوظ ولا يعرض مرتين.'});}
 else audit.push({id:q.id,status:'review-only',reason:q.skill==='word-reading'?'قراءة قد تكشف الإجابة أو تحتوي بدائل غير مناسبة؛ حفظ الأصل واستبداله بمهمة جديدة بمعرّف جديد في المراجعة التراكمية.':q.skill==='letter-sound'?'المهمة القديمة تخلط اسم الحرف أو المطابقة البصرية بالصوت؛ محفوظة دون احتسابها في تقييم الصوت.':'محفوظ للمراجعة: يحتاج ضبط المهمة أو التدرج أو إزالة كشف الإجابة؛ لا يعرض في التدريب المعتمد.'});}
rules.validate(bank);
assert.equal(writing.length,60);
const pending=new Map();
const put=(f,s)=>pending.set(f,s);
const putJSON=(f,d)=>put(f,JSON.stringify(d,null,2)+'\n');
putJSON('data/unit1-reviewed.json',{version:2,letters,questions:bank,writingActivities:writing,wordGlossary:dictionary.map(([word])=>word)});
putJSON('data/unit1-legacy-audit.json',{sourceCount:history.length,sourceFiles:[...sourceFiles,'group1-engine.js'],entries:audit});
const skillData=json('data/skills.json');
skillData.letterLearningSequence=skillData.letterLearningSequence.filter(s=>s.id!=='letter-name');
skillData.letterLearningSequence.unshift({id:'letter-name',title:'التعرف على اسم الحرف'});
skillData.mastery={...skillData.mastery,...rules.rules,requireTeacherObservation:true,questionCountIsNotMastery:true};
putJSON('data/skills.json',skillData);
function replaceOnce(source,old,value,label){assert.equal(source.split(old).length-1,1,'Expected exactly one edit: '+label);return source.replace(old,value);}
let app=read('app.js');
if(!app.includes('// UNIT1_REVIEWED_LOADER')){
 const start=app.indexOf('    // SEVIAT_FINAL_EXTRA_LOADER'),end=app.indexOf('    updateProgressDisplay();',start);
 assert(start>=0&&end>start);
 app=app.slice(0,start)+`    // UNIT1_REVIEWED_LOADER: wait for all sources before enabling any activity.
    const sourceFiles = ["data/group1-reading-extra.json", "data/meem-questions.json", "data/group1-extra.json", "data/unit1-reviewed.json"];
    const loaded = await Promise.all(sourceFiles.map(async file => {
      const response = await fetch(file);
      if (!response.ok) throw new Error("تعذر تحميل " + file);
      return response.json();
    }));
    const legacy = [...questionsData.questions, ...loaded.slice(0, 3).flatMap(d => d.questions), ...window.SeviatGroup1.questions];
    window.Unit1Learning.configure(loaded[3], legacy);
    questionsData = window.Unit1Rules.merge(loaded[3].questions, legacy);
    window.Unit1Learning.ready = true;

`+app.slice(end);
 app=replaceOnce(app,'initializeApp();','document.addEventListener("DOMContentLoaded", initializeApp, { once: true });','defer initialization');
 app=replaceOnce(app,'  const completed = answeredQuestions.length;','  const activeIds = new Set((questionsData?.questions || []).map(q => q.id));\n  const completed = answeredQuestions.filter(id => activeIds.has(id)).length;','progress denominator');
 app=replaceOnce(app,'نسبة الإتقان: ${percent}%','نسبة الإجابات الصحيحة: ${percent}%','accuracy label');
}
put('app.js',app);
let engine=read('group1-engine.js');
if(!engine.includes('// UNIT1_ARCHIVE_ONLY'))engine=replaceOnce(engine,'  function installQuestions() {','  function installQuestions() {\n    // UNIT1_ARCHIVE_ONLY: original generated records remain available for audit.\n    if (window.Unit1Learning) return true;','legacy generator guard');
put('group1-engine.js',engine);
put('group1-extra-loader.js','// Loaded and validated by initializeApp before activities are enabled.\n(function () { "use strict"; })();\n');
// The new controller replaces the letter menu after all legacy scripts have loaded.
let index=read('index.html');
if(!index.includes('unit1-learning.js'))index=replaceOnce(index,'</body>','<script src="unit1-rules.js"></script>\n<script src="unit1-learning.js"></script>\n</body>','controller scripts');
put('index.html',index);
let board=read('writing-board.js');
if(!board.includes('// UNIT1_NON_JOINING'))board=replaceOnce(board,'    let currentShape = shapes[0];','    // UNIT1_NON_JOINING\n    if (["د", "ر", "ا", "أ", "و", "ز", "ذ"].includes(letter)) shapes.splice(1, 2);\n\n    let currentShape = shapes[0];','non joining shapes');
put('writing-board.js',board);
let ignore=read('.gitignore');
for(const item of ['.unit1-staging/','backups/'])if(!ignore.split('\n').includes(item))ignore=ignore.trimEnd()+'\n'+item+'\n';
put('.gitignore',ignore);
const originals=[...new Set([...sourceFiles,'data/skills.json','data/curriculum.json','app.js','index.html','group1-engine.js','group1-extra-loader.js','skill-menu.js','writing-board.js','.gitignore'])];
const crypto=require('crypto');
fs.writeFileSync(path.join(stage,'source-hashes.json'),JSON.stringify(Object.fromEntries(originals.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]))));
// Check all prepared production changes before writing even the staged versions.
for(const [f,s] of pending){if(f.endsWith('.json'))JSON.parse(s);if(f.endsWith('.js'))new vm.Script(s,{filename:f});}
for(const [f,s] of pending){const target=path.join(stage,f);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,s,'utf8');}
const counts=qs=>Object.fromEntries(rules.skills.map(s=>[s,letters.map(l=>qs.filter(q=>q.letter===l&&q.skill===s).length)]));
fs.writeFileSync(path.join(stage,'counts.json'),JSON.stringify({before:history.length,after:bank.length,retainedIds:audit.filter(x=>x.status==='retained-equivalent').length,legacyStatuses:audit.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{}),beforeCounts:counts(history),afterCounts:counts(bank),writingActivities:writing.length},null,2));
console.log('Staged only:',history.length,'historical questions;',bank.length,'active questions;',writing.length,'writing activities.');