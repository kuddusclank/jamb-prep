import test from 'node:test';
import assert from 'node:assert/strict';
import {
  base64UrlEncode,
  buildGenericStudyReminderPayload,
  buildSignedWebPushRequest,
  decryptWebPushAes128GcmPayload,
  generateVapidKeyPair,
  validateWebPushSubscriptionInput,
} from '../worker/services/web-push-crypto.ts';
import {
  addCalendarDays,
  computeNextReminderUtc,
  computeStudyStreakSummary,
  deleteUserPushSubscription,
  getStudyScheduleState,
  recordAcceptedStudyGoalEvent,
  recordCompletedMockStreakQualification,
  resolveLocalDate,
  resolveLocalWallTimeToUtc,
  runStudyReminderSchedulerTick,
  sendUserTestReminder,
  updateStudyScheduleSettings,
  upsertUserPushSubscription,
} from '../worker/services/study-schedule-service.ts';
import { createStudyReminderSchedulerHandler } from '../worker/scheduler/entry.ts';

async function generateBrowserSubscriberKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const rawPublic = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
  const authBytes = crypto.getRandomValues(new Uint8Array(16));
  return {
    keyPair,
    publicKeyBytes: rawPublic,
    p256dh: base64UrlEncode(rawPublic),
    authBytes,
    auth: base64UrlEncode(authBytes),
  };
}

/**
 * Stateful in-memory SQL tagged-template mock for testing Study Schedule,
 * Goal Accrual, Streaks, Push Subscriptions, and UTC Scheduler transitions.
 */
