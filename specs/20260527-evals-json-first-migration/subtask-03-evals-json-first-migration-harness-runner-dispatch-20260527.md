# Subtask: Harness `runner` Case Dispatch

## Metadata
- **Subtask ID**: 03
- **Feature**: evals-json-first-migration
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01
- **Created**: 20260527

## Objective

Extend the shared LLM harness `defineLlmEval()` in `evals/llm/_shared/run-llm-suite.ts` so a JSON case carrying a `runner` field is dispatched to an external `.test.ts` file via dynamic import, **bypassing all declarative grading**.

Runner cases keep using the existing `it()` wrapper, sandbox lifecycle, and `reportCase` reporter integration — only the case body changes. The runner TS file owns the assertion logic.

## Deliverables Checklist
- [x] Update `evals/llm/_shared/run-llm-suite.ts` to detect runner cases inside the loop that emits `it()` blocks. Detection rule: `typeof caseDef.runner === "string" && caseDef.runner.length > 0`.
- [x] For runner cases, the synthesised `it()` body:
    1. Builds the `RunnerParams` payload (from `runner-params.ts` produced in subtask 01): `targetId`, `caseId`, `parameters = caseDef.parameters ?? {}`, and a populated `RunnerContext` (sdk bridge instance, sandbox helper, model id, judge model, reporter hooks).
    2. Resolves the `runner` string relative to the **JSON file's directory**. The JSON file path must be passed through from the loader (subtask 02) — extend the `defineLlmEval` options to accept an optional `__sourcePath: string` so the harness knows the JSON file's location. The loader sets this when it synthesises the module.
    3. Dynamically imports the runner file: `const mod = await import(new URL(runnerPath, pathToFileURL(sourcePath)).href);`
    4. Verifies `typeof mod.default === "function"`. If missing or wrong shape, fails the test with a clear message naming the runner path.
    5. Awaits `const result: RunnerResult = await mod.default(params);`.
    6. Calls `reportCase` with `result.passed`, `result.reason`, and any diagnostics.
    7. Uses `expect(result.passed, result.reason).toBe(true)` to surface the pass/fail to Vitest.
- [x] Add type guards / runtime assertion helpers in `evals/llm/_shared/run-llm-suite.ts`:
    - `isRunnerCase(c: LlmCaseDefinition): boolean`
    - `assertNoHybridCase(c: LlmCaseDefinition): void` — throws if a case has both `runner` AND any declarative field (mirrors the engine `validateEnriched` check, but operating at suite-load time).
- [x] Update the suite-load validator (`validateCasesAtSuiteLoad` or equivalent) to run `assertNoHybridCase` per case and to confirm the `__sourcePath` option is present whenever any case is a runner case (otherwise we cannot resolve the relative path safely).
- [x] Document the `__sourcePath` option in the `defineLlmEval` JSDoc. Mark it as **set by the JSON loader; tests authored by hand may set it to `import.meta.url`**.
- [x] Add focused harness tests under `evals/llm/_shared/run-llm-suite.test.ts`:
    - Runner case dispatch: a fixture JSON case with `runner: "./fixture-runner.test.ts"` invokes the default export and the default export's return value is reflected in the test outcome.
    - Hybrid rejection at suite load time.
    - Missing default export error has a clear message.
    - `__sourcePath` omission with a runner case raises a clear error.
- [x] Provide a minimal fixture runner `evals/llm/_shared/__fixtures__/sample-runner.test.ts` that exports a default function returning `{ passed: true, reason: "ok" }`. This is consumed by the harness tests only.

## Definition of Done
- [x] `defineLlmEval` correctly partitions declarative vs runner cases.
- [x] Runner cases produce one `it()` per case, dispatch to the referenced TS file, and bubble pass/fail through the standard reporter.
- [x] Suite-load validation rejects hybrid cases and missing `__sourcePath` cases.
- [x] Unit tests for the new branches all pass.
- [x] No regressions in existing declarative-case behaviour (existing harness tests still pass).
- [x] No linter errors in modified files.

## Implementation Notes

- **Why `__sourcePath` and not `import.meta.url`:** `import.meta.url` inside `run-llm-suite.ts` points to the harness module, not the eval JSON. The loader is the only place that knows the JSON file path, so it must inject it. Naming the field `__sourcePath` signals "internal plumbing — not meant for hand-authored callers."
- **Dynamic import semantics:** Vitest's loader transforms `.test.ts` modules on import, so a runner TS file is type-checked and transpiled normally. The runner can import anything from the harness (`RunnerParams`, `RunnerResult`, sandbox helpers) since it sees the same module graph.
- **Reporter integration:** The runner case must still call `reportCase` via the standard mechanism so `evals/_runs/<id>/llm.yml` contains the case row. Use the same call-site pattern as the declarative branch: build a `CaseReport` struct, then `reporter.reportCase(report)`. Diagnostics from the runner are stored in `extras` on the report.
- **Timeout handling:** Honour `caseTimeoutMs` — Vitest's `it()` already enforces this when set on the test. Runner case bodies do not need their own timer.
- **Failure mode for missing/invalid runner module:** Fail-fast with `throw new Error(\`Runner case '<id>' could not load runner file '<path>': <underlying error>\`)`. Wrap dynamic-import errors so the JSON case ID is in the message.
- **No SDK invocation for runner cases:** The runner case body must NOT call `createAgent` itself unless the runner TS file does so. The harness simply hands over control. This is critical: runner cases are the escape hatch precisely because they need to do non-standard SDK orchestration.
- **`RunnerContext` plumbing:** Build the context once per `it()` invocation. Pass the same `sandbox` helper instance the declarative path uses so fixture materialization stays consistent.
- **Skill cases never reach this code path:** Skill `evals.json` is consumed by the declarative `engine/runner.ts`, not Vitest. No skill-related logic needed in the harness.

## Testing Strategy
**IMPORTANT**: Do NOT trigger the global test suite during parallel execution. Instead:
- Run only the harness unit tests:
  - `pnpm exec vitest run --config evals/llm/_shared/vitest.config.ts evals/llm/_shared/run-llm-suite.test.ts`
- Run `pnpm exec tsc --noEmit -p evals/llm/_shared/tsconfig.json`.
- Defer end-to-end integration with the loader to subtask 06.

## Execution Notes

### Agent Session Info
- Agent: *(not yet assigned)*
- Started: *(not yet started)*
- Completed: *(not yet completed)*

### Work Log
*(Agent adds notes here during execution.)*

### Blockers Encountered
*(Any blockers or issues.)*

### Files Modified
*(List of files changed.)*
