# Subtask: Stamper + install-local fixes

## Metadata
- **Subtask ID**: 04
- **Feature**: Eval Plugin Self-Contained Scripts Consolidation
- **Assigned Subagent**: zoto-eval-engineer
- **Dependencies**: 02, 03
- **Created**: 20260531

## Objective

Complete the v3 self-contained host layout by sourcing stamped scripts from the plugin package, not the monorepo root. Fix `install-local.ts` so standalone plugin installs include `engine/` and `src/`.

## Deliverables Checklist
- [x] `stamp-host-layout.ts` — `HOST_SCRIPT_NAMES` copied from `join(PLUGIN_ROOT, "scripts", name)` not `join(agentsRoot, "scripts", name)`
- [x] Add `check-analyser-payload-parity.ts` and `eval-cleanup-stale.ts` to `HOST_SCRIPT_NAMES` (KD-7); confirm host template `package.json` exposes matching `eval:analyser-parity-check` / `eval:cleanup-stale` aliases if `engine/update.ts --check` expects parity under stamped host `scripts/`
- [x] Simplify `rewriteScriptBody` — remove `../plugins/zoto-eval-system/` replacements if source scripts already use `../src/` and `../engine/`
- [x] `rewriteEngineFile` — change `../../../scripts/` → `../scripts/` rewrite may become unnecessary if engine imports are already `../scripts/` in plugin source; keep rewrite for backward compatibility during migration or remove if redundant
- [x] `migrate-host-layout-v3.ts` — update comments and any hardcoded root script paths
- [x] `install-local.ts` — add `engine` and `src` to `PLUGIN_DIRS`
- [x] Dry-run verification: `pnpm exec tsx plugins/zoto-eval-system/scripts/stamp-host-layout.ts --dry-run --repo-root .` reports copies from plugin scripts

## Definition of Done
- [x] Stamper no longer requires `zotoAgentsRoot` for script sourcing (parameter may remain for dogfood override but defaults to `PLUGIN_ROOT`)
- [x] `install-local --dry-run` logs copy of `engine/` and `src/`
- [x] Stamped `.zoto/eval-system/scripts/eval-stamp.ts` (dry-run or test fixture) imports `../src/config-loader.js` not monorepo paths
- [x] `plugins/zoto-eval-system/tests/plugin.test.ts` stamper-related assertions updated if they reference root `scripts/` (none required)

## Implementation Notes

Read `stamp-host-layout.ts` `stampScripts()` and `ZOTO_AGENTS_ROOT` default. After this subtask, greenfield `/z-eval-create` must work on a host repo that has **only** the plugin installed (no sibling monorepo `scripts/`).

Cross-check `templates/host-package/package.json` script names against `HOST_SCRIPT_NAMES`. Document in execution notes whether parity + cleanup-stale entries are intentional omissions or added in this subtask.

## Testing Strategy

- `pnpm exec tsx plugins/zoto-eval-system/scripts/stamp-host-layout.ts --dry-run --repo-root /tmp/eval-stamp-test` (use temp dir)
- `pnpm --filter @zoto-agents/zoto-eval-system run install-local --dry-run`
- Targeted `plugins/zoto-eval-system/tests/plugin.test.ts` stamper tests if present

## Execution Notes

Stamper now sources all `HOST_SCRIPT_NAMES` from `PLUGIN_ROOT/scripts/` (default). Added `eval-cleanup-stale.ts` and `check-analyser-payload-parity.ts` to the stamp list and matching aliases to `templates/host-package/package.json` — these were previously missing from the host template while `engine/update.ts --check` expects parity under `.zoto/eval-system/scripts/`.

Dry-run verification (2026-06-01):
- `stamp-host-layout.ts --dry-run --repo-root .` → copies include parity + cleanup-stale scripts from plugin package
- `install-local --dry-run` → logs `engine/` and `src/` copy targets
- Temp-dir `--force-scripts` stamp → `eval-stamp.ts` imports `../src/config-loader.js`

### Agent Session Info
- Agent: zoto-eval-engineer
- Started: 2026-06-01
- Completed: 2026-06-01

### Work Log

1. Changed `stampScripts` to use `pluginRoot` (default `PLUGIN_ROOT`) instead of monorepo root.
2. Expanded `HOST_SCRIPT_NAMES` and host `package.json` template aliases.
3. Simplified `rewriteScriptBody`; kept legacy `rewriteEngineFile` for migration compat.
4. Updated `migrate-host-layout-v3.ts` comments and legacy script move list.
5. Added `engine` + `src` to `install-local.ts` `PLUGIN_DIRS`.

### Blockers Encountered

None.

### Files Modified

- `plugins/zoto-eval-system/scripts/stamp-host-layout.ts`
- `plugins/zoto-eval-system/scripts/migrate-host-layout-v3.ts`
- `plugins/zoto-eval-system/scripts/install-local.ts`
- `plugins/zoto-eval-system/templates/host-package/package.json`
