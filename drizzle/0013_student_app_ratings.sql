BEGIN;
CREATE TABLE IF NOT EXISTS student_app_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL UNIQUE REFERENCES attempts(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR length(comment) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_app_ratings_created_idx ON student_app_ratings(created_at DESC, id DESC);
ALTER TABLE student_app_ratings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON student_app_ratings FROM PUBLIC, anon, authenticated;
COMMIT;
