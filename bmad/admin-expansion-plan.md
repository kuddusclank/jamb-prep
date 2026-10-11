# JAMBPrep administration expansion — BMAD plan

Date: 11 October 2026. State: **planning complete; implementation on hold at the user's instruction**. No application changes, migrations, account changes or deployments are authorised by this document. This is a proposed expansion of the nested JAMBPrep app, not the parent LecternIQ school-platform admin.

## 1. Confirmed requirements and proposed scope

The user requires an admin interface that can browse **every question organised by subject**, research JAMB subjects/topics, manually enter questions and their properties, download a CSV template and import completed files, and review student question reports. The user requested app study and BMAD planning first, then a stop.

Proposed defaults below are design recommendations, not settled product decisions: drafts before publication, versioned questions, bounded resumable import jobs, a moderation queue, content audit history, operational support views and a phased rollout. Preserve confirmed existing decisions: no email confirmation; new referral qualification only after a first diagnostic; historical rewards retained; Free tier while testing; full mock bank checks; server-authoritative scores/quotas and payment settlement. This plan does not approve billing changes or replace the open performance/cutover gates.

## 2. Studied app and concrete gaps

Source-of-truth inspection covers the route tree under `src/app`, current admin UI, native router/services, schema, question validators, subject seed, and product/app-flow/backend/remediation BMAD documents. Historical documents describe intended screens that do not all exist; current code takes precedence for implemented claims.

| Area | Current implementation | Required change |
| --- | --- | --- |
| Admin overview | Student, published-question and completed-attempt totals | Subject coverage/readiness, quality and report/import queues; bounded queries |
| Question library | Latest 50 metadata rows, newest first; no stem/options/detail/editor | All records through pagination, subject/topic grouping, filters, detail and preview |
| Authoring | JSON array, 1–10 complete questions; immediately published | Accessible manual form, validation, draft/review/publish lifecycle |
| Subject/topic hierarchy | 15 seeded subjects; flat topic rows; imports can create topic titles | Source-backed controlled curriculum, stable IDs, aliases and hierarchy |
| Question fields | Subject/topic, stem, A–D options, correct key, difficulty, year, image, passage, explanation | Provenance/licensing, editorial revision/status/audit; optional tags |
| Validation | Legacy Zod year 1980–2026; native contract 1978–2100 | One reviewed current-year/source policy, compatible contracts; no silent coercion |
| Student flags | `attempt_questions.is_flagged` marks a question to revisit | Separate content-report workflow; never reinterpret bookmarks as complaints |
| Media/passages | Referenced image URL and passage data; no complete admin upload workflow | Managed upload/attachment and reusable passages with safe rendering |
| Auth/security | Verified actor, live session, DB `profiles.role=admin`; direct browser table access blocked | Retain on every new admin endpoint, including exports and uploads |
| Exams | Frozen snapshots and server-owned answer/scoring paths | Editorial changes affect future issues; preserve existing attempt content/results |
| Payments/referrals | Durable intents, verification, entitlements and diagnostic qualification | Readable support/reconciliation views; no client privilege/entitlement override |
| Hosting | Static Pages preview plus native API; older main-domain Worker retained | Static-compatible admin routes and bounded CPU; no SSR or secret-bearing client imports |

Important source files: `src/app/admin/page.tsx`, `worker/api/router.ts` (admin handlers/import and exam flags), `src/lib/validation/question.ts`, `worker/api/contracts.ts`, `src/db/schema.ts`, `src/db/seed.ts`, `worker/services/study-service.ts`, `worker/services/exam-foundation-service.ts`, `worker/services/paystack-service.ts` and `src/lib/auth/account-coordinator.ts`.

## 3. Admin navigation and daily workflow

Proposed areas: Overview; Question library; New question; Imports; Curriculum; Passages & media; Student reports; Students & attempts; Payments & referrals; Audit & system health. Content tools are first priority. Operational support follows after content acceptance.

Use static routes with query parameters for IDs, for example `/admin/questions/?subject=ENG&topic=<id>&status=draft` and `/admin/questions/edit/?questionId=<uuid>`; do not enumerate private dynamic IDs during export. A persistent admin navigation and mobile-friendly filters replace the JSON-only screen. Keep full answer keys exclusively behind authorised admin calls.

### Question library

Subject cards show total, draft, reviewed, published-valid and blocked counts; expand into source-ordered sections/topics. Default sort: subject, curriculum order, stable question key. Every record must be reachable using server pagination (proposed 25 rows, maximum 100), never a hard latest-50 limit or downloading the whole bank. Filters: subject, topic/subtopic, lifecycle, difficulty, year, report status, source and import job. Search stem/reference with bounded parameters and indexed execution; safe sorting allowlist, stable cursor and visible count/next controls.

