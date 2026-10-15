# SEO, sharing, recovery and CBT polish — 15 October 2026

## Confirmed scope

Ten user requests: route SEO; minimal loading; native invite sharing; practice/mock result sharing; password recovery; subject-local CBT numbering; mock setup/result layout; removal of selection diagnostics; LecternIQ logo/favicon/OG; sitemap, redirects, 404 and AI-readable site summary. Preserve static Pages architecture, server-owned scores, private answers and existing question-selection blueprints.

## Implementation and release checklist

- [x] Central route metadata: unique title, description, canonical, OG and Twitter cards. Index the landing and pricing pages; account, auth, exams, results and admin routes have `noindex, follow`. Never include private route parameters in canonical URLs.
- [x] Static sitemap contains only public indexable routes. Robots permits crawlers to read noindex directives. Add `llms.txt`, `/llm.txt` redirect and sign-in/sign-up aliases. Retain custom 404 and existing legacy-attempt recovery.
- [x] White loading screen, restrained spinner, reduced-motion support and delayed retry.
- [x] Native share invoked directly from invite/result button taps; cancelled shares do nothing; unsupported sharing copies text; clipboard failures show feedback. Explicit WhatsApp links remain available.
- [x] Result copy uses actual returned score, public registration URL and no attempt ID, email or answer key. Practice copy names its topic only when all frozen questions share that topic.
- [x] Forgot/reset password routes using Supabase PKCE recovery; ordinary signed-in sessions do not unlock the reset form. Bind the recovered actor to the password update and clear private state/sign out after success. A reload requires a fresh recovery link rather than trusting a persistent browser marker.
- [x] CBT palette displays only the active subject with 1-based local numbering; global engine indexes, deadline, submission and grading remain intact. Previous/next labels no longer expose global question numbers.
- [x] Full-width mock mode form, explicit neutral borders/selected state; independent mock wording. White results summary with saved subject names, score breakdown, sharing and collapsible answer review.
- [x] Remove student-facing selection diagnostics; retain frozen payload compatibility and server/admin diagnostics.
- [x] Original LecternIQ vector monogram and wordmark, favicon, Apple/app icons, shared 1200×630 OG card and manifest. No external stock assets or generated question data.
- [x] Connect Resend SMTP in Supabase; user received recovery email (in spam).
- [ ] Confirm recovery redirect allowlist and perform one explicitly authorized recovery email round trip after SMTP setup.
- [x] Publish Worker + Pages and record production checks below.

## Recovery setup handoff

Keep signup email confirmation disabled. Password recovery still requires a working sender. Use Resend's verified domain and Supabase integration, or custom SMTP: host `smtp.resend.com`, port `465`, username `resend`, password the Resend API key (store only in Supabase's protected SMTP configuration). Configure an address on the verified domain and sender name JAMBPrep.

Supabase URL configuration must allow exactly `https://jambprep.lecterniq.com/reset-password/`, `https://jambprep.pages.dev/reset-password/`, and reviewed local test URLs if needed. Site URL should remain the production homepage. Default recovery email should use `{{ .ConfirmationURL }}` so PKCE verification redirects back to the requested page. Open the recovery link in the browser where it was requested. Do not enable email confirmation as a side effect.

The application never pretends a provider error means an email was sent. No real reset emails or new accounts were created during these checks. SMTP and management configuration remain unverified until the user completes setup; the recovery code is not evidence of delivery.

## Sources and decisions

