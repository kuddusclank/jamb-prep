# Student practice, evidence-based strengths and structured mock selection

Date: 13 October 2026. Status: researched plan, awaiting implementation. Companion: student-practice-and-mock-selection-tasklist.md. This is a BMAD-style artifact, not a claim that a BMAD generator was executed. No product code, question content, entitlement, schema or deployment was changed during this planning pass.

## 1. Confirmed requirements and scope

- Database questions and their metadata are authoritative. No file question bank, synthetic performance profile or manufactured weakness percentages in the student experience.
- Practice setup: (1) subject, (2) topic, (3) 5/10/15 questions. The second “select subject” in the request is interpreted as topic, consistent with the requested deep link and topic strengths.
- Subject/topic choices come from the student's active enrolled subjects and current database taxonomy. Display evidence-based strengths and put topics with no assessment evidence after assessed topics, with an explicit unknown state.
- Free: one successfully issued practice session per Nigerian calendar day, choosing 5, 10 or 15. The user explicitly confirmed that choosing 5 consumes that day's session. This supersedes the earlier 15-question allowance split across multiple sessions.
- Pro: unlimited product practice sessions in batches of 5/10/15. Independent abuse protections and bounded request sizes remain; “unlimited” does not mean bypassing authentication/rate safeguards.
- Topic-focused practice is part of this new flow for Free and Pro; the existing Premium-only topic gate must be reconciled in the same release as the new daily-session policy.
- The subject/topic URL must initialise the actual selection, remain coherent after navigation, and never silently replace an invalid requested topic with random all-subject questions.
- English mocks need coherent comprehension/cloze passage sets, ten questions from the prescribed general reading text, and a balanced 60-question structure. The general English reading text is distinct from the elective Literature-in-English subject.
- Selection must be random within configured constraints and adapt to new database topics without changes to subject/topic arrays in JavaScript.
- Preserve server-owned scores, answer-key confidentiality, frozen questions, retry idempotency, historical attempts and existing payment/referral rules. Free full-diagnostic entitlement remains unchanged unless separately approved.
- The initial request authorised research/planning. The subsequent “go ahead with the tasklist” authorised implementation. Release evidence and remaining editorial/manual gates are recorded in the companion tasklist.

## 2. Verified current state

Audit used one read-only Supabase connection, aggregates without student identifiers/question text, and local source inspection. Public browser retrieval of the example practice URL was unavailable; no hosted authenticated browser result is claimed. Provider accounting is recorded in staging-verification-ledger.json (80/100 conservative used/reserved, 20 remaining under the existing approval). Private raw aggregate evidence remains outside Git.

| Observation | Evidence / consequence |
| --- | --- |
| English has 667 questions, all published; 666 pass nonblank A–D/one-key/explanation audit | Published quantity is not full semantic/editorial acceptance. One item fails this audit; current selection checks are not identical to the stricter audit. |
| 646 English items have nonblank source/rights metadata; 146 have possible book metadata | These are metadata indicators, not a certification of rights, correct answers or an exact reading-text binding. |
| 144 English questions reference 24 passages | Some groups have 5, 10 or 11 usable items. Counts do not establish comprehension/cloze role or gap sequence. Groups need explicit editorial classification. |
| Chemistry's alkanols-and-alkanoic-acids topic exists, with only one usable item | It cannot currently supply any allowed 5/10/15 batch. UI should show availability and disable unsupported sizes, not invent/fill unrelated questions. |
| Other active subjects have only 15–18 usable items (Physics 17) | A true 180-question mock still cannot be allocated for those four-subject combinations: each elective needs 40. English growth alone does not resolve full-mock readiness. |
| 95 mastery records, 138 recorded attempts and 48 correct in aggregate | Mastery already uses real stored responses; it is not a mock-data array. The audit did not establish per-user confidence/unique-item counts. |
| Existing English test-topic and hyperdrive-verification buckets each have a published eligible item | Quarantine confirmed internal QA content with editorial review, preserving historical snapshots; do not expose it as curriculum or blindly delete student data. |

Source paths: src/app/practice/page.tsx, practice-client.tsx, src/lib/client-actions.ts, worker/services/study-service.ts, coach-service.ts, exam-foundation-service.ts, worker/api/router.ts, src/app/dashboard/page.tsx, src/app/analytics/page.tsx.

