# Subtask 04 — Refactor LLM eval approach — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 04 |
| feature | Refactor LLM eval approach |
| assigned_agent | crux-software-engineer |
| model | composer-2-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-08T10:34:00Z |
| last_heartbeat | 2026-05-08T10:48:06.755Z |
| completed_at | 2026-05-08T10:42:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — New harness module with stable API: `runLlmCodeSuite` / `defineLlmCodeEval` (exact name chosen for clarity) (`evals/llm/_shared/run-code-strategy-suite.ts`)
- [x] **D02** — Harness uses existing `_shared/sdk-bridge.ts`, `sandbox-helpers.ts`, `zoto-llm-reporter.ts`, `graders/*` without forking grader logic (`evals/llm/_shared/run-code-strategy-suite.ts`)
- [x] **D03** — **CURSOR_API_KEY** skip behavior preserved (match current per-test `it.skip` pattern) (`evals/llm/_shared/run-code-strategy-suite.ts`)
- [x] **D04** — One migrated test file proves parity (same assertions count / behavior) before bulk migration deferred to subtask 06 (`evals/llm/test_agent_zoto-eval-comparer.test.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `evals/llm/_shared/run-code-strategy-suite.ts` — Centralized harness module exporting `defineLlmCodeEval()` — replaces ~180 lines of boilerplate per test file
- **modified** `evals/llm/test_agent_zoto-eval-comparer.test.ts` — Proof migration: 280 lines → 70 lines using the centralized harness, all 3 cases pass
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Harness API: `defineLlmCodeEval(config)` in `evals/llm/_shared/run-code-strategy-suite.ts`.
Config accepts targetId, cases, modelId, judgeModel, caseTimeoutMs, plus vitest framework bindings (describe, it, afterAll, expect).
Framework-agnostic: vitest globals passed in by caller, not imported directly by the harness.
Proof test ran 3/3 cases to pass in 269s (live CURSOR_API_KEY validation, not just skip-mode).

<!-- status:notes:end -->
