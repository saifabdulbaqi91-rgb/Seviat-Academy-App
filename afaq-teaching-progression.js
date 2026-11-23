(function(host){
'use strict';

function completedTraining(state,id){
  return (state.runs||[]).some(run=>
    run.node===id &&
    run.preview!==true &&
    ['practice','guided-practice'].includes(run.mode) &&
    Number.isFinite(run.completedAt) &&
    Array.isArray(run.results) &&
    run.results.length>=3 &&
    run.results.every(result=>result.correct===true ||
      (result.practiceRetries||[]).at(-1)?.correct===true &&
      (result.practiceRetries||[]).at(-1)?.credit==='practice-only')
  );
}

function nextTeachingStep(state,rules,targetLetter){
  for(const letter of rules.letters){
    if(targetLetter && letter!==targetLetter)continue;
    const shape=letter+':letter-shape';
    const name=letter+':letter-name';
    const sound=letter+':letter-sound';
    const vowels=rules.nodes.find(n=>n.id===letter+':short-vowels');

    if(!vowels||!rules.available(state,vowels))continue;

    const advanced=[
      'short-vowels','sukoon','long-vowels',
      'letter-positions','letter-detection',
      'sound-analysis','syllable-building'
    ].some(skill=>{
      const id=letter+':'+skill;
      return rules.complete(state,id)||completedTraining(state,id);
    });

    if(advanced)continue;

    if(!completedTraining(state,name))return name;
    if(!completedTraining(state,sound))return sound;
  }
  return null;
}

const api={completedTraining,nextTeachingStep};

if(typeof module!=='undefined'&&module.exports){
  module.exports=api;
}else{
  host.AfaqTeachingProgression=api;
}
})(typeof window==='undefined'?globalThis:window);
