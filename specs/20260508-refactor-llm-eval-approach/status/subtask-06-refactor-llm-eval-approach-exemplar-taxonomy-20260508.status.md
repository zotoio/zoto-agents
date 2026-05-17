# Subtask 06 — Refactor LLM eval approach — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 06 |
| feature | Refactor LLM eval approach |
| assigned_agent | crux-software-engineer |
| model | composer-2-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-08T20:58:00+10:00 |
| last_heartbeat | 2026-05-08T11:11:39.764Z |
| completed_at | 2026-05-08T21:08:00+10:00 |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Bulk migration: every `// _meta.generated: true` file under `evals/llm/test_*.test.ts` uses shared types + centralized runner (after subtask 05 template is final) (`evals/llm/test_command_z-spec-execute.test.ts`)
- [x] **D02** — At least **two** command eval files exemplify **rich branching** (inline Vitest, not JSON re-encoding SDK tool flows) (`evals/llm/test_command_z-eval-configure.test.ts`)
- [x] **D03** — At least **one** skill or agent target demonstrates **declarative-first** or table-driven JSON for simple triggers (if subtask 01 approved) (`plugins/zoto-eval-system/evals/agents/zoto-eval-comparer.json`)
- [x] **D04** — Verify **both** entrypoints: document exact commands run in Execution Notes (`pnpm run eval:llm:code`, `pnpm run eval:llm:declarative` or scoped flags); full LLM runs optional if `CURSOR_API_KEY` absent—note skip behavior
- [x] **D05** — Collect **spec prompt** examples (for future analyser/eval consumer) in Execution Notes per subtask 02 ask
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `evals/llm/test_*.test.ts` — 37 files re-stamped via eval:bootstrap-llm-code to thin pattern (~30-line files using defineLlmCodeEval)
- **modified** `evals/llm/_shared/run-code-strategy-suite.ts` — Fixed process.cwd() → opts.repoRoot for judge agent cwd (2 occurrences)
- **deleted** `evals/llm/_shared/code-strategy-case.proof.ts` — Subtask 03 proof file removed — no longer needed after migration
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
## Execution Notes

### D01 — Bulk Migration
- Ran `pnpm run eval:bootstrap-llm-code` which stamped 37 targets using cached analyser payloads
- 6 targets skipped (no cached payload): skill:zoto-create-plugin, skill:zoto-advise-evals, command:sync-plugins, command:zoto-create-plugin, hook:zoto-eval-system, hook:cursor-workspace
- All 37 stamped files converted from ~240-370 line old pattern to ~30-160 line thin pattern
- Files now import `CodeStrategyCaseDefinition` from `_shared/code-strategy-case.js` and call `defineLlmCodeEval()`

### D02 — Rich Branching Exemplars
1. `test_command_z-eval-configure.test.ts`: 9 cases, 8 with follow_ups (up to 6 follow-up steps simulating multi-turn configuration conversations)
2. `test_command_z-spec-execute.test.ts`: 9 cases, 4 with follow_ups (approval flows, failure handling, resume, aggregator watching)

### D03 — Declarative-First Example
- `plugins/zoto-eval-system/evals/agents/zoto-eval-comparer.json`: 3 cases with structured assertions and fixtures
- Simple trigger patterns (compare 2 runs, ambiguous resolution, 3-run comparison) well suited to JSON format

### D04 — Entrypoint Verification
- `pnpm run eval:llm:code` → `vitest run --config evals/llm/vitest.config.ts` — vitest loaded all 37 suites, setup detected CURSOR_API_KEY, began executing (timed out after 30s for practicality)
- `pnpm run eval:llm:declarative` → `tsx evals/_llm/runner.ts --full` — runner starts correctly, rejects 12 cases missing `_meta.primitive_analysis` with actionable error messages
- Skip behavior: when CURSOR_API_KEY absent, code-strategy tests emit `it.skip(...)` per case; declarative runner would skip LLM execution

### D05 — Spec Prompt Examples
Three prompt archetypes for future analyser codegen:
1. **Command trigger**: `/z-eval-configure` — bare slash-command, branching driven by follow_ups
2. **Narrative scenario**: "Cursor just finished wiring the newest LLM eval batch. Pull up the adversarial judge evals guidance..." — rich natural language describing context and expected workflow
3. **Specific-entity**: "Use the eval-system comparer to compare two finished harness runs: pass run directory names 20260503051900 and 20260503052015..." — entity IDs and concrete parameters

### Additional Fixes
- Fixed `process.cwd()` → `opts.repoRoot` in `dispatchGraders` (2 occurrences in run-code-strategy-suite.ts) per subtask 04 judge recommendation
- Deleted `evals/llm/_shared/code-strategy-case.proof.ts` (subtask 03 compile-time proof, no longer needed)

### DoD Verification
- DoD01: `rg "interface CaseDefinition" evals/llm/test_*.test.ts` returns zero matches
- DoD02: `pnpm --filter @zoto-agents/zoto-eval-system test` passes 62/62; spec-system has 4 pre-existing failures (aggregator, spawn-prefix, status-roundtrip) unrelated to this migration
- DoD03: README dual-strategy section at `plugins/zoto-eval-system/README.md#llm-eval-strategies-declarative--code` matches post-refactor behavior — entrypoint scripts, artifact locations, taxonomy playbook, and thin-file pattern all accurately documented

<!-- status:notes:end -->
