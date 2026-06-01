# Subtask: Test relocation + validate-plugin updates

## Metadata
- **Subtask ID**: 06
- **Feature**: Eval Plugin Self-Contained Scripts Consolidation
- **Assigned Subagent**: zoto-eval-engineer
- **Dependencies**: 02, 03
- **Created**: 20260531

## Objective

Co-locate eval script unit tests with the plugin package. Update `validate-plugin.ts` to reflect deleted `scripts/eval-update.ts` and canonical guard location in `engine/update.ts`.

## Deliverables Checklist
- [ ] Relocate from `scripts/__tests__/` to `plugins/zoto-eval-system/tests/` (or `plugins/zoto-eval-system/scripts/__tests__/`):
  - `eval-orchestrate.test.ts`
  - `eval-stamp-routing.test.ts`
  - `eval-stamp-json-first.test.ts`
  - `eval-update-guards.test.ts`
  - `eval-cleanup-stale.test.ts`
  - `analyser-payload-schema.test.ts`
  - `eval-stamp-jest.selftest.ts`, `eval-stamp-pytest.smoke.ts`, `vitest-backend.selftest.ts` (as applicable)
- [ ] Leave at repo root: tests for monorepo-only scripts (`eval-relocate-migration.test.ts`, etc.)
- [ ] Update all import paths in relocated tests to plugin script locations
- [ ] `validate-plugin.ts` — grep target changed from `scripts/eval-update.ts` to `engine/update.ts` for `_meta?.generated === true`
- [ ] `plugins/zoto-eval-system/tests/plugin.test.ts` — remove or update tests importing deleted `eval-update.ts`; fix `eval-ensure-host` path assertions
- [ ] Grep gate: `rg 'scripts/eval-' evals/test_*.ts evals/_llm/` — retarget any remaining hits to plugin script paths (coordinate with subtask 03; this subtask owns verification)

## Definition of Done
- [ ] Relocated tests pass: `pnpm exec vitest run plugins/zoto-eval-system/tests/<file>` for each moved suite
- [ ] `pnpm --filter @zoto-agents/zoto-eval-system run validate` exits 0
- [ ] No broken imports pointing at deleted root `scripts/eval-*.ts` in plugin test tree

## Implementation Notes

When relocating `eval-update-guards.test.ts`, ensure it exercises `engine/update.ts` guard behaviour, not deleted `scripts/eval-update.ts`.

Update vitest config if tests moved outside default include globs.

## Testing Strategy

Run each relocated test file individually during this subtask. Defer full `pnpm test` to subtask 08.

## Execution Notes

[To be filled by executing agent]

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log

### Blockers Encountered

### Files Modified
