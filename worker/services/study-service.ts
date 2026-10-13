import {loadAssessmentPools,selectAssessmentForm} from './assessment-selector';
import { ApiError } from '../api/errors';
import { assertValidUuid } from '../api/contracts';
import type { SqlTagExecutor } from '../api/db-context';
import { getUserSubscriptionStatus } from './subscription-service';
import { resolvePracticeTopic } from './practice-catalogue-service';
import { recordTopicMasteryBatch } from './coach-service';

export function watDate(now: Date): string { return new Date(now.getTime() + 3600000).toISOString().slice(0, 10); }
export function validatePracticeInput(input: unknown): { subjectCode: string; topicSlug: string | null; count: number } {
  const body = input as Record<string, unknown>;
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.subjectCode !== 'string' || !/^[A-Za-z0-9]{2,6}$/.test(body.subjectCode) || !Number.isInteger(body.count) || ![5,10,15].includes(Number(body.count)) || (body.topicSlug != null && (typeof body.topicSlug !== 'string' || body.topicSlug.length > 120))) throw new ApiError({ status: 422, code: 'VALIDATION_FAILED', message: 'Choose a subject and 5, 10 or 15 practice questions.' });
  return { subjectCode: body.subjectCode.toUpperCase(), topicSlug: typeof body.topicSlug === 'string' && body.topicSlug.trim() ? body.topicSlug.trim() : null, count: Number(body.count) };
}
export async function lockStudent(tx: SqlTagExecutor, userId: string) {
  const rows = await tx`SELECT id FROM profiles WHERE id = ${userId}::uuid FOR UPDATE`;
  if (!rows.length) throw new ApiError({ status: 409, code: 'CONFLICT', message: 'Complete account setup first.' });
}

