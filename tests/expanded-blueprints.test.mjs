import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {selectAssessmentForm} from '../worker/services/assessment-selector.ts';
const specifications=JSON.parse(readFileSync(new URL('../bmad/expanded-subject-blueprints.json',import.meta.url),'utf8'));
const review=JSON.parse(readFileSync(new URL('../bmad/expanded-bank-mapping-review.json',import.meta.url),'utf8'));
for(const [subject,spec] of Object.entries(specifications)){
 test(`${subject}: reviewed mappings support distinct complete forms without topic title coupling`,()=>{
  const cells=spec.cells.map((c,i)=>({id:c.code,code:c.code,title:c.title,kind:c.kind,required_count:c.count,position:i}));
  const blueprint={id:subject,subject_id:subject,total_questions:40,difficulty_targets:spec.difficultyTargets,overlap_limit:spec.overlapLimit};
  const mapped=review.newMappings.filter(q=>q.subject===subject);
  const forms=new Set();
  for(let seed=0;seed<20;seed++){
   const pool=mapped.map((q,i)=>{const cell=cells.find(c=>c.id===q.cell);return {id:q.id,subject_id:subject,topic_id:q.topic,cell_id:q.cell,content_family:q.family,difficulty:['easy','medium','hard'][i%3],seen:0,previous:false,rank:createHash('md5').update(q.id+seed).digest('hex'),group_id:cell.kind==='comprehension'?cell.id:null,group_kind:cell.kind,group_reviewed:true,passage_id:cell.kind==='comprehension'?cell.id:null,group_passage_id:cell.kind==='comprehension'?cell.id:null};});
   const form=selectAssessmentForm(blueprint,cells,pool);
   assert.equal(form.selected.length,40);
   assert.equal(new Set(form.selected.map(q=>q.id)).size,40);
   assert.equal(new Set(form.selected.map(q=>q.content_family)).size,40);
   for(const cell of cells)assert.equal(form.selected.filter(q=>q.cell_id===cell.id).length,cell.required_count);
   forms.add(form.selected.map(q=>q.id).join(','));
  }
  assert.equal(forms.size,20);
  assert.throws(()=>selectAssessmentForm(blueprint,cells,[]),e=>e.status===409);
 });
}
test('coverage review never maps a held question and each addition has one domain',()=>{
 const ids=review.newMappings.map(q=>q.id);assert.equal(new Set(ids).size,ids.length);
 const held=new Set(review.holds.map(q=>q.id));assert.ok(ids.every(id=>!held.has(id)));
 assert.ok(review.holds.some(q=>q.id===review.frenchNoValidAnswerId));
});
