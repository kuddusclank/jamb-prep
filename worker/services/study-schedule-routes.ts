import { assertValidUuid, readBoundedJsonBody } from '../api/contracts';
import { ApiError } from '../api/errors';
import {
  executeTransactionalIdempotentMutation,
  extractIdempotencyKey,
} from '../api/idempotency';
import type { RouteDefinition, RouteRequestContext } from '../api/router';
import {
  deleteUserPushSubscription,
  getStudyScheduleState,
  sendUserTestReminder,
  updateStudyScheduleSettings,
  upsertUserPushSubscription,
  type UpdateStudyScheduleInput,
  type WebPushSenderFn,
} from './study-schedule-service';
import { sha256Hex, type VapidKeyConfig } from './web-push-crypto';

function resolveVapidConfigFromContext(ctx: RouteRequestContext): VapidKeyConfig | null {
  const env = ctx.env as unknown as Record<string, unknown>;
  const publicKey = typeof env.VAPID_PUBLIC_KEY === 'string' ? env.VAPID_PUBLIC_KEY.trim() : '';
  const privateKey = typeof env.VAPID_PRIVATE_KEY === 'string' ? env.VAPID_PRIVATE_KEY.trim() : '';
  const subject =
    typeof env.VAPID_SUBJECT === 'string' && env.VAPID_SUBJECT.trim()
      ? env.VAPID_SUBJECT.trim()
      : 'mailto:support@lecterniq.com';
  const versionRaw = Number(env.VAPID_KEY_VERSION ?? 1);
  const version = Number.isInteger(versionRaw) && versionRaw >= 1 ? versionRaw : 1;

  if (!publicKey || !privateKey) {
    return null;
  }
  return {
    publicKey,
    privateKey,
    subject,
    version,
  };
}

function resolvePushSenderFromContext(ctx: RouteRequestContext): WebPushSenderFn | undefined {
  const hooks = ctx.hooks as unknown as Record<string, unknown> | undefined;
  if (hooks && typeof hooks.pushSender === 'function') {
    return hooks.pushSender as WebPushSenderFn;
  }
  if (ctx.hooks?.fetchImpl) {
    const customFetch = ctx.hooks.fetchImpl;
    return async (req) => {
      const response = await customFetch(req.endpoint, {
        method: 'POST',
        headers: req.headers,
        body: req.body,
        redirect: 'manual',
      });
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSeconds =
        retryAfterHeader && /^\d+$/.test(retryAfterHeader.trim())
          ? Number(retryAfterHeader.trim())
          : null;
      return {
        status: response.status,
        retryAfterSeconds,
      };
    };
  }
  return undefined;
}

function parseScheduleUpdateBody(raw: unknown): UpdateStudyScheduleInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Schedule settings payload must be a JSON object.',
    });
  }
  const body = raw as Record<string, unknown>;
  if (typeof body.enabled !== 'boolean') {
    throw new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Field "enabled" is required and must be a boolean.',
    });
  }

  const out: UpdateStudyScheduleInput = {
    enabled: body.enabled,
  };

  if (body.dailyGoal !== undefined) {
    out.dailyGoal = Number(body.dailyGoal);
  }
  if (body.reminderEnabled !== undefined) {
    if (typeof body.reminderEnabled !== 'boolean') {
      throw new ApiError({
        status: 422,
        code: 'VALIDATION_FAILED',
        message: 'Field "reminderEnabled" must be a boolean.',
      });
    }
    out.reminderEnabled = body.reminderEnabled;
  }
  if (body.reminderLocalTime !== undefined) {
    if (typeof body.reminderLocalTime !== 'string') {
      throw new ApiError({
        status: 422,
        code: 'VALIDATION_FAILED',
        message: 'Field "reminderLocalTime" must be a string in HH:mm format.',
      });
    }
    out.reminderLocalTime = body.reminderLocalTime;
  }
  if (body.timeZone !== undefined) {
    if (typeof body.timeZone !== 'string') {
      throw new ApiError({
        status: 422,
        code: 'VALIDATION_FAILED',
        message: 'Field "timeZone" must be an IANA timezone string.',
      });
    }
    out.timeZone = body.timeZone;
  }
  if (body.expectedRevision !== undefined && body.expectedRevision !== null) {
    const rev = Number(body.expectedRevision);
    if (!Number.isInteger(rev) || rev < 0) {
      throw new ApiError({
        status: 422,
        code: 'VALIDATION_FAILED',
        message: 'Field "expectedRevision" must be a non-negative integer.',
      });
    }
    out.expectedRevision = rev;
  }

  return out;
}

