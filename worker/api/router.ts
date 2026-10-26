import {cachedMockReadySubjects} from '../services/mock-ready-subjects';
import { ASSESSMENT_ADMIN_ROUTES } from '../services/assessment-admin-routes';
import { PRACTICE_ROUTES } from '../services/practice-routes';
import {computeRequestHash} from './idempotency';
import {ADMIN_CURRICULUM_ROUTES} from '../services/admin-curriculum-service';
import {ADMIN_MEDIA_ROUTES, type QuestionMediaBucket} from '../services/admin-media-service';
import {ADMIN_WORKFLOW_ROUTES,beginImportBatch,finishImportBatch,recordQuestionHistory,saveEditorialMetadata} from '../services/admin-workflow-service';
import { initializeCheckout, verifyOwnedPayment, cancelOwnedSubscription, configureVerifiedRenewal } from '../services/paystack-service';
import { allocatePractice, checkIssuedPractice, startFrozenMock } from '../services/study-service';
import { saveStudentOnboardingAtomic } from '../services/onboarding-service';
import { APP_RATING_ROUTES } from '../services/app-rating-service';
import { STUDY_SCHEDULE_ROUTES } from '../services/study-schedule-routes';
import { SCHOOL_ROUTES, settleSchoolOrderFromWebhook } from '../services/school-routes';
import { getStudyScheduleState, type StudyScheduleViewResponse } from '../services/study-schedule-service';
import { enqueueLifecycleEmail } from '../services/email-outbox-service';
/**
 * Typed Native Worker API Router & Foundation Endpoint Registry (T03)
 *
 * Implements:
 * - Exact path & HTTP method matching (404 Not Found, 405 Method Not Allowed with Allow header).
 * - Strict CORS validation and OPTIONS preflight before authentication or DB allocation.
 * - Bearer JWT verification, live session checks, and DB-backed admin authorization.
 * - Bounded streamed JSON parsing (413 Payload Too Large, 400 Malformed JSON, 422 Validation Failed).
 * - Persistent/transactional idempotency execution (409 Pending Conflict, 422 Hash Mismatch, Replay).
 * - Foundation handlers wired to portable services with lazy Direct Hyperdrive DB allocation.
 */

import {
  AdminActor,
  AuthenticatedActor,
  authenticateBearerActor,
  AuthEnvConfig,
  AuthVerificationHooks,
  requireAdminActor,
  verifyLiveSupabaseSession,
} from './authorization';
import {
  assertValidUuid,
  authBootstrapSchema,
  BODY_LIMIT_ADMIN_IMPORT_BYTES,
  BODY_LIMIT_DEFAULT_JSON_BYTES,
  BODY_LIMIT_SMALL_WRITE_BYTES,
  BODY_LIMIT_WEBHOOK_BYTES,
  bulkQuestionImportSchema,
  flagExamQuestionSchema,
  onboardingPutSchema,
  paymentVerifySchema,
  practiceCheckSchema,
  profilePatchSchema,
  questionReportCreateSchema,
  questionReportUpdateSchema,
  questionStatusUpdateSchema,
  questionUpsertSchema,
  readBoundedJsonBody,
  readBoundedTextBody,
  saveExamAnswerSchema,
  UUID_V1_TO_V5_REGEX,
} from './contracts';
import { OFFICIAL_JAMB_SYLLABUS_CATALOGUE } from '../../src/lib/curriculum/jamb-syllabus-data';
import {
  CorsEnvConfig,
  handleCorsPreflight,
  validateOriginAndGetCorsHeaders,
} from './cors';
import { DatabaseBindingEnv, RequestDbContext } from './db-context';
import {
   ApiError,
  apiErrorResponse,
  apiJsonResponse,
  apiRawJsonResponse,
  sanitizeDiagnosticMessage,
} from './errors';
import {
  createSqlIdempotencyStore,
  executeIdempotentMutation,
  executeTransactionalIdempotentMutation,
  extractIdempotencyKey,
  IdempotencyStore,
} from './idempotency';
import {
  getAuthenticatedSessionIdentity,
  provisionStudentAccountAtomic,
} from '../services/auth-provisioning-service';
import { getStudentCoachInsights } from '../services/coach-service';
import {
  getOwnedAttemptPayloadJson,
  submitAndScoreExamAttemptAtomic,
  upsertOwnedExamAnswerAtomic,
} from '../services/exam-foundation-service';
import {
  hasValidPaystackWebhookSignature,
  matchesPayment,
} from '../services/payment-security';
import {
  getCheckoutPricing,
  getUserSubscriptionStatus,
  settleVerifiedPaymentAtomic,
} from '../services/subscription-service';

export interface NativeApiEnv extends DatabaseBindingEnv, AuthEnvConfig, CorsEnvConfig {
  QUESTION_MEDIA?: QuestionMediaBucket;
  ENVIRONMENT?: string;
  PUBLIC_APP_ORIGIN?: string;
  EDGE_RATE_LIMIT?: {limit(options:{key:string}):Promise<{success:boolean}>};
  ACTOR_WRITE_LIMIT?: {limit(options:{key:string}):Promise<{success:boolean}>};
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_WEBHOOK_SECRET?: string;
  PAYSTACK_PLAN_CODE?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  VAPID_KEY_VERSION?: string;
}

export interface RateLimitCheckParams {
  request: Request;
  routeId: string;
  actorUserId?: string;
}

export interface ApiRouterHooks extends AuthVerificationHooks {
  /** Local injected adapters only; the default Worker never enables staged product routes. */
  allowUnreviewedProductRoutes?: boolean;
  idempotencyStore?: IdempotencyStore;
  fetchImpl?: typeof fetch;
  rateLimitCheck?: (params: RateLimitCheckParams) => Promise<void> | void;
  now?: () => Date;
}

export type RouteAuthLevel =
  | 'public'
  | 'student'
  | 'student_live_session'
  | 'admin'
  | 'webhook';

export interface RouteRequestContext {
  request: Request;
  url: URL;
  requestId: string;
  params: Record<string, string>;
  env: NativeApiEnv;
  getDb: () => RequestDbContext;
  actor?: AuthenticatedActor;
  adminActor?: AdminActor;
  hooks?: ApiRouterHooks;
  now: Date;
}

export interface RouteHandlerResult {
  status?: 200 | 201 | 204;
  body?: unknown;
  rawJson?: string;
  headers?: Record<string, string>;
}

export interface RouteDefinition {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  pattern: string;
  auth: RouteAuthLevel;
  maxBodyBytes?: number;
  idempotency?: 'required' | 'optional' | 'none';
  handler: (ctx: RouteRequestContext) => Promise<RouteHandlerResult>;
}

const REQUEST_ID_HEADER_REGEX = /^[A-Za-z0-9_.:-]{8,64}$/;

export function resolveRequestId(request: Request): string {
  const incoming = request.headers.get('x-request-id')?.trim();
  if (incoming && REQUEST_ID_HEADER_REGEX.test(incoming)) {
    return incoming;
  }
  return crypto.randomUUID();
}

/**
 * Matches a URL pathname against a route pattern supporting `:attemptId` UUID segments.
 */
function matchRoutePattern(
  pattern: string,
  pathname: string
): Record<string, string> | null {
  const normalizedPath =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const patternParts = pattern.split('/');
  const pathParts = normalizedPath.split('/');

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    const pat = patternParts[i];
    const seg = pathParts[i];
    if (pat.startsWith(':')) {
      const paramName = pat.slice(1);
      if (!seg) {
        return null;
      }
      params[paramName] = decodeURIComponent(seg);
    } else if (pat !== seg) {
      return null;
    }
  }

  return params;
}

/**
 * Helper to run a handler with idempotency protection when configured.
 */
