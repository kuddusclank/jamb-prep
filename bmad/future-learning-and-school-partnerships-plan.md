# Future learning, offline modes and school partnerships

Date: 17 October 2026. Status: future roadmap, planning only; no feature implementation, database write, new package, payment change or deployment is authorised by this document. Task breakdown: `future-learning-and-school-partnerships-tasklist.md`.

This records the user's new future-feature request after the earlier general offline-data work was set aside. It does not silently resume implementation of the entire older PWA roadmap. Reuse its technical research where applicable; the scope and decisions below govern these future features.

## 1. Confirmed requirements versus proposals

### Confirmed by the user

1. Weekly practice provides **250 randomly selected questions across the student's selected subjects**.
2. The issued questions can be downloaded and used without internet, rather than requiring a network request before every session opens.
3. Online and offline dashboards differ. Several other pages and the sidebar also change; features requiring live database interaction disappear or become unavailable offline. Some last-synced data remains readable.
4. Research an open-source/free dictionary service for looking up study words.
5. Present **five new words daily**, especially verbs, with present/past forms, meanings and useful related information.
6. Add school partnerships: schools can apply/register themselves or be created by platform administrators; school administrators have a portal.
7. Schools can register students and school administrators/teachers can monitor their performance to identify teaching and practice priorities.
8. School administrators pay upfront in bulk, selecting student quantity and a duration of **1–12 months**.
9. School retail rate is **₦1,500 per student per month**. Fifty students for three months costs **₦225,000**. Each covered student receives three months of access.
10. This school purchase is prepaid and non-recurring; no automatic school subscription renewals.

### Proposed defaults, not confirmed product rules

- Weekly means Monday 00:00–Sunday 23:59 in Africa/Lagos; one issued pack per student/week/subject-combination version, with controlled replacement rather than unlimited new packs.
- Pack allocation approximates the current 60:40:40:40 mock ratio: **83 English + 56 + 56 + 55 electives = 250**, rotating which elective receives 55. This is study practice, not a 250-question official mock format or new exam quota.
- Packs are available to paid individual students and funded school students first. Free-tier eligibility remains a decision; do not replace the existing free daily practice rule.
- Packs are self-paced and unranked; previously downloaded work can continue within a seven-day offline access window. Download/submission/expiry policy needs approval before coding.
- Offline marking uses explicitly disclosed study feedback; it cannot establish invigilated performance. The scoring decision is described in section 5.
- School access uses a common paid cohort term beginning at verified settlement (or an agreed future start), ending after the purchased number of calendar months. Month-end/leap-year handling must be explicit. Late student activation does not silently create a new full term beyond the paid cohort end.
- School price does not automatically replace public individual pricing or cancel existing recurring subscriptions. Clarify whether the user also intends a global individual-billing change before touching it.
- One active school membership per student initially; teachers can see only assigned classes/subjects; school administrators see the authorised school scope. Multiple-school history and transfers require a separate policy.
- Offline school administration, roster downloads, school payments and teacher access changes are excluded initially. Student-only offline snapshots come first.

## 2. Repository boundary and existing evidence

This is the Next.js/native Cloudflare API **JAMBPrep** project under `jambprep/`. The parent LecternIQ Laravel repository sells and coordinates school websites. Its school application entities are not automatically JAMBPrep school tenants. Do not merge those products' student data, permissions or billing without a separate authorised integration.

Existing source foundations to reuse:

