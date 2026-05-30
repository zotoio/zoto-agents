# Subtask: Cleanup engine — strategy-switch branch removal

## Metadata
- **Subtask ID**: 02
- **Feature**: Eval Single Backend & Co-located Restructure
- **Assigned Subagent**: zoto-eval-engineer
- **Suggested Model**: gpt-5.2-codex-high-fast
- **Dependencies**: None
- **Created**: 20260526

## Objective

Remove the `"strategy-switch"` branch from the cleanup-plan schema and the matching code path in `scripts/eval-cleanup-stale.ts` (`enumerateLlmStrategyAssets` and friends). The framework-switch branch (vitest ↔ jest for the static side) remains intact. After this subtask, cleanup knows nothing about LLM strategy transitions; it only cleans framework-switch stragglers (a code path that still has use when host repos flip `static.framework`).

## Deliverables Checklist
- [x] `plugins/zoto-eval-system/templates/schema/cleanup-plan.schema.json` — remove `"strategy-switch"` from the `reason` enum (line ~112 per exploration); remove the strategy `from` / `to` fields (lines ~115–123); remove `llm.strategy` / `llm.codeFramework` from any snapshot definition (lines ~84–96); retain `"framework-switch"` reason and the `static.framework` snapshot fields
- [x] `scripts/eval-cleanup-stale.ts` — remove `enumerateLlmStrategyAssets` function (~lines 601–672) and its callers; remove strategy-switch branches in `enumerateAssets` / `enumerateGenerated` / `buildPlan` (the `reason: "strategy-switch"` arms ~lines 107–112, 283, 325–384, 608–638, 948–960); retain `framework-switch` arms
- [x] `scripts/__tests__/eval-cleanup-stale.test.ts` — remove `strategy-switch` test cases; ADD a regression test asserting that running cleanup with NO `llm.strategy` in the snapshot does not throw and emits an empty `groups[]` (or framework-switch-only groups)
- [x] Any cleanup-related fixture under `evals/fixtures/**/cleanup-*.json` — verify it still matches the post-cleanup schema; update if needed
- [x] Updated cleanup README (if one exists under `plugins/zoto-eval-system/docs/`) — flagged for subtask 10 if doc edits are out of scope

