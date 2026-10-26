/**
 * Transactional Email Outbox & Queue Drain Service
 *
 * Provides non-blocking transactional enqueueing for lifecycle events (welcome, mock results, 24h nudges),
 * and throttled, rate-limited batch draining via SmtpClient to protect the cPanel mail server.
 */

import type { SqlTagExecutor } from '../api/db-context';
import { SmtpClient, type SmtpConfig } from './smtp-client';
import {
  buildLifecycleMimeMessage,
  render24hUpgradeNudgeEmail,
  renderMockResultEmail,
  renderWelcomeEmail,
  type MockResultEmailData,
  type UpgradeNudgeEmailData,
  type WelcomeEmailData,
} from './lifecycle-email-templates';

export type SqlClient = SqlTagExecutor;

export interface EnqueueEmailParams {
  userId?: string | null;
  emailType: 'welcome' | 'unsubscribed_24h_nudge' | 'mock_result';
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  payload: Record<string, unknown>;
  referenceId?: string | null;
  priority?: number;
}

export interface OutboxDrainSummary {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  elapsedMs: number;
}

/**
 * Enqueue an email into the database outbox.
 * Takes ~1ms. Guarantees idempotency via unique index.
 */
export async function enqueueLifecycleEmail(
  sql: SqlClient,
  params: EnqueueEmailParams
): Promise<boolean> {
  const cleanEmail = params.recipientEmail.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return false;
  }

  const priority = params.priority ?? (params.emailType === 'mock_result' ? 3 : params.emailType === 'welcome' ? 4 : 6);
  const referenceId = params.referenceId ?? null;

  try {
    const inserted = await sql<Array<{ id: string }>>`
      INSERT INTO public.email_outbox (
        user_id,
        email_type,
        recipient_email,
        recipient_name,
        subject,
        payload_json,
        reference_id,
        priority,
        state,
        retry_count,
        created_at,
        updated_at
      )
      VALUES (
        ${params.userId ? `${params.userId}::uuid` : null},
        ${params.emailType},
        ${cleanEmail},
        ${params.recipientName ?? null},
        ${params.subject},
        ${JSON.stringify(params.payload)}::jsonb,
        ${referenceId},
        ${priority},
        'pending',
        0,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, email_type, COALESCE(reference_id, 'global')) DO NOTHING
      RETURNING id
    `;
    return inserted.length > 0;
  } catch (err) {
    console.warn(`[email-outbox] Enqueue failed for ${cleanEmail} (${params.emailType}):`, err);
    return false;
  }
}

/**
 * Scans for students registered between 24 hours and 7 days ago who are not subscribed,
 * and enqueues their 24-hour conversion nudge if not already queued.
 */
export async function scanAndEnqueue24hUpgradeNudges(
  sql: SqlClient,
  now: Date = new Date()
): Promise<number> {
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const eligibleStudents = await sql<Array<{
      user_id: string;
      email: string;
      display_name: string | null;
    }>>`
      SELECT
        u.id AS user_id,
        u.email,
        p.display_name
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE u.created_at <= ${twentyFourHoursAgo.toISOString()}::timestamptz
        AND u.created_at >= ${sevenDaysAgo.toISOString()}::timestamptz
        AND NOT EXISTS (
          SELECT 1 FROM public.subscription_entitlements e
          WHERE e.user_id = u.id AND e.expires_at > ${now.toISOString()}::timestamptz
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.school_students s
          WHERE s.student_user_id = u.id
            AND s.license_status = 'active'
            AND (s.license_expires_at IS NULL OR s.license_expires_at > ${now.toISOString()}::timestamptz)
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.email_outbox o
          WHERE o.user_id = u.id AND o.email_type = 'unsubscribed_24h_nudge'
        )
      LIMIT 25
    `;

    let enqueuedCount = 0;
    for (const student of eligibleStudents) {
      if (!student.email || !student.email.includes('@')) continue;
      const studentName = student.display_name?.trim() || student.email.split('@')[0];

      const enqueued = await enqueueLifecycleEmail(sql, {
        userId: student.user_id,
        emailType: 'unsubscribed_24h_nudge',
        recipientEmail: student.email,
        recipientName: studentName,
        subject: 'Unlock unlimited UTME mocks & full explanations on JAMBPrep',
        payload: {
          studentName,
          pricingUrl: 'https://jambprep.lecterniq.com/pricing',
          dashboardUrl: 'https://jambprep.lecterniq.com/dashboard',
        },
        priority: 6,
      });

      if (enqueued) enqueuedCount++;
    }

    return enqueuedCount;
  } catch (err) {
    console.warn('[email-outbox] scanAndEnqueue24hUpgradeNudges error:', err);
    return 0;
  }
}

/**
 * Claims and delivers a throttled batch of pending/retryable emails from the outbox.
 * Paces deliveries to protect the SMTP server from load spikes.
 */