Concrete gaps:
1. Setup has subject cards and 5/10/15 buttons, but no topic dropdown. selectedTopicSlug is hidden; subject changes leave the prior topic selected.
2. URL parameters only initialise component state; subsequent URL changes are not synchronised. Unknown subjects fall back silently. A deep link can therefore be misleading or stale.
3. Practice page loads enrollment plus the whole dashboard separately. There is no compact subject/topic availability/evidence/entitlement DTO.
4. Backend charges the old 15-question cumulative allowance and forbids Free topic filters. It accepts counts 1–60 and can issue fewer questions than requested.
5. Practice bridge stores questionId→sessionId in a module Map; questions/session identity are not recoverable after reload. Two sessions containing the same question can overwrite that association. Practice attempts remain in_progress after the UI says completed; no authoritative completion/resume workflow exists.
6. Selection is ORDER BY RANDOM() per subject/topic, not topic/difficulty/exposure balanced. Full-mock selection ignores coherent passage sets and prescribed-text structure.
7. Mastery counters are real, but repeated questions can inflate them; sparse evidence is labelled weak/strong without confidence. Mock topic totals include unanswered questions, conflating omission/time pressure with wrong answers.
8. Coach estimates of +20/+45 or formula-generated mark recovery are heuristics, not validated predictions. Subject estimatedScore can fall back to practice accuracy. Stop presenting those as measured future marks.
9. Dashboard/analytics links can interpolate an absent topic into topic=undefined. Existing static-named interfaces are leftover names, not proof of fake runtime data.
10. Previous generic “Load failed” cannot be attributed to taxonomy alone. Retain a separate transport/CORS/timeout investigation and request-ID evidence; do not declare it solved by adding topics.

## 3. Research and exam-cycle boundaries

The official JAMB Use of English syllabus's examination-structure section specifies the following 60-question composition. Its content guidance describes comprehension and cloze passages, and the 2026 official registration bulletin identifies The Lekki Headmaster by Kabir Alabi Garba as the general reading text. These verify a 2026 baseline, not an automatically approved 2027 prescription.

| Blueprint cell | Required items | Group rule |
| --- | ---: | --- |
| Comprehension | 5 | One reviewed passage with five suitable linked items |
| Cloze | 10 | One reviewed cloze set with ten distinct ordered gap positions |
| Prescribed reading text | 10 | Exact active reading-text ID for the selected exam cycle |
| Sentence interpretation | 5 | Independently selected eligible items |
| Antonyms | 5 | Independently selected eligible items |
| Synonyms | 5 | Independently selected eligible items |
| Sentence completion | 10 | Configured grammar/lexis topic descendants |
| Oral forms | 10 | Configured coverage across available vowels/consonants/rhyme/stress domains |
| Total | 60 | Unique question IDs/content families; no duplicated fillers |

Sources, inspected 13 October 2026:
- Official JAMB syllabus: https://ibass.jamb.gov.ng/assets/uploads/Use-of-English.pdf (search-indexed structure; direct URL currently returns the IBASS application). Existing pinned official asset: https://ibass.jamb.gov.ng/static/media/Use-of-English.885e843b1f51e6a3d062.pdf, SHA256 f2b6bc4f2c30fc19ecf57bc14778100ce0deca59445beff9f7e10f34cbf7da18. Existing source manifest records annual verification pending. Direct asset was not retrievable through this browser tool; do not pretend a newly downloaded PDF was verified.
- JAMB 2026 registration bulletin, section 9.3: https://www.jamb.gov.ng/Bulletin/2026/JAMBulletin_23-02-2026_UD.pdf.
- ETS Standards for Quality and Fairness: https://www.es.ets.org/content/dam/ets-org/pdfs/about/standards-quality-fairness.pdf — supports documenting test specifications and selection/exposure rationale.
- ETS constrained-test construction research: https://www.ets.org/research/policy_research_reports/publications/report/2005/hyzk.html — research context for content constraints and item exposure, not proof that our proposed selector is a calibrated CAT system.

Recommendation derived from these sources: use a versioned content blueprint plus constrained random sampling. Practice can recommend weak topics; a benchmark mock should retain the same blueprint across students so scores remain interpretable. Difficulty mixes, mastery thresholds, overlap caps and cooldowns below are product proposals, not JAMB mandates or validated psychometric calibration.

## 4. Proposed student practice flow

One catalogue request returns active enrolled subjects, canonical topics/hierarchy, valid published availability, measured evidence, and daily entitlement state. No answer keys. Avoid a dashboard dependency just to render a selector.

