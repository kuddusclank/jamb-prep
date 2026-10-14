import test from 'node:test';import assert from 'node:assert/strict';
import {resolveExactImportTopic} from '../scripts/import-topic-resolution.mjs';
test('legacy imports resolve exact catalogue titles/slugs and reject fallback and ambiguity',()=>{
 const topics=[{id:'one',title:'Creation',slug:'creation'},{id:'two',title:'Early Church',slug:'early-church'}];
 assert.equal(resolveExactImportTopic(topics,' EARLY CHURCH '),'two');assert.equal(resolveExactImportTopic(topics,'early-church'),'two');
 for(const name of ['Unknown','',null])assert.throws(()=>resolveExactImportTopic(topics,name),/unknown/);
 assert.throws(()=>resolveExactImportTopic([...topics,{id:'three',title:'Early Church',slug:'another'}],'early church'),/ambiguous/);
});
