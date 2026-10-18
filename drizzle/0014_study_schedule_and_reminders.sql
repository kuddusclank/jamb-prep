-- 0014_study_schedule_and_reminders.sql
-- Additive schema for Premium Study Schedule, Daily Goals, Streaks, and Web Push Reminders.
-- Access model: All reads and writes go through the privileged Cloudflare Worker API and
-- Scheduler Worker using owner-scoped SQL predicates (WHERE user_id = $userId) and
-- authoritative active Premium entitlement checks (subscription_entitlements.expires_at > now()).
-- Direct PostgREST/Supabase client access is denied via RLS + REVOKE.
--
-- Rollback plan (if ever needed before user data retention is required):
--   1. Disable scheduled dispatch first (set STUDY_REMINDER_DISPATCH_ENABLED=false or disable Cron trigger).
--   2. Preserve earned study_goal_days / study_goal_events / study_streak_summaries history by default.
--   3. Only if explicitly dropping empty pre-launch tables:
--      DROP TABLE IF EXISTS public.study_reminder_deliveries;
--      DROP TABLE IF EXISTS public.study_reminder_occurrences;
--      DROP TABLE IF EXISTS public.web_push_subscriptions;
--      DROP TABLE IF EXISTS public.study_streak_summaries;
--      DROP TABLE IF EXISTS public.study_goal_events;
--      DROP TABLE IF EXISTS public.study_goal_days;
--      DROP TABLE IF EXISTS public.study_schedules;

CREATE TABLE IF NOT EXISTS public.study_schedules (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  goal_type text NOT NULL DEFAULT 'questions',
  daily_goal integer NOT NULL DEFAULT 10,
  pending_daily_goal integer,
  pending_goal_effective_date date,
  reminder_enabled boolean NOT NULL DEFAULT false,
  reminder_local_time text NOT NULL DEFAULT '19:00',
  time_zone text NOT NULL DEFAULT 'Africa/Lagos',
  pending_time_zone text,
  pending_time_zone_effective_date date,
  policy_version integer NOT NULL DEFAULT 1,
  revision integer NOT NULL DEFAULT 1,
  next_reminder_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT study_schedules_goal_type_check CHECK (goal_type = 'questions'),
  CONSTRAINT study_schedules_daily_goal_range_check CHECK (daily_goal >= 1 AND daily_goal <= 60),
  CONSTRAINT study_schedules_pending_goal_range_check CHECK (
    pending_daily_goal IS NULL OR (pending_daily_goal >= 1 AND pending_daily_goal <= 60)
  ),
  CONSTRAINT study_schedules_reminder_local_time_format_check CHECK (
    reminder_local_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  ),
  CONSTRAINT study_schedules_revision_positive_check CHECK (revision >= 1)
);

CREATE INDEX IF NOT EXISTS study_schedules_due_idx
  ON public.study_schedules (enabled, reminder_enabled, next_reminder_at);

ALTER TABLE public.study_schedules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.study_schedules FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.study_goal_days (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  target_questions integer NOT NULL,
  time_zone text NOT NULL,
  policy_version integer NOT NULL DEFAULT 1,
  accepted_count integer NOT NULL DEFAULT 0,
  qualified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, local_date),
  CONSTRAINT study_goal_days_target_range_check CHECK (target_questions >= 1 AND target_questions <= 60),
  CONSTRAINT study_goal_days_accepted_non_negative_check CHECK (accepted_count >= 0)
);

CREATE INDEX IF NOT EXISTS study_goal_days_user_qualified_idx
  ON public.study_goal_days (user_id, qualified_at, local_date);

ALTER TABLE public.study_goal_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.study_goal_days FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.study_goal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  attempt_id uuid NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  mode public.attempt_mode NOT NULL,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  policy_version integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS study_goal_events_user_question_date_key
  ON public.study_goal_events (user_id, question_id, local_date);

CREATE INDEX IF NOT EXISTS study_goal_events_user_date_idx
  ON public.study_goal_events (user_id, local_date);

ALTER TABLE public.study_goal_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.study_goal_events FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.study_streak_summaries (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_qualified_date date,
  revision integer NOT NULL DEFAULT 1,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT study_streak_summaries_non_negative_check CHECK (current_streak >= 0 AND best_streak >= 0)
);

ALTER TABLE public.study_streak_summaries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.study_streak_summaries FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint_hash text NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth_secret text NOT NULL,
  vapid_version integer NOT NULL DEFAULT 1,
  device_label text NOT NULL DEFAULT 'Study device',
  environment text NOT NULL DEFAULT 'browser',
  enabled boolean NOT NULL DEFAULT true,
  disabled_reason text,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  last_test_sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT web_push_subscriptions_device_label_length_check CHECK (
    char_length(btrim(device_label)) BETWEEN 1 AND 80
  ),
  CONSTRAINT web_push_subscriptions_environment_check CHECK (
    environment IN ('browser', 'standalone_pwa', 'ios_home_screen_pwa', 'android_pwa')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS web_push_subscriptions_endpoint_hash_key
  ON public.web_push_subscriptions (endpoint_hash);

CREATE INDEX IF NOT EXISTS web_push_subscriptions_user_enabled_idx
  ON public.web_push_subscriptions (user_id, enabled);

ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.web_push_subscriptions FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.study_reminder_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  reminder_slot text NOT NULL DEFAULT 'daily',
  schedule_revision integer NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  state text NOT NULL DEFAULT 'claimed',
  lease_owner text,
  leased_until timestamp with time zone,
  retry_count integer NOT NULL DEFAULT 0,
  next_retry_at timestamp with time zone,
  skip_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT study_reminder_occurrences_state_check CHECK (
    state IN ('claimed', 'sending', 'provider_accepted', 'skipped', 'expired', 'failed')
  ),
  CONSTRAINT study_reminder_occurrences_retry_non_negative_check CHECK (retry_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS study_reminder_occurrences_unique_slot_key
  ON public.study_reminder_occurrences (user_id, local_date, reminder_slot, schedule_revision);

CREATE INDEX IF NOT EXISTS study_reminder_occurrences_state_lease_idx
  ON public.study_reminder_occurrences (state, leased_until, next_retry_at);

ALTER TABLE public.study_reminder_occurrences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.study_reminder_occurrences FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.study_reminder_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.study_reminder_occurrences(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.web_push_subscriptions(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'queued',
  provider_status integer,
  error_code text,
  retry_count integer NOT NULL DEFAULT 0,
  next_retry_at timestamp with time zone,
  accepted_at timestamp with time zone,
  last_attempt_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT study_reminder_deliveries_state_check CHECK (
    state IN ('queued', 'sending', 'provider_accepted', 'retry_scheduled', 'subscription_gone', 'failed', 'skipped')
  ),
  CONSTRAINT study_reminder_deliveries_retry_non_negative_check CHECK (retry_count >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS study_reminder_deliveries_occurrence_sub_key
  ON public.study_reminder_deliveries (occurrence_id, subscription_id);

ALTER TABLE public.study_reminder_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.study_reminder_deliveries FROM PUBLIC, anon, authenticated;