- `public/sw.js`, `scripts/build-pwa.mjs`, `public/site.webmanifest`, `src/components/pwa-provider.tsx`: initial install/public-asset cache and generic offline fallback. They do not currently provide a full offline authenticated dashboard.
- `src/lib/auth/session-manager.ts`, `account-coordinator.ts`, `storage-cleanup.ts`: shared auth, request coalescing, owner-scoped caches and logout clearing.
- `src/lib/api/use-api-resource.tsx`, `src/components/browser-account-boundary.tsx`, `study-workspace-client.tsx`: resource/loading/account/navigation boundaries; must support deliberate offline snapshots without accidentally bypassing normal auth.
- `src/features/exam-engine/persistence/local-outbox.ts`: current localStorage answer/revision persistence; private transactional offline pack work needs an IndexedDB adapter/migration, not another competing queue.
- `worker/services/assessment-selector.ts`, `mock-ready-subjects.ts`, `study-service.ts`: dynamic blueprint selection, current readiness rules and response evidence.
- `worker/services/subscription-service.ts`, `paystack-service.ts`, idempotency/DB context: existing individual entitlement and payment integrity; extend with distinct school orders/grants instead of overwriting existing individual access.
- `src/db/schema.ts`: no complete school-tenant/roster/class/teacher billing model identified in this planning inspection.

The 17 October audit found 25 live mock-ready subjects, but readiness and mapping counts change. Never hardcode that list, IDs or current counts into new features. See `current-subject-blueprint-verification.json`; the separate mapping agent's work must be reconciled before implementation.

## 3. Weekly offline practice: issue and selection

### Student journey

Online dashboard offers “Download this week's practice — 250 questions”, explains estimated download size and offline expiry, and confirms the four selected subjects. Server checks account, access source, school term where relevant, current selection and eligible bank. One request issues a pack manifest and stable download identifiers; retries recover the same issued pack. Download progress shows actual verified data/assets and can resume after interruption.

Show “Ready offline” only after questions, passage blocks, diagrams, fonts, route shell/code dependencies and permitted feedback are durably stored and validated. An interrupted or storage-denied download remains incomplete and cannot masquerade as ready. Keep the old complete pack until its replacement commits successfully if policy permits.

Offline launch offers Resume weekly practice, Choose a subject, Review saved answers, Daily words and last-synced read-only summaries. On reconnect, verify the same actor, reconcile queued work, then refresh snapshots. No login/new pack/payment is promised without internet. Installation alone is not proof of offline readiness.

### Server selection algorithm

- Resolve selected subjects from server enrolment, not a browser payload. Freeze selection version, question editorial revisions, option ordering, topic/subject labels, passage references, policy version and pack seed/ID.
- Require exactly 250 distinct eligible question IDs across the required subjects. Reuse current eligibility view; validate options, keys, passages, publication/assessment flags and duplicate content families.
- Use cryptographically generated server seed with a versioned selector; favour low recent exposure without making novelty guarantees. Different feasible packs should vary. Re-download reuses the frozen pack, not another random allocation.
- Distribute each subject's budget across database topics with configurable weights/minimums and capacity-aware reallocation. Do not maintain hardcoded topic lists. New topics participate once eligible and mapped as required by the chosen weekly policy.
- Weekly practice has its own configurable allocation policy; do not change the 60/40 active mock blueprint counts to issue 250. Where passages/cloze are used, select coherent complete groups and preserve their internal order; passage blocks count toward the subject's budget.
- The exact 83/56/56/55 split is a proposal. Group feasibility can require a policy-approved alternative split with exact total 250, or a clean refusal; no arbitrary passage splitting or silent subject substitution.
- Prescribed-text items require valid work/context classification. Preserve relevant diagrams/LaTeX and show missing media before pack readiness.
- Bank shortfall: fail atomically with subject-level reason, no consumed pack allowance. Do not duplicate questions to reach 250 or quietly issue fewer.
- Subject change: freeze existing downloaded pack's original combination; propose invalidate future issue eligibility and permit at most one controlled replacement after online confirmation. Do not allow repeated subject changes to farm packs. Decide whether completed prior work remains reviewable.
- Weekly rollover/clock tampering: server owns week key and issuance quota. Device time cannot authorise a new week or extend downloaded access.

### Policy and edition lifecycle

States: requested → issued → downloading → ready → in_progress → locally_completed → syncing → reconciled; expired/revoked/failed are explicit. Snapshot last successful download, last sync and remaining queue. Content edits do not rewrite an issued pack; serious editorial withdrawal can be applied on next contact, with an honest offline-revocation limitation.