async function runWithIdempotency<T>(
  ctx: RouteRequestContext,
  operation: string,
  required: boolean,
  canonicalPayload: string,
  execute: (context: RouteRequestContext) => Promise<{ status?: 200 | 201; body: T }>,
  prepare?: Parameters<typeof executeTransactionalIdempotentMutation>[0]['prepare'],
  options?: { isolationLevel?: 'serializable' | 'read_committed' }
): Promise<RouteHandlerResult> {
  const idempotencyKey = extractIdempotencyKey(ctx.request, { required });
  if (!idempotencyKey) {
    const res = await execute(ctx);
    return {
      status: res.status ?? 200,
      body: res.body,
    };
  }

  const actorUserId = ctx.actor?.userId;
  if (!actorUserId) {
    throw new ApiError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Authenticated user context is required for idempotent mutations.',
    });
  }

  if (operation === 'payments.checkout' || operation === 'payments.verify') {
    throw new ApiError({ status: 503, code: 'ENDPOINT_NOT_READY', message: 'Provider-backed idempotency is awaiting payment phase review.' });
  }

  const input = {
    userId: actorUserId, operation, idempotencyKey, canonicalPayload,
    nowIso: ctx.now.toISOString(),
  };
  const outcome = ctx.hooks?.idempotencyStore
    ? await executeIdempotentMutation({ ...input, store: ctx.hooks.idempotencyStore, execute: () => execute(ctx) })
    : await executeTransactionalIdempotentMutation({
      ...input, db: ctx.getDb(), prepare, isolationLevel: options?.isolationLevel,
      execute: async (tx) => {
        const scopedDb: RequestDbContext = {
          sql: tx, isHyperdrive: ctx.getDb().isHyperdrive,
          get db(): never { throw new ApiError({ status: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Use the transaction executor for this mutation.' }); },
          runCommittedTransaction: async (fn) => fn(tx),
          runSerializableTransaction: async (fn) => fn(tx),
          cleanup: async () => {},
        };
        return execute({ ...ctx, getDb: () => scopedDb });
      },
    });

  return {
    status: (outcome.status as 200 | 201) ?? 200,
    body: outcome.body,
    headers: outcome.headers,
  };
}

/**
 * Shared Paystack webhook handler used by `/api/v1/webhooks/paystack` and `/api/webhooks/paystack`.
 * Verifies HMAC-SHA512 signature BEFORE allocating any database connection.
 */
async function handlePaystackWebhook(ctx: RouteRequestContext): Promise<RouteHandlerResult> {
  const secret = (
    ctx.env.PAYSTACK_WEBHOOK_SECRET ||
    ctx.env.PAYSTACK_SECRET_KEY ||
    ''
  ).trim();

  if (!secret || secret.includes('placeholder')) {
    throw new ApiError({
      status: 503,
      code: 'SERVICE_CONFIG_UNAVAILABLE',
      message: 'Webhook secret is not configured.',
    });
  }

  const rawBody = await readBoundedTextBody(ctx.request, BODY_LIMIT_WEBHOOK_BYTES);
  const signature = ctx.request.headers.get('x-paystack-signature');

  const validSig = await hasValidPaystackWebhookSignature(rawBody, signature, secret);
  if (!validSig) {
    throw new ApiError({
      status: 401,
      code: 'INVALID_WEBHOOK_SIGNATURE',
      message: 'Invalid webhook signature.',
    });
  }

  let event: {
    event?: string;
    data?: {
      id?: string | number;
      status?: string;
      reference?: string;
      amount?: number;
      currency?: string;
      metadata?: { userId?: string; rewardId?: string | null };
      authorization?: { authorization_code?: string | null; reusable?: boolean };
      customer?: { customer_code?: string | null };
      subscription?: { subscription_code?: string | null; email_token?: string | null };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    throw new ApiError({
      status: 400,
      code: 'MALFORMED_JSON',
      message: 'Webhook body is not valid JSON.',
    });
  }

  if (!event || typeof event !== 'object' || typeof event.event !== 'string') {
    throw new ApiError({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Missing webhook event type.',
    });
  }

  if (event.event === 'charge.success') {
    const eventId = event.data?.id !== undefined ? String(event.data.id) : '';
    const reference = typeof event.data?.reference === 'string' ? event.data.reference.trim() : '';

    if (!eventId || !reference) {
      throw new ApiError({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Webhook charge.success event is missing id or reference.',
      });
    }

    const dbCtx = ctx.getDb();
    const existingRows = await dbCtx.sql<Array<{ id: string }>>`
      SELECT id
      FROM payment_webhook_events
      WHERE event_id = ${eventId}
      LIMIT 1
    `;

    if (existingRows.length > 0) {
      return {
        status: 200,
        body: { received: true, duplicate: true },
      };
    }

    // Handle institutional school cohort orders (`SCH-ORD-*`) sent to the primary Paystack webhook
    const isSchoolOrderRef =
      reference.startsWith('SCH-ORD-') ||
      (event.data?.metadata as Record<string, any> | undefined)?.orderType === 'school_cohort_license';
    if (isSchoolOrderRef) {
      const schoolSettlement = await settleSchoolOrderFromWebhook(
        dbCtx,
        reference,
        typeof event.data?.amount === 'number' ? Number(event.data.amount) : undefined
      );
      if (schoolSettlement.handled) {
        await dbCtx.sql`
          INSERT INTO payment_webhook_events (event_id, event_type, payload, processed_at)
          VALUES (${eventId}, ${event.event}, ${rawBody}::text::jsonb, ${ctx.now.toISOString()}::timestamptz)
          ON CONFLICT (event_id) DO NOTHING
        `;
        return {
          status: 200,
          body: { received: true, schoolOrderSettled: true, orderId: schoolSettlement.orderId },
        };
      }
    }

    const txnRows = await dbCtx.sql<
      Array<{ reference: string; amount_kobo: number; user_id: string }>
    >`
      SELECT reference, amount_kobo, user_id
      FROM payment_transactions
      WHERE reference = ${reference}
      LIMIT 1
    `;

    let txn = txnRows[0];
    if (!txn && event.data?.subscription?.subscription_code) {
      const code=event.data.subscription.subscription_code;
      const known=await dbCtx.sql<Array<{user_id:string}>>`SELECT user_id FROM subscription_entitlements WHERE paystack_subscription_code=${code} AND paystack_customer_code=${event.data.customer?.customer_code ?? null} AND paystack_authorization_code=${event.data.authorization?.authorization_code ?? null} LIMIT 1`;
      if(known[0] && event.data.status==='success' && event.data.currency==='NGN' && Number(event.data.amount)===100000) {
        await dbCtx.sql`INSERT INTO payment_transactions(user_id,reference,amount_kobo,status,channel,paystack_payload) VALUES (${known[0].user_id}::uuid,${reference},100000,'pending','paystack',${JSON.stringify({renewalSubscriptionCode:code})}::text::jsonb) ON CONFLICT(reference) DO NOTHING`;
        const renewal=await dbCtx.sql<Array<{reference:string;amount_kobo:number;user_id:string}>>`SELECT reference,amount_kobo,user_id FROM payment_transactions WHERE reference=${reference} AND user_id=${known[0].user_id}::uuid LIMIT 1`;
        txn=renewal[0];
        // Provider-signed, exact subscription/customer/authorization association supplies ownership.
        if(txn)event.data.metadata={userId:txn.user_id};
      }
    }
    if (!txn || !matchesPayment(event.data, txn.reference, txn.amount_kobo, txn.user_id)) {
      throw new ApiError({
        status: 400,
        code: 'BAD_REQUEST',
        message: 'Payment payload does not match a pending transaction.',
      });
    }

    // Settlement and webhook receipt commit together. A duplicate cannot extend access twice.
    await dbCtx.runSerializableTransaction(async tx => {
      const scoped: RequestDbContext = {sql:tx,get db(){return dbCtx.db;},isHyperdrive:dbCtx.isHyperdrive,runCommittedTransaction:async fn=>fn(tx),runSerializableTransaction:async fn=>fn(tx),cleanup:async()=>{}};
      await settleVerifiedPaymentAtomic(scoped, {
        reference: txn.reference, expectedUserId: txn.user_id, now: ctx.now,
        paystackMeta: {
          authorizationCode: event.data?.authorization?.authorization_code ?? null,
          customerCode: event.data?.customer?.customer_code ?? null,
          subscriptionCode: null,
          emailToken: null,
        },
      });
      await tx`INSERT INTO payment_webhook_events(event_id,event_type,payload,processed_at) VALUES (${eventId},${event.event},${rawBody}::text::jsonb,${ctx.now.toISOString()}::timestamptz) ON CONFLICT(event_id) DO NOTHING`;
    });
    const authData = event.data?.authorization as { authorization_code?: string | null; channel?: string; reusable?: boolean } | undefined;
    const isCardReusable = (authData?.channel === 'card' || !authData?.channel) && authData?.reusable === true;
    if(isCardReusable && authData?.authorization_code && event.data?.customer?.customer_code) {
      try { await configureVerifiedRenewal(dbCtx,ctx.env,txn.user_id,reference,authData.authorization_code,event.data.customer.customer_code,ctx.now,ctx.hooks?.fetchImpl); }
      catch { /* Paid access is committed. Durable renewal state requires reconciliation. */ }
    }
  } else if(event.event==='subscription.create') {
    const data=event.data as Record<string, any>|undefined;
    const code=data?.subscription_code,token=data?.email_token;
    if(typeof code==='string' && typeof token==='string' && code.startsWith('SUB_')) {
      const db=ctx.getDb();
      await db.runSerializableTransaction(async tx=>{
        const jobs=await tx<Array<{user_id:string;reference:string}>>`SELECT user_id,reference FROM payment_renewal_requests WHERE status IN ('initializing','unknown') AND customer_code=${data?.customer?.customer_code??null} AND authorization_code=${data?.authorization?.authorization_code??null} AND plan_code=${data?.plan?.plan_code??null} LIMIT 2 FOR UPDATE`;
        if(jobs.length!==1)return;
        const updated=await tx`UPDATE subscription_entitlements SET paystack_subscription_code=${code},paystack_email_token=${token},auto_renew=TRUE,updated_at=${ctx.now.toISOString()}::timestamptz WHERE user_id=${jobs[0].user_id}::uuid AND paystack_subscription_code IS NULL AND cancelled_at IS NULL RETURNING user_id`;
        if(updated.length)await tx`UPDATE payment_renewal_requests SET status='ready',subscription_code=${code} WHERE reference=${jobs[0].reference}`;
      });
    }
  } else if (
    event.event === 'subscription.disable' ||
    event.event === 'subscription.not_renew' ||
    event.event === 'invoice.payment_failed'
  ) {
    const subCode =
      event.data?.subscription?.subscription_code ||
      (event.data as { subscription_code?: string })?.subscription_code;
    const customerCode = event.data?.customer?.customer_code;

    if (subCode || customerCode) {
      const dbCtx = ctx.getDb();
      const nowIso = ctx.now.toISOString();
      if (subCode) {
        const updated = await dbCtx.sql<Array<{ user_id: string }>>`
          UPDATE subscription_entitlements
          SET
            auto_renew = FALSE,
            cancelled_at = COALESCE(cancelled_at, ${nowIso}::timestamptz),
            updated_at = ${nowIso}::timestamptz
          WHERE paystack_subscription_code = ${subCode}
          RETURNING user_id
        `;
        if (updated.length === 0 && customerCode) {
          await dbCtx.sql`
            UPDATE subscription_entitlements
            SET
              auto_renew = FALSE,
              cancelled_at = COALESCE(cancelled_at, ${nowIso}::timestamptz),
              updated_at = ${nowIso}::timestamptz
            WHERE paystack_customer_code = ${customerCode}
          `;
        }
      } else if (customerCode) {
        await dbCtx.sql`
          UPDATE subscription_entitlements
          SET
            auto_renew = FALSE,
            cancelled_at = COALESCE(cancelled_at, ${nowIso}::timestamptz),
            updated_at = ${nowIso}::timestamptz
          WHERE paystack_customer_code = ${customerCode}
        `;
      }
    }
  }

  return {
    status: 200,
    body: { received: true },
  };
}

/**
 * Shared admin bulk question import handler used by `/api/v1/admin/questions/import`
 * and `/api/admin/questions/import`.
 */
async function handleAdminQuestionImport(ctx: RouteRequestContext): Promise<RouteHandlerResult> {
  const { rawText, data: items } = await readBoundedJsonBody(ctx.request, {
    maxBytes: BODY_LIMIT_ADMIN_IMPORT_BYTES,
    schema: bulkQuestionImportSchema,
    allowArrayRoot: true,
  });

  return await runWithIdempotency(
    ctx,
    'admin.questions.import',
    true,
    rawText,
    async (ctx) => {
      const dbCtx = ctx.getDb();
      const runTx = dbCtx.runCommittedTransaction ? dbCtx.runCommittedTransaction.bind(dbCtx) : dbCtx.runSerializableTransaction.bind(dbCtx);
      const receipt = await runTx(async (tx) => {
        let skippedCount = 0;

        const durableBatch = await beginImportBatch(tx, ctx, JSON.stringify(items), items.length);
        if (durableBatch?.replayed) return { skippedCount: durableBatch.skippedCount };

        // 1. Batch preload unique subjects
        const uniqueCodes = [...new Set(items.map((i) => i.subjectCode))];
        const subRows = await tx<Array<{ id: string; code: string }>>`
          SELECT id, code FROM subjects WHERE code = ANY(${uniqueCodes})
        `;
        const subjectMap = new Map<string, string>();
        for (const s of subRows) subjectMap.set(s.code, s.id);
        for (const code of uniqueCodes) {
          if (!subjectMap.has(code)) {
            throw new ApiError({
              status: 422,
              code: 'VALIDATION_FAILED',
              message: `Subject code '${code}' not found.`,
            });
          }
        }

        // 2. Batch preload topics for all relevant subjects
        const subjectIds = [...new Set([...subjectMap.values()])];
        const topicRows = await tx<Array<{
          id: string;
          subject_id: string;
          slug: string;
          title: string;
          aliases: string[];
          parent_slug: string | null;
          parent_title: string | null;
        }>>`
          SELECT t.id, t.subject_id, t.slug, t.title,
                 COALESCE(m.aliases, '[]'::jsonb) AS aliases,
                 (SELECT p.slug FROM topics p WHERE p.id = m.parent_topic_id) AS parent_slug,
                 (SELECT p.title FROM topics p WHERE p.id = m.parent_topic_id) AS parent_title
          FROM topics t
          LEFT JOIN curriculum_topic_mappings m ON m.topic_id = t.id
          WHERE t.subject_id = ANY(${subjectIds}::uuid[])
        `;

        function resolveTopic(subjectId: string, label: string) {
          const lower = label.toLowerCase();
          const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const matches = topicRows.filter((t) =>
            t.subject_id === subjectId && (
              t.slug === slug ||
              t.title.toLowerCase() === lower ||
              (Array.isArray(t.aliases) && t.aliases.some((a) => String(a).toLowerCase() === lower))
            )
          );
          if (!matches.length) {
            throw new ApiError({
              status: 422,
              code: 'VALIDATION_FAILED',
              message: 'Unknown topic. Add its canonical mapping in Curriculum before importing.',
            });
          }
          if (matches.length > 1) {
            throw new ApiError({
              status: 422,
              code: 'VALIDATION_FAILED',
              message: 'Ambiguous topic. Use its unique canonical slug.',
            });
          }
          return matches[0];
        }

        // 3. Batch check existing external references
        const extRefs = items.map((i) => i.externalReference).filter(Boolean) as string[];
        const existingRefMap = new Map<string, string>();
        if (extRefs.length) {
          const existingRefs = await tx<Array<{ subject_id: string; external_reference: string; request_hash: string }>>`
            SELECT subject_id, external_reference, request_hash
            FROM question_import_references
            WHERE external_reference = ANY(${extRefs}) AND subject_id = ANY(${subjectIds}::uuid[])
          `;
          for (const r of existingRefs) {
            existingRefMap.set(`${r.subject_id}:${r.external_reference}`, r.request_hash);
          }
        }

        // 4. Passages resolution
        const passageCache = new Map<string, { id: string; title: string | null; content: string }>();
        const passageRefs = items.map((i) => i.passageReference).filter(Boolean) as string[];
        if (passageRefs.length) {
          const existingPassages = await tx<Array<{ external_reference: string; subject_id: string; id: string; title: string | null; content: string }>>`
            SELECT r.external_reference, r.subject_id, p.id, p.title, p.content
            FROM passage_import_references r
            JOIN passages p ON p.id = r.passage_id
            WHERE r.external_reference = ANY(${passageRefs}) AND r.subject_id = ANY(${subjectIds}::uuid[])
          `;
          for (const p of existingPassages) {
            passageCache.set(`${p.subject_id}:${p.external_reference}`, { id: p.id, title: p.title, content: p.content });
          }
        }

        const passagesToInsert:Array<{id:string;subject_id:string;title:string|null;content:string;external_reference:string|null}>=[];
        const itemPassageIds = new Map<typeof items[number], string | null>();
        for (const item of items) {
          const subjectId = subjectMap.get(item.subjectCode)!;
          let passageId: string | null = null;
          if (item.passageReference) {
            const passageKey = `${subjectId}:${item.passageReference}`;
            const cachedPassage = passageCache.get(passageKey);
            if (cachedPassage) {
              if (
                (item.passageContent && cachedPassage.content !== item.passageContent) ||
                (item.passageTitle && cachedPassage.title !== item.passageTitle)
              ) {
                throw new ApiError({
                  status: 409,
                  code: 'CONFLICT',
                  message: 'A passage reference already exists with different content.',
                });
              }
              passageId = cachedPassage.id;
            }
          }
          if (!passageId && item.passageContent?.trim()) {
            passageId=crypto.randomUUID();
            passagesToInsert.push({id:passageId,subject_id:subjectId,title:item.passageTitle??null,content:item.passageContent,external_reference:item.passageReference??null});
            if (item.passageReference) {
              passageCache.set(`${subjectId}:${item.passageReference}`, {
                id: passageId,
                title: item.passageTitle ?? null,
                content: item.passageContent,
              });
            }
          }
          if (item.passageReference && !passageId) {
            throw new ApiError({
              status: 422,
              code: 'VALIDATION_FAILED',
              message: 'A new passage reference requires passage content.',
            });
          }
          itemPassageIds.set(item, passageId);
        }

        if(passagesToInsert.length){
          const payload=JSON.stringify(passagesToInsert);
          await tx`INSERT INTO passages(id,subject_id,title,content) SELECT id,subject_id,title,content FROM jsonb_to_recordset(${payload}::text::jsonb) x(id uuid,subject_id uuid,title text,content text,external_reference text)`;
          await tx`INSERT INTO passage_import_references(subject_id,external_reference,passage_id) SELECT subject_id,external_reference,id FROM jsonb_to_recordset(${payload}::text::jsonb) x(id uuid,subject_id uuid,external_reference text) WHERE external_reference IS NOT NULL`;
        }

        // 5. Filter items for duplicates and validate subtopics
        const itemsToInsert: Array<{
          item: typeof items[number];
          subjectId: string;
          topicId: string;
          passageId: string | null;
          rowHash: string;
          questionId:string;
        }> = [];

        for (const item of items) {
          const subjectId = subjectMap.get(item.subjectCode)!;
          const rowHash = await computeRequestHash('admin.import.row', JSON.stringify(item));
          if (item.externalReference) {
            const existingHash = existingRefMap.get(`${subjectId}:${item.externalReference}`);
            if (existingHash) {
              if (existingHash !== rowHash) {
                throw new ApiError({
                  status: 409,
                  code: 'CONFLICT',
                  message: 'An external reference already exists with different content. Edit its question explicitly.',
                });
              }
              skippedCount++;
              continue;
            }
          }
          const topicLabel = item.subtopicSlug || item.topicTitle;
          const topic = resolveTopic(subjectId, topicLabel);
          if (item.subtopicSlug) {
            if (topic.parent_slug !== item.topicTitle && topic.parent_title !== item.topicTitle) {
              throw new ApiError({
                status: 422,
                code: 'VALIDATION_FAILED',
                message: 'Subtopic must belong to the selected canonical topic.',
              });
            }
          }
          if(item.externalReference)existingRefMap.set(`${subjectId}:${item.externalReference}`,rowHash);
          itemsToInsert.push({
            questionId:crypto.randomUUID(),item,
            subjectId,
            topicId: topic.id,
            passageId: itemPassageIds.get(item) ?? null,
            rowHash,
          });
        }

        // 6. Bulk insert questions and related records
        if (itemsToInsert.length > 0) {
          const insertedQuestions = await tx<Array<{ id: string }>>`
            INSERT INTO questions (
              id,subject_id,
              topic_id,
              passage_id,
              stem,
              image_url,
              difficulty,
              exam_year,
              status
            )
            SELECT x.id::uuid,x.subject_id::uuid, x.topic_id::uuid, x.passage_id::uuid, x.stem, x.image_url, x.difficulty::difficulty_level, x.exam_year, 'draft'
            FROM jsonb_to_recordset(${JSON.stringify(
              itemsToInsert.map((entry) => ({
                id:entry.questionId,subject_id: entry.subjectId,
                topic_id: entry.topicId,
                passage_id: entry.passageId,
                stem: entry.item.stem,
                image_url: entry.item.imageUrl ?? null,
                difficulty: entry.item.difficulty,
                exam_year: entry.item.examYear ?? null,
              }))
            )}::text::jsonb) AS x(id text,subject_id text, topic_id text, passage_id text, stem text, image_url text, difficulty text, exam_year int)
            RETURNING id
          `;

          const allOptions: Array<{ question_id: string; label: string; content: string; is_correct: boolean }> = [];
          const allExplanations: Array<{ question_id: string; explanation: string; verified_by: string | null }> = [];
          const allMetadata: Array<{ question_id: string; source_type: string; source_reference: string; rights_note: string; image_alt: string; tags: string[] }> = [];
          const allRefs: Array<{ subject_id: string; external_reference: string; question_id: string; request_hash: string }> = [];

          for (let idx = 0; idx < itemsToInsert.length; idx++) {
            const qId = itemsToInsert[idx].questionId;
            const { item, subjectId, rowHash } = itemsToInsert[idx];

            for (const label of ['A', 'B', 'C', 'D'] as const) {
              allOptions.push({
                question_id: qId,
                label,
                content: item.options[label],
                is_correct: item.correctOption === label,
              });
            }

            allExplanations.push({
              question_id: qId,
              explanation: item.explanation,
              verified_by: ctx.adminActor?.userId ?? null,
            });

            const effectiveRights =
              item.rightsNote?.trim() ||
              (item.sourceType === 'past_question' && item.sourceReference?.trim()
                ? 'Standard JAMB UTME educational past question'
                : '');

            allMetadata.push({
              question_id: qId,
              source_type: item.sourceType ?? 'original',
              source_reference: item.sourceReference ?? '',
              rights_note: effectiveRights,
              image_alt: item.imageAlt ?? '',
              tags: item.tags ?? [],
            });

            if (item.externalReference) {
              allRefs.push({
                subject_id: subjectId,
                external_reference: item.externalReference,
                question_id: qId,
                request_hash: rowHash,
              });
            }
          }

          await tx`
            INSERT INTO question_options (question_id, label, content, is_correct)
            SELECT x.question_id::uuid, x.label, x.content, x.is_correct
            FROM jsonb_to_recordset(${JSON.stringify(allOptions)}::text::jsonb) AS x(question_id text, label text, content text, is_correct boolean)
          `;

          await tx`
            INSERT INTO question_explanations (question_id, explanation, verified_by)
            SELECT x.question_id::uuid, x.explanation, x.verified_by::uuid
            FROM jsonb_to_recordset(${JSON.stringify(allExplanations)}::text::jsonb) AS x(question_id text, explanation text, verified_by text)
          `;

          await tx`
            INSERT INTO question_editorial_metadata (question_id, source_type, source_reference, rights_note, image_alt, tags)
            SELECT x.question_id::uuid, x.source_type, x.source_reference, x.rights_note, x.image_alt, x.tags
            FROM jsonb_to_recordset(${JSON.stringify(allMetadata)}::text::jsonb) AS x(question_id text, source_type text, source_reference text, rights_note text, image_alt text, tags jsonb)
          `;

          const qIds = insertedQuestions.map((q) => q.id);
          await tx`
            INSERT INTO question_editorial_history (question_id, revision, actor_id, action, snapshot)
            SELECT q.id, q.editorial_revision, ${ctx.actor!.userId}::uuid, 'question.imported',
                   jsonb_build_object(
                     'question', to_jsonb(q),
                     'metadata', (SELECT to_jsonb(m) FROM question_editorial_metadata m WHERE m.question_id = q.id),
                     'options', (SELECT jsonb_agg(to_jsonb(o) ORDER BY o.label) FROM question_options o WHERE o.question_id = q.id),
                     'explanation', (SELECT explanation FROM question_explanations e WHERE e.question_id = q.id),
                     'passage', (SELECT to_jsonb(p) FROM passages p WHERE p.id = q.passage_id)
                   )
            FROM questions q
            WHERE q.id = ANY(${qIds}::uuid[])
            ON CONFLICT (question_id, revision) DO NOTHING
          `;

          await tx`
            INSERT INTO admin_audit_events (actor_id, action, entity_id)
            SELECT ${ctx.actor!.userId}::uuid, 'question.imported', id::uuid
            FROM unnest(${qIds}::uuid[]) AS id
          `;

          if (allRefs.length > 0) {
            await tx`
              INSERT INTO question_import_references (subject_id, external_reference, question_id, request_hash)
              SELECT x.subject_id::uuid, x.external_reference, x.question_id::uuid, x.request_hash
              FROM jsonb_to_recordset(${JSON.stringify(allRefs)}::text::jsonb) AS x(subject_id text, external_reference text, question_id text, request_hash text)
            `;
          }
        }

        if (durableBatch) await finishImportBatch(tx, durableBatch, ctx.actor!.userId, skippedCount);
        return { skippedCount };
      });

      return {
        status: 200,
        body: {
          success: true,
          importedCount: items.length-receipt.skippedCount,
          processedCount: items.length,
          skippedCount: receipt.skippedCount,
          totalReceived: items.length,
          errors: [],
        },
      };
    },
    undefined,
    { isolationLevel: 'read_committed' }
  );
}

/**
 * Code-level route allowlist for the production-candidate Worker.
 * Only explicitly completed and reviewed endpoints are exposed by default;
 * all other staged product routes return 503 ENDPOINT_NOT_READY unless
 * `hooks.allowUnreviewedProductRoutes` is injected in local tests.
 */
export const ENABLED_PRODUCTION_ROUTE_IDS: ReadonlySet<string> = new Set([
  ...APP_RATING_ROUTES.map(route => route.id),
  ...STUDY_SCHEDULE_ROUTES.map(route => route.id),
  ...ASSESSMENT_ADMIN_ROUTES.map(route=>route.id),
  ...PRACTICE_ROUTES.map(route=>route.id),
  ...SCHOOL_ROUTES.map(route => route.id),
  'system.health',
  ...ADMIN_CURRICULUM_ROUTES.map(route => route.id),
  ...ADMIN_WORKFLOW_ROUTES.map(route => route.id),
  ...ADMIN_MEDIA_ROUTES.map(route => route.id),
  'auth.bootstrap',
  'auth.session.get',
  'auth.admin.session.get',
  'onboarding.get',
  'onboarding.put',
  'dashboard.get',
  'coach.get',
  'profile.get',
  'profile.patch',
  'referrals.get',
  'pricing.get',
  'admin.overview.get',
  'admin.questions.get',
  'admin.questions.detail.get',
  'admin.questions.create',
  'admin.questions.update',
  'admin.questions.status.patch',
  'admin.curriculum.get',
  'admin.reports.get',
  'admin.reports.update',
  'admin.questions.import.dry_run',
  'admin.questions.import',
  'admin.questions.import.legacy',
  'reports.question.create',
  'webhooks.paystack',
  'webhooks.paystack.legacy',
  'payments.checkout.post',
  'payments.verify.post',
  'payments.subscription.cancel',
  'exams.attempts.review.get',
  'practice.subjects.get',
  'practice.session.post',
  'practice.check.post',
  'exams.attempts.create',
  'exams.attempts.get',
  'exams.attempts.answers.put',
  'exams.attempts.interruption.post',
  'exams.attempts.flags.patch',
  'exams.attempts.submit',
  'exams.attempts.results.get',
]);

/**
 * Full Route Registry for `/api/v1/*` and legacy webhook/admin aliases (Plan Section 6.2).
 */
export const NATIVE_API_ROUTES: ReadonlyArray<RouteDefinition> = [
  ...APP_RATING_ROUTES,
  ...STUDY_SCHEDULE_ROUTES,
  ...ASSESSMENT_ADMIN_ROUTES,
  ...PRACTICE_ROUTES,
  ...ADMIN_CURRICULUM_ROUTES,
  ...ADMIN_WORKFLOW_ROUTES,
  ...ADMIN_MEDIA_ROUTES,
  ...SCHOOL_ROUTES,
  // 0. Health / Readiness (Public, zero DB allocation)
  {
    id: 'system.health',
    method: 'GET',
    pattern: '/api/v1/health',
    auth: 'public',
    handler: async (ctx) => ({
      status: 200,
      body: {
        status: 'ok',
        service: 'jambprep-native-api',
        timestamp: ctx.now.toISOString(),
      },
    }),
  },

  // 1. POST /api/v1/auth/bootstrap (T04 recoverable account provisioning)
  {
    id: 'auth.bootstrap',
    method: 'POST',
    pattern: '/api/v1/auth/bootstrap',
    auth: 'student_live_session',
    maxBodyBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
    idempotency: 'required',
    handler: async (ctx) => {
      const { rawText, data } = await readBoundedJsonBody(ctx.request, {
        maxBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
        schema: authBootstrapSchema,
      });
      const actor = ctx.actor!;

      return await runWithIdempotency(ctx, 'auth.bootstrap', true, rawText, async (ctx) => {
        const dbCtx = ctx.getDb();
        const provisioned = await dbCtx.runCommittedTransaction(async (tx) => {
          const res = await provisionStudentAccountAtomic(tx, {
            userId: actor.userId,
            email: actor.email ?? null,
            displayName: data.displayName,
            referralCode: data.referralCode ?? null,
          });

          // Enqueue welcome email in background queue (idempotent, takes ~1ms)
          if (actor.email && actor.email.includes('@')) {
            await enqueueLifecycleEmail(tx, {
              userId: actor.userId,
              emailType: 'welcome',
              recipientEmail: actor.email,
              recipientName: data.displayName,
              subject: `Welcome to JAMBPrep, ${data.displayName}! Your 300+ UTME journey begins`,
              payload: {
                studentName: data.displayName,
                dashboardUrl: 'https://jambprep.lecterniq.com/dashboard',
                practiceUrl: 'https://jambprep.lecterniq.com/practice',
              },
              referenceId: `welcome:${actor.userId}`,
            }).catch((err) => {
              console.warn('[auth.bootstrap] Welcome email enqueue notice:', err);
            });
          }

          return res;
        });

        return {
          status: 200,
          body: provisioned,
        };
      }, async tx => {
        await tx`INSERT INTO profiles (id, display_name, email, role)
          VALUES (${actor.userId}::uuid, ${data.displayName}, ${actor.email?.trim().toLowerCase() || `${actor.userId}@student.jambprep.local`}, 'student')
          ON CONFLICT (id) DO NOTHING`;
      });
    },
  },

  // 1b. GET /api/v1/auth/session (T04 live-session verified student identity & owner check)
  {
    id: 'auth.session.get',
    method: 'GET',
    pattern: '/api/v1/auth/session',
    auth: 'student_live_session',
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const expectedUserId =
        ctx.url.searchParams.get('userId') ??
        ctx.request.headers.get('x-expected-user-id') ??
        null;
      const dbCtx = ctx.getDb();
      const identity = await getAuthenticatedSessionIdentity(dbCtx.sql, actor, {
        expectedUserId,
      });

      return {
        status: 200,
        body: identity,
      };
    },
  },

  // 1c. GET /api/v1/auth/admin-session (T04 live-session + DB-backed admin authorization check)
  {
    id: 'auth.admin.session.get',
    method: 'GET',
    pattern: '/api/v1/auth/admin-session',
    auth: 'admin',
    handler: async (ctx) => {
      const admin = ctx.adminActor!;
      return {
        status: 200,
        body: {
          authenticated: true,
          authorized: true,
          user: {
            id: admin.userId,
            email: admin.email ?? null,
            role: admin.role,
          },
        },
      };
    },
  },

  // 2. GET /api/v1/onboarding
  {
    id: 'onboarding.get',
    method: 'GET',
    pattern: '/api/v1/onboarding',
    auth: 'student_live_session',
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const [subjectsRows, prefRows, enrolledRows] = await Promise.all([
        cachedMockReadySubjects(dbCtx.sql),
        dbCtx.sql<
          Array<{
            target_score: number;
            exam_year: number;
            target_institution: string | null;
            target_course: string | null;
          }>
        >`
          SELECT target_score, exam_year, target_institution, target_course
          FROM student_preferences
          WHERE user_id = ${actor.userId}::uuid
          LIMIT 1
        `,
        dbCtx.sql<Array<{ subject_id: string; code: string; name: string }>>`
          SELECT ss.subject_id, s.code, s.name
          FROM student_subjects ss
          INNER JOIN subjects s ON s.id = ss.subject_id
          WHERE ss.user_id = ${actor.userId}::uuid
        `,
      ]);

      return {
        status: 200,
        body: {
          availableSubjects: subjectsRows,
          preferences: prefRows[0] ?? null,
          enrolledSubjects: enrolledRows,
        },
      };
    },
  },

  // 3. PUT /api/v1/onboarding
  {
    id: 'onboarding.put',
    method: 'PUT',
    pattern: '/api/v1/onboarding',
    auth: 'student_live_session',
    maxBodyBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
    idempotency: 'required',
    handler: async (ctx) => {
      const { rawText, data } = await readBoundedJsonBody(ctx.request, {
        maxBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
        schema: onboardingPutSchema,
      });
      const actor = ctx.actor!;

      return await runWithIdempotency(ctx, 'onboarding.put', true, rawText, async (ctx) => {
        const dbCtx = ctx.getDb();
        const saved = await dbCtx.runCommittedTransaction((tx) => saveStudentOnboardingAtomic(tx, actor.userId, data, ctx.now));
        return { status: 200, body: saved };
      });
    },
  },

  // 4. GET /api/v1/dashboard
  {
    id: 'dashboard.get',
    method: 'GET',
    pattern: '/api/v1/dashboard',
    auth: 'student',
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const [subscription, coach, referralRows, studyStreak] = await Promise.all([
        getUserSubscriptionStatus(dbCtx.sql, actor.userId, ctx.now),
        getStudentCoachInsights(dbCtx.sql, actor.userId),
        dbCtx.sql<Array<{ qualified_count: number; has_reward: boolean }>>`SELECT (SELECT COUNT(*)::int FROM referrals WHERE referrer_id = ${actor.userId}::uuid AND status = 'qualified') AS qualified_count, EXISTS (SELECT 1 FROM referral_rewards WHERE user_id = ${actor.userId}::uuid AND status = 'available' AND reward_type='FIRST_MONTH_50_PERCENT') AND NOT EXISTS(SELECT 1 FROM payment_transactions WHERE user_id=${actor.userId}::uuid AND status='success') AS has_reward`,
        getStudyScheduleState(dbCtx.sql, actor.userId, { now: ctx.now }).catch(() => null),
      ]);
      return {
        status: 200,
        body: {
          userId: actor.userId,
          subscription,
          coach,
          qualifiedReferrals: Number(referralRows[0]?.qualified_count ?? 0),
          has50PercentReward: Boolean(referralRows[0]?.has_reward),
          studyStreak,
        },
      };
    },
  },

  // 5. GET /api/v1/coach
  {
    id: 'coach.get',
    method: 'GET',
    pattern: '/api/v1/coach',
    auth: 'student',
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const subscription = await getUserSubscriptionStatus(dbCtx.sql, actor.userId, ctx.now);
      if (!subscription.isPremium) throw new ApiError({ status: 403, code: 'FORBIDDEN_ENTITLEMENT_REQUIRED', message: 'Premium is required for detailed analytics.' });
      const insights = await getStudentCoachInsights(dbCtx.sql, actor.userId);
      return {
        status: 200,
        body: insights,
      };
    },
  },

  // 6. GET /api/v1/profile
  {
    id: 'profile.get',
    method: 'GET',
    pattern: '/api/v1/profile',
    auth: 'student',
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const [profileRows, prefRows, subscription, studyStreak] = await Promise.all([
        dbCtx.sql<Array<{ id: string; display_name: string; email: string; role: string }>>`
          SELECT id, display_name, email, role
          FROM profiles
          WHERE id = ${actor.userId}::uuid
          LIMIT 1
        `,
        dbCtx.sql<
          Array<{
            target_score: number;
            exam_year: number;
            target_institution: string | null;
            target_course: string | null;
          }>
        >`
          SELECT target_score, exam_year, target_institution, target_course
          FROM student_preferences
          WHERE user_id = ${actor.userId}::uuid
          LIMIT 1
        `,
        getUserSubscriptionStatus(dbCtx.sql, actor.userId, ctx.now),
        getStudyScheduleState(dbCtx.sql, actor.userId, { now: ctx.now }).catch(() => null),
      ]);

      return {
        status: 200,
        body: {
          profile: profileRows[0] ?? null,
          preferences: prefRows[0] ?? null,
          subscription,
          studyStreak,
        },
      };
    },
  },

  // 7. PATCH /api/v1/profile
  {
    id: 'profile.patch',
    method: 'PATCH',
    pattern: '/api/v1/profile',
    auth: 'student_live_session',
    maxBodyBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
    idempotency: 'required',
    handler: async (ctx) => {
      const { rawText, data } = await readBoundedJsonBody(ctx.request, {
        maxBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
        schema: profilePatchSchema,
      });
      const actor = ctx.actor!;

      return await runWithIdempotency(ctx, 'profile.patch', true, rawText, async (ctx) => {
        const dbCtx = ctx.getDb();
        const nowIso = ctx.now.toISOString();

        await dbCtx.runCommittedTransaction(async (tx) => {
          await tx`
            UPDATE profiles
            SET
              display_name = ${data.displayName},
              updated_at = ${nowIso}::timestamptz
            WHERE id = ${actor.userId}::uuid
          `;

          await tx`
            INSERT INTO student_preferences (
              user_id,
              target_score,
              exam_year,
              target_institution,
              target_course,
              updated_at
            )
            VALUES (
              ${actor.userId}::uuid,
              ${data.targetScore},
              ${ctx.now.getUTCFullYear()},
              ${data.targetInstitution ?? null},
              ${data.targetCourse ?? null},
              ${nowIso}::timestamptz
            )
            ON CONFLICT (user_id) DO UPDATE
            SET
              target_score = EXCLUDED.target_score,
              target_institution = EXCLUDED.target_institution,
              target_course = EXCLUDED.target_course,
              updated_at = EXCLUDED.updated_at
          `;
        });

        return {
          status: 200,
          body: {
            updated: true,
            displayName: data.displayName,
            targetScore: data.targetScore,
            targetInstitution: data.targetInstitution ?? null,
            targetCourse: data.targetCourse ?? null,
          },
        };
      });
    },
  },

  // 8. GET /api/v1/referrals
  {
    id: 'referrals.get',
    method: 'GET',
    pattern: '/api/v1/referrals',
    auth: 'student',
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const [codeRows, referralRows, rewardRows] = await Promise.all([
        dbCtx.sql<Array<{ code: string }>>`
          SELECT code FROM referral_codes WHERE user_id = ${actor.userId}::uuid LIMIT 1
        `,
        dbCtx.sql<Array<{ status: string; created_at: string; qualified_at: string | null; total_count:number; qualified_count:number }>>`
          SELECT status, created_at, qualified_at, COUNT(*) OVER()::int AS total_count, COUNT(*) FILTER(WHERE status='qualified') OVER()::int AS qualified_count
          FROM referrals
          WHERE referrer_id = ${actor.userId}::uuid
          ORDER BY created_at DESC
          LIMIT 50
        `,
        dbCtx.sql<Array<{ id: string; reward_type: string; status: string; unlocked_at: string }>>`
          SELECT id, reward_type, status, created_at AS unlocked_at
          FROM referral_rewards
          WHERE user_id = ${actor.userId}::uuid
          ORDER BY created_at DESC
          LIMIT 10
        `,
      ]);

      const qualifiedCount = Number(referralRows[0]?.qualified_count??0);
      return {
        status: 200,
        body: {
          code: codeRows[0]?.code ?? null,
          totalReferred: Number(referralRows[0]?.total_count??0),
          qualifiedCount,
          referrals: referralRows,
          rewards: rewardRows,
        },
      };
    },
  },

  // 9. GET /api/v1/pricing
  {
    id: 'pricing.get',
    method: 'GET',
    pattern: '/api/v1/pricing',
    auth: 'student',
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const pricing = await getCheckoutPricing(
        dbCtx.sql,
        actor.userId,
        actor.email ?? '',
        ctx.now
      );
      return {
        status: 200,
        body: pricing,
      };
    },
  },

  // 10. GET /api/v1/practice/subjects
  {
    id: 'practice.subjects.get',
    method: 'GET',
    pattern: '/api/v1/practice/subjects',
    auth: 'student',
    handler: async (ctx) => {
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();
      const rows = await dbCtx.sql<
        Array<{
          subject_id: string;
          subject_code: string;
          subject_name: string;
          is_compulsory: boolean;
        }>
      >`
        SELECT
          s.id AS subject_id,
          s.code AS subject_code,
          s.name AS subject_name,
          s.is_compulsory
        FROM student_subjects ss
        INNER JOIN subjects s ON s.id = ss.subject_id
        WHERE ss.user_id = ${actor.userId}::uuid
        ORDER BY s.is_compulsory DESC, s.display_order ASC
      `;
      return {
        status: 200,
        body: { subjects: rows },
      };
    },
  },

  {
    id: 'practice.session.post', method: 'POST', pattern: '/api/v1/practice/session', auth: 'student_live_session', idempotency: 'required', maxBodyBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
    handler: async (ctx) => {
      const { rawText, data } = await readBoundedJsonBody(ctx.request, { maxBytes: BODY_LIMIT_SMALL_WRITE_BYTES });
      return runWithIdempotency(ctx,'practice.session',true,rawText,async (scoped) => ({ body: await allocatePractice(scoped.getDb().sql,scoped.actor!.userId,data,scoped.now) }));
    },
  },
  // 11. GET /api/v1/practice/questions
  {
    id: 'practice.questions.get',
    method: 'GET',
    pattern: '/api/v1/practice/questions',
    auth: 'student',
    handler: async (ctx) => {
      const subjectCode = ctx.url.searchParams.get('subjectCode')?.trim().toUpperCase();
      const countRaw = ctx.url.searchParams.get('count') ?? '5';
      const count = Number.parseInt(countRaw, 10);

      if (!subjectCode || subjectCode.length < 2 || subjectCode.length > 6) {
        throw new ApiError({
          status: 400,
          code: 'BAD_REQUEST',
          message: 'Query parameter subjectCode is required.',
        });
      }
      if (!Number.isInteger(count) || count < 1 || count > 60) {
        throw new ApiError({
          status: 422,
          code: 'VALIDATION_FAILED',
          message: 'Query parameter count must be an integer between 1 and 60.',
        });
      }

      const dbCtx = ctx.getDb();
      const rows = await dbCtx.sql<Array<{ questions_json: string }>>`
        WITH selected_questions AS (
          SELECT
            q.id,
            q.stem,
            q.difficulty,
            q.exam_year AS "examYear",
            s.code AS "subjectCode",
            s.name AS "subjectName",
            t.title AS "topicTitle",
            CASE
              WHEN p.id IS NOT NULL THEN json_build_object('title', p.title, 'content', p.content)
              ELSE NULL
            END AS passage,
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object('label', qo.label, 'content', qo.content)
                  ORDER BY qo.label ASC
                )
                FROM question_options qo
                WHERE qo.question_id = q.id
              ),
              '[]'::json
            ) AS options
          FROM questions q
          INNER JOIN subjects s ON s.id = q.subject_id
          INNER JOIN topics t ON t.id = q.topic_id
          LEFT JOIN passages p ON p.id = q.passage_id
          WHERE s.code = ${subjectCode}
            AND q.status = 'published'
          ORDER BY RANDOM()
          LIMIT ${count}
        )
        SELECT COALESCE(json_agg(sq)::text, '[]') AS questions_json
        FROM selected_questions sq
      `;

      return {
        status: 200,
        rawJson: `{"questions":${rows[0]?.questions_json ?? '[]'}}`,
      };
    },
  },

  // 12. POST /api/v1/practice/check
  {
    id: 'practice.check.post',
    method: 'POST',
    pattern: '/api/v1/practice/check',
    auth: 'student',
    maxBodyBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
    idempotency: 'required',
    handler: async (ctx) => {
      const { rawText, data } = await readBoundedJsonBody(ctx.request, {
        maxBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
        schema: practiceCheckSchema,
      });

      return runWithIdempotency(ctx,'practice.check',true,rawText,async (scoped) => ({ body: await checkIssuedPractice(scoped.getDb().sql,scoped.actor!.userId,data,scoped.now) }));
    },
  },

  // 13. POST /api/v1/exams/attempts
  {
    id: 'exams.attempts.create', method: 'POST', pattern: '/api/v1/exams/attempts', auth: 'student_live_session', maxBodyBytes: BODY_LIMIT_SMALL_WRITE_BYTES, idempotency: 'required',
    handler: async (ctx) => {
      const { rawText, data } = await readBoundedJsonBody<{ examConditions: boolean; labSessionCode?: string | null }>(ctx.request, { maxBytes: BODY_LIMIT_SMALL_WRITE_BYTES });
      return runWithIdempotency(ctx,'exams.attempts.create',true,rawText,async (scoped) => ({ body: await startFrozenMock(scoped.getDb().sql,scoped.actor!.userId,data,scoped.now) }));
    },
  },

  // 14. GET /api/v1/exams/attempts/:attemptId
  {
    id: 'exams.attempts.get',
    method: 'GET',
    pattern: '/api/v1/exams/attempts/:attemptId',
    auth: 'student',
    handler: async (ctx) => {
      const attemptId = assertValidUuid(ctx.params.attemptId, 'attemptId');
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();

      const payload = await getOwnedAttemptPayloadJson(dbCtx.sql, {
        attemptId,
        userId: actor.userId,
      });

      const rawJson = `{"examConditions":${payload.examConditions},"serverNow":${ctx.now.getTime()},"attemptId":${JSON.stringify(payload.attemptId)},"status":${JSON.stringify(payload.status)},"startedAt":${JSON.stringify(payload.startedAt)},"expiresAt":${JSON.stringify(payload.expiresAt)},"totalQuestions":${payload.totalQuestions},"selectionWarnings":${JSON.stringify(payload.selectionWarnings)},"questions":${payload.questionsJson}}`;

      return {
        status: 200,
        rawJson,
      };
    },
  },

  // 15. PUT /api/v1/exams/attempts/:attemptId/answers
  {
    id: 'exams.attempts.answers.put',
    method: 'PUT',
    pattern: '/api/v1/exams/attempts/:attemptId/answers',
    auth: 'student',
    maxBodyBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
    idempotency: 'optional',
    handler: async (ctx) => {
      const attemptId = assertValidUuid(ctx.params.attemptId, 'attemptId');
      const { rawText, data } = await readBoundedJsonBody(ctx.request, {
        maxBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
        schema: saveExamAnswerSchema,
      });
      const actor = ctx.actor!;

      return await runWithIdempotency(
        ctx,
        `exams.attempts.answers.put:${attemptId}`,
        false,
        rawText,
        async (ctx) => {
          const result = await upsertOwnedExamAnswerAtomic(ctx.getDb(), {
            attemptId,
            userId: actor.userId,
            questionId: data.questionId,
            selectedOptionId: data.selectedOptionId,
            revision: data.revision,
            serverReceivedAt: ctx.now.toISOString(),
          });
          return {
            status: 200,
            body: result,
          };
        }
      );
    },
  },

  {
    id: 'exams.attempts.interruption.post', method: 'POST', pattern: '/api/v1/exams/attempts/:attemptId/interruptions', auth: 'student', maxBodyBytes: BODY_LIMIT_SMALL_WRITE_BYTES, idempotency: 'required',
    handler: async (ctx) => {
      const attemptId=assertValidUuid(ctx.params.attemptId);
      const {rawText,data}=await readBoundedJsonBody<{episodeId:string;ended:boolean}>(ctx.request,{maxBytes:BODY_LIMIT_SMALL_WRITE_BYTES});
      assertValidUuid(data.episodeId); if(typeof data.ended!=='boolean') throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Invalid interruption state.'});
      return runWithIdempotency(ctx,`exam.interruption:${attemptId}`,true,rawText,async (scoped)=>{
        const rows=await scoped.getDb().sql`INSERT INTO attempt_interruptions (id,attempt_id,started_at,ended_at)
          SELECT ${data.episodeId}::uuid,a.id,${scoped.now.toISOString()}::timestamptz,CASE WHEN ${data.ended} THEN ${scoped.now.toISOString()}::timestamptz ELSE NULL END FROM attempts a
          WHERE a.id=${attemptId}::uuid AND a.user_id=${scoped.actor!.userId}::uuid AND a.mode='mock' AND a.exam_conditions AND a.status='in_progress'
          ON CONFLICT(id) DO UPDATE SET ended_at=CASE WHEN ${data.ended} THEN COALESCE(attempt_interruptions.ended_at,EXCLUDED.ended_at) ELSE attempt_interruptions.ended_at END WHERE attempt_interruptions.attempt_id=EXCLUDED.attempt_id RETURNING id`;
        if(!rows.length) throw new ApiError({status:409,code:'CONFLICT',message:'Interruption cannot be recorded for this attempt.'});
        return {body:{recorded:true}};
      });
    },
  },
  // 16. PATCH /api/v1/exams/attempts/:attemptId/flags
  {
    id: 'exams.attempts.flags.patch',
    method: 'PATCH',
    pattern: '/api/v1/exams/attempts/:attemptId/flags',
    auth: 'student',
    maxBodyBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
    handler: async (ctx) => {
      const attemptId = assertValidUuid(ctx.params.attemptId, 'attemptId');
      const { data } = await readBoundedJsonBody(ctx.request, {
        maxBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
        schema: flagExamQuestionSchema,
      });
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();

      const updated = await dbCtx.runCommittedTransaction(async (tx) => {
        const rows = await tx<Array<{ id: string }>>`
          UPDATE attempt_questions aq
          SET is_flagged = ${data.isFlagged}
          FROM attempts a
          WHERE aq.attempt_id = a.id
            AND a.id = ${attemptId}::uuid
            AND a.user_id = ${actor.userId}::uuid
            AND a.status = 'in_progress' AND a.mode='mock' AND a.expires_at>${ctx.now.toISOString()}::timestamptz
            AND aq.question_id = ${data.questionId}::uuid
          RETURNING aq.id
        `;
        return rows;
      });

      if (updated.length === 0) {
        throw new ApiError({
          status: 404,
          code: 'NOT_FOUND',
          message: 'Active attempt question not found for current user.',
        });
      }

      return {
        status: 200,
        body: {
          attemptId,
          questionId: data.questionId,
          isFlagged: data.isFlagged,
        },
      };
    },
  },

  // 17. POST /api/v1/exams/attempts/:attemptId/submit
  {
    id: 'exams.attempts.submit',
    method: 'POST',
    pattern: '/api/v1/exams/attempts/:attemptId/submit',
    auth: 'student',
    maxBodyBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
    idempotency: 'required',
    handler: async (ctx) => {
      const attemptId = assertValidUuid(ctx.params.attemptId, 'attemptId');
      const rawText = await readBoundedTextBody(ctx.request, BODY_LIMIT_SMALL_WRITE_BYTES);
      const actor = ctx.actor!;

      return await runWithIdempotency(
        ctx,
        `exams.attempts.submit:${attemptId}`,
        true,
        rawText || attemptId,
        async (ctx) => {
          const dbCtx = ctx.getDb();
          const scored = await submitAndScoreExamAttemptAtomic(dbCtx, {
            attemptId,
            userId: actor.userId,
            serverSubmittedAt: ctx.now.toISOString(),
          });

          // Enqueue mock result breakdown email in background outbox
          if (actor.email && actor.email.includes('@')) {
            try {
              const profileRows = await dbCtx.sql<Array<{ display_name: string | null }>>`
                SELECT display_name FROM public.profiles WHERE id = ${actor.userId}::uuid LIMIT 1
              `;
              const studentName = profileRows[0]?.display_name?.trim() || actor.email.split('@')[0];
              const frozenSubjects = await dbCtx.sql<Array<{ code: string; name: string; count: number }>>`
                SELECT snapshot->>'subjectCode' AS code,
                  COALESCE(MAX(snapshot->>'subjectName'), snapshot->>'subjectCode') AS name,
                  COUNT(*)::int AS count
                FROM attempt_questions WHERE attempt_id = ${attemptId}::uuid
                GROUP BY snapshot->>'subjectCode'
                ORDER BY CASE WHEN snapshot->>'subjectCode' = 'ENG' THEN 0 ELSE 1 END, MIN(position)
              `;
              const rawScores = [scored.englishScore, scored.subject2Score, scored.subject3Score, scored.subject4Score];
              const subjectScores = frozenSubjects.map((s, idx) => ({
                subject: s.name,
                score: rawScores[idx] ?? 0,
                maxScore: 100,
                correct: Math.round(((rawScores[idx] ?? 0) / 100) * s.count),
                total: s.count,
              }));

              await enqueueLifecycleEmail(dbCtx.sql, {
                userId: actor.userId,
                emailType: 'mock_result',
                recipientEmail: actor.email,
                recipientName: studentName,
                subject: `Your UTME Mock Result: ${scored.totalScore}/400 • Performance Breakdown`,
                payload: {
                  studentName,
                  attemptId,
                  totalScore: scored.totalScore,
                  maxTotalScore: 400,
                  englishScore: scored.englishScore,
                  subjectScores,
                  totalCorrect: scored.totalCorrect,
                  totalAnswered: scored.totalAnsweredTimely,
                  timeSpentSeconds: scored.timeSpentSeconds,
                  resultUrl: `https://jambprep.lecterniq.com/mock/result?attemptId=${attemptId}`,
                },
                referenceId: `mock_result:${attemptId}`,
              });
            } catch (queueErr) {
              console.warn('[exams.attempts.submit] Mock result email enqueue notice:', queueErr);
            }
          }

          return {
            status: 200,
            body: scored,
          };
        }
      );
    },
  },

  // 18. GET /api/v1/exams/attempts/:attemptId/results
  {
    id: 'exams.attempts.results.get',
    method: 'GET',
    pattern: '/api/v1/exams/attempts/:attemptId/results',
    auth: 'student',
    handler: async (ctx) => {
      const attemptId = assertValidUuid(ctx.params.attemptId, 'attemptId');
      const actor = ctx.actor!;
      const dbCtx = ctx.getDb();

      const rows = await dbCtx.sql<
        Array<{
          attempt_id: string;
          user_id: string;
          total_score: number;
          english_score: number;
          subject_2_score: number;
          subject_3_score: number;
          subject_4_score: number;
          time_spent_seconds: number;
          created_at: string | Date;
        }>
      >`
        SELECT
          ar.attempt_id,
          a.user_id,
          ar.total_score,
          ar.english_score,
          ar.subject2_score AS subject_2_score,
          ar.subject3_score AS subject_3_score,
          ar.subject4_score AS subject_4_score,
          ar.time_spent_seconds,
          ar.created_at
        FROM attempts a
        LEFT JOIN attempt_results ar ON ar.attempt_id = a.id
        WHERE a.id = ${attemptId}::uuid AND a.user_id=${actor.userId}::uuid
        LIMIT 1
      `;

      const row = rows[0];
      if (!row) {
        throw new ApiError({
          status: 404,
          code: 'NOT_FOUND',
          message: 'Exam attempt not found.',
        });
      }
      if (row.user_id.toLowerCase() !== actor.userId.toLowerCase()) {
        throw new ApiError({
          status: 403,
          code: 'FORBIDDEN_NOT_OWNER',
          message: 'You do not own this exam attempt.',
        });
      }
      if (row.total_score === null || row.total_score === undefined) {
        throw new ApiError({
          status: 409,
          code: 'ATTEMPT_NOT_ACTIVE',
          message: 'Results are not yet finalized for this exam attempt.',
        });
      }

      const frozenSubjects = await dbCtx.sql<Array<{code:string;name:string;count:number}>>`
        SELECT snapshot->>'subjectCode' AS code,
          COALESCE(MAX(snapshot->>'subjectName'), snapshot->>'subjectCode') AS name,
          COUNT(*)::int AS count
        FROM attempt_questions WHERE attempt_id=${attemptId}::uuid
        GROUP BY snapshot->>'subjectCode'
        ORDER BY CASE WHEN snapshot->>'subjectCode'='ENG' THEN 0 ELSE 1 END, MIN(position)
      `;
      const scores=[row.english_score,row.subject_2_score,row.subject_3_score,row.subject_4_score];
      return {
        status: 200,
        body: {
          subjectScores:frozenSubjects.map((subject,index)=>({...subject,score:scores[index]})),
          attemptId: row.attempt_id,
          totalScore: row.total_score,
          englishScore: row.english_score,
          subject2Score: row.subject_2_score,
          subject3Score: row.subject_3_score,
          subject4Score: row.subject_4_score,
          timeSpentSeconds: row.time_spent_seconds,
          completedAt: new Date(row.created_at).toISOString(),
        },
      };
    },
  },

  {
    id: 'exams.attempts.review.get', method: 'GET', pattern: '/api/v1/exams/attempts/:attemptId/review', auth: 'student',
    handler: async (ctx) => {
      const attemptId = assertValidUuid(ctx.params.attemptId, 'attemptId');
      const db = ctx.getDb();
      const status = await getUserSubscriptionStatus(db.sql, ctx.actor!.userId, ctx.now);
      if (!status.isPremium) throw new ApiError({status:403,code:'FORBIDDEN',message:'Premium is required for detailed review.'});
      const owned = await db.sql`SELECT id FROM attempts WHERE id=${attemptId}::uuid AND user_id=${ctx.actor!.userId}::uuid AND mode='mock' AND status='completed' LIMIT 1`;
      if (!owned.length) throw new ApiError({status:404,code:'NOT_FOUND',message:'Completed exam not found.'});
      const questions = await db.sql`SELECT aq.snapshot AS question, aq.correct_option_id AS "correctOptionId", aq.frozen_explanation AS explanation, aa.selected_option_id AS "selectedOptionId" FROM attempt_questions aq LEFT JOIN attempt_answers aa ON aa.attempt_id=aq.attempt_id AND aa.question_id=aq.question_id WHERE aq.attempt_id=${attemptId}::uuid ORDER BY aq.position`;
      return {status:200,body:{questions:questions.map(row=>({...row.question as Record<string, unknown>,correctOption:((row.question as {options:{id:string;label:string}[]}).options.find(option=>option.id===row.correctOptionId)?.label ?? 'Unavailable'),selectedOption:((row.question as {options:{id:string;label:string}[]}).options.find(option=>option.id===row.selectedOptionId)?.label ?? null),explanation:row.explanation}))}};
    },
  },

  // 19. POST /api/v1/payments/checkout
  {
    id: 'payments.checkout.post',
    method: 'POST',
    pattern: '/api/v1/payments/checkout',
    auth: 'student_live_session',
    maxBodyBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
    idempotency: 'required',
    handler: async (ctx) => {
      await readBoundedJsonBody(ctx.request, { maxBytes: BODY_LIMIT_SMALL_WRITE_BYTES });
      const key = extractIdempotencyKey(ctx.request, { required: true })!;
      return { status: 201, body: await initializeCheckout(ctx.getDb(), ctx.env, ctx.actor!.userId, ctx.actor!.email ?? '', key, ctx.now, ctx.hooks?.fetchImpl) };
    },
  },

  // 20. POST /api/v1/payments/verify
  {
    id: 'payments.verify.post',
    method: 'POST',
    pattern: '/api/v1/payments/verify',
    auth: 'student_live_session',
    maxBodyBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
    idempotency: 'required',
    handler: async (ctx) => {
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: BODY_LIMIT_SMALL_WRITE_BYTES, schema: paymentVerifySchema });
      extractIdempotencyKey(ctx.request, { required: true });
      return { status: 200, body: await verifyOwnedPayment(ctx.getDb(), ctx.env, ctx.actor!.userId, data.reference, ctx.now, ctx.hooks?.fetchImpl) };
    },
  },

  // 21. POST /api/v1/payments/subscription/cancel
  {
    id: 'payments.subscription.cancel',
    method: 'POST',
    pattern: '/api/v1/payments/subscription/cancel',
    auth: 'student_live_session',
    maxBodyBytes: BODY_LIMIT_SMALL_WRITE_BYTES,
    idempotency: 'required',
    handler: async (ctx) => {
      await readBoundedJsonBody(ctx.request, { maxBytes: BODY_LIMIT_SMALL_WRITE_BYTES });
      extractIdempotencyKey(ctx.request, { required: true });
      return { status: 200, body: await cancelOwnedSubscription(ctx.getDb(), ctx.env, ctx.actor!.userId, ctx.now, ctx.hooks?.fetchImpl) };
    },
  },

  // 22. POST /api/v1/webhooks/paystack (+ legacy alias POST /api/webhooks/paystack)
  {
    id: 'webhooks.paystack',
    method: 'POST',
    pattern: '/api/v1/webhooks/paystack',
    auth: 'webhook',
    maxBodyBytes: BODY_LIMIT_WEBHOOK_BYTES,
    handler: handlePaystackWebhook,
  },
  {
    id: 'webhooks.paystack.legacy',
    method: 'POST',
    pattern: '/api/webhooks/paystack',
    auth: 'webhook',
    maxBodyBytes: BODY_LIMIT_WEBHOOK_BYTES,
    handler: handlePaystackWebhook,
  },

  // Student Question Reporting (Practice / Mock / Review)
  {
    id: 'reports.question.create',
    method: 'POST',
    pattern: '/api/v1/reports/question',
    auth: 'student_live_session',
    handler: async (ctx) => {
      const { data: item } = await readBoundedJsonBody(ctx.request, {
        schema: questionReportCreateSchema,
      });

      const dbCtx = ctx.getDb();
      const questionRows = await dbCtx.sql<Array<{ id: string }>>`
        SELECT id FROM questions WHERE id = ${item.questionId}::uuid LIMIT 1
      `;
      if (questionRows.length === 0) {
        throw new ApiError({
          status: 404,
          code: 'QUESTION_NOT_FOUND',
          message: 'Question not found.',
        });
      }

      if (item.attemptId) {
        const owned = await dbCtx.sql`SELECT a.id FROM attempts a JOIN attempt_questions aq ON aq.attempt_id=a.id WHERE a.id=${item.attemptId}::uuid AND a.user_id=${ctx.actor!.userId}::uuid AND aq.question_id=${item.questionId}::uuid LIMIT 1`;
        if (!owned.length) throw new ApiError({status:404,code:'NOT_FOUND',message:'This question was not found in your attempt.'});
      }
      const reportRows = await dbCtx.sql<Array<{ id: string }>>`
        INSERT INTO question_reports (
          question_id,
          reporter_user_id,
          attempt_id,
          reason,
          comment,
          status
        )
        VALUES (
          ${item.questionId}::uuid,
          ${ctx.actor!.userId}::uuid,
          ${item.attemptId ? item.attemptId : null}::uuid,
          ${item.reason},
          ${item.comment ?? null},
          'open'
        )
        RETURNING id
      `;

      return {
        status: 201,
        body: { success: true, reportId: reportRows[0].id },
      };
    },
  },

  // 23. GET /api/v1/admin/overview
  {
    id: 'admin.overview.get',
    method: 'GET',
    pattern: '/api/v1/admin/overview',
    auth: 'admin',
    handler: async (ctx) => {
      const dbCtx = ctx.getDb();
      const rows = await dbCtx.sql<
        Array<{
          total_students: number;
          total_published_questions: number;
          total_draft_questions?: number;
          total_reviewed_questions?: number;
          total_archived_questions?: number;
          total_completed_attempts: number;
          pending_reports?: number;
        }>
      >`
        SELECT
          (SELECT COUNT(*)::int FROM profiles WHERE role = 'student') AS total_students,
          (SELECT COUNT(*)::int FROM questions WHERE status = 'published') AS total_published_questions,
          (SELECT COUNT(*)::int FROM questions WHERE status = 'draft') AS total_draft_questions,
          (SELECT COUNT(*)::int FROM questions WHERE status = 'reviewed') AS total_reviewed_questions,
          (SELECT COUNT(*)::int FROM questions WHERE status = 'archived') AS total_archived_questions,
          (SELECT COUNT(*)::int FROM attempts WHERE status = 'completed') AS total_completed_attempts,
          (SELECT COUNT(*)::int FROM question_reports WHERE status = 'open' OR status = 'investigating') AS pending_reports
      `;

      let subjectRows: Array<{
        code: string;
        name: string;
        is_compulsory: boolean;
        published_count: number;
        draft_count: number;
        total_count: number;
      }> = [];
      subjectRows = await dbCtx.sql<typeof subjectRows>`
          SELECT
            s.code,
            s.name,
            s.is_compulsory,
            COUNT(CASE WHEN q.status = 'published' THEN 1 END)::int AS published_count,
            COUNT(CASE WHEN q.status = 'draft' THEN 1 END)::int AS draft_count,
            COUNT(q.id)::int AS total_count
          FROM subjects s
          LEFT JOIN questions q ON q.subject_id = s.id
          GROUP BY s.id, s.code, s.name, s.is_compulsory, s.display_order
          ORDER BY s.display_order ASC, s.code ASC
        `;

      const m = rows[0] ?? {
        total_students: 0,
        total_published_questions: 0,
        total_draft_questions: 0,
        total_reviewed_questions: 0,
        total_archived_questions: 0,
        total_completed_attempts: 0,
        pending_reports: 0,
      };

      return {
        status: 200,
        body: {
          adminUserId: ctx.adminActor!.userId,
          metrics: {
            total_students: m.total_students ?? 0,
            total_published_questions: m.total_published_questions ?? 0,
            total_draft_questions: m.total_draft_questions ?? 0,
            total_reviewed_questions: m.total_reviewed_questions ?? 0,
            total_archived_questions: m.total_archived_questions ?? 0,
            total_completed_attempts: m.total_completed_attempts ?? 0,
            pending_reports: m.pending_reports ?? 0,
            total_questions:
              (m.total_published_questions || 0) +
              (m.total_draft_questions || 0) +
              (m.total_reviewed_questions || 0) +
              (m.total_archived_questions || 0),
          },
          subjects: subjectRows ?? [],
        },
      };
    },
  },

  // 24. GET /api/v1/admin/questions (Paginated with Subject/Topic/Status/Difficulty/Search Filters)
  {
    id: 'admin.questions.get',
    method: 'GET',
    pattern: '/api/v1/admin/questions',
    auth: 'admin',
    handler: async (ctx) => {
      const dbCtx = ctx.getDb();
      const page = Math.max(1, parseInt(ctx.url.searchParams.get('page') || '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(ctx.url.searchParams.get('limit') || '25', 10) || 25));
      const offset = (page - 1) * limit;

      const subject = ctx.url.searchParams.get('subject')?.trim().toUpperCase() || null;
      const rawTopic = ctx.url.searchParams.get('topic')?.trim() || null;
      const topic = rawTopic && UUID_V1_TO_V5_REGEX.test(rawTopic) ? rawTopic : null;
      const rawStatus = ctx.url.searchParams.get('status')?.trim() || null;
      const status = rawStatus && ['draft', 'reviewed', 'published', 'archived'].includes(rawStatus) ? rawStatus : null;
      const rawDiff = ctx.url.searchParams.get('difficulty')?.trim() || null;
      const difficulty = rawDiff && ['easy', 'medium', 'hard'].includes(rawDiff) ? rawDiff : null;
      const year = ctx.url.searchParams.get('year') ? parseInt(ctx.url.searchParams.get('year')!, 10) : null;
      if (rawTopic && !UUID_V1_TO_V5_REGEX.test(rawTopic)) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Invalid topic filter.'});
      if (rawStatus && !status) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Invalid status filter.'});
      if (rawDiff && !difficulty) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Invalid difficulty filter.'});
      if (year !== null && (!Number.isInteger(year) || year < 1978 || year > 2100)) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Invalid year filter.'});
      const search = ctx.url.searchParams.get('search')?.trim() || null;
      if (search && search.length > 200) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Search must be 200 characters or fewer.'});
      if (!Number.isSafeInteger(offset) || offset > 1000000) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Page is outside the supported range.'});

      const rows = await dbCtx.sql<
        Array<{
          id: string;
          subject_code: string;
          subject_name: string;
          topic_id: string;
          topic_title: string;
          stem: string;
          image_url: string | null;
          difficulty: string;
          status: string;
          exam_year: number | null;
          created_at: string;
          options: Array<{ id: string; label: string; content: string; is_correct: boolean }>;
          explanation: string | null;
          total_count: number;
        }>
      >`
        WITH filtered AS (
          SELECT
            q.id,
            s.code AS subject_code,
            s.name AS subject_name,
            q.topic_id,
            t.title AS topic_title,
            q.stem,
            q.image_url,
            q.difficulty,
            q.status,
            q.exam_year,
            q.created_at
          FROM questions q
          INNER JOIN subjects s ON s.id = q.subject_id
          INNER JOIN topics t ON t.id = q.topic_id
          WHERE
            (${subject}::text IS NULL OR s.code = ${subject})
            AND (${topic}::uuid IS NULL OR q.topic_id = ${topic}::uuid)
            AND (${status}::text IS NULL OR q.status = ${status}::question_status)
            AND (${difficulty}::text IS NULL OR q.difficulty = ${difficulty}::difficulty_level)
            AND (${year}::int IS NULL OR q.exam_year = ${year})
            AND (${search}::text IS NULL OR q.stem ILIKE '%' || ${search} || '%')
        ),
        counted AS (
          SELECT COUNT(*)::int AS total FROM filtered
        )
        SELECT
          f.*,
          c.total AS total_count,
          COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', qo.id,
                  'label', qo.label,
                  'content', qo.content,
                  'is_correct', qo.is_correct
                ) ORDER BY qo.label
              )
              FROM question_options qo
              WHERE qo.question_id = f.id
            ),
            '[]'::jsonb
          ) AS options,
          (
            SELECT qe.explanation
            FROM question_explanations qe
            WHERE qe.question_id = f.id
            LIMIT 1
          ) AS explanation
        FROM filtered f
        CROSS JOIN counted c
        ORDER BY f.subject_code, f.topic_title, f.created_at DESC, f.id
        LIMIT ${limit} OFFSET ${offset}
      `;

      const total = rows.length > 0 ? (rows[0].total_count ?? 0) : Number((await dbCtx.sql`SELECT count(*)::int AS total FROM questions q JOIN subjects s ON s.id=q.subject_id JOIN topics t ON t.id=q.topic_id WHERE (${subject}::text IS NULL OR s.code=${subject}) AND (${topic}::uuid IS NULL OR q.topic_id=${topic}::uuid) AND (${status}::text IS NULL OR q.status::text=${status}) AND (${difficulty}::text IS NULL OR q.difficulty::text=${difficulty}) AND (${year}::int IS NULL OR q.exam_year=${year}) AND (${search}::text IS NULL OR q.stem ILIKE '%' || ${search} || '%')`)[0]?.total ?? 0);
      const totalPages = Math.ceil(total / limit) || 1;

      return {
        status: 200,
        body: {
          questions: rows.map((r) => ({
            id: r.id,
            subject_code: r.subject_code,
            subject_name: r.subject_name,
            topic_id: r.topic_id,
            topic_title: r.topic_title,
            stem: r.stem,
            image_url: r.image_url,
            difficulty: r.difficulty,
            status: r.status,
            exam_year: r.exam_year,
            created_at: r.created_at,
            options: r.options ?? [],
            explanation: r.explanation,
          })),
          pagination: {
            total,
            page,
            limit,
            totalPages,
          },
        },
      };
    },
  },

  // GET /api/v1/admin/questions/:questionId
  {
    id: 'admin.questions.detail.get',
    method: 'GET',
    pattern: '/api/v1/admin/questions/:questionId',
    auth: 'admin',
    handler: async (ctx) => {
      const dbCtx = ctx.getDb();
      const questionId = assertValidUuid(ctx.params.questionId, 'questionId');

      const rows = await dbCtx.sql<
        Array<{
          id: string;
          subject_id: string;
          subject_code: string;
          subject_name: string;
          topic_id: string;
          topic_title: string;
          stem: string;
          image_url: string | null;
          difficulty: string;
          status: string;
          exam_year: number | null;
          passage_id: string | null;
          passage_title: string | null;
          passage_content: string | null;
          created_at: string;
          options: Array<{ id: string; label: string; content: string; is_correct: boolean }>;
          explanation: string | null;
        }>
      >`
        SELECT
          q.id, q.editorial_revision,
          (SELECT to_jsonb(m) FROM question_editorial_metadata m WHERE m.question_id=q.id) AS editorial_metadata,
          q.subject_id,
          s.code AS subject_code,
          s.name AS subject_name,
          q.topic_id,
          t.title AS topic_title,
          q.stem,
          q.image_url,
          q.difficulty,
          q.status,
          q.exam_year,
          q.passage_id,
          p.title AS passage_title,
          p.content AS passage_content,
          q.created_at,
          COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'id', qo.id,
                  'label', qo.label,
                  'content', qo.content,
                  'is_correct', qo.is_correct
                ) ORDER BY qo.label
              )
              FROM question_options qo
              WHERE qo.question_id = q.id
            ),
            '[]'::jsonb
          ) AS options,
          (
            SELECT qe.explanation
            FROM question_explanations qe
            WHERE qe.question_id = q.id
            LIMIT 1
          ) AS explanation
        FROM questions q
        INNER JOIN subjects s ON s.id = q.subject_id
        INNER JOIN topics t ON t.id = q.topic_id
        LEFT JOIN passages p ON p.id = q.passage_id
        WHERE q.id = ${questionId}::uuid
        LIMIT 1
      `;

      if (rows.length === 0) {
        throw new ApiError({
          status: 404,
          code: 'QUESTION_NOT_FOUND',
          message: 'Question not found.',
        });
      }

      return {
        status: 200,
        body: { question: rows[0] },
      };
    },
  },

  // POST /api/v1/admin/questions (Create question)
  {
    id: 'admin.questions.create',
    method: 'POST',
    pattern: '/api/v1/admin/questions',
    auth: 'admin',
    idempotency: 'required',
    handler: async (ctx) => {
      const { rawText, data: item } = await readBoundedJsonBody(ctx.request, {
        schema: questionUpsertSchema,
      });

      return runWithIdempotency(ctx, 'admin.questions.create', true, rawText, async (ctx) => {
      const dbCtx = ctx.getDb();
      let questionId = '';

      await dbCtx.runSerializableTransaction(async (tx) => {
        const subRows = await tx<Array<{ id: string }>>`
          SELECT id FROM subjects WHERE code = ${item.subjectCode} AND (${item.status ?? 'draft'} <> 'published' OR is_active) LIMIT 1 FOR UPDATE
        `;
        const subject = subRows[0];
        if (!subject) {
          throw new ApiError({
            status: 422,
            code: 'VALIDATION_FAILED',
            message: `Subject code '${item.subjectCode}' not found.`,
          });
        }

        const topicSlug = item.topicTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        let topicRows = await tx<Array<{ id: string }>>`
          SELECT id FROM topics WHERE subject_id=${subject.id}::uuid AND (${item.topicId??null}::uuid IS NULL OR id=${item.topicId??null}::uuid) AND (${item.topicId??null}::uuid IS NOT NULL OR slug=${topicSlug} OR title=${item.topicTitle} OR id IN (SELECT m.topic_id FROM curriculum_topic_mappings m WHERE EXISTS(SELECT 1 FROM jsonb_array_elements_text(m.aliases) a WHERE lower(a)=lower(${item.topicTitle})))) ORDER BY id LIMIT 2
        `;
        if (!topicRows.length) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Choose an existing canonical topic. Add new topics in Curriculum.'});
        if (topicRows.length>1) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Ambiguous topic. Use its unique canonical slug.'});
        const topicId = topicRows[0].id;

        let passageId: string | null = null;
        if (item.reusePassageId) {
          const [passage] = await tx`SELECT id FROM passages WHERE id=${item.reusePassageId}::uuid AND subject_id=${subject.id}::uuid`;
          if (!passage) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Choose a passage belonging to this subject.'});
          passageId = String(passage.id);
        } else if (item.passageContent && item.passageContent.trim().length > 0) {
          const passageRows = await tx<Array<{ id: string }>>`
            INSERT INTO passages (subject_id, title, content)
            VALUES (${subject.id}::uuid, ${item.passageTitle ?? null}, ${item.passageContent})
            RETURNING id
          `;
          passageId = passageRows[0].id;
        }

        const questionRows = await tx<Array<{ id: string }>>`
          INSERT INTO questions (
            subject_id,
            topic_id,
            passage_id,
            stem,
            image_url,
            difficulty,
            exam_year,
            status
          )
          VALUES (
            ${subject.id}::uuid,
            ${topicId}::uuid,
            ${passageId}::uuid,
            ${item.stem},
            ${item.imageUrl ?? null},
            ${item.difficulty},
            ${item.examYear ?? null},
            ${item.status}
          )
          RETURNING id
        `;
        questionId = questionRows[0].id;

        const options = ['A', 'B', 'C', 'D'].map((label) => ({
          label,
          content: item.options[label as 'A' | 'B' | 'C' | 'D'],
          correct: item.correctOption === label,
        }));
        await tx`
          INSERT INTO question_options(question_id, label, content, is_correct)
          SELECT ${questionId}::uuid, x.label, x.content, x.correct
          FROM jsonb_to_recordset(${JSON.stringify(options)}::text::jsonb) AS x(label text, content text, correct boolean)
        `;

        await tx`
          INSERT INTO question_explanations (question_id, explanation, verified_by)
          VALUES (
            ${questionId}::uuid,
            ${item.explanation},
            ${ctx.adminActor?.userId ?? null}::uuid
          )
        `;
        await saveEditorialMetadata(tx, questionId, item);
        await recordQuestionHistory(tx, questionId, ctx.actor!.userId, 'question.created');
      });

      return {
        status: 201 as const,
        body: { success: true, questionId },
      };
      });
    },
  },

  // PUT /api/v1/admin/questions/:questionId (Update question)
  {
    id: 'admin.questions.update',
    method: 'PUT',
    pattern: '/api/v1/admin/questions/:questionId',
    auth: 'admin',
    idempotency: 'required',
    handler: async (ctx) => {
      const questionId = assertValidUuid(ctx.params.questionId, 'questionId');
      const { rawText, data: item } = await readBoundedJsonBody(ctx.request, {
        schema: questionUpsertSchema,
      });

      return runWithIdempotency(ctx, 'admin.questions.update', true, rawText, async (ctx) => {
      const dbCtx = ctx.getDb();
      await dbCtx.runSerializableTransaction(async (tx) => {
        const existing = await tx<Array<{ id: string; passage_id: string | null; editorial_revision: number }>>`
          SELECT id, passage_id, editorial_revision FROM questions WHERE id = ${questionId}::uuid LIMIT 1 FOR UPDATE
        `;
        if (existing.length === 0) {
          throw new ApiError({
            status: 404,
            code: 'QUESTION_NOT_FOUND',
            message: 'Question not found.',
          });
        }

        if (!item.expectedRevision) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Reload the question before saving.'});
        if (existing[0].editorial_revision !== item.expectedRevision) throw new ApiError({status:409,code:'CONFLICT',message:'Another administrator changed this question. Your edits are retained; reload and compare before saving.'});
        await recordQuestionHistory(tx, questionId, ctx.actor!.userId, 'question.baseline');
        const subRows = await tx<Array<{ id: string }>>`
          SELECT id FROM subjects WHERE code = ${item.subjectCode} AND (${item.status ?? 'draft'} <> 'published' OR is_active) LIMIT 1 FOR UPDATE
        `;
        if (subRows.length === 0) {
          throw new ApiError({
            status: 422,
            code: 'VALIDATION_FAILED',
            message: `Subject code '${item.subjectCode}' not found.`,
          });
        }
        const subjectId = subRows[0].id;

        const topicSlug = item.topicTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        let topicRows = await tx<Array<{ id: string }>>`
          SELECT id FROM topics WHERE subject_id=${subjectId}::uuid AND (${item.topicId??null}::uuid IS NULL OR id=${item.topicId??null}::uuid) AND (${item.topicId??null}::uuid IS NOT NULL OR slug=${topicSlug} OR title=${item.topicTitle} OR id IN (SELECT m.topic_id FROM curriculum_topic_mappings m WHERE EXISTS(SELECT 1 FROM jsonb_array_elements_text(m.aliases) a WHERE lower(a)=lower(${item.topicTitle})))) ORDER BY id LIMIT 2
        `;
        if (!topicRows.length) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Choose an existing canonical topic. Add new topics in Curriculum.'});
        if (topicRows.length>1) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Ambiguous topic. Use its unique canonical slug.'});
        const topicId = topicRows[0].id;

        let passageId: string | null = null;
        if (item.reusePassageId) {
          const [passage] = await tx`SELECT id FROM passages WHERE id=${item.reusePassageId}::uuid AND subject_id=${subjectId}::uuid`;
          if (!passage) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Choose a passage belonging to this subject.'});
          passageId = String(passage.id);
        } else if (item.passageContent?.trim()) {
          const rows = await tx<Array<{id:string}>>`INSERT INTO passages(subject_id,title,content) VALUES (${subjectId}::uuid,${item.passageTitle ?? null},${item.passageContent}) RETURNING id`;
          passageId = rows[0].id;
        }

        await tx`
          UPDATE questions
          SET
            editorial_revision = editorial_revision + 1,
            subject_id = ${subjectId}::uuid,
            topic_id = ${topicId}::uuid,
            passage_id = ${passageId}::uuid,
            stem = ${item.stem},
            image_url = ${item.imageUrl ?? null},
            difficulty = ${item.difficulty},
            exam_year = ${item.examYear ?? null},
            status = ${item.status}
          WHERE id = ${questionId}::uuid
        `;

        const options = ['A', 'B', 'C', 'D'].map((label) => ({
          label,
          content: item.options[label as 'A' | 'B' | 'C' | 'D'],
          correct: item.correctOption === label,
        }));
        await tx`
          WITH incoming AS (
            SELECT x.label, x.content, x.correct
            FROM jsonb_to_recordset(${JSON.stringify(options)}::text::jsonb) AS x(label text, content text, correct boolean)
          ),
          updated AS (
            UPDATE question_options qo
            SET content = i.content, is_correct = i.correct
            FROM incoming i
            WHERE qo.question_id = ${questionId}::uuid AND qo.label = i.label
            RETURNING qo.label
          )
          INSERT INTO question_options (question_id, label, content, is_correct)
          SELECT ${questionId}::uuid, i.label, i.content, i.correct
          FROM incoming i
          WHERE NOT EXISTS (SELECT 1 FROM updated u WHERE u.label = i.label)
        `;

        await tx`
          INSERT INTO question_explanations (question_id, explanation, verified_by)
          VALUES (${questionId}::uuid, ${item.explanation}, ${ctx.adminActor?.userId ?? null}::uuid)
          ON CONFLICT (question_id) DO UPDATE
          SET explanation = EXCLUDED.explanation, verified_by = EXCLUDED.verified_by
        `;
        await saveEditorialMetadata(tx, questionId, item);
        await recordQuestionHistory(tx, questionId, ctx.actor!.userId, 'question.edited');
      });

      return {
        status: 200 as const,
        body: { success: true, questionId },
      };
      });
    },
  },

  // PATCH /api/v1/admin/questions/:questionId/status (Quick lifecycle update)
  {
    id: 'admin.questions.status.patch',
    method: 'PATCH',
    pattern: '/api/v1/admin/questions/:questionId/status',
    auth: 'admin',
    handler: async (ctx) => {
      const questionId = assertValidUuid(ctx.params.questionId, 'questionId');
      const { data: body } = await readBoundedJsonBody(ctx.request, {
        schema: questionStatusUpdateSchema,
      });

      const dbCtx = ctx.getDb();
      const updated = await dbCtx.runSerializableTransaction(async tx => {
        if (body.status === 'published') {
          const valid = await tx`SELECT q.id FROM questions q JOIN subjects s ON s.id=q.subject_id JOIN topics t ON t.id=q.topic_id AND t.subject_id=q.subject_id WHERE q.id=${questionId}::uuid AND s.is_active AND length(trim(q.stem))>=5 AND (SELECT count(*) FROM question_options o WHERE o.question_id=q.id)=4 AND (SELECT count(DISTINCT label) FROM question_options o WHERE o.question_id=q.id AND label IN ('A','B','C','D') AND length(trim(content))>0)=4 AND (SELECT count(*) FROM question_options o WHERE o.question_id=q.id AND o.is_correct)=1 AND EXISTS(SELECT 1 FROM question_editorial_metadata m WHERE m.question_id=q.id AND length(trim(m.source_reference))>0 AND (length(trim(m.rights_note))>0 OR m.source_type='past_question') AND (q.image_url IS NULL OR length(trim(m.image_alt))>0)) AND NOT EXISTS(SELECT 1 FROM curriculum_topic_mappings cm WHERE cm.topic_id=q.topic_id AND cm.reviewed_at IS NULL) AND EXISTS(SELECT 1 FROM question_editorial_metadata pm WHERE pm.question_id=q.id AND (pm.source_type<>'past_question' OR (q.exam_year IS NOT NULL AND q.exam_year<=EXTRACT(YEAR FROM CURRENT_DATE)))) AND EXISTS(SELECT 1 FROM question_explanations e WHERE e.question_id=q.id AND length(trim(e.explanation))>=5) FOR UPDATE OF q`;
          if (!valid.length) throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Publishing requires an active subject, matching topic, four options, one correct answer and an explanation.'});
        }
        const changed = await tx<Array<{ id: string; status: string }>>`
        UPDATE questions
        SET status = ${body.status}::question_status, editorial_revision = editorial_revision + 1
        WHERE id = ${questionId}::uuid
        RETURNING id, status
      `;
        if (changed.length) await recordQuestionHistory(tx, questionId, ctx.actor!.userId, 'question.status');
        return changed;
      });

      if (updated.length === 0) {
        throw new ApiError({
          status: 404,
          code: 'QUESTION_NOT_FOUND',
          message: 'Question not found.',
        });
      }

      return {
        status: 200,
        body: { success: true, questionId, status: updated[0].status },
      };
    },
  },

  // GET /api/v1/admin/curriculum (Active database subjects & official 25-subject catalogue)
  {
    id: 'admin.curriculum.get',
    method: 'GET',
    pattern: '/api/v1/admin/curriculum',
    auth: 'admin',
    handler: async (ctx) => {
      const dbCtx = ctx.getDb();

      let subjectRows: Array<{
        id: string;
        code: string;
        name: string;
        is_compulsory: boolean;
        is_active: boolean;
        display_order: number;
        topics: Array<{
          id: string;
          title: string;
          slug: string;
          total_questions: number;
          published_questions: number;
          draft_questions: number;
        }>;
        total_questions: number;
        published_questions: number;
      }> = [];

      subjectRows = await dbCtx.sql<typeof subjectRows>`
        WITH topic_counts AS (
          SELECT topic_id,COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='published')::int AS published,COUNT(*) FILTER(WHERE status='draft')::int AS draft FROM questions GROUP BY topic_id
        ), subject_counts AS (
          SELECT subject_id,COUNT(*)::int AS total,COUNT(*) FILTER(WHERE status='published')::int AS published FROM questions GROUP BY subject_id
        )
        SELECT s.id,s.code,s.name,s.is_compulsory,s.is_active,s.display_order,
          COALESCE((SELECT jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'slug',t.slug,'total_questions',COALESCE(c.total,0),'published_questions',COALESCE(c.published,0),'draft_questions',COALESCE(c.draft,0)) ORDER BY t.display_order,t.title,t.id) FROM topics t LEFT JOIN topic_counts c ON c.topic_id=t.id WHERE t.subject_id=s.id),'[]'::jsonb) AS topics,
          COALESCE(sc.total,0) AS total_questions,COALESCE(sc.published,0) AS published_questions
        FROM subjects s LEFT JOIN subject_counts sc ON sc.subject_id=s.id ORDER BY s.display_order,s.code
      `;

      return {
        status: 200,
        body: {
          activeSubjects: subjectRows,
          officialCatalogue: OFFICIAL_JAMB_SYLLABUS_CATALOGUE,
        },
      };
    },
  },

  // GET /api/v1/admin/reports (Moderation queue)
  {
    id: 'admin.reports.get',
    method: 'GET',
    pattern: '/api/v1/admin/reports',
    auth: 'admin',
    handler: async (ctx) => {
      const dbCtx = ctx.getDb();
      const page = Math.max(1, parseInt(ctx.url.searchParams.get('page') || '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(ctx.url.searchParams.get('limit') || '25', 10) || 25));
      const offset = (page - 1) * limit;

      const rawStatus = ctx.url.searchParams.get('status')?.trim() || null;
      const status = rawStatus && ['open', 'investigating', 'resolved', 'dismissed'].includes(rawStatus) ? rawStatus : null;
      const subject = ctx.url.searchParams.get('subject')?.trim().toUpperCase() || null;

      const rows = await dbCtx.sql<
        Array<{
          id: string;
          question_id: string;
          reason: string;
          comment: string | null;
          status: string;
          admin_notes: string | null;
          created_at: string;
          stem: string;
          subject_code: string;
          subject_name: string;
          topic_title: string;
          reporter_email: string;
          reporter_display_name: string;
          total_count: number;
        }>
      >`
        WITH filtered AS (
          SELECT
            r.id,
            r.question_id,
            r.reason,
            r.comment,
            r.status,
            r.admin_notes,
            r.created_at,
            q.stem,
            s.code AS subject_code,
            s.name AS subject_name,
            t.title AS topic_title,
            p.email AS reporter_email,
            p.display_name AS reporter_display_name
          FROM question_reports r
          INNER JOIN questions q ON q.id = r.question_id
          INNER JOIN subjects s ON s.id = q.subject_id
          INNER JOIN topics t ON t.id = q.topic_id
          INNER JOIN profiles p ON p.id = r.reporter_user_id
          WHERE
            (${status}::text IS NULL OR r.status = ${status}::report_status)
            AND (${subject}::text IS NULL OR s.code = ${subject})
        ),
        counted AS (
          SELECT COUNT(*)::int AS total FROM filtered
        )
        SELECT f.*, c.total AS total_count
        FROM filtered f
        CROSS JOIN counted c
        ORDER BY f.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const total = rows.length > 0 ? (rows[0].total_count ?? 0) : 0;
      const totalPages = Math.ceil(total / limit) || 1;

      return {
        status: 200,
        body: {
          reports: rows.map((r) => ({
            id: r.id,
            questionId: r.question_id,
            reason: r.reason,
            comment: r.comment,
            status: r.status,
            adminNotes: r.admin_notes,
            createdAt: r.created_at,
            stem: r.stem,
            subjectCode: r.subject_code,
            subjectName: r.subject_name,
            topicTitle: r.topic_title,
            reporterEmail: r.reporter_email,
            reporterDisplayName: r.reporter_display_name,
          })),
          pagination: { total, page, limit, totalPages },
        },
      };
    },
  },

  // PATCH /api/v1/admin/reports/:reportId (Resolve or dismiss report)
  {
    id: 'admin.reports.update',
    method: 'PATCH',
    pattern: '/api/v1/admin/reports/:reportId',
    auth: 'admin',
    handler: async (ctx) => {
      const reportId = assertValidUuid(ctx.params.reportId, 'reportId');
      const { data: body } = await readBoundedJsonBody(ctx.request, {
        schema: questionReportUpdateSchema,
      });

      const dbCtx = ctx.getDb();
      const updated = await dbCtx.runSerializableTransaction(async tx => {
      const changed = await tx<Array<{ id: string; status: string }>>`
        UPDATE question_reports
        SET
          status = ${body.status}::report_status,
          admin_notes = ${body.adminNotes ?? null},
          resolved_by = ${['resolved','dismissed'].includes(body.status)?ctx.adminActor!.userId:null}::uuid,
          resolved_at = ${['resolved','dismissed'].includes(body.status)?ctx.now.toISOString():null}::timestamptz,
          updated_at = ${ctx.now.toISOString()}::timestamptz
        WHERE id = ${reportId}::uuid
        RETURNING id, status
      `;
      if(changed.length) await tx`INSERT INTO admin_audit_events(actor_id,action,entity_id,details) VALUES (${ctx.actor!.userId}::uuid,'report.moderated',${reportId}::uuid,${JSON.stringify({status:body.status})}::text::jsonb)`;
      return changed;
      });

      if (updated.length === 0) {
        throw new ApiError({
          status: 404,
          code: 'REPORT_NOT_FOUND',
          message: 'Question report not found.',
        });
      }

      return {
        status: 200,
        body: { success: true, reportId, status: updated[0].status },
      };
    },
  },

  // POST /api/v1/admin/questions/import/dry-run (CSV/Batch preflight validation)
  {
    id: 'admin.questions.import.dry_run',
    method: 'POST',
    pattern: '/api/v1/admin/questions/import/dry-run',
    auth: 'admin',
    maxBodyBytes: BODY_LIMIT_ADMIN_IMPORT_BYTES,
    handler: async (ctx) => {
      const { data: items } = await readBoundedJsonBody(ctx.request, {
        maxBytes: BODY_LIMIT_ADMIN_IMPORT_BYTES,
        schema: bulkQuestionImportSchema,
        allowArrayRoot: true,
      });

      const dbCtx = ctx.getDb();
      const subjectRows = await dbCtx.sql<Array<{ code: string }>>`
        SELECT code FROM subjects
      `;
      const topicRows = await dbCtx.sql<Array<{code:string;title:string;slug:string;aliases:string[];parent_slug:string|null;parent_title:string|null}>>`SELECT s.code,t.title,t.slug,COALESCE(m.aliases,'[]'::jsonb) AS aliases,(SELECT p.slug FROM topics p WHERE p.id=m.parent_topic_id) AS parent_slug,(SELECT p.title FROM topics p WHERE p.id=m.parent_topic_id) AS parent_title FROM topics t JOIN subjects s ON s.id=t.subject_id LEFT JOIN curriculum_topic_mappings m ON m.topic_id=t.id WHERE s.code=ANY(ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(items.map(i=>i.subjectCode))}::text::jsonb)))`;
      const knownCodes = new Set(subjectRows.map((s) => s.code));

      const validationResults = items.map((item, index) => {
        const errors: string[] = [];
        if (!knownCodes.has(item.subjectCode)) {
          errors.push(`Unknown subject code: '${item.subjectCode}'`);
        }
        const matches=topicRows.filter(t=>t.code===item.subjectCode && (t.slug===(item.subtopicSlug||item.topicTitle) || t.title===(item.subtopicSlug||item.topicTitle) || t.aliases?.some(a=>a.toLowerCase()===(item.subtopicSlug||item.topicTitle).toLowerCase())));
        if(item.subtopicSlug&&matches.length===1&&matches[0].parent_slug!==item.topicTitle&&matches[0].parent_title!==item.topicTitle)errors.push('Subtopic belongs to a different canonical topic.');
        if (matches.length!==1) errors.push(matches.length?'Ambiguous topic: use a unique canonical slug.':'Unknown topic: add its canonical mapping first.');
        return {
          row: index + 1,
          subjectCode: item.subjectCode,
          topicTitle: item.topicTitle,
          stemSnippet: item.stem.slice(0, 80),
          valid: errors.length === 0,
          errors,
        };
      });

      const validCount = validationResults.filter((r) => r.valid).length;

      return {
        status: 200,
        body: {
          totalRows: items.length,
          validCount,
          invalidCount: items.length - validCount,
          rows: validationResults,
        },
      };
    },
  },

  // 25. POST /api/v1/admin/questions/import (+ legacy alias POST /api/admin/questions/import)
  {
    id: 'admin.questions.import',
    method: 'POST',
    pattern: '/api/v1/admin/questions/import',
    auth: 'admin',
    maxBodyBytes: BODY_LIMIT_ADMIN_IMPORT_BYTES,
    idempotency: 'optional',
    handler: handleAdminQuestionImport,
  },
  {
    id: 'admin.questions.import.legacy',
    method: 'POST',
    pattern: '/api/admin/questions/import',
    auth: 'admin',
    maxBodyBytes: BODY_LIMIT_ADMIN_IMPORT_BYTES,
    idempotency: 'optional',
    handler: handleAdminQuestionImport,
  },
];

/**
 * Dispatches an incoming HTTP Request through the native API security, routing,
 * authentication, validation, and handler pipeline.
 */
export async function dispatchNativeApiRequest(
  request: Request,
  env: NativeApiEnv,
  getDb: () => RequestDbContext,
  hooks?: ApiRouterHooks
): Promise<Response> {
  const requestId = resolveRequestId(request);
  let corsHeaders: Record<string, string> = { Vary: 'Origin' };

  try {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // 1. Find all routes matching the URL path pattern
    const pathMatches: Array<{ route: RouteDefinition; params: Record<string, string> }> = [];
    for (const route of NATIVE_API_ROUTES) {
      const matchedParams = matchRoutePattern(route.pattern, url.pathname);
      if (matchedParams !== null) {
        pathMatches.push({ route, params: matchedParams });
      }
    }

    // 2. Handle CORS preflight OPTIONS before auth or DB allocation
    if (method === 'OPTIONS') {
      if (pathMatches.length === 0) {
        corsHeaders = validateOriginAndGetCorsHeaders(request, env);
        throw new ApiError({
          status: 404,
          code: 'NOT_FOUND',
          message: 'API endpoint not found.',
        });
      }
      const allowedMethods = pathMatches.map((m) => m.route.method);
      return handleCorsPreflight(request, requestId, allowedMethods, env);
    }

    // 3. Validate Origin header for non-OPTIONS requests before auth or DB allocation
    corsHeaders = validateOriginAndGetCorsHeaders(request, env);

    if (pathMatches.length === 0) {
      throw new ApiError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'API endpoint not found.',
      });
    }

    // 4. Match exact HTTP method or return 405 with Allow header
    const exactMatch = pathMatches.find((m) => m.route.method === method);
    if (!exactMatch) {
      const allowedMethods = Array.from(
        new Set([...pathMatches.map((m) => m.route.method), 'OPTIONS'])
      ).join(', ');
      throw new ApiError({
        status: 405,
        code: 'METHOD_NOT_ALLOWED',
        message: `HTTP method ${method} is not allowed for this endpoint.`,
        headers: { Allow: allowedMethods },
      });
    }

    const { route, params } = exactMatch;

    if (!ENABLED_PRODUCTION_ROUTE_IDS.has(route.id) && !hooks?.allowUnreviewedProductRoutes) {
      throw new ApiError({
        status: 503,
        code: 'ENDPOINT_NOT_READY',
        message: 'This endpoint is awaiting implementation review.',
      });
    }

    if (env.EDGE_RATE_LIMIT) {
      const ip=request.headers.get('CF-Connecting-IP');
      if (!ip && env.ENVIRONMENT==='production') throw new ApiError({status:503,code:'SERVICE_CONFIG_UNAVAILABLE',message:'Request admission is unavailable.'});
      if (!(await env.EDGE_RATE_LIMIT.limit({key:`ip:${ip ?? 'local'}`})).success) throw new ApiError({status:429,code:'RATE_LIMITED',message:'Too many requests. Wait a minute before retrying.',headers:{'Retry-After':'60'}});
    } else if(env.ENVIRONMENT==='production') throw new ApiError({status:503,code:'SERVICE_CONFIG_UNAVAILABLE',message:'Request admission is unavailable.'});

    // 5. Authenticate & authorize according to route.auth level
    let actor: AuthenticatedActor | undefined;
    let adminActor: AdminActor | undefined;

    if (route.auth === 'student') {
      actor = await authenticateBearerActor(request, env, hooks);
    } else if (route.auth === 'student_live_session') {
      actor = await authenticateBearerActor(request, env, hooks);
      await verifyLiveSupabaseSession(actor, env, hooks);
    } else if (route.auth === 'admin') {
      adminActor = await requireAdminActor(request, env, getDb, hooks);
      actor = adminActor;
    }

    if (actor && method!=='GET' && env.ACTOR_WRITE_LIMIT && !(await env.ACTOR_WRITE_LIMIT.limit({key:`actor:${actor.userId}`})).success) throw new ApiError({status:429,code:'RATE_LIMITED',message:'Too many writes. Wait a minute before retrying.',headers:{'Retry-After':'60'}});
    if(actor && method!=='GET' && env.ENVIRONMENT==='production' && !env.ACTOR_WRITE_LIMIT) throw new ApiError({status:503,code:'SERVICE_CONFIG_UNAVAILABLE',message:'Write admission is unavailable.'});

    // 6. Optional rate-limit / abuse check hook
    if (hooks?.rateLimitCheck) {
      await hooks.rateLimitCheck({
        request,
        routeId: route.id,
        actorUserId: actor?.userId,
      });
    }

    const now = hooks?.now ? hooks.now() : new Date();

    // 7. Execute route handler
    const result = await route.handler({
      request,
      url,
      requestId,
      params,
      env,
      getDb,
      actor,
      adminActor,
      hooks,
      now,
    });

    const mergedHeaders = {
      ...corsHeaders,
      ...(result.headers || {}),
    };

    if (result.rawJson !== undefined) {
      return apiRawJsonResponse(result.rawJson, result.status ?? 200, requestId, mergedHeaders);
    }

    return apiJsonResponse(result.body ?? {}, result.status ?? 200, requestId, mergedHeaders);
  } catch (err) {
    if (!(err instanceof ApiError)) {
      console.error('Native API unhandled error:', sanitizeDiagnosticMessage(err));
    }
    return apiErrorResponse(err, requestId, corsHeaders);
  }
}
