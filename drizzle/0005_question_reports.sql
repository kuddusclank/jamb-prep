-- Add archived status to question_status enum if not already present
-- Create report_status enum and question_reports table with RLS
BEGIN;

DO $$ BEGIN
  ALTER TYPE public.question_status ADD VALUE IF NOT EXISTS 'archived';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.report_status AS ENUM ('open', 'investigating', 'resolved', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.question_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  reporter_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.attempts(id) ON DELETE SET NULL,
  reason text NOT NULL,
  comment text,
  status public.report_status NOT NULL DEFAULT 'open',
  admin_notes text,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_question_idx ON public.question_reports(question_id);
CREATE INDEX IF NOT EXISTS report_status_idx ON public.question_reports(status);
CREATE INDEX IF NOT EXISTS report_reporter_idx ON public.question_reports(reporter_user_id);

ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;

-- Students can insert their own reports
CREATE POLICY "Students can submit question reports"
  ON public.question_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id);

-- Students can read their own reports
CREATE POLICY "Students can view their submitted reports"
  ON public.question_reports FOR SELECT
  USING (auth.uid() = reporter_user_id);

-- Admins have full access
CREATE POLICY "Admins have full access to question reports"
  ON public.question_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

COMMIT;
