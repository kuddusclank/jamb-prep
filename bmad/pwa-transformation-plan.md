# JAMBPrep Progressive Web App transformation plan

Status: implementation authorised 17 October 2026; first public-shell foundation implemented locally, acceptance gates pending. Prepared 17 October 2026 (Africa/Lagos). This document and `pwa-transformation-tasklist.md` are planning deliverables only. No PWA dependencies, service worker, schema migration or deployment are authorised by creating this plan.

## 1. Objective and scope

Turn the existing JAMBPrep website into an installable, resilient app on supported phones and computers while preserving the current web experience, server grading, payments, dynamic question bank, subject blueprints and account isolation. Reuse the current Next.js static export, Pages, native API Worker, Supabase Auth/Postgres and exam engine. A PWA is an enhancement to this application, not a framework migration.

Confirmed requirements: research first; document detailed implementation work; cover the whole application; retain the actual LecternIQ logo; loading must not expose incomplete live data; shimmer fallbacks are acceptable. Previously confirmed product rules remain authoritative: Free receives one successfully allocated 5/10/15-question practice session per WAT day; Pro has unlimited sessions; database owns questions, selection, entitlement and scoring.

Proposed product defaults below are recommendations, not already approved changes: offline continuation restricted to previously issued sessions; no new offline question allocation; no offline financial mutations; optional notifications in a later release; no full question-bank download. Offline graded practice and acceptance of late mock answers require explicit product decisions.

Success means installability, truthful loading/connectivity states, useful offline recovery, safe answer durability, safe upgrades and measurable regression evidence. It does not mean every server feature works without a connection or that free-tier capacity becomes unlimited.

## 2. Source audit: what exists today

Audit is local source inspection, not hosted device acceptance or database verification.

| Evidence | Current behaviour | Planning implication |
| --- | --- | --- |
| `package.json`, `next.config.ts` | Next 16.4.0, React 19.3.0; default static export; webpack and development Turbopack paths; native Worker separate | Prove integration against both build paths; official server-action examples cannot be pasted into this static app |
| `public/site.webmanifest` | Name, short name, start `/`, icons 192/512, `display: browser` | Existing manifest is a starting point; add stable identity/scope and standalone behaviour |
| `src/app/layout.tsx` | Manifest and Apple icon links already present | Extend metadata rather than duplicate competing manifest links |
| `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `lecterniq-mark.svg` | Branded assets exist | Reuse mark; inspect maskable safe area and actual dimensions before labelling assets maskable |
| `public/`, `src/` service worker search | No registration or service worker implementation found | Offline response and update lifecycle must be designed |
| `worker/production-router.js` | Canonical origin forwards static traffic to Pages and `/api/` to native API | Verify `/sw.js` is delivered at canonical origin and is never redirected; routing affects request cost |
| `public/_headers` | Private routes use no-store; static chunks currently revalidate | Changes must distinguish public immutable assets, generic exported shells and private API data |
| `src/lib/auth/session-manager.ts`, `account-coordinator.ts`, `browser-account-boundary.tsx` | Shared browser auth and owner-scoped in-memory data, server identity gate | Offline launch currently cannot complete the normal identity gate; don't bypass it accidentally |
| `src/features/exam-engine/persistence/local-outbox.ts` | Actor/attempt-scoped localStorage answers, revision counters and outbox | Existing storage is useful but multiple localStorage writes are not one atomic transaction |
| `reactive/use-exam-engine.ts` | Web Lock for actor/attempt lifetime; rejects unsupported browsers | Preserve single-writer guarantee; compatibility fallback must be proved, not silently remove the lock |
| `reactive/exam-engine.ts` | Local answers, online/focus listeners, server deadline, sequential per-answer drain | Persist full safe resume payload; measure sync traffic; do not assume batching already exists |
| `reactive/exam-engine.ts` | Expired outbox can remove entries after `ATTEMPT_EXPIRED` | Introduce terminal reconciliation receipts before deletion; never label rejected answers saved |
| `src/app/practice/practice-client.tsx`, `worker/services/study-service.ts` | Practice feedback is server-mediated; server validates active session/deadline | Offline immediate correctness would need a different reviewed disclosure model |
| `src/lib/auth/storage-cleanup.ts` | Clears known private local/sessionStorage prefixes and caches | Extend cleanup to IndexedDB, SW-related private state, notifications and all open clients |
| Working tree | Login/navigation and shimmer work is pending locally | Reconcile and accept that baseline before PWA work; do not include unrelated dirty edits in a PWA release |

## 3. Research conclusions and corrections to supplied articles

The two supplied documents are useful introductions and a course index. Some compatibility statements in the introduction are historical: Safari now supports Add to Dock on supported macOS releases, and iOS Home Screen web apps support Web Push from iOS/iPadOS 16.4. Capability support must be tested on actual target devices. [S1, S2, S3]

Installability and offline operation are different deliverables. A manifest and eligible browser can provide installation without a complete offline strategy. A service worker adds controlled fetch handling, not automatic offline correctness. [S1, S2]

Service workers may stop between events. They cannot own a continuously running exam timer. Background Sync has limited availability and is an optional enhancement, never the only delivery path. Browser storage can be denied or evicted; persistence requests are best effort. [S4, S5]

A worker installed from one origin cannot control another origin. Preview deployments and `jambprep.pages.dev` must have isolated caches and no production subscription/notification state. The canonical installed app is `https://jambprep.lecterniq.com/`.

