-- Migration 0017: Durable School Mock Exams, Strict Lab Window, and Attempt Linkage

CREATE TABLE IF NOT EXISTS "school_mocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"title" text NOT NULL,
	"scheduled_start" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 120 NOT NULL,
	"question_count" integer DEFAULT 180 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL, -- 'scheduled' | 'active' | 'completed' | 'archived'
	"window_buffer_minutes" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_mocks_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
ALTER TABLE "school_mocks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "school_mocks_school_status_idx" ON "school_mocks" USING btree ("school_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "school_mocks_school_created_idx" ON "school_mocks" USING btree ("school_id", "created_at" DESC);
--> statement-breakpoint

-- Add school_mock_id to attempts for direct relational linkage and instant leaderboard queries
ALTER TABLE "attempts" ADD COLUMN IF NOT EXISTS "school_mock_id" uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attempts_school_mock_idx" ON "attempts" USING btree ("school_mock_id");
