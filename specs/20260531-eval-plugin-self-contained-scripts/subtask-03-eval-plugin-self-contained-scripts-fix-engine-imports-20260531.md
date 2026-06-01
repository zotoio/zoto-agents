# Subtask: Fix engine and internal plugin imports

## Metadata
- **Subtask ID**: 03
- **Feature**: Eval Plugin Self-Contained Scripts Consolidation
- **Assigned Subagent**: zoto-eval-engineer
- **Dependencies**: 02
- **Created**: 20260531

## Objective

Eliminate all repo-root script imports from the plugin runtime tree. Primary target: `plugins/zoto-eval-system/engine/update.ts` currently imports `../../../scripts/eval-analyse.ts` and `../../../scripts/eval-stamp.ts`. Retarget to `../scripts/eval-analyse.ts` and `../scripts/eval-stamp.ts` (or shared re-exports if circularity requires a thin `engine/` barrel).

Also fix any remaining cross-boundary imports in `engine/sdk-bridge.ts`, `engine/analyser-payload.ts` comments-only references, and `evals/llm/_shared/*` dogfood imports.

## Deliverables Checklist
- [x] `engine/update.ts` imports analyser + stamper from `../scripts/` not `../../../scripts/`
- [x] `engine/update.ts` parity check path references `../scripts/check-analyser-payload-parity.ts` (or equivalent relative path)
- [x] Grep clean: `rg '../../../scripts' plugins/zoto-eval-system/` → zero hits in `.ts` files
- [x] Update `evals/llm/_shared/zoto-create-plugin-suite.ts` and `.test.ts` imports to plugin script paths
- [x] Update any `evals/_llm/*.ts` smoke files importing root scripts
- [x] Grep and retarget pytest eval files: `evals/test_*.ts` and any remaining `evals/**/*.ts` importing repo-root `scripts/eval-*` (dozens of files; capture grep count in execution notes)
- [x] Resolve circular import risk between `engine/update.ts` and moved scripts (extract shared types to `engine/` or `src/` if needed — minimal extraction only)

## Definition of Done
- [x] `npx tsc --noEmit -p plugins/zoto-eval-system/tsconfig.json` passes for `engine/update.ts` and moved script importers (or only pre-existing unrelated errors documented)
- [x] `pnpm exec tsx plugins/zoto-eval-system/engine/update.ts --check` smoke exits 0 or expected check exit code
- [x] No runtime import from repo-root `scripts/` under `plugins/zoto-eval-system/`

## Implementation Notes

If `eval-analyse.ts` imports from `engine/analyser-payload.ts` while `update.ts` imports from `eval-analyse.ts`, verify Node/tsx resolves without circular init failures. Prefer moving **types only** to `engine/analyser-payload.ts` (already canonical) if a cycle appears.

Check `plugins/zoto-eval-system/tests/plugin.test.ts` for imports of `../scripts/eval-update.js` — retarget to `../engine/update.js` or remove obsolete tests for deleted `eval-update.ts`.

## Testing Strategy

- `pnpm exec vitest run plugins/zoto-eval-system/tests/engine-runner-update-spec04.test.ts` (if exists)
- `pnpm exec tsx plugins/zoto-eval-system/engine/update.ts --check`
- Targeted plugin tests only — no full `pnpm test` until subtask 08

## Execution Notes

Subtask completed 2026-06-01. See `status/subtask-03-eval-plugin-self-contained-scripts-fix-engine-imports-20260531.status.md`.

### Agent Session Info
- Agent: zoto-eval-engineer
- Started: 2026-06-01
- Completed: 2026-06-01

### Work Log

- Retargeted `engine/update.ts` script imports from repo-root `../../../scripts/` to plugin-local `../scripts/`.
- Parity gate now resolves `check-analyser-payload-parity.ts` relative to `engine/` via `import.meta.url`.
- Retargeted dogfood imports in `evals/llm/_shared/` and `evals/_llm/` to `plugins/zoto-eval-system/scripts/`.
- Restored `discover` / `manifestFor` exports on `eval-discover.ts` for `plugin.test.ts`.
- Restored programmatic `runUpdate` export on `engine/update.ts` (legacy `eval-update.ts` API).
- Verified no circular imports between `update.ts` and moved scripts.

### Blockers Encountered

None.

### Files Modified

Listed in status markdown.