1. Subject selector: display name, compulsory/elective status and measured accuracy with sample size/coverage. Do not claim overall subject mastery from one practised topic.
2. Searchable topic selector: all-topic mix as an explicit choice; grouped hierarchy; assessed weak/developing/strong entries with textual badges; unknown entries at the end alphabetically. Unknown is “Not assessed”, not 0% or strong. Show available item counts and early-evidence labels. Native select remains an accessible fallback; desktop/mobile combobox must support keyboard, focus, touch and screen readers.
3. Batch size: 5/10/15, disabling choices larger than the eligible pool. Underfilled topics remain visible with “1 available; 5 needed”; no silent backfill. Administrator sees the coverage shortfall separately.
4. Deep link: resolve subject first, then topic belonging to it (canonical slug or a unique controlled alias). Accept parent-topic selection with configured descendant scope. Canonicalise the URL. Invalid/inactive/foreign/ambiguous selections show corrective UI; no silent fallback. Subject changes clear topic; back/forward updates selection. URL encodes state without student identifiers/answer keys.
5. Start: validate enrollment, active topic, entitlement, complete pool and exact requested size inside a committed transaction. Failed content/transport checks consume no session. Freeze and return sessionId plus safe questions; consume Free daily session only on commit. Same idempotency key returns the original allocation.
6. Reload/resume: authoritative owned-session GET restores questions, recorded answers/feedback and progress. Resume does not allocate new content or spend another daily session. Use explicit sessionId in answer calls; eliminate the global questionId Map. Do not put answer keys in storage. Display prior feedback only for already checked answers.
7. Finish/end: explicit server completion/abandonment, progress summary and safe retry. Unanswered practice questions are not scored as incorrect. Closing a tab after successful issue does not reset the daily entitlement. Offer the active session before a new Free issue. Keep practice and active-mock feedback restrictions.

The new Free policy allows only one allocation across all enrolled subjects on a WAT date. A 5-question choice leaves no additional free session that day. Midnight enables one new allocation; old issued sessions can be resumed without charging it. Proposed active-session policy: one current practice session per student; resume or explicitly end it before a new allocation (Pro may start again immediately). Exact expiry/midnight rules must be tested; do not mutate earlier frozen attempts retroactively.

All-topic practice proposal: spread the batch across eligible topics rather than letting the largest topic dominate. Prefer less-seen questions, keep any passage items coherent, then randomise within the chosen strata. Focused practice stays entirely in the chosen topic/descendants. Repetition for revision is permitted and labelled; no guaranteed never-repeat policy on a small pool.

## 5. Real evidence and weakness processing

Author difficulty/topic metadata describes an item. Weakness requires actual student answers; importing questions cannot generate student mastery.

Proposed canonical event is unique by (attemptId,questionId,first scored response), retaining user/subject/topic IDs, frozen editorial version, source mode, selected/correct result, omission state, server timestamps, difficulty, exposure and feedback-revealed state. Owner checks and first-answer uniqueness are enforced server-side. Keys stay private. Record practice feedback once and mock finalisation once; retries/resume do not add evidence.

Derived summaries are rebuildable, actor-scoped and versioned. Preserve raw observed counts, distinct item count, number of sessions, latest practice and coverage. Show separate answered accuracy, timed/mock accuracy and omissions. Repeated review after seeing an answer is tracked as review evidence, not treated like a fresh independent diagnostic. Practice skips remain missing observations; mock skips can affect the exam score while receiving a separate omission/time-pressure signal.

Proposed first-release labels:
- No responses: Not assessed; no percentage.
- Fewer than 5 distinct valid questions: Early evidence; show observed counts, no confident weak/strong claim.
- 5–9 distinct questions or fewer than two sessions: provisional accuracy, marked limited evidence.
- At least 10 distinct questions across at least two sessions: Weak <65%, Developing 65–74%, Strong >=75%, with sample size visible. These are configurable initial product thresholds, not statistically validated guarantees.

Keep descriptive performance per difficulty. Do not multiply authored hard-question marks or claim IRT-calibrated ability from categorical easy/medium/hard labels. Defer calibrated models until sufficient representative data exists. A later recency-weighted/smoothed model must be versioned and tested alongside raw accuracy, not replace it silently. Remove unvalidated predicted gain points from the UI; recommendations can state measured errors and actionable topics.

Historical reconciliation: replay reliable owned frozen answer/result records idempotently. Do not count both the legacy aggregate and reconstructed events. Legacy attempts lacking reliable frozen content/keys remain labelled legacy evidence; do not re-score them using the current edited bank. Existing historical scores are preserved. Topic moves retain the frozen original attribution; new canonical rollups use an explicit mapping version without double counting parent/child evidence.

