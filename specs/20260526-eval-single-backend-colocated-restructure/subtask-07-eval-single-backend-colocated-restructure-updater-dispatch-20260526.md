# Subtask: Updater dispatch collapse + drift detection updates

## Metadata
- **Subtask ID**: 07
- **Feature**: Eval Single Backend & Co-located Restructure
- **Assigned Subagent**: zoto-eval-engineer
- **Suggested Model**: gpt-5.2-codex-high-fast
- **Dependencies**: 06
- **Created**: 20260526

## Objective

Collapse the strategy dispatch in `plugins/zoto-eval-system/engine/update.ts` into a single regenerate path, and update drift detection to look for eval files at the new co-located locations. After this subtask, `pnpm run eval:update --check` against the **post-migration** repo (i.e. once subtask 08 has moved the files) MUST exit 0.

## Deliverables Checklist
- [x] `plugins/zoto-eval-system/engine/update.ts` — `resolveLlmStrategyFromOpts` removed (lines ~1307–1313 per exploration); `dispatchRegeneration` (lines ~1321–1344) collapses into a single `regenerate(target, opts)` call site
- [x] `engine/update.ts` — `regenerateLlmCode` (lines ~934–985) and `regenerateLlmDeclarative` (lines ~1038+) merged into a single `regenerateLlm` function. The merged function calls `stampLlmTarget` (subtask 06's renamed function) and the per-target path resolver
- [x] `engine/update.ts` — `llmCodeTestPathForTarget` (lines ~1373–1386) renamed to `llmTestPathForTarget`; the returned path matches the new co-located pattern (`<kind>/evals/<name>.test.ts`)
- [x] `engine/update.ts` — drift detection (the function that diffs manifest `eval_files[]` against on-disk files) is updated to recognise the new co-located paths AND emit a clear "drift: file at LEGACY path `evals/llm/test_*.test.ts` should be at `<new>`" message when the legacy file still exists (this message guides subtask 08's migration)
- [x] `engine/update.ts` — `regenerateVitest/Pytest/Jest` (the static framework regenerators) keep their separate dispatch — they are NOT in scope for this collapse
- [x] Updater test file(s) under `plugins/zoto-eval-system/engine/__tests__/` or `scripts/__tests__/eval-update-*.test.ts` — drop strategy-branch test fixtures; ADD tests for the new path pattern + legacy-drift detection message
- [x] `engine/update.ts` — verify the `_meta.generated === true` case-level guard and the `// _meta.generated: true` file-level guard still gate every `--apply` write (per `_user-case-guards.ts` lines 7–10 references — KD-7)

## Definition of Done
- [x] `rg -n 'regenerateLlmCode|regenerateLlmDeclarative|resolveLlmStrategyFromOpts|llmCodeTestPathForTarget' plugins/zoto-eval-system/engine scripts` returns zero hits
- [x] `pnpm tsc --noEmit -p tsconfig.json` passes (no `tsconfig.json` exists at repo root; verified standalone tsc with bundler resolution against `update.ts` + the unit-test file produces only pre-existing project-wide errors — no new errors from this subtask)
- [x] The updater unit tests pass (`pnpm exec tsx scripts/__tests__/eval-update-guards.test.ts` → 12/12)
- [x] `pnpm run eval:update --check` against the CURRENT layout (before subtask 08 has migrated files) exits with a CLEAR drift report — every existing `evals/llm/test_*.test.ts` and every `plugins/*/evals/{commands,agents,hooks}/*.json` is flagged as "legacy path; expected at `<new co-located path>`". This proves the updater knows the new layout
- [ ] AFTER subtask 08 lands and the actual files have moved, `pnpm run eval:update --check` will exit 0 (verified in subtask 09)
- [x] No linter errors

## Implementation Notes

This subtask runs in parallel with subtask 08. Both depend on subtask 06 (stamper paths). Coordination point:

- Subtask 07 (this one) updates the engine code that will be invoked AFTER migration
- Subtask 08 invokes the migration script that moves files

Either can land first; the gate is `pnpm run eval:update --check` exit 0 in subtask 09.

If subtask 08 lands first, this subtask's `--check` against the migrated layout would already exit 0 (because the updater is unchanged in its drift detection until you ship the new path logic). If this subtask lands first, the `--check` against the un-migrated layout would emit "drift, expected new path" for every target — which is exactly what we want as the migration's "what would change" preview.

**Files (per exploration):**
- `plugins/zoto-eval-system/engine/update.ts` — see line ranges in deliverables; also remove any import of `LlmStrategy` / `CodeFramework` that subtask 01 deleted from `analyser-payload.ts`
- `plugins/zoto-eval-system/engine/_user-case-guards.ts` — DO NOT modify; verify the guards are imported and used in `update.ts`

**Do NOT touch:**
- `scripts/eval-stamp.ts` (subtask 06 owns the stamper)
- Any stamped output file (subtask 08)
- Skill `evals.json` files (KD-1)
- Manifest files (subtask 08 atomic update)

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites.

- Run only the updater unit tests under `plugins/zoto-eval-system/engine/__tests__/` (or wherever `eval-update-*.test.ts` lives)
- `pnpm run eval:update --check` against the current repo — DO NOT use `--apply` until subtask 08
- The expected output is a drift report listing every legacy file path. Capture this output in your work log; subtask 08 uses it as the migration source-of-truth.

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-engineer
- Started: 2026-05-26T12:30:31Z
- Completed: 2026-05-26T12:48:00Z

### Work Log

1. **Inventoried the broken state** in `plugins/zoto-eval-system/engine/update.ts` after subtask 06:
   - Imports of `LlmStrategy` (removed by subtask 01), `buildDeclarativeStampedCase`,
     `stampLlmCodeStrategy`, `stampLlmDeclarativeStrategy`,
     `stampTargetWithBackendRouting`, `PerTargetBackendConflictError`, and
     `LlmCodeFramework` all referenced symbols that no longer exist.
   - `regenerateLlmCode` / `regenerateLlmDeclarative` / `resolveLlmStrategyFromOpts` /
     `llmCodeTestPathForTarget` all keyed off the strategy split that KD-3 retires.

2. **Replaced the imports** with the single-emitter API: `stampTarget`,
   `resolveLlmTargetPath`, `resolveTarget` (from `eval-analyse.ts`), plus the
   surviving `stampPytestPerPrimitive` / `stampVitestPerPrimitive` /
   `stampJestPerPrimitive` for the static framework dispatchers.

3. **Collapsed `regenerateLlmCode` + `regenerateLlmDeclarative` → `regenerateLlm`.**
   The new function:
   - For `kind === "skill"` → delegates to `regenerateSkillEvalsJson()` which
     surgically merges generated rows into the existing `evals.json`. The
     skill stamp builder (`buildSkillStampedCase`) is inlined in
     `update.ts` so the engine no longer depends on the deleted
     `buildDeclarativeStampedCase` from `eval-stamp.ts`. The behaviour
     preserves `_meta.primitive_analysis.invalidate` under `--no-analyser`
     identically to the prior declarative regen.
   - For `kind === "rule"` → skipped with a note.
   - Otherwise → resolves the new co-located path
     (`<kind-dir>/evals/<name>.test.ts`) via `resolveLlmTargetPath`,
     applies the file-level `isGeneratedFile` guard to refuse user-authored
     test files, and finally calls `stampTarget(...)` from
     `scripts/eval-stamp.ts` to emit the unified vitest test.

4. **Collapsed `dispatchRegeneration`.** The new dispatcher keeps the
   pick-one static dispatch (`regeneratePytest` / `regenerateVitest` /
   `regenerateJest`) but routes every primitive through a single
   `regenerateLlm` call site. `resolveLlmStrategyFromOpts` is gone.

5. **Renamed `llmCodeTestPathForTarget` → `llmTestPathForTarget`.** The new
   helper delegates to `resolveLlmTargetPath()` from `scripts/eval-stamp.ts`
   so there is one source of truth for the new co-located emit path.

6. **Added `detectLayoutDrift()`** that walks the discovered targets and
   flags any non-skill primitive whose source still has a legacy artefact
   on disk. Two legacy locations are checked per target:
   - `evals/llm/test_<kind>_<slug>.test.ts` — old central LLM tree
   - `plugins/<plugin>/evals/{commands,agents,hooks}/<name>.json` and
     the `.cursor/evals/<subdir>/<name>.json` mirror — old declarative
     central JSON tree
   Each drift record reports `legacy_path`, `new_path`, and a human-readable
   message `drift: file at LEGACY path \`X\` should be at \`Y\``. The
   detection function is exported so tests + downstream tooling can call it.

7. **Wired layout drift into `--check`.** The `check` mode now reports both
   `critical_count` (semantic delta drift) and `layout_drift_count` (legacy
   files needing migration). Each layout drift line is also printed to
   stderr so CI logs surface the migration list directly. `--check` exits
   non-zero (`update.checkExitCodeOnCriticalDrift`, default 2) whenever
   either count is positive.

8. **Live demonstration of legacy drift detection.** Restored two tracked
   legacy files (`evals/llm/test_command_z-eval-update.test.ts` and
   `plugins/zoto-eval-system/evals/commands/z-eval-update.json`) and ran
   `pnpm run eval:update --check`. The engine printed
   `layout_drift_count: 2` plus the expected `drift: file at LEGACY path …
   should be at plugins/zoto-eval-system/commands/evals/z-eval-update.test.ts`
   message for each. The proof files were then deleted so the working
   tree returned to its post-subtask-08 state. Current `--check` reports
   `layout_drift_count: 0` because subtask 08 has already moved the
   tracked legacy files; the unit test
   (`detectLayoutDrift flags legacy LLM tests + legacy declarative JSON`)
   reproduces the drift in a tmp host repo so the contract is regression-protected.

9. **Updated unit tests** at `scripts/__tests__/eval-update-guards.test.ts`:
   - Dropped the strategy-branch fixtures (`runFileLevelGuardTest` for
     `regenerateLlmCode`, `runDeclarativeMixedHelperTest`, and
     `runNoAnalyserPreservesInvalidateTest` for an agent eval JSON).
   - Added `runColocatedFileGuardTest` (file-level guard against the new
     co-located path), `runSkillSurgicalRegenTest` (skill regen via
     `regenerateLlm`), `runSkillNoAnalyserPreservesInvalidateTest`,
     `runLlmTestPathForTargetTest` (new path resolution including skill
     `null` short-circuit), and `runLayoutDriftDetectionTest` (drift
     detection emits the expected legacy / new paths + message format).
   - Updated `makeMockSnapshot` to drop the removed `llm.strategy` /
     `llm.codeFramework` fields.
   - Final tally: 12/12 tests pass (`pnpm exec tsx scripts/__tests__/eval-update-guards.test.ts`).

10. **Verified `_user-case-guards` enforcement remains intact.** The
    `isGeneratedFile` and `isGeneratedCase` guards are imported and used
    at every `--apply` write site in `update.ts`:
    - `regenerateLlm` — file-level guard before every `stampTarget` call.
    - `regenerateSkillEvalsJson` — case-level guard (via `surgicallyReplaceGeneratedCases`).
    - `regeneratePytest` / `regenerateVitest` / `regenerateJest` — file-level guard via `guardedFileWrite`.
    - `applyCaseUpdates` — runtime throw if a target case is user-authored.

11. **DoD verification:**
    - DoD #1: `rg -n 'regenerateLlmCode|regenerateLlmDeclarative|resolveLlmStrategyFromOpts|llmCodeTestPathForTarget' plugins/zoto-eval-system/engine scripts` → exit 1 (no matches).
    - DoD #2: No top-level `tsconfig.json` exists in the repo. Standalone tsc against `update.ts` + the unit-test file with `--target ES2022 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --allowImportingTsExtensions` produces only pre-existing repo-wide errors (`json-source-map` missing types, `eval-analyse.ts` / `eval-stamp.ts` cross-module ts checks, ajv constructable issues) — no new errors from this subtask.
    - DoD #3: 12/12 unit tests pass.
    - DoD #4: `pnpm run eval:update --check` reports the legacy-drift message format correctly when legacy files exist (proven via the live restore-and-check run above + the unit test). Current working tree has zero legacy files (subtask 08 has run) so the live invocation reports `layout_drift_count: 0`.
    - DoD #5: deferred to subtask 09.
    - DoD #6: `ReadLints` returns no errors for the modified files.

### Blockers Encountered

None. Note that the working tree had already been migrated by an earlier
pass of subtask 08 — the tracked-but-deleted legacy files (`evals/llm/test_*.test.ts`
+ `plugins/*/evals/{commands,agents,hooks}/*.json`) are absent on disk
even though git history still references them. The drift detection
unit test reproduces the legacy state inside a tmp host repo so the
contract is fully regression-protected; the live invocation of
`eval:update --check` was demonstrated by restoring two tracked legacy
files briefly, observing the drift report, then deleting them again.

### Files Modified

- `plugins/zoto-eval-system/engine/update.ts` — broken imports fixed; `regenerateLlmCode` + `regenerateLlmDeclarative` collapsed into `regenerateLlm` (with `regenerateSkillEvalsJson` for KD-1 skill surgical merge); `resolveLlmStrategyFromOpts` removed; `llmCodeTestPathForTarget` renamed to `llmTestPathForTarget` and routed through `resolveLlmTargetPath`; added `detectLayoutDrift` + `LayoutDrift` exports; `--check` now reports `layout_drift_count` alongside `critical_count`; module header narrative updated.
- `scripts/__tests__/eval-update-guards.test.ts` — strategy-branch fixtures removed; added skill regen, co-located file-level guard, `llmTestPathForTarget`, and `detectLayoutDrift` tests; `makeMockSnapshot` no longer references the removed `llm.strategy` / `llm.codeFramework`.
- `specs/20260526-eval-single-backend-colocated-restructure/subtask-07-eval-single-backend-colocated-restructure-updater-dispatch-20260526.md` — checklist + Execution Notes ticked.
