BEGIN;
-- Restore arrays/objects accidentally stored as JSON strings by double encoding.
UPDATE curriculum_topic_mappings
SET aliases = (aliases #>> '{}')::jsonb
WHERE jsonb_typeof(aliases) = 'string'
  AND jsonb_typeof((aliases #>> '{}')::jsonb) = 'array';
UPDATE question_editorial_metadata
SET tags = (tags #>> '{}')::jsonb
WHERE jsonb_typeof(tags) = 'string'
  AND jsonb_typeof((tags #>> '{}')::jsonb) = 'array';
UPDATE admin_audit_events
SET details = (details #>> '{}')::jsonb
WHERE jsonb_typeof(details) = 'string'
  AND jsonb_typeof((details #>> '{}')::jsonb) = 'object';
ALTER TABLE curriculum_topic_mappings
  ADD CONSTRAINT curriculum_aliases_array CHECK (jsonb_typeof(aliases) = 'array');
ALTER TABLE question_editorial_metadata
  ADD CONSTRAINT question_tags_array CHECK (jsonb_typeof(tags) = 'array');
ALTER TABLE admin_audit_events
  ADD CONSTRAINT admin_audit_details_object CHECK (jsonb_typeof(details) = 'object');
COMMIT;
