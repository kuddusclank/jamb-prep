import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import postgres from 'postgres';
import {ASSESSMENT_ADMIN_ROUTES} from '../worker/services/assessment-admin-routes.ts';
import {PRACTICE_ROUTES} from '../worker/services/practice-routes.ts';
import {loadAssessmentPools,selectAssessmentForm} from '../worker/services/assessment-selector.ts';
import {createNativeApiHandler} from '../worker/api/entry.ts';
const enabled=process.env.RUN_LOCAL_POSTGRES==='1';
test('new practice and assessment routes reject anonymous users without a database connection',async()=>{
 let allocations=0;const worker=createNativeApiHandler({dbFactory:()=>{allocations++;throw Error('Unexpected DB');}});
 for(const route of [...PRACTICE_ROUTES,...ASSESSMENT_ADMIN_ROUTES]){const path=route.pattern.replace(':sessionId','11111111-1111-4111-8111-111111111111');const response=await worker.fetch(new Request('https://jambprep.lecterniq.com'+path,{method:route.method,...(route.method==='POST'?{headers:{'Content-Type':'application/json'},body:'{}'}:{})}),{SUPABASE_URL:'https://bqumnaoiiukifvanoonm.supabase.co'},{waitUntil(){}});assert.equal(response.status,401,route.id);assert.equal(response.headers.get('Cache-Control'),'no-store');}
 assert.equal(allocations,0);
});
test('real PostgreSQL: reviewed annual English blueprint, grouping, activation and variation',{skip:!enabled,timeout:30000},async()=>{
 const url=fs.readFileSync(process.env.LOCAL_TEST_DATABASE_FILE??os.homedir()+'/.codex/private-backups/jambprep/local-runtime.env','utf8').trim().slice('DATABASE_URL='.length);assert.equal(new URL(url).hostname,'127.0.0.1');const sql=postgres(url,{max:1,prepare:false});const rollback=new Error('ASSESSMENT_LOCAL_ROLLBACK');
 try{await assert.rejects(sql.begin(async tx=>{
  const uid=crypto.randomUUID();await tx`INSERT INTO auth.users(id,email) VALUES(${uid}::uuid,${`assessment-${uid}@example.invalid`})`;await tx`INSERT INTO profiles(id,email,display_name,role) VALUES(${uid}::uuid,${`assessment-${uid}@example.invalid`},'Local assessment fixture','admin') ON CONFLICT(id) DO UPDATE SET role='admin'`;
  const [subject]=await tx`SELECT id FROM subjects WHERE code='ENG'`;const [topic]=await tx`INSERT INTO topics(subject_id,title,slug) VALUES(${subject.id}::uuid,'Local assessment fixture',${'fixture-'+uid}) RETURNING id`;
  const db={sql:tx,runSerializableTransaction:fn=>tx.savepoint(fn),runCommittedTransaction:fn=>tx.savepoint(fn)};
  const save=(body,key='assessment-'+crypto.randomUUID())=>ASSESSMENT_ADMIN_ROUTES.find(r=>r.id==='assessment.admin.post').handler({getDb:()=>db,actor:{userId:uid},now:new Date(),params:{},request:new Request('http://localhost',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)})});
  const book=(await save({operation:'reading-text.create',cycleYear:2026,title:'[LOCAL FIXTURE] Annual reading text '+uid,author:'Synthetic fixture',sourceUrl:'https://example.invalid/local-source',reviewed:false})).body.id;
  const crossYear=(await save({operation:'blueprint.create',subjectId:subject.id,cycleYear:2027,title:'Reference year differs',templateId:'english-2026',readingTextId:book})).body.id;assert.ok(crossYear);
  const key='blueprint-'+uid;const body={operation:'blueprint.create',subjectId:subject.id,cycleYear:2026,title:'[LOCAL FIXTURE] English',templateId:'english-2026',readingTextId:book};const bp=(await save(body,key)).body.id;assert.equal((await save(body,key)).body.id,bp);
  await assert.rejects(save({operation:'blueprint.activate',blueprintId:bp}),e=>e.status===409);
  await save({operation:'reading-text.review',readingTextId:book,reviewed:true});
  const cells=await tx`SELECT * FROM assessment_cells WHERE blueprint_id=${bp}::uuid ORDER BY position`;assert.deepEqual(cells.map(c=>c.required_count),[5,10,10,5,5,5,10,10]);
  async function createItems(cell,n,passage){const rows=await tx`INSERT INTO questions(subject_id,topic_id,stem,status,difficulty,passage_id) SELECT ${subject.id}::uuid,${topic.id}::uuid,${'[LOCAL ASSESSMENT FIXTURE] '+uid+' '+cell.code+' '}||g.i,'published',CASE WHEN g.i%3=0 THEN 'hard'::difficulty_level WHEN g.i%3=1 THEN 'easy'::difficulty_level ELSE 'medium'::difficulty_level END,${passage}::uuid FROM generate_series(1,${n}) g(i) RETURNING id`;const ids=rows.map(r=>r.id);
   await tx`INSERT INTO question_options(question_id,label,content,is_correct) SELECT id,label,'Synthetic option '||label,label='A' FROM questions CROSS JOIN unnest(ARRAY['A','B','C','D']) label WHERE id IN(SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::text::jsonb)::uuid)`;
   await tx`INSERT INTO question_explanations(question_id,explanation) SELECT id,'Synthetic local explanation' FROM questions WHERE id IN(SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::text::jsonb)::uuid)`;
   await tx`INSERT INTO question_editorial_metadata(question_id,source_reference,rights_note) SELECT id,'Local fixture','Synthetic fixture only' FROM questions WHERE id IN(SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::text::jsonb)::uuid)`;return ids;}
  for(const cell of cells){if(['comprehension','cloze'].includes(cell.kind)){for(let group=0;group<2;group++){const [passage]=await tx`INSERT INTO passages(subject_id,title,content) VALUES(${subject.id}::uuid,${`Fixture ${cell.code} ${group}`},'Synthetic passage content for local testing only.') RETURNING id`;const ids=await createItems({...cell,code:cell.code+'-'+group},cell.required_count,passage.id);const items=ids.map((questionId,i)=>({questionId,position:i+1}));if(cell.kind==='cloze')await assert.rejects(save({operation:'questions.classify',blueprintId:bp,cellId:cell.id,reviewed:true,group:{passageId:passage.id,title:'Bad gaps',items:items.map((q,i)=>({...q,position:i+2}))}}),e=>e.status===422);await save({operation:'questions.classify',blueprintId:bp,cellId:cell.id,reviewed:true,group:{passageId:passage.id,title:'Reviewed synthetic group',items}});}}
   else{const ids=await createItems(cell,cell.required_count*2,null);await save({operation:'questions.classify',blueprintId:bp,cellId:cell.id,reviewed:true,questionIds:ids,chapter:cell.kind==='reading_text'?'Fixture chapter':null});}}
  await save({operation:'blueprint.activate',blueprintId:bp});await assert.rejects(save({operation:'blueprint.preferences',blueprintId:bp,overlapLimit:.5,difficultyTargets:{easy:30,medium:50,hard:20}}),e=>e.status===409);
  const defaultPool=await loadAssessmentPools(tx,subject.id,2030,uid,'reference-year-default');assert.equal(defaultPool.blueprint.id,bp);
  const forms=[];for(let i=0;i<20;i++){const pools=await loadAssessmentPools(tx,subject.id,2027,uid,'seed-'+i,bp);const form=selectAssessmentForm(pools.blueprint,pools.cells,pools.candidates);assert.equal(form.selected.length,60);assert.equal(new Set(form.selected.map(q=>q.content_family)).size,60);for(const cell of cells){const chosen=form.selected.filter(q=>q.cell_id===cell.id);assert.equal(chosen.length,cell.required_count);if(cell.kind==='cloze'){assert.equal(new Set(chosen.map(q=>q.passage_id)).size,1);assert.deepEqual(chosen.map(q=>q.group_position),[1,2,3,4,5,6,7,8,9,10]);}if(cell.kind==='reading_text')assert.ok(chosen.every(q=>q.reading_text_id===book));}assert.doesNotMatch(JSON.stringify(form.selected),/correct_option|explanation|stem|options/);forms.push(form.selected.map(q=>q.id).join(','));}assert.ok(new Set(forms).size>=10,'Distinct seeds should produce diverse feasible forms');
  const [audit]=await tx`SELECT count(*)::int AS n FROM admin_audit_events WHERE actor_id=${uid}::uuid`;assert.ok(audit.n>10);throw rollback;
 }),e=>e===rollback);}finally{await sql.end();}
});
