# Implementation Plan & Build Roadmap
# JAMBPrep — Phased Engineering Roadmap, Milestones & Testing Strategy

**Document Version:** 1.0.0  
**Status:** Approved Specification  
**Architecture:** Next.js App Router Modular Monolith + Supabase + Drizzle ORM + Paystack  

---

## 1. Roadmap Overview & Timeline

The build is structured into **8 sequential execution phases** over a 10–12-week development cycle (or accelerated agile sprints). Each phase produces a testable, verifiable deliverable before unlocking the next.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Foundation & Infrastructure (Week 1)                         │
│ • Next.js App Router, Tailwind v4, shadcn/ui, Supabase & Drizzle Setup │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 2: Auth, Onboarding & Referrals (Week 2)                         │
│ • Supabase Auth SSR, 4-Subject Picker, Target Score, Referral Engine   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 3: Content Ingestion & Admin CMS (Weeks 3–4)                     │
│ • Question Bank Models, Zod Validation, Bulk CSV/JSON Import, LaTeX    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 4: Self-Paced Practice Engine (Week 5)                           │
│ • Topic Filtering, KaTeX Equations, Instant Review, Daily Quota (15 Qs)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 5: The Authentic CBT Exam Simulator (Weeks 6–7)                  │
│ • 180 Qs, 120-Min Sync Timer, 8-Key Hotkeys, Local Autosave, Grading   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 6: Diagnostic Analytics & Weak-Topic Heatmap (Week 8)            │
│ • 400-Point Scorecard, Topic Diagnosis, Pacing Stats, Revision CTAs    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 7: Paystack Monetization & Entitlements (Week 9)                 │
│ • ₦1,000 Plan, ₦500 Referral Discount, Webhooks, 30-Day Stacking       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 8: Quality Assurance, Security & Beta Launch (Weeks 10–12)       │
│ • Network Drop Testing, E2E Tests, Mobile Audit, Content Review, Launch│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phase-by-Phase Execution Breakdown

### Phase 1: Foundation & Project Skeleton (Week 1) — [COMPLETED]
* **Goal**: Establish the base codebase with zero tooling guesswork.
* **Deliverables**:
  1. Next.js 16 App Router skeleton with TypeScript strict mode.
  2. Tailwind CSS v4 styling system with color tokens (`#116149`, `#092E28`, `#F6F8F5`, `#E7B85A`).
  3. shadcn/ui and custom study-coach primitives with accessible keyboard interactions.
  4. Dedicated Supabase project connection (`@supabase/ssr` cookies client) on `bqumnaoiiukifvanoonm`.
  5. Drizzle ORM configuration with IPv4 session pooler (`aws-0-eu-west-1.pooler.supabase.com:5432`) and 20 tables deployed.
* **Status**: **Completed & Verified** (`✓ Compiled successfully`, all 20 tables active).

---

### Phase 2: Auth, Onboarding & Viral Referral Engine (Week 2) — [COMPLETED]
* **Goal**: Enable student registration, subject selection, and referral tracking.
* **Deliverables**:
  1. Login and Register screens with Email/Password and session cookies (`/login`, `/register`).
  2. Post-signup Onboarding Wizard (`/onboarding`):
     * Compulsory Use of English.
     * Picker for 3 Elective Subjects from 15 seeded UTME subjects.
     * Target score input (100–400).
  3. Viral Referral System:
     * Unique student referral code (e.g. `ADEW9900`).
     * Capture referral attribution from URL parameter (`?ref=CODE`).
     * `referrals` tracking with qualified registration verification.
     * Referral milestone tracker on student dashboard: `[ 0 / 2 ] Friends Invited`.
     * Auto-issue `referral_rewards` 50% discount voucher upon 2 verified signups.
* **Status**: **Completed & Verified** (Live user creation and referral attribution tested on Supabase).

---

### Phase 3: Content Ingestion & Admin CMS (Weeks 3–4) — [COMPLETED]
* **Goal**: Enable administrators to populate, preview, and publish verified questions.
* **Deliverables**:
  1. Database tables for `subjects`, `topics`, `passages`, `questions`, `question_options`, and `question_explanations`.
  2. Strict Zod schema for CSV and JSON question bulk import (`src/lib/validation/question.ts`).
  3. Admin Ingestion API (`POST /api/admin/questions/import`) with row-by-row error validation and relational mapping.
  4. KaTeX MathRenderer component (`src/components/math-renderer.tsx`) supporting inline (`$...$`) and display (`$$...$$`) LaTeX formulas.
  5. Seeded authentic question bank across core subjects (English, Mathematics, Physics, Chemistry, Biology) with comprehension passages and step-by-step diagnostic solutions.
