# JAMBPrep UI design and component guide

Updated: 10 October 2026
Status: implemented landing-page baseline; signed-in product components remain proposed.

## Purpose and precedence

Use this guide before creating or changing JAMBPrep interfaces. It records the study-coach direction implemented following the user's request to redesign the landing page. It supersedes conflicting landing-page typography, layouts and animation advice in `design-brief.md`. Existing exam specifications remain planned, not evidence of implementation.

The user explicitly confirmed that **no practice questions, papers, diagnostic mocks or exams may be taken without creating an account**. Free access is an entitlement for signed-in users, not anonymous access. The earlier public sample question was removed. Do not restore it.

Read `product-requirements.md`, `app-flow.md`, this guide and the relevant source before extending a journey. Follow `../AGENTS.md` and the installed Next.js documentation. Current package manifest specifies Next.js 16.4.0, React 19.3.0 and Tailwind v4; older technical documents specify Next.js 15 and must not override installed APIs.

## Product personality and content

JAMBPrep is a calm, practical study coach. Its central promise is “Know what to study next.” The learning loop is diagnostic → focused practice → feedback → revision → another mock.

- Use clear, supportive language and realistic next steps.
- Prefer product illustrations and useful explanations over stock student photos, decorative floating icons or dense feature grids.
- Avoid score guarantees, fabricated testimonials, popularity badges and claims of official JAMB endorsement.
- Identify fictional scores as “Example report” and the mock interface as an illustration.
- Never present an unimplemented capability as available. Registration, checkout and full mock sessions currently remain coming soon.
- Keep LecternIQ school-owner workflows and annual school pricing out of this independent student product.

## Implementation map

Paths below are relative to `jambprep/`.

| Source | Responsibility |
| --- | --- |
| `src/app/page.tsx` | Server-rendered landing composition, static scorecard/mock illustrations, pricing, FAQs and footer |
| `src/app/landing-interactions.tsx` | Client components: `Reveal`, `SubjectPicker`, `MobileMenu` |
| `src/app/globals.css` | Brand tokens, shell, spacing, typography helpers, animations, focus and reduced-motion styles |
| `src/app/layout.tsx` | Global document structure and metadata |

Keep static content in Server Components. Introduce a small client boundary only for state, events or browser APIs. Reuse these components and styles before creating alternatives. No animation library has been added. The UI is not yet a complete shadcn component library.

## Visual language

### Colour

| Colour | Value | Use |
| --- | --- | --- |
| Emerald | `#116149` | Primary actions, brand accents, active selections |
| Dark ink | `#092E28` | Default foreground and headings |
| Deep green surface | `#102F29` | Premium card and mock illustration |
| Warm canvas | `#F6F8F5` | Global background |
| Navigation surface | `#FAFBF7` | Sticky header |
| White | `#FFFFFF` | Cards and content surfaces |
| Sage | `#EDF2E9` | Getting-started section and soft actions |
| Report backdrop | `#EAF0E4` | Hero report frame |
| Gold | `#E7B85A` | Restrained emphasis on dark backgrounds |
| Pale gold | `#F1E8CC` / `#F8F2DF` | Referral banner and next-topic recommendation |
| Muted text | `#64748B` | Supporting information |
| Neutral border | `#E2E8F0` | Light dividers and controls |
| Focus | `#B47F16` | 3px outline with 5px offset |

Some colours currently use inline Tailwind values and some use CSS variables. Prefer existing semantic brand tokens when extracting shared components; do not introduce near-identical colours. Check contrast for each pairing rather than assuming the palette guarantees it.

### Typography

The implemented landing uses a local **system sans-serif stack**. Georgia/Times italic is a selective editorial accent, not the body face. Plus Jakarta Sans and Inter in the older brief are not currently loaded; do not add font dependencies silently.

| Pattern | Current baseline |
| --- | --- |
| Hero | `clamp(3.3rem, 6.4vw, 5.7rem)`, weight 600, line-height 1.04, tracking -0.065em |
| Section title | `.section-title`: `clamp(2rem, 3.8vw, 3.25rem)`, weight 600, line-height 1.12, tracking -0.045em |
| Serif emphasis | `.serif-accent`: Georgia/Times, italic, weight 400 |
| Eyebrow | `.eyebrow`: 10px, weight 700, tracking .14em, emerald |
| Body | 16–18px with relaxed line-height |
| Supporting labels | 12–14px; 10px only for short, nonessential decorative labels |

