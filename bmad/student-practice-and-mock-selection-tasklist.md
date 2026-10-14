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
| [x] | M01 | Content-role, group and cycle admin tooling | Explicit group types/ordered gaps, pinned prescribed work/chapter data, reviewed role/topic/descendant mapping, CSV compatibility and editorial readiness. Quarantine confirmed QA content without losing old snapshots. Admin-readonly report explains which cells are short. P01/P02. |
| [x] | M02 | Reviewed versioned English/elective blueprints | Configure 5 comprehension +10 cloze +10 reading text +5 interpretation +5 antonyms +5 synonyms +10 completion +10 oral =60. Other enrolled subjects40 via their own database configs. Annual source approval; proposal review for difficulty/overlap policies. No source-code topic/book arrays. M01. |
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

## Practice follow-up and requested mock audit — 13 October 2026

The user reported the saved-session banner persisting even after ending a session and requested removal of bank counts from the topic dropdown. One read-only aggregate audit found two legacy unexpired practice attempts still marked in_progress, one fully answered. These older records lack practice_requested_count; the previous UI never closed them. Both the allocation blocker and catalogue now consider only resumable sessions created by the new protocol with unanswered frozen questions. Old snapshots/evidence are retained. The final checked answer now completes a new practice attempt transactionally; checked-answer replays on a completed owned attempt remain safe and do not duplicate evidence. Owned reads recognise already-answered legacy sessions as completed. Browser review remains available after completion/expiry. Dropdown options retain topic/performance labels and omit bank totals.

Verification: three restored-PostgreSQL practice tests and22 local unit tests passed; regressions include complete/unfinished legacy attempts, automatic last-answer completion and safe replay. TypeScript and production static export passed. Published native API0d580a7a-12c5-41fa-8b79-5c2b7a9d6aa4 and Pages32e7aa55. Public practice asset verification is recorded in the provider ledger.

Requested live mock audit (mock-readiness-audit.json): ENG667 published/664 eligible; PHY428/427; CHM474/474; BIO481/481; MTH18/18. All five have zero classifications and zero active blueprints. There are no blueprint records, no reviewed annual reading work, and no reviewed comprehension/cloze groups. The latest screenshot selects ENG/PHY/CHM/BIO, so the immediate blocker is missing configuration, not Mathematics or raw question quantity. M01/M02 editorial activation remains unfinished; no content was auto-classified or activated during this read-only audit.


## Question-to-blueprint review map — 13 October 2026

User authorised a private question export, followed by review, corrected mapping and a BMAD update. The owner-only export remains outside the repository; no stems, options, keys, passage text or student records were copied here. `question-blueprint-review-map.json` records all 2,050 question IDs, source topic IDs, draft section assignments, classification basis, group/gap positions, chapter metadata and explicit holds. The source SHA-256 binds the map to the audited snapshot. **This is a draft classification manifest, not live database configuration or certification that every answer is correct.** No production mutation, blueprint activation, deployment or remote request occurred in this mapping pass.

### Candidate coverage after structural/metadata holds

Counts exclude items with missing source/rights records, duplicate option text, repeated content families, pool ineligibility, incomplete groups and explicitly identified content/context defects. Nonblank provenance records are not proof of ownership. Diagram metadata was absent from this export and must be checked before applying.

| Subject / section | Required | Mapped candidates |
| --- | ---: | ---: |
| ENG comprehension | 5 | 70: fourteen five-item groups |
| ENG cloze | 10 | 60: six complete ten-gap groups |
| ENG prescribed reading text | 10 | 106 |
| ENG interpretation (including idioms) | 5 | 24 |
| ENG antonyms | 5 | 95 |
| ENG synonyms | 5 | 102 |
| ENG completion | 10 | 47 |
| ENG oral forms | 10 | 76 |
| PHY mechanics/measurement | 12 | 113 |
| PHY thermal/gases | 6 | 63 |
| PHY waves/optics | 8 | 96 |
| PHY electricity/magnetism | 10 | 99 |
| PHY modern/electronics | 4 | 35 |
| CHM foundations | 8 | 108 |
| CHM physical | 12 | 175 |
| CHM inorganic/environmental | 8 | 87 |
| CHM organic | 12 | 85 |
| BIO variety | 6 | 161 |
| BIO form/function | 16 | 208 |
| BIO ecology | 10 | 52 |
| BIO heredity/variation | 4 | 32 |
| BIO evolution | 4 | 4 |

Totals: ENG580 candidates/87 holds; PHY406/22; CHM455/19; BIO457/24. All2,050 records accounted for:1,898 candidates and152 held items. An item can have multiple hold reasons. Science allocations remain proposed product weights, not official JAMB paper quotas.

### Corrected classification decisions

