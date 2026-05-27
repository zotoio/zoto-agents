# Subtask: Final Validation + CI Updates

## Metadata
- **Subtask ID**: 10
- **Feature**: evals-json-first-migration
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 08, 09
- **Created**: 20260527

## Objective

Run the full validation suite, lock in the new invariants in CI, and tidy up. After this subtask, the spec is complete and the migration is final: no co-located `.test.ts` LLM evals can be reintroduced without CI catching them.

## Deliverables Checklist
- [ ] Run every relevant validator locally and capture results in the Work Log:
    - `pnpm validate-template` — passes (subtask 05 added a transitional warning; tighten to error here).
    - `pnpm validate-skills` — passes.
    - `pnpm test` (unit tests across the monorepo) — passes.
    - `pnpm exec tsc --noEmit` for each touched TypeScript root.
    - `pnpm eval:update:check` — exits 0 (no drift, no residual `.test.ts` LLM evals).
    - `pnpm eval:list` — enumerates every migrated target.
    - `pnpm exec vitest run --config evals/vitest.config.ts --reporter=verbose` — Vitest discovers and lists every JSON eval + the scenario directory (which is empty in THIS repo; only the template ships).
- [ ] Tighten `scripts/validate-template.mjs`:
    - Promote the transitional warning from subtask 05 to a hard error: if any `plugins/*/{commands,agents,hooks}/evals/*.test.ts` OR `.cursor/{commands,agents,hooks}/evals/*.test.ts` file exists, exit non-zero with a clear message.
    - Exception: scenario files under `evals/scenarios/*.test.ts` are explicitly allowed.
- [ ] Add a new CI workflow under `.github/workflows/`:
    - File: `.github/workflows/eval-format-check.yml`.
    - Steps:
        1. Checkout + setup Node + setup pnpm.
        2. `pnpm install`.
        3. `pnpm validate-template`.
        4. `pnpm eval:update:check`.
        5. `pnpm exec vitest run --config evals/vitest.config.ts --run --reporter=default` (without `CURSOR_API_KEY`; cases skip but discovery must succeed).
        6. Fail if any of the above exit non-zero.
    - Trigger: on push to main + pull_request.
- [ ] Update `.github/workflows/eval-update-check.yml` (if it exists) to additionally assert:
    - `git diff --name-only` shows no `.test.ts` file under `<kind>/evals/` paths after the migration commit lands.
    - The existing `eval:update:check` invocation now uses the strict `--check` semantics (exit 2 on residual TS).
    - NOTE: If eval-update-check.yml largely overlaps with the new eval-format-check.yml, consolidate them into a single workflow to reduce maintenance burden.
- [ ] Update `plugins/zoto-eval-system/tests/plugin.test.ts` (or add a new test file) with assertions that run as part of `pnpm test`:
    - Every `eval_files` entry in `.zoto/eval-system/manifest.yml` for non-skill kinds ends in `.json`.
    - No file matches `plugins/*/{commands,agents,hooks}/evals/*.test.ts` or `.cursor/{commands,agents,hooks}/evals/*.test.ts`.
    - The Vitest config loads cleanly and registers the `zoto-eval-system:json-loader` plugin.
    - `templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` does NOT exist.
- [ ] Clean up dead code referenced by earlier subtasks:
    - Delete `evals/llm/vitest.config.ts` if it ever existed (subtask 06 already accounts for this — confirm).
    - Remove any unused `bootstrap-llm-code-from-cache` or similar scripts that only existed to support the TS template, if confirmed obsolete.
    - Grep for `code-cursor-sdk` references across the repo; remove dead imports or comments.
- [ ] Update the spec status file:
    - Edit `specs/20260527-evals-json-first-migration/spec-evals-json-first-migration-20260527.md` status from `Draft` → `In Progress` at execution start (handled by the executor) and finally to `Completed` once this subtask passes.
- [ ] Final smoke test of `/z-eval-create` end-to-end:
    - In a scratch directory, run the create flow (or simulate it programmatically) and verify the host repo gets:
        - `evals/vitest.config.ts` (or equivalent) wired with the JSON loader plugin.
        - `evals/scenarios/_example-multi-primitive.test.ts` present and skipped.
        - `.zoto/eval-system/manifest.yml` with `.json` entries.

## Definition of Done
- [ ] All local validators and tests pass.
- [ ] CI workflow enforces the new constraints (added or updated workflow file present).
- [ ] No `.test.ts` LLM eval file exists anywhere except `evals/scenarios/`.
- [ ] `validate-template` exits non-zero if a TS LLM eval is introduced anywhere co-located.
- [ ] Plugin tests assert manifest and template invariants.
- [ ] `/z-eval-create` smoke test produces the expected host-repo state.
- [ ] Spec status moves to `Completed`.
- [ ] No linter errors.

## Implementation Notes

- **CI runner availability:** This subtask only edits workflow YAML; it does not require running CI to verify. Confirm by inspecting the YAML with the `gh workflow` CLI or simply reading the file. The executor can opt to push to a feature branch and watch CI separately if desired.
- **Vitest dry-run discovery:** Use `vitest list` (Vitest 4 supports `list` mode) to enumerate test files without executing — useful for the CI step that runs without `CURSOR_API_KEY`.
- **Strict mode exit codes:** `eval:update:check` should exit:
    - `0` on no drift,
    - `1` on non-critical drift,
    - `2` on critical drift (residual TS LLM evals, or schema-invalid manifest entry).
- **Plugin tests:** Use `glob` from `tinyglobby` or `node:fs/promises` directly to enumerate disallowed paths. Keep the test fast (no I/O over the full monorepo if avoidable; scope to known plugin roots from the manifest snapshot).
- **`/z-eval-create` smoke:** Spawn a child process in a tempdir, run the create flow, assert file system state, then delete the tempdir. Use Node's `os.tmpdir()` and `fs.rmSync(... recursive: true)` for cleanup. Skip if the create flow needs interactive prompts that cannot be scripted in this test — instead, exercise the underlying skill / script directly.
- **Documentation cross-checks:** Run `rg -n "\\.test\\.ts" plugins/zoto-eval-system plugins/zoto-spec-system plugins/zoto-cursor-top .cursor` and confirm every remaining hit is either inside `evals/scenarios/` examples, this spec's subtask files, or test fixtures. All three plugin roots PLUS `.cursor/` must be clean.
- **CHANGELOG date sanity:** Ensure the date in CHANGELOG matches the spec date (`2026-05-27`).

## Testing Strategy
**IMPORTANT**: This subtask IS the final-verification phase, so it explicitly DOES run the full test suite:
- `pnpm test`
- `pnpm validate-template`
- `pnpm validate-skills`
- `pnpm eval:list`
- `pnpm eval:update:check`
- `pnpm exec vitest run --config evals/vitest.config.ts --reporter=default` (LLM cases skip without `CURSOR_API_KEY` — that is expected)
- Optionally with `CURSOR_API_KEY` set: `pnpm eval:full` to verify a real end-to-end run of one migrated target.

If any of these fail, root-cause and fix within this subtask. Do not declare done until every check is green.

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