## 4. Architecture and library decision

Recommended baseline: a small explicitly authored service worker, a deterministic post-export public-asset manifest, browser Cache Storage for public assets, IndexedDB for private attempt durability, and an app-side lifecycle coordinator. Keep the existing React/Zustand/RxJS responsibilities. Introduce no new state framework or remote caching service.

Evaluate Workbox `injectManifest` against the native worker in task W00. Workbox offers asset-manifest tooling and runtime strategies; custom logic remains necessary for auth, deadlines and updates. Serwist is an alternative only after proving current installed Next.js compatibility and the exact static-export pipeline. Do not select a plugin from popularity or copy its default runtime caches. All dependency additions require approval under repository instructions. [S6, S7]

Selection gate: build with webpack; verify development does not register production SW; inspect generated worker imports; test request exclusions; produce one deterministic worker/version and a bounded precache list. Prefer the least complex option that passes. If native implementation is selected, built-in IndexedDB is acceptable; evaluate `idb` only if transaction/migration code materially benefits and dependency approval is obtained.

Proposed files, fitted to existing directories:

- `public/site.webmanifest`: sole static manifest.
- `public/sw.js`: stable deployment URL for generated or copied SW output; authored source may live in `src/lib/pwa/service-worker.ts` if compilation is selected.
- `scripts/build-pwa.mjs`: deterministic post-export asset collection/build validation; integrate in the actual release build command.
- `src/lib/pwa/`: lifecycle, cache policy, messages, capability detection, storage schema, migration, offline session policy and sync coordination modules.
- `src/components/pwa-provider.tsx`, install prompt, update prompt and connectivity indicator; mount one provider in root layout.
- `src/app/offline/page.tsx`: generic offline recovery screen; no cached personalised identity in HTML.
- Existing exam persistence adapter: migrate behind its interface, not a parallel answer queue.
- `public/_headers`: explicit SW/manifest and verified static-asset headers.
- `tests/`: policy/unit, storage transaction, real browser integration and built-output checks.

## 5. Route-by-route behaviour

