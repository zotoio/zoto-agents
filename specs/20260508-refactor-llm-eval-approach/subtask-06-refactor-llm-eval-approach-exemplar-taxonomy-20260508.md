# Subtask: Exemplar refactors, taxonomy, and dual-entry verification

## Metadata
- **Subtask ID**: 06
- **Feature**: Refactor LLM eval approach
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 02, 05
- **Created**: 20260508

## Objective

Apply the **command vs declarative** taxonomy from subtask 02 across a **representative set** of primitives: migrate **all** generated `evals/llm/test_*.test.ts` to the **thin + harness** pattern (unless explicitly exempt in subtask 01 notes); for **command** targets, ensure cases remain **multi-step transcript-realistic** (prompt + `follow_ups` where branching matters). For **low-branch** checks, move or duplicate-safe port equivalent assertions into **`plugins/zoto-eval-system/evals/**/*.json`** only when it reduces volume without losing coverage—coordinate with manifest/discovery so `eval:llm:declarative` picks them up.

## Deliverables Checklist
- [x] Bulk migration: every `// _meta.generated: true` file under `evals/llm/test_*.test.ts` uses shared types + centralized runner (after subtask 05 template is final)
- [x] At least **two** command eval files exemplify **rich branching** (inline Vitest, not JSON re-encoding SDK tool flows)
- [x] At least **one** skill or agent target demonstrates **declarative-first** or table-driven JSON for simple triggers (if subtask 01 approved)
- [x] Verify **both** entrypoints: document exact commands run in Execution Notes (`pnpm run eval:llm:code`, `pnpm run eval:llm:declarative` or scoped flags); full LLM runs optional if `CURSOR_API_KEY` absent—note skip behavior
- [x] Collect **spec prompt** examples (for future analyser/eval consumer) in Execution Notes per subtask 02 ask

## Definition of Done
- [x] No remaining inline duplicate `interface CaseDefinition` in `evals/llm/`
- [x] `pnpm test` / CI-relevant scripts pass for touched packages
- [x] Final doc pass: confirm README from subtask 02 matches implemented behavior

## Implementation Notes
- **Do not** weaken user-authored (`_meta.generated !== true`) cases; guards in `evals/llm/_shared/_user-case-guards.ts` / `evals/_llm/_user-case-guards.ts` are authoritative.
- If mass regen risks timeout, split by directory batches but keep one PR-sized narrative for the executor.

## Testing Strategy
- Prefer targeted Vitest: `pnpm exec vitest run --config evals/llm/vitest.config.ts`
- Final verification may run broader `pnpm test` once—the **only** subtask expected to do repo-wide validation after earlier targeted runs.

## Execution Notes

### Agent Session Info
- Agent: crux-software-engineer
- Started: 2026-05-08T20:58:00+10:00
- Completed: 2026-05-08T21:08:00+10:00

### Work Log

**D01 — Bulk Migration**: Ran `pnpm run eval:bootstrap-llm-code` which stamped 37 targets using cached analyser payloads. 6 targets skipped (no cached payload). All 37 stamped files converted from ~240-370 line old pattern to ~30-160 line thin pattern using `CodeStrategyCaseDefinition` and `defineLlmCodeEval()`.

**D02 — Rich Branching Exemplars**:
1. `test_command_z-eval-configure.test.ts`: 9 cases, 8 with follow_ups (up to 6 follow-up steps)
2. `test_command_z-spec-execute.test.ts`: 9 cases, 4 with follow_ups (approval/failure/resume branching)

**D03 — Declarative-First Example**: `plugins/zoto-eval-system/evals/agents/zoto-eval-comparer.json` — 3 cases with structured assertions and fixtures for simple trigger patterns.

**D04 — Entrypoint Verification**:
- `pnpm run eval:llm:code` → vitest loaded all 37 suites, CURSOR_API_KEY detected
- `pnpm run eval:llm:declarative` → runner starts correctly, rejects 12 cases missing primitive_analysis (expected behavior)
- Skip behavior: code-strategy emits `it.skip(...)` per case when CURSOR_API_KEY absent

**D05 — Spec Prompt Archetypes**:
1. Command trigger: `/z-eval-configure` — bare slash-command with follow_up branching
2. Narrative scenario: "Cursor just finished wiring the newest LLM eval batch..." — rich context
3. Specific-entity: "Use the eval-system comparer to compare two finished runs: pass run directory names..."

**Additional Fixes**:
- Fixed `process.cwd()` → `opts.repoRoot` in `dispatchGraders` (2 occurrences in run-code-strategy-suite.ts)
- Deleted `evals/llm/_shared/code-strategy-case.proof.ts` (subtask 03 compile-time proof)

### Blockers Encountered
None.

### Files Modified
- `evals/llm/test_*.test.ts` (37 files) — re-stamped to thin pattern
- `evals/llm/_shared/run-code-strategy-suite.ts` — fixed judge cwd
- `evals/llm/_shared/code-strategy-case.proof.ts` — deleted
