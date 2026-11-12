(function(){
'use strict';
const A=window.SeviatAccessGuard;
function wrap(name,allowed){const original=window[name];if(typeof original!=='function')return;window[name]=function(...args){if(!allowed(...args)){A.denied();return;}return original.apply(this,args);};}
['openPreparation','openVisualLevels','openMemoryLevels','openAuditoryLevels'].forEach(name=>wrap(name,()=>A.coarseAllowed('preparation')));
wrap('openWritingBoard',(letter='م')=>Unit1Learning.canWrite(letter,'letter-writing'));
if(window.SeviatExtraGames)for(const method of ['openLevels','startGame']){
 const original=SeviatExtraGames[method];SeviatExtraGames[method]=function(...args){if(!A.coarseAllowed('preparation'))return A.denied();return original(...args);};
}
// Legacy quiz entry points route through the current rules and policy controller.
window.renderQuiz=function(){Unit1Learning.openLetters();};
window.checkAnswer=function(){Unit1Learning.openLetters();};
})();