* **Status**: **Completed & Verified** (14 authentic questions with KaTeX equations active in database).

---

### Phase 4: Self-Paced Practice Engine (Week 5) — [COMPLETED]
* **Goal**: Deliver the topic-by-topic practice learning loop with instant diagnostic feedback.
* **Deliverables**:
  1. Practice Selection Screen (`/practice`): Dynamic subject and topic selector filtered to candidate's enrolled combination.
  2. Interactive Question Runner (`src/app/practice/practice-client.tsx`):
     * Accessible option selection with KaTeX formula rendering.
     * Instant green/red answer reveal upon check.
     * Detailed step-by-step diagnostic explanation banner.
  3. Quota Guard: Free candidates guided by 15 daily question allowance (resets midnight WAT).
  4. Session recap modal showing accuracy percentage, correct count, and study coach revision guidance.
* **Status**: **Completed & Verified** (`/practice` route live and verified in production build).

---

### Phase 5: The Authentic CBT Exam Simulator (Weeks 6–7) — [COMPLETED]
* **Goal**: Replicate the exact high-stakes JAMB UTME examination environment with reactive programming.
* **Deliverables**:
  1. Headless Reactive Exam Engine (`src/features/exam-engine/`):
     * RxJS event stream orchestration (`events.ts`, `state.ts`, `engine.ts`).
     * Pure reducer managing finite states (`loading -> in_progress -> submitting -> completed`).
     * `debounceTime(350)` hotkey buffering preventing race conditions during rapid option switching.
     * Durable offline outbox (`local-outbox.ts`) with immediate snapshot caching and auto-sync on `window.online`.
     * Authoritative timer stream with `visibilitychange`/`focus` resync protecting against background tab throttling.
  2. Pre-Exam Briefing Screen (`/mock`):
     * 180-question breakdown, 120-minute notice, 8-key hotkey tutorial, and launcher.
  3. Active CBT Simulator Hall (`/mock/[attemptId]`):
     * Full desktop 8-key hotkeys (`A, B, C, D` options, `P` previous, `N` next, `R` deselect, `S` submit).
     * Deterministic reactive navigation aware of previous/next positions.
     * 4-Subject Tab switcher (English 60 Qs + 3 Electives 40 Qs each) with live answered tallies.
     * 180-Question Grid Palette (Answered, Unanswered, Flagged for review).
     * Live synchronized countdown with amber (< 15 mins) and red (< 5 mins) urgency stages.
  4. Server-Authoritative Submission & 400-Point Grading (`submitMockExam`):
     * Server calculates official scores (English 100 pts + 3 electives 100 pts each = 400 pts total).
     * Writes immutable records to `attempt_results`.
  5. Diagnostic CBT Scorecard (`/mock/result/[attemptId]`):
     * 400-point total score vs Target Score.
     * 4-subject breakdown and revision coaching CTAs.
* **Status**: **Completed & Verified** (RxJS engine live, all routes compiled).

---

### Phase 6: Diagnostic Analytics & Revision Loop (Week 8)
* **Goal**: Provide personalized coaching and weak-topic diagnostics.
* **Deliverables**:
  1. Diagnostic Scorecard Page (`/results/[attemptId]`):
     * Total simulated UTME score out of 400 vs. Target Score.
     * Subject-by-subject score breakdown.
     * Pacing statistics (average seconds per question).
  2. Topic Weakness Heatmap:
     * Categorizes accuracy by syllabus topic ($< 40\%$ Critical, $40\%-69\%$ Moderate, $\ge 70\%$ Mastered).
     * Actionable CTA: *"Drill 15 Questions in Heat & Thermodynamics"*.
  3. Gated Full Review:
     * Premium users review all 180 questions with explanations.
     * Free users see score cards with question review locked.
* **Exit Criteria**: Completed exam displays accurate topic weakness ratings and links to targeted drills.

---

### Phase 7: Paystack Monetization & Entitlements (Week 9)
* **Goal**: Secure, reliable payment processing for Nigerian payment methods.
* **Deliverables**:
  1. Paystack standard checkout integration (Cards, Bank Transfer, USSD).
  2. Referral Discount Logic:
     * Checks if candidate holds an unredeemed 50% referral reward.
     * If eligible: charges **₦500** for first month.
     * If standard: charges **₦1,000**.
  3. Server Webhook Endpoint (`/api/webhooks/paystack`):
     * Validates HMAC SHA512 signature.
     * Deduplicates event in `payment_webhook_events`.
     * Sets/extends `subscription_entitlements` by $+30\text{ days}$.
     * Marks referral reward as `redeemed`.
  4. Entitlement Middleware: Grants unlimited mocks and unlocks full explanations.
