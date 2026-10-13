# Practice and mock enhancement tasklist

13 October 2026. Status: software implemented and published; editorial activation and wider device/load acceptance remain. Specification: student-practice-and-mock-selection-plan.md. Checked means implemented with recorded checks; unchecked items name the remaining acceptance gate. Confirmed Free policy is one 5/10/15-question session per WAT day, including when only five are chosen; Pro has unlimited sessions. The user authorised this tasklist. Defaults are configurable database settings: soft previous-form overlap ceiling 50%, difficulty preference 30/50/20 and confident evidence after 10 distinct answered questions across 2 sessions. These are product settings, not official calibration.

| Done | ID | Work package | Dependencies and acceptance evidence |
| --- | --- | --- | --- |
| [x] | P00 | Source/readonly bank audit and primary-source research | 667 ENG published, 666 options/explanation eligible, 146 possible reading-text items; CHM target topic has one; electives 15–18; 2026 JAMB English structure verified from official indexed material. No claim of 2027 prescription or hosted signed-in QA. |
| [x] | P01 | Contract and content inventory reconciliation | Enumerate legacy session/answers, malformed/test content, group memberships, duplicate families, chapter/text scope and blueprint coverage. Distinguish current statistics from proposed confidence. Pin current exam cycle; no blind deletion or recategorisation. |
| [x] | P02 | Additive schema and migration rehearsal | Versioned blueprint/group/reading-work classifications, exposure/evidence, daily session claims and manifest. RLS/server-only tables; unique claims/events; restore rehearsal; metadata repair; reconcile existing daily allocations/legacy aggregates and preserve scores/snapshots. |
| [x] | P03 | Dynamic practice catalogue and URL contracts | One owner-scoped catalogue endpoint, active enrolled subjects/topics, parent descendants, availability, confidence and daily entitlement. Exact CHM link resolves but clearly reports one-item shortage. Aliases unambiguous; subject switch resets topic; back/forward works; new database topic visible without build; omit topic=undefined. P01/P02. |
| [x] | P04 | Subject → topic → batch-size UI | Accessible searchable choices, weak/provisional/strong labels with sample/coverage, unknown at end, availability and disabled unsupported 5/10/15 counts, loading/retry/mobile states. No hidden topic, dummy strength or automatic unrelated fallback. P03. |
| [x] | P05 | Server quota, exact allocation and resumable sessions | Enforce 5/10/15, both tiers can focus topic; Free one successful allocation/day across subjects, Pro unlimited. Exact bank checks consume nothing on failure; idempotent snapshots. Owned resume/completion/abandonment, explicit session IDs, account purge; eliminate questionId Map and handle simultaneous starts/midnight/upgrade. P02/P03. |
| [x] | P06 | Real response evidence and confidence pipeline | Unique first-score events, practice and mock attribution, repeated-review/omission separation, reliable historical replay without double counts, configurable evidence thresholds and difficulty breakdown. Remove unvalidated point-gain predictions; unknown is unknown. P02/P05. |
| [x] | P07 | Portal integration and product copy | Dashboard/analytics/results/practice links and strength displays, onboarding changes, plan limits and recovery messaging, pending/expired sessions; audit every link using confirmed catalogues. Include independent Load failed/CORS/timeout reproduction with safe retry evidence. P03–P06. |
| [ ] | M01 | Content-role, group and cycle admin tooling | Explicit group types/ordered gaps, pinned prescribed work/chapter data, reviewed role/topic/descendant mapping, CSV compatibility and editorial readiness. Quarantine confirmed QA content without losing old snapshots. Admin-readonly report explains which cells are short. P01/P02. |
| [ ] | M02 | Reviewed versioned English/elective blueprints | Configure 5 comprehension +10 cloze +10 reading text +5 interpretation +5 antonyms +5 synonyms +10 completion +10 oral =60. Other enrolled subjects40 via their own database configs. Annual source approval; proposal review for difficulty/overlap policies. No source-code topic/book arrays. M01. |
| [x] | M03 | Constrained random allocation and freezing | Seeded PostgreSQL sampling, coherent group selection, global uniqueness, declared difficulty/exposure relaxation, cell/work/cycle checks, immutable manifest and private keys. Fail cleanly on incomplete bank. Resume is identical. P05/M02. |
| [x] | M04 | Readiness, variation and score integrity tests | Pool/overlap feasibility, repeat-group limits, no option-reference corruption, key confidentiality, rejection of wrong cycles and malformed groups, per-cell deficits. Real SQL matrices and local statistically bounded repeat/coverage simulations; no production fixtures. M03. |
| [ ] | R01 | Complete local/staging/manual acceptance | Affected UI tests, real concurrent PostgreSQL claims/events and rollover, static export/type checks, Safari/iPhone keyboard/touch/reload/offline recovery, replay/ownership/security negative tests, CPU/latency. Use remaining authorisation conservatively; obtain a new budget if required. P07/M04. |
| [x] | R02 | Controlled publication and rollback | Verified fresh private backup/restore, migrations ordered and compatible, feature/config activation, bounded checks and evidence. Preserve old attempts and old selector for their manifests. Do not activate full mocks while electives lack40 eligible items. R01 and authorised release scope. |

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