| Area | Online first visit | Connection lost while open | Offline cold launch/reload |
| --- | --- | --- | --- |
| Landing, privacy, terms, refund | Fresh generic public content | Previously cached version labelled when relevant | Public cached content if present; otherwise generic offline screen |
| Login, register, forgot/reset password | Current online auth flow | Stop submitting; preserve only non-secret form state in memory | Explain connection required; never replay auth requests or store passwords/recovery URLs |
| Onboarding/change subjects | Fetch ready subjects and current enrolment | Preserve unsaved selection in memory; save disabled/retry | No offline entitlement/catalogue decision; reconnect to edit |
| Dashboard/analytics/profile/referrals | Wait for current required response | Existing visible data may remain with stale/offline label | Release 1 shows offline screen; optional later owner-scoped read-only snapshot, no entitlement claims |
| Practice catalogue/start | Live catalogue, quota and atomic allocation | No new allocation without server | No new allocation; offer an already issued supported local session only after W05 gate |
| Issued practice session | Server feedback after answer acceptance | Queue first answer; feedback pending; don't reveal correctness | W05 can restore issued questions and local responses; grading waits for reconnection |
| Mock setup/start | Live blueprint readiness and entitlement | Failed/unknown start recovered with same idempotency key | Cannot start a new mock |
| Active mock | Freeze assigned form/deadline; save locally, sync remotely | Continue until deadline with truthful pending count | W05 restores validated local form in restricted continuation mode; no general account access |
| Mock result/review | Server-confirmed score and authorised review | Keep already rendered result with clear freshness state | Release 1 offline screen; optional later explicit same-actor saved result |
| Pricing/checkout/verification | Live price, gateway and server confirmation | Clear pending state; preserve reference securely for recovery | Connection required; never announce success from cache |
| Admin pages/import/media/blueprints | Online authenticated current data | Preserve committed receipt ID and uploaded-file resume instructions | Online-only message; no admin data or import queue in offline cache |
| Not-found/legacy routes | Existing canonical resolution and correct status | No arbitrary SPA fallback | Known cached generic shell or offline recovery; unknown paths must not become fake successful pages |

Whole-app PWA means every route has a defined install/offline/update behaviour. It does not authorise offline administration or offline purchases.

## 6. Manifest, brand and installation specification

Proposed manifest: `id: /`, name `JAMBPrep by LecternIQ`, short name `JAMBPrep`, `start_url: /?source=pwa`, `scope: /`, `display: standalone`, white background, current green theme, `lang: en`, `dir: ltr`, orientation `any` (do not lock out landscape/tablet use), education category, `prefer_related_applications: false`. Keep identity stable across releases. Start route uses existing authenticated redirect; launch must work for logged-out users too.

Icons: inspect existing 192/512 PNG and Apple icon; provide dedicated opaque-background maskable 192/512 exports with the actual mark inside the safe zone; keep `any` and `maskable` assets distinct where appropriate. Provide portrait/wide screenshots after real UI acceptance; never include a student's personal data or fabricated screenshots. Verify favicon and all manifest URLs at canonical and preview origins.

Add viewport safe-area support, keyboard-resize checks, dynamic viewport sizing and restrained theme metadata. Do not disable pinch zoom. Keep back/home/account controls available in standalone mode without browser chrome. OS splash screens are browser-generated; do not promise custom splash video or a permanent fullscreen mode.

Installation UX: optional button in profile/help and contextual non-blocking invitation after a useful study interaction. Feature-detect `beforeinstallprompt`; call the captured prompt only after a tap, clear consumed event, handle dismissal, listen for `appinstalled` where supported. Hide invitation in standalone mode. Proposed dismissal cooldown: 14 days, browser-local and non-sensitive. No install prompt during timed exams, payment verification, password recovery or active import. iOS gets current Share → Add to Home Screen instructions. WhatsApp/in-app browsers get an Open in browser instruction; no claimed ability to force an external browser. Desktop Safari gets Add to Dock guidance where applicable. Unsupported browsers retain the normal website. [S2, S3]

## 7. Caching contract: default deny, explicit allowlist

The Cache API can store responses despite HTTP no-store unless application logic prevents it. Enforce exclusions in code, not only headers. Never cache `Authorization` requests, non-GET requests, private APIs, tokens, user profile payloads, CSV files, webhook bodies or payment responses.

