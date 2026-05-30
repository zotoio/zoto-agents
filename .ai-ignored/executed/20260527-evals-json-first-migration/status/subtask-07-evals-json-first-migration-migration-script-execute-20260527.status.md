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
| state | completed |
| started_at | 2026-05-29T19:15:00.000Z |
| last_heartbeat | 2026-05-29T19:22:00.000Z |
| completed_at | 2026-05-29T19:22:00.000Z |
| git_sha | 1fa87d469166c5a78ba836ca4bebb8667fcdc6fb |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Create `scripts/eval-migrate-ts-to-json.ts`: (`scripts/eval-migrate-ts-to-json.ts`)
- [x] **D02** — Add CLI flags to the script: (`scripts/eval-migrate-ts-to-json.ts`)
- [x] **D03** — Add unit tests at `scripts/eval-migrate-ts-to-json.test.ts`: (`scripts/eval-migrate-ts-to-json.test.ts`)
- [x] **D04** — Execute the migration: (`specs/20260527-evals-json-first-migration/migration-audit-20260527.md`)
- [x] **D05** — If any of the 38 files contain `interactions` blocks with `answers[]`, ensure the migration preserves them verbatim — the JSON loader and harness already handle that field. (`specs/20260527-evals-json-first-migration/migration-audit-20260527.md`)
- [x] **D06** — Cross-reference the migration result against the audit produced inline (the dry-run report serves as the audit). Save the dry-run report at `specs/20260527-evals-json-first-migration/migration-audit-20260527.md` for traceability. (`specs/20260527-evals-json-first-migration/migration-audit-20260527.md`)
- [x] **D07** — Commit the migrated JSON files, deleted TS files, manifest update, and the migration script in **one** commit so the diff is reviewable. (The actual commit is performed by the executor; this subtask just lands the changes in the working tree.)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `scripts/eval-migrate-ts-to-json.ts` — AST extraction, Ajv validation, manifest rewrite, bulk history entry
- **created** `scripts/eval-migrate-ts-to-json.test.ts` — 24 unit tests (extraction, idempotency, failure audit)
- **created** `specs/20260527-evals-json-first-migration/migration-audit-20260527.md` — 38/38 migrated, 0 failed; manifest_eval_files_rewritten 15
- **modified** `.zoto/eval-system/manifest.yml` — zero .test.ts eval_files refs; 29 .json refs (15 rewritten from .test.ts)
- **modified** `.zoto/eval-system/manifest.history.yml` — bulk-migration entry 2026-05-27T17:21:10.986Z file_count 38
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Verified 2026-05-29: `pnpm exec vitest run scripts/eval-migrate-ts-to-json.test.ts` — 24/24 passed.
Idempotent `--dry-run` — total 0 (no co-located .test.ts remain).
`find` — 0 co-located *.test.ts under commands/agents/hooks evals; 38 *.json on disk.
`pnpm eval:list` — all targets enumerate (exit 0).
Vitest discovery: `z-eval-init.json` — 5 tests discovered (config evals/vitest.config.ts).
manifest: 0 .test.ts eval_files; 15 entries rewritten per history; 23 JSON files discovered by glob only (eval_files was [] pre-migration).
D07 commit deferred to parent executor (working tree only).

<!-- status:notes:end -->
