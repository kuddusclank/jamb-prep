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

- [ ] Sample-test dictionaryapi.dev definitions, word variants, unknown words, phonetics/audio and availability; verify content/source caching rights independently of GPL server licence.
- [ ] Evaluate curated Wiktionary/Kaikki lexical records and irregular verb forms; retain licence, source URL, sense and revision. Compare WordNet only where useful.
- [ ] Select approved provider adapter and offline-data source; exclude Wordnik Basic for offline caching under currently published restrictions.
- [ ] Implement bounded lookup endpoint, validated normalised word, no user PII forwarded, host allowlist and safe text/audio rendering.
- [ ] Deduplicate lookups/cache licensed public definitions; actor-scope saved-word state; no per-keystroke request storm.
- [ ] Add editorial workflow for meanings, example sentences and base/present/past/past-participle/-ing forms with accepted variants.
- [ ] Schedule five reviewed new words daily under agreed policy; prevent repeats being labelled new; separate spaced review.
- [ ] Add student daily lesson/saved-word/review screens and admin catalogue/scheduling/correction screens.
- [ ] Download optional approved future lessons/text/audio with bounded storage and visible offline readiness; handle exhausted supply and date/time changes honestly.
- [ ] Idempotently sync word progress without turning familiarity into confirmed exam mastery.

Acceptance: accurate irregular verb examples, sources/attribution retained offline, provider failure/miss safe, five-new rule and rollover tested. Dependencies: F0; actor-scoped storage from F3 for offline delivery. Online portion can precede F3.

## F3 — offline UI, capability-driven navigation and snapshots

- [ ] Inventory student shell routes, build chunks, fonts, KaTeX, diagrams and branded assets required for each supported offline screen.
- [ ] Implement versioned offline-ready shell/dependency manifest and bounded cache; no private HTTP response caching.
- [ ] Add explicit online/offline/server-unavailable mode with no endless shimmer; required live data waits before reveal, saved data labelled last synced.
- [ ] Build one capability source for desktop sidebar/mobile nav/direct routes based on mode, role, access source and local readiness.
- [ ] Implement offline dashboard with downloaded practice, device progress, pending sync and approved read-only summaries.
- [ ] Whitelist own profile/subjects/target/progress/saved-result DTOs into actor-scoped IndexedDB; exclude admin/teacher rosters/payment secrets.
- [ ] Implement restricted offline actor boundary and live revalidation before syncing; don't unlock all protected pages from a remembered token.
- [ ] Purge/hide private data on logout/account switch across windows; cancel late writes and preserve public caches.
- [ ] Add storage error/quota/eviction/migration recovery, explicit local deletion controls and reduced-motion/accessibility states.
- [ ] Keep school administration and all commerce online-only initially; link hiding never replaces backend authorisation.

Acceptance: killed/reopened offline app displays supported screens; no cross-account read; hidden features safe via direct URL; stale snapshots never grant a new paid operation. Dependencies: F0; build on existing PWA lifecycle.

## F4 — weekly pack policy, issue and download

- [ ] Create distinct versioned weekly policy without changing the 180-question mock blueprint.
- [ ] Resolve server enrolment and entitlement; define week/combination/replacement uniqueness and transactional issuance.
- [ ] Select exactly250 eligible unique questions across selected subjects, dynamic topic coverage and recent exposure preference.
- [ ] Preserve coherent comprehension/cloze/reading-work groups and duplicate-family rules; no year-based filtering or hardcoded bank IDs.
- [ ] Detect shortages before consuming allowance; return clear reason instead of duplicates, missing subjects or partial pack.
- [ ] Freeze content/editorial/option/topic/deadline-policy versions and save issued pack manifest; re-download same issued pack.
- [ ] Bounded resumable data/media download with hashes, size estimate and transactional completion marker; ready only after all required dependencies persist.
- [ ] Implement offline self-paced pack UI, subject navigation, first answers/review, completion/pending state and last-sync information.
- [ ] Apply approved feedback/key disclosure option; label offline self-study as unranked and distinguish it from timed mock integrity.

Acceptance: 250 total with approved subject/group constraints; retries do not issue extra packs; offline cold launch works after verified download; incomplete download does not claim readiness. Dependencies: F0/F3; F1 access resolver for funded-school users.

## F5 — durable events, scoring and synchronisation

- [ ] Persist first response/reversal/review event plus revision and pending operation atomically in IndexedDB.
- [ ] Reuse/migrate existing persistence boundaries without running two answer queues; secure single-writer/device-transfer behaviour.
- [ ] Implement bounded authenticated sync batches with stable IDs, per-event ACK/rejection, duplicate handling and backoff/Retry-After.
- [ ] Validate actor, issued pack membership and frozen keys server-side; never trust submitted correctness/total/timestamps.
- [ ] Preserve evidence origin/confidence: offline self-study versus online practice/mock; repeated review never inflates distinct first-answer mastery.
- [ ] Reconcile app closure, lost ACK, expiry, revocation, conflicting devices, changed subject and term end under explicit policies.
- [ ] Refresh dashboard/teacher snapshots only after acknowledgement; no locally completed score falsely shown as server-confirmed.
- [ ] Protect pending work during app upgrades; test old-build assets and recovery/rescue without deleting unresolved answers.
- [ ] Treat Background Sync as optional; foreground reopen/focus/reconnect remains available.

Acceptance: no duplicate score/mastery/referral/entitlement changes, no silent answer loss, no late mock deadline bypass, truthful synced state. Dependencies: F3/F4; approved evidence model.

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
