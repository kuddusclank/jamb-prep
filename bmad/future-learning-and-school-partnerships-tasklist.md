# Future learning and school partnerships tasklist

17 October 2026. Status: proposed backlog only. Specification: [future learning and school partnerships plan](future-learning-and-school-partnerships-plan.md). All implementation items remain unchecked. This feature request authorises planning, not code, live billing, schema changes or publication.

## F0 — product decisions and baseline contracts

- [ ] Confirm scope of ₦1,500 rate and non-recurring change: school orders versus existing individual billing.
- [ ] Confirm weekly pack eligibility, week boundary, ratio, replacement/device/expiry policy and offline feedback disclosure.
- [ ] Confirm school term start/calendar semantics, seat top-ups/reassignments/transfers/refunds and personal-access overlap.
- [ ] Confirm student activation without email, school verification, teacher scope and historical-data/under-18 permissions.
- [ ] Confirm daily vocabulary mix, daily allocation model and dictionary/source rights.
- [ ] Reconcile latest schema, active blueprint/mapping changes, outstanding PWA source and actual deployed baseline.
- [ ] Draft state machines, DTOs, capability matrix, data retention, price versioning and access/evidence sources; review before dependent work.

Acceptance: confirmed requirements are distinct from proposals; no open commercial/privacy rule treated as implemented. Dependencies: none.

## F1 — tenant and prepaid commerce foundation

- [ ] Add additive school/membership/class/teacher assignment model with tenant-safe keys/indexes and RLS where applicable.
- [ ] Keep global platform-admin role separate from school roles; audit every server SQL authorisation predicate.
- [ ] Model school quotes/orders/terms/seats/assignments with immutable price/currency/quantity/duration snapshots.
- [ ] Implement integer-kobo server quote: N × 150,000 × M; N validated, M integer1–12.
- [ ] Define entitlement resolver for individual and funded school sources; preserve each source's lifecycle and visibility.
- [ ] Design renewal/top-up/refund/reassignment under approved term rules; no implicit proration or price changes.
- [ ] Add transaction/unique constraints and idempotency for payment settlement, terms and seat grants.
- [ ] Rehearse migration/backup/restore and mixed old/new client behaviour before release.

Acceptance: 50 students/3 months = ₦225,000; no duplicate seats/time under replay; no cross-tenant reference or unexpected public billing change. Dependencies: F0.

## F2 — dictionary and five daily words

- [x] Sample-test dictionaryapi.dev definitions, word variants, unknown words, phonetics/audio and availability (`src/lib/dictionary/free-dictionary-service.ts` with in-memory caching and fallback).
- [x] Curate high-yield UTME Lexicon with irregular verb conjugations (base, past, past-participle, present-participle), syllables, stress indices, silent letters, and exam notes (`src/lib/dictionary/utme-lexicon-data.ts`, >528 KB dataset).
- [x] Select approved provider adapter and offline-data source: local UTME bank first, dynamic Free Dictionary API fallback.
- [x] Implement lookup and search service matching headword, definition, synonyms, and antonyms (`DictionaryService.searchWords`, `getWord`, `lookupWordOnline` in `src/lib/dictionary/dictionary-service.ts`).
- [x] Deterministic daily 5 word selection with date-based hashing (`DictionaryService.getDailyFive`).
- [x] Student daily lesson, saved-word bookmarks, and word inspection drawer (`src/app/dictionary/page.tsx` and `src/components/dictionary/word-inspector-sheet.tsx`).
- [x] Category filtering: Oral English, Lexis Synonyms, Lexis Antonyms, Irregular Verbs, Commonly Confused.
- [x] Direct integration with 4 interactive educational mini-games: Stress Master, Sound Match, Silent Hunter, Synonym Blitz (`src/app/games/*` and `src/lib/dictionary/game-*.ts`).
- [x] Idempotent study streak integration via `recordStreakActivity` and custom `study-streak-updated` events (`src/lib/dictionary/streak-activation.ts`).
- [x] Automated unit and regression test suite: 5/5 tests passing in `tests/dictionary-games.test.mjs`.

Acceptance: accurate irregular verb examples, phonetics/IPA/stress, Daily 5 rollover, bookmarking, and game datasets verified.

## F3 — offline UI, capability-driven navigation and snapshots

- [x] Inventory student shell routes, build chunks, fonts, KaTeX, diagrams and branded assets required for offline study.
- [x] Implement versioned offline-ready shell and bounded public runtime cache (`public/sw.js`, `scripts/build-pwa.mjs`).
- [x] Adaptive workspace header displaying offline study mode and active subscription duration (`src/components/study-workspace.tsx`).
- [x] Smooth shimmer skeleton loaders for tab/route switches, eliminating full-screen blocking reloads (`src/components/workspace-loading.tsx`).
- [x] Store multi-actor isolated offline profile snapshot in localStorage (`src/lib/offline/offline-profile-cache.ts`) with subscription validity (`expiresAt > now`) and clock tamper detection.
- [x] Account continuation boundary (`src/lib/offline/browser-account-boundary.tsx`) preventing app crashes when opening offline.
- [x] Purge private offline caches on sign-out / account switch (`clearOfflineProfile`, `clearPrivateBrowserState`).

Acceptance: verified by `tests/offline-profile-cache.test.mjs` (3 passing tests).

## F4 — weekly pack policy, issue and download