| Request | Proposed SW handling | Guardrails |
| --- | --- | --- |
| Content-hashed `/_next/static/` JS/CSS and local font assets | Cache-first for matching build assets | Explicit same-origin allowlist; successful expected MIME only; no API JSON or redirects |
| Brand icons and generic offline document | Precache revisioned assets | Small deterministic required list; installation atomic on required failures |
| Public landing/legal HTML | Network-first with bounded timeout, cached public fallback | Strip no query indiscriminately; exclude auth/payment/tracking-sensitive routes; retain SEO/404 status |
| Exported student route shell HTML | Initially network-first; optional precache after privacy/static-output audit | Shell must contain no personal data, answer keys or production credentials; this is shell availability, not authenticated access |
| Next client navigation/RSC/prefetch payloads | Network-only initially | Do not collapse `_rsc`/router headers into an HTML cache key; offline hard-navigation recovery to a verified matching shell if required |
| `/api/*`, Supabase endpoints, Paystack endpoints, admin documents | Network-only, no SW mutation queue | Return clear offline state; no cached 401/403/503 or synthetic success |
| Question media | Explicit session-bound approved origin/path allowlist if required | Size/MIME/expiry limits; no opaque cross-origin cache; unavailable asset placeholder |
| `/sw.js`, manifest and build metadata | Browser revalidation with controlled short/no-cache headers | Never serve SW itself through a cache-first application rule |

Use build-scoped cache names `jambprep-public-<buildId>` and strict app prefixes. Do not delete unrelated origin caches. Precache only essentials; don't fetch all admin chunks, every question image or entire bank at install. Generated dependency collection must cover route chunks, CSS, KaTeX fonts and other resources for supported offline sessions. Runtime budget proposed: 20 MiB public assets, 50 media objects/10 MiB; tune after actual export measurement. No guessed cache match may serve a wrong build.

Headers: `/sw.js` JavaScript MIME, `Cache-Control: no-cache, max-age=0, must-revalidate`; registration uses `updateViaCache: none`; root SW naturally has root scope. Manifest gets correct MIME and revalidation. Evaluate immutable one-year caching only for truly content-hashed files; generic HTML remains revalidated. Verify how overlapping Pages `_headers` rules combine and how the routing Worker forwards them. No blanket `/* → /index.html` fallback. [S8]

## 8. Private storage and shared-device protection

Use IndexedDB as a transactional durability layer, not as authorisation. Proposed database `jambprep-study`, integer schema versions and explicit upgrade migrations. Stores:

- `session_envelopes`: composite actor/session key; immutable issued questions/options/passages, subject ordering, server deadline/time sample, payload/schema/build compatibility, last acknowledged server revisions, state and local expiry.
- `answer_state`: actor, attempt/session, question, selected option or null, monotonic revision and locally saved time; no authoritative score.
- `pending_operations`: stable operation ID/idempotency key, actor/session/question revision, operation type, created time, attempt count, next retry, ack/terminal status; no bearer/refresh token.
- `reconciliation_receipts`: last accepted/rejected operation revision and safe reason; bound retention.
- `client_meta`: active actor marker, storage format and migration status; no password or copied Supabase token.

Write answer state, revision allocation and pending operation in one transaction; update UI's “Saved on this device” only after commit. “Synced” requires server acknowledgement. Reversals persist null as a real revision. Preserve question order on reload, not reselection from the bank. Validate payload shape, actor, expiry and content/schema version before restoring.

Migrate legacy localStorage under the same actor/attempt lock. Copy and validate in one IndexedDB transaction, read back, mark migration complete, then remove only migrated legacy keys. Crash mid-migration must resume without losing or duplicating an answer. Retain a backward-readable migration path until acceptance; never reset revision counters. Handle malformed data without silently treating it as no answers.

Storage estimate/persistence API is best effort. Catch quota, blocked upgrade and transaction failures. Evict public media/old shells before private unacknowledged answers. Never auto-delete an unresolved outbox due to age or cache pressure. Proposed acknowledged private-session retention: until successful close plus 24 hours; public asset retention is independent. Provide clear saved-study-data control and warning before destructive local clearing. Missing/evicted storage means honest recovery from server where available, not an invented restore. [S5]

