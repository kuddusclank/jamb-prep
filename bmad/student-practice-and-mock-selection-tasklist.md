# Practice and mock enhancement tasklist

13 October 2026. Status: plan only. Specification: student-practice-and-mock-selection-plan.md. Unchecked means not implemented/accepted. Existing deployed behaviour remains until a tested rollout. Confirmed Free policy is one 5/10/15-question session per WAT day, including when only five are chosen; Pro has unlimited sessions. The proposed overlap/confidence/difficulty policies are not yet user-approved constants.

| Done | ID | Work package | Dependencies and acceptance evidence |
| --- | --- | --- | --- |
| [x] | P00 | Source/readonly bank audit and primary-source research | 667 ENG published, 666 options/explanation eligible, 146 possible reading-text items; CHM target topic has one; electives 15–18; 2026 JAMB English structure verified from official indexed material. No claim of 2027 prescription or hosted signed-in QA. |
| [ ] | P01 | Contract and content inventory reconciliation | Enumerate legacy session/answers, malformed/test content, group memberships, duplicate families, chapter/text scope and blueprint coverage. Distinguish current statistics from proposed confidence. Pin current exam cycle; no blind deletion or recategorisation. |
| [ ] | P02 | Additive schema and migration rehearsal | Versioned blueprint/group/reading-work classifications, exposure/evidence, daily session claims and manifest. RLS/server-only tables; unique claims/events; restore rehearsal; metadata repair; reconcile existing daily allocations/legacy aggregates and preserve scores/snapshots. |
| [ ] | P03 | Dynamic practice catalogue and URL contracts | One owner-scoped catalogue endpoint, active enrolled subjects/topics, parent descendants, availability, confidence and daily entitlement. Exact CHM link resolves but clearly reports one-item shortage. Aliases unambiguous; subject switch resets topic; back/forward works; new database topic visible without build; omit topic=undefined. P01/P02. |
| [ ] | P04 | Subject → topic → batch-size UI | Accessible searchable choices, weak/provisional/strong labels with sample/coverage, unknown at end, availability and disabled unsupported 5/10/15 counts, loading/retry/mobile states. No hidden topic, dummy strength or automatic unrelated fallback. P03. |
| [ ] | P05 | Server quota, exact allocation and resumable sessions | Enforce 5/10/15, both tiers can focus topic; Free one successful allocation/day across subjects, Pro unlimited. Exact bank checks consume nothing on failure; idempotent snapshots. Owned resume/completion/abandonment, explicit session IDs, account purge; eliminate questionId Map and handle simultaneous starts/midnight/upgrade. P02/P03. |
| [ ] | P06 | Real response evidence and confidence pipeline | Unique first-score events, practice and mock attribution, repeated-review/omission separation, reliable historical replay without double counts, configurable evidence thresholds and difficulty breakdown. Remove unvalidated point-gain predictions; unknown is unknown. P02/P05. |
| [ ] | P07 | Portal integration and product copy | Dashboard/analytics/results/practice links and strength displays, onboarding changes, plan limits and recovery messaging, pending/expired sessions; audit every link using confirmed catalogues. Include independent Load failed/CORS/timeout reproduction with safe retry evidence. P03–P06. |
| [ ] | M01 | Content-role, group and cycle admin tooling | Explicit group types/ordered gaps, pinned prescribed work/chapter data, reviewed role/topic/descendant mapping, CSV compatibility and editorial readiness. Quarantine confirmed QA content without losing old snapshots. Admin-readonly report explains which cells are short. P01/P02. |
| [ ] | M02 | Reviewed versioned English/elective blueprints | Configure 5 comprehension +10 cloze +10 reading text +5 interpretation +5 antonyms +5 synonyms +10 completion +10 oral =60. Other enrolled subjects40 via their own database configs. Annual source approval; proposal review for difficulty/overlap policies. No source-code topic/book arrays. M01. |
| [ ] | M03 | Constrained random allocation and freezing | Seeded PostgreSQL sampling, coherent group selection, global uniqueness, declared difficulty/exposure relaxation, cell/work/cycle checks, immutable manifest and private keys. Fail cleanly on incomplete bank. Resume is identical. P05/M02. |
| [ ] | M04 | Readiness, variation and score integrity tests | Pool/overlap feasibility, repeat-group limits, no option-reference corruption, key confidentiality, rejection of wrong cycles and malformed groups, per-cell deficits. Real SQL matrices and local statistically bounded repeat/coverage simulations; no production fixtures. M03. |
| [ ] | R01 | Complete local/staging/manual acceptance | Affected UI tests, real concurrent PostgreSQL claims/events and rollover, static export/type checks, Safari/iPhone keyboard/touch/reload/offline recovery, replay/ownership/security negative tests, CPU/latency. Use remaining authorisation conservatively; obtain a new budget if required. P07/M04. |
| [ ] | R02 | Controlled publication and rollback | Verified fresh private backup/restore, migrations ordered and compatible, feature/config activation, bounded checks and evidence. Preserve old attempts and old selector for their manifests. Do not activate full mocks while electives lack40 eligible items. R01 and authorised release scope. |

## Suggested execution batches

1. P01–P03: data/contracts and additive foundation. Unblock dynamic catalogue before UX.
2. P04–P07: complete practice and truthful strengths; ship independently after acceptance, without waiting for full-mock bank growth.
3. M01–M02: administrator classification/blueprints and content readiness; use actual database metadata, not filenames or inferred title strings.
4. M03–M04: structured selector with reproducible local evidence.
5. R01–R02: accepted release, provider budget, manual device/performance checks and rollback.

## Required regressions

- Free chooses5 then tries10: deny the second new session; same first key/resume succeeds. Two concurrent keys/subjects issue only one daily batch. Failed insufficient bank uses no daily slot. Test exactly midnight WAT, expired/resumed sessions, account switch and paid expiry.
- The cited Chemistry deep link remains selected and communicates one available question; backend rejects exact5 without consuming entitlement. Never fill it with another Chemistry topic.
- New topic creation appears dynamically; hierarchy/alias ambiguity/inactive subject/foreign topic are handled; catalogues contain no keys.
- First-response/replay/re-score/review and historical backfill do not double count mastery. Unknown and limited-evidence topics cannot become confident strength labels; skips differ from wrong answers.
- English allocation has exact cells, one comprehension block and one complete ordered cloze block, correct active general reading text, valid keys and no duplicate IDs/families. A shortage stops issue atomically.
- Passage groups remain contiguous; book selection isn't the LIT elective. Resume freezes ordering/deadline/config even after edits or blueprint activation.
- Randomness uses distinct server seeds and diverse feasible forms. Small/exhausted pools log unavoidable overlap, never promise exactly50% or fake novelty. Soft difficulty preferences cannot override hard counts.
- Requests and errors remain bounded, private and observable; no bare platform error gets mislabelled a CSV/topic validation failure. Retry only safe/idempotent intents with stable keys.

## Remaining decisions / gates

- Confirm proposed <=50% previous-form overlap target, preferred exposure window/cooldown and exact limited-bank fallback policy. Recommendation: soft ceiling, prefer new items, preserve structure.
- Confirm initial confidence thresholds and 30/50/20 difficulty preference as product settings; not official JAMB calibration.
- Administrator must review comprehension/cloze roles and prescribed-text/cycle membership; metadata substring counts are only inventory hints.
- Elective content must grow to at least40 eligible items each; optional English-only timed drill requires its own product decision and label.