- Do not classify all Lexis and Structure as sentence completion. Passage-linked numbered gaps belong to cloze; standalone nearest-meaning vocabulary belongs to synonyms; actual sentence blanks/completion prompts belong to completion. Idiom/phrase interpretation belongs to interpretation. Three English standalone items remain held for type/missing-text review rather than guessed.
- Six cloze sets have unique contiguous original gap labels6–15 or11–20. The manifest preserves those labels and maps their order to canonical positions1–10. Keep the original passage labels/text. The11-gap Child Rearing set stays held until an editor resolves its intended form; do not drop a gap arbitrarily. Two single-question comprehension groups remain held. Comprehension original order was not exported, so its canonical positions are deliberately unset; do not substitute UUID/upload order for source order.
- Biology Evolution uses ten explicitly inspected items currently filed under other topics. Four have no identified structural/content hold; six require wording/OCR/key review. Global warming is assigned to Ecology rather than Genetics/Evolution. This changes draft assessment assignments, not student topic taxonomy or historical response evidence.
- All146 book items identify The Lekki Headmaster in metadata. Forty require chapter context in the student-facing question. Their chapter tags are preserved but they remain held until context is supplied and verified. The remaining106 are candidates, not a book-fact certification. Source exam_year2024 is not automatically rewritten. Bind the annual work only to a separately reviewed exam cycle; do not assume2027 eligibility from2026 source evidence.
- One duplicate Chemistry content family is held; retain its ID and relationship for review, without deleting historical content.

### Release limitations and remaining work

1. Confirm science classifications item by item against stems/options; broad source-topic mappings are marked as such. Resolve all holds with editorial revisions and audit history, never automatic answer-key rewriting.
2. Check diagram alternative text and current publication/revision state against the database before importing the snapshot manifest. Verify source/rights claims and answer keys; no blanket factual/rights approval is recorded.
3. Recover comprehension source sequence; verify each cloze passage matches all original numbered gaps; review and approve groups through existing assessment administration.
4. Bind a verified reading work to the intended student exam year; create draft database templates/cells/classifications using IDs. No runtime subject-topic arrays, substring classifier or fallback allocation is introduced. New topics receive explicit database mappings.
5. Run selector readiness for each draft blueprint and combined180-question forms before activation. Confirm unique question/content families, coherent groups, frozen resume and random seeded selection. Existing selector tests are not evidence that this new content map has been applied.
6. Four Evolution candidates meet the cell count only. Every subsequent form repeats that cell unless reviewed additions are provided. The <=50% previous-form overlap ceiling remains soft at whole-form level; disclose unavoidable repeats and grow Evolution coverage.
7. Physics has only3 hard-labelled eligible items and Biology0. Preserve soft difficulty preferences; do not fabricate hard labels or promise30/50/20 delivery. Recalibrate difficulty editorially as evidence grows.

Local validation: manifest UUIDs unique; all exported IDs represented exactly once; candidate assignments nonnull; section counts match summary; six cloze groups have positions1–10 and preserved consecutive source labels; no raw content/keys or student fields included. Production M01/M02 content approval remains open.


## Confirmed override: years are reference metadata — 13 October 2026

The user delegated the remaining review work and explicitly confirmed that exam year is for reference, not an eligibility constraint. This supersedes annual-year matching requirements in earlier sections: question exam_year, template cycle_year, blueprint cycle_year and reading-work cycle_year are retained for reference/history and do not need to equal the student's exam year. Do not rewrite source years or remove provenance. Reviewed reading-work identity, valid passage groups, unique content, exact counts, authenticated ownership and server-side scoring still apply.

Implemented locally: loadAssessmentPools selects the latest active subject blueprint deterministically (created_at, version, ID), independent of student year; explicit blueprint IDs remain subject-bound. Reviewed reading-text identity is enforced without year equality. Admin creation permits differing template/work/reference years; activation retires prior active blueprints for the whole subject. Existing year fields/indexes remain compatible, and historical forms retain frozen manifests. No dependency/schema change.

Verification: six local selector/auth/snapshot tests passed; separately, the real restored-PostgreSQL regression passed with transactional rollback. It covers differing work/template/blueprint years, future-year default lookup, reviewed-work identity, grouping, activation and twenty distinct seeded English forms. The exported metadata map assembles twenty distinct complete180-question forms across ENG/PHY/CHM/BIO, excluding held items, with exact section counts, unique IDs/content families, one comprehension passage and correctly ordered cloze gaps. TypeScript passes. These checks establish offline feasibility, not hosted content approval or deployed behavior.

Outstanding owned work: apply vetted draft classifications/configuration to the current database with revision/diagram checks and a private configuration backup, review keys/context holds rather than invent answers, run live readiness, then publish the API change and activate accepted forms. No database configuration, activation or publication was performed in this local pass. The152 held items remain excluded from the candidate map; their repair is separate from filling a complete form with the1,898 mapped candidates. Four Evolution candidates force within-cell repeats until the reviewed pool grows. No exact50% novelty or hard-difficulty calibration is promised.


