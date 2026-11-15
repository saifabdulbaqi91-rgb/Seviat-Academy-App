(function(host){
'use strict';
const letters=['م','ب','ل','د','ن','ر','ص','ف','س','ق','ت','ح'];
const skills=['letter-shape','short-vowels','long-vowels','sukoon','letter-positions','letter-detection','sound-analysis','syllable-building'];
const nodes=[{id:'prep:matching',title:'لنكتشف الأشكال',kind:'prep',requires:[]}];
letters.forEach((letter,i)=>skills.filter(s=>i<6||!['letter-detection','sound-analysis'].includes(s)).forEach((skill,j,list)=>nodes.push({id:letter+':'+skill,letter,skill,unit:i<6?1:2,title:letter+' — '+skill,requires:[j?letter+':'+list[j-1]:i?letters[i-1]+':'+skills.at(-1):'prep:matching']})));
const prep=[];
for(const family of ['visual','memory','auditory','attention','observation','sequence'])for(let level=1;level<=5;level++)prep.push({id:'prep:'+family+':'+level,kind:'preparation',family,level,optional:true,title:({'visual':'التمييز البصري',memory:'الذاكرة',auditory:'الاستماع',attention:'الانتباه',observation:'الملاحظة',sequence:'التسلسل'})[family]+' '+level,requires:[level===1?'prep:matching':'prep:'+family+':'+(level-1)]});
for(let group=0;group<4;group++)for(let level=0;level<4;level++)prep.push({id:'prep:extended:'+group+':'+level,kind:'preparation',family:'extended',group,level,optional:true,title:'التهيئة الثانية '+(group+1)+' / '+(level+1),requires:[level?'prep:extended:'+group+':'+(level-1):'prep:matching']});
nodes.push(...prep);
for(const unit of [1,2])nodes.push({id:'word-game:'+unit,kind:'word-game',skill:'word-building',unit,optional:true,title:'لعبة تركيب الكلمات — '+unit,requires:letters.slice(0,unit*6).map(l=>l+':syllable-building')});
for(const letter of letters)for(const skill of ['letter-name','letter-sound','letter-writing','word-writing','word-reading'])nodes.push({id:letter+':'+skill,letter,skill,unit:letters.indexOf(letter)<6?1:2,optional:true,supervised:true,title:letter+' — '+skill,requires:['word-writing','word-reading'].includes(skill)?letters.slice(0,letters.indexOf(letter)<6?6:12).map(l=>l+':syllable-building'):[letter+':letter-shape']});
function evidence(state,id,engine=host.SeviatAdaptive){if((state.runs||[]).some(r=>r.node===id&&r.evidenceVersion===2)){const legacy={...state,runs:(state.runs||[]).filter(r=>r.evidenceVersion!==2)};return evidence(legacy,id,engine)||!!engine?.progressReady(state,id);}const runs=(state.runs||[]).filter(r=>r.node===id&&r.independent&&r.results.length>=5&&new Set(r.results.map(x=>x.id)).size>=5&&r.results.filter(x=>x.correct).length/r.results.length>=Math.max(.8,Math.min(1,(state.criteria?.correct||4)/5)));return runs.length>=Math.max(2,Math.min(3,state.criteria?.runs||2));}
function complete(state,id,engine=host.SeviatAdaptive){return state.overrides?.[id]==='allow'||(state.overrides?.[id]!=='lock'&&(state.legacyEvidence?.[id]===true||evidence(state,id,engine)));}
function available(state,node,engine=host.SeviatAdaptive){return state.overrides?.[node.id]!=='lock'&&(state.overrides?.[node.id]==='allow'||node.requires.every(id=>complete(state,id,engine)));}
function next(state){return nodes.find(n=>!n.optional&&available(state,n)&&!complete(state,n.id));}
// Shared graph contract for existing and imported curriculum adapters.
function validateGraph(graph){
 if(!Array.isArray(graph))throw Error('Invalid graph');const byId=new Map();
 for(const node of graph){if(!node||typeof node.id!=='string'||!node.id||byId.has(node.id)||!Array.isArray(node.requires))throw Error('Duplicate or malformed graph node');byId.set(node.id,node);}
 const visited=new Set(),active=new Set();
 function visit(id){if(!byId.has(id))throw Error('Missing prerequisite '+id);if(active.has(id))throw Error('Circular prerequisite '+id);if(visited.has(id))return;active.add(id);for(const parent of byId.get(id).requires)visit(parent);active.delete(id);visited.add(id);}
 for(const id of byId.keys())visit(id);return true;
}
function createRules(graph,engine=host.SeviatAdaptive){validateGraph(graph);const selected=graph.map(n=>({...n,requires:[...n.requires]}));
 const mappedComplete=(state,id)=>state.overrides?.[id]==='allow'||state.overrides?.[id]!=='lock'&&(state.legacyEvidence?.[id]===true||evidence(state,id,engine));
 const mappedAvailable=(state,node)=>state.overrides?.[node.id]!=='lock'&&(state.overrides?.[node.id]==='allow'||node.requires.every(id=>mappedComplete(state,id)));
 return {nodes:selected,letters,skills,evidence:(state,id)=>evidence(state,id,engine),complete:mappedComplete,available:mappedAvailable,validateGraph,createRules,next:state=>selected.find(n=>!n.optional&&mappedAvailable(state,n)&&!mappedComplete(state,n.id))};}

const api={letters,skills,nodes,evidence,complete,available,next,validateGraph,createRules};
if(typeof module!=='undefined')module.exports=api;else host.SeviatJourneyRules=api;
})(typeof window==='undefined'?globalThis:window);
