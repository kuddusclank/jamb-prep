# Backend Schema & Data Architecture
# JAMBPrep — Database Schema, Drizzle Models, RLS Policies & API Contracts

**Document Version:** 1.0.0  
**Status:** Approved Specification  
**Database:** PostgreSQL (Supabase Hosted)  
**ORM:** Drizzle ORM (`drizzle-orm` + `pg-core`)  

---

## 1. Relational Database Schema Overview

```
                            ┌───────────────────┐
                            │     profiles      │
                            └─────────┬─────────┘
                                      │ 1:1
                            ┌─────────▼─────────┐
                            │student_preferences│
                            └───────────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
         ┌───────────────────┐                 ┌───────────────────┐
         │ student_subjects  │                 │    attempts       │
         └─────────┬─────────┘                 └─────────┬─────────┘
                   │                                     │ 1:N
                   ▼                                     ▼
         ┌───────────────────┐                 ┌───────────────────┐
         │     subjects      │                 │ attempt_questions │ (Frozen Set)
         └─────────┬─────────┘                 └─────────┬─────────┘
                   │ 1:N                                 │
                   ▼                                     ▼
         ┌───────────────────┐                 ┌───────────────────┐
         │      topics       │                 │  attempt_answers  │
         └─────────┬─────────┘                 └───────────────────┘
                   │ 1:N                                 │
                   ▼                                     ▼
         ┌───────────────────┐                 ┌───────────────────┐
         │     questions     │                 │  attempt_results  │
         └─────────┬─────────┘                 └───────────────────┘
                   │ 1:N
        ┌──────────┴──────────┐
        ▼                     ▼
┌───────────────┐     ┌───────────────┐
│question_option│     │  explanation  │
└───────────────┘     └───────────────┘
```

---

## 2. Drizzle ORM Schema Definitions (TypeScript)

### 2.1 Users, Preferences & Enums
```typescript
import { 
  pgTable, uuid, text, timestamp, boolean, integer, 
  pgEnum, jsonb, index, uniqueIndex, foreignKey 
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['student', 'admin', 'reviewer']);
export const questionStatusEnum = pgEnum('question_status', ['draft', 'reviewed', 'published']);
export const difficultyEnum = pgEnum('difficulty_level', ['easy', 'medium', 'hard']);
export const attemptModeEnum = pgEnum('attempt_mode', ['practice', 'mock']);
export const attemptStatusEnum = pgEnum('attempt_status', ['in_progress', 'completed', 'abandoned', 'expired']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'success', 'failed']);

// User Profile (linked to Supabase auth.users)
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // maps to auth.users.id
  displayName: text('display_name').notNull(),
  email: text('email').notNull().unique(),
  role: userRoleEnum('role').default('student').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Student Study Preferences
export const studentPreferences = pgTable('student_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull().unique(),
  targetScore: integer('target_score').default(250).notNull(),
  examYear: integer('exam_year').default(2026).notNull(),
  targetInstitution: text('target_institution'),
  targetCourse: text('target_course'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### 2.2 Academic Hierarchy & Questions
```typescript
// Subjects (English, Math, Physics, etc.)
export const subjects = pgTable('subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(), // e.g., 'ENG', 'MTH', 'PHY'
  name: text('name').notNull(),
  isCompulsory: boolean('is_compulsory').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
});

// Student's 4 Enrolled Subjects
export const studentSubjects = pgTable('student_subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  uniqueIndex('user_subject_unique_idx').on(table.userId, table.subjectId)
]);

// Topics within a Subject
export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
}, (table) => [
  index('topic_subject_idx').on(table.subjectId)
]);

// Shared Reading Passages (Comprehension / Literature)
export const passages = pgTable('passages', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').references(() => subjects.id).notNull(),
  title: text('title'),
  content: text('content').notNull(), // Markdown text
  source: text('source'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Question Bank
export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').references(() => subjects.id).notNull(),
  topicId: uuid('topic_id').references(() => topics.id).notNull(),
  passageId: uuid('passage_id').references(() => passages.id),
  stem: text('stem').notNull(), // Question text with LaTeX
  imageUrl: text('image_url'), // Diagram URL
  difficulty: difficultyEnum('difficulty').default('medium').notNull(),
  examYear: integer('exam_year'), // e.g., 2023
  status: questionStatusEnum('status').default('draft').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('question_subject_topic_idx').on(table.subjectId, table.topicId),
  index('question_status_idx').on(table.status)
]);

