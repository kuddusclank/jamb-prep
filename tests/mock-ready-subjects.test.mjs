import test from 'node:test';import assert from 'node:assert/strict';
import {loadMockReadySubjects} from '../worker/services/mock-ready-subjects.ts';
function pool(code='MTH',required=40){const id=code;return {id,code,name:code,is_compulsory:code==='ENG',blueprint:{id,total_questions:required,overlap_limit:.5,difficulty_targets:{medium:100}},cells:[{id:'cell',kind:'single',required_count:required,position:0}],candidates:Array.from({length:required+10},(_,i)=>({id:String(i),cell_id:'cell',topic_id:'topic',difficulty:'medium',content_family:String(i),rank:String(i),seen:0,previous:false}))};}
test('catalogue lists only complete active-form candidates and returns no private pool data',async()=>{
 const good=pool(),short=pool('PHY');short.candidates.length=39;const wrong=pool('BIO');wrong.cells[0].required_count=39;const empty=pool('CHM');empty.cells=[];
 assert.deepEqual(await loadMockReadySubjects(async()=>[good,short,wrong,empty]),[{id:'MTH',code:'MTH',name:'MTH',is_compulsory:false}]);
});
test('duplicate content families and unreviewed passage sets cannot satisfy readiness',async()=>{
 const repeated=pool();repeated.candidates.forEach(q=>q.content_family='duplicate');
 const passage=pool('ENG',60);passage.cells[0].kind='comprehension';passage.candidates.forEach(q=>Object.assign(q,{group_id:'g',group_kind:'comprehension',group_reviewed:false,passage_id:'p',group_passage_id:'p'}));
 assert.deepEqual(await loadMockReadySubjects(async()=>[repeated,passage]),[]);
});
test('database failures propagate rather than masquerading as an empty catalogue',async()=>{
 await assert.rejects(loadMockReadySubjects(async()=>{throw Error('Database unavailable')}),/Database unavailable/);
});
