'use strict';
const assert=require('assert/strict');const {validate}=require('../tools/check-official-curriculum-map.cjs');
const m=require('../data/official-curriculum-map.json');const result=validate(m,{checkFiles:true});
function rejects(change){const copy=structuredClone(m);change(copy);assert.throws(()=>validate(copy));}
rejects(x=>x.units[0].lessons[0].source.pdfPage=999);
rejects(x=>x.units[0].lessons[1].id=x.units[0].lessons[0].id);
rejects(x=>x.units[0].lessons[0].independentDecodingPolicy.allowUntaughtWordLetters=true);
rejects(x=>x.units[1].lessons[0].cumulativeLetters.push('ظ'));
rejects(x=>delete x.skillAssertions[0].source);
rejects(x=>x.runtimeIntegration.enabled=true);
rejects(x=>x.preparation.readAloudStories[0].independentAssessmentEligible=true);
rejects(x=>x.letterSequence.reverse());
console.log('Official curriculum map: source hashes, structure, cumulative boundaries and 8 negative cases PASS '+JSON.stringify(result));
