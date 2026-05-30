# Subtask: Schema + types + config.yml cleanup

## Metadata
- **Subtask ID**: 01
- **Feature**: Eval Single Backend & Co-located Restructure
- **Assigned Subagent**: zoto-eval-engineer
- **Suggested Model**: gpt-5.2-codex-high-fast
- **Dependencies**: None
- **Created**: 20260526

## Objective

Drop `llm.strategy` and `llm.codeFramework` from the eval-system config schema, clean the corresponding TypeScript types in `engine/analyser-payload.ts` and the manifest snapshot helpers in `engine/manifest-snapshot.ts`, and migrate the host repo's `.zoto/eval-system/config.yml` plus the baseline fixture config so they round-trip cleanly through the new schema. After this subtask, the schema knows nothing about LLM strategy and the runtime config has no orphaned fields.

## Deliverables Checklist
- [x] `plugins/zoto-eval-system/templates/schema/config.schema.json` — remove `llm.strategy`, `llm.codeFramework`, and the cross-field documentation between them; retain `static.framework` enum, `update.preserveUserAuthoredCases: const true`, `update.writeMetaMarker: const true`
- [x] `plugins/zoto-eval-system/engine/analyser-payload.ts` — remove `LlmStrategy` and `CodeFramework` exports if they exist; keep `RequiresInteraction`, `InteractionStyle`, and all payload shape types
- [x] `plugins/zoto-eval-system/engine/manifest-snapshot.ts` — remove `LlmStrategy` / `CodeFramework` re-exports; drop reads of `discovery_config.llm.strategy` and `discovery_config.llm.codeFramework`; keep `discovery_config.static.framework`
- [x] `plugins/zoto-eval-system/src/config-loader.ts` — drop `llm.strategy` / `llm.codeFramework` parsing branches; keep `static.framework` resolution
- [x] `.zoto/eval-system/config.yml` — remove the entire `llm:` block (strategy + codeFramework keys); leave `static.framework: vitest` intact
- [x] `evals/fixtures/baseline/.zoto/eval-system/config.yml` — same edit; remove `llm:` block, keep `static.framework`
- [x] Any other fixture configs discovered under `evals/fixtures/**/.zoto/eval-system/config.yml` — same edit
- [x] Targeted vitest tests for the schema validator (or AJV harness) confirming a config without `llm.strategy` validates cleanly and a config WITH `llm.strategy` is rejected with the AJV `additionalProperties` error

