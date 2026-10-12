BEGIN;
CREATE TABLE IF NOT EXISTS admin_import_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid NOT NULL REFERENCES profiles(id),
 file_hash text NOT NULL CHECK(length(file_hash)=64), total_rows integer NOT NULL CHECK(total_rows BETWEEN 1 AND 1000),
 completed_rows integer NOT NULL DEFAULT 0, completed_batches integer NOT NULL DEFAULT 0,
 status text NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','completed')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(actor_id,file_hash)
);
CREATE TABLE IF NOT EXISTS admin_import_batches (
 job_id uuid REFERENCES admin_import_jobs(id) ON DELETE CASCADE, batch_index integer NOT NULL,
 request_hash text NOT NULL, imported_count integer NOT NULL, skipped_count integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(job_id,batch_index)
);
ALTER TABLE admin_import_batches ADD COLUMN IF NOT EXISTS skipped_count integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS question_import_references (
 subject_id uuid REFERENCES subjects(id), external_reference text NOT NULL, question_id uuid NOT NULL REFERENCES questions(id), request_hash text NOT NULL, PRIMARY KEY(subject_id,external_reference)
);
ALTER TABLE question_import_references ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON question_import_references FROM anon,authenticated;
CREATE TABLE IF NOT EXISTS question_editorial_metadata (
 question_id uuid PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
 source_type text NOT NULL DEFAULT 'original' CHECK(source_type IN ('original','past_question','adapted')),
 source_reference text NOT NULL DEFAULT '', rights_note text NOT NULL DEFAULT '', image_alt text NOT NULL DEFAULT ''
);
ALTER TABLE question_editorial_metadata ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]';
CREATE TABLE IF NOT EXISTS passage_import_references (subject_id uuid REFERENCES subjects(id),external_reference text NOT NULL,passage_id uuid NOT NULL REFERENCES passages(id),PRIMARY KEY(subject_id,external_reference));
ALTER TABLE passage_import_references ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON passage_import_references FROM anon,authenticated;
CREATE TABLE IF NOT EXISTS question_editorial_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question_id uuid NOT NULL REFERENCES questions(id),
 revision integer NOT NULL, actor_id uuid REFERENCES profiles(id), action text NOT NULL,
 snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(question_id,revision)
);
CREATE TABLE IF NOT EXISTS admin_audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES profiles(id), action text NOT NULL,
 entity_id uuid, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_events(created_at DESC,id);
ALTER TABLE admin_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_editorial_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_editorial_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON admin_import_jobs,admin_import_batches,question_editorial_metadata,question_editorial_history,admin_audit_events FROM anon,authenticated;
COMMIT;