function createScheduleMockSql() {
  const state = {
    profiles: new Map(), // userId -> { created_at }
    entitlements: new Map(), // userId -> Array<{ status, expires_at }>
    schedules: new Map(), // userId -> row
    goalDays: new Map(), // `${userId}:${localDate}` -> row
    goalEvents: new Map(), // `${userId}:${questionId}:${localDate}` -> row
    streakSummaries: new Map(), // userId -> row
    pushSubscriptions: new Map(), // id -> row
    occurrences: new Map(), // id -> row
    deliveries: new Map(), // `${occurrenceId}:${subscriptionId}` -> row
  };

  const normalizeSql = (strings) => strings.join(' ').replace(/\s+/g, ' ').trim();

  const sql = async (strings, ...values) => {
    const q = normalizeSql(strings);

    // 1. Entitlement check (getUserSubscriptionStatus)
    if (q.includes('FROM subscription_entitlements') || q.includes('FROM public.subscription_entitlements')) {
      const userId = String(values[0]);
      const list = state.entitlements.get(userId) ?? [];
      return list.filter((e) => e.status === 'active');
    }

    // 1b. Select profiles created_at
    if (q.includes('FROM public.profiles') && q.includes('created_at')) {
      const userId = String(values[0]);
      const prof = state.profiles.get(userId);
      return prof ? [{ created_at: prof.created_at }] : [];
    }

    // 2. Select study_schedules by user_id
    if (
      q.startsWith('SELECT * FROM public.study_schedules WHERE user_id =') ||
      q.startsWith('SELECT enabled, reminder_enabled, revision, daily_goal FROM public.study_schedules WHERE user_id =')
    ) {
      const userId = String(values[0]);
      const row = state.schedules.get(userId);
      return row ? [{ ...row }] : [];
    }

    // 3. Promote pending schedule changes
    if (q.startsWith('UPDATE public.study_schedules SET daily_goal =')) {
      const [nextGoal, pendingGoal, pendingGoalDate, nextZone, pendingZone, pendingZoneDate, updatedAt, userId] = values;
      const existing = state.schedules.get(String(userId));
      if (!existing) return [];
      const updated = {
        ...existing,
        daily_goal: Number(nextGoal),
        pending_daily_goal: pendingGoal,
        pending_goal_effective_date: pendingGoalDate,
        time_zone: String(nextZone),
        pending_time_zone: pendingZone,
        pending_time_zone_effective_date: pendingZoneDate,
        updated_at: String(updatedAt),
      };
      state.schedules.set(String(userId), updated);
      return [{ ...updated }];
    }

    // 4. Disable schedule when expired
    if (q.startsWith('UPDATE public.study_schedules SET enabled =') && q.includes('reminder_enabled = false')) {
      const [enabledVal, updatedAt, userId] = values;
      const existing = state.schedules.get(String(userId));
      if (!existing) return [];
      const updated = {
        ...existing,
        enabled: Boolean(enabledVal),
        reminder_enabled: false,
        next_reminder_at: null,
        revision: existing.revision + 1,
        updated_at: String(updatedAt),
      };
      state.schedules.set(String(userId), updated);
      return [{ ...updated }];
    }

    // 5. Upsert study_schedules
    if (q.startsWith('INSERT INTO public.study_schedules')) {
      const [
        userId,
        enabled,
        dailyGoal,
        pendingDailyGoal,
        pendingGoalEffectiveDate,
        reminderEnabled,
        reminderLocalTime,
        timeZone,
        pendingTimeZone,
        pendingTimeZoneEffectiveDate,
        policyVersion,
        nextReminderAt,
        createdAt,
        updatedAt,
      ] = values;
      const uid = String(userId);
      const existing = state.schedules.get(uid);
      const row = {
        user_id: uid,
        enabled: Boolean(enabled),
        goal_type: 'questions',
        daily_goal: Number(dailyGoal),
        pending_daily_goal: pendingDailyGoal ?? null,
        pending_goal_effective_date: pendingGoalEffectiveDate ?? null,
        reminder_enabled: Boolean(reminderEnabled),
        reminder_local_time: String(reminderLocalTime),
        time_zone: String(timeZone),
        pending_time_zone: pendingTimeZone ?? null,
        pending_time_zone_effective_date: pendingTimeZoneEffectiveDate ?? null,
        policy_version: Number(policyVersion),
        revision: existing ? existing.revision + 1 : 1,
        next_reminder_at: nextReminderAt ?? null,
        created_at: existing ? existing.created_at : String(createdAt),
        updated_at: String(updatedAt),
      };
      state.schedules.set(uid, row);
      return [{ ...row }];
    }

    // 6. Insert study_goal_days ON CONFLICT (user_id, local_date)
    if (q.startsWith('INSERT INTO public.study_goal_days')) {
      const isMockQualify = q.includes('ON CONFLICT (user_id, local_date) DO UPDATE');
      if (isMockQualify) {
        // [userId, localDate, targetQuestions, timeZone, policyVersion, targetQuestions, nowIso, nowIso, nowIso]
        const [userId, localDate, targetQuestions, timeZone, policyVersion, acceptedCount, qualifiedAt, createdAt, updatedAt] = values;
        const key = `${userId}:${String(localDate).slice(0, 10)}`;
        const existing = state.goalDays.get(key);
        if (existing) {
          existing.qualified_at = existing.qualified_at ?? String(qualifiedAt);
          existing.accepted_count = Math.max(existing.accepted_count, Number(acceptedCount));
          existing.updated_at = String(updatedAt);
        } else {
          state.goalDays.set(key, {
            user_id: String(userId),
            local_date: String(localDate).slice(0, 10),
            target_questions: Number(targetQuestions),
            time_zone: String(timeZone),
            policy_version: Number(policyVersion),
            accepted_count: Number(acceptedCount),
            qualified_at: String(qualifiedAt),
            created_at: String(createdAt),
            updated_at: String(updatedAt),
          });
        }
        return [];
      }

      const [userId, localDate, targetQuestions, timeZone, policyVersion, createdAt, updatedAt] = values;
      const key = `${userId}:${String(localDate).slice(0, 10)}`;
      if (!state.goalDays.has(key)) {
        state.goalDays.set(key, {
          user_id: String(userId),
          local_date: String(localDate).slice(0, 10),
          target_questions: Number(targetQuestions),
          time_zone: String(timeZone),
          policy_version: Number(policyVersion),
          accepted_count: 0,
          qualified_at: null,
          created_at: String(createdAt),
          updated_at: String(updatedAt),
        });
      }
      return [];
    }

    // 7. Select study_goal_days for a specific date
    if (q.includes('FROM public.study_goal_days WHERE user_id =') && q.includes('AND local_date =')) {
      const userId = String(values[0]);
      const localDate = String(values[1]).slice(0, 10);
      const row = state.goalDays.get(`${userId}:${localDate}`);
      return row ? [{ ...row }] : [];
    }

    // 8. Select qualified local_dates from study_goal_days
    if (q.includes('SELECT local_date FROM public.study_goal_days WHERE user_id =') && q.includes('qualified_at IS NOT NULL')) {
      const userId = String(values[0]);
      const rows = [];
      for (const row of state.goalDays.values()) {
        if (row.user_id === userId && row.qualified_at !== null) {
          rows.push({ local_date: row.local_date });
        }
      }
      rows.sort((a, b) => a.local_date.localeCompare(b.local_date));
      return rows;
    }

    // 9. Insert study_goal_events ON CONFLICT DO NOTHING
    if (q.startsWith('INSERT INTO public.study_goal_events')) {
      const [userId, questionId, localDate, attemptId, mode, acceptedAt, policyVersion] = values;
      const d = String(localDate).slice(0, 10);
      const key = `${userId}:${questionId}:${d}`;
      if (state.goalEvents.has(key)) {
        return [];
      }
      const id = crypto.randomUUID();
      state.goalEvents.set(key, {
        id,
        user_id: String(userId),
        question_id: String(questionId),
        local_date: d,
        attempt_id: String(attemptId),
        mode: String(mode),
        accepted_at: String(acceptedAt),
        policy_version: Number(policyVersion),
      });
      return [{ id }];
    }

    // 10. Increment accepted_count on study_goal_days
    if (q.startsWith('UPDATE public.study_goal_days SET accepted_count = accepted_count + 1')) {
      const [nowIso, , userId, localDate] = values;
      const d = String(localDate).slice(0, 10);
      const key = `${userId}:${d}`;
      const existing = state.goalDays.get(key);
      if (!existing) return [];
      const wasAlreadyQualified = Boolean(
        existing.qualified_at !== null && existing.accepted_count >= existing.target_questions
      );
      const nextCount = existing.accepted_count + 1;
      const nextQualifiedAt =
        existing.qualified_at !== null
          ? existing.qualified_at
          : nextCount >= existing.target_questions
            ? String(nowIso)
            : null;
      const updated = {
        ...existing,
        accepted_count: nextCount,
        qualified_at: nextQualifiedAt,
        updated_at: String(nowIso),
      };
      state.goalDays.set(key, updated);
      return [
        {
          accepted_count: updated.accepted_count,
          target_questions: updated.target_questions,
          qualified_at: updated.qualified_at,
          was_already_qualified: wasAlreadyQualified,
        },
      ];
    }

    // 11. Select study_streak_summaries
    if (q.includes('FROM public.study_streak_summaries WHERE user_id =')) {
      const userId = String(values[0]);
      const row = state.streakSummaries.get(userId);
      return row ? [{ ...row }] : [];
    }

    // 12. Upsert study_streak_summaries
    if (q.startsWith('INSERT INTO public.study_streak_summaries')) {
      const [userId, currentStreak, bestStreak, lastQualifiedDate, updatedAt] = values;
      const uid = String(userId);
      const existing = state.streakSummaries.get(uid);
      const updated = {
        user_id: uid,
        current_streak: Number(currentStreak),
        best_streak: Math.max(Number(existing?.best_streak ?? 0), Number(bestStreak)),
        last_qualified_date: lastQualifiedDate ?? null,
        revision: existing ? existing.revision + 1 : 1,
        updated_at: String(updatedAt),
      };
      state.streakSummaries.set(uid, updated);
      return [{ ...updated }];
    }

    // 13. Select web_push_subscriptions for user
    if (q.includes('FROM public.web_push_subscriptions WHERE user_id =') && q.includes('AND endpoint_hash <>')) {
      const userId = String(values[0]);
      const excludeHash = String(values[1]);
      return Array.from(state.pushSubscriptions.values())
        .filter((s) => s.user_id === userId && s.enabled && s.endpoint_hash !== excludeHash)
        .sort((a, b) => new Date(a.last_seen_at).getTime() - new Date(b.last_seen_at).getTime());
    }

    if (q.startsWith('UPDATE public.web_push_subscriptions SET enabled = false, disabled_reason =')) {
      const [updatedAt, id, userId] = values;
      const sub = state.pushSubscriptions.get(String(id));
      if (sub && sub.user_id === String(userId)) {
        sub.enabled = false;
        sub.disabled_reason = q.includes('device_cap_replaced') ? 'device_cap_replaced' : 'provider_gone';
        sub.updated_at = String(updatedAt);
      }
      return [];
    }

    if (q.startsWith('INSERT INTO public.web_push_subscriptions')) {
      const [
        userId,
        endpointHash,
        endpoint,
        p256dh,
        authSecret,
        vapidVersion,
        deviceLabel,
        environment,
        lastSeenAt,
        createdAt,
        updatedAt,
      ] = values;
      const hash = String(endpointHash);
      let existing = Array.from(state.pushSubscriptions.values()).find(
        (s) => s.endpoint_hash === hash
      );
      const row = {
        id: existing ? existing.id : crypto.randomUUID(),
        user_id: String(userId),
        endpoint_hash: hash,
        endpoint: String(endpoint),
        p256dh: String(p256dh),
        auth_secret: String(authSecret),
        vapid_version: Number(vapidVersion),
        device_label: String(deviceLabel),
        environment: String(environment),
        enabled: true,
        disabled_reason: null,
        last_seen_at: String(lastSeenAt),
        last_test_sent_at: existing?.last_test_sent_at ?? null,
        created_at: existing ? existing.created_at : String(createdAt),
        updated_at: String(updatedAt),
      };
      state.pushSubscriptions.set(row.id, row);
      return [{ ...row }];
    }

    if (q.startsWith('DELETE FROM public.web_push_subscriptions WHERE id =')) {
      const [id, userId] = values;
      const existing = state.pushSubscriptions.get(String(id));
      if (existing && existing.user_id === String(userId)) {
        state.pushSubscriptions.delete(String(id));
        return [{ id: existing.id }];
      }
      return [];
    }

    if (q.includes('FROM public.web_push_subscriptions WHERE id =') && q.includes('AND user_id =')) {
      const [id, userId] = values;
      const sub = state.pushSubscriptions.get(String(id));
      return sub && sub.user_id === String(userId) ? [{ ...sub }] : [];
    }

    if (q.includes('FROM public.web_push_subscriptions WHERE user_id =') && q.includes('AND enabled = true')) {
      const userId = String(values[0]);
      return Array.from(state.pushSubscriptions.values()).filter(
        (s) => s.user_id === userId && s.enabled
      );
    }

    if (q.includes('FROM public.web_push_subscriptions WHERE user_id =')) {
      const userId = String(values[0]);
      return Array.from(state.pushSubscriptions.values()).filter(
        (s) => s.user_id === userId
      );
    }

    if (q.startsWith('UPDATE public.web_push_subscriptions SET last_test_sent_at =')) {
      const [sentAt, , , id, userId] = values;
      const sub = state.pushSubscriptions.get(String(id));
      if (sub && sub.user_id === String(userId)) {
        sub.last_test_sent_at = String(sentAt);
        sub.last_seen_at = String(sentAt);
        sub.updated_at = String(sentAt);
      }
      return [];
    }

    // 14. Scheduler queries
    if (q.startsWith('SELECT * FROM public.study_schedules WHERE enabled = true AND reminder_enabled = true AND next_reminder_at IS NOT NULL')) {
      const nowMs = new Date(String(values[0])).getTime();
      const limit = Number(values[1]);
      return Array.from(state.schedules.values())
        .filter(
          (s) =>
            s.enabled &&
            s.reminder_enabled &&
            s.next_reminder_at &&
            new Date(s.next_reminder_at).getTime() <= nowMs
        )
        .sort(
          (a, b) =>
            new Date(a.next_reminder_at).getTime() - new Date(b.next_reminder_at).getTime()
        )
        .slice(0, limit)
        .map((s) => ({ ...s }));
    }

    if (q.startsWith('UPDATE public.study_schedules SET next_reminder_at =')) {
      const [nextReminderAt, updatedAt, userId, revision] = values;
      const sched = state.schedules.get(String(userId));
      if (
        sched &&
        sched.enabled &&
        sched.reminder_enabled &&
        sched.revision === Number(revision)
      ) {
        sched.next_reminder_at = String(nextReminderAt);
        sched.updated_at = String(updatedAt);
        return [{ user_id: sched.user_id }];
      }
      return [];
    }

    if (q.startsWith('INSERT INTO public.study_reminder_occurrences')) {
      const [
        userId,
        localDate,
        scheduleRevision,
        scheduledFor,
        expiresAt,
        leaseOwner,
        leasedUntil,
        createdAt,
        updatedAt,
      ] = values;
      const d = String(localDate).slice(0, 10);
      const rev = Number(scheduleRevision);
      const dup = Array.from(state.occurrences.values()).find(
        (o) =>
          o.user_id === String(userId) &&
          o.local_date === d &&
          o.reminder_slot === 'daily' &&
          o.schedule_revision === rev
      );
      if (dup) return [];
      const row = {
        id: crypto.randomUUID(),
        user_id: String(userId),
        local_date: d,
        reminder_slot: 'daily',
        schedule_revision: rev,
        scheduled_for: String(scheduledFor),
        expires_at: String(expiresAt),
        state: 'sending',
        lease_owner: String(leaseOwner),
        leased_until: String(leasedUntil),
        retry_count: 0,
        next_retry_at: null,
        skip_reason: null,
        created_at: String(createdAt),
        updated_at: String(updatedAt),
      };
      state.occurrences.set(row.id, row);
      return [{ id: row.id, retry_count: 0, state: 'sending' }];
    }

    if (q.startsWith('UPDATE public.study_reminder_occurrences AS occ')) {
      const [workerId, leaseUntil, nowIso, retryCheckIso, leaseCheckIso] = values;
      const nowMs = new Date(String(retryCheckIso)).getTime();
      const leaseMs = new Date(String(leaseCheckIso)).getTime();
      const claimed = [];
      for (const occ of state.occurrences.values()) {
        const isRetryReady =
          occ.state === 'claimed' &&
          (!occ.next_retry_at || new Date(occ.next_retry_at).getTime() <= nowMs);
        const isLeaseExpired =
          occ.state === 'sending' &&
          occ.leased_until &&
          new Date(occ.leased_until).getTime() <= leaseMs;
        if (isRetryReady || isLeaseExpired) {
          const sched = state.schedules.get(occ.user_id);
          if (!sched) continue;
          occ.state = 'sending';
          occ.lease_owner = String(workerId);
          occ.leased_until = String(leaseUntil);
          occ.updated_at = String(nowIso);
          claimed.push({
            ...occ,
            time_zone: sched.time_zone,
            daily_goal: sched.daily_goal,
          });
        }
      }
      return claimed;
    }

    if (q.startsWith('UPDATE public.study_reminder_occurrences SET state =')) {
      const id = String(values[values.length - 1]);
      const occ = state.occurrences.get(id);
      if (occ) {
        if (q.includes("state = 'expired'")) {
          occ.state = 'expired';
          occ.skip_reason = 'stale_window_exceeded';
        } else if (q.includes("skip_reason = 'schedule_disabled_or_revised'")) {
          occ.state = 'skipped';
          occ.skip_reason = 'schedule_disabled_or_revised';
        } else if (q.includes("skip_reason = 'entitlement_inactive'")) {
          occ.state = 'skipped';
          occ.skip_reason = 'entitlement_inactive';
        } else if (q.includes("skip_reason = 'goal_met'")) {
          occ.state = 'skipped';
          occ.skip_reason = 'goal_met';
        } else if (q.includes("skip_reason = 'no_active_subscription'")) {
          occ.state = 'skipped';
          occ.skip_reason = 'no_active_subscription';
        } else if (q.includes("skip_reason = 'vapid_not_configured'")) {
          occ.state = 'failed';
          occ.skip_reason = 'vapid_not_configured';
        } else if (q.includes("state = 'claimed'")) {
          occ.state = 'claimed';
          occ.retry_count += 1;
          occ.next_retry_at = String(values[0]);
        } else if (q.includes("state = 'provider_accepted'")) {
          occ.state = 'provider_accepted';
        } else if (q.includes("state = 'failed'")) {
          occ.state = 'failed';
        }
        occ.leased_until = null;
      }
      return [];
    }

    if (q.startsWith('INSERT INTO public.study_reminder_deliveries')) {
      const [occId, subId, createdAt, updatedAt] = values;
      const key = `${occId}:${subId}`;
      const existing = state.deliveries.get(key);
      if (existing) {
        if (existing.state !== 'provider_accepted' && existing.state !== 'subscription_gone') {
          existing.state = 'sending';
          existing.updated_at = String(updatedAt);
        }
        return [{ ...existing }];
      }
      const row = {
        id: crypto.randomUUID(),
        occurrence_id: String(occId),
        subscription_id: String(subId),
        state: 'sending',
        provider_status: null,
        error_code: null,
        retry_count: 0,
        next_retry_at: null,
        accepted_at: null,
        last_attempt_at: null,
        created_at: String(createdAt),
        updated_at: String(updatedAt),
      };
      state.deliveries.set(key, row);
      return [{ ...row }];
    }

    if (q.startsWith('UPDATE public.study_reminder_deliveries SET')) {
      const id = String(values[values.length - 1]);
      const del = Array.from(state.deliveries.values()).find((d) => d.id === id);
      if (del) {
        if (q.includes("state = 'provider_accepted'")) {
          del.state = 'provider_accepted';
          del.provider_status = Number(values[0]);
          del.accepted_at = String(values[1]);
        } else if (q.includes("state = 'subscription_gone'")) {
          del.state = 'subscription_gone';
          del.provider_status = Number(values[0]);
          del.error_code = 'SUBSCRIPTION_GONE';
        } else if (q.includes("state = 'retry_scheduled'")) {
          del.state = 'retry_scheduled';
          del.retry_count += 1;
          if (q.includes('provider_status =')) {
            del.provider_status = Number(values[0]);
            del.next_retry_at = String(values[1]);
          } else {
            del.next_retry_at = String(values[0]);
          }
        } else if (q.includes("state = 'failed'")) {
          del.state = 'failed';
        }
      }
      return [];
    }

    throw new Error(`Unhandled SQL in schedule mock: ${q}`);
  };

  return { sql, state };
}

