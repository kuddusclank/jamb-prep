CREATE TABLE "attempt_interruptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"attempt_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "student_topic_mastery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"total_attempted" integer DEFAULT 0 NOT NULL,
	"total_correct" integer DEFAULT 0 NOT NULL,
	"accuracy_percent" integer DEFAULT 0 NOT NULL,
	"last_practiced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "exam_conditions" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "attempt_interruptions" ADD CONSTRAINT "attempt_interruptions_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_topic_mastery" ADD CONSTRAINT "student_topic_mastery_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_topic_mastery" ADD CONSTRAINT "student_topic_mastery_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_topic_mastery" ADD CONSTRAINT "student_topic_mastery_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interruption_attempt_idx" ON "attempt_interruptions" USING btree ("attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_topic_mastery_unique_idx" ON "student_topic_mastery" USING btree ("user_id","topic_id");--> statement-breakpoint
CREATE INDEX "user_mastery_accuracy_idx" ON "student_topic_mastery" USING btree ("user_id","accuracy_percent");--> statement-breakpoint
CREATE INDEX "user_subject_mastery_idx" ON "student_topic_mastery" USING btree ("user_id","subject_id");
--> statement-breakpoint
ALTER TABLE "attempt_interruptions" ENABLE ROW LEVEL SECURITY;
