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

### Phase 5: The Authentic CBT Exam Simulator (Weeks 6–7)
* **Goal**: Replicate the exact high-stakes JAMB UTME examination environment.
* **Deliverables**:
  1. Pre-Exam Briefing Screen (`/mock/instructions`).
  2. Exam Initialization (`POST /api/exam/start`):
     * Freezes 180 questions (60 English + $3 \times 40$ Electives) in `attempt_questions`.
     * Sets authoritative `expires_at = now() + 120 minutes`.
     * Strips all answer keys from the client payload.
  3. Active CBT Interface (`/mock/[attemptId]`):
     * Focused distraction-free screen (navigation hidden).
     * Subject tabs switcher (English, Elective 1, Elective 2, Elective 3).
     * Desktop 8-key hotkey listener (`A, B, C, D, P, N, S, R`).
     * Mobile bottom sheet question palette (1–40 grid).
     * Live synchronized countdown timer.
  4. Resilience Engine:
     * Instant `localStorage` state mirror on every click.
     * Debounced background sync to `/api/exam/answers`.
  5. Server-Authoritative Submission & Grading (`POST /api/exam/submit`):
     * Auto-finalizes when timer hits 00:00.
     * Computes raw scores and scaled scores out of 400.
* **Exit Criteria**: Simulated network disconnect does not lose answers; page reload resumes with correct time remaining; answers grade accurately.

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