## 6. Database-driven blueprint and metadata model (proposed)

Additive entities, names provisional pending schema review:
- exam_cycles and reading_texts: source citation, reviewed cycle, stable work ID, title/author, activation state. Pin the work in a blueprint version.
- exam_blueprints / blueprint_versions / blueprint_cells: subject binding, cycle, total/timing, rule counts, difficulty targets, hard/soft constraints, source, approval and immutable version. The engine must not branch on subject names/slugs; English counts live in reviewed database configuration.
- assessment_roles / question_classifications: stable role membership, subject/topic relation, group/work bindings, content-family identity and option-shuffle safety. New root topics choose a role in admin; descendants can inherit an explicitly configured parent rule. Unclassified content remains practice-eligible if otherwise valid, but cannot silently enter a structured mock cell.
- assessment_groups and group_items: comprehension/cloze role, passage ID, reviewed group identity, ordered member positions/gaps and coherent selectable subset rules. Passage presence alone is not enough. Never generate gap text or mix questions from different passages.
- student_question_exposure and scored_response_events: first/last seen, counts, first scored evidence, recent exposure, uniquely sourced records. Derived aggregates can be cached with actor-scoped invalidation.
- daily_practice_sessions: unique (user_id, WAT_date), committed allocation/session pointer and policy version. Reconcile old daily allocations greater than zero to “session used today” at rollout; don't grant accidental extra sessions or erase history.
- attempt manifests: selector/blueprint versions, frozen work/group/topic/difficulty, private random seed, content revision/fingerprint and measured overlap/fallback reasons. Persist alongside existing private keys and safe snapshots.

A new topic never needs a code-array edit. Topic IDs and explicit role/hierarchy mappings drive catalogues and selection. Novel names, year, topic slug lists and percentage mixes are admin data. A new subject or exam cycle without an approved blueprint remains unavailable for structured mocks with an actionable readiness report. Content-role enums describing generic group algorithms are acceptable engine concepts; a hardcoded list of curriculum topics is not.

Editor/import updates must expose these fields, extend a versioned CSV contract compatibly, and provide controlled mapping preflight for legacy categories/tags. Do not infer roles by matching title substrings at exam runtime. Map existing content as a reviewed editorial operation with reports, backup and conflict checks. Existing CSV tags remain tags unless deliberately promoted to canonical taxonomy. Do not auto-create topics from arbitrary CSV labels or auto-publish to make readiness pass.

## 7. Proposed constrained random selector

Hard constraints win over randomness: correct cycle/work, valid published content, unique IDs/content families, exact cell counts, group integrity, exact total, selected enrolled subjects and safe payload size.

1. Load the approved immutable blueprint and eligibility pools in PostgreSQL; get explicit counts per cell/group/difficulty.
2. Allocate a private cryptographically generated per-attempt seed. Do not expose it or seed from student ID/date alone. Resume uses the existing manifest, never a fresh draw.
3. Partition approved memberships by cell. Prefer one primary mock cell per item for a blueprint version, avoiding overlapping pools. If multi-cell eligibility is later supported, enforce global uniqueness and solve assignment feasibility rather than summing misleading independent counts.
4. Select passage groups atomically: one comprehension group of five, one complete cloze group of ten in gap order. A larger comprehension group may have a reviewed five-question subset; a cloze set cannot drop required gaps or choose arbitrary ten out of eleven without editorial mapping.
5. Sample the prescribed-text ten across reviewed chapter/coverage domains when data exists; use the pinned work ID, not the elective LIT bank. No fabricated chapter classification.
6. Select remaining cells using configurable topic coverage and difficulty quotas. Recommended initial target 30% easy / 50% medium / 20% hard is a soft, reviewed proposal. Apply integer rounding within cells and avoid invalid quotas in five-item cells. Exact content quotas stay hard; sparse difficulty pools allow a logged soft relaxation, not hidden duplication or crossover.
7. Rank eligible candidates with exposure/cooldown penalties and seed-derived tie-breaking. Initially use indexed filtered pools plus seeded hash/random ordering in PostgreSQL; 667 English items do not justify a new optimisation dependency. Benchmark larger pools before selecting a precomputed random-key strategy. Avoid reading private answer-bearing pools into Worker V8 or making one query per question.
8. Validate total/cell/group/uniqueness/size invariants; freeze questions, options, keys, explanations and blueprint manifest in one committed allocation. No incomplete mock or quota reservation survives failure. Student payloads omit keys/explanations until permitted review.
9. Preserve subject/section structure and contiguous passage/cloze blocks; randomise independent questions within allowed cells. Do not shuffle cloze gap order. Option order remains A–D unless editor-approved shuffle-safe metadata permits it; references such as “both A and C” or “all above” can make blind option shuffling invalid.

