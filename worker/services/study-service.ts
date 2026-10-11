import { ApiError } from '../api/errors';
import { assertValidUuid } from '../api/contracts';
import type { SqlTagExecutor } from '../api/db-context';
import { getUserSubscriptionStatus } from './subscription-service';
import { recordTopicMasteryBatch } from './coach-service';

export function watDate(now: Date): string { return new Date(now.getTime() + 3600000).toISOString().slice(0, 10); }
export function validatePracticeInput(input: unknown): { subjectCode: string; topicSlug: string | null; count: number } {
  const body = input as Record<string, unknown>;
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.subjectCode !== 'string' || !/^[A-Za-z0-9]{2,6}$/.test(body.subjectCode) || !Number.isInteger(body.count) || Number(body.count) < 1 || Number(body.count) > 60 || (body.topicSlug != null && (typeof body.topicSlug !== 'string' || body.topicSlug.length > 120))) throw new ApiError({ status: 422, code: 'VALIDATION_FAILED', message: 'Choose a subject and 1–60 practice questions.' });
  return { subjectCode: body.subjectCode.toUpperCase(), topicSlug: typeof body.topicSlug === 'string' && body.topicSlug.trim() ? body.topicSlug.trim() : null, count: Number(body.count) };
}
export async function lockStudent(tx: SqlTagExecutor, userId: string) {
  const rows = await tx`SELECT id FROM profiles WHERE id = ${userId}::uuid FOR UPDATE`;
  if (!rows.length) throw new ApiError({ status: 409, code: 'CONFLICT', message: 'Complete account setup first.' });
}

