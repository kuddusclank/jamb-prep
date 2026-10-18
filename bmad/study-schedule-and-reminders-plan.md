# Study Schedule, daily goals, streaks and PWA reminders

17 October 2026. Status: priority implementation specification, planning only. User requested research, BMAD plan/tasklist and a handoff prompt for another AI agent. No production schedule, notification, schema or application change has been made by this planning task.

Related: `study-schedule-and-reminders-tasklist.md`, `study-schedule-agent-prompt.md`, current PWA implementation and `future-learning-and-school-partnerships-plan.md`. This priority feature does not authorise building the entire future weekly/offline/school roadmap.

## 1. Confirmed scope

- Add a section named **Schedule** inside Account / My profile.
- User explicitly activates it, sets a daily study goal and selects a study reminder time.
- Show study streak and goal progress.
- Send study notifications using an appropriate PWA/background design, including when the app page is closed where supported.
- Prepare an actionable tasklist and agent handoff; research the platform constraints first.
- **Premium-only feature**, explicitly confirmed by the user after the initial planning pass. Free users cannot activate Schedule, active goal/streak tracking or study push reminders.

Proposed first-release defaults, not yet separately confirmed: question-based goal; 10 questions/day; presets5/10/15 plus validated custom count; one daily reminder; Africa/Lagos default with explicit IANA timezone control; server-confirmed distinct questions/day; Premium access is required for Schedule; optional notifications independent of goal tracking; skip reminder when today's goal is already met. If these defaults are accepted as implementation judgement, record them in the tasklist rather than treating them as historic user decisions.

## Premium entitlement contract — user-confirmed

Use the existing authoritative server subscription/entitlement resolver, never client/JWT metadata or cached profile status. GET returns owned access/locked state and permitted historical data; PUT activation/configuration, push registration, test notification and live goal/streak accrual require current Premium access. Device detach, opt-out, disable and privacy deletion remain available after expiry: never require payment to stop notifications. Goal events generated from otherwise valid Free practice must not silently accrue new Premium Schedule days.

Before dispatch, recheck the actor's actual access expiry, even if Schedule was enabled while paid. Suspend sending/accrual when Premium expires, is refunded/revoked or no longer grants this capability. Preserve preferences and earned history; don't delete them or keep sending based on stale cached Premium. Re-enable after renewal only under still-valid user consent/permission and a future occurrence; no backlog of missed reminders or fabricated streak days. Missed dates do not become a continuous streak merely because billing later resumes. A private notification already accepted by the push provider cannot be recalled.

Future school-funded access may qualify through the shared resolver after that product exists; this task does not implement school billing or hardcode a school bypass. Premium availability and browser notification support are independent: a Premium user can track goals with push disabled.

## 2. What must actually run in the background

Use this architecture:

`Profile settings → owned schedule/subscription records → Cloudflare server scheduler → Web Push service → existing PWA service worker → visible notification → safe study link`

The installed PWA's service worker is event-driven, not a permanently running alarm clock. Do not use `setTimeout`, `setInterval`, a hidden tab, `waitUntil` loops or browser Periodic Background Sync to promise a daily notification at a user-selected time. Periodic Background Sync is not universally available and is not an exact alarm. Web Push can wake an eligible service worker when the browser/app is not open; OS/network policy still controls actual delivery. [R1–R4]

iPhone/iPad baseline: eligible Home Screen installation, supported OS/browser, notification permission from an explicit user interaction. Browser support and installation requirements must be feature-detected and tested on an actual device. Current Apple declarative push is an optional evaluated enhancement, not a reason to abandon standard cross-browser push. Browser permission and server reminder consent are different states. [R2, R3, R9]

Do not promise notifications while device is powered off, permanently disconnected, force-stopped or restricted by OS notification/Focus settings. Show “Around 7:00 PM”/“Delivery depends on your device and connection”, not a guaranteed alarm. A push-provider success response means accepted for delivery, not seen or read.

## 3. Profile UX and settings

