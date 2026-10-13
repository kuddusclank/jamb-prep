import test from 'node:test';import assert from 'node:assert/strict';
import {selectAssessmentForm} from '../worker/services/assessment-selector.ts';
const blueprint={id:'bp',subject_id:'subject',cycle_year:2026,version:1,total_questions:10,reading_text_id:null,overlap_limit:.5,difficulty_targets:{easy:30,medium:50,hard:20}};
const single={id:'cell',code:'coverage',title:'Coverage',kind:'single',required_count:10,position:0};
function candidate(i,extra={}){return {id:'q-'+i,subject_id:'subject',topic_id:'topic-'+(i%3),difficulty:['easy','medium','hard'][i%3],passage_id:null,cell_id:'cell',group_id:null,group_position:null,group_kind:null,group_reviewed:null,group_passage_id:null,reading_text_id:null,chapter:null,content_family:'family-'+i,seen:0,previous:false,rank:String(i).padStart(4,'0'),...extra};}
test('selector chooses unique complete metadata-only forms and varies seed-derived ranks',()=>{
 const pool=Array.from({length:40},(_,i)=>candidate(i));const first=selectAssessmentForm(blueprint,[single],pool);assert.equal(first.selected.length,10);assert.equal(new Set(first.selected.map(q=>q.content_family)).size,10);
 const second=selectAssessmentForm(blueprint,[single],pool.map((q,i)=>({...q,rank:String(40-i).padStart(4,'0')})));assert.notDeepEqual(first.selected.map(q=>q.id),second.selected.map(q=>q.id));assert.equal(first.overlap,0);
});
test('selector keeps full cloze groups in gap order and rejects incomplete or wrong-passage groups',()=>{
 const cell={...single,kind:'cloze'};const pool=Array.from({length:10},(_,i)=>candidate(i,{group_id:'group',group_kind:'cloze',group_reviewed:true,passage_id:'passage',group_passage_id:'passage',group_position:i+1}));const form=selectAssessmentForm(blueprint,[cell],pool.reverse());assert.deepEqual(form.selected.map(q=>q.group_position),[1,2,3,4,5,6,7,8,9,10]);
 for(const rows of [pool.slice(1),pool.map(q=>({...q,passage_id:'wrong'})),pool.map(q=>({...q,group_reviewed:false}))])assert.throws(()=>selectAssessmentForm(blueprint,[cell],rows),e=>e.status===409);
});
test('reading-text cells enforce reviewed work identity while treating years as reference metadata',()=>{
 const cell={...single,kind:'reading_text'};const pool=Array.from({length:10},(_,i)=>candidate(i,{reading_text_id:'book',chapter:'Chapter '+i%3}));
 assert.throws(()=>selectAssessmentForm(blueprint,[cell],pool),e=>e.status===409);
 const bound={...blueprint,reading_text_id:'book',reading_reviewed:true,reading_cycle:2026};assert.equal(selectAssessmentForm(bound,[cell],pool).selected.length,10);
 assert.equal(selectAssessmentForm({...bound,reading_cycle:2027},[cell],pool).selected.length,10);
 assert.throws(()=>selectAssessmentForm({...bound,reading_reviewed:false},[cell],pool),e=>e.status===409);
 assert.throws(()=>selectAssessmentForm({...bound,reading_text_id:'different-book'},[cell],pool),e=>e.status===409);
});
test('short pools do not duplicate content and declare unavoidable overlap and difficulty fallback',()=>{
 assert.throws(()=>selectAssessmentForm(blueprint,[single],Array.from({length:9},(_,i)=>candidate(i))),e=>e.status===409);
 assert.throws(()=>selectAssessmentForm(blueprint,[single],Array.from({length:20},(_,i)=>candidate(i,{content_family:'same'}))),e=>e.status===409);
 const form=selectAssessmentForm(blueprint,[single],Array.from({length:10},(_,i)=>candidate(i,{previous:true,difficulty:'easy'})));assert.equal(form.overlap,10);assert.ok(form.warnings.some(w=>w.includes('overlap')));assert.ok(form.warnings.some(w=>w.includes('difficulty')));
});
