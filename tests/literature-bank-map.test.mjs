import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {selectAssessmentForm} from '../worker/services/assessment-selector.ts';
const map=JSON.parse(fs.readFileSync(new URL('../bmad/literature-review-map.json',import.meta.url)));
test('Literature snapshot selects exact genre counts and one complete five-item appreciation group',()=>{
 const cells=Object.entries(map.summary.required).map(([code,required_count],position)=>({id:code,code,title:code,kind:code==='appreciation'?'comprehension':'single',required_count,position}));const forms=[];
 for(let seed=0;seed<20;seed++){
  const candidates=map.questions.filter(q=>q.status==='candidate').map(q=>({id:q.question_id,subject_id:'LIT',topic_id:q.topic_title,cell_id:q.cell,difficulty:q.difficulty,content_family:q.content_family,seen:0,previous:false,rank:createHash('sha256').update(seed+':'+q.question_id).digest('hex'),passage_id:q.cell==='appreciation'?'extract':null,group_id:q.cell==='appreciation'?'group':null,group_kind:'comprehension',group_reviewed:true,group_passage_id:'extract'}));
  const bp={id:'lit',total_questions:40,overlap_limit:.5,difficulty_targets:{easy:30,medium:50,hard:20}};const form=selectAssessmentForm(bp,cells,candidates);
  assert.equal(form.selected.length,40);assert.equal(new Set(form.selected.map(q=>q.content_family)).size,40);
  for(const cell of cells)assert.equal(form.selected.filter(q=>q.cell_id===cell.id).length,cell.required_count);
  assert.equal(new Set(form.selected.filter(q=>q.cell_id==='appreciation').map(q=>q.passage_id)).size,1);
  assert.throws(()=>selectAssessmentForm(bp,cells,candidates.filter(q=>q.cell_id!=='appreciation'||q.id!==form.selected.find(q=>q.cell_id==='appreciation').id)),e=>e.status===409);
  forms.push(form.selected.map(q=>q.id).join(','));
 }
 assert.equal(new Set(forms).size,20);
});