Decisions still required: exact day/time of week, ability to finish a previous week after rollover, early-completion replacement, Free inclusion, device/download limits, re-download period, school suspension/term-expiry behaviour and offline access-window length. Recommend one server-owned pack replicated across authorised devices, with a tested conflict model; simplest first release is one writable device per pack with explicit online transfer.

## 4. Offline interface and read-only snapshots

Offline UI is a deliberate application mode, not just CSS hiding links or an endless loading screen. Distinguish online, offline and server-unavailable states using actual request outcomes; `navigator.onLine` is a hint. Avoid repeated health polling.

| Page / feature | Online | Offline proposed behaviour |
| --- | --- | --- |
| Dashboard | Current account and progress; live study choices | Offline dashboard: downloaded pack, progress on device, daily words, last-synced summaries, pending-sync status |
| Weekly practice | Issue/download/resume/sync | Resume complete issued pack; subject navigation and local answers |
| Standard practice catalogue/new session | Current server eligibility and quota | Hide live start menu or explain connection needed on direct URL; don't consume daily quota locally |
| Full timed mock | Existing live start/grade/deadline | No new offline mock. Existing interruption recovery retains its current rules until separately improved |
| Performance | Server-confirmed trends | Same-user approved snapshot, “Last synced …”; local weekly activity shown separately and marked pending/unverified |
| Profile / selected subjects | View and edit online | Read-only saved profile/combination; no offline subject changes |
| Dictionary | Cached lookup or provider lookup | Saved licensed words only; unsaved query explains connection required |
| Daily words | Today's reviewed set; fetch optional upcoming sets | Downloaded scheduled lessons; no fake new words when supply runs out |
| Results/reviews | Authorised current responses | Explicit saved result snapshot where permitted; no unreleased mock keys or public/private mixing |
| Referrals, plans, checkout, subject changes | Live operations | Remove primary sidebar entries; direct routes explain requirement; never replay financial actions |
| School portal / admin | Role-scoped live roster, purchases and reporting | Initially online-only. Avoid persistent copies of other students' data on teacher devices |
| Help / legal / saved-data controls | Current public content | Cached generic content and local data management |

Sidebar derives from one capabilities model combining mode, confirmed access source, role, cached-resource readiness and route. Both desktop sidebar and mobile navigation use it. Hiding a link is never server authorisation. Saved routes/bookmarks must render a safe offline state rather than loop to login or expose another actor's data.

Keep Cache Storage for public immutable UI resources. Store approved private DTO snapshots in IndexedDB with actor ID, schema version, fetched time, expiry, source and explicit whitelist of fields. Never cache whole authenticated HTTP responses/tokens in a shared SW cache. Proposed snapshots: student's display name, selected subjects, target, own progress aggregates and explicitly saved own results; exclude payment details, admin data, school rosters and other students.

Public offline shells can load without server auth; private offline content is a restricted same-device, same-actor experience with a proposed short last-online verification window. This cannot enforce instantaneous remote revocation without a network. On reconnect, live identity/ownership precedes replay or access refresh. Logout/account switch must cancel drains, hide data immediately and purge private IDB/cache state across open windows; public assets remain. Confirm local device-owner visibility and content retention in policy/UI rather than claiming that local encryption hides keys from its own app user.

## 5. Offline grading, durability and sync integrity

Offline learning feedback is the central design choice:

- **Proposed learning-first option:** download reviewed answers/explanations for the 250 issued practice questions, reveal through the practice UI after an answer, and label this unranked/self-study. A student with device tools can inspect local feedback. It must not be marketed as secure exam performance.
- **Alternative:** download questions only, save answers offline and reveal feedback after online server marking. Stronger key separation, less useful offline learning. Must be a deliberate product decision, not hidden behaviour.

Even with learning-first feedback, the server recomputes score using the frozen issued answer key; it never trusts a submitted `isCorrect` or aggregate score. Recalculation proves answer-key consistency, not that the student answered unaided or before viewing a key. Store evidence origin (`offline_weekly_self_study`, `online_practice`, `mock`) and verification/confidence separately. Teachers see these distinctions. Do not merge repeat offline review into first-attempt mastery or leaderboard/official mock estimates without reviewed statistical policy.

