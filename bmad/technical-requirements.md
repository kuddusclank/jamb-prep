# Technical Requirements Document (TRD)
# JAMBPrep — Technology Stack & Engineering Specifications

**Document Version:** 1.0.0  
**Status:** Approved Specification  
**Architecture:** Next.js App Router Modular Monolith + Supabase  

---

## 1. Architectural Philosophy & Strategy

JAMBPrep is architected as a **modular monolith** optimized for speed of development, low operational overhead, high reliability under unreliable network conditions, and server-authoritative integrity.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Next.js App Router                            │
│                                                                        │
│  ┌───────────────────────┐  ┌───────────────────────────────────────┐  │
│  │   Student Portal      │  │             Admin Portal              │  │
│  │   (Practice / CBT)    │  │       (CMS / Bulk Ingestion)          │  │
│  └───────────┬───────────┘  └───────────────────┬───────────────────┘  │
│              │                                  │                      │
│              ▼                                  ▼                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │     Next.js Server Actions & Route Handlers (Edge / Node.js)     │  │
│  │     • Authoritative Exam Timer  • Scaled Scoring Engine          │  │
│  │     • Paystack Webhook Handler  • Session Entitlement Checks     │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │
          ┌───────────────────────────┴───────────────────────────┐
          ▼                                                       ▼
