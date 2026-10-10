# Mock exam conditions — approved direction and first implementation

Updated 2026-10-10. This document governs mock integrity UX alongside the UI design guide.

## Confirmed scope

All mocks require an account. Offer Standard (default, timed, optional fullscreen) and optional Exam Conditions (fullscreen request before starting, interruption observations). Both retain the same academic scoring. Ask students to close unrelated tabs/apps; a normal website cannot inspect other tabs. Do not claim lockdown or verified honesty.

Rules: complete independently, avoid external assistance, remain on the page in Exam Conditions. Hidden page or fullscreen exit opens one interruption episode; it closes only when visible AND fullscreen. Timer continues. No automatic malpractice judgement, score deduction or disqualification. Do not trap keyboard navigation or prevent exit. Repeated events from the same departure must not create repeated incidents.

Capability detection, not browser names, determines fullscreen availability. A denied/unsupported request offers Standard before creating a new attempt. Chrome/Edge/Firefox desktop commonly support the API; Safari/mobile restrictions vary. Never promise equivalent enforcement across devices.

Microphone, camera, speech recognition and recordings are deferred. Any future audio experiment needs explicit opt-in, local processing, accessibility alternatives and validation against household/classroom noise. Noise alone is not evidence of assistance.

## Implemented first stage

- Mock setup: mode selection, rule acknowledgement, direct-gesture fullscreen request, visible start errors. Existing attempts retain their original mode.
- Stored `attempts.exam_conditions` and separate `attempt_interruptions` with server-received start/end times; default false preserves legacy attempts.
- Visibility/fullscreen listeners deduplicate departures. Session storage preserves an open episode across reload where available. Inline recovery banner and fullscreen retry leave the timer running; answers use the existing engine autosave.
- Authenticated, owner-checked interruption action. Event IDs are idempotent; timestamps are server observations, capped at attempt expiry.
- Results disclose recorded count separately from score and explain that absent events do not prove uninterrupted work.
- Attempt URLs now load the requested owned attempt rather than creating a new one. Result navigation uses attempt ID.
- Answer sync now checks authenticated ownership, active status, deadline, question membership and option membership.

## Rollout and remaining work

On 2026-10-10 the configured Supabase database was inspected and the missing interruption table, cascade foreign key and lookup index were applied in one transaction. RLS is enabled with no public policies; writes use authenticated server actions through the server database connection. The existing `attempts.exam_conditions` column was verified as boolean NOT NULL DEFAULT false.

Schema drift: this database already contained `student_topic_mastery` and the mode column, but had no Drizzle migration journal. Consequently the full generated migration was NOT replayed and no migration-history rows were fabricated. Fresh databases can use the checked-in migrations; reconcile the existing database baseline before running `db:migrate` there. No application deployment was performed.

This is a first implementation, not production proctoring. Client signals can be blocked or lost. No durable offline event outbox yet; failed writes show a warning. Duration fields are stored but user-facing duration reporting remains pending. No focus-loss/blur accusations. No mandatory teacher policy, microphone, transcription, automatic punishment or remote tab inspection.

Before release: database-backed ownership/expiry/idempotency tests; reliable event retry and submission/answer-outbox flush review; real-device fullscreen/refresh/offline verification when browser testing is authorized. Existing engine concurrency and quota behaviour need a separate review. No claim of production readiness.

## Evidence

TypeScript validation and focused event-state tests cover both event orders, restoration and no false event while focused. Browser testing was intentionally not run per user instruction. See implementation plan for current verification outcome.

Sources: MDN Fullscreen API and Page Visibility API; Chrome extension Tabs API (extension permissions do not apply to ordinary webpages).