Add a bounded card within `src/app/profile/profile-client.tsx`; reuse existing form components, colour tokens and accessible controls. No extra sidebar page is required for v1. A dashboard compact progress widget may be added after the core flow is correct. Free users see a locked Schedule card with View plans; expired users may see preserved earned history/read-only settings and an access-expired explanation, but cannot resume active tracking or sending.

States:

1. **Off:** explanation, Enable Schedule control; no browser permission prompt.
2. **On, tracking only:** daily target, progress, current/best streak, timezone, reminder setting and Save. Goals/streaks work even if notifications are unsupported/denied.
3. **Enable reminders:** user chooses time and taps Enable notifications on this device; this gesture requests permission/subscription. Don't automatically prompt when merely viewing profile or saving academic preferences.
4. **Permission default:** explicit enable button; **denied:** respectful browser-settings help, no repeated permission loops; **unsupported:** explain tracking still works; **iOS installation required:** Add to Home Screen instructions; **granted but registration failed:** retry connection action.
5. **Active:** next reminder in local time/timezone, masked device label, notification status, Send test reminder button and Turn off reminders on this device / Turn off all reminders.
6. **Paused/deactivated:** immediate server preference update, pending jobs invalidated and history retained; no claim that already delivered OS notification can be recalled.

Fields proposed: `enabled`, `goalType=questions`, `dailyGoal`, `reminderEnabled`, `reminderLocalTime` (HH:mm), `timeZone` (IANA), reminder policy version, schedule revision. Device subscription and permission state are device-specific, not one global “notifications on” boolean.

Show Today's progress `7 / 10 questions`, Current streak `4 days`, Best streak `9 days`, last synced timestamp if appropriate. A streak is earned through study, not set directly by the student; the UI sets a goal, not an editable streak value. Optional target-streak aspirations (e.g. 7 days) are future scope unless requested.

Goal input must respect actual available study opportunities. This feature is Premium-only; do not modify Free quotas or allow Schedule to bypass access checks. Offer useful attainable presets even though Premium practice is unlimited. Use plain non-punitive copy; do not shame missed days or promise a score gain.

Loading: complete required schedule/progress response before showing default values as saved; shimmer while pending, explicit retry on failure. Keep academic/profile preferences independently saveable if schedule service fails. Save schedule via its own owned endpoint, not by treating an old profile DTO as a full write. Server normalises and returns authoritative settings/next occurrence; disable duplicate submit, preserve values on validation/network error.

## 4. Goal and streak rules

Recommended initial metric: **distinct question IDs answered with a valid non-null selected option and accepted by the server during the user's local day**, regardless of correctness. Count practice and mock answer acceptance; do not count page views, toggles, skipped questions, replays, flags, app opens, result review, notifications or re-answering the same question on the same day. This is a consistency habit metric, distinct from topic mastery/estimated exam score.

Use server receipt/acceptance time for v1. Don't trust client wall clock or create yesterday's streak from an unverified offline timestamp. Existing live study writes count at their successful commit time; future offline weekly practice needs an explicitly reviewed attribution policy. An answer synced late counts on receipt day under this default, with honest UI. Do not implement future offline pack syncing just to deliver Schedule.

Capture goal events in the same successful answer transaction where possible. Unique `(user_id, question_id, local_date)` prevents replay/session duplication; record source attempt and accepted timestamp for audit. If current endpoints update `answered_at` on later revisions, do not recalculate the first day's goal history from that mutable field. Do not rely only on mock finalisation `scored_at` if the intended rule is accepted-answer day; inspect both write paths. Answer reversal after accepted activity does not repeatedly create credit; define and document whether a full null reversal removes credit (proposed: retain completed study activity, no extra credit on reselection).

Per-day goal record freezes target and timezone policy in effect for that day. Activate with an explicit today's target; do not silently award a historical streak from pre-feature records. Lowering/increasing goal applies next local day by default, so editing cannot rewrite an earned/missed day. User sees effective date. Timezone changes similarly take effect at the next defined day boundary with transition handling to avoid double earning or wiping a day; preserve raw UTC event time and historical day definitions. A migration/backfill, if desired, is a separate reviewed operation with clear limitations.