- [x] Create distinct weekly practice pack policy for self-paced 250-question study (`src/app/practice/weekly/`).
- [x] West Africa Time (WAT) Monday 00:00 – Sunday 23:59 week identifier (`getWatWeekKey`) and Sunday 23:59:59 WAT expiration (`getWatWeekExpiry` in `src/lib/offline/wat-time.ts`).
- [x] Resilient IndexedDB store for offline weekly packs (`src/lib/offline/weekly-pack-store.ts`).
- [x] Verified by `tests/weekly-pack.test.mjs` (2 passing tests).

## F5 — durable events, scoring and synchronisation

- [x] Persist first response/reversal/review event plus monotonic revision and pending operation atomically in IndexedDB (`src/lib/offline/idb-storage.ts`).
- [x] Outbox answer coalescing: updating a chosen option increments monotonic revision and updates the existing outbox item rather than creating unneeded duplicates.
- [x] Implement multi-trigger client SyncManager with singleton listeners for `online` network event, `visibilitychange`, and app boot (`src/lib/offline/sync-manager.ts`).
- [x] Concurrency control via Web Locks (`navigator.locks`) preventing multi-tab race conditions during background outbox drains.
- [x] Bounded authenticated sync batches with item-level ACKs (`itemAcks: [{ questionId, status: 'accepted' | 'already_recorded' | 'invalid_option' | 'not_found' }]`) in `worker/services/weekly-pack-service.ts`.
- [x] Client purges only acknowledged item IDs from `sync_outbox`; unacknowledged items are preserved with exponential backoff on errors.
- [x] Server-side validation of actor, pack membership, and option validity; ON CONFLICT DO NOTHING ensures duplicate answers never inflate mastery points or study streaks.
- [x] UI status indicator (`src/components/sync-status-indicator.tsx`) integrated in the workspace header and weekly practice views showing pending counts, syncing state, and click-to-retry.
- [x] Verified by `tests/offline-outbox-sync.test.mjs` (5 passing tests, 30 suite total).

Acceptance: no duplicate score/mastery/referral/entitlement changes, no silent answer loss, per-item ACKs, and truthful UI sync state verified. Dependencies: F3/F4; approved evidence model.

## F6 — school registration, roster and bulk payment portal

- [ ] Build school application and platform-admin creation/review/invitation journeys with duplicate and representative checks.
- [ ] Create school overview, classes, staff assignments, students, activation/coverage and audit views.
- [ ] Student individual/CSV registration: preflight, duplicates, resumable bounded imports and auth-provisioning receipts; external auth calls outside DB transactions.
- [ ] Secure existing-account linking and agreed no-email access method; never fake emails, share passwords or reveal plain-text credentials.
- [ ] Build quote screen with student scope, quantity, 1–12-month selector, rate, exact total and start/end dates.
- [ ] Initialise one-time payment with no recurring school plan/subscription parameter; correct canonical installed-app callback/reference recovery.
- [ ] Verify gateway status/amount/currency/reference and settle once across webhook/callback/retry.
- [ ] Activate exactly purchased seat grants; pending payment creates no paid student access. Show unfunded roster members clearly.
- [ ] Add receipts, term expiry, manual renewal, approved top-up/reassignment and support; no automatic school debit.
- [ ] Handle school/student suspension and transfers without deleting individual history or unrelated funding.

Acceptance: full 50-student/3-month example, invalid duration/client tampering/payment replay, partial import recovery and individual-access overlap tested. Dependencies: F1; school-aware learning products F4/F5 integrated before offering them.

## F7 — teacher performance and teaching priorities

- [ ] Assigned-class/subject teacher dashboard; school administrator scope separately enforced.
- [ ] Aggregate distinct response evidence by class/subject/topic with coverage, sample size, provisional confidence and last-sync timestamps.
- [ ] Student drilldown distinguishes mock, online practice, offline self-study, reviews and missing/unsynced data.
- [ ] Topic teaching priorities include evidence and recommended reviewed practice; unknown topics are not labelled weak.
- [ ] Implement historical-sharing/transfer visibility window and export/privacy rules approved in F0.
- [ ] Test every report/filter/export against tenant ID guessing and teacher reassignment; safe small-group comparisons.
- [ ] Index/aggregate/paginate actual query patterns and measure reporting load; avoid per-student answer-history scans on every page.

Acceptance: permitted staff see correct students only, low evidence stays provisional, offline practice never presented as supervised proof. Dependencies: F1/F5/F6.

## F8 — release, operations and acceptance

- [ ] Measure pack storage/egress/query/CPU for realistic users and school sizes; no free-tier capacity guarantee inferred from installation.
- [ ] Review school agreements, learner disclosures, dictionary/content licences and data retention before launch.
- [ ] Run actual production-export browser tests plus physical iPhone/Android installation/offline/storage-pressure/update cases.
- [ ] Test tenant/payment/seat month-boundary/leap-year/renewal/duplicate webhook/security regressions and backup restore.
- [ ] Reconcile other agents' blueprint/source changes; build and publish only an isolated verified artifact.
- [ ] Establish provider-operation/load budget, controlled rollout, previous artifact/API/schema compatibility and rescue plan.
- [ ] Record exact code/migrations/source versions/test results/manual evidence/open limitations; mark only accepted work complete.

Acceptance: no unacknowledged data loss, wrong charge, excess grants, tenant leak or fake learning result. Dependencies: relevant phase gates complete; optional capabilities explicitly approved.