// Question Options (A, B, C, D)
export const questionOptions = pgTable('question_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  label: text('label').notNull(), // 'A', 'B', 'C', 'D'
  content: text('content').notNull(), // Option text with LaTeX
  isCorrect: boolean('is_correct').notNull(), // Privileged field!
}, (table) => [
  index('option_question_idx').on(table.questionId)
]);

// Step-by-Step Explanations
export const questionExplanations = pgTable('question_explanations', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull().unique(),
  explanation: text('explanation').notNull(), // Markdown + LaTeX
  verifiedBy: uuid('verified_by').references(() => profiles.id),
});
```

### 2.3 Exam Engine & Results
```typescript
// Active & Completed Exam Attempts
export const attempts = pgTable('attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  mode: attemptModeEnum('mode').notNull(), // 'practice' or 'mock'
  status: attemptStatusEnum('status').default('in_progress').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // Authoritative expiry
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  index('attempt_user_idx').on(table.userId),
  index('attempt_status_idx').on(table.status)
]);

// Frozen Question Order for an Attempt
export const attemptQuestions = pgTable('attempt_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  attemptId: uuid('attempt_id').references(() => attempts.id, { onDelete: 'cascade' }).notNull(),
  questionId: uuid('question_id').references(() => questions.id).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id).notNull(),
  position: integer('position').notNull(), // 1 to 180
  isFlagged: boolean('is_flagged').default(false).notNull(),
}, (table) => [
  uniqueIndex('attempt_position_unique_idx').on(table.attemptId, table.position),
  index('attempt_questions_attempt_idx').on(table.attemptId)
]);

// Student Selected Answers
export const attemptAnswers = pgTable('attempt_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  attemptId: uuid('attempt_id').references(() => attempts.id, { onDelete: 'cascade' }).notNull(),
  questionId: uuid('question_id').references(() => questions.id).notNull(),
  selectedOptionId: uuid('selected_option_id').references(() => questionOptions.id),
  answeredAt: timestamp('answered_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('attempt_question_answer_unique_idx').on(table.attemptId, table.questionId)
]);