test('S04: RFC 8291 aes128gcm encryption + RFC 8292 VAPID signing round-trip and runtime benchmark', async () => {
  const vapidKeys = await generateVapidKeyPair();
  const subscriber = await generateBrowserSubscriberKeys();
  const now = new Date('2026-10-17T18:00:00.000Z');
  const payload = buildGenericStudyReminderPayload(now, '/practice/');

  const signedRequest = await buildSignedWebPushRequest({
    subscription: {
      endpoint: 'https://fcm.googleapis.com/fcm/send/device-token-123',
      p256dh: subscriber.p256dh,
      authSecret: subscriber.auth,
    },
    vapid: {
      publicKey: vapidKeys.publicKey,
      privateKey: vapidKeys.privateKey,
      subject: 'mailto:support@lecterniq.com',
    },
    payload,
    ttlSeconds: 900,
    topic: 'jambprep-study-reminder',
    now,
  });

  assert.equal(signedRequest.headers['Content-Encoding'], 'aes128gcm');
  assert.equal(signedRequest.headers.TTL, '900');
  assert.equal(signedRequest.headers.Topic, 'jambprep-study-reminder');
  assert.match(signedRequest.headers.Authorization, /^vapid t=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+, k=[A-Za-z0-9_-]+$/);

  const decryptedJson = await decryptWebPushAes128GcmPayload({
    ciphertextBody: signedRequest.body,
    subscriberKeyPair: subscriber.keyPair,
    subscriberPublicKeyBytes: subscriber.publicKeyBytes,
    subscriberAuthSecretBytes: subscriber.authBytes,
  });

  const decrypted = JSON.parse(decryptedJson);
  assert.deepEqual(decrypted, payload);
  assert.equal(decrypted.title, 'Time for a little progress');
  assert.equal(decrypted.url, '/practice/');

  // Benchmark 25 consecutive Web Push encryptions + VAPID JWT signatures
  const startMs = performance.now();
  for (let i = 0; i < 25; i += 1) {
    await buildSignedWebPushRequest({
      subscription: {
        endpoint: `https://fcm.googleapis.com/fcm/send/bench-${i}`,
        p256dh: subscriber.p256dh,
        authSecret: subscriber.auth,
      },
      vapid: {
        publicKey: vapidKeys.publicKey,
        privateKey: vapidKeys.privateKey,
        subject: 'mailto:support@lecterniq.com',
      },
      payload,
      now,
    });
  }
  const elapsedMs = performance.now() - startMs;
  // 25 encryptions + ES256 signatures must complete well within Worker CPU budgets (< 500ms in local Node)
  assert.ok(elapsedMs < 1500, `Expected 25 Web Push encryptions < 1500ms, got ${elapsedMs.toFixed(1)}ms`);
});

