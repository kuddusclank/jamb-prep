import { ApiError } from '../api/errors';
import type { SqlTagExecutor } from '../api/db-context';
import { getUserSubscriptionStatus } from './subscription-service';

export interface EvidenceStrength {
  sampleSize: number;
  sessions: number;
  correct: number;
  accuracy: number | null;
  strength: 'unassessed' | 'early' | 'provisional' | 'weak' | 'developing' | 'strong';
}
export interface EvidencePolicy {early_sample:number;confident_sample:number;confident_sessions:number;weak_below:number;strong_at:number;}
export function evidenceStrength(sample: number, sessions: number, correct: number,policy:EvidencePolicy={early_sample:5,confident_sample:10,confident_sessions:2,weak_below:65,strong_at:75}): EvidenceStrength {
  const accuracy = sample ? Math.round(100 * correct / sample) : null;
  const strength = !sample ? 'unassessed' : sample < policy.early_sample ? 'early' : sample < policy.confident_sample || sessions < policy.confident_sessions ? 'provisional' : accuracy! < policy.weak_below ? 'weak' : accuracy! < policy.strong_at ? 'developing' : 'strong';
  return { sampleSize: sample, sessions, correct, accuracy, strength };
}
export async function resolvePracticeTopic(sql: SqlTagExecutor, subjectId: string, slug: string | null): Promise<string | null> {
  if (!slug) return null;
  const rows = await sql<Array<{ id: string }>>`SELECT t.id FROM topics t LEFT JOIN curriculum_topic_mappings m ON m.topic_id=t.id
    WHERE t.subject_id=${subjectId}::uuid AND (t.slug=${slug} OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(COALESCE(m.aliases,'[]'::jsonb)) alias WHERE lower(alias)=lower(${slug}))) ORDER BY t.id LIMIT 2`;
  if (rows.length !== 1) throw new ApiError({ status: 422, code: 'VALIDATION_FAILED', message: 'Choose a valid, unambiguous topic for this subject.' });
  return rows[0].id;
}
export async function practiceCatalogue(sql: SqlTagExecutor, userId: string, now: Date) {
  const [policy]=await sql<EvidencePolicy[]>`SELECT * FROM study_evidence_policy WHERE id=true`;
  if(!policy)throw new ApiError({status:503,code:'SERVICE_UNAVAILABLE',message:'Study evidence settings are unavailable.'});
  const subscription = await getUserSubscriptionStatus(sql, userId, now);
  const rows = await sql<Array<{ id: string; code: string; name: string; is_compulsory: boolean; topics: Array<Record<string, unknown>>; sample: number; sessions: number; correct: number; available: number; omitted:number;reviews:number;difficulty:Record<string,unknown> }>>`
    WITH RECURSIVE enrolled AS (SELECT s.* FROM subjects s JOIN student_subjects ss ON ss.subject_id=s.id WHERE ss.user_id=${userId}::uuid AND s.is_active),
    tree(root,id,subject_id) AS (
      SELECT t.id,t.id,t.subject_id FROM topics t JOIN enrolled s ON s.id=t.subject_id
      UNION SELECT w.root,t.id,w.subject_id FROM tree w JOIN curriculum_topic_mappings m ON m.parent_topic_id=w.id JOIN topics t ON t.id=m.topic_id AND t.subject_id=w.subject_id
    ), eligible AS (SELECT q.* FROM study_question_pool q JOIN enrolled s ON s.id=q.subject_id WHERE NOT EXISTS(SELECT 1 FROM attempts a JOIN attempt_questions aq ON aq.attempt_id=a.id WHERE a.user_id=${userId}::uuid AND a.mode='mock' AND a.status='in_progress' AND aq.question_id=q.id)),
    recent AS (SELECT DISTINCT ON(question_id) * FROM scored_response_events WHERE user_id=${userId}::uuid AND answered ORDER BY question_id,scored_at DESC,attempt_id DESC),
    availability AS (SELECT w.root,count(q.id)::int AS n FROM tree w LEFT JOIN eligible q ON q.topic_id=w.id GROUP BY w.root),
    topic_activity AS (SELECT w.root,count(DISTINCT r.attempt_id) FILTER(WHERE r.answered)::int AS sessions,count(*) FILTER(WHERE NOT r.answered)::int AS omitted,(count(*) FILTER(WHERE r.answered)-count(DISTINCT r.question_id) FILTER(WHERE r.answered))::int AS reviews FROM tree w JOIN scored_response_events r ON r.topic_id=w.id AND r.user_id=${userId}::uuid GROUP BY w.root),
    subject_activity AS (SELECT subject_id,count(DISTINCT attempt_id) FILTER(WHERE answered)::int AS sessions,count(*) FILTER(WHERE NOT answered)::int AS omitted,(count(*) FILTER(WHERE answered)-count(DISTINCT question_id) FILTER(WHERE answered))::int AS reviews FROM scored_response_events WHERE user_id=${userId}::uuid GROUP BY subject_id),
    topic_evidence AS (SELECT w.root,count(r.question_id)::int AS sample,count(r.question_id) FILTER(WHERE r.is_correct)::int AS correct,jsonb_build_object('easy',jsonb_build_object('answered',count(r.question_id) FILTER(WHERE r.difficulty='easy'),'correct',count(r.question_id) FILTER(WHERE r.difficulty='easy' AND r.is_correct)),'medium',jsonb_build_object('answered',count(r.question_id) FILTER(WHERE r.difficulty='medium'),'correct',count(r.question_id) FILTER(WHERE r.difficulty='medium' AND r.is_correct)),'hard',jsonb_build_object('answered',count(r.question_id) FILTER(WHERE r.difficulty='hard'),'correct',count(r.question_id) FILTER(WHERE r.difficulty='hard' AND r.is_correct))) AS difficulty FROM tree w LEFT JOIN recent r ON r.topic_id=w.id GROUP BY w.root),
    subject_evidence AS (SELECT subject_id,count(*)::int AS sample,count(DISTINCT attempt_id)::int AS sessions,count(*) FILTER(WHERE is_correct)::int AS correct,jsonb_build_object('easy',jsonb_build_object('answered',count(*) FILTER(WHERE difficulty='easy'),'correct',count(*) FILTER(WHERE difficulty='easy' AND is_correct)),'medium',jsonb_build_object('answered',count(*) FILTER(WHERE difficulty='medium'),'correct',count(*) FILTER(WHERE difficulty='medium' AND is_correct)),'hard',jsonb_build_object('answered',count(*) FILTER(WHERE difficulty='hard'),'correct',count(*) FILTER(WHERE difficulty='hard' AND is_correct))) AS difficulty FROM recent GROUP BY subject_id)
    SELECT s.id,s.code,s.name,s.is_compulsory,COALESCE(e.sample,0) AS sample,COALESCE(sa.sessions,0) AS sessions,COALESCE(sa.omitted,0) AS omitted,COALESCE(sa.reviews,0) AS reviews,COALESCE(e.correct,0) AS correct,COALESCE(e.difficulty,'{}'::jsonb) AS difficulty,
      (SELECT count(*)::int FROM eligible q WHERE q.subject_id=s.id) AS available,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',t.id,'slug',t.slug,'title',t.title,'parentId',m.parent_topic_id,'aliases',COALESCE(m.aliases,'[]'::jsonb),'available',COALESCE(a.n,0),'sampleSize',COALESCE(te.sample,0),'sessions',COALESCE(ta.sessions,0),'omitted',COALESCE(ta.omitted,0),'reviews',COALESCE(ta.reviews,0),'correct',COALESCE(te.correct,0),'difficulty',COALESCE(te.difficulty,'{}'::jsonb)) ORDER BY t.title,t.id)
      FROM topics t LEFT JOIN curriculum_topic_mappings m ON m.topic_id=t.id LEFT JOIN availability a ON a.root=t.id LEFT JOIN topic_evidence te ON te.root=t.id LEFT JOIN topic_activity ta ON ta.root=t.id WHERE t.subject_id=s.id),'[]'::jsonb) AS topics
    FROM enrolled s LEFT JOIN subject_evidence e ON e.subject_id=s.id LEFT JOIN subject_activity sa ON sa.subject_id=s.id ORDER BY s.is_compulsory DESC,s.display_order,s.code`;
  const [used] = await sql`SELECT EXISTS(SELECT 1 FROM daily_practice_sessions WHERE user_id=${userId}::uuid AND practice_date_wat=${new Date(now.getTime()+3600000).toISOString().slice(0,10)}::date) AS used`;
  const [active] = await sql`SELECT id,practice_subject_id,practice_topic_id,practice_requested_count FROM attempts WHERE user_id=${userId}::uuid AND mode='practice' AND status='in_progress' AND expires_at>${now.toISOString()}::timestamptz AND practice_requested_count IN(5,10,15) AND EXISTS(SELECT 1 FROM attempt_questions aq WHERE aq.attempt_id=attempts.id AND aq.snapshot IS NOT NULL AND NOT EXISTS(SELECT 1 FROM attempt_answers aa WHERE aa.attempt_id=aq.attempt_id AND aa.question_id=aq.question_id AND aa.selected_option_id IS NOT NULL)) ORDER BY started_at DESC,id DESC LIMIT 1`;
  return { isPremium: subscription.isPremium, dailySessionUsed: Boolean(used?.used), sizes: [5,10,15], activeSessionId: active?.id ?? null,
    subjects: rows.map(s=>({id:s.id,code:s.code,name:s.name,isCompulsory:s.is_compulsory,available:s.available,omitted:s.omitted,reviews:s.reviews,difficulty:s.difficulty,...evidenceStrength(s.sample,s.sessions,s.correct,policy),topics:s.topics.map(t=>({...t,...evidenceStrength(Number(t.sampleSize),Number(t.sessions),Number(t.correct),policy)}))})) };
}
