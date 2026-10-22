-- Migration 0015: School Partnerships, Tenant Roster, and Cohort Activation

ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'school_admin';
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"code" text NOT NULL,
	"type" text DEFAULT 'secondary_school' NOT NULL,
	"state" text NOT NULL,
	"admin_id" uuid NOT NULL,
	"contact_phone" text,
	"contact_email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schools_admin_id_profiles_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
ALTER TABLE "schools" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "schools_slug_idx" ON "schools" USING btree ("slug");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "schools_code_idx" ON "schools" USING btree ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schools_state_idx" ON "schools" USING btree ("state");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "school_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_members_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "school_members_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
ALTER TABLE "school_members" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "school_members_unique_user_idx" ON "school_members" USING btree ("school_id","user_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "school_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"student_identifier" text,
	"ingestion_method" text DEFAULT 'manual' NOT NULL,
	"license_status" text DEFAULT 'inactive' NOT NULL,
	"license_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "school_students_student_user_id_profiles_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
ALTER TABLE "school_students" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "school_students_unique_user_idx" ON "school_students" USING btree ("school_id","student_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "school_students_school_license_idx" ON "school_students" USING btree ("school_id","license_status");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "school_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"reference" text NOT NULL,
	"student_count" integer NOT NULL,
	"duration_months" integer NOT NULL,
	"rate_per_student_kobo" integer DEFAULT 150000 NOT NULL,
	"total_amount_kobo" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paystack_payload" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone,
	CONSTRAINT "school_orders_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
ALTER TABLE "school_orders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "school_orders_reference_idx" ON "school_orders" USING btree ("reference");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "school_orders_school_idx" ON "school_orders" USING btree ("school_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "school_activation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"student_user_id" uuid NOT NULL,
	"duration_months" integer NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_activation_jobs_order_id_school_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."school_orders"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "school_activation_jobs_student_user_id_profiles_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
ALTER TABLE "school_activation_jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "school_activation_jobs_order_idx" ON "school_activation_jobs" USING btree ("order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "school_activation_jobs_status_idx" ON "school_activation_jobs" USING btree ("status");
