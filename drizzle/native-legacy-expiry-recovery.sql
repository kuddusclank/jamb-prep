-- Reviewed recovery candidate; run only after verified backup and baseline review.
-- Preserve question/answer history and free-diagnostic usage. Never fabricate scores/snapshots.
BEGIN;
UPDATE public.attempts a SET status='expired'
WHERE a.mode='mock' AND a.status='in_progress' AND a.expires_at < now()
AND EXISTS (SELECT 1 FROM public.attempt_questions aq WHERE aq.attempt_id=a.id AND aq.snapshot IS NULL);
COMMIT;
