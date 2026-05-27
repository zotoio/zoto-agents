# Subtask: Migration Script + Execute Bulk Migration

## Metadata
- **Subtask ID**: 07
- **Feature**: evals-json-first-migration
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 05, 06
- **Created**: 20260527

## Objective

Build a one-shot migration script (`scripts/eval-migrate-ts-to-json.ts`) that converts every existing co-located `.test.ts` LLM eval into a co-located `.json` file, deletes the original TS files, and rewrites the manifest `eval_files` entries. Run the script and commit the migrated artefacts.

After this subtask the repo contains zero co-located `.test.ts` LLM eval files; only scenario files under `evals/scenarios/` (none authored yet) and stamped JSON files remain.

## Deliverables Checklist
- [ ] Create `scripts/eval-migrate-ts-to-json.ts`:
    - Discover all co-located LLM eval `.test.ts` files via glob (same patterns as `engine/update.ts#findCoLocatedTsEvals`): `plugins/*/{commands,agents,hooks}/evals/*.test.ts`, `.cursor/{commands,agents,hooks}/evals/*.test.ts`. This includes ALL plugin roots: `plugins/zoto-eval-system/`, `plugins/zoto-spec-system/`, `plugins/zoto-cursor-top/`, and `.cursor/`. Use dynamic discovery (do NOT hardcode a file count).
    - Exclude `evals/scenarios/**` and `evals/llm/_shared/**`.
    - For each file:
        1. Parse via TypeScript compiler API (`ts.createSourceFile`) — already a devDependency (`typescript ^5.9.3`).
        2. Walk the AST to find:
            - `const CASES: LlmCaseDefinition[] = [...]` (or any equivalent `CASES` variable) — extract the array literal verbatim.
            - The `defineLlmEval({ ... })` call — extract `targetId`, `modelId`, `judgeModel`, `caseTimeoutMs` from the arguments. The TS file uses `process.env.ZOTO_EVAL_MODEL ?? "<default>"`; the migration extracts the literal default and stores it as `_meta.model_id` in the JSON.
        3. Build the output JSON object: `{ target_id, _meta: { generated: true, model_id, judge_model, case_timeout_ms, migrated_from: "<relative TS path>", migrated_at: "<ISO timestamp>" }, cases: [...] }`. Each case retains its `_meta.generated: true` marker if present.
        4. Validate the output against `eval-file.schema.json` via Ajv before writing.
        5. Compute the destination path: same directory, `<base>.json` (commands/agents). For hooks, source is always `hooks.test.ts` → destination `hooks.json`.
        6. Write the JSON file with 2-space indentation and a trailing newline.
        7. Delete the original `.test.ts` file.
        **Failure handling:** If AST extraction fails for any file (malformed CASES, template literals that cannot be statically evaluated, unsupported patterns), log the failure to the migration audit with the file path and parse error, leave the `.test.ts` un-migrated, and continue processing remaining files. The migration audit report MUST list all failures with actionable messages.
    - After all files are migrated:
        - Read `.zoto/eval-system/manifest.yml`.
        - For every `eval_files` entry ending in `.test.ts` whose path corresponds to a migrated file, rewrite to `.json`.
        - Append an entry to `.zoto/eval-system/manifest.history.yml` recording the bulk migration (date, file count, spec id).
- [ ] Add CLI flags to the script:
    - `--dry-run` — print the migration plan (per-file source → destination, case count, target id) without writing anything.
    - `--apply` — actually write files and delete TS originals. Files that fail extraction are left in place with audit entries.
    - `--keep-ts` — for pre-migration safety: write the JSON but leave the TS file in place (recommended before `--apply`).
    - `--single <path>` — migrate a single file (used for spot-checks).
- [ ] Add unit tests at `scripts/eval-migrate-ts-to-json.test.ts`:
    - Given a fixture `.test.ts` with a known `CASES` literal, the AST extraction produces the expected JSON.
    - `defineLlmEval` arg extraction handles `modelId` and `judgeModel` defaults correctly.
    - Hybrid / malformed input raises a clear error naming the source file.
    - Idempotency: re-running on an already-migrated directory is a no-op.
    - Extraction failure (template literal, process.env in CASES, spread operator) produces an audit entry and does NOT write corrupt JSON.
    - Variable name detection handles `CASES`, `SUITE_CASES`, or any `VariableStatement` whose initialiser is a typed `LlmCaseDefinition[]` array.
- [ ] Execute the migration:
    1. Run `pnpm exec tsx scripts/eval-migrate-ts-to-json.ts --dry-run` and inspect the plan (dynamically discovered source files; one destination JSON each, plus the manifest rewrite).
    2. Run `pnpm exec tsx scripts/eval-migrate-ts-to-json.ts --keep-ts` first to validate output without deleting originals.
    3. Run `pnpm exec tsx scripts/eval-migrate-ts-to-json.ts --apply`.
    4. Verify the resulting directory layout: no `*.test.ts` files left under `<kind>/evals/`.
    5. Run `pnpm eval:list` and confirm every previously-listed `targetId` still appears.
    6. Run `pnpm exec vitest run --config evals/vitest.config.ts <one migrated file>` and confirm Vitest discovers the cases.
    7. Verify migration audit shows 0 failures. If any failures exist, investigate and fix before proceeding.
