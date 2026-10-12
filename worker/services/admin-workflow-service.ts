import {ApiError} from '../api/errors';
import type {SqlTagExecutor} from '../api/db-context';
import type {RouteDefinition,RouteRequestContext} from '../api/router';
import {assertValidUuid,readBoundedJsonBody} from '../api/contracts';
import {computeRequestHash} from '../api/idempotency';

export async function recordQuestionHistory(tx:SqlTagExecutor,questionId:string,actorId:string,action:string) {
 const recorded = await tx`INSERT INTO question_editorial_history(question_id,revision,actor_id,action,snapshot)
 SELECT q.id,q.editorial_revision,${actorId}::uuid,${action},jsonb_build_object('question',to_jsonb(q),'metadata',(SELECT to_jsonb(m) FROM question_editorial_metadata m WHERE m.question_id=q.id),'options',(SELECT jsonb_agg(to_jsonb(o) ORDER BY o.label) FROM question_options o WHERE o.question_id=q.id),'explanation',(SELECT explanation FROM question_explanations e WHERE e.question_id=q.id),'passage',(SELECT to_jsonb(p) FROM passages p WHERE p.id=q.passage_id)) FROM questions q WHERE q.id=${questionId}::uuid ON CONFLICT(question_id,revision) DO NOTHING RETURNING id`;
 if (!recorded.length) return;
 await tx`INSERT INTO admin_audit_events(actor_id,action,entity_id) VALUES (${actorId}::uuid,${action},${questionId}::uuid)`;
}
export async function saveEditorialMetadata(tx:SqlTagExecutor,questionId:string,item:{sourceType?:string;sourceReference?:string;rightsNote?:string;imageAlt?:string;tags?:string[];imageUrl?:string|null;examYear?:number|null;status:string}) {
 if(item.status==='published' && (!item.sourceReference?.trim() || !item.rightsNote?.trim() || (item.imageUrl && !item.imageAlt?.trim()))) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Publishing requires a source reference, permission/rights note and alternative text for any image.'});
 if(item.status==='published'){
  if(item.sourceType==='past_question'&&(!item.examYear||item.examYear>new Date().getUTCFullYear()))throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'A past question needs its actual past examination year.'});
  const [unreviewed]=await tx`SELECT q.id FROM questions q JOIN curriculum_topic_mappings m ON m.topic_id=q.topic_id WHERE q.id=${questionId}::uuid AND m.reviewed_at IS NULL`;
  if(unreviewed)throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Review this topic against its official PDF before publishing.'});
 }
 await tx`INSERT INTO question_editorial_metadata(question_id,source_type,source_reference,rights_note,image_alt,tags) VALUES (${questionId}::uuid,${item.sourceType ?? 'original'},${item.sourceReference ?? ''},${item.rightsNote ?? ''},${item.imageAlt ?? ''},${JSON.stringify(item.tags??[])}::text::jsonb) ON CONFLICT(question_id) DO UPDATE SET source_type=EXCLUDED.source_type,source_reference=EXCLUDED.source_reference,rights_note=EXCLUDED.rights_note,image_alt=EXCLUDED.image_alt,tags=EXCLUDED.tags`;
}
export async function beginImportBatch(tx:SqlTagExecutor,ctx:RouteRequestContext,payload:string,count:number) {
 const jobId=ctx.request.headers.get('X-Import-Job');if(!jobId)return null;
 assertValidUuid(jobId);const raw=ctx.request.headers.get('X-Import-Batch')??'';if(!/^\d{1,3}$/.test(raw))throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Invalid import batch.'});const index=Number(raw);
 const [job]=await tx`SELECT * FROM admin_import_jobs WHERE id=${jobId}::uuid AND actor_id=${ctx.actor!.userId}::uuid FOR UPDATE`;
 if(!job)throw new ApiError({status:404,code:'NOT_FOUND',message:'Import job not found.'});
 const hash=await computeRequestHash('admin.import.batch',payload);
 const [batch]=await tx`SELECT * FROM admin_import_batches WHERE job_id=${jobId}::uuid AND batch_index=${index}`;
 if(batch){if(batch.request_hash!==hash)throw new ApiError({status:409,code:'CONFLICT',message:'This batch contains different data.'});return {jobId,index,hash,replayed:true,count:Number(batch.imported_count),skippedCount:Number(batch.skipped_count)};}
 if(Number(job.completed_batches)!==index || count<1 || count>10 || Number(job.completed_rows)+count>Number(job.total_rows))throw new ApiError({status:409,code:'CONFLICT',message:'Resume from the next unfinished batch using the original file.'});
 return {jobId,index,hash,replayed:false,count,skippedCount:0};
}
export async function finishImportBatch(tx:SqlTagExecutor,batch:NonNullable<Awaited<ReturnType<typeof beginImportBatch>>>,actorId:string,skippedCount=0) {
 await tx`INSERT INTO admin_import_batches(job_id,batch_index,request_hash,imported_count,skipped_count) VALUES (${batch.jobId}::uuid,${batch.index},${batch.hash},${batch.count},${skippedCount})`;
 await tx`UPDATE admin_import_jobs SET completed_rows=completed_rows+${batch.count},completed_batches=completed_batches+1,status=CASE WHEN completed_rows+${batch.count}=total_rows THEN 'completed' ELSE 'in_progress' END,updated_at=now() WHERE id=${batch.jobId}::uuid`;
 await tx`INSERT INTO admin_audit_events(actor_id,action,entity_id,details) VALUES (${actorId}::uuid,'import.batch',${batch.jobId}::uuid,${JSON.stringify({index:batch.index,count:batch.count})}::text::jsonb)`;
}
export const ADMIN_WORKFLOW_ROUTES:RouteDefinition[]=[
 {id:'admin.import.jobs',method:'GET',pattern:'/api/v1/admin/import-jobs',auth:'admin',handler:async ctx=>({status:200,body:{jobs:await ctx.getDb().sql`SELECT id,file_hash,total_rows,completed_rows,completed_batches,status,created_at FROM admin_import_jobs WHERE actor_id=${ctx.actor!.userId}::uuid ORDER BY created_at DESC LIMIT 50`}})},
 {id:'admin.import.start',method:'POST',pattern:'/api/v1/admin/import-jobs',auth:'admin',handler:async ctx=>{
  const {data}=await readBoundedJsonBody(ctx.request);const input=data as Record<string,unknown>;
  if(typeof input.fileHash!=='string'||!/^[a-f0-9]{64}$/.test(input.fileHash)||!Number.isInteger(input.totalRows)||Number(input.totalRows)<1||Number(input.totalRows)>1000)throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Invalid import manifest.'});
  const [job]=await ctx.getDb().sql`INSERT INTO admin_import_jobs(actor_id,file_hash,total_rows) VALUES (${ctx.actor!.userId}::uuid,${input.fileHash},${Number(input.totalRows)}) ON CONFLICT(actor_id,file_hash) DO UPDATE SET file_hash=EXCLUDED.file_hash RETURNING id,total_rows,completed_rows,completed_batches,status`;
  if(Number(job.total_rows)!==Number(input.totalRows))throw new ApiError({status:409,code:'CONFLICT',message:'Import manifest has changed.'});return {status:200,body:job};
 }},
 {id:'admin.history.get',method:'GET',pattern:'/api/v1/admin/history',auth:'admin',handler:async ctx=>{const id=assertValidUuid(ctx.url.searchParams.get('questionId'),'questionId');return {status:200,body:{history:await ctx.getDb().sql`SELECT revision,action,snapshot,created_at FROM question_editorial_history WHERE question_id=${id}::uuid ORDER BY revision DESC LIMIT 50`}};}},
 {id:'admin.audit.get',method:'GET',pattern:'/api/v1/admin/audit',auth:'admin',handler:async ctx=>({status:200,body:{events:await ctx.getDb().sql`SELECT id,actor_id,action,entity_id,details,created_at FROM admin_audit_events ORDER BY created_at DESC,id DESC LIMIT 100`}})},
 {id:'admin.students.get',method:'GET',pattern:'/api/v1/admin/students',auth:'admin',handler:async ctx=>{
 const search=(ctx.url.searchParams.get('search')??'').trim();if(search.length>100)throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Search is too long.'});
 const page=Number(ctx.url.searchParams.get('page')??1);if(!Number.isInteger(page)||page<1||page>20000)throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Invalid page.'});
 return {status:200,body:{page,students:await ctx.getDb().sql`SELECT p.id,p.display_name,p.email,p.role,(SELECT expires_at FROM subscription_entitlements e WHERE e.user_id=p.id) AS premium_until,(SELECT count(*)::int FROM attempts a WHERE a.user_id=p.id AND a.status='completed') AS completed_attempts,(SELECT count(*)::int FROM referrals r WHERE r.referrer_id=p.id AND r.status='qualified') AS qualified_referrals FROM profiles p WHERE ${search}='' OR p.email ILIKE '%' || ${search} || '%' OR p.display_name ILIKE '%' || ${search} || '%' ORDER BY p.id LIMIT 25 OFFSET ${(page-1)*25}`}};
 }},
 {id:'admin.payments.get',method:'GET',pattern:'/api/v1/admin/payments',auth:'admin',handler:async ctx=>{
 const page=Number(ctx.url.searchParams.get('page')??1);if(!Number.isInteger(page)||page<1||page>20000)throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Invalid page.'});
 return {status:200,body:{page,payments:await ctx.getDb().sql`SELECT t.id,t.reference,t.amount_kobo,t.status,t.created_at,p.display_name,p.email,(SELECT expires_at FROM subscription_entitlements e WHERE e.user_id=t.user_id) AS premium_until FROM payment_transactions t JOIN profiles p ON p.id=t.user_id ORDER BY t.created_at DESC,t.id DESC LIMIT 25 OFFSET ${(page-1)*25}`}};
 }},
 {id:'admin.passages.get',method:'GET',pattern:'/api/v1/admin/passages',auth:'admin',handler:async ctx=>{
 const page=Number(ctx.url.searchParams.get('page')??1);if(!Number.isInteger(page)||page<1||page>20000)throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Invalid page.'});
 return {status:200,body:{page,passages:await ctx.getDb().sql`SELECT p.id,p.title,p.content,s.code AS subject_code,(SELECT count(*)::int FROM questions q WHERE q.passage_id=p.id) AS questions FROM passages p JOIN subjects s ON s.id=p.subject_id WHERE (${ctx.url.searchParams.get('subject') ?? ''}='' OR s.code=${ctx.url.searchParams.get('subject') ?? ''}) ORDER BY p.id LIMIT 25 OFFSET ${(page-1)*25}`}};
 }},
 {id:'admin.system.get',method:'GET',pattern:'/api/v1/admin/system',auth:'admin',handler:async ctx=>{
 const [counts]=await ctx.getDb().sql`SELECT (SELECT count(*)::int FROM payment_transactions WHERE status='pending') AS pending_payments,(SELECT count(*)::int FROM payment_checkout_requests WHERE status='unknown') AS uncertain_checkouts,(SELECT count(*)::int FROM payment_renewal_requests WHERE status='unknown') AS uncertain_renewals,(SELECT count(*)::int FROM admin_import_jobs WHERE status='in_progress') AS unfinished_imports,(SELECT count(*)::int FROM question_reports WHERE status IN ('open','investigating')) AS unresolved_reports`;
 return {status:200,body:{database:'reachable',mediaConfigured:Boolean(ctx.env.QUESTION_MEDIA),rateLimitConfigured:Boolean(ctx.env.EDGE_RATE_LIMIT&&ctx.env.ACTOR_WRITE_LIMIT),counts}};
 }},
];
