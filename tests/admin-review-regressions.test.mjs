import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRfcCsv,sanitizeCell} from '../src/lib/admin-csv.ts';
import {NATIVE_API_ROUTES} from '../worker/api/router.ts';
test('CSV preserves multiline math and rejects malformed quotes',()=>{
 assert.deepEqual(parseRfcCsv('\uFEFFstem,key\r\n"A, B\n\"\"quoted\"\"",D'),[['stem','key'],['A, B\n"quoted"','D']]);
 assert.equal(sanitizeCell('-2x + 1'),'-2x + 1');
 for(const input of ['a,"unclosed','a,"closed"junk','a,un"quoted'])assert.throws(()=>parseRfcCsv(input));
});
test('incomplete legacy questions cannot be published through status shortcut',async()=>{
 const route=NATIVE_API_ROUTES.find(r=>r.id==='admin.questions.status.patch');let writes=0;
 const sql=async parts=>{if(parts.join('').includes('UPDATE questions'))writes++;return [];};
 const db={sql,runSerializableTransaction:fn=>fn(sql)};
 await assert.rejects(route.handler({params:{questionId:'33333333-3333-4333-8333-333333333333'},request:new Request('http://localhost',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'published'})}),getDb:()=>db}),e=>e.status===422);
 assert.equal(writes,0);
});
test('report cannot attach a question to another student attempt',async()=>{
 const route=NATIVE_API_ROUTES.find(r=>r.id==='reports.question.create');let inserted=false;
 const sql=async parts=>{const text=parts.join('');if(text.includes('SELECT id FROM questions'))return [{id:'33333333-3333-4333-8333-333333333333'}];if(text.includes('INSERT INTO question_reports'))inserted=true;return [];};
 await assert.rejects(route.handler({actor:{userId:'11111111-1111-4111-8111-111111111111'},getDb:()=>({sql}),request:new Request('http://localhost',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({questionId:'33333333-3333-4333-8333-333333333333',attemptId:'22222222-2222-4222-8222-222222222222',reason:'wrong_key'})})}),e=>e.status===404);
 assert.equal(inserted,false);
});
