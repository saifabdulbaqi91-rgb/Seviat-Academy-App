const fs=require('fs');let s=fs.readFileSync('adaptive-learning.js','utf8');s=s.replace("run.guided !== true;", "run.guided !== true && run.assisted !== true;").replace("result.evidenceEligible !== false && result.verified !== false", "result.evidenceEligible !== false && result.assisted !== true && result.verified !== false");
s=s.replace("  function recommend(state, rules, now = Date.now(), excluded = []) {",`  function autoAvailable(state,node,rules){
    if(!rules.available(state,node))return false;
    if(node.kind==='preparation'&&node.level>1)return node.requires.every(id=>state.overrides?.[id]==='allow'||mastery(state,id).status==='confirmed');
    return true;
  }

  function recommend(state, rules, now = Date.now(), excluded = []) {`);
s=s.replace("&& rules.available(state, node));", "&& autoAvailable(state, node, rules));");
s=s.replace("filter(run=>run&&run.preview!==true)", "filter(run=>run&&typeof run.node==='string'&&run.preview!==true)");
s=s.replace('mastery, planSession, progressReady','mastery, planSession, autoAvailable, progressReady');
fs.writeFileSync('adaptive-learning.js',s,'utf8');
let u=fs.readFileSync('student-journey.js','utf8');u=u.replace("n.family===family&&R.available(state(),n)", "n.family===family&&E.autoAvailable(state(),n,R)");fs.writeFileSync('student-journey.js',u,'utf8');
