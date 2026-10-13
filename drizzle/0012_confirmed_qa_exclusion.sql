BEGIN;
-- These two IDs were inspected in the private restored bank: internal QA, not English content.
-- Keep questions, previous frozen attempts and keys intact; remove only future assessment eligibility.
CREATE TEMP TABLE qa_exclusion_ids ON COMMIT DROP AS
 SELECT q.id FROM questions q JOIN topics t ON t.id=q.topic_id JOIN subjects s ON s.id=q.subject_id
 WHERE s.code='ENG' AND q.assessment_enabled AND
 ((q.id='d92c05d8-0871-4ee7-8aac-1275f385b0c5' AND t.slug='test-topic') OR
  (q.id='34907c68-e790-42d3-be63-09f874471db6' AND t.slug='hyperdrive-verification'));
INSERT INTO question_editorial_history(question_id,revision,action,snapshot)
 SELECT q.id,q.editorial_revision,'assessment.qa-baseline',jsonb_build_object('question',to_jsonb(q),'metadata',(SELECT to_jsonb(m) FROM question_editorial_metadata m WHERE m.question_id=q.id),'options',(SELECT jsonb_agg(to_jsonb(o) ORDER BY o.label) FROM question_options o WHERE o.question_id=q.id),'explanation',(SELECT explanation FROM question_explanations e WHERE e.question_id=q.id),'passage',(SELECT to_jsonb(p) FROM passages p WHERE p.id=q.passage_id))
 FROM questions q JOIN qa_exclusion_ids x ON x.id=q.id ON CONFLICT(question_id,revision) DO NOTHING;
UPDATE questions q SET assessment_enabled=false,editorial_revision=editorial_revision+1 FROM qa_exclusion_ids x WHERE q.id=x.id;
INSERT INTO question_editorial_history(question_id,revision,action,snapshot)
 SELECT q.id,q.editorial_revision,'assessment.qa-excluded',jsonb_build_object('question',to_jsonb(q),'reason','Confirmed internal QA; original content and attempts retained') FROM questions q JOIN qa_exclusion_ids x ON x.id=q.id ON CONFLICT(question_id,revision) DO NOTHING;
INSERT INTO admin_audit_events(action,entity_id,details)
 SELECT 'assessment.qa-excluded',id,'{"reason":"Confirmed internal QA; no question or attempt deleted"}'::jsonb FROM qa_exclusion_ids;
COMMIT;