export const STUDY_SCHEDULE_ROUTES: RouteDefinition[] = [
  {
    id: 'study-schedule.get',
    method: 'GET',
    pattern: '/api/v1/study-schedule',
    auth: 'student',
    handler: async (ctx) => {
      const rawHash = ctx.url.searchParams.get('endpointHash')?.trim() ?? '';
      const currentEndpointHash = /^[a-f0-9]{64}$/i.test(rawHash)
        ? rawHash.toLowerCase()
        : null;
      const env = ctx.env as unknown as Record<string, unknown>;
      const vapidPublicKey =
        typeof env.VAPID_PUBLIC_KEY === 'string' && env.VAPID_PUBLIC_KEY.trim()
          ? env.VAPID_PUBLIC_KEY.trim()
          : null;

      const state = await getStudyScheduleState(ctx.getDb().sql, ctx.actor!.userId, {
        now: ctx.now,
        vapidPublicKey,
        currentEndpointHash,
      });

      return {
        status: 200,
        body: state,
      };
    },
  },
  {
    id: 'study-schedule.put',
    method: 'PUT',
    pattern: '/api/v1/study-schedule',
    auth: 'student',
    idempotency: 'required',
    maxBodyBytes: 4096,
    handler: async (ctx) => {
      const { data, rawText } = await readBoundedJsonBody(ctx.request, { maxBytes: 4096 });
      const input = parseScheduleUpdateBody(data);
      const idempotencyKey = extractIdempotencyKey(ctx.request, { required: true })!;
      const env = ctx.env as unknown as Record<string, unknown>;
      const vapidPublicKey =
        typeof env.VAPID_PUBLIC_KEY === 'string' && env.VAPID_PUBLIC_KEY.trim()
          ? env.VAPID_PUBLIC_KEY.trim()
          : null;

      const outcome = await executeTransactionalIdempotentMutation({
        db: ctx.getDb(),
        userId: ctx.actor!.userId,
        operation: 'study-schedule.put',
        canonicalPayload: rawText,
        idempotencyKey,
        execute: async (tx) => {
          const updatedState = await updateStudyScheduleSettings(
            tx,
            ctx.actor!.userId,
            input,
            {
              now: ctx.now,
              vapidPublicKey,
            }
          );
          return { body: updatedState };
        },
      });

      return {
        status: 200,
        body: outcome.body,
        headers: outcome.headers,
      };
    },
  },
  {
    id: 'study-schedule.push-subscriptions.post',
    method: 'POST',
    pattern: '/api/v1/study-schedule/push-subscriptions',
    auth: 'student',
    idempotency: 'required',
    maxBodyBytes: 4096,
    handler: async (ctx) => {
      const { data, rawText } = await readBoundedJsonBody(ctx.request, { maxBytes: 4096 });
      const idempotencyKey = extractIdempotencyKey(ctx.request, { required: true })!;
      const vapid = resolveVapidConfigFromContext(ctx);

      const outcome = await executeTransactionalIdempotentMutation({
        db: ctx.getDb(),
        userId: ctx.actor!.userId,
        operation: 'study-schedule.push-subscriptions.post',
        canonicalPayload: rawText,
        idempotencyKey,
        execute: async (tx) => {
          const subscription = await upsertUserPushSubscription(
            tx,
            ctx.actor!.userId,
            data,
            {
              now: ctx.now,
              vapidVersion: vapid?.version ?? 1,
            }
          );
          return { body: { subscription } };
        },
      });

      return {
        status: 200,
        body: outcome.body,
        headers: outcome.headers,
      };
    },
  },
  {
    id: 'study-schedule.push-subscriptions.delete',
    method: 'DELETE',
    pattern: '/api/v1/study-schedule/push-subscriptions/:subscriptionId',
    auth: 'student',
    handler: async (ctx) => {
      const subscriptionId = assertValidUuid(ctx.params.subscriptionId, 'subscriptionId');
      const result = await deleteUserPushSubscription(
        ctx.getDb().sql,
        ctx.actor!.userId,
        subscriptionId
      );
      return {
        status: 200,
        body: result,
      };
    },
  },
  {
    id: 'study-schedule.push-subscriptions.detach-endpoint.post',
    method: 'POST',
    pattern: '/api/v1/study-schedule/push-subscriptions/detach-endpoint',
    auth: 'student',
    maxBodyBytes: 4096,
    handler: async (ctx) => {
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 4096 });
      const body = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
      const rawEndpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
      const rawEndpointHash =
        typeof body.endpointHash === 'string' ? body.endpointHash.trim().toLowerCase() : '';

      let targetHash = '';
      if (/^[a-f0-9]{64}$/.test(rawEndpointHash)) {
        targetHash = rawEndpointHash;
      } else if (rawEndpoint && rawEndpoint.length <= 2048) {
        try {
          targetHash = await sha256Hex(new URL(rawEndpoint).toString());
        } catch {
          targetHash = await sha256Hex(rawEndpoint);
        }
      }

      if (!targetHash) {
        throw new ApiError({
          status: 422,
          code: 'VALIDATION_FAILED',
          message: 'Provide a valid push endpoint or endpointHash to detach.',
        });
      }

      const deleted = await ctx.getDb().sql<Array<{ id: string }>>`
        DELETE FROM public.web_push_subscriptions
        WHERE user_id = ${ctx.actor!.userId}::uuid
          AND endpoint_hash = ${targetHash}
        RETURNING id
      `;

      return {
        status: 200,
        body: {
          detached: deleted.length > 0,
          id: deleted[0]?.id ?? null,
        },
      };
    },
  },
  {
    id: 'study-schedule.test-reminder.post',
    method: 'POST',
    pattern: '/api/v1/study-schedule/test-reminder',
    auth: 'student',
    idempotency: 'required',
    maxBodyBytes: 4096,
    handler: async (ctx) => {
      const { data } = await readBoundedJsonBody(ctx.request, { maxBytes: 4096 });
      const body = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
      const subscriptionId =
        typeof body.subscriptionId === 'string' && body.subscriptionId.trim()
          ? assertValidUuid(body.subscriptionId.trim(), 'subscriptionId')
          : undefined;

      // Never allow sending a test reminder while the user has an active mock exam in progress
      const activeMocks = await ctx.getDb().sql<Array<{ id: string }>>`
        SELECT id
        FROM public.attempts
        WHERE user_id = ${ctx.actor!.userId}::uuid
          AND mode = 'mock'
          AND status = 'in_progress'
          AND expires_at > ${ctx.now.toISOString()}::timestamptz
        LIMIT 1
      `;
      if (activeMocks.length > 0) {
        throw new ApiError({
          status: 409,
          code: 'CONFLICT',
          message: 'Test reminders are disabled while an active mock exam is in progress.',
        });
      }

      const vapid = resolveVapidConfigFromContext(ctx);
      const pushSender = resolvePushSenderFromContext(ctx);

      const result = await sendUserTestReminder(
        ctx.getDb().sql,
        ctx.actor!.userId,
        { subscriptionId },
        {
          now: ctx.now,
          vapid,
          pushSender,
        }
      );

      return {
        status: 200,
        body: result,
      };
    },
  },
];