- [Next metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images): use server metadata layouts around existing client pages.
- [Google indexing requirements](https://developers.google.com/search/docs/essentials/technical): private pages must remain protected; noindex is search hygiene, not authorization.
- [MDN Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share): transient activation required; cancellation is not a failure.
- [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp): default sender is restricted to project team addresses.
- [Supabase recovery](https://supabase.com/docs/guides/auth/passwords) and [Resend integration](https://supabase.com/partners/resend).

Public SEO content reflects available features and does not claim official JAMB affiliation, guaranteed results or unverified ratings. The sitemap excludes login/register intentionally, though both have unique and shareable metadata. `llms.txt` is descriptive guidance, not access control or a guarantee of AI visibility.

## Verification and release evidence

- `node --import tsx --test tests/seo-sharing-palette.test.mjs tests/t04-session-provisioning.test.mjs tests/worker-api-foundation.test.mjs`: 35 passed, 0 failed. Includes frozen subject score labels and cross-owner denial, subject palette boundaries, native share cancellation and clipboard failures.
- `node --import tsx --test tests/t05-static-export-routing.test.mjs`: 9 passed, 0 failed. Local HTTP server requires sandbox network permission.
- `npx next build --webpack`: successful static export and TypeScript check. Used the previously established webpack build path; dependencies and build configuration were not changed.
- Worker dry run: 644.75 KiB / gzip 136.35 KiB. `git diff --check`: clean.
- Static artifact inspection: 30 application routes, 30 unique titles; canonical, OG/Twitter fields present; private/auth routes noindex. Custom 404 retains automatic noindex and legacy deep-link recovery.
- Local Chrome: login/register at 390/1440 px (four checks); recovery/reset/pricing at 390/1440 px (six checks), no overflow or browser exceptions. Invalid reset links show no password fields. Provider URLs blocked during the latter checks. Mock mode component rendered separately with exported CSS at mobile/desktop widths and visually inspected; this is not an authenticated end-to-end exam check.
- Worker version: `8d1af1a9-bc09-451e-8cb2-6f481f27b77d`. Previous rollback version: `4b39688b-0aec-4d97-8d44-d97a60491f44`.
- Pages deployment: `608e8f1a.jambprep.pages.dev`, production domain `https://jambprep.lecterniq.com/`. Previous Pages deployment: `9fc7bc1d`.
- Ten production HTTP checks passed; see `seo-release-checks.json`. Public landing/login/recovery, sitemap/robots/OG, 301 aliases, API health and anonymous result denial. No test charges, account creation, password updates or recovery emails performed.
- Approved release allowance: 40 operations; 30 conservatively reserved/used (10 Worker publishing, 10 Pages publishing, 10 explicit HTTP checks), 10 remain. T02 ledger untouched.

## Remaining dependency

User confirmed they can create a Resend account. SMTP integration and exact recovery redirect allowlist still need to be configured and verified. No management credential was available to inspect or change Supabase Auth settings in this release. Keep this item open; do not describe email recovery as production-verified until an authorized round trip succeeds.

### SMTP setup follow-up

User reported saving SMTP/recovery configuration on 15 October 2026. Both hosted recovery routes return HTTP 200 with noindex and private/no-store headers. This does not verify Supabase settings or delivery. A user-driven reset-email round trip remains pending. Two additional approved operations used; 8 remain.

### Recovery callback timing fix — 15 October 2026

User received an email (in spam), then corrected Supabase's localhost Site URL and added the exact production recovery redirect (confirmed by screenshot). A subsequent reset page reached production but did not show password inputs.

The component had relied exclusively on receiving `PASSWORD_RECOVERY` after its effect subscribed. The installed SDK can complete automatic PKCE verification before a component subscriber is registered. Added an in-memory recovery tracker subscribed immediately when the shared browser client is created. The reset form reconciles `getSession()` and later initial-session events against that verified recovery proof. Normal sign-ins do not create proof; the tracker expires after 15 minutes and is invalidated on sign-out/account switch. Password mutation verifies the same actor with Supabase and rechecks unexpired proof. No URL flag or local-storage marker authorizes a reset. Reloading after the one-time callback requires a fresh link.

Also separated the recovery and login links into individual rows and handled rejected session-initialization promises.

Validation:

- `node --import tsx --test tests/password-recovery.test.mjs tests/t04-session-provisioning.test.mjs`: 15 passed, 0 failed. Covers missed-event replay, ordinary sign-in rejection, absent/other actor, expiry, logout and account switch.
- `npx next build --webpack`: successful static export and TypeScript verification.
- Actual local Chrome + installed Supabase SDK: simulated recover request, PKCE code exchange, visible password fields, password update and sign-out all passed. Every provider request intercepted locally; no real email, account or password changes. Evidence temporarily at `/tmp/jamb-recovery-browser-evidence.json`.
- User approved 15 additional provider operations for publishing/checks; allowance now 55 total. Final production deployment/check evidence recorded below.

Email delivery is now user-confirmed. Inbox placement and a real password-change round trip after the fix remain unverified. Do not ask the user to reuse a consumed email link.

Recovery fix deployed to Pages `497f7977` (previous rollback `608e8f1a`). Two production checks passed, including updated reset-page markup; see `recovery-fix-release-checks.json`. Eleven operations remain under the extended allowance. No Worker/database changes in this follow-up.
