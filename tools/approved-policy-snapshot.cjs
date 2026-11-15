'use strict';
// Reconstruct a historical source snapshot for one approved editorial value.
// Every other byte must still match the historical SHA-256 in preservation tests.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
function snapshotBytes(file,bytes=fs.readFileSync(file)){
 if(file.replaceAll('\\','/')==='journey-rules.js'){const text=bytes.toString('utf8'),current="'short-vowels','long-vowels','sukoon'";assert.equal(text.split(current).length,2,'one approved Phase 7B prerequisite correction');return Buffer.from(text.replace(current,"'short-vowels','sukoon','long-vowels'"));}
 if(file.replaceAll('\\','/')!=='data/curriculum.json')return bytes;
 const p=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/content-policy.json'),'utf8'));
 assert.equal(p.status,'approved-by-project-owner');assert.equal(p.previousValue,'الجمادات والنباتات فقط');assert.deepEqual(p.allowedSubjects,['people','animals','plants','inanimate-objects']);assert.ok(p.facialFeatures.includes('Obscure'));
 const text=bytes.toString('utf8');assert.equal(text.split(JSON.stringify(p.approvedValue)).length,2,'only one approved policy replacement');return Buffer.from(text.replace(JSON.stringify(p.approvedValue),JSON.stringify(p.previousValue)));
}
module.exports={snapshotBytes};