IndexedDB transaction writes current answer, monotonic revision and pending event atomically. Persist first-response event separately from review/correction and retain deterministic ordering. Stable operation IDs and server unique constraints prevent double-counting across reconnect, devices and weekly rollover. Send bounded batches, one drain per actor/pack, retry jitter/Retry-After and explicit per-event ACK/rejection. A lost response after commit replays the same intent. Never delete unsynced work because a retry failed or an update arrived.

Reconnection: reauthenticate/validate actor; reconcile membership/access rules; upload allowed pending events; retrieve canonical summary/receipts; update local snapshot; show synced state only after acknowledgements. Already completed offline work after access expiry requires a defined grace policy; never silently grant new pack issuance or falsely mark rejected work accepted. User clock values remain untrusted. Offline weekly practice is not the timed/mock submission channel and must not extend mock deadlines.

Storage: versioned manifest/hash per object, atomic download completion, quota/error/eviction handling, offline media failure states, no eviction of unresolved pending answers, explicit delete warning and durable migration from legacy outbox if reused. Service-worker update waits during downloads, unresolved work and active practice; keep build-compatible shell assets available. Background Sync is optional; foreground reopen/resume is the reliable baseline.

## 6. Dictionary research and recommendation

Research date: 17 October 2026; recheck availability, terms and data rights before integration. “Open-source server”, “free hosted API” and “openly licensed dictionary content/audio” are different claims.

| Option | Strength | Limitation / role |
| --- | --- | --- |
| Free Dictionary API, dictionaryapi.dev | Public English lookup endpoint; sample includes meanings, part of speech, phonetics and examples; source code available under GPL-3.0 | Candidate lookup provider. No assumption of SLA/unlimited traffic or complete verb inflections. Verify current content/audio licence and attribution independently of server-code licence |
| Wiktionary data via Kaikki/Wiktextract | Structured lexical datasets with senses and form-related fields; useful for reviewed daily verb lessons | Dataset/extraction workflow, not a guaranteed hosted on-demand inflection API. Large downloads must be processed outside request paths; retain source/content licence and entry attribution; extractor licence differs from text licence |
| Princeton WordNet | Downloadable lexical resource with explicit commercial-use licence | Candidate optional local definitions/semantic resource; not a full pronunciation/verb-tense API. Coverage/editorial fit requires a sample audit |
| Wordnik | Established lookup service | Not recommended for this free/offline baseline: its published FAQ requires commercial paid plans after proof of concept and disallows Basic-plan caching |

Recommended approach: provider-neutral lookup adapter initially evaluating dictionaryapi.dev, and a curated, provenance-preserving vocabulary catalogue sourced from approved open content for daily lessons and verb forms. Don't depend on random API responses to publish five accurate verbs every day. Do not download or distribute a complete external dataset until licence obligations and storage cost are accepted.

Proposed lookup route: `/api/v1/dictionary/lookup?word=...`; normalise Unicode/trim/case for cache keys without mangling valid apostrophes/hyphens, bound length, allowlist provider host/path and encode the word. Rate-limit abuse; deduplicate identical misses; shared caching only for licensed public lexical content. Never forward student identity, school membership or full question text to the provider. Avoid a request on every keystroke; submit action or deliberate debounced search. Timeouts/404/rate limits have clear UI. Render text safely and allowlist external audio URLs; missing audio/examples/forms are legitimate missing data, not guessed fields.

Saved words are actor-scoped. Keep entry source URL, provider/version, licence/attribution and fetched/reviewed time with offline data. Distinguish public definition cache from private saved-word status. Apply retention/removal requirements if a provider changes its terms. Dictionary is allowed in study/weekly practice; disable its in-app entry during timed exam conditions and do not imply this blocks outside dictionaries.

