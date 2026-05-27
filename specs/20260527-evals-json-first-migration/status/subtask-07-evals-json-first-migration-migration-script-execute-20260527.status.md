# Subtask 07 — evals-json-first-migration — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 07 |
| feature | evals-json-first-migration |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | pending |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [ ] **D01** — Create `scripts/eval-migrate-ts-to-json.ts`:
- [ ] **D02** — Add CLI flags to the script:
- [ ] **D03** — Add unit tests at `scripts/eval-migrate-ts-to-json.test.ts`:
- [ ] **D04** — Execute the migration:
- [ ] **D05** — If any of the 38 files contain `interactions` blocks with `answers[]`, ensure the migration preserves them verbatim — the JSON loader and harness already handle that field.
- [ ] **D06** — Cross-reference the migration result against the audit produced inline (the dry-run report serves as the audit). Save the dry-run report at `specs/20260527-evals-json-first-migration/migration-audit-20260527.md` for traceability.
- [ ] **D07** — Commit the migrated JSON files, deleted TS files, manifest update, and the migration script in **one** commit so the diff is reviewable. (The actual commit is performed by the executor; this subtask just lands the changes in the working tree.)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
