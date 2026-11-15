const fs=require('fs');let source=fs.readFileSync('adaptive-activities.js','utf8');source=source.replace(" if(node.skill==='sound-analysis')",` if(node.skill==='syllable-building'&&node.unit===2){
  for(let i=0;i<3;i++){
   add('build-visible-long',letter+shortMarks[i]+' + '+['ا','ي','و'][i],'ركّب المقطع من البطاقتين',longForms.map(x=>letter+x),letter+longForms[i]);
   add('build-visible-closed',letter+shortMarks[i]+' + '+letter+'ْ','ركّب المقطع من البطاقتين',shortMarks.map(mark=>letter+mark+letter+'ْ'),letter+shortMarks[i]+letter+'ْ');
  }
 }
 if(node.skill==='sound-analysis')`);fs.writeFileSync('adaptive-activities.js',source,'utf8');
source=fs.readFileSync('student-journey.js','utf8');source=source.replace('let latestRecommendation=null;','let latestRecommendation=null;\nconst skippedOptional=new Set();');source=source.replaceAll('E.recommend(state(),R)','recommendation()');source=source.replace('function home(){stop();',"function home(){if(run?.node.optional&&!run.preview&&state().homework!==run.node.id)skippedOptional.add(run.node.id);stop();");source=source.replace('function learnedLetters(node){',`function recommendation(){const excluded=R.nodes.filter(node=>skippedOptional.has(node.id)||(node.family==='auditory'&&window.SeviatEffects?.isEnabled()===false)||(node.optional&&node.kind==='preparation'&&!SeviatAccessGuard.coarseAllowed('preparation'))).map(node=>node.id);return E.recommend(state(),R,Date.now(),excluded);}
function learnedLetters(node){`);fs.writeFileSync('student-journey.js',source,'utf8');
