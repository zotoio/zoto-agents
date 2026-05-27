# Subtask: Vitest Config + Orchestrator + Reporter Wiring

## Metadata
- **Subtask ID**: 06
- **Feature**: evals-json-first-migration
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 02, 03, 04
- **Created**: 20260527

## Objective

Wire the new JSON loader into the unified Vitest config, remove the broken `eval:llm` split, consolidate the orchestrator onto a single Vitest invocation, and update the reporter path classifiers to recognise `.json`-resolved suites. After this subtask, `pnpm eval:static:vitest` discovers and runs JSON eval files alongside scenario `.test.ts` files — but no production JSON files exist yet (subtask 07 migrates them).

## Deliverables Checklist
- [ ] Update `evals/vitest.config.ts`:
    - Import `evalJsonLoader` from `evals/llm/_shared/vitest-json-loader.ts`.
    - Add `plugins: [evalJsonLoader()]` (Vitest passes Vite plugins through).
    - Extend `include` to include `**/evals/*.json` AND `evals/scenarios/*.test.ts`.
    - Adjust `exclude` comprehensively so the following are NOT picked up by Vitest:
        - `**/skills/*/evals/evals.json` (skill files — defence in depth)
        - `**/fixtures/**`
        - `**/_runs/**`
        - `**/.zoto/**`
        - `**/cache/**`
        - `evals/llm/_shared/**` (harness unit tests, not eval suites)
        - `evals/scenarios/_*` (underscore-prefixed example files excluded by default)
    - Remove the reference comment about the missing `evals/llm/vitest.config.ts`.
- [ ] Update `package.json`:
    - **Remove** `"eval:llm": "vitest run --config evals/llm/vitest.config.ts"` (the config target does not exist; the unified config replaces it).
    - Rename `eval:static:vitest` to `eval:vitest` (or keep it as-is and add `eval:vitest` as an alias) — pick the cleanest naming. Either way, document the choice in CHANGELOG (subtask 09).
    - Confirm `eval:static:pytest` and `eval:static:jest` remain untouched.
- [ ] Update `scripts/eval-orchestrate.ts`:
    - Remove the LLM-vs-static script split. The orchestrator now invokes the unified Vitest config exactly once (`vitest run --config evals/vitest.config.ts`) plus, optionally, the pytest static path if a host repo opts in.
    - **Replace `const LLM_SCRIPT = "eval:llm"` (line ~519) with the unified vitest invocation.** The orchestrator no longer invokes a separate LLM script; it calls `eval:vitest` (or `eval:static:vitest`) directly.
    - The `--full` flag now means "set `CURSOR_API_KEY=...` is required and call the engine `runner.ts --judge-only` after the Vitest pass for soft-metric aggregation" — confirm exact current behaviour first; the rewrite should preserve any post-run summary aggregation step.
    - Drop any code that probes for `evals/llm/vitest.config.ts`.
- [ ] Update `evals/llm/_shared/zoto-llm-reporter.ts`:
    - Extend `isLlmCoLocatedPath` (or add a sibling `isLlmJsonSourcePath`) to recognise virtual modules whose `\0zoto-eval-json:` prefix encodes a non-skill JSON path. The reporter must classify cases emitted from those virtual modules as LLM cases so they end up in `llm.yml`, not `static.yml`.
    - Confirm the reporter still partitions by path for any legacy `<kind>/evals/<name>.test.ts` until subtask 07 deletes them.
- [ ] Update `evals/reporters/zoto-eval-reporter.ts`:
    - Confirm `isStaticEvalPath` still matches `evals/*.test.ts` at repo root (the smoke + any scenario file at top level).
    - Explicitly EXCLUDE `\0zoto-eval-json:*` IDs and `evals/scenarios/*.test.ts` from the static reporter — scenarios are LLM evals, not static.
- [ ] Smoke-test the wiring locally (without API key):
    - Create a temporary `tmp/sample-eval.json` (gitignored) with `target_id: "command:sample"` and one declarative case + one runner case.
    - Run `pnpm exec vitest run --config evals/vitest.config.ts <path>` and confirm Vitest discovers both cases as test entries (the declarative one skips when `CURSOR_API_KEY` is missing; the runner one calls the fixture runner).
    - Delete the temp file after verification.
- [ ] Document the new flow with a short paragraph at the top of `evals/vitest.config.ts` (replace the stale "subtask 08 will relocate" comment block).

## Definition of Done
- [ ] `evals/vitest.config.ts` loads `evalJsonLoader` and includes both `**/evals/*.json` and `evals/scenarios/*.test.ts`.
- [ ] `package.json` no longer has an `eval:llm` script that points to a missing config.
- [ ] `scripts/eval-orchestrate.ts` invokes a single Vitest run.
- [ ] Reporter path classifiers correctly partition JSON-derived cases into the LLM reporter and scenario files into the LLM reporter.
- [ ] Local smoke test shows Vitest discovering a fixture JSON eval (test plan visible in `--reporter=verbose` output).
- [ ] No linter errors in modified files.
- [ ] Migration of the 38 `.test.ts` files is NOT yet performed — that is subtask 07.

## Implementation Notes

- **Existing `.test.ts` LLM evals will still run** at the end of this subtask because subtask 07 has not migrated them yet. Both code paths can coexist during this brief window: the loader picks up `.json` files (none yet in the LLM eval layout) and Vitest's normal discovery still picks up the 38 `.test.ts` files. This is intentional — it lets us validate the new wiring in isolation.
- **Vite plugin in Vitest 4.x:** Pass plugins through `defineConfig({ plugins: [...] })`. Vitest forwards them to Vite's transform pipeline. Confirm by reading any existing Vite plugin usage in the repo (likely none today — this is the first one).
- **Reporter classifier for virtual modules:** When Vitest reports a test from a virtual module, the file path in the event payload is the virtual id (`\0zoto-eval-json:/abs/path.json`). The classifier needs to handle this prefix. Add a helper `decodeVirtualEvalJsonId(id: string): string | null` shared by both classifiers.
- **`eval:vitest` vs `eval:static:vitest` naming:** The static naming is misleading now that the same script runs LLM evals too. Recommended: alias `eval:vitest` → existing command, keep `eval:static:vitest` for backwards compat for one release, then drop in a future cleanup. Subtask 09 (CHANGELOG) records the deprecation.
- **Orchestrator behaviour preservation:** Before rewriting `eval-orchestrate.ts`, **read it end-to-end** and capture: env var handling, run-id generation, exit-code semantics, post-run aggregation. The rewrite must preserve every observable behaviour except the LLM/static split.
- **No CI changes here:** CI workflow updates land in subtask 10.

## Testing Strategy
**IMPORTANT**: Do NOT trigger the global test suite during parallel execution. Instead:
- Run only the changed file's targeted tests:
  - Reporter unit tests if any exist (`pnpm exec vitest run --config evals/vitest.config.ts evals/reporters/zoto-eval-reporter.test.ts` — only if such file exists; otherwise add a small one).
  - The smoke test from the deliverables checklist (one temp JSON file).
- Run `pnpm exec tsc --noEmit` against the touched configs.
- Defer the full eval suite to subtask 10.

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