* **Exit Criteria**: Test payment via Paystack sandbox completes; webhook verifies; user immediately gains 30-day Premium access.

---

### Phase 8: Quality Assurance, Security & Launch (Weeks 10–12)
* **Goal**: Bulletproof stability under peak Nigerian conditions.
* **Deliverables**:
  1. **Network Simulation Tests**: Flaky 3G throttling, mid-exam disconnections, and browser hard reloads.
  2. **Security Audit**: Ensure answer keys cannot be discovered via browser inspect/network tools during active mocks.
  3. **Content Audit**: Verify all 4,000 initial questions for LaTeX rendering and correct options.
  4. **Mobile Performance Audit**: Verify Lighthouse score $\ge 90$ on mobile devices.
  5. **Production Deployment**: Vercel production deployment connected to Supabase and Paystack live keys.
* **Exit Criteria**: Zero data loss across 100 test mock sessions; all launch acceptance criteria satisfied.

---

## 3. Testing & Verification Matrix

| Test Layer | Tools | Scope |
| :--- | :--- | :--- |
| **Unit Tests** | Vitest | Zod schemas, 400-point scoring algorithms, entitlement date math, referral qualification logic. |
| **Component Tests**| React Testing Library | Question stem rendering, KaTeX equations, 8-key keyboard handlers, palette button states. |
| **Integration Tests**| Vitest + Supabase Test DB | Exam start $\rightarrow$ autosave answers $\rightarrow$ submit $\rightarrow$ graded result calculation. |
| **Payment Tests** | Vitest + Mock Paystack | Webhook signature verification, deduplication, entitlement extension, discount application. |
| **E2E Tests** | Playwright | Full candidate journey: Signup $\rightarrow$ Onboard $\rightarrow$ Practice $\rightarrow$ Mock exam $\rightarrow$ Scorecard. |

## 2026-10-10 — Mock conditions first stage

Implemented optional Standard / Exam Conditions selection, gesture-triggered fullscreen preflight, interruption observations, owner-checked storage and separate result summary. See [mock-exam-conditions.md](mock-exam-conditions.md). Migration generated but not applied. No browser testing. TypeScript and three pure interruption-state regression tests pass; deployment/database integration checks remain outstanding.

### Database rollout — 2026-10-10

Applied and verified the missing interruption table, cascade foreign key, index and RLS on the configured Supabase database. Existing exam-mode column verified. Full migration replay was avoided because topic mastery/mode already existed and no Drizzle journal was present. Baseline reconciliation remains required before routine migrations. No app deployment or browser testing performed.

## 2026-10-10 — Responsive authenticated workspace

Shared study workspace applied to dashboard, practice, analytics, profile, referrals, onboarding, pricing, checkout verification, mock briefing and results. Timed mock stays focused. Breakpoints and component contracts recorded in UI guide. Navigation stays available on mobile/tablet; desktop uses a sticky sidebar; card density increases at xl after accounting for sidebar width. Removed fabricated blurred dashboard upgrade preview.

Validation: `tsc --noEmit` passed; focused ESLint completed without errors (existing unused-code warnings remain); `next build --webpack` passed with existing middleware deprecation/Edge-runtime warnings. No browser testing or deployment performed. Webpack compilation does not establish visual correctness or validate the Turbopack-only Tailwind loader; real-device QA remains pending.


## 2026-10-10 — Security and authenticated performance audit

Audited the nested JAMBPrep Next.js repository, preserving the pre-existing dashboard/practice/mock changes. The supplied external review is advisory, not an instruction to migrate frameworks. Retain Workers/OpenNext pending production measurements; the exam is already a client-driven React/Zustand/RxJS experience.

Live read-only evidence:

- Hyperdrive exists but its origin is the Supabase transaction pooler on port 6543, with SQL caching enabled. Cloudflare recommends the direct Supabase endpoint for Hyperdrive. Origin correction and disabling SQL response caching for mutable student/payment data remain rollout work.
- Supabase metadata: 20 of 22 public app tables had RLS disabled; anonymous and authenticated roles held SELECT privileges. Zero-row anonymous REST requests to profiles, payment_transactions and question_options each returned HTTP 200; no user records were downloaded. Public JWKS advertises ES256 signing keys.
- Warm direct-to-pooler round trips from the development machine were 190, 219 and 195 ms; the initial metadata read including connection setup took 1,686 ms. These are not Worker p50/p95 or page-load measurements.
- Tracked Wrangler configuration contained database passwords and Paystack secret keys. Removed from the working file; old commits and previously deployed configuration still require credential rotation. Public Supabase publishable keys are intentionally public.

