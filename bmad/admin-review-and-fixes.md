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

- [ ] Durable server import jobs, receipts and deduplication across reloads/devices. Current retry recovery is tab-local; do not claim reload-safe jobs.
- [ ] Source/provenance/licensing schema and publication checklist. Current native publishing validates existing content fields, not unimplemented rights records.
- [ ] Full editorial version history and admin audit trail. Optimistic edit conflict detection is now implemented, but historical comparison/audit tooling is not.
- [ ] Complete official-topic mapping, controlled aliases/hierarchy, reviewed activation of all 25 subjects. Research outlines alone are not complete taxonomy.
- [ ] Managed media upload, accessible image alt text and reusable passage library.
- [ ] Student/attempt/payment support and audit/system-health tools.
- [ ] Hosted schema inspection, private backup, controlled report migration/API/Pages publication, authenticated browser/mobile verification and CPU checks.

These require their own implementation/release pass; the tasklist must not mark the full BMAD expansion accepted from the existing eight simulated tests.

## Production publication — 12 October 2026

User approved publication. Fresh private pg_dump archive created and inspected before applying drizzle/0005_question_reports.sql and 0006_question_editorial_revision.sql. Production database postcheck confirms authenticated browser INSERT privilege false and editorial_revision present. API version 675c43bf-00c4-4c07-bc49-e303ffd79c4b and Pages deployment 4d4793a5 published through the existing custom-domain router. /admin/questions/ and /admin/import/ return 200; unauthenticated native question-library and admin-session calls return 401. No hosted signup, charge or authenticated browser content-management action was performed. Browser/mobile visual QA and the undelivered original-plan features remain open. Earlier local-only evidence describes the state before this approved publication.
