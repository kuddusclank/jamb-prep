# JAMBPrep — Product & Engineering Blueprint (BMAD)

Welcome to the definitive specification repository for **JAMBPrep**, an authentic Computer-Based Test (CBT) simulation and personalized performance coaching platform for Nigerian UTME candidates.

---

## Current performance remediation handoff — 10 October 2026

User direction: stay on Cloudflare Free for testing; upgrade at launch. The deployed SSR Worker has confirmed CPU-limit failures. Start with the [free-tier remediation plan](free-tier-remediation-plan.md), [reviewed tasklist](free-tier-tasklist.md), and [current agent prompt](next-agent-prompt.md). These supersede the earlier immediate-upgrade direction and older architecture assumptions for this work. The conversion is planned, not implemented; the API CPU feasibility gate must pass first. Existing product/security requirements remain in force.

## Current UI handoff

Read [UI design and component guide](ui-design-and-component-guide.md) before frontend work. It documents the implemented landing design, reusable components, motion, accessibility and the confirmed account requirement. It takes precedence over older landing-page guidance. All practice and exams require a signed-in account; there is no anonymous question demo.

## 📚 Specification Index

| Document | File | Purpose |
| :--- | :--- | :--- |
| **Product Requirements (PRD)** | [`product-requirements.md`](file:///Users/akanbiabdulquddus/Developer/LecternIQ/jambprep/bmad/product-requirements.md) | Feature-by-feature breakdown, personas, acceptance criteria, freemium rules, and viral referral logic. |
| **Technical Requirements (TRD)** | [`technical-requirements.md`](file:///Users/akanbiabdulquddus/Developer/LecternIQ/jambprep/bmad/technical-requirements.md) | Architecture specifications, Next.js 15 App Router, Supabase, Drizzle ORM, Paystack, and security models. |
| **App Flow & Navigation** | [`app-flow.md`](file:///Users/akanbiabdulquddus/Developer/LecternIQ/jambprep/bmad/app-flow.md) | Page-by-page mapping, complete route tree, user journeys, responsive mobile/desktop layouts. |
| **Design Brief** | [`design-brief.md`](file:///Users/akanbiabdulquddus/Developer/LecternIQ/jambprep/bmad/design-brief.md) | Brand identity, Tailwind v4 design tokens, color palette, typography, KaTeX formula styling, and ergonomics. |
| **Backend Schema** | [`backend-schema.md`](file:///Users/akanbiabdulquddus/Developer/LecternIQ/jambprep/bmad/backend-schema.md) | Full Drizzle ORM models, PostgreSQL tables, Supabase RLS policies, Zod validation schemas, and API contracts. |
| **Implementation Plan** | [`implementation-plan.md`](file:///Users/akanbiabdulquddus/Developer/LecternIQ/jambprep/bmad/implementation-plan.md) | 8-phase development roadmap, milestones, testing matrix, and launch acceptance criteria. |

---

## 🎯 Core Product Parameters

* **Market**: Nigerian UTME / JAMB candidates (~1.8M students annually).
* **Launch Subjects (8 Core)**:
  1. Use of English (Compulsory)
  2. Mathematics
  3. Physics
  4. Chemistry
  5. Biology
  6. Economics
  7. Government
  8. Literature in English
* **Authentic Exam Format**: 180 questions (60 English + $3 \times 40$ Electives), 120 minutes countdown, scaled 400-mark scoring, 8-key desktop hotkeys (`A, B, C, D, P, N, S, R`) and mobile question palette.
* **Pricing & Access**:
  * **Free Tier**: 1 full diagnostic mock + 15 topic practice questions daily.
  * **Premium**: **₦1,000 / month** (30-day access pass) via Paystack.
  * **Referral Discount**: "Invite 2 friends, get 50% off your first month" (**₦500** first payment).
* **Stack**: Next.js App Router, Supabase (PostgreSQL, Auth, Storage), Drizzle ORM, Tailwind CSS v4, shadcn/ui, Zustand, KaTeX, Paystack.
* **Environments & Deployment**:
  * **Production**: `https://jambprep.lecterniq.com` (Authoritative production environment, live user database, canonical PWA install origin, production router Worker).
  * **Preview / Staging**: `https://jambprep.pages.dev` (Cloudflare Pages preview deployments and per-commit preview hashes, used for staging verification, dev testing, and QA).


## Mock integrity handoff

Read [Mock exam conditions](mock-exam-conditions.md) for approved behaviour, implementation status, migration requirements and deferred audio work.


## Admin expansion planning — 11 October 2026

User requested planning and then a hold. Read [admin expansion plan](admin-expansion-plan.md), [JAMB syllabus topic research](jamb-syllabus-topic-catalogue.md) and [official-source manifest](jamb-syllabus-sources.json). The plan contains confirmed requirements, proposed defaults and A00–A10 acceptance tasks. All 25 portal PDFs were inspected; complete leaf-topic/editorial mapping remains an explicit implementation gate. No implementation is authorised by these documents.

## Current question mapping — 13 October 2026

Read the question-to-blueprint review section in [student selection plan](student-practice-and-mock-selection-plan.md) and the metadata-only [draft classification manifest](question-blueprint-review-map.json). Mapped candidates are now applied and the four production blueprints are active. Editorial holds remain excluded; see blueprint-activation-release.json for release evidence.

## 885-question draft transition — 16 October 2026

The requested transition of the exact original 885 held-set IDs to draft is planned but not applied. Read [the guarded transition plan](885-question-draft-transition-plan.md) for the production-access prerequisite, backup, selector-readiness dry run, audit/history requirements, and rollback. The 170 records later mapped into active blueprints are included in the requested scope, so impact must be checked before writing.

## Expanded subject blueprint specifications — 14 October 2026

[Subject mock blueprints](subject-mock-blueprints.md) consolidates the four active subject structures and proposes GOV/ECN/CRK/IRS allocations. All eight blueprints are now active. The new-bank repair section records independently verified candidate counts, quarantines, corrected mappings and remaining review work.

## Literature blueprint — 14 October 2026

[Literature-in-English mock specification](literature-mock-blueprint.md) defines40 questions and records the current535-item aggregate inventory. Literature is now active with494 classified candidates and a recovered appreciation group; see the release section for evidence and remaining editorial/device gates.

- [SEO, sharing, recovery and CBT polish](seo-sharing-and-cbt-polish.md) — 15 October release; SMTP/redirect verification remains open.

## Future learning and school partnerships — planning, 17 October 2026

See [future feature plan](future-learning-and-school-partnerships-plan.md) and [phased tasklist](future-learning-and-school-partnerships-tasklist.md) for weekly250 offline practice, mode-specific dashboard/navigation and snapshots, dictionary/five daily words, and school tenant/teacher reporting with upfront bulk access at ₦1,500 per student/month for 1–12 months. This is a future planning request; it does not authorise implementation or overwrite existing individual billing. Open policy decisions are identified in the plan.

## Priority: Premium Schedule — 17 October 2026

User requested a plan and another-agent handoff for Account/My profile Schedule: Premium-only daily study goals, streaks and opt-in PWA study reminders. Read [Schedule plan](study-schedule-and-reminders-plan.md), [implementation tasklist](study-schedule-and-reminders-tasklist.md), and [agent prompt](study-schedule-agent-prompt.md). Architecture is server scheduler + Web Push + existing service worker; no browser timer promise. User confirmed: Pro user study schedule overrides the general 7:00 AM notification reminder.

## Completed: Offline PWA, Study Schedule, UI Shimmers & Mobile CBT Redesign — 21–22 October 2026

The following capabilities have been fully built, verified with 25 unit/integration tests, and deployed to the Cloudflare Pages development server (`https://jambprep.pages.dev`):

1. **Offline PWA & Profile Cache**:
   - `src/lib/offline/offline-profile-cache.ts` provides multi-actor isolated caching of user profile, enrolled subjects, streaks, and subscription validity (`expiresAt > now`) with device clock tamper protection.
   - `BrowserAccountBoundary` enables offline continuation without fatal network crashes.
   - 250-question Weekly Practice packs cached in IndexedDB (`weekly_packs`) with WAT-aligned Monday–Sunday expiry.
   - PWA update prompt / force refresh: uses deterministic `pwa-build.json` hash detection to prompt candidates to instantly reload when a new release is deployed.
2. **Workspace UI & UX Polish**:
   - Replaced full-screen route-switch blocking animations with smooth shimmer skeleton loaders (`WorkspaceLoading`), reserving full-screen animations strictly for cold boots and hard reloads.
   - Fixed mobile top bar horizontal scroll resetting across navigation.
   - Suppressed ugly scrollbars globally across mobile top nav, streak calendar strips, and filter chip rows.
   - Standardized application branding to **`JAMBPrep`** and added **`JAMBPrep by LecternIQ`** to SEO title templates, OpenGraph metadata, and JSON-LD schemas.
3. **Mobile CBT Mock Exam Overhaul**:
   - Saved **>250px of vertical height** on mobile screens by consolidating 5 cluttered, stacked header rows into a sleek single sticky bar (~50px).
   - Converted bulky full-width buttons into compact icon buttons for **Fullscreen** (`Maximize`/`Minimize`) and **Calculator** (`Calculator`).
   - Floating, non-displacing exam calculator overlay with complete touch and keyboard support.
   - Interruption monitoring banner returns `null` (0px) during standard exam-taking, surfacing only if a window/fullscreen blur actually occurs.
   - Responsive question stem cards and choices fitting standard mobile viewports with a compact bottom navigation bar (`Prev`, `Clear`, `Next`).
4. **Dictionary, Five Daily Words & Educational Games (Feature F2)**:
   - Curated high-yield UTME Lexicon (`src/lib/dictionary/utme-lexicon-data.ts`, >528 KB) containing irregular verb conjugations, syllables, stress indices, silent letters, and exam notes.
   - Hybrid lookup service: local UTME bank first, dynamic Free Dictionary API fallback (`src/lib/dictionary/dictionary-service.ts`, `free-dictionary-service.ts`).
   - Deterministic Daily 5 selection using date-based hashing (`DictionaryService.getDailyFive`).
   - Full student dictionary interface (`src/app/dictionary/page.tsx`), bookmarking/saved words, and detailed drawer inspection (`WordInspectorSheet`).
   - 4 interactive educational mini-games: **Stress Master**, **Sound Match**, **Silent Hunter**, and **Synonym Blitz** (`src/app/games/*` and `src/lib/dictionary/game-*.ts`).
   - Study streak integration via `recordStreakActivity` (`src/lib/dictionary/streak-activation.ts`).
   - Verified by unit tests: `tests/dictionary-games.test.mjs` (5 passing tests).
5. **Offline Outbox Synchronization & Durable Answer Reconciliation (Feature F5)**:
   - Unified IndexedDB outbox queue (`sync_outbox`) with automatic answer coalescing and monotonic revision tracking (`src/lib/offline/idb-storage.ts`).
   - Multi-trigger client `SyncManager` (`src/lib/offline/sync-manager.ts`) listening to `online` events, `visibilitychange`, and app boot, guarded by Web Locks against multi-tab race conditions.
   - Idempotent backend batch ingestion with per-item ACKs (`accepted`, `already_recorded`, `invalid_option`, `not_found`) in `worker/services/weekly-pack-service.ts`.
   - UI status indicator (`src/components/sync-status-indicator.tsx`) in the workspace header and weekly practice views showing pending offline counts, syncing animations, and click-to-retry.
   - Verified by unit tests: `tests/offline-outbox-sync.test.mjs` (5 passing tests, 30 suite total).

---

## 🚀 What's Next: Prioritised Roadmap

Based on the [Future Learning and School Partnerships Plan](future-learning-and-school-partnerships-plan.md) and [Product Requirements](product-requirements.md), the immediate candidate capabilities for the next engineering sprints are:

### 1. School Partnerships & Bulk Institutional Licensing (Features F1 & F6)
- **Goal**: Enable secondary schools and tutorial centres to onboard cohorts of candidates.
- **Deliverables**:
  - Prepaid cohort pricing at **₦1,500 / student / month** (1–12 month terms).
  - School admin / teacher portal: roster import (CSV/manual), mock exam assignment, and class-level diagnostic reporting.
  - Multi-tenant data segregation with strict role-based access control.

### 2. Physical Mobile Device Closed-App Push Validation
- **Goal**: Final QA of push notifications across real Android and iOS devices.
- **Deliverables**:
  - Test real Web Push delivery with the PWA completely closed/backgrounded on physical Android (Chrome/PWA) and iOS (Add to Home Screen Web Push).
  - Verify quiet hours and delivery timing against WAT timezone (`Africa/Lagos`).
  - Validate that Pro user study schedules reliably override the general 7:00 AM notification reminder.

### 3. Question Bank Expansion & Syllabus Coverage
- **Goal**: Expand leaf-topic question coverage across all 8 UTME launch subjects.
- **Deliverables**:
  - Transition verified held questions to active blueprints (`885-question-draft-transition-plan.md`).
  - Add remaining literature texts, grammar, and elective question pools.