Use one H1 and a meaningful H2/H3 hierarchy. Use serif emphasis for a few words, not whole paragraphs. The hero scale does not belong in dashboards or exam questions.

### Layout and surfaces

- `.shell`: `min(1180px, calc(100% - 40px))`, centred, giving 20px minimum side gutters.
- `.section-space`: vertical padding `clamp(64px, 8vw, 104px)`.
- Sticky header: 80px high; anchor scroll margin: 100px.
- Desktop hero and product sections use two columns; stack content first on phones.
- Breakpoints follow existing Tailwind defaults: sm 640px, md 768px, lg 1024px.
- Primary actions are pill-shaped and at least 48px high. Secondary links retain a similarly generous hit area.
- Cards use 16–24px rounding; the hero frame uses 32px. Use 24–36px card padding according to viewport.
- Reserve deep shadows for the hero report. Other sections use whitespace, light borders and restrained surfaces.
- Standard touch targets must be at least 44px. The old brief's 36px question-palette size is not suitable as the mobile hit target.

## Landing-page composition

Maintain this narrative order unless a new product decision requires a change:

1. **Navigation:** wordmark, How it works, Subjects, Pricing, getting-started action. Mobile menu replaces desktop links.
2. **Hero:** “Know what to study next.” Supporting copy, CTA, account-required note and static example score report.
3. **Short capability strip:** launch subjects, planned mock duration, feedback and audience.
4. **Learning loop:** three open columns with step numbers, descriptions and concise outcomes.
5. **Getting started:** account creation → subject selection → target/diagnostic. This replaced the anonymous sample question.
6. **Mock illustration:** static timer, subjects and question palette with explicit illustration label.
7. **Subject explorer:** compulsory English plus up to three electives; local preview only.
8. **Pricing:** Free and Premium, followed by referral details.
9. **FAQs:** native disclosure controls.
10. **Closing CTA and footer:** account-first message, development status and non-affiliation notice.

Current main CTAs point to `#get-started`, not missing login/register pages. Do not make a nonfunctional registration button look active. When real auth routes exist, connect Create account and Sign in, preserve the requested destination, and enforce access on the server.

## Component contracts

| Component / pattern | Behaviour and states | Reuse guidance |
| --- | --- | --- |
| Primary action | Emerald/white pill, hover darkening and subtle upward shift, visible focus | Navigation uses anchors; actions use buttons. Maintain understandable labels. |
| `Reveal` | `{children, className?}`; animates once when 12% visible | Wrap a section or meaningful group, not every word or table cell. Children remain visible without JS. |
| `MobileMenu` | Closed/open state, labelled toggle, `aria-expanded`, `aria-controls`; closes after selecting an anchor | This is a nonmodal navigation panel, not a dialog. Do not add a modal focus trap without changing the interaction model. |
| `SubjectPicker` | English fixed; 0–3 electives; selected options can be deselected; remaining options disabled at three | Uses buttons with `aria-pressed` and a status announcement. Does not save or validate an admission combination. |
| Example scorecard | Static 248/400 report; subject scores 72, 68, 62, 46; target 280 | Example data only. Do not imply measured user progress or connect to grading logic. |
| Mock illustration | Static timer, subject labels, decorative question grid | Not an exam. Do not add answer selection, timer countdown or exam-start actions for anonymous visitors. |
| Pricing card | Name, amount, duration, features, CTA and availability note | No unsupported “most popular” tag. Keep practice explanations distinct from premium full-mock reviews. |
| FAQ | Native `details` / `summary`, closed/open | Preserve keyboard interaction and meaningful question text. |
| Getting-started panel | Ordered three-step explanation and coming-soon note | No anonymous test content or answers. |

If extracting currently inline patterns, use descriptive names such as `PrimaryAction`, `ExampleScorecard`, `PricingCard` and `SectionHeading`. These names are suggested extractions, not existing exported components.

## Animation specification

| Motion | Implemented settings |
| --- | --- |
| Hero entrances | `.entrance`: opacity 0→1, translateY 16px→0, 550ms ease-out, both fill mode |
| Stagger | `.delay-1` 80ms, `.delay-2` 160ms, `.delay-3` 240ms |
| Score bars | scaleX 0→1, left origin, 800ms duration, 350ms delay; runs once on page load |
| Scroll reveal | IntersectionObserver threshold .12; Web Animations opacity .4→1 and translateY 16px→0; 450ms ease-out; disconnect after first reveal |
| Hover | Small upward shift and colour transition on primary actions |