Primary sources:
- https://dictionaryapi.dev/
- https://github.com/meetDeveloper/freeDictionaryAPI
- https://kaikki.org/dictionary/English/
- https://github.com/tatuylonen/wiktextract (data structure and licensing section)
- https://wordnet.princeton.edu/license-and-commercial-use
- https://developer.wordnik.com/faq
- https://developer.wordnik.com/pricing

## 7. Five new words daily

Lesson card fields: headword, part of speech, clear study definition, example sentence, pronunciation text/audio where licensed, synonyms/antonyms where appropriate, save/review status and source attribution. Verb cards add base form, simple present (including third-person singular), simple past, past participle and -ing form; flag irregular forms and accepted variants. Example of form shape only: go / goes / went / gone / going. Do not generate irregular forms by appending “ed”.

Daily delivery proposed in Africa/Lagos, five reviewed unfamiliar items with verb emphasis. User said “especially verbs”, not “verbs only”: propose configurable mix of at least three verbs and two useful other words; decision required. Student-specific seen history prevents five “new” labels on repeats; spaced repetition is separate from the five new allocations. Bank exhaustion shows review words honestly. Record dialect/variant and sense-specific inflections where applicable.

Content pipeline: editorial draft → source/licence check → verify definition/example/forms → approved → scheduled → published → corrected/withdrawn. Keep editorial revisions and original attribution. A scheduled daily batch can be shared public content with private progress; personalised unseen selection requires versioned per-user allocation/receipt. Choose one model before implementation. Proposed first release: reviewed common schedule plus per-user seen checks and reviewed replacements.

Offline: online download can optionally include the next seven approved lessons (35 words). Release by scheduled date; acknowledge device clock manipulation is not secure access control. No background code is guaranteed to run at midnight: update on next app open. Never show an undownloaded lesson as offline-ready. Audio is optional/lazy download to save mobile data. Completed word quiz/save events join the actor-scoped idempotent sync system; distinguish self-reported familiarity from verified exam strength.

Admin: manage editorial queue, sources, forms, schedule, correction history and replacements. Dashboard widget links to daily lesson, saved words and review. Reminders/notifications remain optional and permission-based, not part of initial acceptance.

## 8. School onboarding and portals

### School registration

Self-service: public partnership page → school application and representative contact → duplicate check → platform review/verification → activate authorised school administrator → school workspace. Platform admin creation uses the same verification/invitation/audit model, not a global-admin role assigned to a teacher. Proposed approval requirement mitigates impersonation and unauthorised student-data access; exact verification evidence is a product decision.

School record: legal/display name, contact, location, status, verified representative, optional logo and audit trail. Keep school application PII minimised. Do not automatically link a similarly named organisation from the parent Laravel platform.

### School administrator

Overview, students/activation states, classes/cohorts, teacher invitations and class/subject assignments, bulk student import with validation/preview/resume receipts, seat quantity and term quote, payment status/receipts/renewal, learning reports and recommendations, support and audit history. No one-click impersonation or plain-text student-password export.

### Student enrolment

Create individually or CSV import; validate required identity fields and duplicate rows before creating identities. Existing student account requires verified invitation/linking; knowing an email/student code does not authorise takeover or school visibility. Minimise collected fields; decide candidate access for students without email rather than fabricate addresses in the email-auth system. Use secure activation, password reset and age/guardian-consent process appropriate to minors. Never shared classroom passwords.

Membership lifecycle: pending → invited → activated → covered/active; suspended/withdrawn/transferred/expired are explicit. A student can be listed before payment, but paid features activate only when funding and membership requirements are satisfied. School payment gives scoped product access, not school-platform-admin privileges.

### Teachers

Only assigned classes/subjects and valid school memberships. Screens: class overview, topic weaknesses with sample size/confidence, question/topic error patterns, student drilldown in scope, practice completion, attendance-like study activity if useful (not a new school attendance module), progress over time and assigned practice. No billing permissions by default. Clearly show last server sync and separate offline self-study from confirmed exam evidence.

### Teaching guidance