test('S04: validateWebPushSubscriptionInput blocks SSRF, non-HTTPS, credentials, custom ports, and invalid P-256 keys', async () => {
  const subscriber = await generateBrowserSubscriberKeys();

  const valid = await validateWebPushSubscriptionInput({
    endpoint: 'https://web.push.apple.com/Q123456',
    keys: {
      p256dh: subscriber.p256dh,
      auth: subscriber.auth,
    },
    deviceLabel: 'iPhone Home Screen <script>',
    environment: 'ios_home_screen_pwa',
  });
  assert.equal(valid.endpointHost, 'web.push.apple.com');
  assert.equal(valid.environment, 'ios_home_screen_pwa');
  assert.ok(!valid.deviceLabel.includes('<'));

  const invalidCases = [
    { endpoint: 'http://fcm.googleapis.com/fcm/send/1', keys: { p256dh: subscriber.p256dh, auth: subscriber.auth } },
    { endpoint: 'https://user:pass@fcm.googleapis.com/fcm/send/1', keys: { p256dh: subscriber.p256dh, auth: subscriber.auth } },
    { endpoint: 'https://fcm.googleapis.com:8443/fcm/send/1', keys: { p256dh: subscriber.p256dh, auth: subscriber.auth } },
    { endpoint: 'https://127.0.0.1/fcm/send/1', keys: { p256dh: subscriber.p256dh, auth: subscriber.auth } },
    { endpoint: 'https://evil-relay.example.com/push/1', keys: { p256dh: subscriber.p256dh, auth: subscriber.auth } },
    { endpoint: 'https://fcm.googleapis.com/fcm/send/1', keys: { p256dh: 'not-a-valid-key', auth: subscriber.auth } },
    { endpoint: 'https://fcm.googleapis.com/fcm/send/1', keys: { p256dh: subscriber.p256dh, auth: base64UrlEncode(new Uint8Array(8)) } },
  ];

  for (const bad of invalidCases) {
    await assert.rejects(
      () => validateWebPushSubscriptionInput(bad),
      (err) => err.status === 422
    );
  }
});

