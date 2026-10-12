import test from 'node:test';import assert from 'node:assert/strict';
import {createNativeApiHandler} from '../worker/api/entry.ts';
import {ADMIN_WORKFLOW_ROUTES,saveEditorialMetadata} from '../worker/services/admin-workflow-service.ts';
import {ADMIN_CURRICULUM_ROUTES} from '../worker/services/admin-curriculum-service.ts';
import {ADMIN_MEDIA_ROUTES,decodeQuestionImage} from '../worker/services/admin-media-service.ts';
import {handleCorsPreflight} from '../worker/api/cors.ts';
test('every added admin endpoint denies an unauthenticated caller before database or storage access',async()=>{
 let allocations=0;const worker=createNativeApiHandler({dbFactory:()=>{allocations++;throw Error('Must not allocate');}});
 for(const route of [...ADMIN_WORKFLOW_ROUTES,...ADMIN_CURRICULUM_ROUTES,...ADMIN_MEDIA_ROUTES]){const response=await worker.fetch(new Request('https://jambprep.lecterniq.com'+route.pattern,{method:route.method,...(route.method==='POST'?{headers:{'Content-Type':'application/json'},body:'{}'}:{})}),{SUPABASE_URL:'https://bqumnaoiiukifvanoonm.supabase.co'},{waitUntil(){}});assert.equal(response.status,401,route.id);}
 assert.equal(allocations,0);
});
test('publication requires provenance and accessible diagram description',async()=>{
 let writes=0;const tx=async()=>{writes++;};
 for(const metadata of [{status:'published'},{status:'published',sourceReference:'Author',rightsNote:'Original',imageUrl:'https://example.invalid/diagram.png'}])await assert.rejects(saveEditorialMetadata(tx,'11111111-1111-4111-8111-111111111111',metadata),e=>e.status===422);
 assert.equal(writes,0);
});
test('managed media denies active formats, mismatched signatures and oversized payloads',()=>{
 assert.equal(decodeQuestionImage(Buffer.from([137,80,78,71,13,10,26,10]).toString('base64'),'image/png').length,8);
 for(const [encoded,mime] of [[Buffer.from('<svg onload="alert(1)"/>').toString('base64'),'image/svg+xml'],[Buffer.from('not an image').toString('base64'),'image/png'],['A'.repeat(180001),'image/png']])assert.throws(()=>decodeQuestionImage(encoded,mime),e=>e.status===422);
});
test('trusted-origin preflight permits only the declared durable-import transport headers',()=>{
 const response=handleCorsPreflight(new Request('https://api.example.invalid',{method:'OPTIONS',headers:{Origin:'https://jambprep.lecterniq.com'}}),'test-request',['POST']);
 assert.match(response.headers.get('access-control-allow-headers'),/X-Import-Job/);assert.match(response.headers.get('access-control-allow-headers'),/X-Import-Batch/);
});
test('import batching respects UTF-8 request size, row limits and source order',async()=>{
 const {buildImportBatches}=await import('../src/lib/admin-csv.ts');const rows=Array.from({length:13},(_,i)=>({id:i,text:'أ'.repeat(30)}));const batches=buildImportBatches(rows,10,200);
 assert.deepEqual(batches.flatMap(b=>b.rows),rows);for(const batch of batches){assert.ok(batch.rows.length<=10);assert.ok(new TextEncoder().encode(JSON.stringify(batch.rows)).length<=200);assert.equal(batch.rows[0].id,batch.offset);}
 assert.throws(()=>buildImportBatches([{text:'x'.repeat(300)}],10,200),/Row 1/);
});