Rows show stem excerpt, topic, year/difficulty, status, revision and open reports. Detail displays all options, labelled correct answer, explanation, diagram, passage, provenance and revision history. Preview uses the actual student renderer and mobile layout. Actions: edit, duplicate as a new draft, submit for review, publish, return to draft, archive and view reports. Batch actions have explicit selection summaries and confirmation for publication/archive; no destructive hard deletion of used questions. Archived items are excluded from future selection through an explicit selection predicate/schema design, without deleting attempt references.

### Manual question editor

Required: subject, canonical topic, question stem, four distinct labels A–D with nonblank text, exactly one answer key, explanation and lifecycle action. Optional: subtopic/tags, difficulty (default medium), exam year, original author/source/reference, permission/licence record, passage ID/title/content, image and accessible alt text. Original practice questions must not be labelled as actual JAMB past questions. Support Unicode, Nigerian-language diacritics and RTL Arabic, Markdown and existing LaTeX/KaTeX syntax; reject unsafe raw HTML/script and unsafe links.

Dependent subject/topic choices; searchable approved taxonomy; inline validation; rendering preview for formulas/tables/diagrams; unsaved-change warning; explicit saving/saved/error states; retain input after failed saves. Use optimistic editorial revision checks: conflicting edits return 409 and allow comparison. No accidental duplicate creation on retry: stable mutation intent/idempotency key. Publishing validates subject/topic relationship, complete options/key/explanation, approved media and provenance. Drafts may be incomplete but never enter practice/mock selection. Reviewer role separation is a proposal: current API authorises only admin, so a `reviewer` schema enum is not proof of supported reviewer permissions.

## 4. Curriculum and syllabus research

See [topic research catalogue](jamb-syllabus-topic-catalogue.md) and [25-source manifest](jamb-syllabus-sources.json). All 25 official portal PDFs were retrieved and text-inspected; catalogue groups are paraphrased, not a claim that every child heading has been editor-verified. The portal includes Computer Studies and Physical/Health Education, so stopping at the old 23-subject lists or the app's 15 subjects would miss published material.

Preserve existing 15 codes: ENG, MTH, PHY, CHM, BIO, ECN, GOV, LIT, COM, ACC, CRK, IRS, GEO, AGR, HIS. Missing catalogue subjects: Arabic, Art, Computer Studies, French, Hausa, Home Economics, Igbo, Music, Physical and Health Education, Yoruba. Proposed additional codes require a reviewed migration; do not rename existing codes/IDs. Treat CRS/CRK and Accounts/Accounting names as aliases, not new duplicate subjects.

Proposed hierarchy: subject → syllabus edition → section → topic → subtopic/objective mapping. Give entries stable IDs, native-language labels, aliases, display order, source URL/page, review state, effective year range and supersession links. Preserve current `questions.topic_id` and mastery references with an explicit old-to-new mapping; no destructive reset/merge of mastery history. Maintain an uncategorised/review queue for legacy labels. CSVs select canonical IDs/slugs, not silently creating arbitrary topics.

**Curriculum completeness gate:** map every numbered/lettered top-level topic and each subtopic in every official PDF to a catalogue entry or explicit non-topic reference (objectives, bibliography, exam structure, prescribed works); record page/heading identifiers and unmatched items. A subject is not “complete” from a broad outline alone. Specialist review is required for Arabic/Hausa/Igbo/Yoruba labels and text lists. Verify annual prescribed novels/poems/plays and the actual available examination subjects from current JAMB notices before activation; portal presence alone does not prove annual subject availability. PDFs are not uniformly labelled with a current exam year.

Coverage screen shows valid published questions per topic and source mapping progress. Readiness retains at least 60 English +40 for each selected elective, checks active/published validity, and highlights weak/empty topics and passage requirements. Quantity alone is not sufficient editorial coverage; do not duplicate items merely to pass preflight. Allow inactive curriculum placeholders while original 15 bank subjects remain usable.

## 5. CSV template and bulk import design

Download versioned UTF-8 CSV template, a separate completed example, and subject/topic reference files. The template download is a planned feature, not delivered by this plan. Proposed create-only v1 columns:

`template_version,external_reference,subject_code,topic_slug,subtopic_slug,stem,option_a,option_b,option_c,option_d,correct_option,explanation,difficulty,exam_year,source_type,source_reference,rights_note,passage_reference,passage_title,passage_content,image_url,image_alt,tags`

