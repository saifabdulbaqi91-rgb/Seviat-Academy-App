'use strict';
const assert=require('assert/strict'),fs=require('fs'),vm=require('vm'),P=require('../tools/prepare-pages.cjs');
const read=f=>fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'');let checks=0;const check=(v,s)=>{assert(v,s);checks++;};
const bank=JSON.parse(read('data/question-bank.json')),plan=JSON.parse(read('data/question-bank-audio-plan.json'));
check(bank.questions.length===1190,'1190 authoritative questions');check(bank.runtimeEnabled===false,'normal runtime remains disabled');check(bank.questions.every(q=>q.reviewStatus==='qualified-Arabic-teacher-review-required'),'source approvals unchanged');
const ctx={window:{}};vm.runInNewContext(read('afaq-question-bank-activities.js'),ctx);const types=ctx.window.AfaqQuestionBankActivities.types;
for(const q of bank.questions){check(!!types[q.type],'supported type '+q.id);if(q.type==='construction')check(q.tokens.length>=2&&typeof q.correctAnswer==='string','constructable '+q.id);}
check(Object.keys(types).length===9,'nine supported activity types');
const html=read('testing.html'),scripts=[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
for(const file of scripts){check(fs.existsSync(file),'testing dependency '+file);new vm.Script(read(file),{filename:file});checks++;}
check(!scripts.some(file=>/adult-session|parent-controls|audio-management|owner-menu|student-journey|audio-library/.test(file)),'testing does not load admin or progress engines');
check(!/localStorage\.setItem|sessionStorage\.setItem|\.transaction\([^)]*readwrite|\.approve|\.review\(/.test(read('afaq-student-testing.js')+read('afaq-testing-audio.js')),'testing has no storage mutation/approval calls');
check(!/setItem|caches\.|delete\(/.test(read('afaq-cache-refresh.js')+read('sw.js')),'cache update cannot delete learner or cache data');
check(read('sw.js').includes("cache:'no-store'"),'release worker always requests fresh resources');
const paths=P.files();check(paths.length>30,'complete application allowlist');for(const file of paths.filter(f=>!['docs/AFAQ_CURRICULUM_CONTENT_AUDIT.json','docs/recording-readiness/recording-inventory.csv','docs/recording-readiness/meem-first-batch.csv'].includes(f)))check(!/backup|before-|\.log$|\.zip$|^docs\/|^tests\/|^references\/|^Microsoft\//i.test(file),'runtime only '+file);
for(const id of bank.questions.map(q=>q.id))check(plan.items.some(p=>p.questionId===id),'audio commands mapped '+id);
console.log(JSON.stringify({passed:true,checks,questions:bank.questions.length,types:Object.keys(types),runtimeFiles:paths.length}));