A day qualifies when unique accepted answer count reaches its frozen target. `qualified_at` is set once; correctness is irrelevant. Current streak is consecutive qualified local dates ending today, or yesterday while today is still in progress. It does not reset at the beginning of an unfinished today; it breaks after a full missed day. Best streak is historical maximum, not overwritten by a reset. No freeze tokens, paid streak repair or invented rest days in v1.

Turning off reminders alone does not stop goal tracking. Turning off Schedule stops future active-day tracking under proposed policy, preserves earned history, and does not make disabled days qualify. Re-enabling after a gap does not join two nonconsecutive streaks. No minute-by-minute “reset everyone's streak” job is required: derive from indexed day records or maintained verified summaries and the user's current day.

## 5. Push registration and privacy

One existing root-scoped service worker must own fetch, push and notificationclick behaviour. Extend `public/sw.js`/its build pipeline; never register a second worker under `/` that replaces offline/cache handlers. Use current canonical origin and stable manifest identity; previews/local subscriptions must not be scheduled by production.

Browser flow: HTTPS/secure context; await existing registration ready; feature-detect Notification/PushManager; request permission directly after tap; obtain subscription with `userVisibleOnly:true` and public VAPID key; POST validated subscription to an authenticated owner-scoped endpoint with idempotency. Store endpoint/key material as confidential operational data and never log it or put it in public Cache Storage. Public VAPID key can be in client config; private key must be a Worker secret. No private key in NEXT_PUBLIC variables, JSON export, repo, screenshot or log. Document rotation: old subscriptions can depend on the original application-server key; replacement may require user resubscription.

Validate endpoint URL, HTTPS scheme, userinfo/ports/length, expected supported push-provider hosts and key sizes/base64url. Prevent SSRF/open push relay: reject loopback/private/arbitrary targets, disable redirects, don't accept arbitrary user-supplied notification bodies or destination URLs. Maintain a configurable reviewed provider host allowlist from real subscriptions, not a broad `*.com` suffix. Rate-limit subscription and test sends. If provider DNS/endpoint behaviour needs extra protections, prove them before allowing outbound sends.

Suggested cap: three devices/user, each with independently enabled reminder delivery; clearly say whether all devices or only this device receive it. Proposed default: this device opted-in, all explicitly opted-in devices get the same daily reminder with consistent tag. Do not silently subscribe every browser. Endpoint is globally unique, with safe authenticated ownership transfer on an explicit new-user opt-in; a stale account's queued job must never target a device now bound to another actor.

Logout/account switch: detach current device's server registration before auth teardown when online, unsubscribe locally, clear any local push ownership references and notify open windows. Offline logout is immediate locally; remote detach cannot be guaranteed until reconnect, so notification text must remain generic and local unsubscribe must be attempted. On reopen, revalidate permission and browser subscription; don't resurrect server registrations from another actor. On account deletion/suspension, disable schedules/subscriptions/jobs. No teacher/school visibility is added by this feature.

Notification proposed copy: title `Time for a little progress`; body `Your study goal is waiting. Open JAMBPrep when you're ready.` No name, school, score, email, exact weakness or private attempt data on lock screen. Generic copy avoids stale personalised goal claims. Tag based on non-sensitive occurrence ID; no raw user ID. TTL proposed15 minutes; expired pushes should not nag hours later. Prefer standard normal urgency and respect OS settings; no sound/full-screen/alarm guarantee.

Click handler: close notification, validate allowlisted relative destination `/practice/` (or `/dashboard/`), focus existing canonical app window if suitable or open one. Never include bearer tokens, external URLs or private attempt IDs. Do not navigate an active exam tab away to practice: focus it without disrupting it, or open a separate safe page. Shared-device identity gate still runs. Use `event.waitUntil` for bounded showNotification/click work; always show the user-visible notification for a genuine push event; no silent push keepalive. Invalid payload uses safe generic display or logged safe error with no leaked data. [R1–R3, R5]

