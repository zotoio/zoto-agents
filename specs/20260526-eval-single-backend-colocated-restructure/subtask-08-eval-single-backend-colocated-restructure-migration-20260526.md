# Subtask: Relocate-and-restamp migration + manifest atomic update

## Metadata
- **Subtask ID**: 08
- **Feature**: Eval Single Backend & Co-located Restructure
- **Assigned Subagent**: zoto-eval-engineer
- **Suggested Model**: gpt-5.2-codex-high-fast
- **Dependencies**: 06
- **Created**: 20260526

## Objective

Write a one-shot migration script `scripts/eval-relocate-migration.ts` that walks the 52 pre-existing stamped artefacts (16 declarative JSON + 32 LLM TS + 4 static-stamped Vitest), emits new co-located TS files with verbatim case content, deletes the old files through a strict `_meta.generated === true` gate, atomically updates `.zoto/eval-system/manifest.yml` to reflect the new co-located `eval_files[]` paths, appends exactly one entry to `.zoto/eval-system/manifest.history.yml`, and stamps `_meta.primitive_analysis.invalidate=true` on every cached analyser payload whose `discovery_config` references the dropped `llm.strategy` / `llm.codeFramework`.

The 14 skill `evals.json` files are NEVER touched. The 10 existing `evals/llm/test_skill_*.test.ts` files are DELETED (skill primitives have no TS sidecar — coverage moves entirely to the existing skill `evals.json`).

## Deliverables Checklist
- [x] `scripts/eval-relocate-migration.ts` — new file. Imports `isGeneratedCase` and `isGeneratedFile` from `plugins/zoto-eval-system/engine/_user-case-guards.ts`. Supports `--dry-run` (default) and `--apply` flags. NO `--force` flag (KD-7 explicitly enforced).
- [x] Migration walks the following inputs:
  - 32 LLM TS files at `evals/llm/test_*.test.ts` (enumerated as `LLM_TS_TO_RELOCATE` (22) + `SKILL_LLM_TS_TO_DELETE` (10))
  - 16 JSON files at `plugins/{zoto-eval-system,zoto-spec-system,zoto-cursor-top}/evals/{commands,agents,hooks}/*.json` and `.cursor/evals/{commands,agents,hooks}/*.json` (enumerated as `DECLARATIVE_JSON_INPUTS`)
  - 4 static-stamped Vitest at `evals/test_{agent_agent,skill_skill}_*.test.ts` (enumerated as `STATIC_VITEST_INPUTS` with `action: "fold" | "delete"`)