Shared devices: logout/account switch immediately hides private UI; cancels in-flight writes; increments actor generation; closes locks; clears local private stores; informs all controlled clients. Extend existing cleanup registry. Keep public assets cached. Confirm remote sign-out behaviour when offline: local sign-out is immediate, server revocation requires connection; no automatic replay of arbitrary auth requests. Warn about unsynced work before user-initiated logout, but never preserve readable private content after confirmed logout. Same-origin client storage is readable through developer tools and vulnerable to XSS; obfuscation or a JavaScript-held encryption key is not access control.

## 9. Authentication and offline continuation boundary

Normal authenticated pages continue to require the existing live identity response. A restricted saved-session screen may display only a previously issued session, belonging to the current remembered actor and within a reviewed local access window. Proposed window: earlier of session deadline and 24 hours since last successful online identity check. It is a device convenience restriction, not cryptographic protection against device-owner tampering or a guarantee of prompt remote revocation while offline.

No offline opening of other accounts' history, administrator pages, new attempts or paid entitlement-dependent allocations. On reconnect, obtain a valid session through the existing manager, verify live identity and ownership, then sync. If auth expired, pause network sync and request reauthentication without discarding unresolved answers. If account differs, never send previous actor's operations. If revoked, lock access and purge according to the existing security policy; do not restore it from a cached 200.

Test browser tab versus installed app sessions independently on iOS; do not assume token storage transfers. Password recovery must work when the email opens in another browser context, present a usable recovery explanation if exchange cannot complete, preserve canonical redirects and never cache URLs containing `code`, tokens or recovery fragments. Keep this compatible with the existing recovery tracker. [S9]

## 10. Practice and mock integrity decisions

Online allocation remains mandatory. Server chooses a new form once with existing quotas/blueprints and freezes it. Offline UI uses that issued payload; all subjects/topics remain database-driven.

Practice: current server feedback is first-answer based. Queue exactly one first-answer intent per question while offline; don't allow repeated selection to invent mastery. Display “Answer saved on this device. Feedback will appear when you reconnect.” Do not ship full answer keys for instant offline marking. Completion waits for server confirmation; pending completion is distinct from a completed/graded session. Any future fully offline learning pack is a separately reviewed product feature with a disclosure/quota model.

Mock: clock uses issued server deadline plus last known server/client offset and monotonic elapsed time while open; visibility/resume recomputes, never decrements a counter that pauses in background. Reboot/device clock changes require conservative reconnect handling. At deadline stop new answer changes. User device timestamps are not proof of submission time.

Critical policy gate: existing server deadline enforcement remains unchanged by default. Work generated offline but arriving after deadline can be rejected. Show this risk before starting and warn prominently while offline near expiry. Before advertising resilient offline completion, either explicitly accept strict server-receipt rules or approve a server-verifiable, bounded late-delivery design with a documented cheating trade-off. A signed issued form alone does not prove when an offline answer was chosen. Do not quietly extend the deadline.

Replace any silent removal of expired/rejected outbox answers with terminal outcome handling and a reconciliation summary. Retry deadline-independent finalisation to retrieve server result, but never label rejected responses accepted. Freeze received answers, resolve pending submission idempotently and show the server's actual score. No zero/fake result while grading is pending.

Multi-tab: one actor/attempt writer using existing Web Locks; test installed window plus browser tab. Proposed unsupported-lock default is the current clear unsupported-browser message until a transactional fencing/lease fallback is proved. BroadcastChannel may improve UI coordination but cannot replace transactional integrity. If fallback added, test suspended tab, lease expiry, clock skew, takeover, stale writer and browser restart.

## 11. Synchronisation and connectivity state machine

States: booting → fetching required data → ready-online; ready-offline only for approved issued sessions; reconnecting → syncing → reconciled. Separate service-unavailable, auth-required, storage-failed, session-expired and unsupported states. Shimmer means waiting for a bounded request, not indefinite waiting offline.