## 6. Server scheduler, delivery state and timezones

Recommended separate scheduler/sender Worker to isolate new background workload from student API traffic. Keep owned schedule/subscription HTTP routes in existing native API, sharing reviewed service modules. A scheduler-only Worker avoids accidentally replacing the production API or routing Worker from stale source. Explicitly prohibit deploying legacy `.open-next/worker.js` for this task.

Cloudflare Cron executes on UTC, not a user's timezone. Use one UTC cadence (proposed every minute for small initial rollout) to select indexed `next_reminder_at <= now`, not a new Cron Trigger per user. Store user's IANA timezone and local time, compute next UTC instant server-side. Test Lagos plus DST-observing zones; spring gap policy proposed first valid local instant after gap, fall repeated time sends once. If first release supports Lagos only, state that honestly instead of silently accepting arbitrary zones. Server date controls occurrence uniqueness. [R4]

Suggested algorithm:

1. Claim a bounded batch of due enabled schedules in a short transaction with locking/lease and indexed `(enabled,next_reminder_at)`; no scan of all profiles/answer history.
2. Freeze occurrence `(user_id, local_date, reminder_slot, schedule_revision)` and delivery rows per opted-in subscription. Unique constraints suppress duplicate claims; schedule edits supersede old occurrences. Advance next due instant safely under compare-and-swap/revision semantics.
3. Outside DB transaction, recheck enabled/revision/valid subscription binding and today's goal before dispatch. Skip if completed, consent withdrawn, Premium expired/revoked, app/user suspended, wrong environment or late beyond delivery window. A device update/active app failure never changes student entitlement.
4. Encrypt/send using standard Web Push protocol and VAPID, with bounded concurrency/timeouts. Sender credential never leaves Worker. Measure runtime compatibility and CPU before choosing a library.
5. Record provider acceptance, terminal rejection or retry. HTTP404/410 removes/disables expired subscription. Honour429 Retry-After and transient5xx/network retries only within TTL/max attempts; 401/403 indicates configuration/auth failure, not automatic mass user resubscribe. No unlimited retries.
6. Reclaim abandoned leases after failure. Prevent stale sender from writing success over a newer revision. Pausing after provider accepted a message cannot retract it; communicate that small in-flight race honestly.

Exactly-once end-user delivery cannot be promised across a provider-accepted-but-response-lost network failure. Use persistent occurrence/device dedupe, short TTL, stable notification tag/collapse where supported, bounded retries and document the residual duplicate risk. Tags don't prove provider-side exactly-once delivery. Store sent/accepted/failed, not “delivered/read” unless genuine supported acknowledgement exists. No fabricated read tracking.

Saving reminder settings computes next future occurrence; no immediate send unless user explicitly requests a test. If today's reminder time has already passed, default next day. One standard reminder/day; completion skips it and still advances schedule. Late job/outage catch-up only within15-minute window; no replay of days of missed reminders. Test endpoint sends only the caller's own device, has cooldown (proposed60s) and a small daily cap; no public/admin broadcast API.

Schedule + streak tracking does not require email delivery, Resend or Supabase Realtime. Do not send email/SMS as automatic fallback: that requires separate consent, cost and scope. The service worker is not the trusted scheduler and cannot independently call a private database.

## 7. Runtime and free-tier feasibility gate

Evaluate maintained Web Push libraries against the actual Cloudflare runtime/compatibility date and bundle. The common `web-push` package targets Node.js; `nodejs_compat` does not prove every HTTP/crypto dependency works or fits CPU. Prefer a reviewed WebCrypto/fetch-compatible implementation where practical; don't invent a cryptographic implementation to avoid a dependency. Any package addition needs repository-required approval. Pin chosen version and verify licence, encryption interoperability, VAPID audience and push-service responses. [R6–R8]

