# JAMBPrep — Product & Engineering Blueprint (BMAD)

Welcome to the definitive specification repository for **JAMBPrep**, an authentic Computer-Based Test (CBT) simulation and personalized performance coaching platform for Nigerian UTME candidates.

---

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

## Mock integrity handoff

Read [Mock exam conditions](mock-exam-conditions.md) for approved behaviour, implementation status, migration requirements and deferred audio work.
