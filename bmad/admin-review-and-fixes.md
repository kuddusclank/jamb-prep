# Admin portal review and correction plan

Reviewed 12 October 2026 against admin-expansion-plan.md and commit a37532d. The original tasklist is an implementation report, not evidence of full acceptance. This review concerns the delivered content-management slice; it does not certify all proposed A00–A10 capabilities.

## Findings and implemented corrections

| Priority | Finding | Correction |
| --- | --- | --- |
| High | Imports immediately publish content despite draft-first plan | Native imports create drafts; interface describes draft import |
| High | Question create/update ignore idempotency keys | Require keys and run claims/writes atomically; real SQL replay test |
| High | Editing shared passage changes unrelated questions; clearing passage fails | Copy on edit; detach when cleared; real SQL isolation test |
| High | Report references can name another student's attempt | Verify attempt ownership and question membership before insert; require live session |
| High | Report migration introduces direct browser table policies | Preserve server-only architecture: RLS, revoke anon/authenticated privileges, remove old policies |
| High | Quick publish skips question completeness checks | Transactional active-subject/topic/options/key/explanation validation |
| High | CSV silently repairs invalid keys, difficulty and year | Reject invalid values with row errors; preserve negative mathematical text |
| High | Only first ten imported rows are preflighted | Validate every batch; commit disabled until all rows pass |
| High | Retrying partial import repeats committed batches | Preserve completed-batch cursor in this tab and retain failed mutation key; explicit partial receipt |
| Medium | Download template advertises fields the database silently discards | Template limited to supported fields; reject unknown/duplicate headers; original sample not claimed as a JAMB past question |
| Medium | CSV malformed quotes, sizes and column counts unchecked | Reject malformed fields, mismatched columns, over 1 MB or 1,000 rows |
| Medium | New report component was never rendered in student flows | Mounted in practice and mock; native modal focus behavior/Escape and timer cleanup |
| High | Concurrent editors silently overwrite newer content | Add editorial revision checks and increment on edits/status changes; stale edits return 409 |
| Medium | Manual image validation permits arbitrary third-party media | Match established HTTPS public-storage project allowlist |
| Medium | Unstable newest-first question order; invalid filters can produce SQL errors | Stable subject/topic/date/ID order; bounded search/page; reject invalid filters; retain total on empty pages |
| Medium | Repeated nav, weak mobile layout, competing active links and browser alerts | Shared server-authorized admin layout, desktop sidebar/mobile navigation, exact active states and inline errors |
| Medium | Unsaved editor refresh loses work without warning | Browser unload warning after edits; clear after save |
| Medium | Published quantity is labelled ready without editorial validation | Label count target explicitly rather than certifying readiness |
| Medium | Existing onboarding tests asserted SQL-call counts predating new referral policy | Assert relevant actor-bound writes instead of incidental query counts |

## Verification and release limits

77 targeted local tests pass; five real PostgreSQL tests pass, including transactional admin create replay, passage isolation and stale edit rejection. All five admin read handlers (overview, curriculum, library, detail, reports) additionally execute successfully against real local PostgreSQL. TypeScript passes. Production static build succeeds. The additive report and editorial-revision migrations were applied only to the loopback clone. No hosted signup, charge, live migration or deployment was performed in this review. No authenticated browser visual QA is claimed; sidebar and modal behavior still need a human browser pass before release.

## Remaining original-plan work (not delivered by the other agent)

- [x] Durable server import jobs, per-batch receipts and external-reference deduplication across reloads/devices. Same-file progress is stored per administrator; imported content stays draft.
- [x] Source/provenance/rights records, tags and publication checks, including diagram alternative text and actual past examination years.
- [x] Immutable editorial versions and admin audit trail; latest 50 question versions and 100 activity records are viewable. Older stored records remain retained; extended pagination/export remains follow-up scope.
- [ ] Complete official-topic mapping, controlled aliases/hierarchy, reviewed activation of all 25 subjects. Research outlines alone are not complete taxonomy.
- [x] Managed PNG/JPEG/WebP diagram upload, content-addressed R2 storage/cache, accessible image alt text, student rendering and reusable subject passage library.
- [x] Read-only student/payment support, completed-attempt and qualified-referral counts, audit and recovery/system configuration views. Detailed attempt investigation, referral case tools and staff permission tiers remain follow-up proposals.
- [ ] Hosted schema inspection, private backup, controlled report migration/API/Pages publication, authenticated browser/mobile verification and CPU checks.

These require their own implementation/release pass; the tasklist must not mark the full BMAD expansion accepted from the existing eight simulated tests.

## Production publication — 12 October 2026

User approved publication. Fresh private pg_dump archive created and inspected before applying drizzle/0005_question_reports.sql and 0006_question_editorial_revision.sql. Production database postcheck confirms authenticated browser INSERT privilege false and editorial_revision present. API version 675c43bf-00c4-4c07-bc49-e303ffd79c4b and Pages deployment 4d4793a5 published through the existing custom-domain router. /admin/questions/ and /admin/import/ return 200; unauthenticated native question-library and admin-session calls return 401. No hosted signup, charge or authenticated browser content-management action was performed. Browser/mobile visual QA and the undelivered original-plan features remain open. Earlier local-only evidence describes the state before this approved publication.


## Admin workflow expansion publication — 12 October 2026

Published native API version `8493bd46-8eb7-4286-a300-ae62b0c81421` and Pages deployment `35922fa8` at the existing custom domain. A fresh private backup was created and its archive inspected before additive migrations 0007/0008. Production postchecks show eight new RLS-protected tables and zero authenticated-browser INSERT grants. The R2 question-media bucket is bound. All ten newly configured research subjects are inactive. Existing student subject IDs and attempt snapshots are preserved.