Read current Cloudflare limits at implementation. Do not confuse CPU versus network wall time or assume the HTTP API CPU limit equals scheduled-event CPU allowance. Free-plan subrequest/CPU constraints still apply. One reminder per user per day can involve multiple opted-in devices, several SQL operations and retries. A cron every minute is1,440 invocations/day even with no due work. Ten thousand users all choosing19:00 creates a burst, not an evenly distributed average.

Capacity acceptance must demonstrate bounded due retrieval, encryption CPU, sends per invocation and backlog latency under the target peak. A batch of20 per minute can drain only300 sends within a15-minute window, nowhere near10,000 clustered reminders. Do not fix that by silently delaying user times, dropping jobs or promising free unlimited fanout. If direct scheduled batches cannot meet required peak, propose and budget a real queue/service-binding sender fanout with measured quotas, or document a smaller limited rollout/approved paid capacity. No queue/billing resource is auto-provisioned by this plan.

Keep live student API latency and DB connection usage within measured budget. No 10,000 per-user pollers. No per-minute streak recomputation or private notification-body generation by a large language model. Shared generic copy, indexed day summaries and bounded dispatcher runs are sufficient. Expose aggregate scheduler metrics: due/claimed/skipped/accepted/failed, expired endpoints, oldest backlog, processing latency and CPU. Exclude endpoint keys/tokens/user identifiers from public logs.

## 8. Proposed schema and APIs

Inspect actual schema before creating additive migrations. Use existing `profiles.id`, account ownership, request idempotency and transaction retry conventions.

- `study_schedules`: user PK, enabled, goal kind/count, reminder consent/time/timezone, revision, next_due_at, created/updated; validated goal bounds and IANA timezone. Index enabled/due. Keep effective future policy changes explicit, not ambiguous overwrites.
- `study_goal_days`: user/local_date key, frozen goal/timezone/policy, unique accepted count, qualified_at; preserve historical day definition.
- `study_goal_events`: unique user/question/day key, source attempt, accepted_at UTC, source/policy; private, indexed for audit, bounded retention policy.
- `study_streak_summaries` optional derived cache: current/best/last_qualified_date/revision; never sole irrecoverable truth.
- `web_push_subscriptions`: ID, user, unique endpoint hash + confidential endpoint, p256dh/auth, VAPID version, device label, environment, enabled/last-seen/disabled state. Restrict reads to minimal metadata; no general profile response containing full endpoints/keys.
- `study_reminder_occurrences`: logical occurrence unique key, schedule revision/due/local date/state, lease/retry/expiry.
- `study_reminder_deliveries`: unique occurrence/subscription, provider accepted/failed/retry counters/next retry, safe provider code; support recovery, no claimed reads.

Proposed native routes:

- GET `/api/v1/study-schedule`: settings, today progress/current/best streak, next reminder and safe subscription metadata. No default fake counts on fetch failure.
- PUT `/api/v1/study-schedule`: owned validated preferences, expected revision + idempotency; no client user ID authority.
- POST `/api/v1/study-schedule/push-subscriptions`: owned explicit opt-in and subscription validation.
- DELETE `/api/v1/study-schedule/push-subscriptions/:id`: owned device detach; never another actor's subscription.
- POST `/api/v1/study-schedule/test-reminder`: owned bound subscription, permission status and rate limits.

Use current API envelope/cache no-store/origin/auth/live-session rules. No generic send-to-URL endpoint or client-supplied title/body. Native server resolver owns progress; no trust in browser `streak`, `completed=true` or count. Migrations include RLS/privileged-SQL ownership review, constraints, backup/restore rehearsal and rollback. Adding scheduled code must not alter pricing, Paystack or blueprints.

## 9. Integration and deployment sequence

