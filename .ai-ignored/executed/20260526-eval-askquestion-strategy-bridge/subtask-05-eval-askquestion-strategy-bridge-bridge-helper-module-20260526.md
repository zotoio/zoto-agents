# Subtask: AskQuestion bridge helper module

## Metadata
- **Subtask ID**: 05
- **Feature**: Eval AskQuestion Strategy Bridge
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: claude-opus-4-7-thinking-xhigh
- **Dependencies**: 01
- **Created**: 20260526

## Objective

Implement `evals/llm/_shared/askquestion-bridge.ts` per the ADR produced by Subtask 01, plus its unit tests. The module is the single shared helper code-strategy tests use to script answers to interactive `AskQuestion` tool calls (or, if the SDK has no native interception, the module emulates that surface via the documented fallback so the case shape stays unchanged for callers).

## Deliverables Checklist
- [ ] `evals/llm/_shared/askquestion-bridge.ts` — new module exporting the surface pinned by the ADR. At minimum: a "create agent with scripted answers" entry point, an "advance run with answer injection" helper, and a `CodeStrategyCaseDefinition`-compatible accessor that downstream cases use to declare their scripted answers.
- [ ] `evals/llm/_shared/askquestion-bridge.test.ts` — vitest unit tests covering: (a) creating an agent with scripted answers; (b) advancing through a happy-path interaction sequence; (c) the fallback path when the SDK lacks native interception; (d) the error case when the runner exhausts scripted answers before the run finishes; (e) the round-trip with `runCase` from `run-code-strategy-suite.ts` — driven by stubbed agent/run mocks.
- [ ] `evals/llm/_shared/code-strategy-case.ts` extended with an optional `interactions?: { questions: string[]; answers: string[] }` field (or whatever shape the ADR pins). The existing `follow_ups[]` shape stays — both fields can coexist for the migration window. Add JSDoc that explains the ordering precedence.
- [ ] Re-export entry in any `_shared/` package barrel (if one exists; create the barrel `evals/llm/_shared/index.ts` if not).
- [ ] Brief module README comment block at the top of `askquestion-bridge.ts` mirroring the discipline in `sdk-bridge.ts` (cite consumers, document the fallback, pin the SDK version this was last verified against).

## Definition of Done
- [ ] New module compiles under the repo's existing tsconfig (`pnpm exec tsc --noEmit`).
- [ ] Unit tests pass with stubbed SDK; no live `CURSOR_API_KEY` is required.
- [ ] Module documents the fallback explicitly (when the SDK has no interception, scripted answers degrade to ordinary `agent.send(answer)` follow-ups; the case is tagged `interaction_style: synthetic` in the per-case report).
- [ ] No edits to existing `sdk-bridge.ts`, `run-code-strategy-suite.ts`, or stamped `test_*.test.ts` files (those land in subtask 07).
- [ ] No global test suite triggered.

## Implementation Notes

The exact API surface is pinned by Subtask 01's ADR — the deliverable here is the **implementation** of that ADR, not a redesign. If the ADR turns out to be ambiguous on a specific point, raise a blocker in Execution Notes rather than improvising; the spec authority is the ADR.

Architectural guidance regardless of ADR specifics:

- The module imports SDK types through `evals/llm/_shared/sdk-bridge.ts` (the existing wrapper). It does NOT import `@cursor/sdk` directly — the bridge discipline keeps the rewrite surface flat.
- All exported functions MUST be pure or take their dependencies via parameters so unit tests can substitute stubs (mirrors `dispatchExplicitGraders` in `run-code-strategy-suite.ts`).
- Token resolution is delegated to `sdk-bridge.resolveTokens` — do not introduce parallel token math.
- The fallback path MUST tag its results with `interaction_style: synthetic` so the runner / reporter can call out the degraded mode in `report.yml`.
- If the ADR authorises a new test-time `it.each`-style helper, add it; otherwise let `defineLlmCodeEval` consume the bridge through `runCase` only.

Cross-references for context (do NOT modify these in this subtask):
- `evals/llm/_shared/sdk-bridge.ts` — model the JSDoc + version-pin discipline.
- `evals/llm/_shared/run-code-strategy-suite.ts` — the consumer that subtask 07 will adapt.
- `evals/llm/_shared/code-strategy-case.ts` — the case shape; extend it minimally.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- `pnpm exec vitest run evals/llm/_shared/askquestion-bridge.test.ts`
- `pnpm exec tsc --noEmit` scoped to the touched files.

The unit tests live alongside the module under `evals/llm/_shared/`; do not put them under `evals/llm/test_*.test.ts` (that path is reserved for stamped per-primitive tests guarded by `_user-case-guards.ts`).

## Execution Notes

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