- Respect `prefers-reduced-motion`: no CSS animations/transitions, no JS reveal animation, no smooth scrolling.
- Scroll content must be visible before hydration and if IntersectionObserver is unavailable. Never hide entire sections waiting for JS.
- No scroll hijacking, parallax, repeated looping ornaments or score count-up that delays comprehension.
- In a future active exam, prioritise stable reading and immediate controls over entrance effects. Avoid persistent pulsing timers; use clear text/icon warnings and restrained state changes.

## Account, pricing and access rules

Confirmed access rule: all question answering, papers and exams require a created account and an authenticated session. Removing the public demo implements this rule on the landing page only; backend authorization is still future work.

Public visitors may view marketing, illustrative reports, pricing, FAQs and the subject-combination explorer. They may not start practice, obtain a playable paper, submit answers or launch diagnostic/mock sessions.

Planned entitlements from the PRD:

- Free: one diagnostic mock, 15 daily practice questions, practice explanations and diagnostic summaries.
- Premium: ₦1,000 for 30 days, unlimited practice/mocks and full mock review.
- Referral: two verified friends qualify for ₦500 on the first purchase only; later periods ₦1,000.
- Daily free quota resets at midnight WAT. Do not describe 30-day access as automatic renewal without an implemented and confirmed renewal flow.

## Future signed-in UI guidance — not implemented

Carry over colour, controls, spacing and supportive language, but use compact functional typography for study screens.

- Dashboard: next recommended action, selected subjects, target, practice allowance and recent results.
- Practice: clear stem, accessible answer controls, feedback and explanation after submission.
- Mock: distraction-free layout, stable timer, subject switching, question palette, autosave status and deliberate submission confirmation. No answer keys during an active attempt.
- Results: total/subject scores, weak-topic actions and clearly described Premium gates.
- States: design loading, empty, error/retry, session expiry, offline/syncing and quota exhaustion before considering a flow complete.
- Account, timing, quotas, answer secrecy and payments need server enforcement; disabled buttons are not security controls.

## Verification and handoff checklist

Before a UI change is complete:

- Confirm no anonymous practice or exam interaction is introduced.
- Confirm CTA destinations exist or lead to an honest coming-soon explanation.
- Check 360px layouts, long labels, keyboard order, focus, reduced motion and overflow when authorized tooling permits.
- Preserve native semantics, descriptive controls, text/icon status cues and live announcements for changing selections.
- Keep sample data and future features labelled.
- Run ESLint and TypeScript; run the production build and report limitations accurately.
- Do not add dependencies, new fonts or a competing design system without approval.
- Update this guide when an intentional design decision changes.

Evidence at this handoff: landing redesign and account correction exist in source. ESLint and TypeScript passed after the account correction. The earlier redesign compiled using Webpack; the default Turbopack build failed because its worker could not bind a local port. Webpack compilation does not verify the configured Turbopack Tailwind pipeline. No browser testing or visual viewport verification was performed, following the user's instruction. Do not describe the UI as visually audited or the full product as launched.

## Authentication visual update — 10 October 2026

Login and registration now share `src/app/auth-shell.tsx` (`AuthShell`, mode `login` or `register`, children for the existing form). The former narrow centred card is replaced by a two-column desktop composition: a deep-green study-plan panel and an open form on warm canvas. At widths below lg the decorative panel is hidden so the form remains the priority. Reuse this shell for related authentication screens rather than inventing another layout.

The shell uses the landing wordmark, an alternate-auth link, a back-to-home link, a 36–48px sans/serif heading and restrained existing entrance animations. Inputs are at least 52px high with 16px text, visible labels, autocomplete hints and focus rings. Forms retain existing server actions and field names. Password visibility uses a labelled checkbox; submit buttons retain pending feedback. Referral copy describes a supplied code pending validation, not a guaranteed reward.

Onboarding retains its current form and persistence but uses a wider 768px composition and larger heading. Removed the misleading “Step 1 of 2” label because the form presents all setup sections together. Target presets are personal goals, not claimed institution/course admission thresholds. Range and aspiration inputs now have accessible names; score presets expose pressed state.

