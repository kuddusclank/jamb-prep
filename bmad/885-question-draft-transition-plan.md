# 885-question draft transition — execution plan

**Status:** Planned; no production question status has been changed.  
**Scope:** The exact 885 unique IDs in `expanded-bank-mapping-review.json` → `holds`; this is a frozen manifest, not a query that selects questions by subject or current status.  
**Request:** Move every question in that set to `draft`.  
**Current constraint:** The available database connection is a local restored staging database (`127.0.0.1:55432`). It is not a production connection and must not be used to claim or perform the production change.

## Confirmed scope and material impact

- The manifest has 885 unique IDs. It must remain unchanged as the scope source for this operation.
- The latest reconciliation records 170 of the original 885 as mapped into active mock blueprints and 715 still unmapped/held. Changing status for all 885 therefore also drafts the 170 mapped records.
- `study_question_pool` only exposes questions whose status is `published` and whose assessment eligibility is enabled. Drafting mapped questions removes them from future practice/mock selection even though their classification rows remain.
- The latest recorded bank has 25 active subject blueprints. Every active blueprint must pass the production readiness selector after simulating removal of these 885 IDs. If any subject would become unready, stop before mutation and present the affected subjects and counts for a decision; do not silently leave a broken active blueprint.
- Existing attempt snapshots, scores, quotas, question text, answer keys, passages, classifications, `assessment_enabled` values, blueprint versions and published records outside this exact set must not be changed.

## Step-by-step execution

### 1. Establish the production target

- Obtain a production-authorized connection through the protected runtime or use an authenticated admin-only bulk operation. Never paste database credentials into chat, a BMAD file, shell output, or source control.
- Print only a sanitized target identity (project/database host and environment label); refuse loopback, staging, benchmark, or unknown hosts.
- Confirm the deployed schema has `questions.status`, `editorial_revision`, `question_editorial_history`, `admin_audit_events`, and the current mock-readiness view/function.
- Record the manifest hash and verify its 885 IDs are unique UUIDs before any database read/write.

### 2. Read-only preflight and impact simulation

- Fetch the exact 885 records and confirm all IDs exist exactly once. Record per-subject counts and current status counts (`draft`, `reviewed`, `published`, `archived`); report missing IDs or unexpected subject drift and stop if found.
- Record which of the 885 currently have active blueprint classifications and which are available in the current eligible pool.
- Simulate removing every manifest ID from the candidate pool and run the same readiness checks used by the deployed selector against all 25 active blueprints. Do not create attempts or consume allowances.
- Stop without mutation if a blueprint would fail readiness, an in-progress attempt could be affected by application code, or the production identity/schema does not match expectations. Present the dry-run impact before resuming.

### 3. Create and validate a private before-image

- Back up the complete question rows for the 885 IDs, their options, explanations, editorial metadata, passages, current classifications, and current editorial revisions/statuses.
- Store the backup outside the repository with owner-only permissions. Include a timestamp, manifest hash, row counts, and checksum. Do not include student data.
- Re-read the backup and verify 885 question rows and all related rows can be restored. Do not proceed if backup validation fails.

### 4. Apply the lifecycle transition

- Use one authenticated, auditable production operation. Prefer an admin-only bulk lifecycle operation that binds the acting admin from the verified session. If an operator script is used, require an explicitly authorized admin actor and validate that actor against the production `profiles` table; never invent or impersonate an actor.
- Lock the exact target rows, re-check their count and current state against preflight, then snapshot each changed question into `question_editorial_history` before the update.
- Set `status='draft'` only for target rows not already draft. Increment `editorial_revision` only for rows whose status actually changes; record corresponding audit/history evidence with the acting admin and a shared transition identifier.
- Keep rows already in draft unchanged. Do not change question content, `assessment_enabled`, classification, blueprint state, attempts, scores, or quotas.
- Use an idempotency key/transition ID so a retry cannot double-increment revisions or duplicate the transition. Abort the entire transaction if any target row or audit/history write fails.

### 5. Verify immediately after commit

- Confirm all 885 manifest IDs still exist and all have `status='draft'`.
- Confirm only previously non-draft target rows changed, each changed row advanced exactly one editorial revision, and before/after history plus audit events exist for each change.
- Confirm no question outside the manifest changed and no question content, key, explanation, passage, `assessment_enabled`, classification or blueprint row changed.
- Re-run readiness for all 25 active blueprints and check the practice/mock candidate pool by subject. The operation is accepted only if all active blueprints remain ready or an explicit follow-up decision has been recorded and implemented before the operation is resumed.
- Confirm existing attempts, frozen attempt questions, scored response events and quotas are untouched. Do not create test student attempts.
- Save a release record with target identity (sanitized), manifest hash, changed/already-draft counts, per-subject counts, readiness results, backup path/checksum and audit transition ID. Never store secrets or the private backup contents in BMAD.

### 6. Rollback procedure

- Before commit, any failed assertion rolls back the transaction with no partial changes.
- After commit, restore only rows whose current status/revision still matches this transition's resulting state; do not overwrite later editorial work. Restore original statuses from the private before-image, increment revisions for the compensating transition, and append new audit/history events rather than deleting history.
- Re-run the same readiness and integrity checks after rollback. Keep the original backup and both transition records for audit.

## Acceptance checklist

- [ ] Production target is authenticated and is not staging/local.
- [ ] Exact frozen manifest resolves to 885 unique existing questions.
- [ ] Dry-run confirms the consequence for all 25 active blueprints; no unexplained readiness failure.
- [ ] Private backup is validated and restorable.
- [ ] All 885 statuses are `draft`; no outside question changed.
- [ ] Revision/history/audit evidence is complete and retry-safe.
- [ ] Existing student attempts and quotas are unchanged.
- [ ] Post-change mock/practice readiness and release evidence are recorded.

## Current next action

Connect an authorized production database/admin session securely, then perform steps 1–3. Do not run the available local staging connection for this production request. No deployment is required for a pure status change unless implementation of a bulk admin operation becomes necessary.