/** Private snapshots contain answer keys; only safe_snapshot is returned to a student. */
export async function selectPublishedQuestions(tx: SqlTagExecutor, userId: string, subjectId: string, count: number, topicSlug: string | null = null, practice = false) {
  return tx<Array<{ id: string; subject_id: string; topic_id: string; snapshot: Record<string, unknown>; correct_option_id: string; explanation: string | null }>>`
    SELECT q.id, q.subject_id, q.topic_id, correct.id AS correct_option_id, qe.explanation,
      jsonb_build_object('id', q.id, 'subjectId', s.id, 'subjectCode', s.code, 'subjectName', s.name, 'topicId', t.id, 'topicTitle', t.title, 'stem', q.stem, 'difficulty', q.difficulty, 'examYear', q.exam_year, 'imageUrl', q.image_url,
        'passage', CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object('title',p.title,'content',p.content) END,
        'options', opts.items) AS snapshot
    FROM questions q JOIN subjects s ON s.id=q.subject_id JOIN topics t ON t.id=q.topic_id AND t.subject_id=q.subject_id
    LEFT JOIN passages p ON p.id=q.passage_id LEFT JOIN question_explanations qe ON qe.question_id=q.id
    JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('id',id,'label',label,'content',content) ORDER BY label) AS items,
      COUNT(*) AS n, COUNT(DISTINCT label) AS labels, COUNT(*) FILTER (WHERE is_correct) AS correct_count,
      BOOL_AND(label IN ('A','B','C','D')) AS valid FROM question_options WHERE question_id=q.id) opts ON opts.n=4 AND opts.labels=4 AND opts.correct_count=1 AND opts.valid
    JOIN question_options correct ON correct.question_id=q.id AND correct.is_correct
    WHERE q.subject_id=${subjectId}::uuid AND s.is_active AND q.status='published'
      AND (${topicSlug}::text IS NULL OR t.slug=${topicSlug})
      AND (NOT ${practice}::boolean OR NOT EXISTS (SELECT 1 FROM attempts a JOIN attempt_questions aq ON aq.attempt_id=a.id WHERE a.user_id=${userId}::uuid AND a.mode='mock' AND a.status='in_progress' AND aq.question_id=q.id))
    ORDER BY RANDOM() LIMIT ${count}
  `;
}
async function persistFrozenQuestions(tx: SqlTagExecutor, attemptId: string, rows: Awaited<ReturnType<typeof selectPublishedQuestions>>) {
  // One bulk write, avoiding 180 insert round trips. Fields have been selected server-side.
  const data = rows.map((row, index) => ({ question_id: row.id, subject_id: row.subject_id, topic_id: row.topic_id, position: index + 1, snapshot: { ...row.snapshot, position: index + 1 }, correct_option_id: row.correct_option_id, explanation: row.explanation }));
  await tx`INSERT INTO attempt_questions (attempt_id,question_id,subject_id,topic_id,position,snapshot,correct_option_id,frozen_explanation)
    SELECT ${attemptId}::uuid, x.question_id, x.subject_id, x.topic_id, x.position, x.snapshot, x.correct_option_id, x.explanation
    FROM jsonb_to_recordset(${JSON.stringify(data)}::text::jsonb) AS x(question_id uuid, subject_id uuid, topic_id uuid, position int, snapshot jsonb, correct_option_id uuid, explanation text)`;
}
export async function allocatePractice(tx: SqlTagExecutor, userId: string, input: unknown, now: Date) {
  const data = validatePracticeInput(input); await lockStudent(tx, userId);
  const subscription = await getUserSubscriptionStatus(tx, userId, now);
  if (data.topicSlug && !subscription.isPremium) throw new ApiError({ status: 403, code: 'FORBIDDEN_ENTITLEMENT_REQUIRED', message: 'Topic-focused practice requires Premium.' });
  const subjects = await tx<Array<{ id: string }>>`SELECT s.id FROM subjects s JOIN student_subjects ss ON ss.subject_id=s.id WHERE ss.user_id=${userId}::uuid AND s.code=${data.subjectCode} AND s.is_active`;
  if (subjects.length !== 1) throw new ApiError({ status: 403, code: 'FORBIDDEN', message: 'Choose one of your enrolled subjects.' });
  const existing = await tx<Array<{ questions_allocated: number }>>`SELECT questions_allocated FROM daily_practice_allowances WHERE user_id=${userId}::uuid AND practice_date_wat=${watDate(now)}::date`;
  const remaining = Math.max(0, 15 - Number(existing[0]?.questions_allocated ?? 0));
  if (!subscription.isPremium && data.count > remaining) throw new ApiError({ status: 429, code: 'RATE_LIMITED', message: `You have ${remaining} free practice questions left today. Your allowance resets at midnight WAT.` });
  const rows = await selectPublishedQuestions(tx, userId, subjects[0].id, data.count, data.topicSlug, true);
  if (!rows.length) throw new ApiError({ status: 409, code: 'CONFLICT', message: 'No available questions match this choice. Try another subject or finish your active mock.' });
  const attempts = await tx<Array<{ id: string }>>`INSERT INTO attempts (user_id,mode,status,started_at,expires_at) VALUES (${userId}::uuid,'practice','in_progress',${now.toISOString()}::timestamptz,${new Date(now.getTime()+86400000).toISOString()}::timestamptz) RETURNING id`;
  await persistFrozenQuestions(tx, attempts[0].id, rows);
  if (!subscription.isPremium) await tx`INSERT INTO daily_practice_allowances (user_id,practice_date_wat,questions_allocated) VALUES (${userId}::uuid,${watDate(now)}::date,${rows.length}) ON CONFLICT (user_id,practice_date_wat) DO UPDATE SET questions_allocated=daily_practice_allowances.questions_allocated+EXCLUDED.questions_allocated`;
  return { sessionId: attempts[0].id, questions: rows.map((row) => row.snapshot), remaining: subscription.isPremium ? null : remaining - rows.length };
}
export async function checkIssuedPractice(tx: SqlTagExecutor, userId: string, input: { sessionId: string; questionId: string; selectedOption: string }, now: Date) {
  assertValidUuid(input.sessionId); assertValidUuid(input.questionId);
  if (!['A','B','C','D'].includes(input.selectedOption)) throw new ApiError({ status: 422, code: 'VALIDATION_FAILED', message: 'Select an option from A to D.' });
  await lockStudent(tx, userId);
  const rows = await tx<Array<{ snapshot: { options: { id: string; label: string }[] }; correct_option_id: string; frozen_explanation: string | null; subject_id: string; topic_id: string }>>`
    SELECT aq.snapshot,aq.correct_option_id,aq.frozen_explanation,aq.subject_id,aq.topic_id FROM attempts a JOIN attempt_questions aq ON aq.attempt_id=a.id
    WHERE a.id=${input.sessionId}::uuid AND a.user_id=${userId}::uuid AND a.mode='practice' AND a.expires_at>${now.toISOString()}::timestamptz AND aq.question_id=${input.questionId}::uuid FOR UPDATE OF a`;
  if (!rows.length) throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'This question is not in an active practice session owned by you.' });
  const restricted = await tx`SELECT a.id FROM attempts a JOIN attempt_questions aq ON aq.attempt_id=a.id WHERE a.user_id=${userId}::uuid AND a.mode='mock' AND a.status='in_progress' AND aq.question_id=${input.questionId}::uuid LIMIT 1`;
  if (restricted.length) throw new ApiError({ status: 403, code: 'FORBIDDEN', message: 'Feedback is unavailable while this question is in your active mock.' });
  const row = rows[0]; const option = row.snapshot.options.find((item) => item.label === input.selectedOption);
  const correct = row.snapshot.options.find((item) => item.id === row.correct_option_id);
  if (!option || !correct) throw new ApiError({ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Question content is unavailable.' });
  const answers = await tx<Array<{ selected_option_id: string }>>`INSERT INTO attempt_answers (attempt_id,question_id,selected_option_id,answered_at,revision) VALUES (${input.sessionId}::uuid,${input.questionId}::uuid,${option.id}::uuid,${now.toISOString()}::timestamptz,1) ON CONFLICT (attempt_id,question_id) DO NOTHING RETURNING selected_option_id`;
  const existing = answers[0] ? answers : await tx<Array<{ selected_option_id: string }>>`SELECT selected_option_id FROM attempt_answers WHERE attempt_id=${input.sessionId}::uuid AND question_id=${input.questionId}::uuid`;
  const isCorrect = existing[0]?.selected_option_id === row.correct_option_id;
  if (answers.length) await recordTopicMasteryBatch(tx, userId, [{ subjectId: row.subject_id, topicId: row.topic_id, isCorrect }], now);
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
  // Allocate and freeze in PostgreSQL. Never decode 180 private answer-bearing rows in V8.
  const created = await tx<Array<{attempt_id:string|null;counts:{code:string;available:number;required:number}[];payload_bytes:number;issued_count:number}>>`
    WITH enrolled AS (
      SELECT s.id,s.code,s.is_compulsory,s.display_order,CASE WHEN s.code='ENG' THEN 60 ELSE 40 END AS required
      FROM student_subjects ss JOIN subjects s ON s.id=ss.subject_id WHERE ss.user_id=${userId}::uuid AND s.is_active
    ), bank AS (
      SELECT e.*,q.id AS question_id,q.topic_id,q.correct_option_id,q.explanation,q.snapshot,q.random_order
      FROM enrolled e CROSS JOIN LATERAL (
        SELECT q.id,q.topic_id,correct.id AS correct_option_id,qe.explanation,RANDOM() AS random_order,
          jsonb_build_object('id',q.id,'subjectId',e.id,'subjectCode',e.code,'subjectName',s.name,'topicId',t.id,'topicTitle',t.title,'stem',q.stem,'difficulty',q.difficulty,'examYear',q.exam_year,'imageUrl',q.image_url,
            'passage',CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object('title',p.title,'content',p.content) END,'options',opts.items) AS snapshot
        FROM questions q JOIN subjects s ON s.id=q.subject_id JOIN topics t ON t.id=q.topic_id AND t.subject_id=q.subject_id
        LEFT JOIN passages p ON p.id=q.passage_id LEFT JOIN question_explanations qe ON qe.question_id=q.id
        JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object('id',id,'label',label,'content',content) ORDER BY label) AS items,COUNT(*) AS n,COUNT(DISTINCT label) AS labels,COUNT(*) FILTER(WHERE is_correct) AS correct_count,BOOL_AND(label IN ('A','B','C','D')) AS valid FROM question_options WHERE question_id=q.id) opts ON opts.n=4 AND opts.labels=4 AND opts.correct_count=1 AND opts.valid
        JOIN question_options correct ON correct.question_id=q.id AND correct.is_correct
        WHERE q.subject_id=e.id AND q.status='published' ORDER BY random_order LIMIT e.required
      ) q
    ), counts AS (
      SELECT e.code,e.required,COUNT(b.question_id)::int AS available FROM enrolled e LEFT JOIN bank b ON b.id=e.id GROUP BY e.code,e.required
    ), budget AS (SELECT COALESCE(SUM(octet_length(snapshot::text)+120),0)::int AS bytes FROM bank),
    inserted_attempt AS (
      INSERT INTO attempts(user_id,mode,status,exam_conditions,started_at,expires_at)
      SELECT ${userId}::uuid,'mock','in_progress',${input.examConditions},${now.toISOString()}::timestamptz,${new Date(now.getTime()+7200000).toISOString()}::timestamptz
      WHERE (SELECT COUNT(*) FROM bank)=180 AND NOT EXISTS(SELECT 1 FROM counts WHERE available<>required) AND (SELECT bytes FROM budget)<=524288
      RETURNING id
    ), ordered AS (
      SELECT b.*,ROW_NUMBER() OVER(ORDER BY is_compulsory DESC,display_order,code,random_order)::int AS position FROM bank b
    ), frozen AS (
      INSERT INTO attempt_questions(attempt_id,question_id,subject_id,topic_id,position,snapshot,correct_option_id,frozen_explanation)
      SELECT a.id,o.question_id,o.id,o.topic_id,o.position,o.snapshot||jsonb_build_object('position',o.position),o.correct_option_id,o.explanation FROM inserted_attempt a CROSS JOIN ordered o RETURNING id
    ) SELECT (SELECT id FROM inserted_attempt) AS attempt_id,(SELECT jsonb_agg(c) FROM counts c) AS counts,(SELECT bytes FROM budget) AS payload_bytes,(SELECT COUNT(*) FROM frozen) AS issued_count`;
  const outcome=created[0];
  if (!outcome?.attempt_id) {
    const short=outcome?.counts?.find(subject=>subject.available<subject.required);
    throw new ApiError({status:409,code:'CONFLICT',message:short?`The full mock needs ${short.required} complete published ${short.code} questions; ${short.available} are available. No diagnostic allowance has been consumed.`:'The full mock bank is incomplete or its content exceeds the safe transport size. No diagnostic allowance has been consumed.'});
  }
  if(Number(outcome.issued_count)!==180)throw new ApiError({status:503,code:'SERVICE_UNAVAILABLE',message:'The full exam could not be frozen. Please retry.'});
  return {attemptId:outcome.attempt_id,resumed:false};
}