Required v1: version, external reference, subject code, topic slug, stem, A–D, answer key and explanation. Nullable year and empty optional cells supported. Status defaults to draft; CSV cannot promote roles, alter entitlements or publish automatically. Source fields are required by the publication checklist. Subtopic/rights fields depend on planned schema additions; do not send unsupported columns to the existing importer. Keep passage references unique within a job and reusable across rows. Existing question updates need a separate explicit mode with question ID/revision and must never be inferred from a matching stem.

RFC-compatible CSV parsing: quoted commas, embedded newlines, escaped quotes, CRLF/LF, optional UTF-8 BOM, Unicode and formulas. Do not split by comma/newline. Whitelist headers, reject unsupported encodings/oversized cells, give precise row/column errors and preserve raw data in previews. CSV exports/templates must prevent spreadsheet formula execution for cells beginning with `=`, `+`, `-`, `@` or control characters; decode documented export escaping on re-import without damaging legitimate mathematical content.

Workflow: upload → client preliminary validation → server-authoritative dry run → duplicates/topic/media checks → paginated preview → explicit commit → job receipt. Include total/valid/invalid/duplicate counts, downloadable error CSV, progress, cancellation between batches and resumable retry. Proposed initial limit: 500 rows /1 MiB, subject to measured Free CPU and upload tests. Use serial bounded batches no larger than existing 10-row transaction until evidence supports more; avoid one long Worker transaction. Each committed batch is atomic and idempotent. The entire job is explicitly **not** all-or-nothing once batches commit: show committed/failed/pending rows and resume; cancelling keeps saved drafts. Store manifest/chunk keys with actor ownership so retries/new devices do not duplicate records. Duplicate rules combine source/external reference uniqueness with normalised content fingerprints and manual near-duplicate review. Never silently overwrite or skip without a receipt.

## 6. Student question reports and moderation

Add a distinct “Report a problem” action in practice and mock/review. Reasons: wrong key, ambiguous wording, multiple/no correct choices, faulty explanation, bad image/formula, wrong topic, duplication, other. Optional bounded comment; no camera/microphone. During a timed exam use a short dialog without answer revelation or pausing the timer.

Server validates authenticated actor actually received the question through an owned practice/mock context; freezes report context with question revision/snapshot reference. Student supplies no reporter ID/score/answer key; authorisation derives these. Limit duplicate reports per actor/question revision/reason, rate-limit submissions and make retries idempotent. Reports do not qualify referrals, refund allowance or change scores. Keep exam bookmarks separate.

Admin queue: grouped by question/revision, severity, reason, subject/topic, date and unique reporters. States: open, investigating, resolved, dismissed; append reason/assignee/action history. Admin can preview reported snapshot beside latest bank content, edit a future revision, unpublish/quarantine future issuance, link a duplicate or dismiss with explanation. Student can view acknowledgement/status in-app. Do not automatically remove content or discipline a student based on reports. Historical regrading is a separate explicitly authorised product/workflow decision; existing frozen scores remain unchanged by default.

## 7. Supporting administration proposals

- Passages/media: reusable passage editor; linked-question counts; image upload validation, file/signature/size/type limits and safe project-storage paths; meaningful alt text; formula preview; cleanup cannot delete assets referenced by frozen exams. Audio support is a future explicit design choice, relevant to language/music, not an assumed existing feature.
- Student support: bounded search and account/setup/subject status, quota/attempt timeline and diagnostic consumption. Minimise personal data; no password/token visibility, impersonation or silent allowance resets. Recovery actions require explicit reason and audit.
- Payments/referrals: transaction, entitlement, cancellation, webhook and renewal-reconciliation statuses; verify through existing provider-aware services; distinguish TEST/LIVE. No “mark paid” client shortcut. Referral attribution, diagnostic qualification and historical rewards remain auditable.
- Quality analytics: topic coverage, invalid content, report backlog and import failure rates; aggregate answer accuracy cautiously with minimum sample counts. Never equate difficult questions with faulty keys automatically.
- Audit/system: who changed which revision, when, reason and import/job/request IDs; provider/DB/API health indicators without SQL text, credentials or personal payloads. Proposed append-only audit storage and retention policy.
- Staff access: current admin role initially; least-privilege content reviewer/support roles are later proposals. Staff role changes cannot be a casual editable form field; server controls and audit are mandatory.

## 8. Technical design and safeguards

Extend the native `/api/v1/admin/*` API; add question detail/create/update/lifecycle routes, paginated library, curriculum, import validation/job progress, reports and bounded audit endpoints. Public/student DTOs never include unpublished content, keys or private editorial notes. Every admin read/write/export/upload uses live session and database role authorisation, CORS allowlist, body limits, no-store, SQL timeouts and per-actor limits. Mutations are transactional/idempotent; editorial updates use expected revision. No browser `.from()`/`.rpc()` bypass and no service secret in static assets.

