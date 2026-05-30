# Subtask 02 — evals-json-first-migration — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 02 |
| feature | evals-json-first-migration |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-29T19:08:00.000Z |
| last_heartbeat | 2026-05-29T19:10:00.000Z |
| completed_at | 2026-05-29T19:10:00.000Z |
| git_sha | 1fa87d469166c5a78ba836ca4bebb8667fcdc6fb |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Create `evals/llm/_shared/vitest-json-loader.ts` exporting `evalJsonLoader(): Plugin` (Vite plugin). The plugin: (`evals/llm/_shared/vitest-json-loader.ts`)
- [x] **D02** — Define and use a single shared helper `isNonSkillEvalJsonPath(absPath: string): boolean` so the loader and the reporter classifiers in subtask 06 agree on the discrimination rule. Skill files match: contains `/skills/<name>/evals/evals.json` (`evals.json` filename + `skills` segment ancestor). Non-skill match: anything under `**/evals/<name>.json` that is NOT a skill file. (`evals/llm/_shared/vitest-json-loader.ts`)
- [x] **D03** — Generate stable in-memory module text: deterministic JSON serialisation (`JSON.stringify(cases, null, 2)`) so source maps remain useful and reruns produce identical hashes. Include the original JSON file path in a leading `// @sourceFile: <abs path>` comment so debugging is trivial. (`evals/llm/_shared/vitest-json-loader.ts`)
- [x] **D04** — Map Vite/Vitest errors back to JSON line/column where possible (use a heuristic: prepend a `//# sourceURL=<json file>` line; full sourcemap support is a stretch goal — document as a follow-up if not implemented in this subtask). (`evals/llm/_shared/vitest-json-loader.ts`)
- [x] **D05** — Add unit tests under `evals/llm/_shared/vitest-json-loader.test.ts` exercising: (`evals/llm/_shared/vitest-json-loader.test.ts`)
- [x] **D06** — Add a fixture JSON (e.g. `evals/llm/_shared/__fixtures__/sample-eval.json`) used only by the loader tests — a tiny `target_id: "command:sample"` file with one declarative case AND one runner case. (`evals/llm/_shared/__fixtures__/sample-eval.json`)
- [x] **D07** — Document the loader at the top of `vitest-json-loader.ts` with a JSDoc block referencing this spec and explaining the virtual-module flow. (`evals/llm/_shared/vitest-json-loader.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `evals/llm/_shared/vitest-json-loader.ts` — evalJsonLoader Vite plugin, virtual module synthesis, isNonSkillEvalJsonPath
- **created** `evals/llm/_shared/vitest-json-loader.test.ts` — 32 unit tests for resolveId, load, renderEvalModule, path helper
- **created** `evals/llm/_shared/__fixtures__/sample-eval.json` — declarative + runner cases for loader tests
- **created** `evals/llm/_shared/__fixtures__/sample-runner.test.ts` — runner fixture referenced by sample-eval.json
- **modified** `evals/llm/_shared/path-classifiers.ts` — re-exports isNonSkillEvalJsonPath from loader for subtask 06 reporters
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
RESUME verification: deliverables already on disk from prior work; no code gaps found. Loader exports evalJsonLoader with resolveId/load hooks, VIRTUAL_SUFFIX (.js) to bypass vite:json, defence-in-depth skill_name guard, and //# sourceURL=file:// debugging heuristic (full v3 source maps deferred). path-classifiers.ts re-exports isNonSkillEvalJsonPath for reporter parity. Tests: pnpm exec vitest run evals/llm/_shared/vitest-json-loader.test.ts --run → 1 file, 32 passed, 411ms. Loader files have no linter errors. Full evals/llm/_shared/tsconfig tsc --noEmit reports pre-existing errors in other harness files (run-llm-suite.ts, askquestion-bridge.test.ts, etc.) — outside subtask 02 scope. Plugin not wired into evals/vitest.config.ts (subtask 06).
<!-- status:notes:end -->
