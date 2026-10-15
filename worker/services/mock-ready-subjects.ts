import {ApiError} from '../api/errors';
import type {SqlTagExecutor} from '../api/db-context';
import {selectAssessmentForm,type AssessmentBlueprint,type AssessmentCell,type AssessmentCandidate} from './assessment-selector';
export interface MockReadySubject {id:string;code:string;name:string;is_compulsory:boolean;}
interface SubjectPool extends MockReadySubject {blueprint:AssessmentBlueprint;cells:AssessmentCell[];candidates:AssessmentCandidate[];}
/** One database round trip; uses the same selector and eligibility view as starting a mock. */
export async function loadMockReadySubjects(sql:SqlTagExecutor,subjectIds:string[]|null=null):Promise<MockReadySubject[]> {
 const rows=await sql<SubjectPool[]>`WITH latest AS (
  SELECT DISTINCT ON(subject_id) b.*,r.reviewed AS reading_reviewed,r.cycle_year AS reading_cycle
  FROM assessment_blueprints b LEFT JOIN assessment_reading_texts r ON r.id=b.reading_text_id
  WHERE b.status='active' ORDER BY subject_id,b.created_at DESC,b.version DESC,b.id DESC
 ) SELECT s.id,s.code,s.name,s.is_compulsory,to_jsonb(b) AS blueprint,
  COALESCE((SELECT jsonb_agg(c ORDER BY c.position) FROM assessment_cells c WHERE c.blueprint_id=b.id),'[]'::jsonb) AS cells,
  COALESCE((SELECT jsonb_agg(x) FROM (
   SELECT q.id,q.subject_id,q.topic_id,q.difficulty,q.passage_id,c.cell_id,c.group_id,c.group_position,c.reading_text_id,c.chapter,c.content_family,
    g.kind AS group_kind,g.reviewed AS group_reviewed,g.passage_id AS group_passage_id,0 AS seen,false AS previous,md5(q.id::text||'catalogue-readiness') AS rank
   FROM study_question_pool q JOIN question_assessment_classifications c ON c.question_id=q.id AND c.blueprint_id=b.id
   JOIN assessment_cells cell ON cell.id=c.cell_id AND cell.blueprint_id=b.id
   LEFT JOIN assessment_groups g ON g.id=c.group_id AND g.subject_id=q.subject_id
   WHERE q.subject_id=s.id
  ) x),'[]'::jsonb) AS candidates
 FROM subjects s JOIN latest b ON b.subject_id=s.id
 WHERE s.is_active AND (${subjectIds===null} OR s.id=ANY(ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(subjectIds??[])}::text::jsonb)::uuid)))
 ORDER BY s.is_compulsory DESC,s.display_order,s.name`;
 return rows.filter(row=>{
  if(Number(row.blueprint.total_questions)!==(row.is_compulsory?60:40)||!row.cells.length)return false;
  try {selectAssessmentForm(row.blueprint,row.cells,row.candidates);return true;}
  catch(error){if(error instanceof ApiError&&error.status===409)return false;throw error;}
 }).map(({id,code,name,is_compulsory})=>({id,code,name,is_compulsory}));
}
let cached:{until:number;subjects:MockReadySubject[]}|null=null;
let pending:Promise<MockReadySubject[]>|null=null;
/** Public catalogue metadata only, never actor/session data or SQL connections. Saves always recheck fresh. */
export async function cachedMockReadySubjects(sql:SqlTagExecutor):Promise<MockReadySubject[]> {
 if(cached&&Date.now()<cached.until)return cached.subjects;
 if(pending)return pending;
 pending=loadMockReadySubjects(sql).then(subjects=>{cached={until:Date.now()+30000,subjects};return subjects;}).finally(()=>{pending=null;});
 return pending;
}
