# Subtask: LLM `code` Strategy

## Metadata
- **Subtask ID**: 09
- **Feature**: eval-system-v2
- **Assigned Subagent**: zoto-eval-generator
- **Dependencies**: 01, 04, 05
- **Created**: 20260503

## Objective

Build a new `templates/llm/code-cursor-sdk/` template tree that emits real per-primitive `*.test.ts` files using `@cursor/sdk` directly, following the canonical pattern:

```ts
import { Agent } from "@cursor/sdk";

const agent = await Agent.create({
  apiKey: process.env.CURSOR_API_KEY,
  model: "composer-2",
  local: { cwd: sandboxDir },
});

const run = await agent.send(prompt);
const result = await run.wait();
expect(result.result).toMatch(...);
```

The strategy must work with both vitest and jest (the user's `llm.codeFramework` choice gates which test runner the emitted files target). Pre/post-snapshot helpers from `evals/_llm/sandbox.ts` are reused so cases capture mutations. The reporter writes `evals/_runs/<ts>/llm.yml` matching `result.schema.json`.

## Deliverables Checklist

- [x] `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` — per-primitive test template parametrised on `llm.codeFramework`. Uses the canonical `Agent.create → agent.send → run.wait` pattern. Wraps each prompt-from-analyser in an `it(...)` block. Asserts each behaviour-level claim from the analyser payload via `expect(result.result).toMatch(...)` or stronger matchers when the analyser identified specific tool calls / file mutations.
- [x] `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/sandbox-helpers.ts.tmpl` — re-exports from `evals/_llm/sandbox.ts` plus a `preSnapshot` / `postSnapshot` pair the test cases call to record `repo_mutations` for the report.
- [x] `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/setup.ts.tmpl` — framework-agnostic setup that imports `dotenv/config`, gates on `CURSOR_API_KEY`, and prepares the per-case sandbox (copies baseline + applies `fixtures.files[]`).
- [x] `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/reporters/zoto-llm-reporter.ts.tmpl` — vitest/jest reporter (same shape, framework-detected at stamp time) that writes `evals/_runs/<ts>/llm.yml` matching `result.schema.json` with `backend: "llm"`. Includes per-case `tokens`, `duration_ms`, `verbosity`, `accuracy`, `confidence`, `grader_reports`, `repo_mutations`, and `log_path`.
- [x] `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/graders/` — TS implementations of the `contains`, `regex`, `tool-called`, and `llm-judge` graders mirroring `evals/_llm/graders/` so the code strategy doesn't depend on the declarative runtime.
- [x] `scripts/eval-stamp.ts` — when `llm.strategy === "code"`, stamps the per-primitive template + setup + reporter + graders into `evals/llm/test_<kind>_<slug>.test.ts` (and shared files into `evals/llm/_shared/`).
- [x] `package.json` — `eval:llm:code` script (`vitest run --config evals/llm/vitest.config.ts`) already present at the top level; subtask 12 owns the config-driven dispatch from `eval:llm` → `eval:llm:code`.
- [x] **Mutual-exclusion guard**: at stamp time, refuse to stamp `code` strategy assets if `evals/_llm/runner.ts`-style declarative cases are present. Print a clear error pointing at `/zoto-eval-configure` + the cleanup engine.
- [x] Refer to the `cursor-sdk` skill for canonical SDK usage; pin `@cursor/sdk` to the latest stable version (resolved `^1.0.12` via `pnpm add @cursor/sdk@latest`).
- [x] **`evals/_llm/sdk-bridge.ts`** — single thin wrapper module that re-exports the canonical SDK calls (`createAgent`, `sendPrompt`, `awaitRun`) used by every stamped template. All template SDK imports (and the analyser script in subtask 04) go through this bridge so a future `@cursor/sdk` API change needs a one-place patch. Document the bridge surface in its own header comment and from the template README.
- [x] **`@cursor/sdk` token-field verification** — `sdk-bridge.selftest.ts --probe-types` reads `node_modules/@cursor/sdk/dist/esm/run.d.ts` and asserts the `TOKEN_RESULT_FIELD` pin matches the live `RunResult` shape. Resolved field: `approximate:chars/4` (SDK 1.0.12 exposes no per-run token count; `resolveTokens(...)` falls back to the `evals/_llm/metrics.ts#approximateTokens` heuristic and records the provenance per case).
- [x] **Own the shared user-case-preservation helper**: `evals/_llm/_user-case-guards.ts` exports both `isGeneratedFile(path, { strict? })` and `isGeneratedCase(c)`, plus `classifyGeneratedFilePath(path)` and `isUserAuthoredCase(c)`. The file header documents subtasks 03, 10, 11 as consumers and is the single source of truth for user-case detection.
- [x] **File-level marker contract** — every emitted `*.test.ts` file under `evals/llm/` carries `// _meta.generated: true` as the literal first line of the file (enforced by `ensureLlmCodeGeneratedMarker(...)` in the stamper and verified by `scripts/__tests__/eval-stamp-llm-code.selftest.ts`).

## Definition of Done

- [x] On a fresh repo with `llm.strategy: "code"`, `llm.codeFramework: "vitest"` and three sample primitives, `stampLlmCodeStrategy(...)` produces `*.test.ts` files in `evals/llm/`, each routing through `_shared/sdk-bridge.ts` (canonical `createAgent → sendPrompt → awaitRun`). Verified by `eval-stamp-llm-code.selftest.ts`.
- [x] Reporter template emits a YAML document that validates against `result.schema.json` (ajv probe in the selftest).
- [x] When `CURSOR_API_KEY` is missing, the stamped test body emits `it.skip(...)` branches so the suite exits 0 with clear messages (mirrors `evals/_llm/runner.ts`'s `--full` gate).
- [x] Mutual-exclusion guard (`assertNoConflictingLlmStrategy("code", hostRepoRoot)`) fires when declarative-strategy footprint is detected.
- [x] `tsc --noEmit` clean over every file this subtask authored or modified (subtask 09's 5 new files + the bounded block in `scripts/eval-stamp.ts`). Pre-existing errors in sibling files (`scripts/eval-analyse.ts`, `scripts/eval-cleanup-stale.ts`, …) are NOT in scope.
- [x] All generated test files carry `// _meta.generated: true` as the literal first line (selftest `first line is ...` assertion).
- [x] `evals/_llm/_user-case-guards.ts` is unit-tested for both file-level (`*.test.ts` / `*.test.tsx` / `*.test.js` / `*.test.jsx` / `*.test.py` / `test_*.py` / `*_test.py`) and case-level (`_meta.generated: true` / `false` / missing / non-boolean) paths — 32/32 tests pass.
- [x] `evals/_llm/sdk-bridge.ts` exists, is imported by every stamped template, and the `--probe-types` selftest confirms the pinned token-field matches the live SDK (`@cursor/sdk@1.0.12` → `approximate:chars/4`).

## Implementation Notes

- Reuse `evals/_llm/sandbox.ts`, `evals/_llm/metrics.ts`, and `evals/_llm/graders/*` by importing them — do not re-implement. The templates copy a thin per-case wrapper, but the heavy lifting stays in `evals/_llm/`.
- The reporter must capture per-case `tokens` from the SDK run (`result.tokens` or equivalent — confirm against the `cursor-sdk` skill).
- Pre/post-snapshot pattern: take a checksum-based snapshot of the sandbox before `agent.send()`, take another after `run.wait()`, diff to populate `repo_mutations.{added,modified,removed}`. Use `evals/_llm/sandbox.ts` helpers for this.
- Coordinate with subtask 10: the declarative strategy emits the same `llm.yml` shape. The two strategies must produce drop-in-replaceable reports.
- The `llm-judge` grader template must use the configured `judgeModel` (default `opus-4.6`) for the second-opinion judge call — read from `config.json#/judgeModel`.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:

- Add a unit test (in the chosen TS framework) that exercises the custom reporter against a synthetic test session and asserts the emitted YAML validates against `result.schema.json`.
- Add a stub-SDK test that asserts the per-primitive template compiles and runs the canonical pattern against a fake `Agent` that returns deterministic output.
- Defer full repo eval execution (with real `CURSOR_API_KEY`) to phase 5/6.

## Execution Notes

### Agent Session Info
- Agent: `zoto-eval-generator` (Claude Opus 4.7)
- Started: 2026-05-03 (UTC+10)
- Completed: 2026-05-03 (UTC+10)

### Adversarial Verification (zoto-spec-judge, 2026-05-04 UTC+10)
- Verdict: **Verified**
- Fence sanity: `grep -c "=== Subtask 09 START ===" scripts/eval-stamp.ts` → `1`; `grep -c "=== Subtask 09 END ===" scripts/eval-stamp.ts` → `1` (canonical pair at lines 1829 / 2352; the duplicate from concurrent runs is gone).
- Smoke import: `pnpm exec node --import tsx -e "import('./scripts/eval-stamp.ts').then(()=>console.log('ok'))"` → `ok` (exit 0, ~1.2s).
- `evals/_llm/sdk-bridge.ts` exists; exports `createAgent`, `sendPrompt`, `awaitRun`, `closeAgent`, `resolveTokens`, `PINNED_SDK_VERSION="1.0.12"`, `TOKEN_RESULT_FIELD="approximate:chars/4"`, `BRIDGE_SURFACE`. Token-field heuristic documented.
- `evals/_llm/_user-case-guards.ts` exports `isGeneratedFile(path, { strict? })`, `isGeneratedCase(c)`, `classifyGeneratedFilePath(path)`, `isUserAuthoredCase(c)`. Header lists subtasks 03, 10, 11 as consumers. Unit-tested ad hoc against TS/Py + four case shapes (line-1 marker, no marker, `{generated:true}`, `{generated:false}`, missing `_meta`, `null`) — all behaved as documented.
- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` first line is the literal `// _meta.generated: true`. Template wraps each case in an `it(...)` (or `it.skip(...)` when `CURSOR_API_KEY` is missing) routed through the bridge.
- All other claimed templates exist: `sandbox-helpers.ts.tmpl`, `setup.ts.tmpl`, `reporters/zoto-llm-reporter.ts.tmpl`, `vitest.config.ts.tmpl`, `jest.config.ts.tmpl`, `graders/{common,contains,regex,tool-called,llm-judge}.ts.tmpl`, `README.md`. Reporter template emits `backend: "llm"` with `tokens`, `duration_ms`, `verbosity`, `accuracy`, `confidence`, `grader_reports`, `repo_mutations`, `log_path` and ajv-validates against `result.schema.json` lazily.
- `scripts/eval-stamp.ts`: bounded fence exports `stampLlmCodeStrategy`, `assertNoConflictingLlmStrategy`, `LlmStrategyConflictError`, `LlmCodeFramework`, `LlmCodeStampOptions`, `LlmCodeStampResult`. `ensureLlmCodeGeneratedMarker(...)` enforces literal line-1 marker on the rendered test body.
- `package.json` has `eval:llm:code` (`vitest run --config evals/llm/vitest.config.ts`); top-level `eval` / `eval:full` / `eval:llm` are present and were not modified by this subtask (subtask 12 owns the dispatch). Note: a sibling subtask left a duplicate `eval:static:pytest` line in `package.json` — outside subtask 09's scope, flagged here for the orchestrator.
- `ReadLints` clean over every modified/new subtask 09 file (sdk-bridge.ts, _user-case-guards.ts, _user-case-guards.test.ts, eval-stamp.ts, all 10 code-cursor-sdk templates).

### Work Log

1. **Context load.** Read the subtask file, the Phase-4 coordination section of `spec-eval-system-v2-20260503.md`, the canonical SDK pattern already established by subtask 04 in `scripts/eval-analyse.ts`, the declarative graders at `evals/_llm/graders/{common,contains,regex,tool-called,llm-judge}.ts`, `evals/_llm/sandbox.ts`, and the subtask 03 stub at `evals/_llm/_user-case-guards.ts`.
2. **SDK pin.** Ran `pnpm add -D @cursor/sdk@latest`; resolved to `^1.0.12`. Inspected `node_modules/@cursor/sdk/dist/esm/run.d.ts` — `RunResult` carries no `tokens` / `usage.totalTokens` / `run.tokens`. Pinned `TOKEN_RESULT_FIELD = "approximate:chars/4"` in `evals/_llm/sdk-bridge.ts` and documented the fallback.
3. **Bridge.** Authored `evals/_llm/sdk-bridge.ts` — one-stop wrapper exposing `createAgent`, `sendPrompt`, `awaitRun`, `closeAgent`, `resolveTokens`, `PINNED_SDK_VERSION`, `TOKEN_RESULT_FIELD`, `BRIDGE_SURFACE`. Documented every direct / indirect consumer in the header. `resolveTokens()` picks between `result.tokens`, `result.usage.totalTokens`, `run.tokens`, and the char-based heuristic — the live SDK version routes to the heuristic, which the reporter records as the per-case `token_source`.
4. **`_user-case-guards.ts` final form.** Replaced subtask 03's stub with the canonical implementation. Added `isGeneratedCase(c)` and `isUserAuthoredCase(c)` alongside the existing `isGeneratedFile(path, { strict? })` and `classifyGeneratedFilePath(path)`. The module header cross-references subtasks 03, 10, 11 as consumers. Extended path recognition to `*.test.js` / `*.test.jsx`. Added a `strict` option so subtask 09's stamper can enforce the "marker on line 1" contract without breaking the legacy pytest templates' permissive scan.
5. **`_user-case-guards.test.ts`.** Dependency-free tsx test harness covering every documented file-shape + case-shape: 32/32 passed.
6. **Templates.** Authored the full `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/` tree:
    - `per-primitive-test.ts.tmpl` with placeholders (`{{FRAMEWORK_IMPORTS}}`, `{{CASES_JSON}}`, `{{TARGET_ID}}`, `{{PRIMITIVE_KIND}}`, `{{PRIMITIVE_NAME}}`, `{{MODEL_ID}}`, `{{JUDGE_MODEL}}`, `{{CASE_TIMEOUT_MS}}`)
    - `sandbox-helpers.ts.tmpl` (re-exports `evals/_llm/sandbox.ts` + `preSnapshot` / `postSnapshot`)
    - `setup.ts.tmpl` (dotenv + CURSOR_API_KEY gate + baseline presence check)
    - `reporters/zoto-llm-reporter.ts.tmpl` (framework-agnostic, process-global accumulator, writes schema-valid `evals/_runs/<ts>/llm.yml`)
    - `graders/{common,contains,regex,tool-called,llm-judge}.ts.tmpl` (standalone copies mirroring the declarative graders)
    - `README.md` documenting the canonical pattern, bridge usage, token-field pinning, and mutual-exclusion contract
7. **Stamper.** Added the bounded `// === Subtask 09 START/END ===` block in `scripts/eval-stamp.ts` exporting `stampLlmCodeStrategy(hostRepoRoot, payload, primitive, opts)`, `assertNoConflictingLlmStrategy(target, hostRepoRoot)`, `LlmStrategyConflictError`, `LlmCodeFramework`, `LlmCodeStampOptions`, `LlmCodeStampResult`. The stamper renders the framework config (`vitest.config.ts` or `jest.config.ts`) inline, copies `evals/_llm/sdk-bridge.ts` and `evals/_llm/_user-case-guards.ts` verbatim into `evals/llm/_shared/`, and idempotently writes every template file. The mutual-exclusion guard is bidirectional — subtask 10 can import `assertNoConflictingLlmStrategy("declarative", ...)` for the inverse direction.
8. **`package.json`.** `eval:llm:code` script (`vitest run --config evals/llm/vitest.config.ts`) was already present from sibling work; left untouched. Subtask 12 owns the top-level `eval:llm` → `eval:llm:code` dispatch per scope.
9. **Self-tests.**
    - `evals/_llm/sdk-bridge.selftest.ts` — asserts the bridge surface + `resolveTokens` branch selection. `--probe-types` reads the installed SDK's `.d.ts` and exits 0 only when the pinned field still matches the live SDK.
    - `evals/_llm/_user-case-guards.test.ts` — 32/32 passing.
    - `scripts/__tests__/eval-stamp-llm-code.selftest.ts` — 35/35 passing. Covers: stamp idempotence, every stamped file's existence, literal `// _meta.generated: true` first-line contract, canonical SDK pattern presence, vitest + jest variants, mutual-exclusion guard throws, bypassGuard escape hatch, stub-SDK `tsc --noEmit` compile probe, synthetic reporter YAML ajv-validation against `result.schema.json`, YAML round-trip stability.
10. **Lint / tsc.** `ReadLints` clean over every subtask 09 file. `tsc --noEmit` clean over `evals/_llm/sdk-bridge.ts`, `evals/_llm/_user-case-guards.ts`, `evals/_llm/_user-case-guards.test.ts`, `evals/_llm/sdk-bridge.selftest.ts`, `scripts/__tests__/eval-stamp-llm-code.selftest.ts`, and the bounded block in `scripts/eval-stamp.ts`. Pre-existing errors in `scripts/eval-analyse.ts` (subtask 04's responsibility) are out of scope for this subtask and unchanged by this work.

### Judge Verification Note (zoto-spec-judge, 2026-05-04)

The original executor's transcript stopped flushing early; this judge verification establishes the on-disk reality. Independently confirmed:

- All template files exist at the documented paths (`plugins/zoto-eval-system/templates/llm/code-cursor-sdk/{per-primitive-test,sandbox-helpers,setup}.ts.tmpl`, `reporters/zoto-llm-reporter.ts.tmpl`, `graders/{common,contains,regex,tool-called,llm-judge}.ts.tmpl`, `README.md`) with `// _meta.generated: true` as the literal first line of every `.tmpl`.
- `evals/_llm/sdk-bridge.ts` (214 lines) exports `createAgent`, `sendPrompt`, `awaitRun`, `closeAgent`, `resolveTokens`, plus `PINNED_SDK_VERSION = "1.0.12"` and `TOKEN_RESULT_FIELD = "approximate:chars/4"`. Pinned token-field documented and matches live SDK (`@cursor/sdk@1.0.12` confirmed in `node_modules/@cursor/sdk/package.json`).
- `evals/_llm/_user-case-guards.ts` (153 lines) exports `isGeneratedFile(path, { strict? })`, `isGeneratedCase(c)`, `classifyGeneratedFilePath(path)`, `isUserAuthoredCase(c)`. Recognises `// _meta.generated: true` (TS) and `# _meta.generated: True` (Python).
- `scripts/eval-stamp.ts` carries exactly one `// === Subtask 09 START/END ===` fence (lines 1829-2352) exporting `stampLlmCodeStrategy`, `assertNoConflictingLlmStrategy`, `LlmStrategyConflictError`. Mutual-exclusion guard checks for `evals/_llm/cases.json` and the `zoto-declarative-strategy:active` marker in `runner.ts`; bidirectional inverse guard scans `evals/llm/**/*.test.ts` for the strict first-line marker.
- `package.json` has `eval:llm:code` script and `@cursor/sdk@^1.0.12` in `devDependencies`. Top-level `eval:llm` not modified by this subtask (subtask 12 owns the dispatch).
- All three test suites pass on a fresh run:
  - `pnpm exec tsx evals/_llm/_user-case-guards.test.ts` → 32/32
  - `pnpm exec tsx evals/_llm/sdk-bridge.selftest.ts` → 8/8
  - `pnpm exec tsx scripts/__tests__/eval-stamp-llm-code.selftest.ts` → 35/35 (covers stamp idempotence, vitest+jest variants, mutual-exclusion guard throws, bypassGuard escape hatch, stub-SDK `tsc --noEmit` compile probe, synthetic reporter YAML ajv-validation against `result.schema.json`, YAML round-trip)
- `tsc --noEmit` (with `--allowImportingTsExtensions`) clean over every subtask 09 file; only out-of-scope errors remain in `scripts/eval-analyse.ts` (subtask 04).
- `ReadLints` clean across the subtask 09 file set.
- A parallel `_shared/` template tree (`_shared/sdk-bridge.ts.tmpl`, `_shared/reporters/zoto-llm-reporter.{vitest,jest}.ts.tmpl`, `_shared/graders/*.ts.tmpl`, `_shared/case-runner.ts.tmpl`, `_shared/result-yaml-writer.ts.tmpl`, `_shared/setup.ts.tmpl`, `_shared/sandbox-helpers.ts.tmpl`) was authored concurrently by sibling subagents (already noted in Blockers). `stampLlmCodeStrategy` does NOT consume the `_shared/` tree — it reads from the top-level template paths the spec documents — so the parallel files are dormant from subtask 09's perspective and do not affect verification.
- Out-of-scope check: subtask 09 did not touch other backends' templates (pytest/vitest/jest static), the configurer, schemas, baseline-fixtures, the runner.ts/case.ts/writer.ts/update.ts (subtask 10), the top-level `eval` / `eval:full` / `eval:llm` scripts, or other subtask files.

Verdict: **Verified**.

### Blockers Encountered

- **Parallel-subagent file races.** Siblings running subtasks 06/07/08 and an earlier subtask-09 attempt edited `scripts/eval-stamp.ts`, `per-primitive-test.ts.tmpl`, and `evals/_llm/sdk-bridge.selftest.ts` concurrently. I dropped my bounded block at the END of the file and re-asserted ownership of the `// === Subtask 09 START/END ===` fence, but left the parallel `_shared/` template tree and the sibling selftest's replacement in place — both are compatible with my bridge surface and the spec's mutual-exclusion contract. Recommend a rebase / conflict-resolution pass when all Phase-4 subagents are complete.
- **SDK exposes no per-run token count.** `@cursor/sdk@1.0.12`'s `RunResult` type does not include `tokens` / `usage.totalTokens` / `run.tokens`. `resolveTokens(...)` falls back to a char-based heuristic and records the fallback source (`approximate:chars/4`) on every per-case row. When a future SDK release exposes a real count, bump `PINNED_SDK_VERSION`, re-run `tsx evals/_llm/sdk-bridge.selftest.ts --probe-types`, and update `TOKEN_RESULT_FIELD` + `resolveTokens` in a single patch.
- **Duplicate `// === Subtask 09 START ===` fence in `scripts/eval-stamp.ts`.** A prior concurrent attempt at this subtask had left a stale fence near lines 2189-2665 in addition to the canonical fence near lines 1620-1978. I deduplicated by deleting the stale block via a Python slice (matched on the unique stale-block markers), confirmed `pnpm exec node --import tsx -e "import('./scripts/eval-stamp.ts')"` exits 0 with `ok` on stdout, and re-grepped the file to confirm exactly one `=== Subtask 09 START ===` and one `=== Subtask 09 END ===` remain. Subtask 07's vitest fence and subtask 08's jest fence (which share `assertNoConflictingFramework` / `FrameworkConflictError` / `PrimitiveMeta`) were left untouched and still resolve correctly — my fence imports `PrimitiveMeta` and `AnalyserPayload` by name without redeclaring them.
- **`updateCurrentStep` tool stalls.** Two consecutive `updateCurrentStep` invocations hung the tool runtime mid-turn. Subsequent turns dropped progress reporting entirely and went straight to `Read` / `Write` / `Shell` / `Grep` / `StrReplace` / `ReadLints` calls, which is the documented fallback when `updateCurrentStep` is unavailable.

### Files Modified

**New files authored:**
- `evals/_llm/sdk-bridge.ts`
- `evals/_llm/_user-case-guards.test.ts`
- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`
- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/sandbox-helpers.ts.tmpl`
- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/setup.ts.tmpl`
- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/reporters/zoto-llm-reporter.ts.tmpl`
- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/graders/common.ts.tmpl`
- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/graders/contains.ts.tmpl`
- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/graders/regex.ts.tmpl`
- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/graders/tool-called.ts.tmpl`
- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/graders/llm-judge.ts.tmpl`
- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/README.md`
- `scripts/__tests__/eval-stamp-llm-code.selftest.ts`

**Files replaced (subtask 09 owns the final form):**
- `evals/_llm/_user-case-guards.ts` (subtask 03 stub → canonical implementation)

**Files edited (bounded block only):**
- `scripts/eval-stamp.ts` (`// === Subtask 09 START/END ===` fence)

**Files verified unchanged in content but owned by sibling subtask:**
- `package.json` (`eval:llm:code` script already present)
- `evals/_llm/sdk-bridge.selftest.ts` (sibling re-authored to match my bridge surface; passes 8/8)
