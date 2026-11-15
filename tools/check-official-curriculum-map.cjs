'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
function validate(m,{checkFiles=false}={}){
 assert.equal(m.sources.length,2);assert.equal(m.units.length,8);
 const expected='م ب ل د ن ر ص ف س ق ت ح أ ط ز و ج ش ض ع ك خ ي ذ ه ث غ ظ'.split(' ');
 assert.deepEqual(m.letterSequence,expected);assert.equal(m.letters.length,28);
 const pages=[[106,114,122,130,138,146],[164,172,180,187,194,202],[220,227,234,242,250,257],[18,26,34,41,49,56],[71,79,87,96],[110,117,125,135],[155,162,172,185],[203,210,218,227]];
 const sources=new Map(m.sources.map(s=>[s.id,s]));const ids=new Set();let introduced=[];let lessons=0;
 const unique=id=>{assert.ok(id&&!ids.has(id),'duplicate or missing id: '+id);ids.add(id);};
 for(const [i,u]of m.units.entries()){
  unique(u.id);assert.equal(u.number,i+1);assert.equal(u.part,i<3?1:2);
  assert.deepEqual(u.lessons.map(l=>l.source.pdfPage),pages[i]);
  for(const l of u.lessons){unique(l.id);lessons++;assert.deepEqual(l.priorIntroducedLetters,introduced);
   if(l.letter)introduced.push(l.letter);assert.deepEqual(l.cumulativeLetters,introduced);
   assert.deepEqual(l.lettersIntroduced,l.letter?[l.letter]:[]);
   assert.equal(l.independentDecodingPolicy.allowUntaughtWordLetters,false);
   assert.equal(l.independentDecodingPolicy.teacherReadContextIsNotIndependentDecoding,true);
   assert.ok(l.source.verificationStatus);assert.ok(l.skillAuditStatus.includes('only cited'));
   for(const a of l.skillAssertions)assert.ok(m.skillAssertions.some(s=>s.id===a.id&&s.unitId===u.id),'unknown skill');
  }
 }
 assert.equal(lessons,40);assert.deepEqual(introduced,expected);
 assert.equal(m.verification.totalCoreLessons,40);assert.equal(m.verification.totalReadingLessons,12);
 assert.equal(m.verification.qualifiedHumanReviewCompleted,false);
 assert.equal(m.letters[24].sourceDisplay,'هـ');
 for(const a of m.skillAssertions){unique(a.id);assert.ok(a.source&&a.evidenceScope&&a.instructionalStage);assert.equal(a.notMasteryEvidenceByItself,true);assert.ok(a.prerequisites.status.includes('proposal'));}
 let refs=0;function walk(v){if(!v||typeof v!=='object')return;if(v.sourceId&&v.pdfPage!==undefined){const s=sources.get(v.sourceId);assert.ok(s,'unknown source');assert.equal(v.filename,s.filename);assert.ok(Number.isInteger(v.pdfPage)&&v.pdfPage>=1&&v.pdfPage<=s.pdfPageCount,'invalid source page');assert.ok(v.verificationStatus);refs++;}for(const x of Object.values(v))walk(x);}walk(m);assert.ok(refs>150);
 assert.equal(m.preparation.groupDividers.length,2);assert.equal(m.preparation.readAloudStories.length,7);
 assert.ok(m.preparation.readAloudStories.every(s=>s.independentAssessmentEligible===false));
 assert.equal(m.runtimeIntegration.enabled,false);assert.equal(m.runtimeIntegration.changedStudentStorage,false);assert.equal(m.runtimeIntegration.changedExistingCurriculum,false);
 assert.equal(m.comparison.runtimeIsCorrectOfficialPrefix,true);assert.deepEqual(m.comparison.runtimeLetters,expected.slice(0,12));assert.deepEqual(m.comparison.missingRuntimeLetters,expected.slice(12));
 assert.equal(m.pdfQuality.reduce((n,s)=>n+s.pages.length,0),502);assert.equal(m.pdfQualityNotes.renderErrors,0);
 for(const [i,s]of m.sources.entries()){assert.equal(s.pdfPageCount,[266,236][i]);assert.match(s.sha256,/^[a-f0-9]{64}$/);if(checkFiles)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,s.path))).digest('hex'),s.sha256,'PDF changed');}
 for(const s of m.pdfQuality){assert.equal(s.pages.length,sources.get(s.sourceId).pdfPageCount);assert.ok(s.pages.every((p,i)=>p.pdfPage===i+1&&p.rendered));}
 assert.equal(m.comparison.planned.length,3);assert.equal(m.comparison.unavailable.length,12);
 if(checkFiles)for(const s of m.comparison.evidenceFiles){let bytes=fs.readFileSync(path.join(root,s.file));if(s.file==='journey-rules.js')bytes=require('./approved-policy-snapshot.cjs').snapshotBytes(s.file,bytes);
  // The immutable map records the previous policy. Permit only the owner's
  // specifically approved single-value transition, reconstructing exact old bytes.
  if(s.file==='data/curriculum.json'){
   const policyPath=path.join(root,'data/content-policy.json');
   if(fs.existsSync(policyPath)){const p=JSON.parse(fs.readFileSync(policyPath,'utf8'));assert.equal(p.status,'approved-by-project-owner');assert.equal(p.previousValue,'الجمادات والنباتات فقط');const text=bytes.toString('utf8');assert.equal(text.split(JSON.stringify(p.approvedValue)).length,2,'approved policy missing or repeated');bytes=Buffer.from(text.replace(JSON.stringify(p.approvedValue),JSON.stringify(p.previousValue)));}
  }
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),s.sha256,'implementation snapshot changed outside approved policy: '+s.file);
 }
 return {units:8,coreLessons:lessons,letters:expected.length,skillAssertions:m.skillAssertions.length,sourceReferences:refs};
}
module.exports={validate};
if(require.main===module)console.log(JSON.stringify(validate(JSON.parse(fs.readFileSync(path.join(root,'data/official-curriculum-map.json'),'utf8')),{checkFiles:true}),null,2));
