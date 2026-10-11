import {
  pgTable, uuid, text, timestamp, boolean, integer,
  pgEnum, jsonb, index, uniqueIndex, date, primaryKey
} from 'drizzle-orm/pg-core';

// ==========================================
// Enums
// ==========================================
export const userRoleEnum = pgEnum('user_role', ['student', 'admin', 'reviewer']);
export const questionStatusEnum = pgEnum('question_status', ['draft', 'reviewed', 'published']);
export const difficultyEnum = pgEnum('difficulty_level', ['easy', 'medium', 'hard']);
export const attemptModeEnum = pgEnum('attempt_mode', ['practice', 'mock']);
export const attemptStatusEnum = pgEnum('attempt_status', ['in_progress', 'completed', 'abandoned', 'expired']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'success', 'failed']);
export const referralStatusEnum = pgEnum('referral_status', ['pending', 'qualified']);
export const rewardStatusEnum = pgEnum('reward_status', ['available', 'redeemed', 'expired']);

// ==========================================
// 1. User Profiles & Academic Preferences
// ==========================================
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // References Supabase auth.users.id
  displayName: text('display_name').notNull(),
  email: text('email').notNull().unique(),
  role: userRoleEnum('role').default('student').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const studentPreferences = pgTable('student_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull().unique(),
  targetScore: integer('target_score').default(250).notNull(),
  examYear: integer('exam_year').default(2026).notNull(),
  targetInstitution: text('target_institution'),
  targetCourse: text('target_course'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

// ==========================================
// 2. Academic Curriculum Hierarchy
// ==========================================
export const subjects = pgTable('subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(), // e.g. 'ENG', 'MTH', 'PHY', 'CHM', 'BIO', 'ECN', 'GOV', 'LIT'
  name: text('name').notNull(),
  isCompulsory: boolean('is_compulsory').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
}).enableRLS();

export const studentSubjects = pgTable('student_subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  uniqueIndex('user_subject_unique_idx').on(table.userId, table.subjectId)
]).enableRLS();

export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
}, (table) => [
  index('topic_subject_idx').on(table.subjectId)
]).enableRLS();

export const passages = pgTable('passages', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  title: text('title'),
  content: text('content').notNull(),
  source: text('source'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

// ==========================================
// 3. Question Bank & Solutions
// ==========================================
export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'cascade' }).notNull(),
  passageId: uuid('passage_id').references(() => passages.id, { onDelete: 'set null' }),
  stem: text('stem').notNull(), // Question text with LaTeX
  imageUrl: text('image_url'),
  difficulty: difficultyEnum('difficulty').default('medium').notNull(),
  examYear: integer('exam_year'),
  status: questionStatusEnum('status').default('draft').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('question_subject_topic_idx').on(table.subjectId, table.topicId),
  index('question_status_idx').on(table.status)
]).enableRLS();

export const questionOptions = pgTable('question_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  label: text('label').notNull(), // 'A', 'B', 'C', 'D'
  content: text('content').notNull(), // Option text with LaTeX
  isCorrect: boolean('is_correct').notNull(), // Privileged field!
}, (table) => [
  index('option_question_idx').on(table.questionId)
]).enableRLS();

