-- READ ONLY. Run against an authorized staging clone, then production before cutover.
-- No row contents, credentials, tokens, SQL function bodies or student identities are emitted.
BEGIN READ ONLY;
SELECT version() AS postgres_version;
SELECT migration_schema.table_schema, migration_schema.table_name
FROM information_schema.tables migration_schema
WHERE table_name='__drizzle_migrations';
WITH expected(table_name,column_name) AS (VALUES
 ('attempt_questions','snapshot'),('attempt_questions','correct_option_id'),('attempt_questions','topic_id'),('attempt_questions','frozen_explanation'),
 ('attempt_answers','revision'),('attempt_answers','answered_at'),
 ('attempt_results','subject2_score'),('attempt_results','subject3_score'),('attempt_results','subject4_score'),('attempt_results','topic_breakdown'),
 ('subscription_entitlements','auto_renew'),('subscription_entitlements','paystack_subscription_code'),('subscription_entitlements','paystack_email_token'),
 ('api_idempotency_keys','request_hash'),('api_idempotency_keys','response_body'),('api_idempotency_keys','expires_at'),
 ('daily_practice_allowances','practice_date_wat'),('payment_checkout_requests','authorization_url'),('payment_renewal_requests','authorization_code')
) SELECT expected.* FROM expected LEFT JOIN information_schema.columns c
 ON c.table_schema='public' AND c.table_name=expected.table_name AND c.column_name=expected.column_name WHERE c.column_name IS NULL;
-- Every application table must have RLS and no browser-role table privileges.
SELECT c.relname, c.relrowsecurity,
 has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS anon_access,
 has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') AS authenticated_access
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname;
-- A SECURITY DEFINER RPC can bypass table lockdown; audit every returned function.
SELECT n.nspname,p.proname,p.oid::regprocedure AS signature,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prosecdef;
SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('attempt_answers','attempt_questions','attempt_results','student_topic_mastery','subscription_discounts','api_idempotency_keys','daily_practice_allowances');
SELECT COUNT(*) AS duplicate_answer_groups FROM (SELECT attempt_id,question_id FROM attempt_answers GROUP BY attempt_id,question_id HAVING COUNT(*)>1) x;
SELECT COUNT(*) AS duplicate_issued_question_groups FROM (SELECT attempt_id,question_id FROM attempt_questions GROUP BY attempt_id,question_id HAVING COUNT(*)>1) x;
SELECT COUNT(*) AS duplicate_discount_transactions FROM (SELECT transaction_id FROM subscription_discounts GROUP BY transaction_id HAVING COUNT(*)>1) x;
SELECT COUNT(*) AS concurrent_active_mock_users FROM (SELECT user_id FROM attempts WHERE mode='mock' AND status='in_progress' GROUP BY user_id HAVING COUNT(*)>1) x;
-- Before applying snapshot columns, inspect this query only after the prerequisite exists.
-- Never fabricate snapshots or automatically reset historical/free diagnostic usage.
SELECT mode,status,COUNT(*) FROM attempts GROUP BY mode,status;
SELECT s.code,COUNT(q.id) FILTER (WHERE q.status='published') AS published,
 COUNT(q.id) FILTER (WHERE q.status='published' AND quality.n=4 AND quality.correct=1 AND quality.labels=4 AND quality.valid) AS complete
FROM subjects s LEFT JOIN questions q ON q.subject_id=s.id
LEFT JOIN LATERAL (SELECT COUNT(*) AS n,COUNT(*) FILTER(WHERE is_correct) AS correct,COUNT(DISTINCT label) AS labels,BOOL_AND(label IN ('A','B','C','D')) AS valid FROM question_options WHERE question_id=q.id) quality ON TRUE
GROUP BY s.code ORDER BY s.code;
ROLLBACK;