Aggregate distinct response evidence by subject/topic and class. Show coverage, sample size, unanswered versus incorrect, recent trend, activity/source and assessment type. Unknown is not weak. Low evidence stays provisional. Recommendations identify a topic, evidence and suggested practice; no guaranteed score gains or unexplained student ranking. Suppress small-group public comparisons and avoid exposing another class's students through aggregate filters.

Teachers may assign existing reviewed topic practice or weekly-pack study goals later. Do not silently turn this into attendance, report-card, fee-management or a separate school management system.

## 9. School payment and access model

### Confirmed price formula

`total_naira = funded_student_count × 1,500 × months`, integer `months` from 1 through 12. Quote stores integer kobo, rate version, quantity, duration, currency NGN and student/cohort scope. Server calculates; client price is display only.

| Students | Months | Per month for school | Upfront total |
| ---: | ---: | ---: | ---: |
| 50 | 1 | ₦75,000 | ₦75,000 |
| 50 | 3 | ₦75,000 | ₦225,000 |
| 50 | 12 | ₦75,000 | ₦900,000 |

50 × 150,000 kobo × 3 = **22,500,000 kobo**. No automatic 50% launch/referral discount applies to school orders unless separately approved. Do not confuse ₦1,500 rate with the existing public individual rate/promotion.

### Order journey

Choose covered roster/seats → select 1–12 months → immutable server quote with expiry → initialise one-time Paystack transaction → pending callback/receipt → verified settlement → activate purchased coverage. No recurring Paystack plan/subscription parameter and no automatic renewal for these school orders. Reuse validated gateway integration where appropriate without inheriting individual recurring-plan requirements.

Server verifies successful status, expected amount/currency/reference and quote association before value delivery. Webhook and callback verification converge on one idempotent settlement operation; duplicate/out-of-order deliveries cannot create another term. Browser success alone is insufficient. Provider calls are outside DB transactions. Preserve pending references across installed-app/external checkout return; recovery screen retries confirmation, never charges again just to check status. [Payment sources below]

### Funded seats and term grants

Proposed robust model: school order purchases seat grants for a common cohort term; assign each funded seat to one valid student membership with explicit unique constraints. Existing selected 50 students all receive the quoted three-month interval. School can register >50 records, but cannot grant >50 funded concurrent seats for this order.

Never create 50 different gateway subscriptions. A school coverage source grants product features through an entitlement resolver. Preserve existing individual access independently; access is active if at least one valid funding source grants the capability. Do not overwrite a personal entitlement or silently cancel its recurring billing when school coverage is added. Show overlaps and provide the relevant existing billing controls.

Activation start, prepaid future starts, individual-versus-common term, late enrolment, calendar-month versus 30-day-month semantics and renewal overlap need approval. Recommended common term with specified start/end on the quote; renewal begins at max(current paid cohort end, chosen valid start), with bounded seat-specific handling. Never extend all users based on a stale school-level expiry alone.

Additional seats mid-term need an explicit top-up quote/policy: default new whole-month purchase or administrator-assisted quote, not invented proration. Removed/withdrawn students do not automatically free already consumed seat-months or receive refunds. Decide transfer/reassignment limits, replacements, unused seats and refunds before launch. Twelve months limits each school purchase; do not invent a lifetime maximum.

Payment and permission suspension differ: removing a teacher's access must not cancel students' prepaid entitlements; school withdrawal/student transfer must retain student's own learning history. Refund/dispute handling needs reviewed entitlement adjustment, immutable original settlement and auditable allocation reversal rather than deletion. Update policy text and school agreement using the confirmed operators/contact; have privacy/contract roles reviewed for school partnerships rather than assuming existing consumer terms cover them.

Payment sources: https://paystack.com/docs/payments/accept-payments/ and https://paystack.com/docs/payments/verify-payments/ . This plan does not enable a payment mode, send money or change live pricing.

## 10. Tenant security, privacy and reporting scope

Separate global platform role from school membership roles. Use explicit `school_id` in tenant-owned rows and server-side actor membership checks in every endpoint. Teachers need active assignment and school membership; student role is never promoted by browser claims. Global admin access is separately audited. With privileged direct SQL, RLS alone is not sufficient: tenant predicates and ownership are mandatory; RLS remains defence in depth where used.

