# Subtask: Plugin templates, eval-stamp, eval-update alignment

## Metadata
- **Subtask ID**: 05
- **Feature**: Refactor LLM eval approach
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 04
- **Created**: 20260508

## Objective

Update **`plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`** (and any mirrored `agent-sdk` or setup templates) so newly stamped files use the **shared types + harness** from subtasks 03–04. Align `scripts/eval-stamp.ts` substitution tokens if the template shape changes. Ensure `plugins/zoto-eval-system/scripts/eval-update.ts` and host `evals/_llm/update.ts` expectations remain consistent with `// _meta.generated: true` and user-case guards.

## Deliverables Checklist
- [x] Template emits: imports, `CASES` injection (`{{CASES_JSON}}`), `TARGET_ID` / model placeholders, **single** call into shared runner (no inlined `CaseDefinition`, no duplicate loop)
- [x] `eval-stamp.ts` updated if placeholders or paths change; smoke **stamp dry-run** or unit test if available
- [x] Plugin tests (`plugins/zoto-eval-system/tests/plugin.test.ts` or equivalent) updated if they assert on template substring literals
- [x] Regenerate or verify **bootstrap** path `pnpm run eval:bootstrap-llm-code` / caches if documented in README

## Definition of Done
- [x] Running stamp/update in `--check` mode does not produce unexpected churn on unrelated primitives (spot-check)
- [x] CHANGELOG entry under `plugins/zoto-eval-system/CHANGELOG.md` (**Unreleased**) describing template/harness change

## Implementation Notes
- Coordinate with subtask 06: full regen of all `evals/llm/test_*.test.ts` may happen there or here—pick one subtask to own **bulk regen** to avoid merge pain.
- Respect `eval-cleanup-stale` / analyser cache contracts under `.zoto/eval-system/cache/`.

## Testing Strategy
- `pnpm --filter zoto-eval-system test` or root `pnpm test` **for affected packages only** when practical.

## Execution Notes

### Agent Session Info
- Agent: crux-software-engineer
- Started: 2026-05-08T10:50:00Z
- Completed: 2026-05-08T10:55:00Z

### Work Log

1. Read all 7 key files to understand current template shape, proof migration target, stamper logic, plugin tests, and update contracts.
2. Rewrote `per-primitive-test.ts.tmpl` from ~240 lines (inlined `CaseDefinition` interface + full runner loop + `parseJudgeScore`) to ~30 lines (imports `CodeStrategyCaseDefinition` from `_shared/code-strategy-case.js`, calls `defineLlmCodeEval()` from `_shared/run-code-strategy-suite.js`).
3. Verified `eval-stamp.ts#renderLlmCodePerPrimitiveTest` needs **no changes** — all template placeholders (`{{FRAMEWORK_IMPORTS}}`, `{{CASES_JSON}}`, `{{TARGET_ID}}`, `{{MODEL_ID}}`, `{{JUDGE_MODEL}}`, `{{CASE_TIMEOUT_MS}}`, `{{PRIMITIVE_KIND}}`, `{{PRIMITIVE_NAME}}`) are still substituted by the stamper. Extra placeholders (`{{SOURCE_PATH}}`, etc.) that exist in the stamper but not in the new template are harmless no-ops.
4. Confirmed plugin tests (`plugin.test.ts`, 62 tests) have **no assertions on template content** — all pass unchanged.
5. Verified `bootstrap-llm-code-from-cache.ts` calls `stampLlmCodeStrategy` which reads the template at runtime — compatible with the new shape.
6. Ran `eval:update --check`: 4 pre-existing critical deltas (skill content drift), none introduced by this change.
7. Added CHANGELOG entry under `[Unreleased]`.

### Blockers Encountered

None.

### Coordination Notes for Subtask 06

- **Subtask 06 should own bulk regen** of all existing `evals/llm/test_*.test.ts` files to convert them from the old 240-line inlined pattern to the new thin pattern. Running `pnpm run eval:bootstrap-llm-code` from cache will re-stamp all targets using the updated template.
- The old inlined `parseJudgeScore` function is now part of the central harness (`run-code-strategy-suite.ts`). Subtask 06 can safely delete the inlined copies from existing test files.
- The `dispatchGraders` function in the harness uses `process.cwd()` for the judge agent cwd — judge noted this is worth aligning to `sandbox.rootDir` in subtask 06.

### Files Modified

- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` — refactored to thin-file pattern
- `plugins/zoto-eval-system/CHANGELOG.md` — added Unreleased entry
