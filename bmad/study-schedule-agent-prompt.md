# Handoff prompt: implement Premium Schedule

Copy the following instruction to the implementation agent.

---

Implement JAMBPrep's **Premium-only Schedule** feature in:
`/Users/akanbiabdulquddus/Developer/LecternIQ/jambprep`

Read applicable AGENTS.md/rules and the installed Next.js documentation before edits. Then read:
1. `bmad/study-schedule-and-reminders-plan.md`
2. `bmad/study-schedule-and-reminders-tasklist.md`
3. Current PWA plan/tasklist and the actual code they reference.

Use the Schedule tasklist as the work ledger. Start at S00 and proceed through dependencies. Inspect actual current source, package versions, dirty files, schema and deployed topology; other agents have been working here. Preserve unrelated changes. This is the JAMBPrep Next.js/native Worker app, not the parent Laravel school-website product.

Confirmed feature:
- Schedule section in Account/My profile.
- Premium user activates it, chooses daily study goal and a daily reminder time.
- Show server-derived daily progress and current/best study streak.
- PWA Web Push notifications on supported opted-in devices, including when app UI is closed.
- **Free users cannot activate Schedule, new goal/streak tracking or reminders.** Retain read-only earned history after expiry and always allow disabling/unsubscribing without payment.

Proposed defaults are explicitly marked in the plan: question-based goal10/day,5/10/15/custom, one reminder, Lagos timezone default with IANA handling, skip when goal met, short delivery TTL. Use documented reasonable judgement on reversible details; surface unresolved material product/security/price decisions before dependent implementation. Do not silently treat proposed rules as user-confirmed historic requirements.

Architecture requirements:
- Server-side UTC scheduler → authenticated/owned due records → standard Web Push/VAPID → existing service-worker push handler.
- Never use a browser timeout/interval/Periodic Background Sync as an exact closed-app daily alarm.
- Extend the existing root SW; preserve fetch/cache/offline/update/rescue behaviour. No second root worker or forced reload during active exams.
- Prefer dedicated scheduler Worker to isolate API latency. Cloudflare Cron is UTC. Indexed next_due claims, revisions, short leases, logical occurrence/device unique constraints and bounded retries.
- Provider acceptance is not proof of delivery/read. Exactly-once OS delivery is not guaranteed after uncertain provider response; minimise duplicates with receipts/tag/TTL and state limitations.
- Measure free-runtime CPU/subrequests and clustered peak backlog; do not promise10,000 simultaneous reminders from a tiny batch. Request approval before adding dependencies, new paid resources or provider operations outside a current allowance.
- Private VAPID key is a Worker secret; public key only in frontend. Validate push endpoints/keys against SSRF/open-relay abuse. No secrets or raw endpoint/key data in logs/docs.

Goals/streaks:
- Integrate committed accepted answers for practice AND mock, with unique distinct question/day events and server timestamps.
- Correctness isn't required for study credit. No replay/review/skip/page-open credit or mutable client streak counters.
- Freeze daily target/timezone; goal changes next day by proposed policy. Current streak ending yesterday survives while today remains unfinished; missed dates break it. No fake historical/offline backfill.
- Recheck authoritative Premium for protected endpoints, live accrual AND actual send. Expiry/refund/revoke stops activity/sends; preferences/history retained. Renewal doesn't invent missed streak days.

UX:
- Locked Free card, clear Premium settings, complete loading/shimmer/error handling.
- Goals remain usable for Premium even when push is denied/unsupported.
- Permission only after an explicit Enable notifications tap; iPhone requires eligible Home Screen installation. Document device/network/Focus limitations.
- One generic private lock-screen message, safe canonical click destination; don't navigate an active exam window away.
- Multi-device consent and logout/account-switch ownership must be tested; no unsolicited notifications to existing users.

Verification:
Implement meaningful regression tests for Premium ownership/expiry, goals/day boundaries, streak rules, replay/concurrency, subscription abuse, scheduler races/retries and SW push/click/cache behaviour. Run actual static/PWA build and typechecks. Record simulated versus real Android/iPhone acceptance honestly; a mocked showNotification call is not a real push delivery test.

Deliver incrementally with code/test evidence in BMAD. Do not change questions/blueprints, existing quotas, pricing/Paystack or build the separate school/weekly/vocabulary roadmap. Do not deploy an old `.open-next/worker.js` over the production API/router. Don't publish from shared mutable `out/`: create and verify an isolated final artifact. Migration, production publishing, scheduled triggers, secrets and test messages require scoped approval/allowance; prepare everything locally first and ask only when necessary. Never send me or other users a test notification without explicit permission for that device.

Final report: completed S00–S07 items, changed files, tests/build, exact sender/runtime choice, supported browsers/device evidence, measured capacity limits, remaining decisions and whether anything was actually deployed. Leave incomplete gates unchecked.