All three electives still require 40 unique suitable items each. Their coverage rules are database blueprints for their reviewed syllabus domains, not English-specific rules reused blindly. An optional English-only section drill is a separate future product label, never presented/scored as a complete 180-question diagnostic.

## 8. What “50–50” should mean

User intent is a varied repeat mock. Proposed interpretation: prefer new/less-recent items; at most 50% overlap with the preceding mock when feasible. Do not deliberately repeat 30 of the 60 English items just to hit 50%. User has not confirmed an exact probabilistic policy; this is a proposal.

Uniform sampling does not produce a fixed 50% repeat probability. For a cell with pool M and draw k, expected overlap with the previous k-item draw is k²/M; overlap fraction is k/M. Across two draws, minimum unavoidable overlap is max(0,2k−M). These formulas assume independent item pools and ignore atomic passage constraints; they explain feasibility, not a student guarantee.

Examples: ten reading-text items drawn from 146 eligible items have about 0.685 expected repeated items under independent uniform selection. Five antonyms from 97 have about 0.258. A cell with exactly ten eligible items and a ten-item requirement must repeat all ten. Whole-passage repetition must be measured at group level too.

Order of preference: satisfy hard blueprint → avoid recent groups/items where possible → meet difficulty/coverage preferences → randomise ties. Use configurable recent-history window/cooldown and a recorded overlap target. If the cap is impossible, preserve structure and disclose a limited-pool fallback/readiness shortfall. No no-repeat or 50% guarantee unless supported by the actual per-cell/group pools. Log achieved item/group overlap for audit; do not show an invented novelty percentage.

## 9. Student-portal closure and rollout

Update practice, dashboard recommendations/weak-topic links, analytics, profile/enrollment changes, pricing/free-plan copy, mock setup/readiness, result/review topic links, auth/account-switch cleanup and mobile accessibility together. Always build internal links from validated subject/topic data, omitting absent query fields. New topic creation invalidates catalogue caches promptly. Unknown evidence must not disappear from dropdowns or be rendered as zero accuracy.

Keep separate transport regression: reproduce Safari/mobile preflight/practice networking with request IDs, compare same-origin/custom-domain and workers.dev paths, verify CORS/error headers and platform errors, and add bounded safe retry only for read-only/idempotent operations with the same intent key. Never replay payments/charges blindly or claim the prior Load failed root cause verified from a screenshot.

Rollout is gated: additive backup/restore rehearsal and migrations, clean content mappings, local unit + real PostgreSQL tests, bounded staging checks, manual owner/student/iPhone flows, measured CPU/latency, explicit production publication scope and remaining provider allowance. Current bank is not ready for full 180-question mocks; no synthetic fillers or lower-count disguised exams. No new dependencies, billing upgrade or change to existing completed scores implied.

Release acceptance: dynamic topic appears without rebuilding code; exact deep link works; stale topic cleared on subject change; sparse topic cannot consume quota; Free's two concurrent different start keys create at most one daily session; resume/account switch/new day are safe; Pro repetitions aren't product-capped; first answers/idempotent finalisation produce one evidence event; cold-start topics remain unknown; full English cell counts and coherent groups are exact; wrong-cycle books/unmapped items never enter mocks; chosen IDs are unique; answer keys remain private; new attempts vary while resume stays identical; impossible overlap/difficulty cases produce declared fallbacks; all eligible content writes and snapshots preserve historical integrity.

## Implementation and release update — 13 October 2026

The practice flow, response evidence, private structured selector and administrator blueprint tools are published. See student-practice-and-mock-selection-tasklist.md for test/release evidence and exact remaining gates. Data is always read from the database; no production fixture bank or inferred book classification was inserted. Later uploads increased Physics/Chemistry/Biology coverage; the original audit above remains a dated snapshot, and student-selection-bank-audit.json records the subsequent metadata inventory. Full mocks require an approved blueprint and validated cells for every enrolled subject/year; bank size alone is insufficient.

The upload timeout follow-up adds bounded bulk writes/read-committed import transactions with durable locked job receipts and deterministic question-to-option association. Resume the same original CSV to continue a partially committed upload; previously committed rows are retained. A local300-row regression covers a lost acknowledgement at43%. Hosted synthetic imports and physical-device/load certification were not claimed.
