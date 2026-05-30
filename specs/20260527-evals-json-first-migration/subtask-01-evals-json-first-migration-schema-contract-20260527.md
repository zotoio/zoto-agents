# Subtask: Schema + RunnerParams Contract

## Metadata
- **Subtask ID**: 01
- **Feature**: evals-json-first-migration
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260527

## Objective

Establish the foundational typed and JSON-schema contracts for the new unified eval format. This is a code-only subtask — no migration of existing files yet, no Vitest wiring. The deliverables here are consumed by subtasks 02–05.

Three artefacts are produced:
1. A JSON Schema (`templates/schema/case.schema.json`) describing the full non-skill case shape with a `oneOf` discriminator on the `runner` field.
2. A new TypeScript module (`evals/llm/_shared/runner-params.ts`) exporting the `RunnerParams` interface, the `RunnerResult` shape, and the default-export function signature that TS runner files must implement.
3. Extensions to the existing case types: `LlmCaseDefinition` (in `evals/llm/_shared/llm-case.ts`) and `EvalCase` (in `plugins/zoto-eval-system/engine/case.ts`) gain optional `runner` and `parameters` fields.

## Deliverables Checklist
- [x] Create `plugins/zoto-eval-system/templates/schema/case.schema.json` — full JSON Schema for a non-skill case with `oneOf: [DeclarativeCase, RunnerCase]`. Required fields: `DeclarativeCase` = `id` + `prompt` + `assertions`; `RunnerCase` = `id` + `runner` + `parameters`. Reuse existing `_meta` definition from `case-meta.schema.json` via `$ref`.
- [x] Create `plugins/zoto-eval-system/templates/schema/runner-params.schema.json` — JSON Schema for the `parameters` payload contract (open shape: `targetId`, `caseId`, and a free-form `parameters` object).
- [x] Add a top-level eval-file schema `plugins/zoto-eval-system/templates/schema/eval-file.schema.json` — describes the wrapper `{ target_id, cases: [...case.schema.json], _meta? }` and `$ref`s the per-case schema. This is the JSON Schema for a non-skill `evals/<name>.json` file. Skill files (`evals.json` with `skill_name`) stay outside this schema.
- [x] Create `evals/llm/_shared/runner-params.ts` exporting:
    - `interface RunnerParams { targetId: string; caseId: string; parameters: Record<string, unknown>; context: RunnerContext; }`
    - `interface RunnerContext { sdk: SdkBridge; sandbox: SandboxHelper; modelId: string; judgeModel: string; report: ReportCaseFn; expect: typeof import("vitest").expect; agentFactory: AgentFactory; }` — surfaces everything a runner TS file needs without re-importing harness internals directly. `expect` and `agentFactory` are included directly so runner files don't need to import them separately.
    - `interface SdkBridge { ... }` — a named interface mirroring the SDK bridge's public surface (rather than `typeof import("./sdk-bridge")` which forces runner authors to know the module path).
    - `interface RunnerResult { passed: boolean; reason?: string; diagnostics?: Record<string, unknown>; }`
    - `type RunnerFn = (params: RunnerParams) => Promise<RunnerResult>` — the default-export contract.