- Default selection uses a soft <=50% previous-form overlap ceiling, prioritises less-exposed questions and records unavoidable relaxations. It does not force repeats or promise statistical novelty.
- Initial confidence thresholds are configurable in study_evidence_policy. Difficulty/overlap preferences are editable on draft blueprints; not official JAMB calibration.
- Administrator must review comprehension/cloze roles and prescribed-text/cycle membership; metadata substring counts are only inventory hints.
- Latest production inventory: ENG664, PHY427, CHM474, BIO329 eligible. MTH18 and several other subjects15 still lack40. Counts alone do not replace approved blueprint/classification coverage; no English-only mock was introduced.

## Release evidence — 13 October 2026

- Additive migrations0010–0012 rehearsed twice against a freshly restored private application/auth backup, then committed in production. Supabase platform-only schemas were excluded from the local restore; no full-platform restore claim.
- Free daily claim is unique and atomic; mirrored legacy quota is exhausted for rollback compatibility. No allocation from an undersized bank. Pro repeat-session, alias/descendant, first-response/replay, concurrent Free starts and WAT rollover tests pass.
- Durable response evidence includes frozen editorial revision, distinct question accuracy, historical session count, difficulty totals, repeated reviews and omissions. Old unsnapshotted attempts are not rescored. Misleading practice-to-mock score/point-gain predictions removed.
- M01/M02 software is implemented: admin page /admin/assessment/, reviewed annual works, versioned templates/cells/groups, explicit classification, provenance checks and readiness. The official 2026 English template has5/10/10/5/5/5/10/10 cells. Actual question roles, ordered cloze gaps and annual reading-work membership still require editorial review; no blueprint was silently activated. Their checkboxes remain open for this content gate.
- M03/M04: private seeded metadata allocation, coherent passage groups, semantic duplicate-family checks, immutable per-cell manifest and keys frozen in PostgreSQL. Twenty local English forms were checked; 180-question scoring/resume and wrong-year/group/short-pool rejection are covered.
- Local suite:161 passed,13 explicitly opt-in/local-DB tests skipped in default mode; separate restored-PostgreSQL matrix13 passed. Static export and TypeScript passed. Desktop/mobile-width Chrome checked catalogue, shortage, resume, readiness and admin shell with injected responses. Physical Safari/iPhone, sustained load and p95/CPU certification remain open under R01.
- Import failure follow-up: included concurrent branch commits for bulk inserts/read-committed isolation. Added bulk passage creation, deterministic question UUID association and duplicate-in-batch reference checks. A300-row rolled-back local fixture loses its acknowledgement at43%, resumes from the receipt without duplicates, and verifies every option/passage association; at most22 SQL statements per10-row batch. No hosted synthetic question import was performed.
- Published native API a7975fc9-2e28-47a8-956d-91fc2c40c061 and Pages4d5575f3 to jambprep.lecterniq.com. Existing test-account reads, public static/CSS checks, unauthenticated admin denial and disallowed-origin rejection passed. Single observed network samples are not load/p95 evidence.
- R02 rollback inventory: retained native API ae42ee52-c376-4445-9cdc-926a1802be0c and Pages00484f66-6834-4872-b0f9-9da0becfaab3. Roll back the paired API/Pages artifacts if required; retain additive schema/data and private backups. Old attempts still read their original frozen payloads. The mirrored legacy ledger prevents spending the same Free day again if an earlier quota implementation is restored. Paired artifact compatibility must be checked during any rollback; no live rollback was exercised.
- Metadata-only bank and hosted-check records: student-selection-bank-audit.json and student-selection-release-checks.json. Provider reservations are recorded under the user-approved additional60-request allowance; no account creation, payment or billing change.

- Short production log capture received zero invocations/CPU samples; it provides no CPU-limit or sustained-load certification. R01 remains open.
