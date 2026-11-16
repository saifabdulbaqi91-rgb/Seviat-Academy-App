'use strict';
const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
const P=require('../personalized-learning'),C=require('../child-experience'),Placement=require('../diagnostic-placement');
const R=require('../journey-rules'),E=require('../adaptive-learning'),I=require('../journey-interactions');
const read=f=>fs.readFileSync(f,'utf8');
const source=read('student-journey.js'),nav=source.slice(source.indexOf('// Tab-scoped navigation intent'),source.indexOf('function begin('));
const begin=source.slice(source.indexOf('function begin('),source.indexOf(" if(store.active==='default')",source.indexOf('function begin(')))+"bodies.push({id,preview,challengeDay,practiceOnly});}";
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),data};};
const registered=()=>({runs:[],overrides:{},phase6Registration:{version:1,placementRequired:true}});
function harness(profile=registered(),options={}){
 const local=memory(),session=memory(),bodies=[],buttons=new Map(),messages=[];
 if(options.settingsBroken)local.setItem('seviat-child-experience-v1','{');
 if(options.decisionsBroken)local.setItem(P.decisionKey,'{');
 options.seed?.(local);
 const store={active:'a',profiles:{a:profile,b:{runs:[],overrides:{}}}},window={};
 let diagnostics=options.diagnostics||{assessments:[]},starts=0,denied=false;
 const context=()=>({studentId:store.active,profile:store.profiles[store.active],rules:R,engine:E,hasHistory:!!store.profiles[store.active].runs.length});
 const diagnostic={getState(){if(options.unreadable)throw Error('unreadable');return diagnostics;},start(){starts++;if(options.startThrows)throw Error('unavailable');}};
 const sandbox={window,localStorage:local,sessionStorage:session,AfaqPersonalized:P,SeviatChildExperience:C,SeviatPlacement:Placement,SeviatInteractions:I,SeviatDiagnosticUI:diagnostic,
  SeviatJourney:{getExperienceContext:context},store,state:()=>store.profiles[store.active],R,broken:false,learningState:()=>store.profiles[store.active],activityMode:()=> 'practice',activityPolicy:()=>!denied,
  root:{},hub:{},entry:{},document:{body:{dataset:{}}},stop(){},screen:text=>messages.push(text),el:()=>({setAttribute(){}}),button:(text,fn,parent,id)=>buttons.set(id,fn),home(){},teacher(){},location:{reload(){}},bodies,
  openSpeaking(id){const request=sandbox.routeActivity({kind:'speaking',id,practiceOnly:true});if(request)bodies.push({kind:'speaking',id});},console};
 window.SeviatDiagnosticUI=diagnostic;
 window.AfaqAlifPilotUI={launch(id){if(sandbox.routeActivity({kind:'alif-pilot',id}))bodies.push({kind:'alif-pilot',id});}};
 vm.createContext(sandbox);
 vm.runInContext(read('personalized-learning-ui.js'),sandbox);
 vm.runInContext(read('child-experience-ui.js'),sandbox);
 vm.runInContext(nav+'\n'+begin,sandbox);
 sandbox.SeviatJourney.begin=sandbox.begin;
 return {sandbox,window,local,session,store,profile,bodies,buttons,messages,begin:sandbox.begin,starts:()=>starts,setDiagnostics:value=>{diagnostics=value;},deny:()=>{denied=true;}};
}
const completed={studentId:'a',status:'completed',stopReason:'sufficient-or-content-exhausted',responses:[]};
function unchanged(h,fn){const before=JSON.stringify(h.profile);fn();assert.equal(JSON.stringify(h.profile),before);}
let h=harness();unchanged(h,()=>h.window.SeviatChildUI.primary());assert.equal(h.starts(),1);assert.equal(h.bodies.length,0);assert.equal(h.session.data.size,0,'generic Start retains existing automatic-continuation preference');
h=harness({runs:[],overrides:{}});unchanged(h,()=>h.begin('prep:matching'));assert.equal(h.starts(),1,'legacy direct entry follows Start policy');
h.setDiagnostics({assessments:[completed]});h.begin();assert.equal(h.bodies[0].id,'prep:matching');assert.equal(h.session.data.size,0,'intent consumed once');
const savedQuestions=Array.from({length:5},(_,i)=>({id:'saved-'+i,answer:'a',options:['a','b']}));
const draft={version:1,id:'saved-run',nodeId:'prep:matching',plan:{mode:'practice',count:5,difficulty:'standard'},questions:savedQuestions,results:[],index:0,phase:'intro',guided:false,pending:null};
assert(I.validateDraft(draft));
const returner={runs:[],overrides:{},interactiveV1:{sessions:{'saved-run':draft},activeId:'saved-run'}};
h=harness(returner);unchanged(h,()=>h.begin());assert.equal(h.starts(),0);assert.equal(h.bodies.length,1,'valid saved attempt bypasses optional first placement');
h=harness({...registered(),homework:'prep:matching'});unchanged(h,()=>h.begin('prep:matching'));assert.equal(h.starts(),1,'assignment is not a mandatory-placement exemption');
h.store.active='b';h.begin();h.setDiagnostics({assessments:[completed]});h.store.active='a';h.begin();assert.equal(h.bodies.at(-1).id,'prep:matching','deferred requests isolated per student');
h=harness({...registered(),overrides:{'prep:matching':'allow'}});h.begin('prep:matching');assert.equal(h.starts(),1,'level override does not invent a placement bypass');
h=harness(registered(),{diagnostics:{assessments:[completed]}});unchanged(h,()=>h.begin());assert.equal(h.starts(),0);
h=harness(registered(),{diagnostics:{assessments:[{...completed,stopReason:'teacher-ended',config:{minEvidence:3}}]}});h.begin();assert.equal(h.starts(),1);
const now=Date.now(),runs=[1,2].map((n)=>({id:'evidence-'+n,node:'prep:matching',mode:'assessment',evidenceVersion:2,independent:true,completedAt:now-n*86400000-1000,results:Array.from({length:5},(_,i)=>({id:'q'+i,taskKey:'q'+i,correct:true,verified:true}))}));
const exempt={...registered(),runs};
h=harness(exempt,{seed:local=>P.createDecisions(local).bypass({studentId:'a',profile:exempt,nodeId:'prep:matching',engine:E,observer:'Fixture reviewer',reason:'Two independent assessments',id:'bypass'})});
unchanged(h,()=>h.begin());assert.equal(h.starts(),0,'documented bypass respected');
const item={id:'q',sourceId:'q',nodeId:'prep:matching',branchId:'letters',domain:'reading',skill:'letter-recognition',method:'objective',difficulty:1,question:{id:'q',stimulus:'a',prompt:'choose',options:['a','b'],answer:'a'}};
const active=Placement.create({id:'active',studentId:'a',bank:[item]});
h=harness({runs:[{id:'past'}],overrides:{}},{diagnostics:{assessments:[active]}});h.begin();assert.equal(h.starts(),1,'legacy active placement follows Start policy');
h=harness(registered(),{diagnostics:{assessments:[Placement.create({id:'empty',studentId:'a',bank:[]})]}});h.begin();assert.equal(h.starts(),0,'no objective task never loops through mandatory diagnostics');
for(const options of [{unreadable:true},{settingsBroken:true},{decisionsBroken:true}]){
 h=harness(registered(),options);unchanged(h,()=>h.begin('prep:matching'));assert.equal(h.starts(),0);assert.equal(h.bodies.length,0);assert(h.buttons.has('journey-routing-retry'));
}
for(const service of ['SeviatDiagnosticUI','AfaqPersonalizedUI','SeviatChildUI']){
 h=harness();const original=h.window[service];delete h.window[service];h.begin('prep:matching');assert.equal(h.starts(),0);assert(h.buttons.has('journey-routing-retry'));h.window[service]=original;h.buttons.get('journey-routing-retry')();assert.equal(h.starts(),1,'safe retry applies restored policy');
}
h=harness(registered(),{startThrows:true});h.begin('prep:matching');assert(h.buttons.has('journey-routing-retry'));assert.equal(h.bodies.length,0);
h=harness();h.session.setItem('afaq-deferred-entry-v1:a','{');h.begin();assert.equal(h.starts(),0);assert.equal(h.session.getItem('afaq-deferred-entry-v1:a'),'{','corrupt intent preserved');
h=harness();h.session.setItem=()=>{throw Error('quota');};h.begin('prep:matching');assert.equal(h.starts(),0,'never lose requested destination by starting placement after failed intent save');
h=harness();h.begin('prep:matching');h.profile.overrides['prep:matching']='lock';h.setDiagnostics({assessments:[completed]});h.begin();assert(h.buttons.has('journey-deferred-return'));assert.equal(h.bodies.length,0,'deferred destination revalidated after placement');
h=harness();h.begin('prep:matching');h.deny();h.setDiagnostics({assessments:[completed]});h.begin();assert.equal(h.bodies.length,0,'current activity permissions rechecked');
h=harness();h.sandbox.openSpeaking('prep:matching');h.setDiagnostics({assessments:[completed]});h.begin();assert.equal(h.bodies[0].kind,'speaking','speaking intent retained');
h=harness();h.window.AfaqAlifPilotUI.launch('u3a-v1-match');h.setDiagnostics({assessments:[completed]});h.begin();assert.equal(h.bodies[0].kind,'alif-pilot','pilot destination retained and passed through its own validation entry point');
h=harness();h.begin('prep:matching',true);assert.equal(h.starts(),0);assert.equal(h.session.data.size,0,'preview creates no navigation or learning records');
console.log(JSON.stringify({passed:true,scope:'authoritative routing, legacy/new profiles, assignments, saved intent and draft preservation, exemptions, completed/empty/active diagnostics, corrupt records, service recovery, permissions, preview; no disk writes'}));
