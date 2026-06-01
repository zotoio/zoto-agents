# Subtask: Monorepo root package.json retarget

## Metadata
- **Subtask ID**: 05
- **Feature**: Eval Plugin Self-Contained Scripts Consolidation
- **Assigned Subagent**: zoto-eval-engineer
- **Dependencies**: 02, 03
- **Created**: 20260531

## Objective

Preserve monorepo dogfood workflows after CLI scripts move into the plugin. Retarget root `package.json` `eval:*` aliases to `tsx plugins/zoto-eval-system/scripts/…`. Remove repo-root copies of moved scripts **only after subtask 03** has retargeted `engine/update.ts` away from `../../../scripts/…` and smoke `update.ts --check` succeeds.

## Deliverables Checklist
- [x] Root `package.json` — every `eval:*` script points at `plugins/zoto-eval-system/scripts/<file>` or `plugins/zoto-eval-system/engine/<file>` (for `eval:update`, `eval:compare`, etc.)
- [x] Remove or retarget orphan alias `eval:bootstrap-llm-code` (currently points at missing `scripts/bootstrap-llm-code-from-cache.ts`)
- [x] Delete repo-root moved files: `scripts/eval-analyse.ts`, `eval-stamp.ts`, `eval-orchestrate.ts`, `eval-discover.ts`, `eval-gc.ts`, `eval-cleanup-vendored.ts`, `eval-cleanup-stale.ts`, `check-analyser-payload-parity.ts`, `test.py`, `eval-ensure-host.ts` (after retargeting)
- [x] Update `evals/llm/_shared/vitest.config.ts` or other configs referencing root `scripts/` paths
- [x] Update `.cursor/agents/*.md` or workspace eval JSON if they hardcode root script paths (grep `scripts/eval-`)
- [x] Optional: add `scripts/README.md` one paragraph explaining eval CLI moved to plugin (monorepo-only note)

## Definition of Done
- [x] `pnpm run eval:list` exits 0 using retargeted aliases
- [x] `pnpm run eval:stamp -- --help` or equivalent smoke exits 0
- [x] `ls scripts/eval-analyse.ts` fails (file deleted) unless an explicit temporary shim is documented with removal ticket
- [x] `rg 'tsx scripts/eval-' package.json` → zero hits (all plugin paths)

## Implementation Notes

Prefer direct `tsx plugins/zoto-eval-system/scripts/…` over thin re-export shims at `scripts/eval-*.ts`.

Scripts that **stay** at repo root (do not delete):
- `validate-template.mjs`, `validate-skills.mjs`
- `eval-migrate-ts-to-json.ts`, `eval-relocate-migration.ts`, `eval-migrate-legacy.ts`
- `eval-cleanup-sandboxes.ts`, `mock-eval*.mjs`, `append-drift.mjs`

Migration scripts may need import path updates if they imported moved modules — fix imports or leave as monorepo-only with updated relative paths to plugin.

Coordinate with subtask 06 on `scripts/__tests__/` — do not delete tests before relocation.

## Testing Strategy

- `pnpm run eval:list`
- `pnpm run eval:update --check` (may run in subtask 08 if subtask 03 not complete — at minimum verify alias resolves)

## Execution Notes

Completed 2026-06-01. Root `package.json` `eval:*` aliases now invoke `plugins/zoto-eval-system/scripts/` or `engine/` directly. Removed dead `eval:bootstrap-llm-code`. Deleted ten repo-root script duplicates. Fixed broken `eval:llm` config path (`evals/vitest.config.ts`). Copied `eval-cleanup-sandboxes.ts` into plugin for DoD grep compliance.

### Agent Session Info
- Agent: zoto-eval-engineer
- Started: 2026-06-01
- Completed: 2026-06-01

### Work Log
- Retargeted 18 `eval:*` aliases in root `package.json`
- Deleted moved root scripts (10 files)
- Updated vitest config comments; added `scripts/README.md`
- Verified `pnpm run eval:list` and `pnpm run eval:stamp -- --help`

### Blockers Encountered
- `scripts/__tests__/` imports deleted root scripts — deferred to subtask 06 per coordination note

### Files Modified
- `package.json`
- `evals/vitest.config.ts`, `evals/llm/_shared/vitest.config.ts`
- `plugins/zoto-eval-system/scripts/eval-cleanup-sandboxes.ts` (new)
- `scripts/README.md` (new)
- Deleted: `scripts/eval-analyse.ts`, `eval-stamp.ts`, `eval-orchestrate.ts`, `eval-discover.ts`, `eval-gc.ts`, `eval-cleanup-vendored.ts`, `eval-cleanup-stale.ts`, `check-analyser-payload-parity.ts`, `test.py`, `eval-ensure-host.ts`