test('S02: Timezone day boundaries, leap day, DST spring-forward/fall-back, and streak calculation', () => {
  // Africa/Lagos is UTC+1: 22:59:59Z is still 23:59:59 on Oct 17; 23:00:00Z is 00:00:00 on Oct 18
  assert.equal(
    resolveLocalDate(new Date('2026-10-17T22:59:59Z'), 'Africa/Lagos'),
    '2026-10-17'
  );
  assert.equal(
    resolveLocalDate(new Date('2026-10-17T23:00:00Z'), 'Africa/Lagos'),
    '2026-10-18'
  );

  // Leap-year rollover (2028 is a leap year)
  assert.equal(addCalendarDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addCalendarDays('2028-02-29', 1), '2028-03-01');
  // Year rollover
  assert.equal(addCalendarDays('2026-12-31', 1), '2027-01-01');

  // Saving a reminder time in the future today schedules for today; past time schedules for tomorrow
  const nowLagos1800 = new Date('2026-10-17T17:00:00Z'); // 18:00 WAT
  const futureToday = computeNextReminderUtc({
    now: nowLagos1800,
    reminderLocalTime: '19:00',
    timeZone: 'Africa/Lagos',
  });
  assert.equal(futureToday.scheduledLocalDate, '2026-10-17');
  assert.equal(futureToday.nextReminderAt.toISOString(), '2026-10-17T18:00:00.000Z');

  const pastToday = computeNextReminderUtc({
    now: nowLagos1800,
    reminderLocalTime: '17:30',
    timeZone: 'Africa/Lagos',
  });
  assert.equal(pastToday.scheduledLocalDate, '2026-10-18');
  assert.equal(pastToday.nextReminderAt.toISOString(), '2026-10-18T16:30:00.000Z');

  // DST spring-forward gap in America/New_York on 2026-03-08 (02:00 -> 03:00 EDT)
  const springForwardUtc = resolveLocalWallTimeToUtc('2026-03-08', '02:30', 'America/New_York');
  assert.ok(!Number.isNaN(springForwardUtc.getTime()));

  // Streak rules: yesterday qualified keeps currentStreak alive while today is unfinished
  const aliveYesterday = computeStudyStreakSummary({
    qualifiedLocalDates: ['2026-10-14', '2026-10-15', '2026-10-16'],
    todayLocalDate: '2026-10-17',
    priorBestStreak: 2,
  });
  assert.equal(aliveYesterday.currentStreak, 3);
  assert.equal(aliveYesterday.bestStreak, 3);
  assert.equal(aliveYesterday.qualifiedToday, false);

  // Qualifying today extends currentStreak to 4
  const qualifiedToday = computeStudyStreakSummary({
    qualifiedLocalDates: ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'],
    todayLocalDate: '2026-10-17',
    priorBestStreak: 3,
  });
  assert.equal(qualifiedToday.currentStreak, 4);
  assert.equal(qualifiedToday.bestStreak, 4);
  assert.equal(qualifiedToday.qualifiedToday, true);

  // Missing a full local day resets currentStreak to 0 while preserving bestStreak
  const missedDay = computeStudyStreakSummary({
    qualifiedLocalDates: ['2026-10-14', '2026-10-15'],
    todayLocalDate: '2026-10-17',
    priorBestStreak: 5,
  });
  assert.equal(missedDay.currentStreak, 0);
  assert.equal(missedDay.bestStreak, 5);
});

