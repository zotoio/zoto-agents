# Subtask: Stamper + Template Cleanup (`eval-stamp.ts`, `update.ts`)

## Metadata
- **Subtask ID**: 08
- **Feature**: evals-json-first-migration
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 07 (explicit), 04 (implicit — consumes `engine/update.ts` additions from subtask 04 including `findCoLocatedTsEvals()`)
- **Created**: 20260527

## Objective

Now that all existing co-located LLM evals are JSON, delete the obsolete TS per-primitive template and update both the stamper (`scripts/eval-stamp.ts`) and the engine updater (`engine/update.ts`) so future regeneration writes JSON. The JSON templates become the canonical and only LLM stamp source.

## Deliverables Checklist
- [x] Delete `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`.
- [x] Delete any sibling files under `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/` that only existed to support the TS template (e.g. a per-target setup file if present). Audit the directory and confirm — do not delete shared assets (vitest.config.tmpl, setup.tmpl, etc.) without verifying nothing else consumes them.
- [x] Update `scripts/eval-stamp.ts`:
    - `resolveLlmTargetPath(kind, name)` now returns `.json` paths: `commands/evals/<name>.json`, `agents/evals/<name>.json`, `<hooks-dir>/evals/hooks.json`. Skills remain `<skill-dir>/evals/evals.json` (unchanged).
    - `stampLlmTarget(...)` reads the matching JSON template (`templates/{command,agent,hook}-evals/evals.json.tmpl`) instead of the TS template, fills in placeholders, and writes a `.json` file.
    - Update placeholder substitution to support the JSON envelope: `{{TARGET_ID}}`, `{{MODEL_ID}}`, `{{JUDGE_MODEL}}`, `{{CASE_TIMEOUT_MS}}`, `{{CASES_JSON}}` (now serialised as JSON, not as a TS array).
    - `stampVitestPerPrimitive` — investigate whether this function is still needed. If it only existed to stamp the TS file, remove it. If it has other consumers, keep but no-op the TS branch.
    - Ensure `_meta.generated: true` appears at BOTH the top-level eval-file `_meta` and on every generated case (consistent with the current TS marker behaviour).
- [x] Update `plugins/zoto-eval-system/engine/update.ts`:
    - `regenerateLlm(...)` now writes JSON via the updated stamper.
    - Surgical-merge logic (currently used for skill `evals.json`) is extended to non-skill JSON files: walk existing cases, preserve any with `_meta.generated !== true` (user-authored, including runner cases), update generated ones. Use `json-source-map` (already a dependency) for diff-friendly line-aware writes.
    - Drift detection compares case checksums on the new JSON shape.
    - `--check` mode now exits 2 (critical drift) if it finds any co-located `.test.ts` LLM eval anywhere — completing the strict enforcement deferred from subtask 04.
- [x] Update the JSON templates (`templates/{command,agent,hook}-evals/evals.json.tmpl`) so each one:
    - Carries a top-level `_meta` envelope with `generated: true`, `model_id`, `judge_model`, `case_timeout_ms` placeholders.
    - Includes a COMMENTED inline example of a `runner` case (JSON5-style comment is non-standard — instead, embed it in the existing `_template_doc` array so the file remains valid JSON). Example block:
        ```
        "_template_doc": [
          "...",
          "Runner case example (advanced TS escape hatch):",
          "{ \"id\": \"adv-1\", \"runner\": \"./adv.test.ts\", \"parameters\": {} }"
        ]
        ```
    - The `_template_doc` field is stripped by the stamper before writing the real output (confirm or implement).
- [x] Update `scripts/eval-stamp.ts` baseline-only mode (`--baseline-only`) to write the new JSON baseline fixtures into `plugins/zoto-eval-system/templates/baseline-fixtures/` if the current fixtures still reference TS.
- [x] Add focused tests:
    - `scripts/eval-stamp.test.ts` (or extend the existing test file): stamping a command target produces `<name>.json` with the expected envelope, model id, and cases.
    - `engine/update.ts` surgical merge: an existing JSON with one user-authored case + one stale generated case is rewritten so the user case is verbatim and the generated case is updated.
    - `update.ts --check` exits 2 when a `.test.ts` LLM eval is present anywhere under co-located paths.

## Definition of Done
- [x] TS per-primitive template is deleted.
- [x] `scripts/eval-stamp.ts` writes JSON for commands, agents, hooks.
- [x] `engine/update.ts` regenerates JSON, preserves user-authored cases (including runner cases), and `--check` exits 2 on residual `.test.ts` LLM evals.
- [x] JSON templates carry the runner-case inline example via `_template_doc`.
- [x] All stamper / updater unit tests pass.
- [x] Stamping a fresh fixture target end-to-end produces a valid JSON file that the loader can consume.
- [x] No linter errors in modified files.

## Implementation Notes

- **Run order:** This subtask runs AFTER subtask 07, which already converted the files. The stamper/updater changes are now safe because no live `.test.ts` LLM evals remain — only the obsolete template file and its writer code.
- **Dependency on subtask 04:** This subtask consumes `engine/update.ts` additions made in subtask 04 (specifically `findCoLocatedTsEvals()` and the deprecation-warning infrastructure). Do NOT duplicate or conflict with those additions — build on them.
- **`stampVitestPerPrimitive` audit:** Use Grep for callers (`rg "stampVitestPerPrimitive"`). If used only by the LLM stamp path, delete. If used by static stamping or other flows, leave the static branch alone.
- **`_template_doc` stripping:** Confirm by reading the current `command-evals/evals.json.tmpl` and `eval-stamp.ts` how comments are stripped. The convention exists — preserve it.
- **`json-source-map` for surgical merge:** The skill updater already uses this to produce line-stable diffs. Reuse the same module structure (likely there is a helper). Do not introduce a new YAML/JSON merger.
- **Hooks-special-case:** A single `hooks.json` contains cases for multiple hook primitives. Surgical merge must operate per-case (case ids are unique per file) regardless of which hook the case belongs to.
- **CI behaviour change:** `eval:update:check` becoming exit 2 on residual `.test.ts` is a breaking change. CI workflows (subtask 10) handle the consequences.
- **`baseline-fixtures` consistency:** If any baseline fixture under `templates/baseline-fixtures/` stamps a TS file, it must be updated to stamp JSON. Otherwise the bootstrap-from-cache path produces stale assets.

## Testing Strategy
**IMPORTANT**: Do NOT trigger the global test suite during parallel execution. Instead:
- Run only the affected unit tests:
  - `pnpm --filter @zoto-agents/zoto-eval-system test` (covers `engine/update.ts`, `engine/case.ts`)
  - `pnpm exec vitest run --config evals/llm/_shared/vitest.config.ts scripts/eval-stamp.test.ts` (or wherever the stamper tests live)
- Run `pnpm eval:update:check` once with the migrated state and confirm exit 0.
- Run a synthetic stamp into a temp directory and confirm the output validates against `eval-file.schema.json`.
- Defer full eval suite execution to subtask 10.

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