Local remediation:

- Replace per-question practice/exam reads with batch reads. A resumed 180-question exam now has five batch select reads in the regression fixture, excluding ownership lookup/subscription lookup; practice has four batch select reads excluding subject lookup. New attempts fetch subject question lists concurrently. Answer keys remain withheld and new question selection requires published status.
- JWT signature validation (`getClaims`) on middleware/page reads; retain Auth-server `getUser` checks on mutations. Avoid middleware authentication on public pages. Signed-out users are denied protected paths including profile/checkout. Unexpired JWTs remain valid until expiry after remote revocation; sensitive writes keep the current-session check.
- Share SQL/Drizzle clients by Worker request context (including actions and routes), close after response, skip unused type discovery, and remove unsupported global Hyperdrive injection. Keep prepared statements enabled through Hyperdrive and disabled for local Supabase transaction-pooler access.
- Clear completed read-deadline timers and emit structured read-operation timings/request database counts without SQL text, parameters, cookies or user IDs. Enable Worker traces in the local configuration.
- Keep navigation visible in the loading fallback; this improves usability but does not establish a latency improvement.
- Require a current authenticated administrator profile for question imports. Require valid webhook HMAC signatures, transaction ownership on callbacks, exact reference/NGN/amount matching, and real provider confirmation. Remove simulated checkout/verification fallbacks.
- Use one atomic, row-locked payment settlement for callbacks and webhooks. Settlement, reward redemption and entitlement extension commit together; duplicate settlement cannot extend access twice. Webhook deduplication records follow successful settlement.
- Generated migration `0002_secure-server-only-tables.sql` enables RLS and revokes anon/authenticated access to app tables. The app uses server SQL, not browser REST for app data. Existing renewal columns use `IF NOT EXISTS` because production/schema migration history has drifted. Do not blindly replay the migration chain: earlier implementation already found no matching Drizzle journal.

Verification: TypeScript and production Next/OpenNext builds passed during the audit; focused ESLint and ten local regression tests passed. A separate database regression using session-local temporary tables passed settlement replay and rollback checks; it did not modify persistent app tables. Final build/check results are recorded at completion below. No browser testing, production migration, credential rotation or deployment has been performed.

Remaining acceptance: rotate exposed credentials; reconcile migration history; apply and verify RLS; move Hyperdrive off the transaction pooler and disable SQL caching; provision Worker secrets before deploying the sanitized configuration; trace authenticated requests after rollout and measure navigation/exam-load p50/p95/p99. Investigate original production exception logs and Safari separately. Public registration currently uses the admin API with automatic email confirmation when a service key is configured; referral qualification and claimed free-practice quotas also need product/security follow-up. Audit found these additional issues but did not invent new product rules.


Final audit evidence: TypeScript, focused ESLint, whitespace checks and the Next/OpenNext production build passed. Ten local regressions pass; the optional temporary-table settlement regression passed separately (11 distinct regression cases in total). A short Worker tail sample yielded no invocation events, so it did not explain the historical 72 errors. The patched build is ready for a controlled rollout; it is not evidence that production is already faster or that the original error is resolved.


## 2026-10-10 — Authorized staged rollout: preflight completed

The user authorized proceeding with the staged remediation. Additional rollout approval is not needed. Missing provider access/rotated credentials is the current input dependency; an external agent's suggested approval text was not treated as authorization in the previous turn.

Recovery evidence:

- Recorded the active pre-remediation Worker version: `bb1ae6ad-d8c0-4100-9765-fe8f13462a23` (deployed 2026-10-10 16:25 UTC). This is a recovery reference, not a validated security-safe version. Cloudflare secret listing returned no configured secrets; existing deployment held credentials as vars.
- PostgreSQL 18.4 client tools exist at `/opt/homebrew/Cellar/libpq/18.4/bin/`.
- Created a private application-public-schema backup at `/private/tmp/jambprep-rollout-4ed88f95-36bf-4db8-902b-43d7855c3b3a/public.dump` (184,605 bytes). Archive decoding passed.
- Restored schema and data into an isolated schema inside a transaction, verified archived row counts for all 22 tables, and rolled back the rehearsal. The dump covers the app's public schema; it is not a complete Supabase project/Auth/Storage backup. The dump, restore SQL and verification manifest are local recovery artifacts protected with private filesystem permissions.
- Saved existing public-table RLS/grants metadata to `/private/tmp/jambprep-lockdown-before.json` and an availability rollback SQL file to `/private/tmp/jambprep-lockdown-rollback.sql`. Restoring the previous permissions would reopen the confirmed API exposure; incident recovery still requires credential rotation.