Verification: changed-file ESLint and TypeScript pass; Webpack build passes with existing middleware/Edge warnings. Repository-wide lint remains blocked by two `no-explicit-any` errors in Supabase client/server helpers and reports unrelated unused imports. No browser/visual testing or live authentication verification was performed. This UI work does not establish Phase 2 security or production acceptance.


### Auth layout stability correction

The auth grid aligns items to the start and uses `minmax(0, 1fr)` columns. Both columns have `min-width: 0`. The left panel has intrinsic content height and a fixed 40px gap between its three content groups. Do not stretch it to the form, distribute its content with `justify-between`, or impose viewport/equal-column heights: errors, referral notices and additional fields in the right column must not reposition left-panel content. The form is top-aligned rather than vertically centred. Allow normal document scrolling and text wrapping; do not clip overflow to hide layout defects.

Verification for this correction: source-level layout review and targeted static checks only; browser testing remains excluded by user instruction.

## Mock workspace revision — 2026-10-10

The exam workspace uses a light grey canvas, white cards, slate text and subtle borders. Green is reserved for selected answers, active subjects and primary actions. Do not restore the full dark-green exam background. Keep the timer sticky, tabular and consistently HH:MM:SS, with amber/red urgency states rather than pulsing text. Submit remains visible on mobile. Calculator access is available for every subject; its state persists across question/subject switches. Basic arithmetic uses entry order, with explicit divide-by-zero feedback; no evaluated code expressions. Calculator keyboard events must not activate exam shortcuts.

Timer subscriptions start during engine initialization, not React render, and survive effect cleanup/reinitialization. Verified with a lifecycle/visibility regression test, calculator arithmetic tests, TypeScript and focused lint. No browser/visual testing performed per user instruction.

## Authenticated workspace — 2026-10-10

Use `components/study-workspace.tsx` and its CSS module for overview, practice, analytics, profile, referrals, onboarding, plans, payment verification, mock briefing and results. Active timed mocks retain their focused exam layout. Server pages retain their authentication and entitlement checks; navigation never grants access. Overview/Practice/Mock exams/Performance/Invite friends/My profile/Plans must remain reachable at every width.

Breakpoints match installed Tailwind v4 `theme.css` and https://tailwindcss.com/docs/responsive-design:

| Width | Layout contract |
| --- | --- |
| Below 640px | Single-column content, 16px gutters, horizontally scrollable labelled navigation, 44px navigation targets; form text 16px minimum. |
| sm: 640px | 24px gutters, paired cards where readable, wrapping actions. |
| md: 768px | 32px gutters, wrapping navigation bar; keep heavy content stacked. |
| lg: 1024px | 216px sticky sidebar and independently sized fluid content; navigation no longer competes with account/header space. |
| xl: 1280px | 240px sidebar, 40px gutters, four score/subject cards, three topic cards; coach actions may sit alongside copy. |
| 2xl: 1536px | 48px gutters, maximum 1280px content width to preserve readable line lengths. |

Shared surfaces: neutral grey canvas, white cards, slate text; green denotes current navigation/primary action. Workspace pages use 24–48px top padding rather than marketing-section spacing. Avoid fixed minimum card widths and unwrapped controls. Sidebar scrolls on short screens. Mobile account and sign-out remain available. The dashboard Premium explanation is a compact, explicit card, not fabricated blurred topic data.

Verification: code review and TypeScript; no browser or screenshot verification was performed because the user's no-browser-testing instruction remains active. Cross-device visual QA is still needed before claiming pixel-perfect layouts.

### CSS pipeline correction — 2026-10-10

The Turbopack Tailwind rule must exclude `*.module.css`: its `as: "*.css"` rewrite otherwise changes module treatment and leaves component class mappings without their intended styles. Native Next.js CSS Modules now handle the workspace and calculator modules. Verified with `npm run build` (Turbopack), including emitted scoped selectors and their client references. A webpack-only build is insufficient to validate this configuration. No browser testing performed.

### Pro navigation policy — 2026-10-10

Confirmed: active Pro subscribers do not see Invite friends, Plans or upgrade/referral promotions. The shared workspace resolves entitlement on the server before rendering navigation (no free-navigation flash). `/pricing` redirects active Pro to `/profile#subscription`; `/referrals` already redirects them to overview. Profile retains expiry, billing and cancellation information. Cancelled-but-unexpired subscribers retain Pro navigation until access expires. Free/expired subscribers keep Plans and Invite friends. Removed the cancelled subscriber's misleading Renew Early link, which would otherwise loop back to the profile.
