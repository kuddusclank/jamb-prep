# JAMBPrep PWA implementation tasklist

17 October 2026. Specification: [PWA transformation plan](pwa-transformation-plan.md).

Status: implementation started 17 October 2026. First public-shell foundation is local; no PWA production deployment. `[x]` requires linked code plus relevant test/manual evidence; a generated manifest or green build alone cannot establish offline correctness. Follow existing server entitlement, grading, privacy and deadline rules unless a specific replacement is approved.

## Release A — installation, public offline shell and safe updates

### W00 — baseline and tooling decision

- [ ] Reconcile current pending login/account-navigation/shimmer fixes; preserve unrelated work and record exact commit/build baseline.
- [ ] Reproduce a full login → dashboard → change combination → save → return journey; identity/data are complete before reveal, with bounded retry/error.
- [ ] Inventory exported HTML, navigation/RSC files, route chunks, CSS/fonts, images, query deep links and canonical redirects. Scan shell content for private data/answer keys.
- [ ] Inspect actual icons/dimensions and Pages/routing headers; enumerate existing SW registrations on the target origin without deleting them.
- [ ] Record supported device/browser versions, including physical iPhone and budget Android; list unsupported capabilities and product fallbacks.
- [ ] Compare small native SW + generated manifest with Workbox injectManifest; prove webpack export and development behaviour. Evaluate Serwist only with exact-version evidence.
- [ ] Record dependency decision; obtain approval before adding packages. No framework migration or generic cache plugin defaults.
- [ ] Capture cold/warm bytes, route latency, answer sync requests and existing storage size as baseline; no unapproved production load generation.

Acceptance: reviewed file/route inventory, explicit chosen tool and build integration, no changes to existing assessment/commerce rules. Depends: none. Blocks: all following work.

### W01 — manifest and installation assets

- [ ] Update the existing sole manifest: stable id, scope, proposed start URL, standalone display, name/description/lang/dir/theme/background/category.
- [ ] Reuse official LecternIQ mark; produce/verify ordinary and dedicated maskable icons plus Apple icon; validate safe zones and opaque background.
- [ ] Confirm root metadata/viewport and no duplicate manifest links; preserve current SEO/canonical/noindex rules.
- [ ] Add privacy-safe real UI screenshots if install presentation benefits; manifest shortcuts only to safe generic routes, never private attempt IDs.
- [ ] Validate static export outputs/MIME and all asset URLs at preview/canonical origins; keep install identity independent of build number.

Acceptance: actual install launches the correct origin and icon in standalone mode; normal website remains usable. Depends: W00.

### W02 — explicit service-worker cache policy

- [ ] Add authored worker/source and deterministic export integration. Stable `/sw.js`; versioned public caches and essential asset manifest.
- [ ] Register one provider with feature detection, production/preview isolation and `updateViaCache: none`; disable registration in normal development.
- [ ] Implement default network-only handling; reject caching non-GET, Authorization, API/Supabase/Paystack/admin/auth/recovery requests and inappropriate MIME/status/redirects.
- [ ] Precache generic offline screen/brand essentials and measured required public dependencies; no bank download or admin bulk assets.
- [ ] Distinguish HTML, Next RSC/prefetch and immutable chunks; no catch-all SPA fallback, query token leakage or broken 404.
- [ ] Implement bounded public/runtime/media caches and app-prefix-only cleanup; do not clear private answer state.
- [ ] Add verified SW/manifest/hashed-asset headers and prove routing Worker forwards expected status/MIME; no auth redirect on worker script.
- [ ] Handle first-ever offline launch, failed installation, no SW support, partial assets and corrupt cache gracefully.

Acceptance: built-output and real browser tests prove private exclusion, cached public reload, offline fallback, bounded caches, correct deep links and 404. Depends: W00/W01.

### W03 — install, loading and connectivity UX

- [ ] Add optional installation entry in profile/help and contextual invitation after useful study interaction.
- [ ] Handle captured install event, one-shot prompt, dismissal cooldown, installed detection and unsupported fallback; no nagging during critical flows.
- [ ] Provide current iOS Share/Add to Home Screen, supported macOS Add to Dock and WhatsApp in-app Open in browser instructions.
- [ ] Keep logo loading until auth resolves; shimmer while required page data resolves; explicit timeout/error/offline instead of endless shimmer or placeholder totals.
- [ ] Add compact connectivity/sync state with truthful device-saved versus server-synced wording; no permanent health polling.
- [ ] Verify navigation/back/home, safe areas, keyboard, landscape, 200% zoom, touch targets, reduced motion and screen-reader announcements in standalone.