## Definition of Done
- [x] Schema file no longer contains the strings `"strategy"` or `"codeFramework"` within the `llm` property tree (grep for `llm.strategy`, `llm.codeFramework`, `"strategy":`, `"codeFramework":` returns zero hits in the schema)
- [x] `engine/analyser-payload.ts` and `engine/manifest-snapshot.ts` type-check (`pnpm tsc --noEmit -p tsconfig.json`)
- [x] AJV validation of the updated `.zoto/eval-system/config.yml` succeeds (`pnpm run eval:list` is the quickest end-to-end check — it loads the config through the schema)
- [x] Targeted tests pass; no linter errors in any modified TS file
- [x] The 14 skill `evals.json` files are byte-identical (`git diff --stat skills/` shows zero changes — though this subtask shouldn't touch them, verify)
- [x] Pre-existing tests for `static.framework` continue to pass

## Implementation Notes

Files to edit (per exploration report):
- `plugins/zoto-eval-system/templates/schema/config.schema.json` lines 47–57 (the `llm` object's `strategy` and `codeFramework` properties), line 31 (cross-field description on `static.framework` mentioning `llm.codeFramework`), and any `if/then/else` block — none exist in JSON Schema form per exploration, but verify
- `plugins/zoto-eval-system/engine/analyser-payload.ts` line ranges around 34–37 (type exports)
- `plugins/zoto-eval-system/engine/manifest-snapshot.ts` lines 17–25 (config fallback path) and 35–42 (type re-exports)
- `plugins/zoto-eval-system/src/config-loader.ts` (parser)

Verify with grep BEFORE editing:
```
rg -n '"strategy"|"codeFramework"|LlmStrategy|CodeFramework' plugins/zoto-eval-system
rg -n 'llm\.strategy|llm\.codeFramework' plugins/zoto-eval-system .zoto evals
```

After editing, the same greps run against `plugins/zoto-eval-system/templates`, `plugins/zoto-eval-system/engine`, and `plugins/zoto-eval-system/src` MUST return zero hits.

**Do NOT touch:**
- `plugins/zoto-eval-system/agents/*.md` (documentation lives there too, but that's subtask 05's scope)
- `plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md` (also subtask 05)
- `scripts/eval-orchestrate.ts` (subtask 03)
- `scripts/eval-stamp.ts` (subtask 06)
- `scripts/eval-cleanup-stale.ts` (subtask 02)
- Skill `evals.json` files (KD-1 — byte-preserve)
- Any stamped TS/JSON case file (subtask 08)

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution.

- Run only the unit tests touching the schema validator and config loader (likely under `plugins/zoto-eval-system/__tests__/` or `scripts/__tests__/`)
- `pnpm run eval:list` is the lightest end-to-end check that loads the new schema against the migrated config
- If you add a new test for the AJV rejection of `llm.strategy`, place it adjacent to the existing schema tests (do NOT create a new top-level test root)

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-engineer (Claude Opus 4.7, subtask 01 of single-backend colocated restructure)
- Started: 2026-05-26T11:01:41Z
- Completed: 2026-05-26T11:16:44Z

### Work Log
1. Audited `"strategy"|"codeFramework"|LlmStrategy|CodeFramework` references across the plugin tree (`templates/`, `engine/`, `src/`, host `.zoto/`, fixtures, root `evals/`).
2. Edited `templates/schema/config.schema.json`: dropped `llm.strategy` and `llm.codeFramework` properties, set `additionalProperties: false` on the `llm` block so legacy fields now fail validation with an explicit `additionalProperties` error, refreshed the `llm` description to document the unified-harness model, and stripped the `static.framework` description's cross-field rule referencing `llm.strategy`/`llm.codeFramework`.
3. Edited `templates/config.json` (the baseline `templateBaseline` consumed by `loadEvalConfig`) so it no longer ships `strategy` / `codeFramework` — this is mandatory for the new strict schema to validate the default merge result.
4. Edited `src/config-loader.ts`: removed the `LlmStrategy` and `LlmCodeFramework` type exports and the corresponding `strategy` / `codeFramework` fields on `EvalSystemConfig.llm`.
5. Edited `src/config-loader.test.ts`: refreshed default-config assertions, swapped the `llm.strategy` partial-override fixture to `llm.runtime`, swapped the legacy-migration fixture to `llm.runtime`, and added three new tests: rejection of legacy `llm.strategy`, rejection of legacy `llm.codeFramework`, and clean acceptance of a config without strategy/codeFramework — all asserting AJV `additionalProperties` with `additionalProperty: "strategy"` / `"codeFramework"`.
6. Edited `engine/manifest-snapshot.ts`: removed the `LlmStrategy` and `CodeFramework` type exports, dropped the `llm` field from `ManifestSnapshot`, removed the `discovery_config.llm.*` reads + `hasLlm` branch from `readManifestSnapshot`, and refreshed the module banner to document the unified-harness model.
7. Edited `engine/analyser-payload.ts`: confirmed there are no `LlmStrategy`/`CodeFramework` exports to remove. Refreshed two doc comments that previously described the analyser flag as routing between "declarative JSON vs code-strategy TypeScript" so they now describe the runtime-branch decision inside the unified harness.
8. Migrated `.zoto/eval-system/config.yml`: removed the entire `llm:` block (the active overrides for `strategy: code` and `codeFramework: vitest` plus the inert `model.id` line), kept `static.framework: vitest`, and replaced the backends section comment with a single sentence documenting that the unified harness emits `<kind>/evals/<name>.test.ts` for every non-skill primitive.
9. Migrated `evals/fixtures/baseline/.zoto/eval-system/config.yml`: removed the commented `strategy` and `codeFramework` lines plus the cross-field constraint comment, kept the commented `runtime` and `model.id` placeholders. (The Glob for `evals/fixtures/**/.zoto/eval-system/config.yml` returned only the baseline — no other fixture configs to touch.)
10. Verified DoD:
    - `rg "llm\.strategy|llm\.codeFramework|\"strategy\":|\"codeFramework\":"` on `plugins/zoto-eval-system/templates/schema/config.schema.json` returns 0 hits.
    - `npx tsc --noEmit -p plugins/zoto-eval-system/tsconfig.json` reports no errors in `engine/analyser-payload.ts` or `engine/manifest-snapshot.ts` (the two DoD-named files). Pre-existing errors in `scripts/eval-update.ts`, `scripts/validate-plugin.ts`, `tests/plugin.test.ts`, etc. are unrelated to this subtask and predate it.
    - `pnpm run eval:list` exits 0 and enumerates all 194 eval files via the new schema.
    - `vitest run src/config-loader.test.ts` reports 14/14 passing (5 of which assert `static.framework` behaviour).
    - `git diff --stat skills/` returns 0 (no top-level skills directory in this repo; per-plugin/.cursor skill `evals.json` files are unchanged by this subtask).

### Blockers Encountered
None of substance. Mid-task `git stash` round-trip to isolate pre-existing TS errors hit a conflict on two unrelated working-tree mods (`scripts/__tests__/eval-cleanup-stale.test.ts`, `evals/llm/_shared/zoto-llm-reporter.ts`); recovered by checking those out to HEAD before `git stash pop`, then re-staging the original modifications via stash pop. All my edits were preserved.

### Files Modified
- `plugins/zoto-eval-system/templates/schema/config.schema.json`
- `plugins/zoto-eval-system/templates/config.json`
- `plugins/zoto-eval-system/src/config-loader.ts`
- `plugins/zoto-eval-system/src/config-loader.test.ts`
- `plugins/zoto-eval-system/engine/manifest-snapshot.ts`
- `plugins/zoto-eval-system/engine/analyser-payload.ts`
- `.zoto/eval-system/config.yml`
- `evals/fixtures/baseline/.zoto/eval-system/config.yml`
- `specs/20260526-eval-single-backend-colocated-restructure/subtask-01-eval-single-backend-colocated-restructure-schema-cleanup-20260526.md` (this file)
