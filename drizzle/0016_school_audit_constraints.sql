-- 0016_school_audit_constraints.sql
-- Enforces single-school student enrolment, deduplicates activation jobs per (order_id, student_user_id),
-- and indexes attempt_results by (user_id, created_at) for fast roster and drilldown queries.

-- 1. Deduplicate any legacy duplicate rows before creating unique indexes
DELETE FROM school_students a
USING school_students b
WHERE a.student_user_id = b.student_user_id
  AND a.created_at < b.created_at;

DELETE FROM school_activation_jobs a
USING school_activation_jobs b
WHERE a.order_id = b.order_id
  AND a.student_user_id = b.student_user_id
  AND a.created_at < b.created_at;

-- 2. Unique index ensuring a student belongs to at most one active school at a time (AUD-04)
CREATE UNIQUE INDEX IF NOT EXISTS school_students_student_user_unique_idx
  ON school_students (student_user_id);

-- 3. Unique index preventing duplicate activation jobs for the same order and student (AUD-12)
CREATE UNIQUE INDEX IF NOT EXISTS school_activation_jobs_order_student_idx
  ON school_activation_jobs (order_id, student_user_id);

-- 4. Composite index for fast per-student mock score aggregation and drilldown history (AUD-14)
CREATE INDEX IF NOT EXISTS attempt_results_user_created_idx
  ON attempt_results (user_id, created_at DESC);
