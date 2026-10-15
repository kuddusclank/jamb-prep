import test from 'node:test';
import assert from 'node:assert/strict';
import {subjectPalette} from '../src/lib/exam-palette.ts';
import {shareOrCopy,practiceShareText,mockShareText} from '../src/lib/share.ts';
import {pageMetadata} from '../src/lib/seo.ts';
test('subject palette resets numbering while retaining engine indexes',()=>{
 const questions=Array.from({length:180},(_,index)=>({subjectCode:index<60?'ENG':index<100?'PHY':index<140?'CHM':'BIO',id:index}));
 const english=subjectPalette(questions,59);assert.equal(english.length,60);assert.equal(english[59].number,60);
 const physics=subjectPalette(questions,63);assert.equal(physics.length,40);assert.equal(physics[0].number,1);assert.equal(physics[0].globalIndex,60);assert.equal(physics[3].globalIndex,63);
 assert.deepEqual(subjectPalette([],0),[]);
});
test('native sharing starts before clipboard and cancellation does not copy',async()=>{
 const calls=[];const platform={share:async()=>{calls.push('share')},clipboard:{writeText:async()=>calls.push('copy')}};
 assert.equal(await shareOrCopy({text:'Score',url:'https://example.test'},platform),'shared');assert.deepEqual(calls,['share']);
 platform.share=async()=>{throw Object.assign(new Error('Cancelled'),{name:'AbortError'})};assert.equal(await shareOrCopy({text:'Score'},platform),'cancelled');assert.deepEqual(calls,['share']);
});
test('unsupported or failed native share copies and failed clipboard rejects',async()=>{
 let copied='';const platform={clipboard:{writeText:async text=>{copied=text;}}};assert.equal(await shareOrCopy({text:'Score',url:'https://example.test'},platform),'copied');assert.equal(copied,'Score\nhttps://example.test');
 platform.share=async()=>{throw Error('Unsupported')};assert.equal(await shareOrCopy({text:'Score'},platform),'copied');
 platform.clipboard.writeText=async()=>{throw Error('Denied')};await assert.rejects(shareOrCopy({text:'Score'},platform),/Denied/);
});
test('result copy is factual and metadata canonicals exclude query and private indexing',()=>{
 assert.match(practiceShareText(15,15,'Physics','Heat and Dynamics'),/15\/15 in Heat and Dynamics \(Physics\)/);
 assert.match(mockShareText(0),/0\/400/);
 const privatePage=pageMetadata('Result','Private result','/result/');assert.equal(privatePage.robots.index,false);assert.equal(privatePage.alternates.canonical,'https://jambprep.lecterniq.com/result/');assert.equal(pageMetadata('Plans','Plans','/pricing/',true).robots.index,true);
});
test('result subject names come from frozen attempt snapshots with existing score order',async()=>{
 const {NATIVE_API_ROUTES}=await import('../worker/api/router.ts');
 const handler=NATIVE_API_ROUTES.find(route=>route.id==='exams.attempts.results.get').handler;
 const userId='11111111-1111-4111-8111-111111111111';const attemptId='22222222-2222-4222-8222-222222222222';let reads=0;
 const sql=async()=>++reads===1?[{attempt_id:attemptId,user_id:userId,total_score:280,english_score:70,subject_2_score:60,subject_3_score:80,subject_4_score:70,time_spent_seconds:3600,created_at:new Date()}]:[{code:'ENG',name:'Use of English',count:60},{code:'PHY',name:'Physics',count:40},{code:'CHM',name:'Chemistry',count:40},{code:'BIO',name:'Biology',count:40}];
 const response=await handler({params:{attemptId},actor:{userId},getDb:()=>({sql})});
 assert.deepEqual(response.body.subjectScores.map(s=>[s.name,s.score]),[['Use of English',70],['Physics',60],['Chemistry',80],['Biology',70]]);
 const noAccess=async()=>[{user_id:'33333333-3333-4333-8333-333333333333',total_score:280}];
 await assert.rejects(handler({params:{attemptId},actor:{userId},getDb:()=>({sql:noAccess})}),e=>e.status===403);
});