/** Private snapshots contain answer keys; only safe_snapshot is returned to a student. */
export async function selectPublishedQuestions(tx: SqlTagExecutor, userId: string, subjectId: string, count: number, topicSlug: string | null = null, practice = false) {
  return tx<Array<{ id: string; subject_id: string; topic_id: string; snapshot: Record<string, unknown>; correct_option_id: string; explanation: string | null }>>`
    WITH RECURSIVE selected_topic AS (
      SELECT id FROM topics WHERE subject_id=${subjectId}::uuid AND id=${topicSlug}::uuid
      UNION SELECT t.id FROM selected_topic w JOIN curriculum_topic_mappings m ON m.parent_topic_id=w.id JOIN topics t ON t.id=m.topic_id AND t.subject_id=${subjectId}::uuid
    ), candidates AS (
      SELECT q.*,ROW_NUMBER() OVER(PARTITION BY q.topic_id ORDER BY
        COALESCE((SELECT count(*) FROM scored_response_events e WHERE e.user_id=${userId}::uuid AND e.question_id=q.id),0),RANDOM()) AS topic_rank
      FROM study_question_pool q WHERE q.subject_id=${subjectId}::uuid AND (${topicSlug}::uuid IS NULL OR q.topic_id IN(SELECT id FROM selected_topic))
      AND (NOT ${practice}::boolean OR NOT EXISTS(SELECT 1 FROM attempts a JOIN attempt_questions aq ON aq.attempt_id=a.id WHERE a.user_id=${userId}::uuid AND a.mode='mock' AND a.status='in_progress' AND aq.question_id=q.id))
    ) SELECT id,subject_id,topic_id,snapshot,correct_option_id,explanation FROM candidates ORDER BY topic_rank,RANDOM() LIMIT ${count}`;
}
export async function persistFrozenQuestions(tx: SqlTagExecutor, attemptId: string, rows: Awaited<ReturnType<typeof selectPublishedQuestions>>) {
  // One bulk write, avoiding 180 insert round trips. Fields have been selected server-side.
  const data = rows.map((row, index) => ({ question_id: row.id, subject_id: row.subject_id, topic_id: row.topic_id, position: index + 1, snapshot: { ...row.snapshot, position: index + 1 }, correct_option_id: row.correct_option_id, explanation: row.explanation }));
  await tx`INSERT INTO attempt_questions (attempt_id,question_id,subject_id,topic_id,position,snapshot,correct_option_id,frozen_explanation)
    SELECT ${attemptId}::uuid, x.question_id, x.subject_id, x.topic_id, x.position, x.snapshot, x.correct_option_id, x.explanation
    FROM jsonb_to_recordset(${JSON.stringify(data)}::text::jsonb) AS x(question_id uuid, subject_id uuid, topic_id uuid, position int, snapshot jsonb, correct_option_id uuid, explanation text)`;
}
export async function allocatePractice(tx: SqlTagExecutor, userId: string, input: unknown, now: Date) {
  const data = validatePracticeInput(input); await lockStudent(tx,userId);
  const subscription = await getUserSubscriptionStatus(tx,userId,now);
  const subjects = await tx<Array<{id:string}>>`SELECT s.id FROM subjects s JOIN student_subjects ss ON ss.subject_id=s.id WHERE ss.user_id=${userId}::uuid AND s.code=${data.subjectCode} AND s.is_active`;
  if(subjects.length!==1) throw new ApiError({status:403,code:'FORBIDDEN',message:'Choose one of your active enrolled subjects.'});
  const topicId=await resolvePracticeTopic(tx,subjects[0].id,data.topicSlug);
  const [active]=await tx`SELECT id FROM attempts WHERE user_id=${userId}::uuid AND mode='practice' AND status='in_progress' AND expires_at>${now.toISOString()}::timestamptz AND practice_requested_count IN(5,10,15) AND EXISTS(SELECT 1 FROM attempt_questions aq WHERE aq.attempt_id=attempts.id AND aq.snapshot IS NOT NULL AND NOT EXISTS(SELECT 1 FROM attempt_answers aa WHERE aa.attempt_id=aq.attempt_id AND aa.question_id=aq.question_id AND aa.selected_option_id IS NOT NULL)) ORDER BY started_at DESC,id DESC LIMIT 1`;
  if(active) throw new ApiError({status:409,code:'CONFLICT',message:'Resume or end your current practice session before starting another.'});
  const [used]=await tx`SELECT user_id FROM daily_practice_sessions WHERE user_id=${userId}::uuid AND practice_date_wat=${watDate(now)}::date`;
  if(!subscription.isPremium && used) throw new ApiError({status:429,code:'RATE_LIMITED',message:'Your daily free practice session has been used. Resume your saved session or come back after midnight WAT.'});
  const rows=await selectPublishedQuestions(tx,userId,subjects[0].id,data.count,topicId,true);
  if(rows.length!==data.count) throw new ApiError({status:409,code:'CONFLICT',message:`This selection has ${rows.length} available questions; ${data.count} are required. No free session has been used.`});
  const [attempt]=await tx<Array<{id:string}>>`INSERT INTO attempts(user_id,mode,status,started_at,expires_at,practice_subject_id,practice_topic_id,practice_requested_count)
    VALUES(${userId}::uuid,'practice','in_progress',${now.toISOString()}::timestamptz,${new Date(now.getTime()+86400000).toISOString()}::timestamptz,${subjects[0].id}::uuid,${topicId}::uuid,${data.count}) RETURNING id`;
  await persistFrozenQuestions(tx,attempt.id,rows);
  if(!subscription.isPremium){
    await tx`INSERT INTO daily_practice_sessions(user_id,practice_date_wat,attempt_id) VALUES(${userId}::uuid,${watDate(now)}::date,${attempt.id}::uuid)`;
    // Keep the previous quota ledger exhausted if the API must be rolled back.
    await tx`INSERT INTO daily_practice_allowances(user_id,practice_date_wat,questions_allocated) VALUES(${userId}::uuid,${watDate(now)}::date,15) ON CONFLICT(user_id,practice_date_wat) DO UPDATE SET questions_allocated=GREATEST(daily_practice_allowances.questions_allocated,15)`;
  }
  return {sessionId:attempt.id,questions:rows.map(row=>row.snapshot),remaining:subscription.isPremium?null:0};
}
export async function checkIssuedPractice(tx: SqlTagExecutor, userId: string, input: { sessionId: string; questionId: string; selectedOption: string }, now: Date) {
  assertValidUuid(input.sessionId); assertValidUuid(input.questionId);
  if (!['A','B','C','D'].includes(input.selectedOption)) throw new ApiError({ status: 422, code: 'VALIDATION_FAILED', message: 'Select an option from A to D.' });
  await lockStudent(tx, userId);
  const rows = await tx<Array<{ snapshot: { options: { id: string; label: string }[] }; correct_option_id: string; frozen_explanation: string | null; subject_id: string; topic_id: string }>>`
    SELECT aq.snapshot,aq.correct_option_id,aq.frozen_explanation,aq.subject_id,aq.topic_id FROM attempts a JOIN attempt_questions aq ON aq.attempt_id=a.id
    WHERE a.id=${input.sessionId}::uuid AND a.user_id=${userId}::uuid AND a.mode='practice' AND ((a.status='in_progress' AND a.expires_at>${now.toISOString()}::timestamptz) OR (a.status='completed' AND EXISTS(SELECT 1 FROM attempt_answers checked WHERE checked.attempt_id=a.id AND checked.question_id=${input.questionId}::uuid AND checked.selected_option_id IS NOT NULL))) AND aq.question_id=${input.questionId}::uuid FOR UPDATE OF a`;
  if (!rows.length) throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'This question is not in an active practice session owned by you.' });
  const restricted = await tx`SELECT a.id FROM attempts a JOIN attempt_questions aq ON aq.attempt_id=a.id WHERE a.user_id=${userId}::uuid AND a.mode='mock' AND a.status='in_progress' AND aq.question_id=${input.questionId}::uuid LIMIT 1`;
  if (restricted.length) throw new ApiError({ status: 403, code: 'FORBIDDEN', message: 'Feedback is unavailable while this question is in your active mock.' });
  const row = rows[0]; const option = row.snapshot.options.find((item) => item.label === input.selectedOption);
  const correct = row.snapshot.options.find((item) => item.id === row.correct_option_id);
  if (!option || !correct) throw new ApiError({ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Question content is unavailable.' });
  const answers = await tx<Array<{ selected_option_id: string }>>`INSERT INTO attempt_answers (attempt_id,question_id,selected_option_id,answered_at,revision) VALUES (${input.sessionId}::uuid,${input.questionId}::uuid,${option.id}::uuid,${now.toISOString()}::timestamptz,1) ON CONFLICT (attempt_id,question_id) DO NOTHING RETURNING selected_option_id`;
  const existing = answers[0] ? answers : await tx<Array<{ selected_option_id: string }>>`SELECT selected_option_id FROM attempt_answers WHERE attempt_id=${input.sessionId}::uuid AND question_id=${input.questionId}::uuid`;
  const isCorrect = existing[0]?.selected_option_id === row.correct_option_id;
  if (answers.length) await tx`INSERT INTO scored_response_events(attempt_id,question_id,user_id,subject_id,topic_id,mode,answered,is_correct,difficulty,scored_at,editorial_revision) SELECT ${input.sessionId}::uuid,aq.question_id,${userId}::uuid,aq.subject_id,aq.topic_id,'practice',true,${isCorrect},COALESCE(aq.snapshot->>'difficulty','medium'),${now.toISOString()}::timestamptz,COALESCE((aq.snapshot->>'editorialRevision')::int,1) FROM attempt_questions aq WHERE aq.attempt_id=${input.sessionId}::uuid AND aq.question_id=${input.questionId}::uuid ON CONFLICT DO NOTHING`;
  if (answers.length) await recordTopicMasteryBatch(tx, userId, [{ subjectId: row.subject_id, topicId: row.topic_id, isCorrect }], now);
  if(answers.length)await tx`UPDATE attempts a SET status='completed',completed_at=${now.toISOString()}::timestamptz WHERE a.id=${input.sessionId}::uuid AND a.user_id=${userId}::uuid AND a.status='in_progress' AND NOT EXISTS(SELECT 1 FROM attempt_questions aq WHERE aq.attempt_id=a.id AND NOT EXISTS(SELECT 1 FROM attempt_answers aa WHERE aa.attempt_id=aq.attempt_id AND aa.question_id=aq.question_id AND aa.selected_option_id IS NOT NULL))`;
  return { isCorrect, correctOption: correct.label, explanation: row.frozen_explanation ?? 'An explanation has not been supplied.' };
}
export async function startFrozenMock(tx: SqlTagExecutor, userId: string, input: { examConditions: boolean }, now: Date) {
  if (typeof input.examConditions !== 'boolean') throw new ApiError({ status: 422, code: 'VALIDATION_FAILED', message: 'Choose a valid mock mode.' });
  await lockStudent(tx, userId);
  const active = await tx<Array<{ id: string }>>`SELECT id FROM attempts WHERE user_id=${userId}::uuid AND mode='mock' AND status='in_progress' ORDER BY started_at DESC LIMIT 1 FOR UPDATE`;
  if (active.length) return { attemptId: active[0].id, resumed: true };
  const subscription = await getUserSubscriptionStatus(tx, userId, now);
  const past = await tx`SELECT id FROM attempts WHERE user_id=${userId}::uuid AND mode='mock' LIMIT 1`;
  if (!subscription.isPremium && past.length) throw new ApiError({ status: 403, code: 'FORBIDDEN_ENTITLEMENT_REQUIRED', message: 'Your free diagnostic has been used. Upgrade to take another mock.' });
  const subjects = await tx<Array<{ id: string; code: string; is_compulsory: boolean }>>`SELECT s.id,s.code,s.is_compulsory FROM student_subjects ss JOIN subjects s ON s.id=ss.subject_id WHERE ss.user_id=${userId}::uuid AND s.is_active ORDER BY s.is_compulsory DESC,s.display_order,s.code`;
  if (subjects.length !== 4 || subjects.filter((s) => s.code==='ENG' && s.is_compulsory).length !== 1 || subjects.filter((s) => s.code!=='ENG' && !s.is_compulsory).length!==3) throw new ApiError({ status: 409, code: 'CONFLICT', message: 'Complete your English and three-elective subject combination first.' });
  const [preferences]=await tx`SELECT exam_year FROM student_preferences WHERE user_id=${userId}::uuid`;
  if(!preferences)throw new ApiError({status:409,code:'CONFLICT',message:'Choose your exam year in your profile before starting a mock.'});
  const seed=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  const selected:Array<{id:string;position:number;family:string}>=[];const manifests=[];
  for(const subject of subjects){const pools=await loadAssessmentPools(tx,subject.id,Number(preferences.exam_year),userId,seed);const expected=subject.is_compulsory?60:40;
    if(Number(pools.blueprint.total_questions)!==expected)throw new ApiError({status:409,code:'CONFLICT',message:'The approved blueprint does not meet the full four-subject exam structure. No diagnostic allowance has been consumed.'});
    const form=selectAssessmentForm(pools.blueprint,pools.cells,pools.candidates);for(const q of form.selected)selected.push({id:q.id,position:selected.length+1,family:q.content_family});
    manifests.push({blueprintId:pools.blueprint.id,version:pools.blueprint.version,subjectId:subject.id,overlap:form.overlap,warnings:form.warnings,readingTextId:pools.blueprint.reading_text_id,difficultyTargets:pools.blueprint.difficulty_targets,overlapLimit:pools.blueprint.overlap_limit,cells:pools.cells.map(c=>({id:c.id,code:c.code,kind:c.kind,required:c.required_count,questions:form.selected.filter(q=>q.cell_id===c.id).map(q=>({id:q.id,groupId:q.group_id,gapPosition:q.group_position,contentFamily:q.content_family}))}))});
  }
  if(selected.length!==180||new Set(selected.map(q=>q.id)).size!==180||new Set(selected.map(q=>q.family)).size!==180)throw new ApiError({status:409,code:'CONFLICT',message:'The complete mock cannot be assembled uniquely. No diagnostic allowance has been consumed.'});
  const [budget]=await tx`SELECT COALESCE(sum(octet_length(q.snapshot::text)+120),0)::int AS bytes FROM study_question_pool q WHERE id IN(SELECT (x->>'id')::uuid FROM jsonb_array_elements(${JSON.stringify(selected)}::text::jsonb) x)`;
  if(Number(budget.bytes)>524288)throw new ApiError({status:409,code:'CONFLICT',message:'The selected mock exceeds its safe transport size. No diagnostic allowance has been consumed.'});
  const [attempt]=await tx<Array<{id:string}>>`INSERT INTO attempts(user_id,mode,status,exam_conditions,started_at,expires_at,blueprint_manifest)
    VALUES(${userId}::uuid,'mock','in_progress',${input.examConditions},${now.toISOString()}::timestamptz,${new Date(now.getTime()+7200000).toISOString()}::timestamptz,${JSON.stringify({selectorVersion:1,seed,subjects:manifests})}::text::jsonb) RETURNING id`;
  const [frozen]=await tx`WITH chosen AS(SELECT * FROM jsonb_to_recordset(${JSON.stringify(selected)}::text::jsonb) AS x(id uuid,position int)), inserted AS(
    INSERT INTO attempt_questions(attempt_id,question_id,subject_id,topic_id,position,snapshot,correct_option_id,frozen_explanation)
    SELECT ${attempt.id}::uuid,q.id,q.subject_id,q.topic_id,c.position,q.snapshot||jsonb_build_object('position',c.position),q.correct_option_id,q.explanation
    FROM chosen c JOIN study_question_pool q ON q.id=c.id RETURNING id) SELECT count(*)::int AS n FROM inserted`;
  if(Number(frozen.n)!==180)throw new ApiError({status:503,code:'SERVICE_UNAVAILABLE',message:'The full mock could not be frozen. Please retry.'});
  return {attemptId:attempt.id,resumed:false};
}
