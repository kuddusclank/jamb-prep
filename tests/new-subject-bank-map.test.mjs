import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {selectAssessmentForm} from '../worker/services/assessment-selector.ts';
const map=JSON.parse(fs.readFileSync(new URL('../bmad/new-subject-review-map.json',import.meta.url)));
test('screened new banks fill all cells across distinct seeded forms without held items',()=>{
 const held=new Set(map.questions.filter(q=>q.status==='hold').map(q=>q.question_id));
 for(const [subject,summary] of Object.entries(map.summary)){
  const cells=Object.entries(summary.required).map(([code,required_count],position)=>({id:code,code,title:code,kind:'single',required_count,position}));const forms=[];
  for(let seed=0;seed<20;seed++){
   const candidates=map.questions.filter(q=>q.subject===subject&&q.status==='candidate').map(q=>({id:q.question_id,subject_id:subject,topic_id:q.cell,difficulty:q.difficulty,cell_id:q.cell,group_id:null,content_family:q.content_family,seen:0,previous:false,rank:createHash('sha256').update(seed+':'+q.question_id).digest('hex')}));
   const form=selectAssessmentForm({id:subject,subject_id:subject,total_questions:40,overlap_limit:.5,difficulty_targets:{easy:30,medium:50,hard:20}},cells,candidates);
   assert.equal(form.selected.length,40);assert.equal(new Set(form.selected.map(q=>q.content_family)).size,40);assert.ok(form.selected.every(q=>!held.has(q.id)));
   for(const cell of cells)assert.equal(form.selected.filter(q=>q.cell_id===cell.id).length,cell.required_count);
   forms.push(form.selected.map(q=>q.id).join(','));
  }
  assert.equal(new Set(forms).size,20);
 }
});
