# Subtask: Centralize code-strategy LLM runner (Vitest harness)

## Metadata
- **Subtask ID**: 04
- **Feature**: Refactor LLM eval approach
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 03
- **Created**: 20260508

## Objective

Extract the repeated **sandbox → agent → prompt → follow-ups → graders → filesystem diff → reporter** loop from `per-primitive-test.ts.tmpl` into a **single shared harness** under `evals/llm/_shared/` (e.g. `run-code-strategy-suite.ts` or `llm-code-runner.ts`). Each `evals/llm/test_*.test.ts` should become a **thin** file: imports, `CASES` data, `describe` wiring, env constants (`TARGET_ID`, models).

## Deliverables Checklist
- [x] New harness module with stable API: `defineLlmCodeEval` (name chosen for clarity)
- [x] Harness uses existing `_shared/sdk-bridge.ts`, `sandbox-helpers.ts`, `zoto-llm-reporter.ts`, `graders/*` without forking grader logic
- [x] **CURSOR_API_KEY** skip behavior preserved (match current per-test `it.skip` pattern)
- [x] One migrated test file proves parity (same assertions count / behavior) before bulk migration deferred to subtask 06

## Definition of Done
- [x] No behavioral regression in the proof migrated suite (targeted Vitest run)
- [x] Harness documented with a short module header comment

## Implementation Notes
- Align with subtask 03 types: harness accepts the shared case type.
- Keep token accounting (`resolveTokens`) and `afterAll` `reportSuite` semantics identical unless subtask 01 documented intentional changes.

## Testing Strategy
- Targets: `pnpm exec vitest run --config evals/llm/vitest.config.ts <path-to-one-test>`
- Do **not** trigger unrelated suites during active development.

## Execution Notes

### Agent Session Info
- Agent: crux-software-engineer
- Started: 2026-05-08T10:34:00Z
- Completed: 2026-05-08T10:42:00Z

### Work Log
1. Read template (`per-primitive-test.ts.tmpl`), a stamped test (`test_agent_zoto-eval-comparer.test.ts`), the case-runner template (`case-runner.ts.tmpl`), and all `_shared/` helpers (sdk-bridge, sandbox-helpers, reporter, graders).
2. Designed `defineLlmCodeEval(config)` as the single entry point — accepts `targetId`, `cases`, model overrides, timeout, and vitest framework bindings (`describe`, `it`, `afterAll`, `expect`).
3. Implemented `evals/llm/_shared/run-code-strategy-suite.ts` (~250 lines) with:
   - `defineLlmCodeEval()` — wires up `describe` block, `afterAll`→`reportSuite`, per-case `it`/`it.skip`
   - `runCase()` — internal single-case runner (sandbox, agent lifecycle, follow-ups, grader dispatch, metrics, reportCase)
   - `dispatchGraders()` — centralized grader dispatch (contains, regex, tool-called, llm-judge + assertion rubric)
   - `parseJudgeScore()` — shared judge response parser
4. Migrated `test_agent_zoto-eval-comparer.test.ts` from 280→70 lines (75% reduction).
5. Ran targeted Vitest: all 3 cases passed (269s total, live API key validation).

### Blockers Encountered
None.

### Files Created
- `evals/llm/_shared/run-code-strategy-suite.ts` — centralized harness module

### Files Modified
- `evals/llm/test_agent_zoto-eval-comparer.test.ts` — proof migration to harness (280→70 lines)

### Coordination Notes for Subtasks 05-06
- **Subtask 05 (template update)**: Update `per-primitive-test.ts.tmpl` to stamp thin files that import `defineLlmCodeEval` from `"./_shared/run-code-strategy-suite.js"` and `CodeStrategyCaseDefinition` from `"./_shared/code-strategy-case.js"`. The harness expects vitest bindings passed explicitly via config.
- **Subtask 06 (bulk migration)**: Each of the 37 stamped test files can be reduced to the same ~70-line pattern: imports + CASES array + single `defineLlmCodeEval(...)` call. The `_meta.generated: true` first-line contract is preserved. Use `test_agent_zoto-eval-comparer.test.ts` as the reference pattern.
- **API surface**: `defineLlmCodeEval(config: LlmCodeEvalConfig)` — single function, stable contract. The `LlmCodeEvalConfig` interface and `TestFramework` type are exported for downstream use.
- **Framework agnostic**: vitest globals (`describe`, `it`, `afterAll`, `expect`) are injected by the caller, not imported by the harness. This avoids requiring `globals: true` in vitest config.