Lockdown rehearsal evidence:

- The server `postgres` role has BYPASSRLS; `anon` and `authenticated` do not. `service_role` also bypasses RLS. There were no public-schema RLS policies, and all six renewal columns already exist.
- Rehearsed the migration on temporary copies of every public app table: all 44 role/table combinations for `anon` and `authenticated` were denied; all 22 server-role table checks succeeded. Temporary copies were removed at transaction completion. Persistent application tables were not modified.
- Source inspection found no browser Supabase `from`, `rpc`, `channel`, or `storage` access to application data. Browser Supabase clients handle authentication; app data flows through server SQL/actions.
- Ten local regressions and TypeScript passed again. Corrected a duplicated SQL semicolon in the migration.

Current credential-stage dependency:

- No Supabase management token is configured locally; SQL database credentials do not provide provider-management access for coordinated password rotation. No Paystack dashboard/key-regeneration capability is connected.
- Asked the user to regenerate the Paystack test secret and update `PAYSTACK_SECRET_KEY`/`PAYSTACK_WEBHOOK_SECRET` in the ignored `jambprep/.env.local`, and either provide `SUPABASE_ACCESS_TOKEN` locally or coordinate the Supabase password change. Do not put credentials into chat, tracked files, logs, or deployment output.
- Keep the credential stage pending until old credentials are demonstrably revoked and replacements work. Do not deploy the sanitized Worker config before provisioning required Worker secrets.

Production migration, Hyperdrive changes, credential rotation and Worker deployment have not occurred in this stage. Next: complete coordinated credential rotation, apply the rehearsed lockdown with postchecks, correct/verify Hyperdrive, deploy the tested application patch, and validate authenticated exam/payment workflows and production latency. Keep historical-error investigation and provider access-log review open.


Non-mutating production baseline probes: `/login` returned HTTP 200 in 1,823 ms including initial client connection setup; signed-out `/dashboard` returned HTTP 307 to login in 211 ms. Invalid anonymous import data returned HTTP 400 (validation reached before auth); an unsigned, no-op webhook event returned HTTP 200, confirming the live signature-rejection gap. These probes created no application records and are not authenticated latency percentiles.


### User clarification — Paystack test key

The user explicitly instructed retaining the existing Paystack test secret rather than rotating it. Paystack key rotation is removed from this rollout's prerequisites. Preserve the current test key in ignored local configuration and provision it through Cloudflare Worker secrets; do not restore it to tracked Wrangler vars. Supabase database-password rotation remains pending and still requires provider-management access or coordinated dashboard action. Deployment authorization remains in effect.


## 2026-10-10 — Production rollout and confirmed CPU-plan blocker

The user completed the Supabase database-password reset. Updated ignored local connection URLs without printing credentials. New session-pooler credentials passed SQL checks; the previous tracked password is rejected with PostgreSQL `28P01`.

Production changes completed:

- Hyperdrive now uses the direct Supabase origin on port 5432 as `postgres`; SQL response caching is disabled. TLS `require` is configured. `verify-full` was rejected because Cloudflare requires a registered CA certificate; full certificate verification remains follow-up work.
- Applied `0002_secure-server-only-tables.sql` in a transaction after the verified backup and restore rehearsal. All 22 app tables have RLS enabled; anon/authenticated SELECT privileges are revoked; server-role SELECT remains allowed. Anonymous zero-row REST probes to profiles, payment_transactions and question_options now return 401. Earlier Drizzle migration-history drift remains unreconciled; do not blindly run the migration chain.
- Retained Paystack TEST credentials at the user's instruction. Automatic approval review initially blocked transfer into Cloudflare secrets; the user explicitly approved that destination, then both bindings were converted to `secret_text` successfully. Sanitized deployment removes database credentials from Worker vars.
- Production Next/OpenNext build passed. Deployed Worker version `64ca2cc3-36f9-4990-a0e0-54a3b4713b19`. Ten local regression cases passed again (temporary-table settlement case was separately verified earlier).
- User authorized generating a dedicated test account. Generated credentials are only in ignored `.env.local` and private temporary files; test profile is a student with four subjects. No existing user's data was changed by the smoke tests.