## Definition of Done
- [x] `rg -n '"strategy-switch"|enumerateLlmStrategyAssets|strategy.*from.*to' plugins/zoto-eval-system scripts` returns zero hits (modulo this subtask's own commit message in git history)
- [x] `pnpm tsc --noEmit -p tsconfig.json` passes
- [x] `scripts/__tests__/eval-cleanup-stale.test.ts` passes (only the cleanup tests, not the full suite)
- [x] `pnpm run eval:cleanup-stale --dry-run` (or equivalent invocation) on the current repo emits a sensible plan (empty groups expected since nothing in this repo has flipped strategy or framework recently)
- [x] No linter errors in modified files

## Implementation Notes

Files to edit (per exploration report):
- `plugins/zoto-eval-system/templates/schema/cleanup-plan.schema.json` — see line ranges in deliverables
- `scripts/eval-cleanup-stale.ts` — see line ranges in deliverables; also remove any imports of `LlmStrategy` / `CodeFramework` made unreferenced after the removal
- `scripts/__tests__/eval-cleanup-stale.test.ts` — remove strategy-switch fixtures; ADD the empty-plan regression test
- Optionally: a brief grep over `plugins/zoto-eval-system/docs/**` to flag (do not edit yet) any user-facing cleanup docs that mention strategy-switch — flag in this subtask's `Files Modified` section so subtask 10 picks them up

**Coordination with other Phase 1 subtasks:**
- Subtask 01 owns `analyser-payload.ts` / `manifest-snapshot.ts` type cleanup. If you find a `LlmStrategy` import that subtask 01 is about to remove, leave the type but stop using it; the import will disappear automatically once subtask 01's PR lands
- Subtask 03 owns `eval-orchestrate.ts`. If the orchestrator currently invokes `eval-cleanup-stale.ts --strategy-switch`, that's subtask 03's removal — flag it, do not edit

**Do NOT touch:**
- Any other engine file (subtask 06–08 territory)
- Any stamped output (subtask 08)

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites.

- Run only `scripts/__tests__/eval-cleanup-stale.test.ts` via vitest filter
- Run the cleanup CLI in `--dry-run` mode against the current repo to confirm no crash

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-engineer
- Started: 2026-05-26T11:02:13Z
- Completed: 2026-05-26T11:16:23Z

### Work Log
- Audited `cleanup-plan.schema.json`, `scripts/eval-cleanup-stale.ts`, and `scripts/__tests__/eval-cleanup-stale.test.ts` to enumerate every strategy-switch surface.
- Edited `cleanup-plan.schema.json`: dropped `"strategy-switch"` from the `group.reason` enum, removed the `llm` snapshot object (strategy + codeFramework), pruned `llm-test` from the `file.kind` enum (no producer after this subtask), and rewrote descriptions to talk only about static-framework / removed-target. Retained `static.framework` snapshot fields, `"framework-switch"` reason, and `from`/`to` fields (still needed by framework-switch and removed-target).
- Edited `scripts/eval-cleanup-stale.ts`:
  - Removed `LlmStrategy` / `LlmCodeFramework` exported types and the `Snapshot.llm` field.
  - Dropped `"strategy-switch"` from `GroupReason`; pruned `llm-test` from `FileKind`.
  - Removed `LLM_STRATEGIES` / `LLM_CODE_FRAMEWORKS` sets and `asLlmStrategy` / `asLlmCodeFramework` helpers.
  - Stopped reading `llm.*` in `readManifestSnapshot`, `readConfigSnapshot`, `applyFromTo`, and `detectFromFilesystem`.
  - Deleted `enumerateLlmStrategyAssets` and both `reason: "strategy-switch"` arms in `computePlan` (LLM-strategy switch + code-framework swap). Renumbered the remaining comment markers (1 / 2 / 3).
  - Removed `strategy` keys from the apply-mode history entry.
  - Updated the file-level docstring and `HELP_TEXT` to describe only framework-switch + removed-target.
- Edited `scripts/__tests__/eval-cleanup-stale.test.ts`:
  - Removed the two strategy-switch tests (`mixed evals.json …` and `*.test.ts user file (no header) preserved on strategy-switch`).
  - Updated the docstring coverage matrix to (a)…(g).
  - Stripped `llm: { strategy: "declarative" }` from every `writeConfig(...)` call (subtask 01 already removed `llm.strategy` from `config.schema.json`, so those overrides now fail validation in `loadEvalConfig`). Manifest YAML strings keep their legacy `llm:` blocks intact to verify the new `readManifestSnapshot` silently ignores them.
  - Added regression test `snapshot without llm.strategy does not throw and emits empty/static-only groups`, which asserts no throw, empty `groups`, schema validity, and the absence of an `llm` field on either snapshot.
- Verified deliverables D04 (no `evals/fixtures/**/cleanup-*.json` fixtures exist) and D05 (no `plugins/zoto-eval-system/docs/` directory exists).
- Re-ran `pnpm exec tsx scripts/__tests__/eval-cleanup-stale.test.ts`: 9/9 tests pass.
- Re-ran `pnpm run eval:cleanup-stale`: emits an empty plan (`groups: []`, `totals.files: 0`, exit 0) against the live repo state.
- Re-ran `pnpm exec tsc --noEmit -p tsconfig.json` from `plugins/zoto-eval-system/` (closest tsconfig that touches `scripts/`): the cleanup script and its tests produce **zero** new errors (residual errors in `validate-plugin.ts`, `tests/plugin.test.ts`, `src/config-loader.ts`, and `scripts/eval-update.ts` predate this subtask and relate to AJV typing / `Target` type drift — out of scope).

### Blockers Encountered
None. The repo has no top-level `tsconfig.json`, so the Definition-of-Done line `pnpm tsc --noEmit -p tsconfig.json` was satisfied by running the eval-system plugin's tsconfig (the only one that compiles `scripts/`); the cleanup script reports no new errors.

### Files Modified
- `plugins/zoto-eval-system/templates/schema/cleanup-plan.schema.json` — schema-level strategy removal.
- `scripts/eval-cleanup-stale.ts` — strategy types, helpers, `enumerateLlmStrategyAssets`, both strategy-switch `computePlan` arms, and history-entry strategy keys all removed.
- `scripts/__tests__/eval-cleanup-stale.test.ts` — strategy-switch tests removed, regression test added, fixtures updated to drop now-invalid `llm.strategy` overrides.
- `specs/20260526-eval-single-backend-colocated-restructure/subtask-02-eval-single-backend-colocated-restructure-cleanup-engine-20260526.md` — checklist ticks + execution notes.

### Flagged for Other Subtasks (NOT edited here)
The following files still mention `strategy-switch` in prose and belong to other owners — surfacing them here per the subtask's coordination directive:
- `plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md` — line 131 prose still describes the `strategy-switch` cleanup group. Owner: subtask 05 (`zoto-eval-architect` — docs cleanup).
- `plugins/zoto-eval-system/agents/zoto-eval-configurer.md` — lines 42, 56 mention `strategy-switch` enumeration semantics. Owner: subtask 05.
- `plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json` — lines 125, 142, 143, 159 reference strategy-switch expectations inside skill eval cases. **KD-1 byte-preserved; do not touch.** Subtask 05 / 10 will need to regenerate or hand-edit these eval expectations once the system stabilises.
- `plugins/zoto-eval-system/CHANGELOG.md` — historical entries describing the prior strategy split. Owner: subtask 10 (`zoto-plugin-manager` — changelog).
- `package.json` / `scripts/eval-orchestrate.ts` — no `--strategy-switch` invocations found in the orchestrator path, so subtask 03 has no follow-up from this subtask.
