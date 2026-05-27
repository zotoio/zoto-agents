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
| state | pending |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [ ] **D01** — Create `evals/llm/_shared/vitest-json-loader.ts` exporting `evalJsonLoader(): Plugin` (Vite plugin). The plugin:
- [ ] **D02** — Define and use a single shared helper `isNonSkillEvalJsonPath(absPath: string): boolean` so the loader and the reporter classifiers in subtask 06 agree on the discrimination rule. Skill files match: contains `/skills/<name>/evals/evals.json` (`evals.json` filename + `skills` segment ancestor). Non-skill match: anything under `**/evals/<name>.json` that is NOT a skill file.
- [ ] **D03** — Generate stable in-memory module text: deterministic JSON serialisation (`JSON.stringify(cases, null, 2)`) so source maps remain useful and reruns produce identical hashes. Include the original JSON file path in a leading `// @sourceFile: <abs path>` comment so debugging is trivial.
- [ ] **D04** — Map Vite/Vitest errors back to JSON line/column where possible (use a heuristic: prepend a `//# sourceURL=<json file>` line; full sourcemap support is a stretch goal — document as a follow-up if not implemented in this subtask).
- [ ] **D05** — Add unit tests under `evals/llm/_shared/vitest-json-loader.test.ts` exercising:
- [ ] **D06** — Add a fixture JSON (e.g. `evals/llm/_shared/__fixtures__/sample-eval.json`) used only by the loader tests — a tiny `target_id: "command:sample"` file with one declarative case AND one runner case.
- [ ] **D07** — Document the loader at the top of `vitest-json-loader.ts` with a JSDoc block referencing this spec and explaining the virtual-module flow.
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