Acceptance: delayed/failing responses don't expose incomplete data; dismissible install guidance behaves correctly across browser and installed modes. Depends: W01/W02.

### W04 — safe update, version compatibility and rescue

- [ ] Generate build identity and compatibility metadata; don't use unconditional skipWaiting/claim/reload.
- [ ] Define blockers: active mock/practice, unsynced operations, checkout return, password recovery and active import.
- [ ] Coordinate all clients plus durable pending state; suspended/unresponsive client is a deferral, not assumed consent.
- [ ] Show deferred update UI and explicit safe apply; allow natural waiting activation when clients close.
- [ ] Verify old route/lazy chunk availability after deployment; retain/warm all required active-session assets or introduce proven version-pinned availability.
- [ ] Validate narrow versioned SW messages and trusted source clients; don't allow arbitrary cache/network commands.
- [ ] Rehearse same-URL rescue worker, previous Pages artifact rollback and reconnect behaviour; preserve private unsynced answers.

Acceptance: update does not interrupt a critical flow; old and new clients remain functional; rescue works on previously controlled browser. Depends: W02/W03.

### A-GATE — installable release acceptance

- [ ] W00–W04 complete; actual Android install and iPhone Home Screen launch tested; unsupported web path tested.
- [ ] No claims of offline session reload or offline new allocation yet; offline page explains current capability.
- [ ] Private cache inspection, production-export smoke, regression suites and rollback evidence recorded.
- [ ] Preview/internal cohort passed; provider publishing/check allowance confirmed before external operations.
- [ ] Publish accepted artifact, verify canonical SW/manifest/HTML headers and bounded installation checks; record release/previous IDs.

## Release B — durable issued-session continuation

### W05 — policy and offline state contract

- [ ] Approve scope: existing issued practice/mock only; no new offline attempts, admin operations, purchases or entitlement changes.
- [ ] Resolve strict server deadline versus separately reviewed late-delivery design; define user wording before advertising offline completion.
- [ ] Accept restricted offline private access window/retention and shared-device implications; storage is not authorisation.
- [ ] Define practice feedback policy: queue first answer, pending server feedback; no keys shipped for offline grading.
- [ ] Specify offline boundary states so restoring a saved session cannot unlock normal protected pages without live identity.
- [ ] Specify server/local time offset, suspend/reboot/clock-change handling and deadline reconciliation; no device timestamp trust.

Acceptance: recorded decisions and exact state/DTO contracts, no silent relaxation of quota or grading. Depends: A-GATE.

### W06 — transactional IndexedDB persistence and migration

- [ ] Implement versioned session, answer, operation, receipt and metadata stores; owner/session indexes and explicit payload validation.
- [ ] Persist answer/reversal + monotonic revision + outbox intent atomically; UI acknowledges device save only after commit.
- [ ] Persist safe issued payload/order/passages/media references/deadline/build schema; exclude credentials and unreleased answer keys.
- [ ] Add Web Lock-backed legacy localStorage migration, copy/readback/commit marker/removal ordering and crash recovery.
- [ ] Handle corruption, QuotaExceededError, blocked upgrade, failed transaction, persistence refusal and storage eviction.
- [ ] Evict replaceable public assets first; no expiry-based deletion of unresolved answers; add explicit data-control UX.
- [ ] Keep storage migration compatible with old clients during rollout or defer until safe client update.

Acceptance: transaction/crash/reversal/ACK-race/migration tests prove no silent loss or revision reset. Depends: W05.

### W07 — auth, logout and cross-window isolation

- [ ] Extend private cleanup registry to IndexedDB and app/SW state; keep public caches.
- [ ] Prevent stale reads/writes repopulating data after logout or actor change; cancel drains and release locks.
- [ ] Broadcast state changes to tabs/installed windows and purge/hide old private state; no next-user replay.
- [ ] Handle expired session via reauth without unnecessary data loss, remote revoke explicitly and offline local logout truthfully.
- [ ] Validate installed-app versus browser storage differences and recovery email opening in another context; no recovery token caching.
- [ ] Maintain existing Web Locks safe failure or prove transactional fencing fallback before widening browser support.

Acceptance: actor A→B, logout during drain, stale ACK, revoke and two-window races pass; no secret in SW/IDB/telemetry. Depends: W06.

### W08 — foreground sync and terminal reconciliation