test('S01/S02/S04/S06: End-to-end Premium ownership, frozen goal transition, practice/mock answer accrual, expiry opt-out, and scheduler dispatch', async () => {
  const { sql, state } = createScheduleMockSql();
  const freeUserId = '11111111-1111-4111-8111-111111111111';
  const premiumUserId = '22222222-2222-4222-8222-222222222222';
  const attemptId = '33333333-3333-4333-8333-333333333333';
  const q1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  const q2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
  const q3 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3';
  const now = new Date('2026-10-17T10:00:00.000Z'); // 11:00 WAT

  // Grant active Premium to premiumUserId
  state.entitlements.set(premiumUserId, [
    { status: 'active', expires_at: '2026-11-17T10:00:00.000Z' },
  ]);

  // 1. Free user sees free_locked and cannot activate Schedule or subscribe push
  const freeView = await getStudyScheduleState(sql, freeUserId, { now });
  assert.equal(freeView.accessState, 'free_locked');
  assert.equal(freeView.canActivateOrEdit, false);

  await assert.rejects(
    () =>
      updateStudyScheduleSettings(
        sql,
        freeUserId,
        { enabled: true, dailyGoal: 5 },
        { now }
      ),
    (err) => err.status === 403 && err.code === 'FORBIDDEN_ENTITLEMENT_REQUIRED'
  );

  // 2. Active Premium user activates Schedule with dailyGoal = 2 and reminder at 19:00 Africa/Lagos
  const activated = await updateStudyScheduleSettings(
    sql,
    premiumUserId,
    {
      enabled: true,
      dailyGoal: 2,
      reminderEnabled: true,
      reminderLocalTime: '19:00',
      timeZone: 'Africa/Lagos',
    },
    { now }
  );
  assert.equal(activated.accessState, 'premium_active');
  assert.equal(activated.schedule.enabled, true);
  assert.equal(activated.schedule.dailyGoal, 2);
  assert.equal(activated.todayProgress.targetQuestions, 2);
  assert.equal(activated.schedule.nextReminderAt, '2026-10-17T18:00:00.000Z');

  // 3. Mid-day goal change to 10 freezes today's target at 2 and schedules 10 for tomorrow (2026-10-18)
  const editedMidDay = await updateStudyScheduleSettings(
    sql,
    premiumUserId,
    {
      enabled: true,
      dailyGoal: 10,
      reminderEnabled: true,
      reminderLocalTime: '19:00',
      timeZone: 'Africa/Lagos',
      expectedRevision: activated.schedule.revision,
    },
    { now }
  );
  assert.equal(editedMidDay.todayProgress.targetQuestions, 2);
  assert.equal(editedMidDay.schedule.dailyGoal, 2);
  assert.equal(editedMidDay.schedule.pendingDailyGoal, 10);
  assert.equal(editedMidDay.schedule.pendingGoalEffectiveDate, '2026-10-18');

  // Stale revision conflict is rejected with 409
  await assert.rejects(
    () =>
      updateStudyScheduleSettings(
        sql,
        premiumUserId,
        { enabled: true, dailyGoal: 15, expectedRevision: 1 },
        { now }
      ),
    (err) => err.status === 409
  );

  // 4. Register Push subscription for Premium user and test 3-device cap
  const vapid = await generateVapidKeyPair();
  const subKeys1 = await generateBrowserSubscriberKeys();
  const subKeys2 = await generateBrowserSubscriberKeys();
  const subKeys3 = await generateBrowserSubscriberKeys();
  const subKeys4 = await generateBrowserSubscriberKeys();

  const dev1 = await upsertUserPushSubscription(
    sql,
    premiumUserId,
    {
      endpoint: 'https://fcm.googleapis.com/fcm/send/dev-1',
      keys: { p256dh: subKeys1.p256dh, auth: subKeys1.auth },
      deviceLabel: 'Device 1',
    },
    { now: new Date('2026-10-17T10:01:00Z') }
  );
  await upsertUserPushSubscription(
    sql,
    premiumUserId,
    {
      endpoint: 'https://fcm.googleapis.com/fcm/send/dev-2',
      keys: { p256dh: subKeys2.p256dh, auth: subKeys2.auth },
      deviceLabel: 'Device 2',
    },
    { now: new Date('2026-10-17T10:02:00Z') }
  );
  await upsertUserPushSubscription(
    sql,
    premiumUserId,
    {
      endpoint: 'https://fcm.googleapis.com/fcm/send/dev-3',
      keys: { p256dh: subKeys3.p256dh, auth: subKeys3.auth },
      deviceLabel: 'Device 3',
    },
    { now: new Date('2026-10-17T10:03:00Z') }
  );
  // 4th device automatically disables the oldest (dev1)
  await upsertUserPushSubscription(
    sql,
    premiumUserId,
    {
      endpoint: 'https://fcm.googleapis.com/fcm/send/dev-4',
      keys: { p256dh: subKeys4.p256dh, auth: subKeys4.auth },
      deviceLabel: 'Device 4',
    },
    { now: new Date('2026-10-17T10:04:00Z') }
  );

  const afterCap = await getStudyScheduleState(sql, premiumUserId, { now });
  const enabledDevices = afterCap.pushSubscriptions.filter((d) => d.enabled);
  assert.equal(enabledDevices.length, 3);
  assert.equal(
    afterCap.pushSubscriptions.find((d) => d.id === dev1.id)?.enabled,
    false
  );

  // 5. Practice & Mock answer accrual + deduplication
  const ans1 = await recordAcceptedStudyGoalEvent(sql, {
    userId: premiumUserId,
    attemptId,
    questionId: q1,
    mode: 'practice',
    now: new Date('2026-10-17T12:00:00Z'),
  });
  assert.equal(ans1.accrued, true);
  assert.equal(ans1.acceptedCount, 1);
  assert.equal(ans1.qualifiedToday, false);

  // Duplicate answer to q1 on the same local day does not increment acceptedCount
  const dupAns1 = await recordAcceptedStudyGoalEvent(sql, {
    userId: premiumUserId,
    attemptId,
    questionId: q1,
    mode: 'mock',
    now: new Date('2026-10-17T12:05:00Z'),
  });
  assert.equal(dupAns1.accrued, false);
  assert.equal(dupAns1.reason, 'duplicate_question_today');
  assert.equal(dupAns1.acceptedCount, 1);

  // Second distinct question (q2) in mock mode qualifies today's goal of 2!
  const ans2 = await recordAcceptedStudyGoalEvent(sql, {
    userId: premiumUserId,
    attemptId,
    questionId: q2,
    mode: 'mock',
    now: new Date('2026-10-17T12:10:00Z'),
  });
  assert.equal(ans2.accrued, true);
  assert.equal(ans2.acceptedCount, 2);
  assert.equal(ans2.qualifiedToday, true);
  assert.equal(ans2.justQualified, true);

  // 6. Scheduler tick at 18:02 UTC (19:02 WAT) skips sending because today's goal is already met!
  let pushCalls = 0;
  const tickGoalMet = await runStudyReminderSchedulerTick(sql, {
    now: new Date('2026-10-17T18:02:00Z'),
    vapid: {
      publicKey: vapid.publicKey,
      privateKey: vapid.privateKey,
      subject: 'mailto:support@lecterniq.com',
    },
    pushSender: async () => {
      pushCalls += 1;
      return { status: 201 };
    },
  });
  assert.equal(tickGoalMet.claimedOccurrences, 1);
  assert.equal(tickGoalMet.skippedGoalMet, 1);
  assert.equal(pushCalls, 0);

  // 7. Next local day (2026-10-18): pending goal of 10 promotes to active, and at 18:02 UTC (goal not met yet) scheduler dispatches Web Push
  const ansNextDay = await recordAcceptedStudyGoalEvent(sql, {
    userId: premiumUserId,
    attemptId,
    questionId: q3,
    mode: 'practice',
    now: new Date('2026-10-18T09:00:00Z'),
  });
  assert.equal(ansNextDay.accrued, true);
  assert.equal(ansNextDay.targetQuestions, 10);
  assert.equal(ansNextDay.acceptedCount, 1);
  assert.equal(ansNextDay.qualifiedToday, false);

  const tickSend = await runStudyReminderSchedulerTick(sql, {
    now: new Date('2026-10-18T18:02:00Z'),
    vapid: {
      publicKey: vapid.publicKey,
      privateKey: vapid.privateKey,
      subject: 'mailto:support@lecterniq.com',
    },
    pushSender: async () => {
      pushCalls += 1;
      return { status: 201 };
    },
  });
  assert.equal(tickSend.claimedOccurrences, 1);
  assert.equal(tickSend.acceptedDeliveries, 3);
  assert.equal(pushCalls, 3);

  // 8. Test reminder endpoint enforces 60s cooldown
  const activeDeviceId = enabledDevices[0].id;
  const testSend1 = await sendUserTestReminder(
    sql,
    premiumUserId,
    { subscriptionId: activeDeviceId },
    {
      now: new Date('2026-10-18T19:00:00Z'),
      vapid: {
        publicKey: vapid.publicKey,
        privateKey: vapid.privateKey,
        subject: 'mailto:support@lecterniq.com',
      },
      pushSender: async () => ({ status: 201 }),
    }
  );
  assert.equal(testSend1.sent, true);

  await assert.rejects(
    () =>
      sendUserTestReminder(
        sql,
        premiumUserId,
        { subscriptionId: activeDeviceId },
        {
          now: new Date('2026-10-18T19:00:20Z'),
          vapid: {
            publicKey: vapid.publicKey,
            privateKey: vapid.privateKey,
            subject: 'mailto:support@lecterniq.com',
          },
          pushSender: async () => ({ status: 201 }),
        }
      ),
    (err) => err.status === 429
  );

  // 9. When Premium expires, user transitions to expired_readonly, retains bestStreak, cannot accrue new events,
  //    but CAN disable schedule and delete push subscriptions without payment!
  state.entitlements.set(premiumUserId, [
    { status: 'active', expires_at: '2026-10-18T00:00:00.000Z' },
  ]);

  const expiredAccrual = await recordAcceptedStudyGoalEvent(sql, {
    userId: premiumUserId,
    attemptId,
    questionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    mode: 'practice',
    now: new Date('2026-10-19T10:00:00Z'),
  });
  assert.equal(expiredAccrual.accrued, false);
  assert.equal(expiredAccrual.reason, 'not_premium');

  const expiredView = await getStudyScheduleState(sql, premiumUserId, {
    now: new Date('2026-10-19T10:00:00Z'),
  });
  assert.equal(expiredView.accessState, 'expired_readonly');
  assert.equal(expiredView.streak.bestStreak, 1);
  assert.equal(expiredView.canActivateOrEdit, false);
  assert.equal(expiredView.canDisableOrDetach, true);

  // Expired user can disable Schedule without payment
  const disabledAfterExpiry = await updateStudyScheduleSettings(
    sql,
    premiumUserId,
    { enabled: false },
    { now: new Date('2026-10-19T10:05:00Z') }
  );
  assert.equal(disabledAfterExpiry.schedule.enabled, false);

  // Expired user can delete/detach a device subscription without payment
  const delRes = await deleteUserPushSubscription(sql, premiumUserId, activeDeviceId);
  assert.equal(delRes.deleted, true);
});

