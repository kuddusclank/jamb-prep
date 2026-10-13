import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {selectAssessmentForm} from '../worker/services/assessment-selector.ts';
const map=JSON.parse(fs.readFileSync(new URL('../bmad/question-blueprint-review-map.json',import.meta.url),'utf8'));
const allocations={
 ENG:[['comprehension',5,'comprehension'],['cloze',10,'cloze'],['reading-text',10,'reading_text'],['interpretation',5],['antonyms',5],['synonyms',5],['completion',10],['oral-forms',10]],
 PHY:[['Mechanics / measurements',12],['Thermal / gas laws',6],['Waves / optics',8],['Electricity / magnetism',10],['Modern physics / electronics',4]],
 CHM:[['Foundations',8],['Physical chemistry',12],['Inorganic / environmental',8],['Organic',12]],
 BIO:[['Variety of organisms',6],['Form and function',16],['Ecology',10],['Heredity and variation',4],['Evolution',4]],
};
test('audited snapshot assembles diverse complete 180-question forms without held items',()=>{
 const held=new Set(map.questions.filter(q=>q.status==='hold').map(q=>q.question_id));const forms=[];
 for(let seed=0;seed<20;seed++){
  const combined=[];
  for(const [code,sections] of Object.entries(allocations)){
   const cells=sections.map(([title,required_count,kind='single'],position)=>({id:code+':'+title,code:title,title,required_count,kind,position}));
   const blueprint={id:code,subject_id:code,cycle_year:2027,version:1,total_questions:code==='ENG'?60:40,reading_text_id:'selected-work',reading_reviewed:true,reading_cycle:2024,overlap_limit:.5,difficulty_targets:{easy:30,medium:50,hard:20}};
   const pool=map.questions.filter(q=>q.subject===code&&q.status==='mapped-candidate').map(q=>{
    const group=map.groups.find(g=>g.passage_id===q.passage_id);const item=group?.items.find(i=>i.question_id===q.question_id);
    return {id:q.question_id,subject_id:code,topic_id:q.source_topic_id,cell_id:code+':'+q.section,difficulty:q.difficulty,content_family:q.content_family,passage_id:q.passage_id,group_id:group?.passage_id??null,group_kind:group?.kind??null,group_reviewed:group?.complete_shape??false,group_passage_id:group?.passage_id??null,group_position:item?.canonical_position??null,reading_text_id:q.section==='reading-text'?'selected-work':null,chapter:q.chapter,seen:0,previous:false,rank:createHash('sha256').update(seed+':'+q.question_id).digest('hex')};
   });
   // This is offline shape/selection verification, not a claim of editorial approval or live application.
   const form=selectAssessmentForm(blueprint,cells,pool);assert.equal(form.selected.length,blueprint.total_questions);
   for(const cell of cells){const selected=form.selected.filter(q=>q.cell_id===cell.id);assert.equal(selected.length,cell.required_count);if(['comprehension','cloze'].includes(cell.kind))assert.equal(new Set(selected.map(q=>q.passage_id)).size,1);if(cell.kind==='cloze')assert.deepEqual(selected.map(q=>q.group_position),[1,2,3,4,5,6,7,8,9,10]);}
   combined.push(...form.selected);
  }
  assert.equal(combined.length,180);assert.equal(new Set(combined.map(q=>q.id)).size,180);assert.equal(new Set(combined.map(q=>q.content_family)).size,180);assert.ok(combined.every(q=>!held.has(q.id)));forms.push(combined.map(q=>q.id).join(','));
 }
 assert.equal(new Set(forms).size,20);
});
