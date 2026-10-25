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
| **Course Combination Finder Plan** | [`course-combination-finder-plan.md`](file:///Users/akanbiabdulquddus/Developer/LecternIQ/jambprep/bmad/course-combination-finder-plan.md) | JAMB IBASS course-to-subject combination lookup (300+ courses), 10-second landing prompt, `/combinations` SEO route, and `/register` ↔ `/onboarding` round-trip funnel. |
| **Course Combination Tasklist** | [`course-combination-finder-tasklist.md`](file:///Users/akanbiabdulquddus/Developer/LecternIQ/jambprep/bmad/course-combination-finder-tasklist.md) | Detailed task breakdown (`C00`–`C07`), acceptance criteria, and automated test verification. |
| **Course Combination Agent Prompt** | [`course-combination-agent-prompt.md`](file:///Users/akanbiabdulquddus/Developer/LecternIQ/jambprep/bmad/course-combination-agent-prompt.md) | Handoff prompt for web-researching 300+ official JAMB IBASS courses and executing `C00`–`C07`. |

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
  * **B2B School Cohort Licensing**: **₦1,500 / student / month** (150,000 integer kobo). Term: 1 to 12 calendar months ($N \ge 1, 1 \le M \le 12$). Non-recurring, one-time prepaid invoice. Benchmark: 50 students × 3 months = ₦225,000. Interactive calculator and application route at `/schools`.
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

## Priority: Course → Subject Combination Finder & Registration Funnel — 24 October 2026

User requested a feature allowing prospective and registering UTME candidates to type in their course, view their official JAMB 4-subject combination (Compulsory Use of English + Core Electives + Flexible Elective Slot picker + Recommended Target Score), lock in their course, and flow directly through registration (`/register`) and subject setup (`/onboarding`). Read [`course-combination-finder-plan.md`](file:///Users/akanbiabdulquddus/Developer/LecternIQ/jambprep/bmad/course-combination-finder-plan.md) and [`course-combination-finder-tasklist.md`](file:///Users/akanbiabdulquddus/Developer/LecternIQ/jambprep/bmad/course-combination-finder-tasklist.md) for the complete specification (`C00`–`C07`), including the 10-second landing page smart dialog, inline `#subjects` search hook, public `/combinations` SEO route, and `/onboarding` ↔ `/combinations?from=onboarding` round-trip state coordinator.

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

120: 
121: 6. **Offline Mode Network Sensitivity & Flapping Elimination — 22 October 2026**:
122:    - **Eliminated Hair-Trigger Dropouts**: Replaced single fetch abort triggers with consecutive-failure threshold (2 consecutive failures within 15 seconds) plus non-blocking background heartbeat probe (`probeConnection()`) before switching global state in `src/lib/offline/network-state.ts`.
123:    - **Relaxed Mobile Read Timeout**: Increased default read query budget in `src/lib/api/native-client.ts` from 4,000ms to 8,000ms, accommodating Nigerian cellular network latency and edge cold starts without aborting legitimate requests.
124:    - **Preserved In-Memory Rendered Screens**: Guarded `dashboard/page.tsx`, `practice/page.tsx`, and `profile/page.tsx` with `(!resource.data)` checks so already-loaded dashboards and catalogues remain completely visible during momentary network drops rather than being torn down.
125:    - **Debounced Network Toast**: Added a 1.5s delay to `src/components/network-status-toast.tsx` to completely absorb micro-stalls and prevent toast flickering.
126: 
127: 7. **PWA Infinite Update Reload Loop Resolution — 22 October 2026**:
128:    - **Persistent Update Suppression**: Added `isUpdateSuppressed()` in `src/components/pwa-provider.tsx` checking `jambprep_last_updated_at` (10-minute cooldown) and `jambprep_update_session_dismissed` to ensure clicking "Update & Reload Now" or "X" never re-triggers the update modal on page reloads or tab focus.
129:    - **Graceful Service Worker Activation with Clean Fallback**: Replaced premature 400ms force-reloads with active `controllerchange` listening, backed by a 1500ms safety timeout that unregisters stubborn waiting workers before reloading to guarantee a fresh, loop-free session.
130:    - **Production Deployment & Preview Purge**: Deployed latest build to production `https://jambprep.lecterniq.com` and purged 47 stale Cloudflare Pages preview environments.
131: 
132: ---
133: 
134: ## 🚀 What's Next: Prioritised Roadmap
135: 
136: Based on the [Future Learning and School Partnerships Plan](future-learning-and-school-partnerships-plan.md) and [Product Requirements](product-requirements.md), the immediate candidate capabilities for the next engineering sprints are:
137: 
138: ### 1. School Partnerships & Bulk Institutional Licensing (Features F1 & F6)
139: - **Goal**: Enable secondary schools and tutorial centres to onboard cohorts of candidates with unified billing.
140: - **Deliverables**:
141:   - School quote generator and prepaid checkout at **₦1,500 / student / month** (1–12 month terms).
142:   - School admin & teacher portal: bulk student CSV import, class assignment, and diagnostic reporting.
143:   - Strict multi-tenant data isolation with role-based access control.
144: 
145: ### 2. Teacher Diagnostic Dashboard & Teaching Priorities (Feature F7)
146: - **Goal**: Give teachers actionable diagnostic insights into their students' strengths and weaknesses.
147: - **Deliverables**:
148:   - Class-level performance matrices broken down by UTME subjects and leaf syllabus topics.
149:   - Identified weak areas to prioritize during physical classroom revision.
150: 
151: ### 3. Physical Mobile Device Push Notification QA
152: - **Goal**: Final physical device validation of Web Push reminders.
153: - **Deliverables**:
154:   - Test real Web Push delivery with the PWA completely closed/backgrounded on physical Android and iOS devices.
155:   - Verify Pro study schedule overrides the general 7:00 AM daily notification.
156: 
157: ### 4. Question Bank Expansion (885 Draft Transition)
158: - **Goal**: Expand leaf-topic question coverage across all 8 launch subjects.
159: - **Deliverables**:
160:   - Execute the guarded transition of verified held questions to active blueprints (`885-question-draft-transition-plan.md`).

