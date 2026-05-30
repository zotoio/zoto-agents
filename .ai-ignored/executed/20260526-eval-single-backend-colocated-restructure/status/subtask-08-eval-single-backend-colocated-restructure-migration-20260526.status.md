# Subtask 08 — Eval Single Backend & Co-located Restructure — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 08 |
| feature | Eval Single Backend & Co-located Restructure |
| assigned_agent | zoto-eval-engineer |
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
- [ ] **D01** — `scripts/eval-relocate-migration.ts` — new file. Imports `isGeneratedCase` and `isGeneratedFile` from `plugins/zoto-eval-system/engine/_user-case-guards.ts`. Supports `--dry-run` (default) and `--apply` flags. NO `--force` flag.
- [ ] **D02** — Migration walks the following inputs:
- [ ] **D03** — Per artefact, the migration:
- [ ] **D04** — After all artefact moves complete, the migration atomically:
- [ ] **D05** — Stamps `_meta.primitive_analysis.invalidate = true` on every cached analyser payload under `.zoto/eval-system/cache/analyser/*.json` whose payload's `discovery_config` snapshot referenced the dropped `llm.strategy` / `llm.codeFramework` (i.e. all of them, since the migration drops both fields)
- [ ] **D06** — Removes the now-empty directories `evals/llm/test_*.test.ts` pattern files (the `_shared/` directory stays); removes `plugins/<p>/evals/{commands,agents,hooks}/` if empty after migration; removes `.cursor/evals/{commands,agents,hooks}/` if empty after migration
- [ ] **D07** — Skill exemption gate: the migration script explicitly enumerates the 14 skill `evals.json` paths and SKIPS them. If any code path attempts to read/write/delete one, the script aborts with a fatal error referencing KD-1
- [ ] **D08** — Idempotency: re-running `scripts/eval-relocate-migration.ts --apply` after a successful migration produces zero file diff and zero manifest diff. Verified by a final `git diff --stat` returning empty in the migration's own self-check at end-of-run
- [ ] **D09** — Unit test `scripts/__tests__/eval-relocate-migration.test.ts` — tests:
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