test('S06: Scheduler handles 410 gone auto-disable, 429 retry backoff, 403 VAPID error isolation, 15m stale window, and kill-switch', async () => {
  const { sql, state } = createScheduleMockSql();
  const vapid = await generateVapidKeyPair();
  const userA = 'aaaaaaaa-1111-4111-8111-111111111111';
  const userStale = 'bbbbbbbb-2222-4222-8222-222222222222';

  state.entitlements.set(userA, [
    { status: 'active', expires_at: '2026-12-31T23:59:59.000Z' },
  ]);
  state.entitlements.set(userStale, [
    { status: 'active', expires_at: '2026-12-31T23:59:59.000Z' },
  ]);

  const setupTime = new Date('2026-10-20T10:00:00Z');
  await updateStudyScheduleSettings(
    sql,
    userA,
    {
      enabled: true,
      dailyGoal: 10,
      reminderEnabled: true,
      reminderLocalTime: '19:00',
      timeZone: 'Africa/Lagos',
    },
    { now: setupTime }
  );
  await updateStudyScheduleSettings(
    sql,
    userStale,
    {
      enabled: true,
      dailyGoal: 10,
      reminderEnabled: true,
      reminderLocalTime: '18:00',
      timeZone: 'Africa/Lagos',
    },
    { now: setupTime }
  );

  const subGoneKeys = await generateBrowserSubscriberKeys();
  const subRetryKeys = await generateBrowserSubscriberKeys();
  const subAuthErrKeys = await generateBrowserSubscriberKeys();

  const subGone = await upsertUserPushSubscription(
    sql,
    userA,
    {
      endpoint: 'https://fcm.googleapis.com/fcm/send/sub-gone-410',
      keys: { p256dh: subGoneKeys.p256dh, auth: subGoneKeys.auth },
      deviceLabel: 'Gone Device',
    },
    { now: setupTime }
  );
  const subRetry = await upsertUserPushSubscription(
    sql,
    userA,
    {
      endpoint: 'https://fcm.googleapis.com/fcm/send/sub-retry-429',
      keys: { p256dh: subRetryKeys.p256dh, auth: subRetryKeys.auth },
      deviceLabel: 'Retry Device',
    },
    { now: setupTime }
  );
  const subAuthErr = await upsertUserPushSubscription(
    sql,
    userA,
    {
      endpoint: 'https://fcm.googleapis.com/fcm/send/sub-auth-403',
      keys: { p256dh: subAuthErrKeys.p256dh, auth: subAuthErrKeys.auth },
      deviceLabel: 'AuthErr Device',
    },
    { now: setupTime }
  );

  // 1. Kill-switch STUDY_REMINDER_DISPATCH_ENABLED="false" does not allocate DB or send pushes
  let dbAllocated = false;
  const handler = createStudyReminderSchedulerHandler({
    dbFactory: () => {
      dbAllocated = true;
      return {
        sql,
        db: {},
        isHyperdrive: false,
        runCommittedTransaction: async (fn) => fn(sql),
        runSerializableTransaction: async (fn) => fn(sql),
        cleanup: async () => {},
      };
    },
  });

  const killSwitchSummary = await handler.scheduled(
    { scheduledTime: Date.parse('2026-10-20T18:02:00Z'), cron: '*/5 * * * *' },
    { STUDY_REMINDER_DISPATCH_ENABLED: 'false' },
    { waitUntil: () => {} }
  );
  assert.equal(killSwitchSummary.claimedOccurrences, 0);
  assert.equal(dbAllocated, false);

  // 2. Run tick at 18:02 UTC (19:02 WAT):
  // - userStale's 18:00 WAT (17:00 UTC) reminder is 62m overdue (>15m TTL) -> skippedStale = 1
  // - userA's 19:00 WAT (18:00 UTC) reminder is 2m overdue -> claims & dispatches 3 devices:
  //   * subGone -> 410 (disabled_reason = 'provider_gone')
  //   * subRetry -> 429 (retry_scheduled)
  //   * subAuthErr -> 403 (VAPID_AUTH_ERROR, subscription stays enabled)
  const tick1 = await runStudyReminderSchedulerTick(sql, {
    now: new Date('2026-10-20T18:02:00Z'),
    vapid: {
      publicKey: vapid.publicKey,
      privateKey: vapid.privateKey,
      subject: 'mailto:support@lecterniq.com',
    },
    pushSender: async (req) => {
      if (req.endpoint.endsWith('sub-gone-410')) {
        return { status: 410 };
      }
      if (req.endpoint.endsWith('sub-retry-429')) {
        return { status: 429, retryAfterSeconds: 60 };
      }
      return { status: 403 };
    },
  });

  assert.equal(tick1.claimedOccurrences, 2);
  assert.equal(tick1.skippedStale, 1);
  assert.equal(tick1.disabledGoneSubscriptions, 1);
  assert.equal(tick1.retriedDeliveries, 1);
  assert.equal(tick1.failedDeliveries, 1);

  assert.equal(state.pushSubscriptions.get(subGone.id).enabled, false);
  assert.equal(state.pushSubscriptions.get(subGone.id).disabled_reason, 'provider_gone');
  // 403 VAPID auth error must NOT disable the user's push subscription
  assert.equal(state.pushSubscriptions.get(subAuthErr.id).enabled, true);

  // 3. Subsequent tick 90s later picks up the retryable occurrence and succeeds (201)
  const tick2 = await runStudyReminderSchedulerTick(sql, {
    now: new Date('2026-10-20T18:03:30Z'),
    vapid: {
      publicKey: vapid.publicKey,
      privateKey: vapid.privateKey,
      subject: 'mailto:support@lecterniq.com',
    },
    pushSender: async () => ({ status: 201 }),
  });
  assert.equal(tick2.claimedOccurrences, 1);
  assert.equal(tick2.acceptedDeliveries, 2);
});

