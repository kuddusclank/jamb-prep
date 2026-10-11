# JAMBPrep Admin Portal Expansion — Implementation Tasklist

**Date:** 11 October 2026
**Branch:** `feat/admin-portal-expansion`
**Parent Specification:** `bmad/admin-expansion-plan.md`

---

## Task Progress

- [x] **T0: Plan Analysis & Tasklist Creation**
  - [x] Review `bmad/admin-expansion-plan.md`, `jamb-syllabus-topic-catalogue.md`, `jamb-syllabus-sources.json`.
  - [x] Create implementation tasklist and branch `feat/admin-portal-expansion`.

- [x] **T1: Additive Schema & Migrations**
  - [x] Add `questionReports` table and `reportStatusEnum` ('open', 'investigating', 'resolved', 'dismissed') in `src/db/schema.ts`.
  - [x] Add 'archived' status to `questionStatusEnum` in `src/db/schema.ts`.
  - [x] Create PostgreSQL migration `drizzle/0005_question_reports.sql`.

- [x] **T2: Native API Contracts & Endpoints (Worker Backend)**
  - [x] Enhanced Admin Overview: `GET /api/v1/admin/overview` with student totals, question lifecycle counts (published, draft, reviewed, archived), completed attempts, pending reports, and subject coverage breakdown.
  - [x] Paginated Question Library: `GET /api/v1/admin/questions` with `page`, `limit`, `subject`, `topic`, `status`, `difficulty`, `year`, `search` filters and full pagination metadata.
  - [x] Question Detail: `GET /api/v1/admin/questions/:questionId` with options, correct answer, explanation, passage.
  - [x] Question Authoring & Editing:
    - `POST /api/v1/admin/questions` (create new draft or published question).
    - `PUT /api/v1/admin/questions/:questionId` (update existing bank question while keeping attempt snapshots frozen).
    - `PATCH /api/v1/admin/questions/:questionId/status` (quick lifecycle status transition).
  - [x] Curriculum Research: `GET /api/v1/admin/curriculum` returning database subjects/topics with question metrics and the 25 official JAMB syllabus catalogue research sources.
  - [x] Student Question Reporting & Moderation:
    - `POST /api/v1/reports/question` (authenticated student report submission).
    - `GET /api/v1/admin/reports` (paginated admin moderation queue with status and subject filters).
    - `PATCH /api/v1/admin/reports/:reportId` (admin moderation status update and resolution notes).
  - [x] CSV Template & Bulk Importer:
    - `POST /api/v1/admin/questions/import/dry-run` (validation preview without committing).
    - Enhanced `POST /api/v1/admin/questions/import` with RFC-compliant parsing and formula injection defense.

- [x] **T3: Admin Portal Frontend (Next.js Static Pages)**
  - [x] Admin Navigation Shell (`src/app/admin/admin-nav.tsx`) with role verification, route tabs, and links.
  - [x] Overview Dashboard (`src/app/admin/page.tsx`) with metric cards, subject readiness indicators, and quick links.
  - [x] Question Library Page (`src/app/admin/questions/page.tsx`) with subject/topic/status/difficulty/search filters, KaTeX stem rendering, correct option indicators, and pagination.
  - [x] Manual Question Editor (`src/app/admin/questions/edit/page.tsx`) supporting Create & Edit with cascading topic selector, options A-D, KaTeX live preview, and validation.
  - [x] Curriculum Research Page (`src/app/admin/curriculum/page.tsx`) with subject coverage cards and the 25 official JAMB syllabus catalogue viewer.
  - [x] CSV Template Download & Bulk Import Page (`src/app/admin/import/page.tsx`) with template/sample download, file drop/paste, client RFC-4180 parsing, dry-run preview, and batch submission.
  - [x] Student Reports Moderation Page (`src/app/admin/reports/page.tsx`) with status filters, student comment display, and moderation resolution actions.
  - [x] Student Reporting Component (`src/components/report-question-dialog.tsx`) for candidate reporting during practice/review.

- [x] **T4: Comprehensive Test Suite & Verification**
  - [x] Create `tests/admin-portal.test.mjs` verifying:
    - Admin authentication & role enforcement (403 for non-admins).
    - Overview metrics and subject breakdown.
    - Question pagination, filters, and search.
    - Question creation, update, and lifecycle transition.
    - Preserved attempt snapshots on question edit.
    - Curriculum research endpoint and topic metrics.
    - Student report submission and admin moderation workflow.
    - CSV template formatting, RFC quote handling, and formula injection defense.
  - [x] Run `tests/admin-portal.test.mjs` with `node --import tsx --test` (Passed 8/8).
  - [x] Run existing test suites (`continuous-study-payment.test.mjs`, `worker-api-foundation.test.mjs`, `t04-session-provisioning.test.mjs`, `t05-static-export-routing.test.mjs`) (Passed 59/59).
  - [x] Run `npm run build` to verify clean static export to `out/` (26/26 routes successfully generated).

- [x] **T5: Git Commit, Push & Pull Request**
  - [x] Stage and commit all changes in `jambprep`.
  - [x] Push `feat/admin-portal-expansion` to `origin`.
  - [x] Provide PR link and summary.