`navigator.onLine` is a hint. Distinguish fetch/network failures, captive portals and real API errors. Trigger recovery on app focus, resume, online event and explicit retry; coalesce into one active drain. Don't add recurring health polling solely for a connectivity badge.

Foreground sync is baseline. Background Sync is optional after feature detection and only for operations whose credentials and semantics can be safely obtained; v1 does not copy Supabase tokens into SW storage. Missing background support means resume app to sync. Browser/OS termination can stop execution at any time. No background timer, forced keepalive loop or guarantee that closing the app submits an exam. [S4]

Use stable operation IDs, owner/session scope, monotonic revisions and bounded payloads. Coalesce latest unsent mock response per question; preserve immutable first practice response. Propose a batch API only after profiling proves value; never claim the current per-answer drain is already a batch endpoint. HTTP 401 pauses/revalidates; 403 stops forbidden work; 409 distinguishes revision/closed-session conflicts; 413 splits; 429 honours Retry-After; 5xx/network failures back off with jitter and stable intent. Bound foreground attempts and total queued bytes. Never busy-retry every answer independently.

For each ACK remove only that revision or older, preserving an answer changed during a request. Timeout after commit recovers by replay/reconciliation, not a new mutation key. Submission drains or reconciles allowed answers, then finalises once. Flags/interruption events need an explicit durable policy too; optional failed flag saving must not block graded answers. Export no answer payloads/tokens to logs.

## 12. App updates, deployment and rollback

Stable `/sw.js` URL, generated build identifier and storage-format compatibility range. New worker installs into a separate versioned cache. Downloading an update does not make it safe to activate. Don't unconditionally call `skipWaiting`, `clients.claim` or reload on `controllerchange`.

Show “Update available” on safe screens. During an active practice/mock, unsynced queue, checkout return, recovery flow or import, defer reload and activation. Collect blockers across all same-origin windows with client messages plus durable session/queue checks; missing/suspended clients are not automatic permission. Proposed safest first implementation lets the browser's normal waiting lifecycle handle active clients; deliberate activation only after all acknowledged clients are safe. Apply update after completion/sync or app close. Retain assets required by active supported clients and prove old lazy chunks still resolve after deployment; if the host removes old chunks, bundle required study assets up front or provide version-pinned archival availability. Keeping caches for two versions alone is not sufficient proof.

Messages are versioned and narrowly validated: `GET_VERSION`, `GET_UPDATE_STATE`, `APPLY_UPDATE_WHEN_SAFE`, `CLEAR_PRIVATE_STATE`; validate source client belongs to origin, payload shape and build compatibility. Never accept arbitrary URL fetch/cache/delete or privileged API commands from message data.

Rollout: preview origin with separate SW scope/cache → internal real-device group → small production cohort where feasible → general invitation. Disabling registration does not remove already installed SW. Prepare a same-URL rescue worker that activates deliberately, relinquishes interception, preserves private outbox data and deletes only owned public caches after compatibility checks. Rehearse rescue when users have old controlled tabs; offline devices only receive it after reconnect. Keep Pages artifact and previous SW available for rollback. No API Worker replacement is needed for install-only work; any storage/queue endpoint changes are a separate additive backward-compatible release.

## 13. Whole-app UX and accessibility

Keep current logo-only full-page loading through session bootstrap; use neutral shimmer for data fetch. Reveal the meaningful screen after all required resources settle successfully. On failure, render actionable retry/error; on offline, explain supported offline work instead of endless shimmer. Optional sections can have their own labelled skeleton and independent failure states without blocking the whole dashboard forever.

Persistent but compact status: “Offline — answers saved on this device”, “Syncing 3 answers”, “All answers saved”, “Reconnect to confirm submission.” Do not imply device-only save reached Supabase. Pending-payment and pending-score screens are explicit.

Support safe areas, portrait/landscape, keyboard covering fields, 200% zoom, screen-reader names, reduced motion, focus return after dialogs, visible offline indicator without relying on colour and touch-sized controls. Install/update prompts are non-modal unless there is an actual blocking action. Use a polite live region for status changes, not an announcement per timer second. Retain subject-scoped question numbering and current share flows. Installed window must support navigating back from results, payment verification and policy pages.