Composite foreign keys/constraints prevent assigning a class, teacher, order or student grant from another tenant. Reject cross-tenant filters, exports, counts, drilldowns and ID guessing. Report queries use allowed membership/assignment scopes, never trust caller-supplied school ID. CSV export is permissioned, logged, formula-safe, bounded and not public-cacheable.

Define visibility windows: new school does not automatically inherit a student's pre-enrolment/personal learning history. The requirement to see progress of school students is confirmed; historical sharing, transferred students, post-membership retention and teacher visibility need explicit disclosure/consent and policy. Students retain personal history. Review school representative authority and under-18 consent, data minimisation, deletion/access requests, breach/retention processes and applicable agreements with appropriate advice before launch.

School portals initially require online authorisation. Never give offline teacher snapshots indefinite access after dismissal. Student offline snapshots are their own only. Secure invitations, role changes, imports, payment approvals, exports, refunds and entitlement adjustments need audit events without storing credentials or full sensitive payloads in logs.

## 11. Proposed data model and API surface

These are design candidates, not migrations already present. Inspect the actual schema before implementation and reconcile existing tables rather than duplicate them.

- Schools: `schools`, `school_applications`, `school_memberships`, `school_invitations`, `school_classes`, `school_class_students`, `school_teacher_assignments`, `school_audit_events`.
- School commerce: `school_price_versions`, `school_quotes`, `school_orders`, `school_order_payments`, `school_terms`, `school_seat_grants`, `school_seat_assignments`. Store immutable billed roster/quantity and product scope in quote/order snapshots. Unique gateway reference and settled-order term/allocation keys.
- Weekly learning: `weekly_pack_policies`, `weekly_packs`, `weekly_pack_items`, `weekly_pack_download_receipts`, `weekly_pack_events`, `weekly_pack_sync_receipts`. Freeze issued content/keys server-side; device payload's key disclosure depends on approved grading option. Uniqueness must include actor/week/policy and controlled replacement generation.
- Vocabulary: `lexical_entries`, `lexical_sources`, `lexical_forms`, `vocabulary_lessons`, `vocabulary_lesson_items`, `student_word_progress`, `student_saved_words` with licence/source/editorial revisions.
- Shared evidence: extend existing scored-response metadata or create a linked evidence stream distinguishing supervised/mock, online practice, offline self-study and review; avoid double-counting old events.
- Device: versioned IndexedDB public-asset references, actor-scoped approved snapshots, pack payload/state, answer events, pending queue, receipts and vocabulary downloads. No copied bearer/refresh tokens.

Proposed endpoint groups under native `/api/v1/`: weekly pack issue/manifest/download/status/events/reconcile; dictionary lookup; daily vocabulary/saved words; school application/membership/invitation/student/class/teacher/report; school quote/checkout/order verification/renewal; platform-admin school review/control. Public application must not expose roster or open student creation without abuse controls. Mutations require existing idempotency/error/body-bound patterns; all bulk work uses bounded batches and resumable receipts.

Do not introduce broad shared caching of a tenant/actor response. Global public lexical data can have licensed caching; school statistics and private snapshots are owner-scoped. Any new schema is additive, indexed, RLS-reviewed, backed up and restore-rehearsed before production migration.

## 12. Cost, performance and delivery design

A pack must not require 250 network calls or 250 independent DB transactions. One logical issue operation may use bounded downloads and must be recoverable without reallocation. Compress text; deduplicate shared passages/media; estimate and cap bytes; download audio optionally; don't precache every school admin route. Pre-generate/cache public vocabulary editions instead of querying five external words per student every day.

10,000 weekly packs × 250 questions = **2.5 million issued item assignments per week** if each user gets a unique pack. This is not a free-tier capacity promise. Measure actual item/event/index storage and egress before choosing relational per-item snapshots versus immutable content references/compact manifests. Preserve auditability and editorial versioning regardless of storage choice. Consider shared public content blobs with per-user selections only after privacy/content-disclosure review; random personalised manifests still require correct access and exposure handling.