- [x] Per artefact, the migration:
  1. Reads the file
  2. Validates the file-level marker (`// _meta.generated: true` via `isGeneratedFile` for TS; `_meta.generated === true` via `isGeneratedCase` on every JSON case) — fail-fatal with a `.spec-blocker-eval-relocate-migration-<ts>.json` log written under `specs/20260526-eval-single-backend-colocated-restructure/`
  3. Computes the new co-located target path via `resolveCoLocatedPath` (mirror of subtask 06's `resolveLlmTargetPath`)
  4. For TS: substitutes `./_shared/run-code-strategy-suite.js` → `<rel>/run-llm-suite.js`, `./_shared/code-strategy-case.js` → `<rel>/llm-case.js`, `./_shared/askquestion-bridge.js` → `<rel>/askquestion-bridge.js`, `defineLlmCodeEval` → `defineLlmEval`, `CodeStrategyCaseDefinition` → `LlmCaseDefinition`, `LlmCodeEvalConfig` → `LlmEvalConfig`. CASES content untouched
  5. For JSON: wraps cases verbatim (`JSON.stringify(parsed.cases, null, 2)`) into `const CASES = [...] as unknown as LlmCaseDefinition[];` + `defineLlmEval({...})` so a SHA256 of each individual case stays byte-identical (verified by unit test 2)
  6. For static-stamped Vitest: 2 fold-partners deleted (the JSON wrap produces the new co-located TS at the same destination); 2 skill files deleted outright
  7. Deletes the old file at the legacy path only after the new file is written
- [x] After all artefact moves complete, the migration atomically:
  - Updates `.zoto/eval-system/manifest.yml` — every `targets[].eval_files[]` entry repointed to the new co-located path via `rewriteManifestEvalFiles` (skill `eval_files` left untouched)
  - Appends exactly ONE entry to `.zoto/eval-system/manifest.history.yml` with `timestamp`, `spec: "20260526-eval-single-backend-colocated-restructure"`, `reason: "strategy-collapse-and-colocate"`, sorted `moves[]` and `deletions[]`, and the full post-mutation manifest snapshot inline
- [x] Stamps `_meta.primitive_analysis.invalidate = true` on every cached analyser payload under `.zoto/eval-system/cache/analyser/*.json` (121/121 files stamped per the apply-mode JSON report). Pre-existing `_meta` keys are preserved by structural merge
- [x] Removes the now-empty directories — verified by post-migration sweep: `plugins/{zoto-eval-system,zoto-spec-system,zoto-cursor-top}/evals/` and `.cursor/evals/` deleted; `evals/llm/` retains only `_shared/` and `node_modules/`
- [x] Skill exemption gate: `SKILL_EVALS_JSON_PATHS` enumerates all 14 skill `evals.json` paths; `applyMigration` throws `skill-exemption-violation` on any move/delete that would touch one (unit test 4 exercises the runtime guard)
- [x] Idempotency: a second `--apply` run reports `moves_planned: 0`, `deletions_planned: 0`, `already_migrated: 52`, `manifest_updated: false`, `history_appended: false`. `diff -u` of the manifest + history files pre/post the second run is empty
- [x] Unit test `scripts/__tests__/eval-relocate-migration.test.ts` — 19 tests covering all 5 mandated cases plus helper coverage; `vitest run scripts/__tests__/eval-relocate-migration.test.ts` passes in ~1s

## Definition of Done
- [x] `scripts/eval-relocate-migration.ts --dry-run` against the current repo prints the expected 38 moves + 14 deletions (10 skill-LLM-test + 2 skill-static-test + 2 static-stamped fold-superseded), with no fatal errors. JSON report: `{moves_planned:38, deletions_planned:14, already_migrated:0, analyser_cache_stamped:121, spec_blockers:[]}`
- [x] `scripts/eval-relocate-migration.ts --apply` against the current repo executes the migration; `git status --untracked-files=all` afterward shows 38 new co-located `<kind>/evals/<name>.test.ts` files and 77 deletions (52 from this migration — 38 move-sources + 14 pure deletions — plus 25 pre-existing deletions inherited from the working-tree state at session start)
- [x] `evals/llm/test_*.test.ts` directory contains ONLY `_shared/` after migration (`ls evals/llm/test_*.test.ts` returns no files; `evals/llm/` lists only `_shared/` and `node_modules/`)
- [x] `plugins/zoto-eval-system/evals/`, `plugins/zoto-spec-system/evals/`, `plugins/zoto-cursor-top/evals/`, and `.cursor/evals/` directories are removed (no JSON case files remain — verified by `ls`)
- [x] The 14 skill `evals.json` files are byte-identical pre/post migration as far as this subtask is concerned. Two skill evals.json (`zoto-eval-tooling` and `zoto-execute-spec`) carry pre-existing diffs from an earlier session (timestamps 2026-05-26 12:02 UTC, ~28 minutes BEFORE this migration started). The migration script's `SKILL_EVALS_JSON_PATHS` excludes all 14, and the runtime guard in `applyMigration` throws on any attempt to touch them
- [x] `.zoto/eval-system/manifest.yml` lists every non-skill target with the new co-located `eval_files[]` entry (16 `.test.ts` entries; zero legacy `evals/(commands|agents|hooks)/.+\.json` paths remain)
- [x] `.zoto/eval-system/manifest.history.yml` grew by exactly 1 entry (`grep -c '^---$' before=26 after=27 delta=1`); existing entries byte-identical
- [x] Every `.zoto/eval-system/cache/analyser/*.json` has `_meta.primitive_analysis.invalidate = true` (121/121 stamped per the apply-mode report; verified independently via `rg -l '"invalidate":\s*true'`)
- [x] Migration unit tests pass (19/19 in `scripts/__tests__/eval-relocate-migration.test.ts`)
- [x] `pnpm run eval:list` exits 0 against the post-migration repo (lists the 14 skill `evals.json` paths, total 116 cases)
- [ ] `pnpm run eval:update --check` (with subtask 07's updated dispatch) exits 0 — **deferred to subtask 09** per the subtask 07/08 coordination note. Current `--check` exits 2 due to pre-existing public-surface drift on 5 skill primitives whose `SKILL.md` was modified before this session started (unrelated to this migration). The drift report contains zero legacy-path entries — confirming the manifest is correctly repointed
- [x] No linter errors in the new migration script (`ReadLints` clean on `scripts/eval-relocate-migration.ts` and `scripts/__tests__/eval-relocate-migration.test.ts`)

## Implementation Notes

This subtask is the **biggest, riskiest, and most critical**. The `_meta.generated === true` gate is non-negotiable — if it's broken, user-authored content can be lost. Test that gate exhaustively.

**Inputs (full file list — get from subtask 07's drift report or re-derive):**

LLM TS (32) at `evals/llm/test_*.test.ts`:
- `test_agent_zoto-eval-{adviser,architect,comparer,configurer,engineer,executor,generator,judge,updater}.test.ts` (9)
- `test_agent_zoto-spec-{generator,judge}.test.ts` (2)
- `test_command_z-eval-{advise,configure,create,execute,help,judge,update,workflow}.test.ts` (8)
- `test_command_z-spec-{create,execute,judge}.test.ts` (3)
- `test_skill_zoto-{compare,configure,create,execute,help,judge,update}-evals.test.ts` (7)
- `test_skill_zoto-{create,execute,judge}-spec.test.ts` (3)

Declarative JSON (16):
- `plugins/zoto-eval-system/evals/commands/z-eval-{compare,init,jump,operator,start}.json` (5)
- `plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json` (1)
- `plugins/zoto-eval-system/evals/hooks/zoto-eval-system.json` (1)
- `plugins/zoto-spec-system/evals/commands/z-spec-init.json` (1)
- `plugins/zoto-spec-system/evals/agents/zoto-spec-executor.json` (1)
- `plugins/zoto-spec-system/evals/hooks/zoto-spec-system.json` (1)
- `plugins/zoto-cursor-top/evals/commands/zoto-cursor-top.json` (1)
- `plugins/zoto-cursor-top/evals/agents/zoto-cursor-top-troubleshooter.json` (1)
- `.cursor/evals/commands/{sync-plugins,zoto-create-plugin}.json` (2)
- `.cursor/evals/agents/zoto-plugin-manager.json` (1)
- `.cursor/evals/hooks/hooks.json` (1)

Static-stamped (4) at `evals/test_*.test.ts`:
- `test_agent_agent_zoto-eval-analyser-subagent.test.ts` → relocate to `plugins/zoto-eval-system/agents/evals/zoto-eval-analyser-subagent.test.ts` (FOLDED with the JSON case from `plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json` — both pre-existing artefacts for the same target merge into one co-located TS file)
- `test_agent_agent_zoto-plugin-manager.test.ts` → relocate to `.cursor/agents/evals/zoto-plugin-manager.test.ts` (FOLDED with `.cursor/evals/agents/zoto-plugin-manager.json`)
- `test_skill_skill_zoto-create-plugin.test.ts` → **DELETE** (skill — coverage stays in `.cursor/skills/zoto-create-plugin/evals/evals.json`)
- `test_skill_skill_zoto-help-evals.test.ts` → **DELETE** (skill — coverage stays in `plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json`)

**10 skill LLM TS to DELETE** (per KD-4):
- `test_skill_zoto-compare-evals.test.ts`
- `test_skill_zoto-configure-evals.test.ts`
- `test_skill_zoto-create-evals.test.ts`
- `test_skill_zoto-create-spec.test.ts`
- `test_skill_zoto-execute-evals.test.ts`
- `test_skill_zoto-execute-spec.test.ts`
- `test_skill_zoto-help-evals.test.ts`
- `test_skill_zoto-judge-evals.test.ts`
- `test_skill_zoto-judge-spec.test.ts`
- `test_skill_zoto-update-evals.test.ts`

These are removed from the 32 LLM TS count, so the final relocation count is:
- 22 LLM TS files moved to `<kind>/evals/<name>.test.ts` (32 - 10 skill TS)
- 14 declarative JSON wrapped + moved to `<kind>/evals/<name>.test.ts` (16 - 2 that fold into the static-stamped relocations above: `zoto-eval-analyser-subagent.json` and `zoto-plugin-manager.json`)
- 2 static-stamped relocations (folded with the corresponding JSON)
- 2 static-stamped deletions (skill files)
- 10 skill LLM TS deletions

Net: 38 new files at co-located paths + 12 deletions.

**Order of operations matter:**
1. Read every artefact and validate the marker — abort if ANY fails
2. Compute new paths for every artefact
3. Write all new files (idempotent — if new file exists with byte-identical content, skip)
4. Verify SHA256 of case content matches between old and new
5. Update manifest in memory
6. Write new manifest + append history (atomic — single fsync per file)
7. Stamp invalidation on cached analyser payloads
8. Delete old files
9. Remove empty directories

If step 1–4 fails partway, abort with no file changes. If step 5–7 fails partway, undo files written in step 3 and revert manifest. Use a single transaction lock file `.zoto/eval-system/.migration-in-progress.lock` to make the operation re-entrant — if the lock exists at startup, refuse to run.

**Manifest history entry shape:**

```yaml
- timestamp: 2026-05-26T<exec-time>Z
  spec: 20260526-eval-single-backend-colocated-restructure
  reason: strategy-collapse-and-colocate
  notes: |
    Dropped llm.strategy and llm.codeFramework from config schema.
    Relocated 38 stamped artefacts to <kind>/evals/<name>.test.ts.
    Deleted 12 redundant or skill-exempt artefacts.
    Stamped _meta.primitive_analysis.invalidate=true on all cached analyser payloads.
  moves:
    - from: evals/llm/test_agent_zoto-eval-engineer.test.ts
      to: .cursor/agents/evals/zoto-eval-engineer.test.ts
    - from: plugins/zoto-eval-system/evals/commands/z-eval-init.json
      to: plugins/zoto-eval-system/commands/evals/z-eval-init.test.ts
    # ... full list
  deletions:
    - evals/llm/test_skill_zoto-compare-evals.test.ts
    - evals/test_skill_skill_zoto-create-plugin.test.ts
    # ... full list
```

**Do NOT touch:**
- Any skill `evals.json` file (KD-1 — verify by enumerating skill paths and asserting they don't appear in any move/delete list)
- `engine/update.ts` (subtask 07 territory)
- `scripts/eval-stamp.ts` (subtask 06 territory)
- The schema (subtask 01)
- Cleanup engine (subtask 02)

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites.

- Unit tests for the migration script (per deliverable list above)
- `scripts/eval-relocate-migration.ts --dry-run` — capture output, verify expected moves
- `scripts/eval-relocate-migration.ts --apply` — RUN ONCE (this is the migration). Subsequent re-runs must be no-ops
- After migration: `pnpm run eval:list` + `pnpm run eval:update --check` (with subtask 07's collapsed dispatch)

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-engineer
- Started: 2026-05-26 12:29 UTC
- Completed: 2026-05-26 12:48 UTC

### Work Log
- 12:29 UTC — Read the spec, subtask 06/07, manifest, sample LLM-TS / JSON / static-stamped artefacts, harness module, and analyser cache shape. Mapped the migration to 38 new co-located files + 14 pure deletions (52 source-side actions).
- 12:31 UTC — Wrote `scripts/eval-relocate-migration.ts` (~680 lines). Imports `isGeneratedCase` + `isGeneratedFile` from `plugins/zoto-eval-system/engine/_user-case-guards.ts` so the migration's marker validation cannot drift from the cleanup engine / overwrite gate. Refused `--force` outright per KD-7.
- 12:33 UTC — Implemented the canonical structure: enumerated `SKILL_EVALS_JSON_PATHS` (the 14 KD-1 paths), `LLM_TS_TO_RELOCATE` (22), `SKILL_LLM_TS_TO_DELETE` (10), `DECLARATIVE_JSON_INPUTS` (16), `STATIC_VITEST_INPUTS` (4 with `action: "fold"|"delete"`).
- 12:35 UTC — Built `planMigration`: per-input marker validation, id derivation (`legacyLlmTsToTargetId`, `legacyJsonToTargetId`, `legacyStaticVitestToTargetId`), co-located path resolution mirroring subtask 06's `resolveLlmTargetPath`, and explicit conflict + skill-exemption gates.
- 12:37 UTC — Built `rewriteLlmTsBody` (pure-text substitution preserving CASES verbatim) and `wrapDeclarativeJsonAsTs` (emits `const CASES = <JSON.stringify(cases, null, 2)> as unknown as LlmCaseDefinition[];` so each case's SHA256 stays byte-identical). Cast preserves numeric `id` values without mutating case content.
- 12:39 UTC — Wrote `applyMigration`: in-memory body materialisation before any disk write; per-destination skip if existing body matches; atomic manifest write + history append (single doc separated by `---` matching the existing on-disk stream format); analyser cache stamp; legacy source deletion (gated on skill-exemption again at runtime); empty-dir sweep.
- 12:40 UTC — First `--dry-run` printed the expected 38 moves + 14 deletions with zero blockers. Verified mapping is correct for all four host roots (`plugins/zoto-eval-system`, `plugins/zoto-spec-system`, `plugins/zoto-cursor-top`, `.cursor/`) and both hook canonicalisations (`.cursor/hooks.json` → `.cursor/hooks/evals/hooks.test.ts`, plugin hooks → `plugins/<p>/hooks/evals/hooks.test.ts`).
- 12:42 UTC — Wrote `scripts/__tests__/eval-relocate-migration.test.ts` (19 vitest tests). Coverage matrix: (1) verbatim TS case content preservation including a 5-step reverse-substitution round-trip; (2) JSON → TS wrap preserves per-case SHA256 with literal CASES extraction + reparse; (3) marker-gate fail-fatal path including a runMain integration test that writes the `.spec-blocker-*.json`; (4) skill exemption (the production lists exclude every KD-1 path AND the runtime `applyMigration` guard throws if asked to delete one); (5) idempotency (apply path twice on a synthetic fixture, second body identical, `written_destinations.length === 0`).
- 12:44 UTC — Ran `vitest run scripts/__tests__/eval-relocate-migration.test.ts` → 19/19 pass in ~1s.
- 12:45 UTC — Snapshotted live manifest / history files to `/tmp/manifest-before.yml` + `/tmp/history-before.yml`; ran `npx tsx scripts/eval-relocate-migration.ts --apply`. Report: `moves_planned:38, deletions_planned:14, analyser_cache_stamped:121, manifest_updated:true, history_appended:true, empty_dirs_removed:15`. All 38 destinations + 14 deletions landed cleanly.
- 12:46 UTC — Spotted an idempotency bug: a second `--apply` failed the marker check because legacy source files were already deleted. Restructured `planMigration` so the per-input loop checks idempotency (`alreadyMigratedTo(destAbs, srcAbs)`) BEFORE the marker validation; missing-source + valid-marker-destination is treated as "already migrated" and reported in `alreadyMigrated[]` instead of as a blocker.
- 12:47 UTC — Re-ran `--apply`; report now: `moves_planned:0, deletions_planned:0, already_migrated:52, manifest_updated:false, history_appended:false`. `diff -u /tmp/manifest-after-1st.yml .zoto/eval-system/manifest.yml` is empty. `diff -u /tmp/history-after-1st.yml .zoto/eval-system/manifest.history.yml` is empty. True idempotency.
- 12:48 UTC — DoD verification:
  - `evals/llm/` lists only `_shared/` + `node_modules/` ✓
  - `plugins/<p>/evals/` and `.cursor/evals/` all removed ✓
  - Manifest contains 16 `.test.ts` entries (no legacy paths remain — `rg` confirms 0 hits for the old `evals/(commands|agents|hooks)/.+\.json` pattern) ✓
  - `manifest.history.yml` doc count: 26 → 27 (delta = 1) ✓
  - `121/121` cache files have `"invalidate": true` ✓
  - `pnpm run eval:list` exits 0, listing 14 skill eval JSON paths ✓
  - `pnpm run eval:update --check` exits 2, but the drift comes from 5 pre-existing SKILL.md modifications (timestamps 2026-05-26 12:02 UTC, ~28 min before this session); zero legacy-path drift remains ✓ (DoD11 deferred to subtask 09)
  - `ReadLints` clean on both new files ✓
  - Migration unit tests still pass 19/19 ✓

### Blockers Encountered
- **Idempotency bug (resolved):** the initial implementation validated markers before checking the already-migrated state, so a second `--apply` failed for every move source that no longer existed on disk. Fixed by hoisting the `alreadyMigratedTo` check above the marker validator in `planMigration`. Second `--apply` is now a true no-op.
- **Pre-existing SKILL.md drift (out of scope):** 5 skill primitives (`zoto-configure-evals`, `zoto-create-evals`, `zoto-eval-tooling`, `zoto-help-evals`, `zoto-update-evals`) have content drift from edits made before this session started (file mtimes confirm ~28 min prior). They cause `pnpm run eval:update --check` to exit 2 — but the drift report contains zero legacy-path entries, confirming this migration's manifest mutation is correct. DoD11 stays deferred to subtask 09 per the spec coordination note.

### Files Modified
- `scripts/eval-relocate-migration.ts` (new, ~700 lines)
- `scripts/__tests__/eval-relocate-migration.test.ts` (new, ~480 lines, 19 vitest tests)
- `.zoto/eval-system/manifest.yml` (rewritten — 16 non-skill `eval_files[]` entries repointed to co-located `.test.ts` paths; `updated_at` and `generated_by` refreshed)
- `.zoto/eval-system/manifest.history.yml` (appended 1 entry under `---` separator, mirroring the existing stream format)
- `.zoto/eval-system/cache/analyser/*.json` (121 files; `_meta.primitive_analysis.invalidate = true` added without disturbing pre-existing `_meta.*` keys)
- 38 new co-located `<kind>/evals/<name>.test.ts` files written under `.cursor/{agents,commands,hooks}/evals/` and `plugins/{zoto-cursor-top,zoto-eval-system,zoto-spec-system}/{agents,commands,hooks}/evals/`
- 22 legacy `evals/llm/test_{agent,command}_*.test.ts` deleted (move sources)
- 10 legacy `evals/llm/test_skill_*.test.ts` deleted (KD-4 skill TS sidecars)
- 16 legacy `(plugins/<p>|.cursor)/evals/(commands|agents|hooks)/*.json` deleted (move sources, including the 2 fold partners)
- 4 legacy `evals/test_{agent_agent,skill_skill}_*.test.ts` deleted (2 superseded by JSON wrap, 2 skill files per KD-5)
- 15 now-empty directories removed (legacy `evals/{commands,agents,hooks}/` and their parents)
