# Product Requirements Document (PRD)
# JAMBPrep — UTME CBT Simulation & Performance Coaching Platform

**Document Version:** 1.0.0  
**Status:** Approved Specification  
**Product Name:** JAMBPrep  
**Primary Market:** Nigeria (UTME / JAMB Candidates)  

---

## 1. Product Vision & Value Proposition

### 1.1 The Core Opportunity
Every year, over 1.8 million Nigerian students sit for the Unified Tertiary Matriculation Examination (UTME) conducted by the Joint Admissions and Matriculation Board (JAMB). Over 70% fail to achieve the 200+ benchmark required for competitive tertiary admissions. 

Existing preparation solutions are either static PDF past questions or clunky, ad-cluttered desktop test engines. **JAMBPrep** combines three core pillars into a mobile-first, high-performance web experience:
1. **Practice**: Students learn syllabus-aligned topics, answer questions, and immediately understand *why* options are correct or incorrect.
2. **Simulation**: Students experience the exact JAMB CBT examination environment—official timing, 8-key desktop navigation, subject combination switching, and scaled 400-mark scoring.
3. **Personalized Coaching**: The platform diagnoses weak topics, measures preparation velocity, and tells students exactly what to study next.

---

## 2. Target Personas & Use Cases

| Persona | Description | Needs & Motivations | Pain Points |
| :--- | :--- | :--- | :--- |
| **First-Time Candidate** | 15–18-year-old secondary school leaver. | Needs to master CBT navigation and build exam timing stamina. | Anxious about the computer interface and losing time on lengthy passages. |
| **Remedial / Repeat Candidate** | Candidate retaking UTME to meet competitive cut-offs (e.g., Medicine, Law). | Needs targeted diagnostic data to fix specific weak topics without re-reading entire textbooks. | Wasting time practicing topics they already know while failing recurring traps. |
| **Parent / Sponsor** | Paying for candidate access. | Wants clear evidence of score improvement before the official exam. | Hesitant to spend money on unproven software or bulky CD-ROM packages. |
| **Platform Administrator** | Content lead / educator. | Needs streamlined bulk import, formula rendering, and question verification. | Difficult CMS workflows for math equations, comprehension passages, and diagrams. |

---

## Confirmed access clarification — 10 October 2026

All practice questions, papers, diagnostic mocks and exams require account creation and an authenticated session, including free sessions. Anonymous visitors may explore marketing and static product illustrations only. No public playable question demo is permitted. Enforce this rule server-side when learning endpoints are implemented.

## 3. Product Scope & Phasing

### 3.1 MVP (Version 1.0 — Current Build Scope)
* **Student Accounts**: Supabase Auth (Email/Password, Google OAuth), profile settings, subject combination lock.
* **Top 8 Core Subjects**:
  1. Use of English (Compulsory for all candidates)
  2. Mathematics
  3. Physics
  4. Chemistry
  5. Biology
  6. Economics
  7. Government
  8. Literature in English
* **Topic-Based Practice Engine**: Self-paced practice with instant answer reveal, KaTeX mathematical formulas, and reviewed step-by-step explanations.
* **Authentic CBT Simulation**:
  * 180 questions across 4 subjects (60 English + 3 electives $\times$ 40).
  * Authoritative 120-minute server-synced countdown timer.
  * Desktop 8-key navigation (`A, B, C, D, P, N, S, R`) and mobile-responsive bottom sheet question palette.
  * Local state autosave and network drop resilience.
* **Diagnostic Scoring & Analytics**:
  * Simulated UTME score out of 400.
  * Subject score breakdown and topic weakness heatmap.
  * Time management pacing stats (seconds per question).
* **Freemium & Payment Integration**:
  * 1 free diagnostic mock exam + 15 daily practice questions.
  * ₦1,000 monthly access pass (30 days) via Paystack (Cards, Bank Transfer, USSD).
  * Webhook idempotency and stackable 30-day entitlements.
* **Admin Content Management**:
  * Bulk question import via validated CSV/JSON.
  * Markdown + LaTeX preview.
  * Draft, review, and publish lifecycle.

### 3.2 V1.1 (Post-MVP Engagement)
* Daily practice challenges, study streaks, and WhatsApp score-card sharing.
* Low-bandwidth installable Progressive Web App (PWA) with full IndexedDB asset pre-caching.
* Bookmarked questions and custom revision collections.

### 3.3 V2.0 (Competitive Expansion)
* AI-powered Socratic hints and step-by-step math breakdowns.
* Tutor and CBT-center bulk licensing and student progress monitors.
* Expansion into WAEC, NECO, and Post-UTME question tracks.

---

## 4. Feature-by-Feature Requirements

### Feature 1: Student Onboarding & Subject Selection
* **Requirement**: Candidates must choose their exact 4-subject UTME combination upon registration.
* **Rules**:
  * Use of English is permanently locked as Subject 1.
  * Candidate selects exactly 3 distinct elective subjects from the remaining 7.
  * Candidate sets a Target Score (100–400, default suggestion: 250).
  * Preferences are stored in `student_preferences` and modifiable in `/settings`.

### Feature 2: Topic Practice Mode (Self-Paced Learning)
* **Requirement**: Interactive practice by subject and syllabus topic.
* **Rules**:
  * Filter questions by Subject $\rightarrow$ Topic $\rightarrow$ Difficulty (Easy, Medium, Hard).
  * Options A, B, C, D selectable via click/touch.
  * Immediate feedback: green/red indicator with accessible icon labels.
  * Explanation panel displays reviewed solution, references, and KaTeX equations.
  * Quota Enforcement: Free users receive 15 questions per calendar day (resets 00:00 WAT). Subscribed users receive unlimited questions.