test('Mock exam completion automatically qualifies streak and derives 7-day flame history', async () => {
  const { sql, state } = createScheduleMockSql();
  const userId = '44444444-4444-4444-8444-444444444444';
  const now = new Date('2026-10-17T14:00:00Z');

  // Grant active Premium
  state.entitlements.set(userId, [
    { status: 'active', expires_at: '2026-11-17T10:00:00.000Z' },
  ]);

  // Activate schedule
  await updateStudyScheduleSettings(
    sql,
    userId,
    { enabled: true, dailyGoal: 5, reminderLocalTime: '20:00', timeZone: 'Africa/Lagos' },
    { now }
  );

  // Before mock: not qualified today
  const before = await getStudyScheduleState(sql, userId, { now });
  assert.equal(before.todayProgress.qualified, false);
  assert.equal(before.streak.currentStreak, 0);

  // Complete a CBT mock exam
  await recordCompletedMockStreakQualification(sql, {
    userId,
    attemptId: '55555555-5555-4555-8555-555555555555',
    now,
  });

  // Test without explicit profile registration: fallback is 7 days
  const fallbackState = await getStudyScheduleState(sql, userId, { now });
  assert.equal(fallbackState.streak.recentDays.length, 7);

  // Now set user's registration date to 10 days ago (2026-10-07)
  state.profiles.set(userId, { created_at: '2026-10-07T08:00:00.000Z' });

  // After mock: today is qualified, streak is 1, and flame history spans from registration date (11 days)
  const after = await getStudyScheduleState(sql, userId, { now });
  assert.equal(after.todayProgress.qualified, true);
  assert.equal(after.streak.qualifiedToday, true);
  assert.equal(after.streak.currentStreak, 1);
  assert.equal(after.streak.bestStreak, 1);
  assert.equal(after.streak.recentDays.length, 11);
  assert.equal(after.streak.recentDays[0].localDate, '2026-10-07');
  const todayEntry = after.streak.recentDays.find((d) => d.isToday);
  assert.ok(todayEntry);
  assert.equal(todayEntry.qualified, true);
  assert.equal(todayEntry.localDate, '2026-10-17');
});