export const questionExplanations = pgTable('question_explanations', {
  id: uuid('id').defaultRandom().primaryKey(),
  questionId: uuid('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull().unique(),
  explanation: text('explanation').notNull(), // Markdown + LaTeX
  verifiedBy: uuid('verified_by').references(() => profiles.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

// ==========================================
// 4. CBT Exam Simulation & Practice Engine
// ==========================================
export const attempts = pgTable('attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  examConditions: boolean('exam_conditions').default(false).notNull(),
  mode: attemptModeEnum('mode').notNull(), // 'practice' or 'mock'
  status: attemptStatusEnum('status').default('in_progress').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  index('attempt_user_idx').on(table.userId),
  index('attempt_status_idx').on(table.status)
]).enableRLS();

export const attemptQuestions = pgTable('attempt_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  attemptId: uuid('attempt_id').references(() => attempts.id, { onDelete: 'cascade' }).notNull(),
  questionId: uuid('question_id').references(() => questions.id, { onDelete: 'restrict' }).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  position: integer('position').notNull(), // 1 to 180
  isFlagged: boolean('is_flagged').default(false).notNull(),
  snapshot: jsonb('snapshot'),
  topicId: uuid('topic_id').references(() => topics.id),
  correctOptionId: uuid('correct_option_id'),
  frozenExplanation: text('frozen_explanation'),
}, (table) => [
  uniqueIndex('attempt_position_unique_idx').on(table.attemptId, table.position),
  index('attempt_questions_attempt_idx').on(table.attemptId)
]).enableRLS();

export const attemptAnswers = pgTable('attempt_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  attemptId: uuid('attempt_id').references(() => attempts.id, { onDelete: 'cascade' }).notNull(),
  questionId: uuid('question_id').references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  selectedOptionId: uuid('selected_option_id').references(() => questionOptions.id, { onDelete: 'set null' }),
  revision: integer('revision').default(0).notNull(),
  answeredAt: timestamp('answered_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('attempt_question_answer_unique_idx').on(table.attemptId, table.questionId)
]).enableRLS();

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
  topicBreakdown: jsonb('topic_breakdown').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

// ==========================================
// 5. Payments, Subscriptions & Entitlements
// ==========================================
export const subscriptionEntitlements = pgTable('subscription_entitlements', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  planCode: text('plan_code').default('MONTHLY_1000').notNull(),
  autoRenew: boolean('auto_renew').default(true).notNull(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  paystackSubscriptionCode: text('paystack_subscription_code'),
  paystackEmailToken: text('paystack_email_token'),
  paystackAuthorizationCode: text('paystack_authorization_code'),
  paystackCustomerCode: text('paystack_customer_code'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  reference: text('reference').notNull().unique(),
  amountKobo: integer('amount_kobo').notNull(), // 100000 = ₦1,000; 50000 = ₦500
  status: paymentStatusEnum('status').default('pending').notNull(),
  channel: text('channel'),
  paystackPayload: jsonb('paystack_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const paymentWebhookEvents = pgTable('payment_webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: text('event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

// ==========================================
// 6. Refer-and-Earn Viral Acquisition Engine
// ==========================================
export const referralCodes = pgTable('referral_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull().unique(),
  code: text('code').notNull().unique(), // e.g. 'TOBI99'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const referrals = pgTable('referrals', {
  id: uuid('id').defaultRandom().primaryKey(),
  referrerId: uuid('referrer_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  referredUserId: uuid('referred_user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull().unique(),
  status: referralStatusEnum('status').default('pending').notNull(),
  qualifiedAt: timestamp('qualified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('referral_referrer_idx').on(table.referrerId)
]).enableRLS();

export const referralRewards = pgTable('referral_rewards', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  rewardType: text('reward_type').default('FIRST_MONTH_50_PERCENT').notNull(),
  status: rewardStatusEnum('status').default('available').notNull(),
  redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('reward_user_status_idx').on(table.userId, table.status)
]).enableRLS();

export const subscriptionDiscounts = pgTable('subscription_discounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  rewardId: uuid('reward_id').references(() => referralRewards.id).notNull(),
  transactionId: uuid('transaction_id').references(() => paymentTransactions.id).notNull(),
  originalAmountKobo: integer('original_amount_kobo').notNull(), // 100000 = ₦1,000
  discountedAmountKobo: integer('discounted_amount_kobo').notNull(), // 50000 = ₦500
  appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

// ==========================================
// 7. Diagnostic Study Coach & Topic Mastery
// ==========================================
export const studentTopicMastery = pgTable('student_topic_mastery', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'cascade' }).notNull(),
  totalAttempted: integer('total_attempted').default(0).notNull(),
  totalCorrect: integer('total_correct').default(0).notNull(),
  accuracyPercent: integer('accuracy_percent').default(0).notNull(),
  lastPracticedAt: timestamp('last_practiced_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('user_topic_mastery_unique_idx').on(table.userId, table.topicId),
  index('user_mastery_accuracy_idx').on(table.userId, table.accuracyPercent),
  index('user_subject_mastery_idx').on(table.userId, table.subjectId)
]).enableRLS();


export const attemptInterruptions = pgTable('attempt_interruptions', {
  id: uuid('id').primaryKey(),
  attemptId: uuid('attempt_id').references(() => attempts.id, { onDelete: 'cascade' }).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
}, (table) => [index('interruption_attempt_idx').on(table.attemptId)]).enableRLS();

export const apiIdempotencyKeys = pgTable('api_idempotency_keys', {
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  operation: text('operation').notNull(), idempotencyKey: text('idempotency_key').notNull(), requestHash: text('request_hash').notNull(),
  status: text('status').notNull(), responseStatus: integer('response_status'), responseBody: jsonb('response_body'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => [primaryKey({columns:[table.userId,table.operation,table.idempotencyKey]}), index('api_idempotency_expiry_idx').on(table.expiresAt)]).enableRLS();
export const dailyPracticeAllowances = pgTable('daily_practice_allowances', {
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  practiceDateWat: date('practice_date_wat').notNull(), questionsAllocated: integer('questions_allocated').notNull(),
}, (table) => [primaryKey({columns:[table.userId,table.practiceDateWat]})]).enableRLS();

export const paymentCheckoutRequests = pgTable('payment_checkout_requests', {
  userId: uuid('user_id').references(() => profiles.id, {onDelete:'cascade'}).notNull(),
  idempotencyKey: text('idempotency_key').notNull(), requestHash:text('request_hash').notNull(),
  reference:text('reference').references(()=>paymentTransactions.reference).unique().notNull(),
  status:text('status').notNull(),authorizationUrl:text('authorization_url'),
  createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
},table=>[primaryKey({columns:[table.userId,table.idempotencyKey]})]).enableRLS();

export const paymentRenewalRequests=pgTable('payment_renewal_requests',{
 reference:text('reference').references(()=>paymentTransactions.reference).primaryKey(),userId:uuid('user_id').references(()=>profiles.id,{onDelete:'cascade'}).notNull(),
 status:text('status').notNull(),planCode:text('plan_code').notNull(),customerCode:text('customer_code').notNull(),authorizationCode:text('authorization_code').notNull(),subscriptionCode:text('subscription_code'),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
},table=>[index('payment_renewal_user_idx').on(table.userId,table.status)]).enableRLS();
