import type {RouteDefinition} from '../api/router';
import {ApiError} from '../api/errors';
import {assertValidUuid,readBoundedJsonBody} from '../api/contracts';
import {executeTransactionalIdempotentMutation,extractIdempotencyKey} from '../api/idempotency';
import {loadAssessmentPools,selectAssessmentForm} from './assessment-selector';
import {recordQuestionHistory} from './admin-workflow-service';
const invalid=(message:string)=>{throw new ApiError({status:422,code:'VALIDATION_FAILED',message});};
function text(value:unknown,max=200){if(typeof value!=='string'||!value.trim()||value.length>max)return invalid('Provide bounded nonempty text.');return value.trim();}
function year(value:unknown){if(!Number.isInteger(value)||Number(value)<1978||Number(value)>2100)return invalid('Choose a valid exam year.');return Number(value);}
function source(value:unknown){const raw=text(value,2000);try{const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password)throw Error();return raw;}catch{return invalid('Use an HTTPS source URL.');}}
export const ASSESSMENT_ADMIN_ROUTES:RouteDefinition[]=[
 {id:'assessment.admin.get',method:'GET',pattern:'/api/v1/admin/assessment',auth:'admin',handler:async ctx=>{
  const sql=ctx.getDb().sql;const [data]=await sql`SELECT jsonb_build_object(
   'subjects',(SELECT jsonb_agg(x) FROM (SELECT id,code,name,is_compulsory FROM subjects WHERE is_active ORDER BY display_order) x),
   'blueprints',COALESCE((SELECT jsonb_agg(x) FROM (SELECT b.*,s.code AS subject_code FROM assessment_blueprints b JOIN subjects s ON s.id=b.subject_id ORDER BY b.created_at DESC) x),'[]'::jsonb),
   'cells',COALESCE((SELECT jsonb_agg(x) FROM (SELECT * FROM assessment_cells ORDER BY position) x),'[]'::jsonb),
   'groups',COALESCE((SELECT jsonb_agg(x) FROM (SELECT g.*,p.title AS passage_title FROM assessment_groups g JOIN passages p ON p.id=g.passage_id) x),'[]'::jsonb),
   'readingTexts',COALESCE((SELECT jsonb_agg(r) FROM assessment_reading_texts r),'[]'::jsonb),
   'templates',COALESCE((SELECT jsonb_agg(t) FROM assessment_blueprint_templates t),'[]'::jsonb)
  ) AS data`;return {status:200,body:data.data};
 }},
 {id:'assessment.admin.questions',method:'GET',pattern:'/api/v1/admin/assessment/questions',auth:'admin',handler:async ctx=>{
  const subject=assertValidUuid(ctx.url.searchParams.get('subjectId'));const bp=ctx.url.searchParams.get('blueprintId');if(bp)assertValidUuid(bp);
  const page=Number(ctx.url.searchParams.get('page')??1);if(!Number.isInteger(page)||page<1||page>20000)return invalid('Invalid page.');
  const topic=ctx.url.searchParams.get('topicId');if(topic)assertValidUuid(topic);const passage=ctx.url.searchParams.get('passageId');if(passage)assertValidUuid(passage);
  const rows=await ctx.getDb().sql`SELECT q.id,left(q.stem,180) AS stem,t.title AS topic_title,t.id AS topic_id,q.passage_id,q.assessment_enabled,c.cell_id,c.group_position,
   EXISTS(SELECT 1 FROM question_editorial_metadata m WHERE m.question_id=q.id AND length(trim(m.source_reference))>0 AND length(trim(m.rights_note))>0) AS provenance_ready
   FROM questions q JOIN topics t ON t.id=q.topic_id LEFT JOIN question_assessment_classifications c ON c.question_id=q.id AND c.blueprint_id=${bp}::uuid
   WHERE q.subject_id=${subject}::uuid AND (${topic}::uuid IS NULL OR q.topic_id=${topic}::uuid) AND (${passage}::uuid IS NULL OR q.passage_id=${passage}::uuid)
   ORDER BY q.created_at DESC,q.id LIMIT 50 OFFSET ${(page-1)*50}`;return {status:200,body:{questions:rows,page}};
 }},
 {id:'assessment.admin.readiness',method:'GET',pattern:'/api/v1/admin/assessment/readiness',auth:'admin',handler:async ctx=>{
  const id=assertValidUuid(ctx.url.searchParams.get('blueprintId'));const sql=ctx.getDb().sql;const [bp]=await sql`SELECT subject_id,cycle_year FROM assessment_blueprints WHERE id=${id}::uuid`;if(!bp)throw new ApiError({status:404,code:'NOT_FOUND',message:'Blueprint not found.'});
  const pools=await loadAssessmentPools(sql,String(bp.subject_id),Number(bp.cycle_year),ctx.actor!.userId,'readiness-audit',id);
  try{const form=selectAssessmentForm(pools.blueprint,pools.cells,pools.candidates);return {status:200,body:{ready:true,total:form.selected.length,warnings:form.warnings,cells:pools.cells.map(c=>({title:c.title,required:c.required_count,candidates:pools.candidates.filter(q=>q.cell_id===c.id).length}))}};}
  catch(error){if(error instanceof ApiError)return {status:200,body:{ready:false,message:error.message,cells:pools.cells.map(c=>({title:c.title,required:c.required_count,candidates:pools.candidates.filter(q=>q.cell_id===c.id).length}))}};throw error;}
 }},
 {id:'assessment.admin.post',method:'POST',pattern:'/api/v1/admin/assessment',auth:'admin',idempotency:'required',handler:async ctx=>{
  const {data,rawText}=await readBoundedJsonBody(ctx.request);const operation=text(data.operation,40);
  const outcome=await executeTransactionalIdempotentMutation({db:ctx.getDb(),userId:ctx.actor!.userId,operation:'assessment.admin',canonicalPayload:rawText,idempotencyKey:extractIdempotencyKey(ctx.request,{required:true})!,execute:async tx=>{
   let entityId:string|null=null;
   if(operation==='reading-text.create'){
    if(typeof data.reviewed!=='boolean')return invalid('Confirm whether the annual reading text was reviewed.');
    const [r]=await tx`INSERT INTO assessment_reading_texts(cycle_year,title,author,source_url,reviewed) VALUES(${year(data.cycleYear)},${text(data.title)},${text(data.author)},${source(data.sourceUrl)},${data.reviewed}) RETURNING id`;entityId=String(r.id);
   }else if(operation==='reading-text.review'){
    const id=assertValidUuid(data.readingTextId);if(data.reviewed!==true)return invalid('Confirm annual source review.');
    const changed=await tx`UPDATE assessment_reading_texts SET reviewed=true WHERE id=${id}::uuid RETURNING id`;if(!changed.length)throw new ApiError({status:404,code:'NOT_FOUND',message:'Reading text not found.'});entityId=id;
   }else if(operation==='template.create'){
    if(data.reviewed!==true||!Array.isArray(data.cells)||data.cells.length<1||data.cells.length>30)return invalid('Review a bounded set of blueprint cells.');
    const cells=data.cells.map((raw,i)=>{const c=raw as Record<string,unknown>;const code=text(c.code,60);if(!/^[a-z0-9-]+$/.test(code)||!['single','comprehension','cloze','reading_text'].includes(String(c.kind))||!Number.isInteger(c.count)||Number(c.count)<1||Number(c.count)>60)return invalid('Invalid blueprint cell.');return {code,title:text(c.title),kind:c.kind,count:Number(c.count)};});
    if(new Set(cells.map(c=>c.code)).size!==cells.length)return invalid('Cell codes must be unique.');const total=cells.reduce((n,c)=>n+c.count,0);if(![40,60].includes(total))return invalid('Full-mock subject templates total 40 or 60.');
    await tx`INSERT INTO assessment_blueprint_templates(id,title,total_questions,cycle_year,source_url,cells) VALUES(${text(data.templateId,100)},${text(data.title)},${total},${year(data.cycleYear)},${source(data.sourceUrl)},${JSON.stringify(cells)}::text::jsonb)`;
   }else if(operation==='blueprint.create'){
    const subject=assertValidUuid(data.subjectId);const cycle=year(data.cycleYear);const templateId=text(data.templateId);
    await tx`SELECT id FROM subjects WHERE id=${subject}::uuid FOR UPDATE`;
    const [template]=await tx`SELECT * FROM assessment_blueprint_templates WHERE id=${templateId}`;if(!template)return invalid('Choose a reviewed template.');
    const reading=data.readingTextId?assertValidUuid(data.readingTextId):null;
    if(reading){const [r]=await tx`SELECT id FROM assessment_reading_texts WHERE id=${reading}::uuid`;if(!r)return invalid('Choose an existing reading text.');}
    const [next]=await tx`SELECT COALESCE(max(version),0)+1 AS n FROM assessment_blueprints WHERE subject_id=${subject}::uuid AND cycle_year=${cycle}`;
    const [bp]=await tx`INSERT INTO assessment_blueprints(subject_id,cycle_year,title,version,total_questions,duration_minutes,reading_text_id,source_url) VALUES(${subject}::uuid,${cycle},${text(data.title)},${Number(next.n)},${Number(template.total_questions)},120,${reading}::uuid,${String(template.source_url)}) RETURNING id`;entityId=String(bp.id);
    const cells=template.cells as Array<{code:string;title:string;kind:string;count:number}>;for(let i=0;i<cells.length;i++)await tx`INSERT INTO assessment_cells(blueprint_id,code,title,kind,required_count,position) VALUES(${entityId}::uuid,${cells[i].code},${cells[i].title},${cells[i].kind},${cells[i].count},${i})`;
   }else if(operation==='content.enabled'){
    const id=assertValidUuid(data.questionId);if(typeof data.enabled!=='boolean')return invalid('Choose assessment eligibility.');await recordQuestionHistory(tx,id,ctx.actor!.userId,'question.baseline');
    const changed=await tx`UPDATE questions SET assessment_enabled=${data.enabled},editorial_revision=editorial_revision+1 WHERE id=${id}::uuid RETURNING id`;if(!changed.length)throw new ApiError({status:404,code:'NOT_FOUND',message:'Question not found.'});await recordQuestionHistory(tx,id,ctx.actor!.userId,'question.eligibility');entityId=id;
   }else{
    const id=assertValidUuid(data.blueprintId);const [bp]=await tx`SELECT * FROM assessment_blueprints WHERE id=${id}::uuid FOR UPDATE`;if(!bp)throw new ApiError({status:404,code:'NOT_FOUND',message:'Blueprint not found.'});entityId=id;
    if(operation==='blueprint.activate'){
     if(bp.status==='retired')throw new ApiError({status:409,code:'CONFLICT',message:'A retired blueprint cannot be reactivated. Create a new reviewed version.'});
     const [subject]=await tx`SELECT is_compulsory FROM subjects WHERE id=${String(bp.subject_id)}::uuid FOR UPDATE`;if(Number(bp.total_questions)!==(subject.is_compulsory?60:40))return invalid('Blueprint must match the full mock subject structure.');
     const pools=await loadAssessmentPools(tx,String(bp.subject_id),Number(bp.cycle_year),ctx.actor!.userId,'activation-readiness',id);selectAssessmentForm(pools.blueprint,pools.cells,pools.candidates);
     await tx`UPDATE assessment_blueprints SET status='retired' WHERE subject_id=${String(bp.subject_id)}::uuid AND status='active' AND id<>${id}::uuid`;await tx`UPDATE assessment_blueprints SET status='active' WHERE id=${id}::uuid`;
    }else{
     if(bp.status!=='draft')throw new ApiError({status:409,code:'CONFLICT',message:'Create a new blueprint version before editing an activated form.'});
     if(operation==='blueprint.preferences'){
      const overlap=Number(data.overlapLimit);const mix=data.difficultyTargets as Record<string,unknown>;
      if(!Number.isFinite(overlap)||overlap<0||overlap>1||!mix||Object.keys(mix).length!==3||['easy','medium','hard'].some(k=>!Number.isInteger(mix[k])||Number(mix[k])<0||Number(mix[k])>100)||['easy','medium','hard'].reduce((n,k)=>n+Number(mix[k]),0)!==100)return invalid('Use an overlap fraction from 0–1 and difficulty percentages totalling 100.');
      await tx`UPDATE assessment_blueprints SET overlap_limit=${overlap},difficulty_targets=${JSON.stringify(mix)}::text::jsonb WHERE id=${id}::uuid`;
     }else if(operation==='questions.classify'){
      const cellId=assertValidUuid(data.cellId);const [cell]=await tx`SELECT * FROM assessment_cells WHERE id=${cellId}::uuid AND blueprint_id=${id}::uuid`;if(!cell)return invalid('Choose a cell belonging to this blueprint.');
      if(data.reviewed!==true)return invalid('Confirm the content classification has been reviewed.');
      let ids:string[]=[];const positions=new Map<string,number>();let group:string|null=null;
      if(data.group){const g=data.group as Record<string,unknown>;const passage=assertValidUuid(g.passageId);if(!['comprehension','cloze'].includes(String(cell.kind)))return invalid('Groups belong to passage cells.');const [p]=await tx`SELECT id FROM passages WHERE id=${passage}::uuid AND subject_id=${String(bp.subject_id)}::uuid`;if(!p)return invalid('Passage belongs to another subject.');
       if(!Array.isArray(g.items)||g.items.length<Number(cell.required_count)||g.items.length>60)return invalid('Choose a complete, bounded group.');
       for(const raw of g.items){const item=raw as Record<string,unknown>;const q=assertValidUuid(item.questionId);if(!Number.isInteger(item.position)||Number(item.position)<1||Number(item.position)>60)return invalid('Set valid question/gap positions.');if(positions.has(q)||[...positions.values()].includes(Number(item.position)))return invalid('Group IDs and positions must be unique.');positions.set(q,Number(item.position));ids.push(q);}
       if(cell.kind==='cloze'&&(ids.length!==Number(cell.required_count)||[...positions.values()].sort((a,b)=>a-b).some((p,i)=>p!==i+1)))return invalid('A cloze group needs exactly the configured ordered gaps.');
       const [created]=await tx`INSERT INTO assessment_groups(subject_id,passage_id,kind,title,reviewed) VALUES(${String(bp.subject_id)}::uuid,${passage}::uuid,${String(cell.kind)},${text(g.title)},true) RETURNING id`;group=String(created.id);
       const rows=await tx`SELECT id FROM study_question_pool WHERE id IN(SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::text::jsonb)::uuid) AND passage_id=${passage}::uuid AND subject_id=${String(bp.subject_id)}::uuid`;if(rows.length!==ids.length)return invalid('Every group item must be eligible and reference the selected passage.');
      }else{
       if(cell.kind==='comprehension'||cell.kind==='cloze')return invalid('Passage cells require an explicitly reviewed group.');
       if(data.topicId){const topic=assertValidUuid(data.topicId);const rows=await tx`WITH RECURSIVE scope AS(SELECT id FROM topics WHERE id=${topic}::uuid AND subject_id=${String(bp.subject_id)}::uuid UNION SELECT t.id FROM scope w JOIN curriculum_topic_mappings m ON m.parent_topic_id=w.id JOIN topics t ON t.id=m.topic_id AND t.subject_id=${String(bp.subject_id)}::uuid) SELECT id FROM study_question_pool WHERE subject_id=${String(bp.subject_id)}::uuid AND topic_id IN(SELECT id FROM scope)`;ids=rows.map(r=>String(r.id));}
       else{if(!Array.isArray(data.questionIds)||data.questionIds.length<1||data.questionIds.length>50)return invalid('Choose 1–50 questions.');ids=Array.from(new Set(data.questionIds.map(v=>assertValidUuid(v))));}
      }
      if(!ids.length||ids.length>2000)return invalid('No eligible content or too many items in this operation.');
      if(cell.kind==='reading_text'){const [r]=await tx`SELECT id FROM assessment_reading_texts WHERE id=${bp.reading_text_id}::uuid AND reviewed`;if(!r)return invalid('Review and bind the selected reading text first.');}
      const rows=await tx`SELECT q.id,md5(regexp_replace(lower(trim(q.stem)),'\\s+',' ','g')||COALESCE((SELECT regexp_replace(lower(trim(p.content)),'\\s+',' ','g') FROM passages p WHERE p.id=q.passage_id),'')||(SELECT string_agg(lower(trim(content)),'|' ORDER BY lower(trim(content))) FROM question_options o WHERE o.question_id=q.id)) AS family
       FROM questions q JOIN study_question_pool pool ON pool.id=q.id JOIN question_editorial_metadata m ON m.question_id=q.id WHERE q.subject_id=${String(bp.subject_id)}::uuid AND q.id IN(SELECT jsonb_array_elements_text(${JSON.stringify(ids)}::text::jsonb)::uuid) AND length(trim(m.source_reference))>0 AND length(trim(m.rights_note))>0 AND (q.image_url IS NULL OR length(trim(m.image_alt))>0)`;
      if(rows.length!==ids.length)return invalid('Every classified item needs valid published content, provenance and diagram alternative text.');
      if(new Set(rows.map(r=>r.family)).size!==rows.length)return invalid('Duplicate question content must be reviewed before classification.');
      const values=rows.map(r=>({id:r.id,family:r.family,position:positions.get(String(r.id))??null}));const chapter=data.chapter==null?null:text(data.chapter,100);
      await tx`INSERT INTO question_assessment_classifications(blueprint_id,question_id,cell_id,group_id,group_position,reading_text_id,chapter,content_family)
       SELECT ${id}::uuid,x.id,${cellId}::uuid,${group}::uuid,x.position,${cell.kind==='reading_text'?bp.reading_text_id:null}::uuid,${chapter},x.family
       FROM jsonb_to_recordset(${JSON.stringify(values)}::text::jsonb) AS x(id uuid,family text,position int)
       ON CONFLICT(blueprint_id,question_id) DO UPDATE SET cell_id=EXCLUDED.cell_id,group_id=EXCLUDED.group_id,group_position=EXCLUDED.group_position,reading_text_id=EXCLUDED.reading_text_id,chapter=EXCLUDED.chapter,content_family=EXCLUDED.content_family`;
     }else return invalid('Unknown assessment operation.');
    }
   }
   await tx`INSERT INTO admin_audit_events(actor_id,action,entity_id) VALUES(${ctx.actor!.userId}::uuid,${'assessment.'+operation},${entityId}::uuid)`;
   return {body:{saved:true,id:entityId}};
  }});return {status:200,body:outcome.body,headers:outcome.headers};
 }},
];
