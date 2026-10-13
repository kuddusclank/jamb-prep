BEGIN;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS assessment_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS practice_subject_id uuid REFERENCES subjects(id);
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS practice_topic_id uuid REFERENCES topics(id);
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS practice_requested_count integer;
CREATE TABLE IF NOT EXISTS daily_practice_sessions (
 user_id uuid NOT NULL REFERENCES profiles(id), practice_date_wat date NOT NULL,
 attempt_id uuid REFERENCES attempts(id), created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,practice_date_wat)
);
INSERT INTO daily_practice_sessions(user_id,practice_date_wat)
 SELECT user_id,practice_date_wat FROM daily_practice_allowances WHERE questions_allocated>0
 ON CONFLICT DO NOTHING;
ALTER TABLE daily_practice_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON daily_practice_sessions FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS scored_response_events (
 attempt_id uuid NOT NULL REFERENCES attempts(id),question_id uuid NOT NULL REFERENCES questions(id),
 user_id uuid NOT NULL REFERENCES profiles(id),subject_id uuid NOT NULL REFERENCES subjects(id),topic_id uuid NOT NULL REFERENCES topics(id),
 mode attempt_mode NOT NULL, answered boolean NOT NULL,is_correct boolean NOT NULL,difficulty text NOT NULL,
 editorial_revision integer NOT NULL DEFAULT 1,scored_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(attempt_id,question_id)
);
ALTER TABLE scored_response_events ADD COLUMN IF NOT EXISTS editorial_revision integer NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS scored_evidence_user_topic_idx ON scored_response_events(user_id,topic_id,scored_at);
ALTER TABLE scored_response_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON scored_response_events FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS study_evidence_policy (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),early_sample integer NOT NULL DEFAULT 5 CHECK(early_sample>0),
 confident_sample integer NOT NULL DEFAULT 10 CHECK(confident_sample>=early_sample),confident_sessions integer NOT NULL DEFAULT 2 CHECK(confident_sessions>0),
 weak_below integer NOT NULL DEFAULT 65 CHECK(weak_below BETWEEN 1 AND 99),strong_at integer NOT NULL DEFAULT 75 CHECK(strong_at>weak_below AND strong_at<=100)
);
INSERT INTO study_evidence_policy(id) VALUES(true) ON CONFLICT DO NOTHING;
ALTER TABLE study_evidence_policy ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON study_evidence_policy FROM PUBLIC,anon,authenticated;
-- Reconstruct only reliable frozen evidence; do not rescore legacy unsnapshotted attempts.
INSERT INTO scored_response_events(attempt_id,question_id,user_id,subject_id,topic_id,mode,answered,is_correct,difficulty,scored_at,editorial_revision)
 SELECT a.id,aq.question_id,a.user_id,aq.subject_id,aq.topic_id,a.mode,
 aa.selected_option_id IS NOT NULL AND aa.answered_at<=a.expires_at,
 COALESCE(aa.selected_option_id=aq.correct_option_id AND aa.answered_at<=a.expires_at,false),
 COALESCE(aq.snapshot->>'difficulty','medium'),COALESCE(aa.answered_at,a.completed_at,a.started_at),COALESCE((aq.snapshot->>'editorialRevision')::int,1)
 FROM attempts a JOIN attempt_questions aq ON aq.attempt_id=a.id
 LEFT JOIN attempt_answers aa ON aa.attempt_id=a.id AND aa.question_id=aq.question_id
 WHERE aq.snapshot IS NOT NULL AND aq.correct_option_id IS NOT NULL AND aq.topic_id IS NOT NULL
 AND ((a.mode='practice' AND aa.selected_option_id IS NOT NULL) OR (a.mode='mock' AND a.status='completed'))
 ON CONFLICT DO NOTHING;
CREATE OR REPLACE VIEW study_topic_evidence WITH (security_invoker=true) AS
 WITH recent AS (
 SELECT DISTINCT ON(user_id,question_id) * FROM scored_response_events WHERE answered
 ORDER BY user_id,question_id,scored_at DESC,attempt_id DESC
 ) SELECT user_id,subject_id,topic_id,count(*)::int AS sample_size,(SELECT count(DISTINCT e.attempt_id)::int FROM scored_response_events e WHERE e.user_id=recent.user_id AND e.topic_id=recent.topic_id AND e.answered) AS sessions,
 count(*) FILTER(WHERE is_correct)::int AS correct,
 round(100.0*count(*) FILTER(WHERE is_correct)/GREATEST(count(*),1))::int AS accuracy,
 max(scored_at) AS last_practiced_at FROM recent GROUP BY user_id,subject_id,topic_id;
REVOKE ALL ON study_topic_evidence FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE VIEW study_question_pool WITH (security_invoker=true) AS
 SELECT q.id,q.subject_id,q.topic_id,q.difficulty,q.passage_id,q.editorial_revision,
 correct.id AS correct_option_id,qe.explanation,
 jsonb_build_object('id',q.id,'subjectId',s.id,'subjectCode',s.code,'subjectName',s.name,
 'topicId',t.id,'topicTitle',t.title,'topicSlug',t.slug,'stem',q.stem,'difficulty',q.difficulty,
 'examYear',q.exam_year,'imageUrl',q.image_url,'imageAlt',m.image_alt,'editorialRevision',q.editorial_revision,
 'passage',CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object('id',p.id,'title',p.title,'content',p.content) END,
 'options',opts.items) AS snapshot
 FROM questions q JOIN subjects s ON s.id=q.subject_id AND s.is_active
 JOIN topics t ON t.id=q.topic_id AND t.subject_id=q.subject_id
 JOIN question_explanations qe ON qe.question_id=q.id AND length(trim(qe.explanation))>=5
 LEFT JOIN question_editorial_metadata m ON m.question_id=q.id
 LEFT JOIN passages p ON p.id=q.passage_id AND p.subject_id=q.subject_id
 JOIN LATERAL (
 SELECT jsonb_agg(jsonb_build_object('id',id,'label',label,'content',content) ORDER BY label) AS items,
 count(*) AS n,count(DISTINCT label) AS labels,count(*) FILTER(WHERE is_correct) AS correct_count,
 bool_and(label IN ('A','B','C','D') AND length(trim(content))>0) AS valid
 FROM question_options WHERE question_id=q.id
 ) opts ON opts.n=4 AND opts.labels=4 AND opts.correct_count=1 AND opts.valid
 JOIN question_options correct ON correct.question_id=q.id AND correct.is_correct
 WHERE q.status='published' AND q.assessment_enabled AND length(trim(q.stem))>=5 AND (q.passage_id IS NULL OR (p.id IS NOT NULL AND length(trim(p.content))>=5));
REVOKE ALL ON study_question_pool FROM PUBLIC,anon,authenticated;
COMMIT;
