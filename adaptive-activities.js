/* Visual discrimination tasks supplement existing banks; they do not test pronunciation. */
(function(host){
'use strict';
const shortMarks=['َ','ِ','ُ'],shortNames=['الفتحة','الكسرة','الضمة'];
const longForms=['َا','ِي','ُو'],longNames=['مد بالألف','مد بالياء','مد بالواو'];
function questions(node){
 const letter=node.letter;if(!letter||node.supervised)return [];
 const output=[];
 function add(operation,stimulus,prompt,options,answer,subskill='all',semanticChoices=false){output.push({id:'adaptive:'+node.id+':'+operation+':'+output.length,letter,unit:node.unit,skill:node.skill,type:'multiple-choice',operation,stimulus,prompt,options,answer,subskill,semanticChoices,requiredLetters:[letter],evidenceScope:'visual-recognition'});}
 if(node.skill==='short-vowels')for(let i=0;i<3;i++)add('identify-short-mark',letter+shortMarks[i],'ما اسم الحركة على الحرف؟',shortNames,shortNames[i],['fatha','kasra','damma'][i],true);
 if(node.skill==='long-vowels')for(let i=0;i<3;i++){
  add('identify-long-mark',letter+longForms[i],'ما نوع المد في المقطع؟',longNames,longNames[i],['alif','ya','waw'][i],true);
  if(node.unit===2)add('choose-long-mark',longNames[i],'اختر المقطع المناسب للمد',longForms.map(x=>letter+x),letter+longForms[i],['alif','ya','waw'][i],true);
 }
 if(node.skill==='sukoon'){
  const endings=['ْ','َ','ُ'],names=['السكون','الفتحة','الضمة'];
  for(let i=0;i<3;i++)add('identify-ending-mark',letter+'َ'+letter+endings[i],'ما علامة الحرف الأخير؟',names,names[i],'ending-mark',true);
  if(node.unit===2)for(let i=0;i<3;i++)add('choose-silent-ending',letter+shortMarks[i],'اختر المقطع المنتهي بحرف ساكن',endings.map(x=>letter+shortMarks[i]+letter+x),letter+shortMarks[i]+letter+'ْ','silent-ending');
 }
 if(node.skill==='letter-positions'&&node.unit===2){
  const forms=[letter+'ـ','ـ'+letter+'ـ','ـ'+letter],names=['أول الكلمة','وسط الكلمة','آخر الكلمة'];
  for(let i=0;i<3;i++)add('identify-joining-position',forms[i],'أين يأتي هذا الشكل المتصل؟',names,names[i],'joining-position',true);
 }
 if(node.skill==='syllable-building'&&node.unit===2){
  for(let i=0;i<3;i++){
   add('build-visible-long',letter+shortMarks[i]+' + '+['ا','ي','و'][i],'ركّب المقطع من البطاقتين',longForms.map(x=>letter+x),letter+longForms[i]);
   add('build-visible-closed',letter+shortMarks[i]+' + '+letter+'ْ','ركّب المقطع من البطاقتين',shortMarks.map(mark=>letter+mark+letter+'ْ'),letter+shortMarks[i]+letter+'ْ');
  }
 }
 if(node.skill==='sound-analysis')add('split-visible-long',letter+'َا','اختر أجزاء المقطع المكتوب', [letter+'َ + ا',letter+'ِ + ا',letter+'ُ + ا'],letter+'َ + ا','all',true);
 return output;
}
const api={questions};if(typeof module!=='undefined'&&module.exports)module.exports=api;else host.SeviatAdaptiveActivities=api;
})(typeof window==='undefined'?globalThis:window);
