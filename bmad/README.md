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
