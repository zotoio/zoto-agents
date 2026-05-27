# Subtask: Verify `evals/llm/_shared/` Is the Single SoT

## Metadata
- **Subtask ID**: 03
- **Feature**: Rationalise Eval System
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 01
- **Created**: 20260516

## Objective

Lock in `evals/llm/_shared/` as the single source of truth for code-strategy helpers. Verify all 43 stamped `evals/llm/test_*.test.ts` files use `defineLlmCodeEval` + `CodeStrategyCaseDefinition`, and fix the small number of stale path references identified in subtask 01's audit.

This subtask is mostly verification with two surgical edits. **No template re-stamping** — emitted file headers refresh during the next routine `/z-eval-update` cycle.

## Deliverables Checklist

- [x] Confirm via `Grep` that all 43 `evals/llm/test_*.test.ts` files contain `defineLlmCodeEval` exactly once (matches the count from subtask 01's audit).
- [x] Confirm via `Grep` that no `evals/llm/test_*.test.ts` declares `interface CaseDefinition` inline. Any survivor is reported as a Blocker.
- [x] Confirm via `Grep` that no `evals/llm/test_*.test.ts` imports from `../../_llm/*` directly. Allowed imports are `./_shared/*` and `#eval-engine/*`.
- [x] Confirm `evals/llm/_shared/` contains exactly the five helpers from spec Decision 3: `code-strategy-case.ts`, `run-code-strategy-suite.ts`, `sandbox-helpers.ts`, `setup.ts`, `zoto-llm-reporter.ts`. Anything else is reported as a Blocker.
- [x] Confirm `evals/llm/vitest.config.ts` registers the `#eval-engine` alias correctly.
- [x] Update `scripts/eval-analyse.ts` so its comment near line ~1011 references `plugins/zoto-eval-system/engine/analyser-payload.ts` instead of `evals/_llm/analyser-payload.ts`. Cosmetic edit — no functional change.
- [x] Update `evals/llm/test_skill_zoto-configure-evals.test.ts`'s assertion text near line ~24 from `evals/_llm/manifest-snapshot.ts` to `plugins/zoto-eval-system/engine/manifest-snapshot.ts` (or, more accurately, `#eval-engine/manifest-snapshot.js`). The file carries the `// _meta.generated: true` header — flag this as a generated-file edit and follow the project's convention (edit the JSON case data via `plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json` or the corresponding `evals.json` source, then re-stamp the test file). If re-stamping is the only safe path, run `pnpm run eval:stamp` for that single primitive and verify the diff is limited to the assertion text.
- [x] Re-grep after the two edits to confirm zero remaining stale references in non-doc files (specs and cached analyser payloads are out of scope).
- [x] Run `ReadLints` on touched files; resolve any introduced errors.

## Definition of Done

- [x] Grep counts confirm: 43 `defineLlmCodeEval` matches, 0 inline `CaseDefinition` declarations, 0 direct `../../_llm/*` imports from test files.
- [x] `evals/llm/_shared/` directory listing matches Decision 3 exactly.
- [x] `scripts/eval-analyse.ts` and `evals/llm/test_skill_zoto-configure-evals.test.ts` no longer reference moved engine paths in their non-doc body.
- [x] No new linter errors in modified files.
- [x] Work Log records the exact grep commands and counts as evidence.

## Implementation Notes

- The 43-test count is firm: 43 stamped tests across commands, agents, skills, and hooks. Counts deviating by more than the documented filter (`.zoto/eval-system/config.yml` `ignore` list) are a Blocker.
- The `// _meta.generated: true` first-line marker on `evals/llm/test_*.test.ts` files means they should normally be regenerated via `pnpm run eval:stamp`. For the single assertion-text fix, prefer:
  1. Edit `plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json` (the case data source).
  2. Run `pnpm run eval:stamp -- --target skill:zoto-configure-evals` (or the equivalent narrowing flag — confirm via `pnpm run eval:stamp -- --help`).
  3. Verify the diff on `evals/llm/test_skill_zoto-configure-evals.test.ts` is limited to the assertion text and the ordinary header comment.
  
  If the stamp path proves intractable in this subtask, **edit the test file in place** and document the deviation in the Work Log so subtask 06 can re-verify after a future regeneration.
- The cached analyser JSON file at `.zoto/eval-system/cache/analyser/289d8c097dacba12f18e720e94013fcbe524a9d3f93a2d8262c50a589eb6b7a4.json` carries the same stale path string, but the cache invalidates on next analyser run. Do **not** edit cached files manually.
- Spec docs and existing memory files that mention `evals/_llm/*` are historical and out of scope.
- If Grep finds any test file in `evals/llm/` outside the 43-target list, surface it as a Blocker rather than deciding its fate yourself.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution.

Targeted verification:
- `Grep` runs as listed in Deliverables.
- If `pnpm run eval:stamp` is invoked, run with the narrowest scope possible (single target) and inspect the diff before committing.
- Defer `pnpm run eval:llm:code` to subtask 06.

## Execution Notes

### Agent Session Info
- Agent: crux-software-engineer (composer-2.5-fast)
- Started: 2026-05-16T12:38:00Z
- Completed: 2026-05-16T12:42:00Z

### Work Log

**D01 — defineLlmCodeEval count**
- `Grep pattern=defineLlmCodeEval glob=evals/llm/test_*.test.ts output_mode=count`
- Result: 43 files, each with 2 occurrences (import + call). Matches audit expectation.

**D02 — inline CaseDefinition**
- `Grep pattern="interface CaseDefinition" glob=evals/llm/test_*.test.ts output_mode=count`
- Result: 0 matches.

**D03 — direct ../../_llm/* imports**
- `Grep pattern="from ['\"]\.\.\/\.\.\/\_llm\/" glob=evals/llm/test_*.test.ts`
- Result: 0 matches. All imports use `./_shared/*` or `#eval-engine/*`.

**D04 — _shared/ contents**
- `Glob evals/llm/_shared/*` returned exactly 5 files: `code-strategy-case.ts`, `run-code-strategy-suite.ts`, `sandbox-helpers.ts`, `setup.ts`, `zoto-llm-reporter.ts`. Matches Decision 3.

**D05 — vitest.config.ts alias**
- Read `evals/llm/vitest.config.ts`: line 15 maps `#eval-engine` to `resolve(__dirname, "../../plugins/zoto-eval-system/engine")`. Correct.

**D06 — scripts/eval-analyse.ts comment fix**
- Line 1011: changed `evals/_llm/analyser-payload.ts` → `plugins/zoto-eval-system/engine/analyser-payload.ts`.

**D07 — test_skill_zoto-configure-evals.test.ts assertion fix**
- Line 24: changed `evals/_llm/manifest-snapshot.ts` → `#eval-engine/manifest-snapshot.js`.
- Also edited the evals.json source at `plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json` (same assertion text).
- **Re-stamp not used**: `pnpm run eval:stamp` CLI has no targeted mode for LLM code-strategy test files. Used in-place edit per the subtask fallback. Next `/z-eval-update` cycle will re-stamp the file with the corrected evals.json data.

**Bonus fix — test_command_z-eval-configure.test.ts assertion (F-08 second file)**
- Line 60: changed `evals/_llm/manifest-snapshot.ts` → `#eval-engine/manifest-snapshot.js`.
- This was the second of the two test files in the F-08 audit finding. No evals.json source exists for command-level assertions (generated from analyser cache). Edited in place; cached analyser payload is out of scope per subtask rules.

**D08 — re-grep after fixes**
- `Grep pattern="evals/_llm/manifest-snapshot" glob=evals/llm/test_*.test.ts`: 0 matches.
- `Grep pattern="evals/_llm/manifest-snapshot" glob=scripts/*.ts`: 0 matches.
- `Grep pattern="evals/_llm/analyser-payload" glob=scripts/*.ts`: 0 matches.

**D09 — ReadLints**
- `ReadLints` on all 4 touched files: 0 new errors. 5 pre-existing TS errors in `scripts/eval-analyse.ts` (lines 553, 947) — unrelated to the comment edit.

### Blockers Encountered
None.

### Files Modified
1. `scripts/eval-analyse.ts` — comment fix line 1011 (cosmetic)
2. `evals/llm/test_skill_zoto-configure-evals.test.ts` — assertion text fix line 24 (in-place edit of generated file)
3. `plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json` — assertion text fix (source for the above test)
4. `evals/llm/test_command_z-eval-configure.test.ts` — assertion text fix line 60 (in-place edit of generated file, bonus F-08 fix)
