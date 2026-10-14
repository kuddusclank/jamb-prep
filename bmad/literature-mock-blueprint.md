# Literature-in-English mock blueprint

Date: 14 October 2026. Subject code: LIT. Status: active in production following the authorised build/deploy. This is the elective Literature-in-English subject, separate from compulsory English's selected reading-text questions.

## Structure: 40 questions

| Cell code | Section | Required | Content scope |
| --- | --- | ---: | --- |
| drama | Drama | 10 | Dramatic forms/methods, plot, characters, themes, conflict and interpretation of reviewed African/non-African plays |
| prose | Prose | 10 | Narrative methods, plot, setting, characterisation, point of view and themes in reviewed African/non-African works |
| poetry | Poetry | 10 | Forms, persona, themes, imagery, diction, rhythm/sound and interpretation of reviewed poems |
| principles | General literary principles | 5 | Cross-genre terminology, figures of speech, symbolism, satire and aesthetic principles |
| appreciation | Unseen literary appreciation | 5 | One complete self-contained prose, drama or poetry extract with five linked interpretative questions |
| | Total | 40 | Part of English60 + three electives40 =180,120 minutes |

The official syllabus identifies drama, prose, poetry, general literary principles and appreciation of unseen extracts. **The10/10/10/5/5 weights are JAMBPrep's proposed allocation, not an official published JAMB section quota.** Primary source: [JAMB Literature syllabus](https://ibass.jamb.gov.ng/static/media/Literature.f24a00818658eb8ecbd0.pdf); indexed official alternative: https://ibass.jamb.gov.ng/assets/uploads/Literature-in-English.pdf. Existing source manifest records the portal document/hash. No next-exam prescribed-work list is inferred from the PDF's publication date.

## Current-bank evidence

One authorised read-only aggregate audit on14 October found535 published and535 structurally eligible items. Structural eligibility is not factual/answer-key/copyright certification. Inventory: literature-blueprint-inventory.json. No question content, student records or answer keys were exported in this audit.

| Approximate source-topic grouping | Eligible | Interpretation |
| --- | ---: | --- |
| Drama topics | 156 | African drama, dramatic irony, soliloquy, comic relief, tragedy/catharsis and hamartia |
| Prose topics | 188 | African prose themes and narrative point of view |
| Poetry topics | 82 | Sonnet and elegy/dirge buckets |
| General principles/devices | 109 | Figures of speech/sound/association and literary satire |
| Linked extract groups | 0 | No Literature passage IDs in eligible records |

These are topic-name inventory hints, not approved item-level mappings. A theory question about a sonnet is not automatically a question on a selected poem. A device question whose objective is a particular drama/prose/poetry text belongs to that genre; an independent terminology question belongs to principles. A new topic must be classified explicitly rather than inferred forever from these title lists.

No linked extracts currently support the required appreciation group. Quotes may already be embedded in stems; a content review is needed to recover/coalesce them, verify completeness and rights, and attach passage records. Do not conclude that all535 questions are usable or that all prescribed works/regions are represented from this aggregate audit. Do not replace missing appreciation questions with five unrelated literary definitions merely to report readiness.

## Work, topic and extract mapping

- Store versioned cells and reviewed question IDs in the database. Each question has one primary assessment cell per blueprint; do not double-count figures of speech across poetry and general principles.
- Record work title/identity, author, genre and African/non-African classification independently of source exam-year metadata. Question and blueprint years remain reference-only, as confirmed by the user. Never mix titles/characters or treat the English general reading text as automatically eligible for LIT.
- Spread work-specific questions across the reviewed available works within a genre. Target African/non-African coverage where enough approved content exists; region balance is a soft preference until inventory is established, not an invented hard5/5 promise.
- Existing selector spreads standalone cells by topic ID. Keep distinct work/topic classification when work coverage is required; otherwise extend its work-stratification before claiming work-level balance. A single broad genre topic with many books does not by itself guarantee book coverage.
- Appreciation groups require an extract readable without external context, explicit question associations, five distinct valid items, verified keys/explanations, source/rights metadata and preserved necessary line/speaker labels. Do not reproduce copyrighted source text without an appropriate rights basis.
- The current generic grouped-selector contract can represent appreciation as a `comprehension`-kind cell while the displayed title is “Unseen literary appreciation”. This describes storage compatibility, not an English-language reading-comprehension substitution. Use a single reviewed extract group per form; vary its genre between forms where feasible. Five independent questions may be shuffled within that extract; dependent numbering/ordering must remain intact.

## Randomness and integrity

Use a private fresh seed for each new mock. Select randomly within every reviewed cell; prefer less-exposed questions and distribute across eligible works/topics. Keep the appreciation extract and its linked questions together. Do not use upload order, database sequence or a fixed first ten rows. Freeze selected IDs, editorial versions, private keys, section/group ordering and deadline for resume.

All40 questions must have unique IDs and normalised content families. The<=50% previous-form overlap ceiling and30/50/20 difficulty mix are soft preferences; report unavoidable relaxations rather than fabricate difficulty or guarantee a repeat probability. Small work pools can recur even when other sections vary.