Standalone mode is not exam fullscreen. Feature-detect fullscreen and retain Standard mock on unsupported iPhones. Existing monitoring copy must stay truthful; a PWA cannot inspect other apps or prove no cheating.

## 14. Optional notifications and platform integration

Push is not required for initial PWA release. Later opt-in reminders could support study routines, with editable consent, quiet hours/timezone, per-device unsubscribe, frequency caps and user ownership. Never request notification permission at launch, never send mock scores/private question text on lock screens by default. iOS requires an eligible installed Home Screen app and permission requested from a user action. [S3]

If approved later: additive private push-subscription table, protected registration/deletion endpoints, VAPID private key only server-side, bounded delivery jobs, stale-subscription cleanup, account-switch detachment and destination allowlist. Review Web Push library compatibility with Worker runtime; don't copy Next server actions or store subscriptions in module memory. Web Push does not require a native app subscription, but sending/storage still consumes provider resources. Don't use Push as a timer, guaranteed deadline reminder or keepalive.

Web Share remains progressive enhancement with clipboard/WhatsApp-link fallback. Share content must use canonical public URLs and never include private attempt IDs or tokens. No share-target, contacts, camera, microphone, file-handler or app-store packaging is required now. Each can be evaluated separately if requested.

## 15. Performance, cost and observability

PWA benefits repeat asset downloads and resilience; it does not increase Supabase compute or Worker daily quotas. Existing routing proxy can still incur Worker invocations for uncached static traffic. Audit direct Pages domain routing independently; don't hide a domain migration inside service-worker work.

Proposed budgets for validation, not measured claims: no private API cached; zero periodic idle polling introduced; required precache <=2 MiB compressed initially (adjust with actual route/font evidence); runtime caches bounded; one active sync drain per actor/session; no whole-bank download; app-to-SW startup must not block first paint. Track cold and warm transferred bytes, cold/warm/offline launch time, API requests per session, database queries where measurable, device persistence latency and storage usage on budget Android.

Local privacy-safe counters: build/worker version, installation availability, cache/install failure reason, update deferral, queue count/oldest age, sync outcome and storage failures. Send only sampled aggregate telemetry after consent/policy review; no extra event per question. Offline event buffering also needs a cap. Ten-thousand-user capacity remains a separately measured infrastructure question.

## 16. Acceptance matrix and release blockers

Automated tests must exercise actual production export over a browser service-worker-capable origin. Mocked unit adapters alone do not prove install/offline/update behaviour. Existing no-browser-testing constraints, if still applicable to the execution session, must be resolved before claiming browser acceptance; never infer approval from this document. Manual iPhone tests remain necessary.

Required scenarios:

1. Fresh uncached visit; valid manifest/icon MIME and paths; installation, cancelled install, already installed; normal browsing without SW support.
2. Chrome Android, Edge/Chrome desktop, physical iPhone Safari and Home Screen, Safari Add to Dock where available, Firefox browser fallback, WhatsApp in-app browser instructions; record OS/browser versions.
3. Cold offline launch after first controlled load; first-ever offline visit; deep links with query/trailing slash; offline unknown route; online real 404; redirects/canonical preserved.
4. Throttled identity and page requests: no flash of guest/pricing/default counts; full required data before reveal; one request failure; response timeout; captive portal; online event while API is still unavailable.
5. Start mock online; answer offline; switch subjects; reload; kill/reopen; receive call/background/lock phone; reconnect before and after deadline; device clock change; no extra exam time.
6. Practice first-response queue and pending feedback; no leaked keys; Free daily slot/Pro expiry/subject change still enforced server-side; no offline new session.
7. ACK lost after commit; duplicate delivery; out-of-order revision; answer reversal; new answer during drain; 401/403/409/413/429/503; no double grading, mastery, referral reward or payment.
8. Two tabs and standalone window; lock unavailable; account A logs out and B signs in; old request arrives late; remote revoke; reset link opens another context; no cross-account private data.
9. Storage unavailable, quota exceeded, eviction, corrupted legacy JSON, upgrade blocked by open old connection, crash between migration stages; never display “saved” after failed persistence.
10. Update available during each critical flow; old route lazy chunk after new deploy; safe update on idle screen; old API client compatibility; rescue worker and rollback; no destructive clearing of unsynced work.
11. Paystack checkout opens external context; callback keeps reference and canonical domain; app session absent; verify retry/pending; never cache or replay financial requests.
12. Admin import survives existing receipt/resume path with network required; no admin JSON/CSV cached; user can still sign out under failure.
13. Accessibility and performance checks with animation disabled; compare cold/warm bytes and request counts to baseline. No blanket Lighthouse score substituted for functional acceptance.

