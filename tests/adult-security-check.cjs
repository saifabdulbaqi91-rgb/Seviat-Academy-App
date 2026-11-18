'use strict';
// No browser profile or real storage. Production guards and methods are run
// against synthetic localStorage, a fake clock and forbidden IDB access.
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const {createSession}=require('../adult-session');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const memory=initial=>{const data=new Map(Object.entries(initial||{}));return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
let now=0,scheduled,locks=0,checks=0;
const credentials=memory({'seviat-parent-pin-v1':'123456','afaq-owner-audio-pin':'987654321','student':'EXACT original bytes'});
const original=[...credentials.data];
const adult=createSession({storage:credentials,now:()=>now,schedule:fn=>(scheduled=fn,1),cancel(){},onLock(){locks++;},duration:100});
const denied=fn=>{assert.throws(fn,/يلزم دخول/);checks++;};
denied(()=>adult.assert());assert(!adult.login('000000'));assert(adult.login('123456'));adult.assert();checks+=3;
now=100;denied(()=>adult.assert());assert.equal(locks,1);assert(!adult.authenticated());checks+=2;
assert(adult.login('123456'));scheduled();assert(!adult.authenticated());checks+=2;
assert(adult.login('123456'));adult.lock();denied(()=>adult.assert());
const fallback=createSession({storage:memory({'afaq-owner-audio-pin':'987654321'}),schedule:()=>0,cancel(){}});
assert(fallback.login('987654321'));assert(adult.hasCredential());checks+=2;
const corrupt=createSession({storage:memory({'seviat-parent-pin-v1':'bad','afaq-owner-audio-pin':'987654321'}),schedule:()=>0,cancel(){}});
assert.throws(()=>corrupt.login('987654321'));checks++;
let clock=0;const throttled=createSession({storage:credentials,now:()=>clock,schedule:()=>0,cancel(){}});
for(let i=0;i<5;i++)assert(!throttled.login('000000'));
assert.throws(()=>throttled.login('123456'),/انتظر/);clock=30001;assert(throttled.login('123456'));checks+=7;
function browserModule(file){const context=vm.createContext({module:{exports:{}},window:{AfaqAdult:adult,addEventListener(){},removeEventListener(){}},console,structuredClone,Blob,crypto:require('crypto').webcrypto,setTimeout,clearTimeout});vm.runInContext(read(file),context,{filename:file});return context.module.exports;}
const L=browserModule('literacy-foundation.js'),P=browserModule('unit3-alif-pilot.js'),G=browserModule('game-onboarding.js'),D=browserModule('personalized-learning.js'),V=browserModule('student-voice.js'),S=browserModule('arabic-speech.js'),C=browserModule('child-experience.js');
const storage=memory({'unrelated':'keep'}),lit=L.createStore(storage),pilot=P.createStore(storage),onboarding=G.createStore(storage),decisions=D.createDecisions(storage),speech=S.createReviews(storage),settings=C.createSettings(storage);
const authCalls=[()=>lit.quality({}),()=>lit.configure({}),()=>lit.admission({}),()=>lit.decide({}),()=>pilot.quality({}),()=>pilot.enable({}),()=>pilot.verifySkill({}),()=>pilot.review({}),()=>onboarding.confirm('a',G.mechanics.matching,'teacher'),()=>onboarding.reset('a',G.mechanics.matching),()=>decisions.bypass({}),()=>speech.review({},null,1,'approved','teacher'),()=>settings.update({retentionDays:30})];
const before=JSON.stringify([...storage.data]);
for(const call of authCalls)denied(call);
assert.equal(JSON.stringify([...storage.data]),before);checks++;
// Public audio entry points must reject before any DOM or IDB access.
const audioWindow={AfaqAdult:adult},audioContext=vm.createContext({window:audioWindow});
vm.runInContext(read('afaq-audio-library.js'),audioContext);
denied(()=>audioWindow.AfaqAudioLibrary.mount());
vm.runInContext(read('afaq-audio-studio.js'),audioContext);
denied(()=>audioWindow.AfaqAudioStudio.mount());
// Valid adult actions still exercise original validation and persistence.
adult.login('123456');
const item=L.items[0];lit.quality({id:'q',at:1,studentId:'a',itemId:item.id,reviewer:'teacher',decision:'approved'});
lit.configure({id:'criteria',at:2,studentId:'a',reviewer:'teacher',reason:'synthetic',minItems:2,minDates:2});
onboarding.confirm('a',G.mechanics.matching,'teacher');assert(onboarding.understood('a',G.mechanics.matching));
onboarding.reset('a',G.mechanics.matching);assert(!onboarding.understood('a',G.mechanics.matching));
pilot.enable({id:'enable',at:3,studentId:'a',reviewer:'teacher',note:'synthetic',enabled:true});
settings.update({retentionDays:30});assert.equal(settings.read().retentionDays,30);checks+=6;
now+=100;for(const call of authCalls)denied(call);
// Deletion/review must fail before even opening IndexedDB.
(async()=>{
 let opened=0;const voice=V.createStore({open(){opened++;throw Error('IDB must not open');}});
 await assert.rejects(voice.delete('id','a'),/يلزم دخول/);
 await assert.rejects(voice.review('id','a',{observer:'t',ratings:[2,2,2]}),/يلزم دخول/);
 assert.equal(opened,0);checks+=3;
 // Recheck after an asynchronous database open: expiry must prevent mutation.
 adult.login('123456');let openRequest,transactions=0;
 const delayed=V.createStore({open(){openRequest={};return openRequest;}});
 const pending=delayed.delete('id','a');adult.lock();
 openRequest.result={objectStoreNames:{contains:()=>true},transaction(){transactions++;throw Error('unexpected transaction');},close(){}};
 openRequest.onsuccess();await assert.rejects(pending,/يلزم دخول/);
 // Transaction creation itself is harmless; the guarded work must run before requests.
 assert.equal(transactions,0);checks++;
 // Exercise the actual parent login dialog and bridge, using synthetic DOM.
 const elements=new Map();let loginFocus,entered=0;
 class Element{
  constructor(){this.children=[];this.style={};this.value='';}
  set id(v){this._id=v;elements.set(v,this);}get id(){return this._id;}
  append(...items){this.children.push(...items);}setAttribute(){}focus(){loginFocus=this;}
  replaceChildren(){this.children=[];}showModal(){this.open=true;}close(){this.open=false;}
 }
 for(const id of ['seviat-menu-button','seviat-sidebar','seviat-menu-overlay','seviat-menu-close','seviat-parent-settings']){const e=new Element();e.id=id;}
 const bridge={AfaqAdult:adult};
 const dom={body:new Element(),activeElement:new Element(),getElementById:id=>elements.get(id),createElement:()=>new Element(),addEventListener(){}};
 vm.runInNewContext(read('parent-controls.js'),{window:bridge,document:dom,localStorage:credentials,structuredClone});
 bridge.SeviatParentControls.requireTeacher(()=>entered++);
 assert.equal(entered,0);elements.get('seviat-parent-pin').value='000000';elements.get('seviat-parent-login').onclick();assert.equal(entered,0);
 elements.get('seviat-parent-pin').value='123456';elements.get('seviat-parent-login').onclick();assert.equal(entered,1);assert(adult.authenticated());
 adult.lock();bridge.SeviatParentControls.requireTeacher(()=>entered++);assert.equal(entered,1);checks+=5;
 // Browser wiring: returning to student mode and explicit lock close adult UI.
 const events=new Map();let observeMode,returned=0,disposed=0;
 const shell={body:{dataset:{mode:'teacher'}},getElementById:()=>null};
 const browser={localStorage:credentials,addEventListener:(name,fn)=>events.set(name,fn),dispatchEvent:e=>events.get(e.type)?.(e),
  AfaqAudioLibrary:{dispose(){disposed++;}},SeviatJourney:{home(){returned++;shell.body.dataset.mode='student';}}};
 vm.runInNewContext(read('adult-session.js'),{window:browser,document:shell,Event:class{constructor(type){this.type=type;}},
  MutationObserver:class{constructor(fn){observeMode=fn;}observe(){}},setTimeout:()=>0,clearTimeout(){}});
 assert(browser.AfaqAdult.login('123456'));shell.body.dataset.mode='student';observeMode();assert(!browser.AfaqAdult.authenticated());assert.equal(disposed,1);
 browser.AfaqAdult.login('123456');shell.body.dataset.mode='teacher';browser.AfaqAdult.lock();assert.equal(returned,1);assert.equal(disposed,2);checks+=5;
 // Real journey entry and profile factory reject direct JS calls first.
 const source=read('student-journey.js');
 const profile=source.slice(source.indexOf('function createLocalProfile('),source.indexOf('function teacher('));
 const teacher=source.slice(source.indexOf('function teacher('),source.indexOf('function diagnosticContext('));
 const context=vm.createContext({window:{AfaqAdult:adult}});vm.runInContext(profile+teacher,context);
 denied(()=>vm.runInContext('teacher()',context));denied(()=>vm.runInContext('createLocalProfile("synthetic")',context));
 // Check a retained actual teacher callback before any state mutation.
 const button=source.slice(source.indexOf('function button('),source.indexOf('function stop('));
 const hub={contains:()=>true},nodes=[];let changed=0;
 const ui=vm.createContext({window:{AfaqAdult:adult},hub,root:{},document:{body:{dataset:{mode:'student'}}},el:()=>{const e={setAttribute(){}};nodes.push(e);return e;},change:()=>changed++});
 vm.runInContext(button+';globalThis.b=button("synthetic",change,hub);',ui);
 ui.b.onclick();assert.equal(changed,0);adult.login('123456');ui.b.onclick();assert.equal(changed,1);adult.lock();ui.b.onclick();assert.equal(changed,1);checks+=3;
 assert.deepEqual([...credentials.data],original);assert.equal(storage.data.get('unrelated'),'keep');checks+=2;
 console.log(JSON.stringify({passed:true,checks,scope:'real unified session; existing PIN/fallback; expiration/explicit lock; throttling; unauthorized direct store/entry/callback calls; legitimate adult flows; synthetic data only'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