export async function drainEmailOutboxBatch(
  sql: SqlClient,
  smtp: SmtpConfig,
  options: {
    batchLimit?: number;
    workerId?: string;
    now?: Date;
  } = {}
): Promise<OutboxDrainSummary> {
  const startedAt = Date.now();
  const now = options.now ?? new Date();
  const workerId = options.workerId ?? `drain-${crypto.randomUUID().slice(0, 8)}`;
  const batchLimit = Math.min(Math.max(options.batchLimit ?? 5, 1), 15);
  const leaseUntil = new Date(now.getTime() + 60 * 1000); // 60s lease

  const summary: OutboxDrainSummary = {
    claimed: 0,
    sent: 0,
    retried: 0,
    failed: 0,
    elapsedMs: 0,
  };

  // Phase 1: Claim pending/retryable outbox rows
  let claimedRows: Array<{
    id: string;
    user_id: string | null;
    email_type: string;
    recipient_email: string;
    recipient_name: string | null;
    subject: string;
    payload_json: any;
    retry_count: number;
    max_retries: number;
  }> = [];

  try {
    claimedRows = await sql`
      UPDATE public.email_outbox
      SET
        state = 'sending',
        lease_owner = ${workerId},
        leased_until = ${leaseUntil.toISOString()}::timestamptz,
        updated_at = ${now.toISOString()}::timestamptz
      WHERE id IN (
        SELECT id FROM public.email_outbox
        WHERE (
          state = 'pending'
          OR (state = 'retry_scheduled' AND (next_retry_at IS NULL OR next_retry_at <= ${now.toISOString()}::timestamptz))
          OR (state = 'sending' AND leased_until IS NOT NULL AND leased_until <= ${now.toISOString()}::timestamptz)
        )
        ORDER BY priority ASC, created_at ASC
        LIMIT ${batchLimit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING
        id,
        user_id,
        email_type,
        recipient_email,
        recipient_name,
        subject,
        payload_json,
        retry_count,
        max_retries
    `;
  } catch (claimErr) {
    console.error('[email-outbox] Claim query error:', claimErr);
    summary.elapsedMs = Date.now() - startedAt;
    return summary;
  }

  summary.claimed = claimedRows.length;
  if (claimedRows.length === 0) {
    summary.elapsedMs = Date.now() - startedAt;
    return summary;
  }

  const client = new SmtpClient(smtp);

  // Phase 2: Process sequentially with 500ms pacing to keep mail server relaxed
  for (const item of claimedRows) {
    try {
      let emailContent: { subject: string; html: string; text: string };

      if (item.email_type === 'welcome') {
        emailContent = renderWelcomeEmail(item.payload_json as WelcomeEmailData);
      } else if (item.email_type === 'unsubscribed_24h_nudge') {
        emailContent = render24hUpgradeNudgeEmail(item.payload_json as UpgradeNudgeEmailData);
      } else if (item.email_type === 'mock_result') {
        emailContent = renderMockResultEmail(item.payload_json as MockResultEmailData);
      } else {
        // Fallback for custom or reminder templates
        emailContent = {
          subject: item.subject,
          html: `<p>${String(item.payload_json?.message || item.subject)}</p>`,
          text: String(item.payload_json?.message || item.subject),
        };
      }

      const { rawMessage } = buildLifecycleMimeMessage({
        from: smtp.user,
        to: item.recipient_email,
        replyTo: 'support@lecterniq.com',
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      const res = await client.sendMail({
        from: smtp.user,
        to: item.recipient_email,
        rawMessage,
      });

      if (res.accepted) {
        await sql`
          UPDATE public.email_outbox
          SET
            state = 'sent',
            sent_at = NOW(),
            leased_until = NULL,
            error_message = NULL,
            updated_at = NOW()
          WHERE id = ${item.id}::uuid
        `;
        summary.sent++;
      } else {
        throw new Error(res.response || 'SMTP send rejected');
      }
    } catch (err: any) {
      const errMsg = String(err?.message || err).slice(0, 500);
      const nextRetryCount = Number(item.retry_count || 0) + 1;
      const maxRetries = Number(item.max_retries || 3);

      if (nextRetryCount < maxRetries) {
        // Reschedule with exponential backoff: 5m, 10m, etc.
        const backoffMinutes = Math.min(nextRetryCount * 5, 30);
        const nextRetry = new Date(Date.now() + backoffMinutes * 60 * 1000);

        await sql`
          UPDATE public.email_outbox
          SET
            state = 'retry_scheduled',
            retry_count = ${nextRetryCount},
            next_retry_at = ${nextRetry.toISOString()}::timestamptz,
            leased_until = NULL,
            error_message = ${errMsg},
            updated_at = NOW()
          WHERE id = ${item.id}::uuid
        `;
        summary.retried++;
      } else {
        await sql`
          UPDATE public.email_outbox
          SET
            state = 'failed',
            retry_count = ${nextRetryCount},
            leased_until = NULL,
            error_message = ${errMsg},
            updated_at = NOW()
          WHERE id = ${item.id}::uuid
        `;
        summary.failed++;
      }
    }

    // Pacing pause: 400ms between emails to prevent SMTP socket saturation
    await new Promise((r) => setTimeout(r, 400));
  }

  summary.elapsedMs = Date.now() - startedAt;
  return summary;
}