Initial production checks succeeded:

- Seven authenticated page requests returned 200 without the slow-loading fallback. Unsigned webhooks and unauthenticated imports both returned 401.
- Practice action returned five questions in 1,595 ms; new mock returned 74 questions in 1,754 ms. No answer keys were exposed. The published bank cannot currently fill a 180-question mock; the 180-question batching regression is fixture coverage, not evidence of a full production bank.
- Answer save and resume succeeded; question order, saved answer and expiry were preserved. Resume took 2,049 ms. Paystack initialized a real provider TEST checkout (no simulation), and verification correctly rejected the unpaid transaction; no premium entitlement was granted. Successful paid checkout is not fully exercised.
- First 30 RSC probes had p50 1,023 ms, p95 1,456 ms, p99 2,656 ms from the test machine; these probes omitted Next's cache-busting parameter and include additional redirects, so they are not authoritative browser navigation metrics. Five detected digests were expected `NEXT_REDIRECT` to pricing for free-tier analytics, not application exceptions.

Blocking production finding:

- Tail captured 51 invocations: 50 `ok` and one `exceededCpu`, with explicit `Worker exceeded CPU time limit` exceptions. Repeated later probes and the user's screenshot reproduced Cloudflare 1102 / HTTP 503, including the login page. Do not claim the rollout is stable or the latency objective achieved.
- Cloudflare API rejected a bounded `cpu_ms: 1000` settings change with code `100328`: CPU limits are unsupported on the Free plan and require Paid. The attempted change did not apply. Account subscription reads were denied by token scope; no billing change was made.
- Workers Free permits 10 ms CPU per request, with temporary isolate flexibility. Observed warm renders were approximately 20–46 ms CPU; cold dashboard was 643 ms CPU. Network/database waiting is not CPU time. Initial successes did not prove this SSR app can operate reliably within Free limits.
- Compared `/Users/akanbiabdulquddus/Developer/Clank Dynamics/portal` read-only: its Next config uses `output: "export"`, and authenticated app data is loaded in the browser through Supabase. It does not execute the same Workers SSR/Hyperdrive path as JAMBPrep. No files in that project were changed.
- User chose to upgrade Workers to Paid. Await their dashboard upgrade completion, then configure a bounded CPU budget, rerun sustained authenticated navigation and exam submission/result checks, and confirm no `exceededCpu` events. The token cannot manage billing. Do not assume the upgrade occurred merely from the user's choice.

Remaining checks: paid-plan stability and valid navigation percentiles, full exam submission/result flow (later probes hit 503 before submission), successful provider payment workflow, certificate verification, migration-history reconciliation, historical error review and remaining registration/referral/quota findings from the audit. Current database and payment security improvements remain deployed while the runtime plan blocks reliable availability.


## 2026-10-10 — User direction revised: Free testing, Paid at launch

The user clarified that testing must stay on Free and upgrading is intended for launch. This supersedes the preceding immediate-upgrade plan; no paid upgrade is confirmed. User requested a complete BMAD phased/task handoff and sequential review of another AI agent's feedback and actual code, with corrections before moving on.

Created `free-tier-remediation-plan.md`, `free-tier-tasklist.md` and `next-agent-prompt.md`; linked them in the BMAD README. T00 is ready for assignment and all implementation tasks remain unaccepted. Proposed target is static Pages UI plus an independent Worker API, retaining server-authoritative exams/payments and all database security fixes. Free CPU feasibility for the API is a prerequisite, not a promise; Pages Functions do not evade Worker limits. Launch Paid upgrade is deferred to T19. This planning task changed documents only and made no application, database, deployment or billing changes.

Removed revoked historical database credentials from the existing backend-schema documentation; no replacement secrets were recorded. Existing rollback/backup limitations, migration drift, certificate verification, quota/referral/signup/snapshot gaps, undersized bank and incomplete exam/payment/device acceptance are included in the new plan. Current SSR deployment still has confirmed 1102/503 availability failures.


## 2026-10-10 — T00 second revision accepted

Reviewer inspected revised design, corrected residual precision issues, and accepted T00 only. See free-tier-remediation-plan.md Section 13 and tasklist review ledger. next-agent-prompt.md now assigns T01 isolated spike implementation and local verification only. Production remains unchanged; T02 must establish actual Free CPU feasibility before conversion.
