# Subtask: Shared eval types module (TypeScript)

## Metadata
- **Subtask ID**: 03
- **Feature**: Refactor LLM eval approach
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 01
- **Created**: 20260508

## Objective

Eliminate per-file `interface CaseDefinition` duplication by introducing a **canonical TypeScript module** for code-strategy case shapes and grader configs, **aligned with** `evals/_llm/case.ts` (`EvalCase`, `DeclarativeGraderConfig`, `CaseMeta`, fixtures, expected filesystem). Use **`.ts`** and ESM style consistent with `evals/llm/` and `evals/_llm/` (not `common.js`).

## Deliverables Checklist
- [x] New or extended module(s), e.g. `evals/llm/_shared/code-strategy-case.ts` (name adjustable) exporting the case type used by Vitest tests **and** re-using or narrowing `DeclarativeGraderConfig` where possible
- [x] If needed, thin **re-export** from `evals/_llm/case.ts` or a shared `evals/_llm/shared-types.ts` to avoid circular imports—document the graph in a comment
- [x] Update **one** representative `evals/llm/test_*.test.ts` to consume the shared type (proof of concept) OR defer bulk migration to subtask 06 if subtask 04 needs the harness first—coordinate so no double mass-edit
- [x] Typecheck passes (`pnpm exec tsc --noEmit` or repo-standard equivalent if present)

## Definition of Done
- [x] No duplicate inline `CaseDefinition` in new/edited files introduced by this subtask
- [x] `// _meta.generated: true` stamped files: only change via **template** + `eval-stamp` in subtask 05 unless this subtask touches non-generated helpers only

## Implementation Notes
- Preserve `_meta.generated` contracts: `evals/_llm/_user-case-guards.ts` and file guards must remain authoritative.
- Prefer **string `id`** for Vitest cases if that stays the stamped convention; map to `EvalCase['id']` (`number | string`) at JSON boundaries if merging types.

## Testing Strategy
- **IMPORTANT**: During parallel work, run **targeted** typecheck / Vitest on touched modules only; defer full monorepo test to subtask 06 / final verification.

## Execution Notes

### Agent Session Info
- Agent: crux-software-engineer
- Started: 2026-05-08T20:16:00+10:00
- Completed: 2026-05-08T20:24:00+10:00

### Work Log

1. Read all key files: `evals/_llm/case.ts`, `evals/_llm/sdk-bridge.ts`, `evals/llm/_shared/sdk-bridge.ts`, `evals/_llm/_user-case-guards.ts`, `evals/llm/_shared/_user-case-guards.ts`, `scripts/eval-analyse.ts`, `per-primitive-test.ts.tmpl`, and a representative stamped test file.
2. Confirmed both sdk-bridge copies and both _user-case-guards copies were byte-identical (verbatim duplication).
3. Created `evals/llm/_shared/code-strategy-case.ts` — exports `CodeStrategyCaseDefinition` (the shared type for all 37 stamped test files) importing `CaseFixtures` and `CaseExpectedFilesystem` from `evals/_llm/case.ts`.
4. Replaced `evals/llm/_shared/sdk-bridge.ts` (215 lines) with a 33-line thin re-export from the canonical `evals/_llm/sdk-bridge.ts`.
5. Replaced `evals/llm/_shared/_user-case-guards.ts` (153 lines) with a 29-line thin re-export from the canonical `evals/_llm/_user-case-guards.ts`.
6. Created `evals/_llm/analyser-payload.ts` — canonical location for `AnalyserPayload`, `AnalyserCase`, `AnalyserFixtures`, `AnalyserFixtureFile`, `AnalyserExpectedFilesystem`, and `PrimitiveKind` types.
7. Updated `scripts/eval-analyse.ts` to import from `evals/_llm/analyser-payload.ts` and re-export (so existing consumers don't break).
8. Created `evals/llm/_shared/code-strategy-case.proof.ts` — compile-time proof demonstrating the shared type is a drop-in replacement.
9. Ran targeted typecheck — all new/modified files pass with zero errors.

### Blockers Encountered

None.

### Files Created
- `evals/llm/_shared/code-strategy-case.ts` — shared case type module
- `evals/_llm/analyser-payload.ts` — canonical AnalyserPayload types
- `evals/llm/_shared/code-strategy-case.proof.ts` — compile-time proof (deletable after subtask 06)

### Files Modified
- `evals/llm/_shared/sdk-bridge.ts` — verbatim copy → thin re-export
- `evals/llm/_shared/_user-case-guards.ts` — verbatim copy → thin re-export
- `scripts/eval-analyse.ts` — inline type defs → import + re-export from canonical module

### Coordination Notes for Subtasks 04-06

- **Subtask 04** (central runner): Import `AnalyserPayload` and related types directly from `evals/_llm/analyser-payload.ts` (shorter path, no need for the `scripts/` detour).
- **Subtask 05** (plugin templates): Update `per-primitive-test.ts.tmpl` line 43 to `import type { CodeStrategyCaseDefinition as CaseDefinition } from "./_shared/code-strategy-case.js";` removing the inline interface block (lines 43-58). Also update `case-runner.ts.tmpl` to import `AnalyserPayload` from `../../_llm/analyser-payload.js` instead of defining it inline.
- **Subtask 06** (bulk migration): Re-stamp all 37 test files. After re-stamping, delete `code-strategy-case.proof.ts`.