- [x] Extend `LlmCaseDefinition` in `evals/llm/_shared/llm-case.ts`: add optional `runner?: string` (relative path to a `.test.ts` file from the JSON file's directory) and `parameters?: Record<string, unknown>`. Update the JSDoc to explain that a case with `runner` is a *runner case* and MUST NOT carry `assertions`, `graders`, `fixtures`, `expected_filesystem`, or `expected_output`.
- [x] Define the `__sourcePath` option on the `DefineLlmEvalOptions` interface (or create it if not yet present): `__sourcePath?: string` — the absolute path to the JSON eval file that sourced this test suite. This field is **set by the JSON loader** (subtask 02) and consumed by the harness runner dispatch (subtask 03) for resolving relative `runner` paths. Document in JSDoc that hand-authored callers may set it to `import.meta.url`. Both subtask 02 and 03 code against this contract.
- [x] Extend `EvalCase` in `plugins/zoto-eval-system/engine/case.ts`: add the same optional `runner?: string` and `parameters?: Record<string, unknown>` fields. Update `validateEnriched` to:
    - Accept runner cases (skip declarative-shape validation when `runner` is set).
    - Reject hybrid cases that combine `runner` with declarative fields (`assertions`, `graders`, `fixtures`, etc.).
    - Reject empty `runner` strings and non-`.test.ts` extensions.
- [x] Add unit tests for `validateEnriched`'s new branches (next to the existing engine tests or under `plugins/zoto-eval-system/tests/`). Cover: valid runner case, valid declarative case, hybrid case rejection, runner with wrong extension rejection.
- [x] Compile the schemas with Ajv inside the existing schema test (`plugins/zoto-eval-system/tests/plugin.test.ts` or wherever schemas are currently compiled in CI) to confirm they are well-formed.
- [x] Update the `_meta.generated` contract documentation in `case-meta.schema.json` if needed so runner cases can carry the marker the same way declarative cases do (no behavioural change — `_meta.generated` remains the user-vs-generated discriminator).

## Definition of Done
- [x] Three new JSON Schema files exist and Ajv-compile without errors
- [x] `runner-params.ts` exports the documented interfaces (`RunnerParams`, `RunnerContext`, `SdkBridge`, `RunnerResult`, `RunnerFn`) and is referenced (re-exported) from `evals/llm/_shared/index.ts`
- [x] `LlmCaseDefinition` and `EvalCase` both carry optional `runner` + `parameters`
- [x] `DefineLlmEvalOptions` (or equivalent) carries optional `__sourcePath` — contracted for use by subtasks 02 and 03
- [x] `validateEnriched` accepts runner cases, rejects hybrid cases, and rejects non-`.test.ts` runner paths
- [x] Targeted unit tests for the new validation branches pass (`pnpm --filter @zoto-agents/zoto-eval-system test` or the equivalent scoped invocation)
- [x] No linter errors in the modified files
- [x] No production code path consumes the new fields yet (consumers land in subtasks 02–05)

## Implementation Notes

- **Where to put the JSON Schemas:** Follow the existing convention in `plugins/zoto-eval-system/templates/schema/`. New files: `case.schema.json`, `eval-file.schema.json`, `runner-params.schema.json`. Reference the existing `case-meta.schema.json` via `$ref` for the `_meta` block.
- **`oneOf` discriminator vs JSON Schema 2020-12 `if/then`:** Either works. Prefer `oneOf` with `required` arrays on each branch since Ajv (^8.20.0) is already in `devDependencies`. The runner branch sets `required: ["id", "runner", "parameters"]` and forbids declarative fields via `not: { anyOf: [...] }`. The declarative branch sets `required: ["id", "prompt", "assertions"]` and forbids `runner`.
- **`RunnerContext` shape:** Read `evals/llm/_shared/run-llm-suite.ts` to see what `defineLlmEval` builds today (SDK, sandbox, model id, reporter). Mirror that surface in `RunnerContext` AND include `expect` (Vitest) and `agentFactory` (for spawning agents from runner files without separate imports) so subtask 03 can pass it to runner TS files without leaking implementation details. The richer surface avoids forcing every TS runner to re-import harness internals.
- **`runner` resolution semantics:** The `runner` string is a path relative to the **JSON file's directory** (not the repo root). Subtask 03 will `import(new URL(runner, jsonFileUrl))`. Document this clearly in the JSDoc and schema description.
- **Skill schema is untouched.** Do NOT change `templates/skill-evals/evals.json.tmpl` or the skill stamper. Subtask 04 will explicitly route skill files away from the new case schema.
- **Backwards compatibility:** Adding optional fields to `LlmCaseDefinition` / `EvalCase` is non-breaking. The existing 38 `.test.ts` files keep compiling unchanged until subtask 07 migrates them.
- **Convention check:** Follow `AGENTS.md` CRUX rules — do not edit any `.crux.md` / `.crux.mdc` derived files. Only edit source schemas and TS files.

## Testing Strategy
**IMPORTANT**: Do NOT trigger the global test suite during parallel execution. Instead:
- Run `pnpm --filter @zoto-agents/zoto-eval-system test` (or the scoped vitest invocation in the plugin) to exercise schema compilation and `validateEnriched` unit tests.
- Verify TypeScript compiles cleanly for changed files only:
  - `npx tsc --noEmit -p plugins/zoto-eval-system/tsconfig.json`
  - `npx tsc --noEmit -p evals/llm/_shared/tsconfig.json`
- The full eval suite (`pnpm eval`, `pnpm eval:full`) is deferred to subtask 10.

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
