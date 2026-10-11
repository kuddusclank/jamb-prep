ALTER TABLE "attempt_answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attempt_interruptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attempt_questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attempt_results" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "passages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "question_explanations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "question_options" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "referral_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "referral_rewards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "student_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "student_subjects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "student_topic_mastery" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subjects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscription_discounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscription_entitlements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "topics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subscription_entitlements" ADD COLUMN IF NOT EXISTS "auto_renew" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_entitlements" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_entitlements" ADD COLUMN IF NOT EXISTS "paystack_subscription_code" text;--> statement-breakpoint
ALTER TABLE "subscription_entitlements" ADD COLUMN IF NOT EXISTS "paystack_email_token" text;--> statement-breakpoint
ALTER TABLE "subscription_entitlements" ADD COLUMN IF NOT EXISTS "paystack_authorization_code" text;--> statement-breakpoint
ALTER TABLE "subscription_entitlements" ADD COLUMN IF NOT EXISTS "paystack_customer_code" text;--> statement-breakpoint
REVOKE ALL ON TABLE "attempt_answers", "attempt_interruptions", "attempt_questions", "attempt_results", "attempts", "passages", "payment_transactions", "payment_webhook_events", "profiles", "question_explanations", "question_options", "questions", "referral_codes", "referral_rewards", "referrals", "student_preferences", "student_subjects", "student_topic_mastery", "subjects", "subscription_discounts", "subscription_entitlements", "topics" FROM anon, authenticated;
