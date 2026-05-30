# Subtask 01 — Refactor LLM eval approach — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 01 |
| feature | Refactor LLM eval approach |
| assigned_agent | crux-platform-architect |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-08T20:07:00+10:00 |
| last_heartbeat | 2026-05-08T10:13:43.389Z |
| completed_at | 2026-05-08T20:15:00+10:00 |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Written inventory table: **declarative JSON paths** (`plugins/zoto-eval-system/evals/**/*.json`), **code tests** (`evals/llm/test_*.test.ts`), **shared helpers** (`evals/llm/_shared/*`, `evals/_llm/*`), **scripts** (`eval-stamp`, `eval-discover`, `eval-analyse`, `eval-update`) (`specs/20260508-refactor-llm-eval-approach/subtask-01-refactor-llm-eval-approach-audit-architecture-20260508.md`)
- [x] **D02** — Explicit **dual-strategy contract**: when to add/update JSON vs Vitest; how `eval:llm:declarative` vs `eval:llm:code` map to user workflows (`package.json` scripts) (`specs/20260508-refactor-llm-eval-approach/subtask-01-refactor-llm-eval-approach-audit-architecture-20260508.md`)
- [x] **D03** — **Open questions** list for subtasks 03–06 (e.g. whether `EvalCase` and code-strategy case types should merge vs alias, table-driven codegen limits) (`specs/20260508-refactor-llm-eval-approach/subtask-01-refactor-llm-eval-approach-audit-architecture-20260508.md`)
- [x] **D04** — No code changes in this subtask (read-only audit)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `specs/20260508-refactor-llm-eval-approach/subtask-01-refactor-llm-eval-approach-audit-architecture-20260508.md` — Added full Execution Notes with inventory table, dual-strategy contract, open questions, and duplication analysis
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Read-only audit completed. All 4 deliverables written to subtask Execution Notes.
<!-- status:notes:end -->