The original 23-column `v1` CSV template is supported, including external references, source and rights notes, subtopic slugs, passage references, image descriptions and tags. Imports validate all chunks, respect UTF-8 byte and row limits, resume from durable processed-row counts, replay matching receipts, reject changed batch content and skip identical external references across files. Unknown or ambiguous topics require canonical mapping rather than arbitrary topic creation. No question files were imported into production.

Verification: targeted regression suite and TypeScript pass; six real rollback-only PostgreSQL integration tests pass, including invalid past-question publication and valid quick publishing; all 13 admin GET handlers execute against the real local clone. Static export succeeds. Native bundle is 586.78 KiB / gzip 123.20 KiB, with no Next/OpenNext/React runtime imports. Static output scan reports zero private credential matches. Isolated Chrome renders the actual static build with synthetic authenticated responses: question library/editor on desktop and import/support at 390px, with no horizontal overflow or browser exceptions. This is fixture-based UI verification, not a hosted staff or physical-iPhone acceptance test.

Nine bounded production read checks passed: five admin page shells and health return 200; unauthenticated admin identity/import jobs return 401; an absent managed image returns 404 rather than a missing-binding 503. No signup accounts, charges or staff role elevation were created. Budget accounting: 32/100 reserved/used, including a conservative 20-request deployment/provisioning reservation.

Still open: full leaf-level official syllabus mapping and annual subject/work review; new-subject activation remains gated. Persistent batch receipts are stored, but downloadable per-row job receipts/cancellation UI are not claimed. Detailed support investigation, retention/permission-tier policy, authenticated hosted editing, physical iPhone checks and CPU/load certification remain separate acceptance items. Fresh archive readability is verified; a restore rehearsal of that newest archive is not claimed. Earlier local-clone restore/migration tests do not replace that statement.


## Auth layout and loading continuity — 12 October 2026

Restored the original shared AuthShell for login and registration, including the large-screen editorial panel and compact mobile form. Replaced route/account/dashboard-data loading variants with a consistent full-screen LecternIQ cursive shimmer and progress indicator. The dashboard keeps authentication/redirect checks mounted while waiting for data; errors retain the existing retry/sign-out controls. Reduced-motion preferences disable both animations. A delayed-load retry remains available after ten seconds.

Verification: production static build and TypeScript pass; 25 account-navigation/static-routing tests pass. Isolated Chrome checks both auth pages at 1440px and 390px (448px/350px form widths, no horizontal overflow), and authenticated dashboard-data waiting at both widths (one branded screen, no navigation/loading-card flash). Reduced-motion animation checks pass, with zero browser exceptions. No hosted login, signup or charge was created.

Published the auth/loading follow-up as Pages deployment `40937bb4`; live login, registration and dashboard shells return 200 with the expected layouts. Admin expansion plus auth/loading changes fast-forwarded into main. Publication and checks consume the existing ten-request reservation; total allowance accounting is 42/100.


## Database-only question sources cleanup — 12 October 2026

At the user's request, removed the 15 subject question-data modules, both question-seeding scripts, and the untracked local question CSV from the repository after verified private archival outside the project. Removed the bundled pre-filled CSV question example and download; retained the blank v1 template and database-backed subject/topic reference. Subject metadata seed, schema/contracts, student answer handling and database-issued frozen attempt snapshots remain. Synthetic regression/benchmark fixtures contain placeholders rather than a student question bank and have no imports into production API/services/student code. No database question was deleted, rewritten or imported.

Production static build/TypeScript and 28 relevant regression tests pass; static output scans find zero removed question-example matches. Pages deployment `8d7dc758` published. The protected admin HTML shell is 200 and does not render staff content before authentication; its published importer JavaScript is 200 with database-reference tooling and no bundled sample question. Two read checks are included in the ten-request reservation, bringing total allowance accounting to 52/100. Removed sources are privately archived in `~/.codex/private-backups/jambprep/removed-question-sources-2026-10-12/`; current cleanup does not rewrite historic Git commits.


## CSV preflight crash repair — 12 October 2026

Reproduced the reported CSV failure on real local PostgreSQL: binding serialized JSON directly as jsonb double-encoded the subject-code array, causing SQLSTATE 22023 (cannot extract elements from a scalar). Changed affected preflight, alias/tag and audit bindings to text then jsonb. Also corrected bulk-contract rejection of null optional passage fields, matching the browser and declared nullable import contract. Failed preflight now clears stale running/validation state, distinguishes import-check errors from CSV parsing, and reports the batch row range and safe field details.

Fresh private backup and local rollback migration rehearsal preceded 0009_admin_json_parameter_repair.sql. Repair decodes only accidentally string-encoded alias/tag arrays and audit objects, preserving their contents, and adds root-shape constraints. Production postchecks show zero invalid alias/tag/audit shapes. Question bank content and historic attempt snapshots were not modified.

Seven real PostgreSQL tests and 33 targeted regressions pass, including prepared/unprepared preflight, mapped aliases, nullable passages, unknown-topic row results, persisted tag arrays and audit objects. Static build/TypeScript and isolated Worker dry-run pass. All 500 supplied CSV rows were preflighted against the local clone without a server exception. A single read-only production topic audit shows 488 unknown/ambiguous leaf-topic names and 12 parent-topic mismatches in the original file; those mapping errors remain intentional validation failures. No question was imported or auto-published, no arbitrary topic was created, and the source CSV in Downloads was left unchanged.

Published native API `2532fee6-ae57-4d2a-af9c-f6b2dcfa5bd7` and Pages `8924d5ae`. Three production checks confirm health 200, unauthenticated preflight 401 and updated importer asset 200. Budget accounting totals 78/100, including the conservative twenty-request publication reservation. Hosted authenticated full-file preflight is not claimed; the user can rerun it to inspect the row-level mapping errors.
