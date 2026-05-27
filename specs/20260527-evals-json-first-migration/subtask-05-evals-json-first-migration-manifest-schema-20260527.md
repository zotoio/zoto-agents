# Subtask: Manifest Schema + Validator Updates

## Metadata
- **Subtask ID**: 05
- **Feature**: evals-json-first-migration
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01
- **Created**: 20260527

## Objective

Tighten the eval-system manifest schema and surrounding validators so non-skill `eval_files` entries MUST end in `.json` after migration. This subtask only updates the schema and validators — the manifest YAML itself is rewritten by the migration script in subtask 07.

## Deliverables Checklist
- [ ] Update `plugins/zoto-eval-system/templates/schema/manifest.schema.json`:
    - Locate the `eval_files` property under each target kind (`commands`, `agents`, `hooks`, `skills`).
    - For `commands`, `agents`, `hooks`: change item schema from a plain `{"type":"string"}` to a string with `pattern: "\\.json$"` and a descriptive `description`.
    - For `skills`: also `pattern: "evals\\.json$"` (skill files are always named `evals.json` per Cursor spec).
    - Add the `eval-file.schema.json` reference produced by subtask 01 to the schema directory listing, but do NOT yet require Ajv-validation of every eval file from the manifest — that gating lives in `engine/runner.ts` / `update.ts`.
- [ ] Update `plugins/zoto-eval-system/tests/plugin.test.ts` (or the schema compile test): add an Ajv compile test that:
    - A valid manifest with `.json` eval files passes validation.
    - A manifest with a `.test.ts` non-skill `eval_files` entry FAILS validation.
    - A manifest with a non-`evals.json` skill entry FAILS validation.
- [ ] Update any TypeScript types for the manifest snapshot (`engine/manifest-snapshot.ts`) so the documented contract matches the new constraint. If the type currently allows any string, narrow the JSDoc to reference the schema and note `.json` requirement. No runtime change beyond the JSDoc.
- [ ] Update `templates/manifest.yml.tmpl` (if it exists; check `plugins/zoto-eval-system/templates/` and `baseline-fixtures/`) so the bootstrap manifest emits `.json` eval files for examples.
- [ ] Update `scripts/validate-template.mjs` or add a new lightweight validator step that warns when a co-located `<kind>/evals/<name>.test.ts` LLM eval file exists alongside a manifest entry pointing to `.json` — this is a transitional check to surface drift during the migration window (subtask 10 will tighten it to an error).
- [ ] Update `evals/fixtures/baseline/.zoto/eval-system/config.yml` and any other baseline fixtures only if they currently contain references to `.test.ts` LLM eval files; otherwise leave them alone.
- [ ] Add a JSDoc / Markdown note (top of schema file or `plugins/zoto-eval-system/docs/manifest.md` if present) explaining: scenarios under `evals/scenarios/<name>.test.ts` are **intentionally not tracked in the manifest** and the schema does not need to allow them.

## Definition of Done
- [ ] `manifest.schema.json` rejects `.test.ts` entries for non-skill targets (verified by a failing Ajv test fixture).
- [ ] Schema compile test passes.
- [ ] Baseline templates and fixtures consistent with new constraint.
- [ ] No linter errors in modified files.
- [ ] No production manifest is yet rewritten (subtask 07 does that).

## Implementation Notes

- **Pattern syntax:** JSON Schema uses ECMAScript-flavoured regex without anchors in `pattern` semantics (Ajv matches anywhere). To force the suffix, prefer `pattern: "\\.json$"`. For skills, `pattern: "/evals/evals\\.json$"` matches the canonical filename.
- **No breaking effect on existing tests in this subtask:** The schema is updated, but the actual `.zoto/eval-system/manifest.yml` in the repo will still contain `.test.ts` entries until subtask 07. To avoid breaking the test suite during the interim window, the schema compile test should use **fixture manifests**, not the real one — i.e. inline YAML strings in the test file.
- **Transitional validator:** `scripts/validate-template.mjs` reads the marketplace + plugin structure. A new helper there can iterate plugin roots, find every `<kind>/evals/*.test.ts`, and log a deprecation warning. Do not exit non-zero — subtask 10 makes it strict.
- **`baseline-fixtures` audit:** Run `rg "\.test\.ts" plugins/zoto-eval-system/templates/baseline-fixtures plugins/zoto-eval-system/templates/runner` (via Grep tool) to confirm no template emits TS LLM eval references. If any do, fix them in this subtask.
- **Scenarios are deliberately untracked:** The manifest exists to make stamper + analyser output deterministic; scenarios are hand-authored and don't need a generated trail. Document this in the schema description.
- **No engine runtime changes here:** The runtime consumers of the manifest snapshot already work with whatever paths the YAML contains. The schema is the gatekeeper for future writes.

## Testing Strategy
**IMPORTANT**: Do NOT trigger the global test suite during parallel execution. Instead:
- Run only the plugin's schema tests:
  - `pnpm --filter @zoto-agents/zoto-eval-system test plugin.test`
- Run `pnpm exec tsc --noEmit -p plugins/zoto-eval-system/tsconfig.json`.
- Defer end-to-end manifest validation to subtask 07 (which writes the new YAML) and subtask 10 (which enforces the strict check in CI).

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