Fail readiness before issuing an attempt or consuming a Free diagnostic if any mandatory cell is short. Include Literature and the missing section in administrator diagnostics. Preserve topic practice for eligible standalone questions while full-mock classification remains unfinished.

## Execution and acceptance tasks

- [x] L01: Generate the five-cell specification, source evidence and40-question total; audit aggregate inventory.
- [x] L02: Inspect actual stems/options/keys/explanations and original metadata; recover correct genre, work and objective assignments. Hold fragments, merged OCR questions, duplicates, unresolved references and ambiguous items. Verify actual African/non-African work coverage.
- [x] L03: Recover or authorise complete unseen extracts and link at least one reviewed five-item appreciation group; prefer several across the three genres. No file-based question-bank fallback.
- [x] L04: Create draft database blueprint/cells and reviewed classifications; verify work-aware stratification where required. Source years do not restrict selection.
- [x] L05: Test exact40 counts, group coherence, multiple seeds, duplicate rejection, immutable resume and no entitlement consumption on shortages. Combine with English and two other active electives for180.
- [x] L06: Back up configuration, activate only after all five cells pass, then perform bounded hosted checks using the approved remaining provider budget. No activation/database write/deployment was performed by L01.

The535-item count is sufficient inventory for investigation, not permission to silently skip the appreciation or work-identity gates. Detailed factual review and assessment readiness remain distinct.


## Production release — 14 October 2026

User explicitly requested “build and deploy”. Literature blueprint959120c3-908e-4963-9842-83a7302a4282 is active. Cloudflare Pages static build9fc7bc1d is published to the existing production project/domain; the current native API already supports this database configuration and needed no code redeployment.

- Privately inspected535 uploaded records, original work prefixes, topics, options, keys, explanations and source records. Assigned work-specific drama/prose/poetry items to work topics, with separate genre-theory/general-principles topics. Work-prefix mapping is based on the supplied content; exhaustive book-fact/key and rights verification is not claimed.
-25 duplicate content-family copies (no conflicting keyed content detected),15 missing-provenance items and4 questions with absent extract context are held:44 total. They are assessment-disabled without deletion. Remaining491 uploaded items and3 new original editorial items provide494 classified candidates: drama124,prose186,poetry80,principles99,appreciation5.
- Recovered the existing Macbeth1.4 public-domain quotation from two uploaded questions; checked its scene/context against [Folger's primary text](https://www.folger.edu/explore/shakespeares-works/macbeth/read/1/4/). Stored one shared passage, an original contextual note and reviewed group. Removed repeated quote text from the two question stems; their options/keys remain unchanged. Added three explicitly original JAMBPrep questions on word meaning, inner thoughts and the stated trust, with source_type=original and appropriate provenance. They are not labelled official past questions. No question/extract text or private answer bank was committed to repository files.
- One transaction checked the bank against the review snapshot and current diagram accessibility metadata, recorded editorial before/after history, repaired topics, quarantined holds, created the passage/group/cells/classifications and verified readiness before activation. A private configuration/content backup precedes all changes. Historical attempt snapshots/answers/scores and entitlements were not rewritten. No accounts, student attempts or charges created.
- The real production selector assembled exact10/10/10/5/5=40 unique items and one appreciation group. Combining English,Literature,Government,CRK produced180 unique IDs/content families. Post-commit reads confirm494 eligible/classified,5 appreciation items and3 tagged original additions. No hosted student attempt was issued to perform these checks.
- Five local selector/snapshot tests passed, including20 distinct seeded40-item forms and rejection of an incomplete appreciation group. This is selection/shape verification, not exhaustive editorial review. Static production build and TypeScript passed with existing webpack fallback:33 prerendered pages. Default Turbopack CSS processing could not bind its sandbox IPC port, even after an attempted permission override; no source/dependency change was needed for the successful fallback.
- Production API health200 and anonymous admin401 are no-store. Published mock/practice page checks are recorded separately. No hosted authenticated student interaction, physical-device or sustained-load certification is claimed.
- Evidence: literature-review-map.json,literature-activation-release.json,literature-production-checks.json,literature-http-checks.json,literature-pages-checks.json. Owner-only pre-change backup path is recorded in the activation receipt. New allowance40 now has25 conservatively reserved/used and15 remaining; Literature consumed19 including its initial inventory and this build/release. No new allowance was inferred.

Limits: only one appreciation group exists, so its five items recur. Work/topic spread is a preference, not a guarantee that every available book/poem or region appears per form. Imported difficulty labels are not calibrated; soft difficulty mix relaxes to keep forms complete. The syllabus listing is not a claim about a future official prescribed-work list; years remain reference-only.

Rollback: retire this blueprint, restore former active status if any, and restore previous Literature topics/eligibility/content from the private backup with new editorial history. Archive the three original additions if necessary; preserve them if used by frozen attempts. Keep frozen snapshots and all student history intact. Previous Pages32e7aa55 remains the recorded rollback artifact; verify the selected prior Pages version before rollback because other release records may supersede it. No live rollback exercise.

- [ ] L07: Complete factual/key/rights review of uploaded work items, repair44 held records, refine author/region/work metadata and add additional reviewed extract groups. Validate hosted student start/resume on real devices. L02–L06 acceptance is the initial operational release, not closure of these ongoing editorial/performance gates.
