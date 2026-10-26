/**
 * Dedicated UTC Study Reminder Scheduler Worker (S06)
 *
 * Isolates periodic Web Push reminder dispatch from interactive student API traffic.
 * - Executes on Cloudflare Cron Triggers (UTC).
 * - Uses lazy request/cron-scoped Direct Hyperdrive DB allocation with guaranteed socket cleanup.
 * - Enforces STUDY_REMINDER_DISPATCH_ENABLED kill-switch so Cron can be safely dry-run or paused.
 * - Never exposes a public open-relay HTTP send endpoint.
 */

import { createLazyDbHolder, DatabaseBindingEnv, DbContextFactory } from '../api/db-context';
import { sanitizeDiagnosticMessage } from '../api/errors';
import {
  runStudyReminderSchedulerTick,
  type SchedulerTickSummary,
  type WebPushSenderFn,
} from '../services/study-schedule-service';
import type { VapidKeyConfig } from '../services/web-push-crypto';
import type { SmtpConfig } from '../services/smtp-client';

export interface SchedulerWorkerEnv extends DatabaseBindingEnv {
  ENVIRONMENT?: string;
  STUDY_REMINDER_DISPATCH_ENABLED?: string;
  STUDY_REMINDER_BATCH_LIMIT?: string;
  STUDY_REMINDER_CONCURRENCY?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  VAPID_KEY_VERSION?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
}

export interface ScheduledControllerLike {
  scheduledTime: number;
  cron: string;
}

export interface SchedulerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export interface SchedulerHandlerOptions {
  dbFactory?: DbContextFactory;
  pushSender?: WebPushSenderFn;
  now?: () => Date;
}

function resolveSmtpConfig(env: SchedulerWorkerEnv): SmtpConfig | null {
  const host = typeof env.SMTP_HOST === 'string' && env.SMTP_HOST.trim() ? env.SMTP_HOST.trim() : 'send.lecterniq.com';
  const port = Number(env.SMTP_PORT ?? 465) || 465;
  const user = typeof env.SMTP_USER === 'string' && env.SMTP_USER.trim() ? env.SMTP_USER.trim() : 'noreply@send.lecterniq.com';
  const pass = typeof env.SMTP_PASS === 'string' && env.SMTP_PASS.trim() ? env.SMTP_PASS.trim() : '1{$K;AfWHbG^1VC#';

  if (!host || !user || !pass) {
    return null;
  }
  return {
    host,
    port,
    user,
    pass,
  };
}

function resolveVapidConfig(env: SchedulerWorkerEnv): VapidKeyConfig | null {
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

export function createStudyReminderSchedulerHandler(options?: SchedulerHandlerOptions) {
  return {
    async scheduled(
      controller: ScheduledControllerLike,
      env: SchedulerWorkerEnv,
      ctx: SchedulerExecutionContext
    ): Promise<SchedulerTickSummary> {
      const dispatchEnabled =
        String(env.STUDY_REMINDER_DISPATCH_ENABLED ?? 'false')
          .trim()
          .toLowerCase() === 'true';

      const now = options?.now
        ? options.now()
        : controller?.scheduledTime
          ? new Date(controller.scheduledTime)
          : new Date();

      if (!dispatchEnabled) {
        return {
          claimedOccurrences: 0,
          acceptedDeliveries: 0,
          skippedGoalMet: 0,
          skippedNotPremium: 0,
          skippedStale: 0,
          skippedNoSubscription: 0,
          skippedDisabledOrChanged: 0,
          retriedDeliveries: 0,
          disabledGoneSubscriptions: 0,
          failedDeliveries: 0,
          elapsedMs: 0,
        };
      }

      const batchLimitRaw = Number(env.STUDY_REMINDER_BATCH_LIMIT ?? 25);
      const batchLimit =
        Number.isInteger(batchLimitRaw) && batchLimitRaw >= 1
          ? Math.min(batchLimitRaw, 40)
          : 25;

      const concurrencyRaw = Number(env.STUDY_REMINDER_CONCURRENCY ?? 5);
      const concurrency =
        Number.isInteger(concurrencyRaw) && concurrencyRaw >= 1
          ? Math.min(concurrencyRaw, 10)
          : 5;

      const lazyDb = createLazyDbHolder(env, options?.dbFactory);
      try {
        const db = lazyDb.getDb();
        const summary = await runStudyReminderSchedulerTick(
          db.sql,
          {
            now,
            batchLimit,
            concurrency,
            vapid: resolveVapidConfig(env),
            smtp: resolveSmtpConfig(env),
            pushSender: options?.pushSender,
            dispatchEnabled: true,
          }
        );
        console.info(
          'StudyReminderScheduler tick completed:',
          JSON.stringify({
            cron: controller?.cron ?? 'manual',
            scheduledTime: now.toISOString(),
            ...summary,
          })
        );
        return summary;
      } catch (err) {
        console.error(
          'StudyReminderScheduler tick failed:',
          sanitizeDiagnosticMessage(err)
        );
        throw err;
      } finally {
        if (lazyDb.isAllocated) {
          ctx.waitUntil(lazyDb.cleanup());
        }
      }
    },

    async fetch(): Promise<Response> {
      return new Response(
        JSON.stringify({
          service: 'jambprep-study-reminder-scheduler',
          status: 'ok',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        }
      );
    },
  };
}

const schedulerWorker = createStudyReminderSchedulerHandler();

export default schedulerWorker;