// Graded Attempt Results (Immutable final scores)
export const attemptResults = pgTable('attempt_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  attemptId: uuid('attempt_id').references(() => attempts.id, { onDelete: 'cascade' }).notNull().unique(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  totalScore: integer('total_score').notNull(), // Out of 400
  englishScore: integer('english_score').notNull(), // Scaled to 100
  subject2Score: integer('subject2_score').notNull(),
  subject3Score: integer('subject3_score').notNull(),
  subject4Score: integer('subject4_score').notNull(),
  totalAnswered: integer('total_answered').notNull(),
  totalCorrect: integer('total_correct').notNull(),
  timeSpentSeconds: integer('time_spent_seconds').notNull(),
  topicBreakdown: jsonb('topic_breakdown').notNull(), // Accuracy by topic
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### 2.4 Payments & Entitlements
```typescript
// Subscriptions & Entitlements
export const subscriptionEntitlements = pgTable('subscription_entitlements', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  planCode: text('plan_code').default('MONTHLY_1000').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Paystack Payment Transactions
export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id).notNull(),
  reference: text('reference').notNull().unique(),
  amountKobo: integer('amount_kobo').notNull(), // 100000 = ₦1,000
  status: paymentStatusEnum('status').default('pending').notNull(),
  channel: text('channel'), // 'card', 'bank_transfer', 'ussd'
  paystackPayload: jsonb('paystack_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Webhook Deduplication Log
export const paymentWebhookEvents = pgTable('payment_webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: text('event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### 2.5 Referral Program & Discounts ("Invite 2, Get 50% Off")
```typescript
export const referralStatusEnum = pgEnum('referral_status', ['pending', 'qualified']);
export const rewardStatusEnum = pgEnum('reward_status', ['available', 'redeemed', 'expired']);

// Unique Referral Code per Candidate
export const referralCodes = pgTable('referral_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull().unique(),
  code: text('code').notNull().unique(), // e.g. 'TOBI99'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Attributed Referrals
export const referrals = pgTable('referrals', {
  id: uuid('id').defaultRandom().primaryKey(),
  referrerId: uuid('referrer_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  referredUserId: uuid('referred_user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull().unique(),
  status: referralStatusEnum('status').default('pending').notNull(),
  qualifiedAt: timestamp('qualified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('referral_referrer_idx').on(table.referrerId)
]);

// Referral Rewards (One-time 50% discount voucher for 1st month)
export const referralRewards = pgTable('referral_rewards', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  rewardType: text('reward_type').default('FIRST_MONTH_50_PERCENT').notNull(),
  status: rewardStatusEnum('status').default('available').notNull(),
  redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('reward_user_status_idx').on(table.userId, table.status)
]);

// Applied Subscription Discounts Audit
export const subscriptionDiscounts = pgTable('subscription_discounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id).notNull(),
  rewardId: uuid('reward_id').references(() => referralRewards.id).notNull(),
  transactionId: uuid('transaction_id').references(() => paymentTransactions.id).notNull(),
  originalAmountKobo: integer('original_amount_kobo').notNull(), // 100000 (₦1,000)
  discountedAmountKobo: integer('discounted_amount_kobo').notNull(), // 50000 (₦500)
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
});
```

---

## 3. Row-Level Security (RLS) Policy Blueprint

| Table | Operations | Target Role | Policy Condition (`USING` / `WITH CHECK`) |
| :--- | :--- | :--- | :--- |
| `profiles` | `SELECT` | Authenticated | `auth.uid() = id` (or admin) |
| `student_preferences` | `ALL` | Authenticated | `auth.uid() = user_id` |
| `subjects` | `SELECT` | Public / All | `is_active = true` |
| `topics` | `SELECT` | Public / All | `true` |
| `questions` | `SELECT` | Authenticated | `status = 'published'` |
| `question_options` | `SELECT` | Authenticated | `EXISTS(SELECT 1 FROM questions q WHERE q.id = question_id AND q.status = 'published')` *(Note: is_correct is masked during active exam!)* |
| `attempts` | `SELECT`, `UPDATE` | Authenticated | `auth.uid() = user_id` |
| `attempt_answers` | `INSERT`, `UPDATE` | Authenticated | `EXISTS(SELECT 1 FROM attempts a WHERE a.id = attempt_id AND a.user_id = auth.uid() AND a.status = 'in_progress')` |
| `attempt_results` | `SELECT` | Authenticated | `auth.uid() = user_id` |
| `subscription_entitlements` | `SELECT` | Authenticated | `auth.uid() = user_id` |

---

## 4. Key API Contracts (Zod Schemas)

### 4.1 Exam Start (`POST /api/exam/start`)
```typescript
export const startExamSchema = z.object({
  mode: z.enum(['practice', 'mock']),
  subjectIds: z.array(z.string().uuid()).length(4), // 1 English + 3 Electives
});

export type StartExamResponse = {
  attemptId: string;
  startedAt: string;
  expiresAt: string;
  durationSeconds: number; // 7200 for mock
  subjects: Array<{
    id: string;
    code: string;
    name: string;
    questionCount: number;
  }>;
  questions: Array<{
    id: string;
    subjectId: string;
    position: number;
    stem: string;
    imageUrl?: string | null;
    passage?: { title?: string; content: string } | null;
    options: Array<{ id: string; label: string; content: string }>;
  }>;
};
```

### 4.2 Answer Autosave (`POST /api/exam/answers`)
```typescript
export const saveAnswerSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    selectedOptionId: z.string().uuid().nullable(),
    isFlagged: z.boolean().optional(),
  })),
});
```

### 4.3 Bulk Question CSV/JSON Import (`POST /api/admin/questions/import`)
```typescript
export const bulkQuestionItemSchema = z.object({
  subjectCode: z.enum(['ENG', 'MTH', 'PHY', 'CHM', 'BIO', 'ECN', 'GOV', 'LIT']),
  topicTitle: z.string().min(2),
  stem: z.string().min(5),
  imageUrl: z.string().url().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  examYear: z.number().int().min(2000).max(2026).optional(),
  options: z.object({
    A: z.string().min(1),
    B: z.string().min(1),
    C: z.string().min(1),
    D: z.string().min(1),
  }),
  correctOption: z.enum(['A', 'B', 'C', 'D']),
  explanation: z.string().min(5),
  passageTitle: z.string().optional(),
  passageContent: z.string().optional(),
});