## Production blueprint activation and API release — 13 October 2026 WAT

The user accepted the recommended exclusions/configuration and authorised deployment. This supersedes the previous local-only status. Native API version **4b39688b-0aec-4d97-8d44-d97a60491f44** is published at the existing production routing. No frontend change was needed; Pages was not republished.

- Privately backed up all six assessment configuration tables before changes; owner-only backup location is recorded in blueprint-activation-release.json. No student data is included in that backup.
- Revalidated all1,898 mapped candidates against current pool eligibility, stem, passage, options/keys, explanation, source/rights records and tags. No snapshot drift was found. Diagram URL/alternative text was checked live. No additional exclusion was needed.
- Atomically inserted four versioned blueprints and their cells/groups/classifications, verified each through the production loadAssessmentPools/selectAssessmentForm code, retired earlier subject-active configurations and activated all four. Classified: ENG580, PHY406, CHM455, BIO457. Selected60+40+40+40=180 unique IDs and content families. A failed validation would have rolled back the whole configuration transaction.
- The152 held snapshot items are not classified into these mock blueprints. Existing practice publication, question content, answer keys, source years, student attempts and quotas were not altered. This is structural/classification acceptance, not a claim of exhaustive factual or copyright certification.
- Comprehension uses a complete five-item passage group and may randomise independent questions within that passage under the existing selector. Source-order recovery is not required for these independent comprehension items; cloze source numbering and canonical1–10 sequence are preserved. Six cloze and fourteen comprehension groups configured.
- Reading work identity/author checked against JAMB's bulletin (https://www.jamb.gov.ng/Bulletin/2026/JAMBulletin_23-02-2026_UD.pdf). Year metadata does not filter student selection. The selected work remains The Lekki Headmaster; no claim is made about future official prescribed-text changes.
- Six default local tests passed; separate restored-PostgreSQL integration passed; TypeScript and native dry-run bundle passed (644.13KiB / gzip136.18KiB). Twenty offline snapshot forms differ and meet exact section/group/uniqueness constraints. One combined production transaction form was verified without creating a student attempt or consuming a diagnostic allowance. Hosted authenticated exam interaction, physical-device validation and sustained-load/CPU certification were not performed.
- Production HTTP checks: public health200 and unauthenticated admin401, both no-store. Evidence: blueprint-production-checks.json and blueprint-activation-release.json. No signup accounts, charges, schema changes or new dependencies.
- Conservatively reserved14 operations under the already authorised adminExpansionAllowance:2 database operations,10 API publishing operations and2 production checks. Total97/100 reserved/used;3 remain. No new request allowance was inferred.

Rollback: prior native API version0d580a7a-12c5-41fa-8b79-5c2b7a9d6aa4 is retained. Before rolling back API behavior, retire the four newly activated blueprint IDs in blueprint-activation-release.json and restore any former active statuses from the private configuration backup. Keep new rows and frozen attempts for history; do not delete questions or reseed the bank. Configuration restoration/rollback has not been exercised live.

M01/M02 initial ENG/PHY/CHM/BIO configuration/activation is complete with excluded-content follow-up. Editorial holds remain open:152 snapshot items, full key/factual review, difficulty calibration and Evolution pool growth. Current Evolution count4 fills its quota but necessarily repeats within that section; whole-form overlap/difficulty preferences remain soft. New topics need database assessment classification, not changes to source-code topic arrays.

## Remaining editorial task

- [ ] M05: Repair/review the152 held snapshot items, expand Biology Evolution, and calibrate difficulty labels. M01/M02 initial acceptance covers the four activated ENG/PHY/CHM/BIO banks; other subject banks require their own reviewed configuration before full-mock participation. No held item was silently approved.

## Expanded-bank blueprint documentation — 14 October 2026

Created subject-mock-blueprints.md with eight subject structures, research sources, totals, mapping boundaries and B01–B06 acceptance work. ENG/PHY/CHM/BIO remain active as previously released. GOV/ECN/CRK/IRS are proposed40-item specifications; imported quantities are reported by another agent and do not establish classified readiness. No provider calls, database mutations, content imports or deployment in this documentation task. Leave other agents' untracked importer scripts untouched.

## Expanded banks activated — 14 October 2026

GOV/ECN/CRK/IRS now active following topic and content repair.211/122/61/49 candidates;525 held records assessment-disabled;443 topic repairs,7 question repairs and4 key corrections. Detailed evidence and remaining gates in subject-mock-blueprints.md. No frontend/API redeployment required. Historical receipt reconciliation and full factual/key review remain open.