- [ ] Adapt existing engine persistence interface; one queue/one drain, no second independent mutation replayer.
- [ ] Stable idempotency/revision semantics; latest unsent mock response coalescing and immutable first practice response.
- [ ] Retry on focus/resume/online/manual action with bounded exponential backoff/jitter and Retry-After; don't trust online hint alone.
- [ ] Handle 401/403/409/413/429/5xx and timeout-after-commit; remove only acknowledged or explicitly terminal revisions.
- [ ] Replace current expired-answer discard with receipt/outcome reconciliation; distinguish rejected from saved/graded.
- [ ] Persist completion intent; finalise once after permitted drain/reconciliation; pending result UI until server confirmation.
- [ ] Decide durable flags/interruption policy without blocking answer saving unnecessarily.
- [ ] Profile per-answer drain; design bounded batch endpoint only if justified and separately reviewed for ownership/deadline/partial-ACK correctness.
- [ ] Background Sync only optional enhancement with a safe auth design; never persist bearer/refresh tokens in worker outbox or promise closed-app delivery.

Acceptance: duplicate/out-of-order/lost ACK/expiry/throttle/network recovery preserve server results and truthful UI. Depends: W06/W07.

### W09 — practice and mock offline restoration

- [ ] Cache/warm all public dependencies needed for supported offline session routes and recover client navigation safely.
- [ ] Restore matching issued session after offline reload in restricted boundary; validate actor, schema, deadline and available assets before rendering.
- [ ] Keep subject ordering, subject-scoped numbering, selections/reversals/flags where supported and pending sync state.
- [ ] Practice offline answer saved, server feedback pending; no fake score or confidence update.
- [ ] Mock timer catches background/resume; deadline freezes edits and reconciles actual server result; clear near-expiry offline warnings.
- [ ] If payload/storage/identity cannot be safely restored, show specific recovery action and protect pending work.

Acceptance: real device offline/kill/reopen/reconnect before/after expiry and simultaneous tab scenarios pass without new allocation or leaked grading keys. Depends: W04–W08.

### B-GATE — resilience release acceptance

- [ ] Full acceptance matrix in plan section 16 executed against production export; record device/browser versions and actual results.
- [ ] Lost/deadline-rejected work clearly reported; no incorrect saved/graded state; Free/Pro and blueprint regressions pass.
- [ ] Installed Paystack return/recovery, shared-device isolation, migration failure and old-client/update/rescue exercised.
- [ ] Measured bytes, request counts, persistence latency and storage budgets compared with baseline; no capacity guarantee inferred.
- [ ] Preview/internal release accepted; additive API changes deployed compatibly if needed; publish/verify with approved provider operations and rollback snapshot.

## Release C — optional later capabilities

### W10 — optional notifications

- [ ] Product/consent/privacy/frequency/quiet-hour decisions approved; no forced permission prompt.
- [ ] Verify actual platform support and installed iOS requirements; unobtrusive unsupported path.
- [ ] Private per-user/device subscriptions and owner-scoped endpoints; Worker-compatible Web Push delivery, server-only VAPID secret.
- [ ] Bounded delivery, expired subscription removal, logout/account-switch detachment and safe notification destinations.
- [ ] No sensitive scores/questions on lock screen by default; no exam deadline guarantee; measure request/storage cost.

### W11 — optional saved results/learning packs/store packaging

- [ ] Explicit scope and data retention for read-only saved results; no private Cache API responses.
- [ ] Offline learning packs require separate question disclosure/licensing/expiry/quota and marking design; not automatic bank download.
- [ ] App-store distribution only on explicit request after applicable store/payment-policy research; no need for installable web launch.

## Execution rules and evidence

- Work serially through dependencies; do not start Release B's private caching before W05 decisions.
- Record task ID, changed files, test command/result, simulated versus real-device evidence, measured budgets, limitations and rollback location in this file as work completes.
- Don't spend production requests on tests that can run locally. Provider reads/writes and load checks must fit a current explicit allowance; planning research does not extend old caps.
- Don't bundle unrelated dirty source or an older Worker baseline into a PWA deploy. Build accepted source and retain previous artifact/version identities.
- Product approval of this plan starts implementation scope; it does not mark open policy decisions answered or optional Release C approved.

## Implementation evidence — 17 October 2026

