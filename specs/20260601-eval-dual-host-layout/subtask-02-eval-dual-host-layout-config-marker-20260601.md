# Subtask: Config Marker (hostLayout)

## Metadata
- **Subtask ID**: 02
- **Feature**: eval-dual-host-layout
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260601

## Objective

Add a `hostLayout` field to the eval-system config schema and loader so that scripts and commands can distinguish between lean (plugin-dependent) and ejected (self-contained) mode without filesystem heuristics alone.

## Deliverables Checklist
- [x] Add `hostLayout` enum (`"plugin"` | `"ejected"`) to `templates/schema/config.schema.json` with default `"plugin"`
- [x] Add `hostLayout` field to `EvalSystemConfig` type in `plugins/zoto-eval-system/src/config-loader.ts`
- [x] Update `templates/config.json` baseline with `hostLayout: "plugin"` default
- [x] Update `templates/init-config.yml` template with commented `# hostLayout: plugin`
- [x] Existing `detectLayout()` in `paths.ts` updated to consult `config.hostLayout` first, falling back to filesystem heuristics only when not set
- [x] Update `EvalLayoutMode` type to align with new config-driven detection: `"plugin"` (lean) maps to resolving from plugin, `"ejected"` maps to self-contained
- [x] Config validation tests pass with both values and with the field omitted (defaults to `"plugin"`)

## Definition of Done
- [x] Schema, types, loader, and templates updated
- [x] Tests pass for config loading with `hostLayout` in both states
- [x] No linter errors in modified files

## Implementation Notes

### Current state
- `EvalLayoutMode` is `"legacy-root" | "self-contained"` — these map conceptually to `"plugin"` (uses external resolution) and `"ejected"` (runs from `.zoto/eval-system/` locally)
- `detectLayout()` uses filesystem markers (`scripts/eval-discover.ts`, `engine/runner.ts`, `package.json`) to detect mode — this is fragile during transitions
- Adding the config field makes the mode explicit and scriptable

### Migration path
- Existing repos without `hostLayout` in config.yml: loader applies default `"plugin"` + filesystem heuristic fallback (backward-compatible)
- `stamp-host-layout.ts` (eject) will set `hostLayout: ejected` on eject
- `un-eject` will set `hostLayout: plugin` on un-eject

### Files to modify
- `plugins/zoto-eval-system/templates/schema/config.schema.json`
- `plugins/zoto-eval-system/templates/config.json`
- `plugins/zoto-eval-system/templates/init-config.yml`
- `plugins/zoto-eval-system/src/config-loader.ts`
- `plugins/zoto-eval-system/src/paths.ts` (detectLayout)
- `plugins/zoto-eval-system/src/config-loader.test.ts`

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Test config loading with `hostLayout: plugin`
- Test config loading with `hostLayout: ejected`
- Test config loading with field omitted (default)
- Verify schema validation rejects invalid values

## Execution Notes
Subtask 02 completed. Added `hostLayout: "plugin" | "ejected"` config marker with schema default `"plugin"`. Loader tracks `hostLayoutExplicit` so legacy repos without the field keep filesystem heuristic layout detection; explicit values (including missing-config baseline) drive `detectLayout()`. Renamed `EvalLayoutMode` from `legacy-root|self-contained` to `plugin|ejected`.

### Agent Session Info
- Agent: generalPurpose (composer-2.5-fast)
- Started: 2026-06-01
- Completed: 2026-06-01

### Work Log
- Schema, templates, config-loader, paths updated under `plugins/zoto-eval-system/`
- Five new hostLayout tests in `config-loader.test.ts`; 18/18 pass

### Blockers Encountered
None

### Files Modified
- `plugins/zoto-eval-system/templates/schema/config.schema.json`
- `plugins/zoto-eval-system/templates/config.json`
- `plugins/zoto-eval-system/templates/init-config.yml`
- `plugins/zoto-eval-system/src/config-loader.ts`
- `plugins/zoto-eval-system/src/paths.ts`
- `plugins/zoto-eval-system/src/config-loader.test.ts`
- `plugins/zoto-eval-system/src/index.ts`
