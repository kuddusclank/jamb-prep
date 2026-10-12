BEGIN;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS editorial_revision integer NOT NULL DEFAULT 1;
COMMIT;