1. Inspect current branch, dirty changes, deployed API/SW/settings and installed package versions. Reconcile other agents' changes; no stale Worker baseline replacement.
2. Implement schedule/goals and tested answer-event integration first. Ship tracking without push if crypto/device support blocks it, but state incomplete reminder acceptance clearly.
3. Prove push sender compatibility locally with injected provider adapters, then controlled real device after explicit test-send permission. No unsolicited messages to existing users.
4. Extend existing SW with push/click while preserving public cache exclusion, offline fallback, build version, waiting update lifecycle and rescue. Don't force-update an active mock just to attach push.
5. Add scheduler Worker with cron disabled in preview/default testing. Dry-run fetch/scheduled paths and due job claims before enabling production trigger. New endpoints behind reviewed allowlist/feature flag.
6. Apply additive schema with backup, deploy compatible API then SW/profile, controlled opt-in cohort, finally enable bounded Cron. Store secrets via approved provider tools/secret commands without echo. No key values in BMAD.
7. Build through PWA post-export pipeline into isolated immutable release artifact; verify SW/build metadata match after deploy. Previous task showed another agent can overwrite shared `out/`; do not deploy from unverified mutable output.
8. Rollback: disable scheduler trigger/dispatch flag first, invalidate due jobs as appropriate, preserve goal history; deploy previous compatible API/assets or rescue SW if necessary. Existing OS notifications cannot be unsent. Revoke/rotate compromised keys with device resubscription plan.

Production database checks, migration, publishing, resources and real notifications require a current scoped provider allowance/approval. Old allowances in the ledger are exhausted or reserved; do not reuse them. User's request here is planning/handoff, not permission for test notifications or deployment.

## 10. Acceptance cases

- Premium gate: Free activation/configuration/test sends rejected, direct endpoint bypass denied, expiry/refund/revoke stops accrual and sends, history retained, disable/detach remains free, renewal never backfills missed streak days.
- Schedule off by default; explicit activation; daily goal/streak visible only after actual data; Save preserves input on error; unrelated profile sections remain usable.
- Goals work without push or with denied/unsupported permission; no automatic prompt; iPhone installation help; installed Android/iPhone real permission subscription and background notification acceptance.
- Distinct accepted question count, incorrect-but-answered counts, repeated ID/replay/review/skip/reversal behaviour, rollback, concurrent writes and mock acceptance path are covered.
- Goal target frozen per local date, activation/no unwanted history, change effective tomorrow, timezone transition, midnight/year/leap-day/DST boundaries and streak ending yesterday before today's goal.
- Schedule pause vs reminder pause vs logout/device detach differ correctly; stale schedule revisions cannot send after reschedule except documented in-flight acceptance race.
- One logical occurrence/device, two concurrent scheduler runs, lost ACK/provider acceptance, restart/lease recovery, expired subscription,429/5xx/timeout/invalid payload and bounded retry/TTL.
- Endpoint SSRF, malformed keys, arbitrary destination, unauthorized subscription ID/user, cross-device actor switch, deleted/suspended actor and secret/log exposure are rejected.
- Device offline, OS notifications blocked/Focus, app closed, installed app vs browser tab, multiple devices and active exam notification click; no forced navigation or reminder sent to wrong actor.
- Existing worker fetch/cache/offline/error/cleanup behaviour, exam saving/grading/quota, payments and unrelated school/weekly future features unchanged.
- Real peak send throughput/CPU/SQL/request cost measured; explicit limitation if the free deployment cannot meet desired delivery window.

## 11. Research sources

Checked 17 October 2026; recheck compatibility and provider limits before implementation.

- R1 MDN Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- R2 WebKit iOS/iPadOS Web Push: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- R3 Apple Web Push guidance: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
- R4 Cloudflare Cron / scheduled handlers: https://developers.cloudflare.com/workers/configuration/cron-triggers/ and https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/
- R5 MDN showNotification: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
- R6 Worker Web Crypto: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
- R7 Worker limits: https://developers.cloudflare.com/workers/platform/limits/
- R8 Node Web Push library (candidate, not approved Worker compatibility): https://github.com/web-push-libs/web-push
- R9 WebKit declarative push (optional enhancement): https://webkit.org/blog/16535/meet-declarative-web-push/
- R10 MDN Periodic Background Sync (not exact scheduler): https://developer.mozilla.org/en-US/docs/Web/API/Web_Periodic_Background_Synchronization_API