- [ ] If any of the discovered files contain `interactions` blocks with `answers[]`, ensure the migration preserves them verbatim — the JSON loader and harness already handle that field.
- [ ] Cross-reference the migration result against the audit produced inline (the dry-run report serves as the audit). Save the dry-run report at `specs/20260527-evals-json-first-migration/migration-audit-20260527.md` for traceability.
- [ ] Commit the migrated JSON files, deleted TS files, manifest update, and the migration script in **one** commit so the diff is reviewable. (The actual commit is performed by the executor; this subtask just lands the changes in the working tree.)

## Definition of Done
- [ ] `scripts/eval-migrate-ts-to-json.ts` exists with `--dry-run` / `--apply` / `--keep-ts` / `--single` flags.
- [ ] Script unit tests pass.
- [ ] All discovered co-located `.test.ts` LLM evals are converted to `.json` and the TS originals are removed.
- [ ] Migration audit shows 0 skipped/failed files. If any file cannot be parsed, it is logged with an actionable error and left in place (acceptance criterion: 0 failures in this repo).
- [ ] `.zoto/eval-system/manifest.yml` has `.json` entries for every migrated target.
- [ ] `.zoto/eval-system/manifest.history.yml` has a new entry recording the migration.
- [ ] `pnpm eval:list` enumerates every migrated target.
- [ ] `migration-audit-20260527.md` exists in the spec directory.
- [ ] No linter errors in the new script or modified manifest files.

## Implementation Notes

- **AST walk strategy:** Use `ts.forEachChild` recursively. Find the first `VariableStatement` whose declarations include an identifier named `CASES` (or matching type annotation `LlmCaseDefinition[]`). Also handle variant names like `SUITE_CASES` by looking for any variable typed as `LlmCaseDefinition[]`. Capture the initialiser (an `ArrayLiteralExpression`). Use `ts.transform` + `ts.createPrinter` to re-serialise the literal as JSON — or simpler: re-parse the text range with `JSON.parse(text)` after a small TS→JSON normalisation pass (TS allows trailing commas, identifiers as keys, etc., so this is non-trivial). Recommended: use `eval()` inside a sandboxed `vm.Script` to evaluate the array literal expression after stripping the type annotation — runs in a fresh `vm.Context` with no globals. **Fallback:** If `vm.Script` evaluation throws (template literals, `process.env` references, imported constants), attempt to strip the problematic expression and evaluate again. If all strategies fail, log the file path + error to the migration audit and skip.
- **AST extraction failure contract:** The script MUST NOT write a `.json` file if it cannot verify the output validates against `eval-file.schema.json`. A corrupt JSON file is worse than a lingering `.test.ts`. Failed files are logged and left in place. The `--dry-run` report explicitly marks files where extraction is uncertain.
- **`defineLlmEval` arg extraction:** Find the `CallExpression` whose callee is `defineLlmEval`. Walk its single object-literal argument's properties. Extract `targetId` (string literal), `modelId` (binary expression: `process.env.X ?? "<default>"` — capture the RHS string literal), `judgeModel` (same), `caseTimeoutMs` (numeric literal).
- **Why `_meta.model_id` etc. at the top level:** Stamper templates already use a `_meta` envelope. Centralising defaults at the file level keeps cases lean. The JSON loader (subtask 02) reads these and threads them into `defineLlmEval(...)`.
- **Manifest rewrite:** Use the existing YAML utilities (`yaml` package, ^2.8.4). Preserve comments and ordering — `yaml`'s `parseDocument` + edit + `toString` round-trip is the safe path.
- **`hooks.json` filename:** Multiple hook primitives per plugin currently share a single `hooks.test.ts` — preserve that pattern; destination is `<hooks-dir>/evals/hooks.json` with one combined cases array. The migration script handles this naturally if it reads each TS file independently.
- **Sandbox & fixture references:** Case bodies may reference fixtures via `from: "..."` paths. These are case-relative and unaffected by the migration.
- **Verify nothing imports the deleted TS files:** After deletion, `rg "from \".*/evals/[^/]+\\.test"` should return nothing. If anything does, fix the import to the new JSON path or remove it.
- **Stable IDs:** Case `id` strings must not change (downstream `_runs/` data and CI logs reference them). The migration is purely a container swap.

## Testing Strategy
**IMPORTANT**: Do NOT trigger the global test suite during parallel execution. Instead:
- Run only the migration script unit tests:
  - `pnpm exec vitest run --config evals/llm/_shared/vitest.config.ts scripts/eval-migrate-ts-to-json.test.ts`
  - (Or wherever the script's tests live — place them adjacent to the script.)
- Run `pnpm eval:list` after migration to verify discovery.
- Run a single migrated file through Vitest to verify discovery & dispatch.
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
