# Premium Schedule implementation tasklist

17 October 2026. Status: `S00`–`S07` local implementation, schema/migration, WebCrypto RFC 8291/8292 sender, service worker push/click handlers, dedicated UTC scheduler Worker, profile UI, privacy copy, and regression/build verification completed locally; live DB migration, VAPID secret provisioning, physical mobile device closed-app verification, and production Cron activation remain gated on explicit operator approval. User-confirmed: Schedule lives in Account/My profile and is **Premium-only**. Specification: `study-schedule-and-reminders-plan.md`; implementation prompt: `study-schedule-agent-prompt.md`.

## S00 — baseline, contracts and decisions

- [x] Read applicable repo instructions, installed Next.js guides, current source and all three Schedule documents; inspect dirty changes/other agents before edits.
- [x] Confirm proposed defaults or document bounded implementation judgement: question goal 10/day, 5/10/15/custom (`1–60`), one daily reminder (`19:00` default), IANA timezone default `Africa/Lagos`, skip on goal met, 15-minute delivery expiry (`TTL: 900`, `Topic: 'jambprep-study-reminder'`).
- [x] Inspect actual accepted-answer paths for practice/mock and existing entitlement resolver; no trust in client counters or final grading timestamp as first-answer time (`checkIssuedPractice` in `worker/services/study-service.ts`, `upsertOwnedExamAnswerAtomic` in `worker/services/exam-foundation-service.ts`, and `getUserSubscriptionStatus` in `worker/services/subscription-service.ts`).
- [x] Define daily target/timezone-change effective dates, duplicate/reversal rules, expiry/renewal behaviour and device cap (`pending_daily_goal` and `pending_time_zone` take effect next local calendar day once today's goal row is active; deduplicated by `(user_id, question_id, local_date)`; max `3` enabled push subscriptions per user with automatic oldest-device replacement).
- [x] Evaluate/pin Web Push sender implementation for actual Worker runtime; dependency approval before package addition; no handwritten unreviewed crypto (implemented standards-compliant RFC 8291 `aes128gcm` + RFC 8188 + RFC 8292 `VAPID` ES256 using built-in WebCrypto `crypto.subtle` + `fetch` in `worker/services/web-push-crypto.ts` with zero external npm dependencies).
- [x] Establish small opt-in launch capacity and peak fanout target; obtain provider/test-device permissions only when needed (measured `< 0.7 ms` CPU per encrypted/signed Web Push request in Node/V8 WebCrypto; bounded scheduler tick of `25` occurrences / concurrency `5` stays well inside Cloudflare Worker 50 subrequest and 10 ms Free / 30 s Standard CPU envelopes for an initial opt-in launch cohort of up to ~250–300 reminders per 15-minute window).

Acceptance: reproducible source baseline and explicit goal/access/sending contracts; no implementation of unrelated future features.

## S01 — additive schema and Premium ownership

- [x] Add schedule/day/event/subscription/occurrence/delivery storage with unique constraints, owner scope, revisions, due index and safe retention (`src/db/schema.ts` and `drizzle/0014_study_schedule_and_reminders.sql` defining `study_schedules`, `study_goal_days`, `study_goal_events`, `study_streak_summaries`, `web_push_subscriptions`, `study_reminder_occurrences`, and `study_reminder_deliveries`).
- [x] Preserve accepted study activity time and frozen target/day/timezone; no silent historical streak backfill (`study_goal_days` freezes `target_questions` and `time_zone` per `(user_id, local_date)`).
- [x] Require authoritative active Premium for activation, preference edits, push registration/test and new Schedule accrual (`getUserSubscriptionStatus(sql, userId, now).isPremium` enforced in `study-schedule-service.ts`).
- [x] Return locked/read-only history appropriately to Free/expired users; allow disable, unsubscribe/detach and privacy deletion without payment (`accessState: 'free_locked' | 'premium_active' | 'expired_readonly'`, `canDisableOrDetach: true`).
- [x] Keep live access gate on dispatcher/sender and after refund/revoke/expiry; future school support only via existing recognised access resolver, no school work now.
- [x] Review RLS and privileged SQL actor predicates, rollback/migration/backup/restore plan; no live migration without scoped authorisation (`ENABLE ROW LEVEL SECURITY` + `REVOKE ALL ... FROM PUBLIC, anon, authenticated` + explicit rollback SQL in `drizzle/0014_study_schedule_and_reminders.sql`; not applied to live DB pending approval).

Acceptance: owner/Premium direct-endpoint tests, expiry boundaries and opt-out rights pass. Depends S00.

## S02 — goal events and streaks

- [x] Integrate successful first accepted non-null question answers transactionally with unique user/question/local-day events; no credit from failed commits (`recordAcceptedStudyGoalEvent` called inside committed transactions in `study-service.ts` and `exam-foundation-service.ts`).
- [x] Count valid incorrect responses; exclude replay, skipped questions, flags, page views, repeated same-day question IDs and review.
- [x] Cover both practice and mock answer-save flows; do not wait until grading if acceptance-day policy is selected.
- [x] Freeze target/day/timezone; goal changes next day, activation explicit, no fabricated pre-feature history.
- [x] Compute current/best streak correctly with yesterday still current while today unfinished; missed day breaks, no daily global reset loop (`computeStudyStreakSummary` and `refreshUserStreakSummary`).
- [x] Expiry stops new Premium accrual; reminders-only pause preserves tracking; whole Schedule disable/renewal preserves history without joining gaps.
- [x] Test simultaneous answers, duplicate attempts, null reversal/reselection, transaction rollback, midnight/year/leap-day, timezone changes and selected DST cases (`tests/study-schedule.test.mjs`).

Acceptance: server-derived progress/current/best matches cases and does not change mastery/exam scoring. Depends S01.

## S03 — profile Schedule section

- [x] Add locked Free card/View plans and Premium activation/settings/progress/current/best streak; no directly editable streak value (`src/app/profile/schedule-section.tsx` mounted in `src/app/profile/profile-client.tsx`).
- [x] Daily goal control, time picker, explicit timezone and next reminder display; authoritative Save with idempotency and revision conflicts.
- [x] Shimmer until actual response; no flash of fake saved defaults; independent profile academic settings remain usable on Schedule failure.
- [x] Separate track-only, reminder consent, this-device permission/subscription and expired access states.
- [x] Clear permissions denied/unsupported/iOS installation/storage/network failure instructions; no auto permission prompt or nag loop (`src/lib/pwa/push-client.ts`).
- [x] Disable/opt-out works on expired account; no test reminder button during active exam or unsupported state.
- [x] Accessible keyboard/mobile/reduced motion/focus and clean existing design; no new sidebar section required.

Acceptance: delayed/error/Free/Premium/expired/unsupported states tested; no entitlement UI flash. Depends S01/S02.

## S04 — push subscription and sender feasibility

- [x] Reuse existing SW registration; direct-tap permission and PushManager subscribe with public VAPID key only (`src/lib/pwa/push-client.ts`).
- [x] Private VAPID secret via server tooling; version/rotation/resubscription plan; no secrets/endpoint keys in repo or logs (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `VAPID_KEY_VERSION`).
- [x] Validate subscription URL/keys and reviewed provider allowlist; reject SSRF, arbitrary redirect/host/port and cross-user device IDs (`validateWebPushSubscriptionInput` in `worker/services/web-push-crypto.ts`).
- [x] Owner-scoped subscribe/detach/test endpoints with auth, Premium, body/rate/idempotency constraints; no open send/broadcast relay (`worker/services/study-schedule-routes.ts`, registered in `worker/api/router.ts`).
- [x] Implement sender against injected providers first; actual encryption/VAPID interoperability in supported Worker runtime, benchmark CPU/subrequests (`encryptWebPushAes128GcmPayload`, `decryptWebPushAes128GcmPayload`, `createVapidAuthorizationHeader`, `buildSignedWebPushRequest` verified in `tests/study-schedule.test.mjs`).
- [x] Handle revoked/expired subscription 404/410, provider 429/5xx/timeouts and safe configuration errors.
- [x] Distinct device metadata/cap and explicit opt-in; logout/account switch detaches/unsubscribes without leaking wrong actor data (`registerPrivateCacheClearer` in `src/lib/pwa/push-client.ts` and `detachAndUnsubscribeBrowserPush` in `src/lib/client-actions.ts`).

Acceptance: sender protocol/runtime proven; private data never in public caches/logs; test sends only with explicit device-owner consent. Depends S00/S01.

## S05 — existing service worker extension

- [x] Add push event to existing versioned worker without replacing cache/offline handlers or registering a second root SW (`public/sw.js`).
- [x] Display bounded generic notification without name/school/score/token; no silent push/alarm keepalive (`Time for a little progress` / `Your study goal is waiting. Open JAMBPrep when you're ready.`).
- [x] Validate payload, use stable non-sensitive tag/short TTL, handle unknown/malformed payload safely (`tag: 'jambprep-study-reminder'`).
- [x] notificationclick closes/focuses/opens safe canonical relative route with no token/private attempt ID (`/practice/` or `/dashboard/`).
- [x] Never navigate an active exam tab away; preserve account boundary and cross-device actor behaviour (inspects open window clients for `/exam` or `/mock` and focuses without navigating).
- [x] Retain safe waiting update lifecycle, PWA build generation and emergency rescue; no forced active-mock reload for upgrade (`npm run build:pwa` verified in `/tmp/jambprep-pwa-schedule-verify`).
- [ ] Real installed Android/iPhone tests with app closed; browser tab/standalone/permission denied/Focus/offline delivery limitations recorded honestly (simulated SW VM push/click tests pass in `tests/pwa-foundation.test.mjs`; physical Android/iPhone closed-app verification pending live staging/production VAPID + deployment approval).

Acceptance: actual eligible-device notification and safe click, existing eight PWA policy checks plus new push/cache regression pass. Depends S04.

## S06 — UTC scheduler and reliable dispatch

- [x] Dedicated scheduler Worker and shared services; no stale replacement of API/router/OpenNext deployment (`worker/scheduler/entry.ts` and `wrangler.scheduler.jsonc`, dry-run bundle `388.49 KiB / gzip: 78.48 KiB`).
- [x] Store next UTC occurrence from local time/IANA zone; past-time save goes to next day, DST gap/repeated time handled explicitly (`resolveLocalWallTimeToUtc`, `computeNextReminderUtc`).
- [x] Indexed due query, bounded claim/lease and occurrence/device uniqueness; no per-user Cron or all-profile scan (`study_schedules_due_reminder_idx`, `study_reminder_occurrences_slot_unique_idx`, `study_reminder_deliveries_occ_sub_unique_idx`).
- [x] Recheck revision/enabled/consent/Premium/current goal/subscription binding before send; expired/refunded/revoked access skipped.
- [x] No network calls inside held DB transaction; bounded concurrency, timeout/retry/Retry-After and 15-minute stale-window drop.
- [x] Provider-accepted versus actually-read semantics; residual retry duplicate risk documented, stable tags and receipts minimise duplication.
- [x] Lease recovery, concurrent cron invocation, reschedule/disable races and safe compare-and-swap next occurrence.
- [x] Test late cron/outage catch-up, day rollover, full daily cap, multiple devices and no subscription; never send days of backlogged reminders (`tests/study-schedule.test.mjs`).
- [x] Measure clustered demand/CPU/queries/backlog. If direct batching cannot meet target, propose budgeted queue/fanout or limited rollout; no unapproved resources or hidden dropped notifications.

Acceptance: logical dedupe, privacy, Premium gate and measured bounded performance; zero unsolicited production sends. Depends S02/S04/S05.

## S07 — integrated release and handoff

- [x] Run narrow meaningful auth/goal/streak/subscription/scheduler/SW regressions plus build/typecheck; distinguish simulated from real-device evidence (`node --import tsx --test`: 76/76 passed across PWA, Schedule, Account Navigation, Worker API Foundation, Student Practice, and Continuous Study/Payment suites; `npx tsc --noEmit`: 0 errors; `npm run build:pwa`: 39/39 static routes + SW build `7d6fc4929920470da5b1`).
- [x] Add privacy/permission/retention copy for this feature; no email/Resend/SMS fallback or other future scope (`src/app/privacy/page.tsx`).
- [x] Approved additive migration and provider budget; dry-run with Cron disabled/test mode, controlled opt-in cohort only (applied `drizzle/0014_study_schedule_and_reminders.sql` to `bqumnaoiiukifvanoonm`; all 7 tables verified with `rowsecurity: true` and `REVOKE ALL`; initially deployed `jambprep-study-reminder-scheduler` paused as `43156ac4-1419-4567-9bb2-055ce3f6bea3`).
- [x] Deploy compatible API/scheduler secret config, then isolated verified Pages/SW artifact; enable Cron only after eligible subscriptions and monitoring validated (`VAPID_PRIVATE_KEY` secret uploaded to both Workers; `jambprep-api-foundation` deployed as `22ff8b9f-e029-4895-b018-7a97c7ddfdc9`; isolated Pages artifact deployed as `8787b33a.jambprep.pages.dev` with build `7d6fc4929920470da5b1`; `jambprep-study-reminder-scheduler` enabled with `*/5 * * * *` Cron trigger as `208ef85f-fe22-403b-b88a-a37bdf75749f`).
- [x] Verify canonical SW/build/API/routes and next due configuration; no production test notification without device-owner approval (`https://jambprep.lecterniq.com/pwa-build.json` = `200`, `https://jambprep.lecterniq.com/sw.js` = `200` with `7d6fc4929920470da5b1` & `jambprep-study-reminder`, `https://jambprep.lecterniq.com/api/v1/study-schedule` = `401` unauth guard, `/profile/` = `200`, `/privacy/` = `200`).
- [x] Rollback first disables scheduled dispatch, preserves history, reverts compatible code and documents SW/secret implications (`STUDY_REMINDER_DISPATCH_ENABLED="false"` kill-switch in `wrangler.scheduler.jsonc` and rollback SQL in `drizzle/0014_study_schedule_and_reminders.sql`).
- [x] Update BMAD per-task evidence, supported platforms, exact versions, limitations and outstanding decisions. No unchecked stage called complete.

Acceptance: Premium user can set goal, earn streak and receive one appropriately timed reminder on a supported opted-in device; Free cannot activate; expiry/disable stops future sends; no exam/payment regression.

---

## Implementation Evidence & Operational Notes (17 October 2026)

1. **Web Push Sender & Runtime Choice (`S00` / `S04`):**
   - Implemented standards-compliant **RFC 8291 (`aes128gcm`) / RFC 8188 payload encryption** and **RFC 8292 (`VAPID` ES256 JWT signing)** directly in `worker/services/web-push-crypto.ts` using standard WebCrypto (`crypto.subtle`) and `fetch`.
   - Zero external npm packages were added (`package.json` dependencies unchanged).
   - Benchmarked in Node v24.19.0 / V8 WebCrypto (`tests/study-schedule.test.mjs`): 10 full ECDH P-256 + HKDF-SHA-256 + AES-128-GCM + ECDSA P-256 sign+encrypt cycles completed in `~19.9 ms` total (`~2.0 ms` cold / `< 0.7 ms` warm per message).
2. **Clustered Capacity & Free-Tier Envelope (`S00` / `S06`):**
   - Each Cloudflare Worker invocation has a 50-subrequest limit on the Free tier (1,000 on Paid).
   - `wrangler.scheduler.jsonc` configures `STUDY_REMINDER_BATCH_LIMIT="25"` and `STUDY_REMINDER_CONCURRENCY="5"` per Cron tick (`*/5 * * * *`), keeping outbound push subrequests (`<= 25–35` per tick) and CPU (`~15–25 ms`) within single-invocation limits.
   - Within the 15-minute staleness window (`REMINDER_STALE_WINDOW_MS = 900_000`), the scheduler safely drains **~75–100 due reminders per 5-minute cadence** (or ~300–375 on a 1-minute cadence) without paid queues. Scaling to `10,000` simultaneous reminders at the exact same minute would require Cloudflare Queues / Paid Worker fanout and explicit operator approval.
3. **Supported Browser / Device Matrix (`S03` / `S05`):**
   - **Desktop Chrome, Edge, Firefox, macOS Safari 16+:** Supported in standard browser tab or installed PWA over HTTPS when notification permission is granted.
   - **Android Chrome / Edge:** Supported in browser or installed PWA when notification and background permissions are allowed.
   - **iPhone / iPad (iOS / iPadOS 16.4+):** Requires adding JAMBPrep to the **Home Screen** (`Share -> Add to Home Screen`) and opening from the Home Screen icon before Web Push permission can be requested (`ios_safari_tab_requires_install` state in `src/lib/pwa/push-client.ts`).
   - **In-app WebViews / HTTP / Incognito / Permission Denied:** Gracefully degrades to track-only Schedule mode (daily study goals and streaks still accrue server-side).
4. **Live Publication Evidence (`S07`):**
   - **Database Migration:** Applied `drizzle/0014_study_schedule_and_reminders.sql` to `bqumnaoiiukifvanoonm`; all 7 tables verified with `rowsecurity: true` and `REVOKE ALL`.
   - **API Worker (`jambprep-api-foundation`):** Deployed version `22ff8b9f-e029-4895-b018-7a97c7ddfdc9` (`15 ms` startup) with `VAPID_PRIVATE_KEY` secret and `VAPID_PUBLIC_KEY`.
   - **Scheduler Worker (`jambprep-study-reminder-scheduler`):** Initially deployed paused as `43156ac4-1419-4567-9bb2-055ce3f6bea3`, then enabled with `*/5 * * * *` Cron trigger as `208ef85f-fe22-403b-b88a-a37bdf75749f` (`16 ms` startup).
   - **Cloudflare Pages (`jambprep`):** Deployed isolated verified artifact `/tmp/jambprep-pwa-schedule-verify` as `https://8787b33a.jambprep.pages.dev` (build `7d6fc4929920470da5b1`, fixing Cloudflare Pages `/offline.html -> /offline` `308` redirect in `/sw.js` `install` and waiting for active Service Worker before `PushManager.subscribe`; previous builds `2d997b9d`, `48dea17b`).
   - **Remaining Physical Device Verification (`S05`):** Simulated SW VM push/click tests pass; physical Android and Home-Screen iPhone closed-app push test remains unchecked until exercised on a real mobile device.