### Feature 3: Authentic CBT Exam Simulator
* **Requirement**: Realistic replication of the official JAMB UTME testing environment.
* **Rules**:
  * **Composition**: 60 Use of English + 40 Subject 2 + 40 Subject 3 + 40 Subject 4 = 180 total questions.
  * **Timing**: Exactly 120 minutes (2 hours). The server sets `started_at` and `expires_at`.
  * **Navigation**:
    * Tab bar for switching between the 4 subjects at any time.
    * Question grid palette displaying answered, unanswered, and flagged questions.
    * Desktop hotkeys: `A`, `B`, `C`, `D` (pick option), `P` (previous), `N` (next), `S` (submit modal), `R` (reverse/flag toggle).
    * Mobile: Sticky bottom bar with Prev/Next buttons, Flag button, and Slide-up Drawer for the Question Grid.
  * **Frozen Attempt**: The question IDs, option orders, and snapshot version are locked upon attempt creation. Answer keys are strictly withheld from client network payloads.
  * **Autosave**: Every answer change is committed immediately to client state (`localStorage`) and synced asynchronously to the server via debounced mutation.
  * **Auto-Submission**: When the server timer expires ($\text{now()} \ge \text{expires\_at}$), the attempt is locked and submitted automatically.

### Feature 4: Results & Diagnostic Analytics
* **Requirement**: Comprehensive post-exam score report and diagnostic coaching.
* **Rules**:
  * **Score Computation**:
    $$\text{Total Score} = \left(\frac{\text{English Correct}}{60} \times 100\right) + \sum_{i=1}^3 \left(\frac{\text{Elective}_i \text{ Correct}}{40} \times 100\right)$$
  * Overall score reported out of 400 alongside Target Score comparison.
  * Individual subject breakdown cards with accuracy percentages.
  * **Topic Weakness Heatmap**: Categorizes topics by mastery:
    * Critical Weakness: $< 40\%$ accuracy (flagged with direct "Practice Topic" action).
    * Moderate: $40\% - 69\%$ accuracy.
    * Strong: $\ge 70\%$ accuracy.
  * Full answer review with explanations is available to Premium subscribers. Free users see their score breakdown and topic diagnostic, with question-by-question explanations locked behind a subscription prompt.

### Feature 5: Paystack Billing & Entitlement Engine
* **Requirement**: Seamless monetization supporting Nigerian payment channels.
* **Rules**:
  * Price: Flat **₦1,000 per 30-day access period**.
  * Payment Methods: Debit Card, Bank Transfer, USSD, OPay/Palmpay via Paystack standard checkout.
  * Webhook Verification: Endpoint `/api/webhooks/paystack` validates HMAC SHA512 header against secret key.
  * Idempotency: All webhook event IDs are logged in `payment_webhook_events`. Duplicates return HTTP 200 without reprocessing.
  * Entitlement Window:
    $$\text{new\_expires\_at} = \max(\text{current\_expires\_at}, \text{now()}) + 30 \text{ days}$$
  * Graceful Expiry: If entitlement expires, account seamlessly transitions back to Free tier without data loss.

### Feature 6: Admin Content & Ingestion Management
* **Requirement**: Efficient content authoring and verification.
* **Rules**:
  * Admin-only role protected by server-side middleware and database policies.
  * Bulk Ingestion: Supports CSV and JSON uploads validated against a strict Zod schema.
  * Media Management: Supports diagrams and illustrations via Supabase Storage.
  * Passage Grouping: Allows reading passages to be linked to multiple child questions (`passage_id`).
  * Publishing Lifecycle: Questions enter as `draft`, transition to `reviewed`, and become active on `published`.

### Feature 7: Refer-and-Earn Viral Acquisition Engine ("Invite 2, Get 50% Off")
* **Requirement**: Candidates can refer classmates and unlock a one-time 50% discount on their first monthly subscription.
* **Rules**:
  * **Attribution**: Every student receives a unique referral code (`/r/[code]` or `?ref=[code]`) upon registration. Attribution is captured during signup and cannot be changed retroactively.
  * **Qualification Requirement**: Exactly 2 referred accounts must complete registration and verify email/phone.
  * **Reward**: One-time 50% discount voucher (`FIRST_MONTH_50_PERCENT`) reducing the first month from ₦1,000 to **₦500**.
  * **Redemption Window**: Strictly redeemable **before or on the student's first paid subscription**. Students who have already paid the standard ₦1,000 cannot retroactively claim or refund a referral discount.
  * **Subsequent Renewals**: All subsequent renewals return to the standard ₦1,000 monthly rate.
  * **Abuse Prevention**: Self-referrals are prohibited; existing users cannot be re-referred; IP and device fingerprint rate-limiting guards against automated fake signups.

---

## 5. Non-Functional Requirements & Constraints

* **Mobile First**: All layouts responsive from 360px mobile viewports to 4K displays.
* **Bandwidth Optimization**: Lightweight payload, asset preloading, and no heavy client dependencies.
* **Zero Client Trust**: Timing, scoring, and answer keys are strictly controlled by the server.
* **Student Privacy**: No sensitive government IDs (NIN, JAMB Reg Number) required.