Proposed additive schema: question editorial revision/provenance/archive metadata; revision history; source-edition/section/subtopic mapping; question reports and state events; import jobs/chunks/row receipts; audit records; media metadata. Final DDL follows live baseline inspection, private backup and migration/recovery review; plan-only research made no live calls. Add subject-scoped unique topic identifiers only after collision mapping. Cross-subject topic/passage/media references must fail server checks. Preserve immutable attempt snapshots and old foreign-key identities. Do not change rendered historical questions when a bank passage/image is edited.

Keep paginated queries/indexes and aggregates bounded; lazy-load authoring and CSV tools. Do not add large validation/parser/editor dependencies without approval. Reuse existing renderer and styling. Loading/error/retry states, keyboard labels/focus, screen-reader announcements, reduced motion, phone layouts and iOS preview are acceptance requirements. All numeric upload/batch/page limits are proposals pending benchmarks, not licence to overload the Free Worker. Authenticated admin caching must purge on logout/account switch and never mix student/admin data.

## 9. Phased tasklist and acceptance gates

All items remain unchecked. Do not implement until user resumes work.

| Done | ID | Phase/task | Evidence required |
| --- | --- | --- | --- |
| [ ] | A00 | Baseline/UX inventory and final requirements | Source inventory, API/schema contracts, permission matrix, approved CSV policy |
| [ ] | A01 | Complete curriculum mapping | 25 source records, every source heading accounted for, annual-work checks, specialist review, old-topic mappings; no false completeness claim |
| [ ] | A02 | Additive schema/security foundation | Backup/restore and migration rehearsal, report/job/revision constraints, role/ownership negative tests |
| [ ] | A03 | Full question library and detail | Every row reachable across pages, subject/topic sorting/filter/search, admin-only keys, safe mobile preview |
| [ ] | A04 | Manual editor and editorial lifecycle | Create/save/edit/review/publish/archive; validation and conflicts; used-attempt snapshots unchanged |
| [ ] | A05 | Passages/media tooling | Safe upload and rendering, reusable references, no deletion of historical dependencies |
| [ ] | A06 | CSV template, validation and resumable jobs | UTF-8/quoted multiline round trip, row errors, duplicates, idempotent chunks, interrupted/cancelled job receipts, no auto-publication |
| [ ] | A07 | Student reports and moderation | Received-question ownership, bookmark separation, rate/dedup guards, snapshot-aware queue and audited resolution |
| [ ] | A08 | Content overview/readiness | Published-valid counts and topic gaps, full-bank preflight parity, reporting/import queues |
| [ ] | A09 | Student/payment/referral support | Minimised data, provider-authoritative operations, no unsafe privilege/score/quota shortcuts |
| [ ] | A10 | Audit/access refinement and release | Permission matrix, audit retention, staging checks, manual admin/student/iPhone flows, CPU and rollback evidence; separate deployment approval/budget |

Dependencies: A00→A01→A02; A03→A04; A05 before final media/import acceptance; A06 builds on editor validation; A07 builds on revisions; A08 aggregates content/report/import services; A09/A10 follow content acceptance. Deliver content management first; operational tools should not delay the ability to author and inspect the bank. Existing T16–T18 performance tasks stay separate and open.

Meaningful verification: nonadmin/expired/revoked roles; cross-actor reads/jobs/reports; stale editorial revisions; malicious Markdown/media/CSV formulas; partial import failures and recovery; invalid publication; frozen-question preservation; safe previews for equations, Arabic and diacritics; read/write concurrency; bounded CPU and latency. Use local/injected tests and isolated real PostgreSQL first; remote requests need an explicit fresh budget. Manual QA uses separate staff/student accounts and real phone testing; screenshots of old main-domain releases do not verify Pages fixes.

## 10. Decisions for implementation, not blockers to this plan

Confirm whether one admin may publish their own drafts or a second reviewer is required; which of the ten missing subjects launch first; annual syllabus/text approval owner; report retention and student-visible resolution detail; original/past-question rights/provenance rules; import size and duplicate handling; staff roles and operational support powers. Recommended first release: admin-only staff, drafts with explicit manual publication, no automatic historical regrading, create-only CSV batches, all 25 curriculum subjects documented but student activation only when verified and ready.

**Stop point:** planning artefacts only. No application implementation, migrations, imports, question seeding or deployment was performed for this request.