export const bulkImportPayloadSchema = z.array(bulkQuestionItemSchema);
```

---

## 5. Live Database Deployment & Table Catalog

The production schema is actively deployed to the dedicated Supabase instance (`bqumnaoiiukifvanoonm`):

### 5.1 Active Table Catalog (20 Tables)

| # | Table Name | Purpose / Domain | Key Constraints |
|---|:---|:---|:---|
| 1 | `profiles` | User account identity | PK UUID -> `auth.users.id`, email unique |
| 2 | `student_preferences` | Target scores & exam year | FK `user_id` -> `profiles.id` (1:1 cascade) |
| 3 | `subjects` | UTME subject catalog (15 seeded) | Code unique, `is_compulsory` boolean |
| 4 | `student_subjects` | Candidate subject combinations | Unique `(user_id, subject_id)` |
| 5 | `topics` | Topic curriculum hierarchy | FK `subject_id` -> `subjects.id` |
| 6 | `passages` | Reading comprehension passages | FK `subject_id` -> `subjects.id` |
| 7 | `questions` | Question stems & metadata | FK `subject_id`, `topic_id`, `passage_id` |
| 8 | `question_options` | Multiple choice options (A–D) | FK `question_id`, `is_correct` boolean |
| 9 | `question_explanations`| Diagnostic solutions | FK `question_id` (1:1) |
| 10 | `attempts` | Exam sessions (180 questions, 120m)| FK `user_id`, status enum, start/expiry timers |
| 11 | `attempt_questions` | Frozen question sequence | FK `attempt_id`, `question_id`, sequence index |
| 12 | `attempt_answers` | Student response ledger | FK `attempt_id`, `question_id`, selected option |
| 13 | `attempt_results` | Official scaled scores (400 pts) | FK `attempt_id`, total score, subject breakdown |
| 14 | `subscription_entitlements` | Paid access valid dates | FK `user_id`, `expires_at`, status |
| 15 | `payment_transactions` | Paystack payment audit records | FK `user_id`, reference unique, amount, status |
| 16 | `payment_webhook_events` | Webhook idempotency ledger | Paystack event ID unique, HMAC verified |
| 17 | `referral_codes` | Viral invitation links | FK `user_id`, unique 8-char code |
| 18 | `referrals` | Referral relationship tracking | FK `referrer_id`, `referred_user_id` |
| 19 | `referral_rewards` | Unlocked 50% vouchers | FK `user_id`, status (available/redeemed) |
| 20 | `subscription_discounts` | Applied checkout discounts | FK `transaction_id`, discount amount (₦500) |

### 5.2 Live Credentials & Connection Strings

* **Project Reference**: `bqumnaoiiukifvanoonm`
* **Host (IPv4 Session Pooler)**: `aws-0-eu-west-1.pooler.supabase.com:5432`
* **Direct URI (IPv6)**: `db.bqumnaoiiukifvanoonm.supabase.co:5432`
* **Master User**: `postgres.bqumnaoiiukifvanoonm`
* **Master Password**: `xuhsuc-0wavno-kygDyg`
* **Connection String (Drizzle / Migrations)**:
  `postgresql://postgres.bqumnaoiiukifvanoonm:xuhsuc-0wavno-kygDyg@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`
