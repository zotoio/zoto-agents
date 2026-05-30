# Subtask: Custom Vitest JSON Loader (Vite Plugin)

## Metadata
- **Subtask ID**: 02
- **Feature**: evals-json-first-migration
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01
- **Created**: 20260527

## Objective

Implement a Vite plugin that loads non-skill eval JSON files as in-memory Vitest test modules. No `.tmp.ts` or shim files are written to disk — the plugin synthesises the module text from the JSON contents and returns it from Vite's `load` hook so Vitest discovers and executes the cases natively.

The loader is the foundational piece that lets us drop the per-primitive `.test.ts` stamp template entirely.

## Deliverables Checklist
- [x] Create `evals/llm/_shared/vitest-json-loader.ts` exporting `evalJsonLoader(): Plugin` (Vite plugin). The plugin:
    - Implements `name: "zoto-eval-system:json-loader"`.
    - Hooks `resolveId(source, importer)`: when `source` ends in `.json` and the resolved path matches the non-skill eval glob (`**/evals/**/*.json` AND the file is not a skill `evals.json`), return a virtual ID like `\0zoto-eval-json:<absolutePath>` so Vite knows the plugin will own the load.
    - Hooks `load(id)`: when `id` starts with `\0zoto-eval-json:`, read the underlying JSON, parse it, and return a synthesised ES module source that:
        - Imports `defineLlmEval` from the harness (absolute or aliased path).
        - Imports `describe`, `it`, `afterAll`, `expect` from `vitest`.
        - Embeds the JSON's `target_id`, `cases`, `_meta.model_id` (or default), `_meta.judge_model` (or default), `_meta.case_timeout_ms` (or default) as inline constants.
        - Calls `defineLlmEval({ targetId, cases, modelId, judgeModel, caseTimeoutMs, describe, it, afterAll, expect })`.
- [x] Define and use a single shared helper `isNonSkillEvalJsonPath(absPath: string): boolean` so the loader and the reporter classifiers in subtask 06 agree on the discrimination rule. Skill files match: contains `/skills/<name>/evals/evals.json` (`evals.json` filename + `skills` segment ancestor). Non-skill match: anything under `**/evals/<name>.json` that is NOT a skill file.
- [x] Add defence-in-depth inside the `load` hook: after parsing JSON, check for a `skill_name` field at the top level. If present, return `null` (skip the file) and log a warning. This prevents accidental loading of skill evals if the path-based discrimination has an edge case.
- [x] Generate stable in-memory module text: deterministic JSON serialisation (`JSON.stringify(cases, null, 2)`) so source maps remain useful and reruns produce identical hashes. Include the original JSON file path in a leading `// @sourceFile: <abs path>` comment so debugging is trivial.
- [x] Map Vite/Vitest errors back to JSON line/column where possible (use a heuristic: prepend a `//# sourceURL=<json file>` line; full sourcemap support is a stretch goal — document as a follow-up if not implemented in this subtask).
- [x] Add unit tests under `evals/llm/_shared/vitest-json-loader.test.ts` exercising:
    - `resolveId` recognises a non-skill eval JSON and returns the virtual ID.
    - `resolveId` returns `null` for skill `evals.json`.
    - `load` for a fixture JSON returns a string containing `defineLlmEval` and the expected `targetId`.
    - `load` returns `null` for non-virtual IDs.
    - `load` rejects malformed JSON with a clear error message including the file path.
- [x] Add a fixture JSON (e.g. `evals/llm/_shared/__fixtures__/sample-eval.json`) used only by the loader tests — a tiny `target_id: "command:sample"` file with one declarative case AND one runner case.
- [x] Document the loader at the top of `vitest-json-loader.ts` with a JSDoc block referencing this spec and explaining the virtual-module flow.

## Definition of Done
- [x] `evals/llm/_shared/vitest-json-loader.ts` exists, exports `evalJsonLoader`, and is fully typed.
- [x] Loader unit tests pass via `pnpm --filter @zoto-agents/zoto-eval-system test` or the existing `evals/llm/_shared/vitest.config.ts` invocation.
- [x] Loader correctly handles runner-shaped cases (passes them through to `defineLlmEval`; the harness dispatch in subtask 03 takes over from there).
- [x] No production import path is broken — loader is not yet wired into `evals/vitest.config.ts` (that is subtask 06's job).
- [x] No linter errors in the modified files.

## Implementation Notes

- **Vite plugin API in Vitest 4.x:** Vitest accepts standard Vite plugins via `test.server.deps` and `plugins` entries in `defineConfig`. The plugin runs during Vitest's transformation pipeline. Use `Plugin` from `vite` (Vitest re-exports types) so the function signature matches what Vitest's loader expects.
- **Virtual module convention:** Prefix the resolved id with `\0` so Vite/Rollup treat it as a virtual module and don't try to read it from disk. The original absolute path is encoded after the colon: `\0zoto-eval-json:/abs/path/to/file.json`.
- **Why synthesise text instead of a runtime adapter:** Vitest discovers test files by **transformation output**, so we MUST return real test-file source text. A "smart" runtime adapter that imports JSON via `import * as cases from "./file.json" assert { type: "json" }` would not register tests with Vitest's harness.
- **Reading JSON inside `load`:** Use `fs.promises.readFile`. Decode UTF-8. Parse with `JSON.parse`. Catch and rethrow with the absolute path attached so failures point to the right line.
- **Stable serialisation:** Round-trip the parsed JSON through `JSON.stringify(value, null, 2)` so whitespace in the generated module is deterministic regardless of source formatting.
- **Path normalisation:** Always operate on absolute paths inside the plugin. Use `path.resolve(importer, source)` to compute the absolute import path for the `resolveId` hook.
- **Skill exclusion test:** A pre-existing skill file is `plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json`. Confirm the loader returns `null` for it so the existing skill flow stays untouched.
- **Do not** depend on TypeScript compiler API in this subtask — pure JSON parsing only. The TS compiler is needed for subtask 07's migration script.
- **Future sourcemap work:** Generating a true v3 source map for JSON-to-JS is non-trivial. If time permits, add a basic map that pins every emitted line back to line 1 of the JSON file (a "blanket" map). Otherwise file as a follow-up note in this subtask's Work Log.

## Testing Strategy
**IMPORTANT**: Do NOT trigger the global test suite during parallel execution. Instead:
- Run only the loader-local unit tests:
  - `pnpm exec vitest run --config evals/llm/_shared/vitest.config.ts evals/llm/_shared/vitest-json-loader.test.ts`
- Run `pnpm exec tsc --noEmit -p evals/llm/_shared/tsconfig.json` for TypeScript verification.
- Defer end-to-end Vitest discovery validation to subtask 06.

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
