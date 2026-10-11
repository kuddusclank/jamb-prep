-- Local release candidate only. Do not blindly run against the drifted production schema.
-- Apply only after schema fingerprint review, private backup and restore rehearsal (T16).
BEGIN;
CREATE TABLE IF NOT EXISTS public.api_idempotency_keys (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  operation text NOT NULL, idempotency_key text NOT NULL, request_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','completed')),
  response_status integer, response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  PRIMARY KEY(user_id,operation,idempotency_key)
);
CREATE INDEX IF NOT EXISTS api_idempotency_expiry_idx ON public.api_idempotency_keys(expires_at);
CREATE TABLE IF NOT EXISTS public.daily_practice_allowances (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  practice_date_wat date NOT NULL, questions_allocated integer NOT NULL CHECK(questions_allocated BETWEEN 0 AND 15),
  PRIMARY KEY(user_id,practice_date_wat)
);
ALTER TABLE public.attempt_questions ADD COLUMN IF NOT EXISTS snapshot jsonb;
ALTER TABLE public.attempt_questions ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.topics(id);
ALTER TABLE public.attempt_questions ADD COLUMN IF NOT EXISTS correct_option_id uuid;
ALTER TABLE public.attempt_questions ADD COLUMN IF NOT EXISTS frozen_explanation text;
ALTER TABLE public.attempt_answers ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0);
-- Frozen answers validate membership against the snapshot. A mutable option FK would
-- prevent selecting an issued option after the bank was edited.
ALTER TABLE public.attempt_answers DROP CONSTRAINT IF EXISTS attempt_answers_selected_option_id_question_options_id_fk;
-- Retain issued history when administrators retire bank content.
ALTER TABLE public.attempt_questions DROP CONSTRAINT IF EXISTS attempt_questions_question_id_questions_id_fk;
ALTER TABLE public.attempt_questions ADD CONSTRAINT attempt_questions_question_id_questions_id_fk FOREIGN KEY(question_id) REFERENCES public.questions(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS attempt_question_unique_idx ON public.attempt_questions(attempt_id,question_id);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_mock_per_user_idx ON public.attempts(user_id) WHERE mode='mock' AND status='in_progress';
CREATE INDEX IF NOT EXISTS attempts_owner_mode_status_idx ON public.attempts(user_id,mode,status);
CREATE INDEX IF NOT EXISTS questions_published_subject_idx ON public.questions(subject_id,status);
CREATE INDEX IF NOT EXISTS referrals_qualified_idx ON public.referrals(referrer_id,status);
ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_practice_allowances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_idempotency_keys, public.daily_practice_allowances FROM anon,authenticated;
-- Old attempts have no immutable snapshots. They remain history; do not fabricate a frozen
-- snapshot or consume a diagnostic to repair one. Explicit recovery is required before release.
COMMIT;