┌───────────────────────────────┐               ┌────────────────────────────────┐
│      Supabase PostgreSQL      │               │        Paystack Gateway        │
│  • Drizzle ORM Type Safety    │               │  • Standard Checkout           │
│  • Row-Level Security (RLS)   │               │  • Webhook Verification        │
│  • Storage (Diagrams/Images)  │               │  • Card, Transfer, USSD        │
└───────────────────────────────┘               └────────────────────────────────┘
```

---

## 2. Definitive Technology Stack

| Layer | Technology | Version / Tool | Rationale |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `15.x` | React Server Components, server actions, dynamic route caching, and zero-config deployment. |
| **Language** | TypeScript | `5.x` (Strict mode) | End-to-end type safety from database models to frontend components. |
| **Styling** | Tailwind CSS | `v4.x` | High-performance CSS engine, responsive breakpoints (`sm`, `md`, `lg`, `xl`), zero-runtime CSS. |
| **UI Components** | shadcn/ui + Radix UI | Latest | Accessible, headless, customizable primitives with accessible keyboard interactions. |
| **Icons** | Lucide React | Latest | Consistent, lightweight SVG icon system. |
| **Database** | PostgreSQL | Supabase Hosted | Relational integrity, JSONB support for options, Row Level Security, transactional stability. |
| **ORM & Migrations** | Drizzle ORM | Latest (`drizzle-orm` + `drizzle-kit`) | Lightweight, zero-overhead TypeScript ORM with direct schema generation. |
| **Auth** | Supabase Auth | `@supabase/ssr` | Cookie-based session management for Next.js App Router with JWT refresh. |
| **Formula Rendering**| KaTeX | `katex` + React wrapper | Lightweight, ultra-fast client-side math and physics equation renderer (superior to MathJax on mobile). |
| **Exam State** | Zustand | `zustand` | Fast, decoupled client store for managing the active 180-question exam session without re-render cascades. |
| **Data Fetching** | TanStack Query | `v5.x` | Client-side caching, background refetching, and optimistic updates for practice sessions. |
| **Form & Validation** | Zod + React Hook Form | Latest | Shared schemas between client forms and server endpoints. |
| **Charts** | Recharts | Latest | Lightweight, SVG-based progress and topic accuracy visualizations. |
| **Payment Gateway** | Paystack API | REST + Webhooks | Industry standard in Nigeria; supports debit cards, bank transfers, USSD, and mobile money. |
| **File Storage** | Supabase Storage | S3-compatible | Public CDN for diagrams, illustrations, and reading comprehension passages. |

---

## 3. Core Architectural Decisions

### ADR-01: Server-Authoritative Exam Engine
* **Decision**: All examination timers, valid question sets, and final grading are computed exclusively on the server.
* **Mechanism**:
  1. When an attempt starts, the server records `started_at = now()` and `expires_at = now() + 120 minutes`.
  2. The client receives question IDs, stems, and options. **Correct options and explanations are completely withheld from the client payload during active mocks.**
  3. When an answer is chosen, the client posts `attempt_answers` with `{ question_id, option_id }`.
  4. On submission or expiration, the server calculates the score against the database answer keys and writes immutable records to `attempt_results`.

### ADR-02: Client-Side Resilience & Autosave
* **Decision**: An active exam must never lose user progress due to network blips or browser crashes.
* **Mechanism**:
  1. Zustand manages the active state in memory.
  2. Every answer selection, flag, and visited question is mirrored immediately into `localStorage` keyed by `exam_session_[attemptId]`.
  3. A background sync service pushes uncommitted answers to `/api/exam/answers` with debouncing (300ms) and retry logic.
  4. If a candidate reloads the page or reopens the browser, the app rehydrates from local state while confirming remaining time with the server.

### ADR-03: Versioned Exam Configuration & Frozen Snapshots
* **Decision**: Once an exam attempt is created, its question list, options, and question snapshots are frozen.
* **Mechanism**:
  1. An admin editing a question in the CMS must never retroactively change a question in an ongoing or completed attempt.
  2. Each attempt creates 180 entries in `attempt_questions` linking the frozen question set in fixed sequence.

### ADR-04: Entitlement-Based Billing Architecture
* **Decision**: Unify recurring card subscriptions and manual one-off payments (Bank Transfer / USSD) into a single entitlement expiration model.
* **Mechanism**:
  1. The table `subscription_entitlements` stores `expires_at` for each candidate.
  2. A verified Paystack webhook (`charge.success`) extends `expires_at` by $+30\text{ days}$:
     $$\text{new\_expires\_at} = \max(\text{current\_expires\_at}, \text{now()}) + 30\text{ days}$$
  3. Multiple payments within a month cleanly stack (e.g., paying twice grants 60 days).
  4. Entitlement checks are cached in user sessions and verified server-side on protected routes.

### ADR-05: Reactive Examination Engine with RxJS & Outbox Sync
* **Decision**: Use RxJS for event orchestration in a headless TypeScript engine (`src/features/exam-engine/`), a pure reducer for deterministic state transitions, durable local storage outbox for zero-loss offline answer buffering, and React purely as the view layer.
* **Scope Boundary**: RxJS is strictly confined to `src/features/exam-engine/` and never used for authentication, onboarding, billing, or general marketing pages.
* **Key Mechanisms**:
  1. **Hotkey Race Condition Resolution**: Answer events are piped through `debounceTime(350)` and queued in a local persistent outbox. Rapid mashing of options `A -> B -> C` will never generate out-of-order writes or let slow packets overwrite newer choices.
  2. **Authoritative Countdown & Background Tab Protection**: Timer observable computes $\max(0, \text{expiresAt} - \text{Date.now()})$ using `distinctUntilChanged()`, re-evaluating on both 1-second ticks and `visibilitychange`/`focus` events so Chromium background tab throttling cannot desynchronize the exam clock.
  3. **Offline Resilience**: When `window.offline` fires, the engine buffers answers locally. When `window.online` fires, it automatically drains the outbox queue to the server.

---

## 4. Security & Data Protection Specifications

1. **Row Level Security (RLS)**:
   * Enabled on all PostgreSQL tables.
   * Students can only `SELECT` and `UPDATE` records matching `auth.uid() = user_id`.
   * Public can only `SELECT` from `subjects`, `topics`, and active `questions` where `status = 'published'`.
   * Tables containing correct options (`question_options.is_correct`) and explanations (`question_explanations`) are protected so that clients cannot query answers during an ongoing mock attempt.
2. **Webhook Security**:
   * All Paystack webhook deliveries require HMAC SHA512 signature verification using `crypto.createHmac('sha512', PAYSTACK_SECRET_KEY)`.
   * Webhook payloads are hashed and deduplicated in `payment_webhook_events` to block replay attacks.
3. **Role-Based Access Control (RBAC)**:
   * Profiles have a `role` enum (`student`, `admin`, `reviewer`).
   * Admin routes (`/admin/*`) are guarded by Next.js Server Middleware inspecting claims before rendering.
4. **Data Privacy for Minors**:
   * No collection of BVN, NIN, JAMB Registration Number, or residential address.
   * Only student display name, email, and academic preferences are retained.

---

## 5. Performance Budgets & SLAs

* **Largest Contentful Paint (LCP)**: $< 2.0\text{s}$ over 3G fast mobile.
* **Interaction to Next Paint (INP)**: $< 100\text{ms}$ during question switching.
* **Cumulative Layout Shift (CLS)**: $< 0.05$ (guaranteed by explicit skeleton sizing for formulas and images).
* **Bundle Size**: Total JavaScript loaded on `/mock/[attemptId]` must stay under $180\text{KB}$ gzipped.
* **High-Availability SLA**: $99.9\%$ uptime during peak UTME preparation season (January – May).

---

## 6. Live Infrastructure & Dedicated Supabase Credentials

The application is deployed with a dedicated, isolated Supabase project decoupled from any other systems:

| Resource | Value | Details |
| :--- | :--- | :--- |
| **Project Name** | `jamb-prep` | Dedicated JAMB UTME application instance |
| **Project Reference** | `bqumnaoiiukifvanoonm` | Unique Supabase project identifier |
| **Organization** | `Clank Dynamic` | Supabase organization |
| **Region** | `eu-west-1` (Ireland) | AWS Europe region |
| **Project URL** | `https://bqumnaoiiukifvanoonm.supabase.co` | Base REST & Auth endpoint |
| **Publishable / Anon Key**| `sb_publishable_Fg-Vq3gTOa5Y6Au-Xu8FZw_Ld9ypzfW` | Client-side Next.js browser key |
| **Database User** | `postgres.bqumnaoiiukifvanoonm` | Default PostgreSQL superuser |
| **Database Password** | `xuhsuc-0wavno-kygDyg` | Master database password |
| **Direct URI (IPv6)** | `postgresql://postgres:xuhsuc-0wavno-kygDyg@db.bqumnaoiiukifvanoonm.supabase.co:5432/postgres` | Direct database connection |
| **Session Pooler (IPv4)**| `postgresql://postgres.bqumnaoiiukifvanoonm:xuhsuc-0wavno-kygDyg@aws-0-eu-west-1.pooler.supabase.com:5432/postgres` | Drizzle Kit migrations & schema push |
| **Transaction Pooler (IPv4)**| `postgresql://postgres.bqumnaoiiukifvanoonm:xuhsuc-0wavno-kygDyg@aws-0-eu-west-1.pooler.supabase.com:6543/postgres` | High-concurrency serverless pooler |

### Supabase CLI Setup Commands

To link this local workspace directly with the remote Supabase project:

```bash
# 1. Authenticate Supabase CLI
supabase login

# 2. Initialize Supabase workspace (if not already done)
supabase init

# 3. Link local project to the dedicated jamb-prep remote instance
supabase link --project-ref bqumnaoiiukifvanoonm

# 4. Pull remote configuration
supabase db pull
```

---

## 7. Live Paystack Gateway Credentials & Webhook Architecture

The application is integrated with Paystack in Test Mode for billing, monthly subscriptions, and referral reward redemptions:

| Parameter | Value | Details |
| :--- | :--- | :--- |
| **Environment** | Test Mode | Sandbox testing for card, bank transfer, and USSD flows |
| **Test Public Key** | `pk_test_eab1f68c7146da56e7408fb46ea912f7f2b3dc3d` | Client-side Paystack key for browser initialization |
| **Test Secret Key** | `sk_test_df9120d7fecc44d01fb40a16ba11af14d6222169` | Server-side transaction initialize & verification API key |
| **Webhook Secret** | `sk_test_df9120d7fecc44d01fb40a16ba11af14d6222169` | HMAC-SHA512 webhook signature verification |
| **Local Webhook Route** | `/api/webhooks/paystack` | Receives and verifies `charge.success` events |
| **Standard Subscription** | ₦1,000 / month (100,000 kobo) | 30 days of unlimited CBT simulation & practice |
| **Referral Reward Price** | ₦500 / month (50,000 kobo) | 50% discount automatically applied after 2 friend referrals |

