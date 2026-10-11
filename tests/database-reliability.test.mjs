import test from 'node:test';
import assert from 'node:assert/strict';
import { runDatabaseTransaction } from '../worker/api/db-context.ts';
import { ApiError, apiErrorResponse } from '../worker/api/errors.ts';

test('whole transaction retries confirmed serialization/deadlock rollbacks with bounded backoff', async () => {
  for (const code of ['40001','40P01']) {
    let attempts=0;const pauses=[];
    const value=await runDatabaseTransaction(async()=>{if(++attempts<3)throw Object.assign(new Error('private SQL'),{code});return {saved:true};},3,async ms=>{pauses.push(ms);});
    assert.deepEqual(value,{saved:true});assert.equal(attempts,3);assert.equal(pauses.length,2);assert.ok(pauses[0]>=20&&pauses[0]<50);assert.ok(pauses[1]>=40&&pauses[1]<70);
  }
});
test('rollback exhaustion reports a recoverable conflict and never returns success',async()=>{
  let n=0;await assert.rejects(runDatabaseTransaction(async()=>{n++;throw {code:'40001'};},3,async()=>{}),e=>e.status===409&&e.code==='SERIALIZATION_CONFLICT');assert.equal(n,3);
});
test('uncertain connection failures, schema failures and constraints are not automatically replayed',async()=>{
  for(const [code,status] of [['08006',503],['CONNECTION_CLOSED',503],['57014',503],['55P03',503],['42P01',503],['42703',503],['23505',409],['23503',409]]){
    let n=0;await assert.rejects(runDatabaseTransaction(async()=>{n++;throw Object.assign(new Error('SELECT secrets postgres://private'),{code});}),e=>e.status===status);assert.equal(n,1);
    const response=apiErrorResponse({code,message:'private SQL'},'test');assert.equal(response.status,status);assert.doesNotMatch(await response.text(),/SELECT|postgres:\/\/|private SQL/);
  }
});
test('domain errors retain their status and unknown commit errors fail closed',async()=>{
  const domain=new ApiError({status:403,code:'FORBIDDEN',message:'Forbidden'});await assert.rejects(runDatabaseTransaction(async()=>{throw domain;}),e=>e===domain);
  await assert.rejects(runDatabaseTransaction(async()=>{throw Error('SQL secret');}),e=>e.code==='TRANSACTION_COMMIT_FAILED'&&!e.message.includes('secret'));
});
