const fs=require('fs');function edit(file,from,to){let s=fs.readFileSync(file,'utf8');if(!s.includes(from))throw Error('Missing '+file+' '+from.slice(0,40));fs.writeFileSync(file,s.replace(from,to));}
edit('journey-rules.js','const api={letters,skills,nodes,evidence,complete,available,next};',`// Shared graph contract for existing and imported curriculum adapters.
function validateGraph(graph){
 if(!Array.isArray(graph))throw Error('Invalid graph');const byId=new Map();
 for(const node of graph){if(!node||typeof node.id!=='string'||!node.id||byId.has(node.id)||!Array.isArray(node.requires))throw Error('Duplicate or malformed graph node');byId.set(node.id,node);}
 const visited=new Set(),active=new Set();
 function visit(id){if(!byId.has(id))throw Error('Missing prerequisite '+id);if(active.has(id))throw Error('Circular prerequisite '+id);if(visited.has(id))return;active.add(id);for(const parent of byId.get(id).requires)visit(parent);active.delete(id);visited.add(id);}
 for(const id of byId.keys())visit(id);return true;
}
function createRules(graph){validateGraph(graph);const selected=graph.map(n=>({...n,requires:[...n.requires]}));return {nodes:selected,letters,skills,evidence,complete,available,validateGraph,createRules,next:state=>selected.find(n=>!n.optional&&available(state,n)&&!complete(state,n.id))};}
const api={letters,skills,nodes,evidence,complete,available,next,validateGraph,createRules};`);
edit('adaptive-learning.js','    const available = node => !excluded.includes(node.id)',`    try{if(rules.validateGraph)rules.validateGraph(rules.nodes);}catch{return {nodeId:null,reason:'invalid-path',difficulty:'standard'};}
    const available = node => !['planned','unavailable'].includes(node.status) && !excluded.includes(node.id)`);
edit('adaptive-learning.js','  const api = {version:1, taskKey,',`  // Read-only projection: historical assessment bytes and current journey runs are never migrated.
  function legacyView(state,legacy,legacyRules,journeyRules){
    const legacyEvidence={...state.legacyEvidence};
    if(legacyRules&&legacy)for(const node of journeyRules.nodes)if(node.unit===1&&node.letter&&legacyRules.mastered(legacy,node.letter,node.skill))legacyEvidence[node.id]=true;
    return {...state,legacyEvidence};
  }
  function recommendLesson(state,catalog,rules,path,now=Date.now(),excluded=[]){const recommendation=recommend(state,path.curriculumRules(catalog,rules),now,excluded),lesson=path.lessonFor(catalog,recommendation.nodeId);return {...recommendation,lessonId:lesson?.id||null,levelId:lesson?.levelId||null,worldId:lesson?.worldId||null};}
  const api = {version:1, legacyView, recommendLesson, taskKey,`);
edit('index.html','<script src="student-journey.js"></script>','<script src="arabic-learning-path.js"></script><script src="student-journey.js"></script>');
edit('arabic-learning-path.js'," const specification=clone(options.config||config),entities=", " const specification=clone(options.config||config),curriculumId=options.curriculumId||specification.defaultCurriculum,entities=");
edit('arabic-learning-path.js',"entities.mappings.push({id:'mapping:sa-lughati-g1:'+node.id,kind:'mapping',version:1,curriculumId:'sa-lughati-g1',grade:1,unit:node.unit||0,curriculumLessonId:node.letter?'sa-g1:'+node.unit+':'+node.letter:'sa-g1:readiness'", "entities.mappings.push({id:'mapping:'+curriculumId+':'+node.id,kind:'mapping',version:1,curriculumId,grade:specification.curricula.find(c=>c.id===curriculumId)?.grade||null,unit:node.unit||0,curriculumLessonId:node.letter?curriculumId+':'+node.unit+':'+node.letter:curriculumId+':readiness'");