Release blockers: privacy leak; unacknowledged data loss; mocked grading; deadline bypass; repeated login loop; API responses cached; forced exam reload; broken fresh install/normal web navigation; undocumented dependency or schema change; no rollback evidence.

## 17. Delivery sequence and decision gates

Release A: reconcile login/loading baseline, manifest/install UX, SW public assets/offline page, safe lifecycle and rollback. Claim installable + offline explanation only; existing open-tab mock resilience remains as currently validated.

Release B: transactional private storage, migration, restricted issued-session offline resume, foreground sync/reconciliation and deadline policy acceptance. Claim offline study continuation only after real-device and expiry tests pass.

Release C (optional): notifications, saved read-only results, offline learning packs and app-store packaging, each with separate product/security/cost approval. Do not expand Release A to include all of these.

Implementation gates to settle: SW tooling/dependency choice; actual min supported browser versions; strict deadline versus separately reviewed late-sync policy; offline private-data window/retention; offline practice feedback scope; optional push; provider request allowance and device availability for release verification. Use recommendations here to draft concrete options, not repeated permission requests for routine reversible code work.

Detailed IDs, dependencies and completion evidence are in `pwa-transformation-tasklist.md`. Keep every item unchecked until its specific acceptance evidence exists. Planning completed does not mark implementation complete.

## 18. Primary sources and course mapping

Researched 17 October 2026. Compatibility may change; recheck relevant API support at implementation. The copied material is input, not authoritative evidence for current support.

- S1: Next.js PWA guide — https://nextjs.org/docs/app/guides/progressive-web-apps (manifest/lifecycle patterns; adapt server examples to native API).
- S2: MDN installability — https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable (installation requirements and browser-specific paths).
- S3: WebKit Web Push — https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ (Home Screen notifications and user gesture).
- S4: MDN Background Sync — https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API (limited availability; optional delivery).
- S5: MDN storage — https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria (quota/eviction/persistence).
- S6: Workbox build — https://developer.chrome.com/docs/workbox/modules/workbox-build (`generateSW` versus `injectManifest`).
- S7: Serwist Next integration — https://serwist.pages.dev/docs/next (candidate integration, not an installed dependency).
- S8: Cloudflare Pages headers — https://developers.cloudflare.com/pages/configuration/headers/ (static delivery header configuration).
- S9: Supabase advanced auth — https://supabase.com/docs/guides/auth/server-side/advanced-guide (session/refresh/PKCE considerations).
- S10: MDN skipWaiting — https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/skipWaiting (worker activation implications).
- S11: web.dev updates — https://web.dev/learn/pwa/update (app/asset/worker update lifecycle).
- S12: WebKit Safari 17 — https://webkit.org/blog/14445/webkit-features-in-safari-17-0/ (desktop web app support).
- S13: User-supplied course — https://web.dev/learn/pwa (reference curriculum).

Course-to-plan map: foundations/app design → sections 1, 5, 6, 13; assets/caching/serving → 7; service workers/Workbox → 4, 7, 12; offline data → 8–11; installation/manifest/prompt/detection → 6; updates → 12; enhancements/OS/windows → 13–14; architecture/complexity → 4, 9–11; tools/debug → 15–16; experimental capabilities → optional Release C only.
