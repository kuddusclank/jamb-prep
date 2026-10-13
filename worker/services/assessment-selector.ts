import {ApiError} from '../api/errors';
import type {SqlTagExecutor} from '../api/db-context';

export interface AssessmentCell {id:string;code:string;title:string;kind:'single'|'comprehension'|'cloze'|'reading_text';required_count:number;position:number;}
export interface AssessmentCandidate {id:string;subject_id:string;topic_id:string;difficulty:string;cell_id:string;group_id:string|null;group_position:number|null;group_kind:string|null;group_reviewed:boolean|null;passage_id:string|null;group_passage_id:string|null;reading_text_id:string|null;chapter:string|null;content_family:string;seen:number;previous:boolean;rank:string;}
export interface AssessmentBlueprint {id:string;subject_id:string;cycle_year:number;version:number;total_questions:number;reading_text_id:string|null;reading_reviewed:boolean|null;reading_cycle:number|null;overlap_limit:number;difficulty_targets:Record<string,number>;}
export function selectAssessmentForm(blueprint:AssessmentBlueprint,cells:AssessmentCell[],candidates:AssessmentCandidate[]) {
 if(cells.reduce((n,c)=>n+Number(c.required_count),0)!==Number(blueprint.total_questions))throw new ApiError({status:409,code:'CONFLICT',message:'The reviewed blueprint counts do not match its total.'});
 const selected:AssessmentCandidate[]=[];const ids=new Set<string>();const families=new Set<string>();const groups=new Set<string>();const warnings:string[]=[];const previousBudget=Math.floor(Number(blueprint.total_questions)*Number(blueprint.overlap_limit));
 const byExposure=(a:AssessmentCandidate,b:AssessmentCandidate)=>Number(a.previous)-Number(b.previous)||Number(a.seen)-Number(b.seen)||(a.rank<b.rank?-1:a.rank>b.rank?1:0);
 for(const cell of [...cells].sort((a,b)=>a.position-b.position)){
  const eligible=candidates.filter(q=>q.cell_id===cell.id&&!ids.has(q.id)&&!families.has(q.content_family));let chosen:AssessmentCandidate[]=[];
  if(cell.kind==='cloze'||cell.kind==='comprehension'){
   const groupMap=new Map<string,AssessmentCandidate[]>();for(const q of eligible)if(q.group_id&&q.group_reviewed&&q.group_kind===cell.kind&&q.passage_id===q.group_passage_id&&!groups.has(q.group_id)){const list=groupMap.get(q.group_id)??[];list.push(q);groupMap.set(q.group_id,list);}
   const options=[...groupMap.values()].filter(list=>list.length>=cell.required_count&&new Set(list.map(q=>q.content_family)).size>=cell.required_count&&(cell.kind!=='cloze'||(list.length===cell.required_count&&list.map(q=>Number(q.group_position)).sort((a,b)=>a-b).every((p,i)=>p===i+1))));
   options.sort((a,b)=>a.filter(q=>q.previous).length-b.filter(q=>q.previous).length||a.reduce((n,q)=>n+Number(q.seen),0)-b.reduce((n,q)=>n+Number(q.seen),0)||(a[0].rank<b[0].rank?-1:a[0].rank>b[0].rank?1:0));
   if(options.length){chosen=cell.kind==='cloze'?options[0].sort((a,b)=>Number(a.group_position)-Number(b.group_position)):options[0].sort(byExposure).slice(0,cell.required_count);groups.add(chosen[0].group_id!);}
  }else{
   const pool=eligible.filter(q=>cell.kind!=='reading_text'||(blueprint.reading_reviewed&&q.reading_text_id===blueprint.reading_text_id&&blueprint.reading_text_id));
   // Round-robin topic/chapter coverage, prioritising less exposed items inside each domain.
   const domains=new Map<string,AssessmentCandidate[]>();for(const q of pool.sort(byExposure)){const key=cell.kind==='reading_text'?(q.chapter||'unclassified'):q.topic_id;const list=domains.get(key)??[];list.push(q);domains.set(key,list);}
   const queues=[...domains.values()].sort((a,b)=>byExposure(a[0],b[0]));const localFamilies=new Set<string>();
   const targets=Object.fromEntries(Object.entries(blueprint.difficulty_targets).map(([k,v])=>[k,Math.floor(cell.required_count*Number(v)/100)]));let remaining=cell.required_count-Object.values(targets).reduce((n,v)=>n+v,0);for(const k of Object.keys(targets).sort((a,b)=>(cell.required_count*blueprint.difficulty_targets[b]/100%1)-(cell.required_count*blueprint.difficulty_targets[a]/100%1)))if(remaining-->0)targets[k]++;
   const filled:Record<string,number>={};let relaxed=false;
   while(chosen.length<cell.required_count&&queues.some(q=>q.length)){
    let progressed=false;for(const queue of queues){if(chosen.length===cell.required_count)break;const index=queue.findIndex(q=>!localFamilies.has(q.content_family)&&Number(filled[String(q.difficulty)]??0)<Number(targets[String(q.difficulty)]??0));if(index<0)continue;const [q]=queue.splice(index,1);chosen.push(q);localFamilies.add(q.content_family);filled[String(q.difficulty)]=(filled[String(q.difficulty)]??0)+1;progressed=true;}
    if(!progressed){relaxed=true;const fallback=queues.flat().filter(q=>!localFamilies.has(q.content_family)).sort(byExposure)[0];if(!fallback)break;chosen.push(fallback);localFamilies.add(fallback.content_family);for(const queue of queues){const i=queue.indexOf(fallback);if(i>=0)queue.splice(i,1);}}
   }
   if(relaxed)warnings.push(`${cell.code}: difficulty preference relaxed to preserve complete content.`);
   if(cell.kind==='reading_text'&&chosen.some(q=>!q.chapter))warnings.push(`${cell.code}: chapter coverage unavailable for some reviewed items.`);
   chosen.sort((a,b)=>(a.rank<b.rank?-1:a.rank>b.rank?1:0));
  }
  if(chosen.length!==Number(cell.required_count))throw new ApiError({status:409,code:'CONFLICT',message:`${cell.title} needs ${cell.required_count} classified questions in valid groups; only ${chosen.length} could be selected. No diagnostic allowance has been consumed.`});
  for(const q of chosen){if(ids.has(q.id)||families.has(q.content_family))throw new ApiError({status:409,code:'CONFLICT',message:'Duplicate question content prevents this mock from being assembled.'});ids.add(q.id);families.add(q.content_family);selected.push(q);}
 }
 const overlap=selected.filter(q=>q.previous).length;if(overlap>previousBudget)warnings.push('Previous-form overlap preference could not be met with the available classified pool.');
 return {selected,warnings,overlap};
}
export async function loadAssessmentPools(sql:SqlTagExecutor,subjectId:string,_cycleYear:number,userId:string,seed:string,blueprintId:string|null=null) {
 const [blueprint]=await sql<Array<AssessmentBlueprint>>`SELECT b.*,r.reviewed AS reading_reviewed,r.cycle_year AS reading_cycle FROM assessment_blueprints b LEFT JOIN assessment_reading_texts r ON r.id=b.reading_text_id WHERE b.subject_id=${subjectId}::uuid AND ((${blueprintId}::uuid IS NULL AND b.status='active') OR b.id=${blueprintId}::uuid) ORDER BY b.created_at DESC,b.version DESC,b.id DESC LIMIT 1`;
 if(!blueprint)throw new ApiError({status:409,code:'CONFLICT',message:'This subject has no approved mock blueprint. No diagnostic allowance has been consumed.'});
 const cells=await sql<AssessmentCell[]>`SELECT * FROM assessment_cells WHERE blueprint_id=${blueprint.id}::uuid ORDER BY position`;
 const candidates=await sql<AssessmentCandidate[]>`WITH previous_attempt AS(SELECT id FROM attempts WHERE user_id=${userId}::uuid AND mode='mock' ORDER BY started_at DESC,id DESC LIMIT 1),
 raw AS (
 SELECT q.id,q.subject_id,q.topic_id,q.difficulty,q.passage_id,c.cell_id,c.group_id,c.group_position,c.reading_text_id,c.chapter,c.content_family,g.kind AS group_kind,g.reviewed AS group_reviewed,g.passage_id AS group_passage_id,cell.kind AS cell_kind,cell.required_count,
 (SELECT count(*)::int FROM attempt_questions aq JOIN attempts a ON a.id=aq.attempt_id WHERE a.user_id=${userId}::uuid AND aq.question_id=q.id) AS seen,
 EXISTS(SELECT 1 FROM attempt_questions aq JOIN previous_attempt p ON p.id=aq.attempt_id WHERE aq.question_id=q.id) AS previous,
 md5(q.id::text||${seed}) AS rank FROM study_question_pool q JOIN question_assessment_classifications c ON c.question_id=q.id AND c.blueprint_id=${blueprint.id}::uuid
 JOIN assessment_cells cell ON cell.id=c.cell_id LEFT JOIN assessment_groups g ON g.id=c.group_id AND g.subject_id=q.subject_id WHERE q.subject_id=${subjectId}::uuid
 ), group_counts AS (
 SELECT cell_id,group_id,cell_kind,required_count,count(*) AS n,min(group_position) AS first_gap,max(group_position) AS last_gap,COUNT(DISTINCT group_position) AS positions,
 SUM(seen) AS exposure,bool_or(previous) AS repeated,min(rank) AS group_rank
 FROM raw WHERE group_id IS NOT NULL AND group_reviewed AND group_kind=cell_kind AND passage_id=group_passage_id GROUP BY cell_id,group_id,cell_kind,required_count
 ), chosen_groups AS (
 SELECT *,ROW_NUMBER() OVER(PARTITION BY cell_id ORDER BY repeated,exposure,group_rank) AS group_order FROM group_counts
 WHERE (cell_kind='comprehension' AND n>=required_count) OR (cell_kind='cloze' AND n=required_count AND positions=required_count AND first_gap=1 AND last_gap=required_count)
 ), ranked AS (
 SELECT raw.*,ROW_NUMBER() OVER(PARTITION BY raw.cell_id,raw.group_id ORDER BY previous,seen,rank) AS candidate_order FROM raw
 ), sampled AS (
 SELECT r.* FROM ranked r LEFT JOIN chosen_groups g ON g.cell_id=r.cell_id AND g.group_id=r.group_id
 WHERE (r.cell_kind IN('single','reading_text') AND r.candidate_order<=r.required_count*6)
 OR (r.cell_kind IN('comprehension','cloze') AND g.group_order<=8 AND r.candidate_order<=r.required_count)
 ) SELECT * FROM sampled ORDER BY cell_id,rank`;

 return {blueprint,cells,candidates};
}
