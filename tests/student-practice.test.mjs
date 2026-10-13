import test from 'node:test';
import assert from 'node:assert/strict';
import {evidenceStrength} from '../worker/services/practice-catalogue-service.ts';
import {validatePracticeInput} from '../worker/services/study-service.ts';
test('practice supports the three product batch sizes and rejects arbitrary counts',()=>{
 for(const count of [5,10,15])assert.equal(validatePracticeInput({subjectCode:'eng',count}).count,count);
 for(const count of [0,1,6,16,60,5.5,'5'])assert.throws(()=>validatePracticeInput({subjectCode:'ENG',count}),e=>e.status===422);
});
test('strength never treats cold-start or single-session evidence as confident mastery',()=>{
 assert.equal(evidenceStrength(0,0,0).accuracy,null);assert.equal(evidenceStrength(0,0,0).strength,'unassessed');
 assert.equal(evidenceStrength(1,1,1).strength,'early');assert.equal(evidenceStrength(10,1,10).strength,'provisional');
 assert.equal(evidenceStrength(10,2,4).strength,'weak');assert.equal(evidenceStrength(10,2,7).strength,'developing');assert.equal(evidenceStrength(10,2,9).strength,'strong');
});