- User instructed: publish previous fixes and start PWA. Approved 20 provider operations for login/loading publication and checks. Pages deployment `9a3e2265`; canonical login HEAD returned 200; 32 auth/navigation regression tests passed. No hosted signed-in flow acceptance claimed.
- W00 partial: native browser SW chosen, no dependencies added. Current installed Next.js PWA/viewport documentation reviewed. Separate `build:pwa` command runs webpack static export and deterministic post-export worker build. Standard unprocessed SW template fails installation closed, so a plain Next build cannot accidentally install an unversioned worker.
- W01 partial: existing manifest now standalone, stable `/` identity/scope, canonical-relative start, current icons, orientation/language/category. Actual maskable icons and device installation remain pending.
- W02 partial: `public/sw.js`, `public/offline.html`, `scripts/build-pwa.mjs`, explicit headers. Essential assets only; runtime public assets capped at 32 entries/512 KiB each, never API/auth/payment JSON. Navigation failures show generic offline page; documents are not cached; admin/API bypass. Cache failure preserves network availability. No offline private-session restoration yet.
- W03 partial: root PWA provider supports captured install event, manual Apple instructions, standalone detection and dismissal cooldown; prompts only on landing/dashboard/profile. No new idle polling.
- W04 partial: natural worker waiting lifecycle, no skipWaiting/clients.claim/controllerchange reload. Deferred update notice asks users to finish/sync before closing windows. Cross-version lazy asset availability and rescue worker still pending; not release accepted.
- Verification: `node --test tests/pwa-foundation.test.mjs`: 8 passed (VM-injected SW/cache adapters, not actual browser installation). `npm run build:pwa`: all 39 static routes and TypeScript passed. Post-export generation rerun after cache-failure handling correction. `git diff --check` passed.
- Next: maskable icon validation, actual browser/physical iPhone install/offline/update checks, safe rescue/version compatibility, then A-GATE. Do not mark whole W00–W04 complete or publish PWA until acceptance evidence exists. Release B policy/storage work is still pending.

## Foundation publication — 17 October 2026

User explicitly requested deployment, approved 20 further provider operations, and reported local sign-in works. Published Pages `7bf5fd6e`, build `7b32065fa76da6417096`; previous artifact `9a3e2265`. Four canonical HTTP checks passed: standalone manifest, versioned SW, matching build metadata, onboarding edit document. No API Worker replaced.

Also corrected the reported English-only onboarding flash: `onboarding-wizard.tsx` waits for its complete catalogue/preferences/enrolment response, with shimmer/retry while pending. Actual isolated local Chromium with injected Supabase session/API fixtures validated both new-user and existing-user delayed responses; no production account created.

40 local regression tests pass, production static export/TypeScript passes. Actual local Chromium verified SW-controlled reload, offline document fallback, online recovery and no private API response in caches; remote traffic blocked during these checks. Emergency network-passthrough rescue artifact prepared at `/tmp/jambprep-pwa-rescue/sw.js`, install/activate VM test preserves unrelated/private storage. A Pages rollback alone does not remove installed service workers: overlay the rescue at `/sw.js` in the accepted public build when recovery is needed; do not clear unresolved study data.

This is a deliberately scoped foundation publication at the user's request, not acceptance of every A-GATE/W00–W04 item. Physical iPhone installation, maskable icon refinement, cross-version browser update/rescue testing and full offline study remain pending. Do not advertise offline new session allocation or offline grading.

## Subject catalogue recovery — 17 October 2026

Read-only production SQL using the exact selector found 25 mock-ready subjects; production Worker settings/Hyperdrive reads confirmed the same Supabase project. Local restored preview database returned zero ready subjects. This explains an empty local installation; the user's installed origin/session was not independently inspected, so do not assert that every reported production symptom was reproduced.

`loadOnboarding` now rejects empty/incomplete choices rather than caching a usable form. Wizard stays in actionable retry state; local preview errors link to the canonical live subject selector. New regression proves failed catalogues are not cached and a later full response recovers. Real local Chromium injected-empty-catalogue test verified no English-only form and the live recovery link. Total 41 regression tests and the build pass.

Publication: shared `out/` was replaced by another local build before initial publication `0d225fe8`; detected immediately (missing build metadata/unprocessed worker). Rebuilt with `build:pwa` into immutable copy `/tmp/jambprep-reviewed-pwa-afr2muxl/out`; corrected production deployment `48dea17b`, build `366dbc27390aba5b1be7`. Canonical SW and build metadata independently matched. Default npm build now also runs PWA post-export generation. Future publications must use an isolated verified artifact. Database content unchanged.