School reports should aggregate existing evidence incrementally where justified, not repeatedly scan full answer history for every dashboard card. Pagination, assignment-scoped indexes, bounded CSV imports and queued/resumable provisioning prevent 50–5,000-student operations holding a transaction during external auth calls. Use a saga/receipt model for auth creation outside DB transaction; reconciliation handles partial failure.

Define measured budgets for pack issue CPU, database queries, compressed bytes, IndexedDB latency, batch sync throughput and report p95 before promising launch scale. Default free infrastructure has quotas; plan capacity upgrades when evidence requires, not after losing pending student work.

## 13. Phases and acceptance

Recommended sequencing: F0 decisions/schema contracts; F1 tenant/commerce foundation (can be designed alongside offline foundation); F2 curated dictionary/daily words; F3 offline UI/snapshots; F4 weekly pack issuance/download and study; F5 sync/evidence; F6 school portal/import/payment; F7 teacher analytics; F8 integrated acceptance/controlled release. Task dependencies, not calendar estimates, determine order. No completion date is promised before sizing.

Acceptance examples:

- Weekly pack exact250, only enrolled subjects, coherent passages, meaningful random variation, duplicate-family protection, no bank shortage consuming quota, retry same pack, subject-change abuse prevented.
- Kill/reload fully offline after successful download; all UI/diagrams/fonts load; partial pack never ready; stale/expired access explicit; account B cannot read or sync A's pack.
- Reversal/first-response/review semantics survive crash, lost ACK, repeated sync and device takeover; no false grading, fabricated mastery or wrong “all synced” state.
- Offline sidebar/mobile/direct URL consistency; timestamps and read-only snapshot state; server failure is distinct from no internet; all live backend authorisation remains enforced.
- Five daily reviewed words, correct irregular forms, no unsupported new-word claim, offline lesson supply and attribution; dictionary miss/failure never crashes a session.
- School A pays 50 × ₦1,500 × 3 = ₦225,000; exactly50 grants for agreed three-month interval. 0/13 months and changed client totals rejected. Replay webhook/callback gives no additional seats or time.
- Existing personal access survives school assignment; no automatic school renewals; no hidden public-price change; seat top-up/transfer/renewal follows approved rules.
- School A/B and assigned/unassigned teachers cannot access each other's data through pages, APIs, exports or aggregates; existing account linking requires proof; no shared passwords.
- Teacher recommendations reflect sufficient real evidence and label offline self-study; locally completed unsynced work isn't shown as missing learning without freshness context.
- Additive migrations/backups, old-client compatibility, safe PWA update and rescue, provider-request budget and real iPhone/Android/network/device tests before publishing.

## 14. Decisions to collect before dependent implementation

1. Is ₦1,500 school-only, or a future change to individual price too? Are individual recurring subscriptions also being retired, or only school billing?
2. Is weekly250 for paid/school students only, or Free too? Which weekly boundary and completion/replacement policy?
3. Approve proposed 83/56/56/55 subject ratio or choose another; are group-aware deviations allowed?
4. Offline immediate answers/explanations (unranked learning) versus feedback after online marking; school reporting must label the resulting evidence.
5. Offline access-window, pack expiry, post-expiry sync grace and download-device policy.
6. School term begins on payment, cohort start or each student's activation? Calendar month versus 30 days? Recommendation: explicit common calendar term.
7. Unused seats, mid-term additions, replacements, transfers, refund/dispute rules and overlapping personal access.
8. Students without email: approved activation/login method; no fake addresses or shared credentials.
9. School approval/teacher invitations, historical performance sharing and under-18 process.
10. Daily vocabulary: verb-only or verb-heavy mix, shared schedule versus personalised allocations, Free/Paid access and dictionary source/licence approval.

Record answers as confirmed decisions before code depends on them. Routine implementation choices may use documented judgement, but don't silently invent prices, access rules, privacy permissions or commercial obligations.
