# Subtask: Un-eject Script

## Metadata
- **Subtask ID**: 07
- **Feature**: eval-dual-host-layout
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 04, 05
- **Created**: 20260601

## Objective

Create an `un-eject` script (CLI-only, no slash command) that reverses ejection: removes vendored runtime from `.zoto/eval-system/`, removes ejected primitives from `.cursor/*/eval-sys/`, restores lean plugin-dependent layout, and sets `hostLayout: plugin` in config.

## Deliverables Checklist
- [x] New script: `plugins/zoto-eval-system/scripts/eval-un-eject.ts`
- [x] Removes vendored directories: `.zoto/eval-system/src/`, `engine/`, `templates/`, `scripts/`
- [x] Removes nested `.zoto/eval-system/package.json`
- [x] Removes ejected primitives: `.cursor/agents/eval-sys/`, `.cursor/skills/eval-sys/`, `.cursor/commands/eval-sys/` (and flat-prefix `eval-sys--*` targets)
- [x] Patches config.yml: sets `hostLayout: plugin` (preserves all other config)
- [x] Updates root `package.json` eval aliases from self-contained paths back to plugin-resolved paths
- [x] Preserves repo-specific assets: config.yml, manifest.yml, manifest.history.yml, cache/, evals/
- [x] `--dry-run` flag: prints what would be deleted/modified without acting
- [x] `--force` flag: skip confirmation prompt (for CI/automation)
- [x] Interactive confirmation by default: lists files to delete, asks y/N
- [x] Prints clear summary of changes made and next steps
- [x] Add `eval:un-eject` alias to root package.json and to `templates/package-scripts/base.json`

## Definition of Done
- [x] Un-eject reverses eject cleanly (eject → un-eject round-trip)
- [x] Lean mode works after un-eject (eval:* scripts resolve from plugin)
- [x] No linter errors in modified files

## Implementation Notes

### Script structure
```ts
#!/usr/bin/env tsx
// eval-un-eject.ts — Reverse ejection, restore lean plugin-dependent layout

import { resolvePluginRoot } from "../src/paths.js";

const VENDORED_DIRS = ["src", "engine", "templates", "scripts"];
const PRIMITIVES_DIRS = [
  ".cursor/agents/eval-sys",
  ".cursor/skills/eval-sys",
  ".cursor/commands/eval-sys",
];

// 1. Verify we're in ejected mode (check config.yml or filesystem)
// 2. Resolve plugin root (must be available for lean mode to work)
// 3. List what will be deleted
// 4. Confirm (unless --force)
// 5. Delete vendored dirs + primitives
// 6. Remove nested package.json
// 7. Patch config.yml: hostLayout → plugin
// 8. Update root package.json aliases
// 9. Summary
```

### Config patching
Same approach as S04 — use `yaml` package's `parseDocument()` to preserve comments:
```ts
doc.set('hostLayout', 'plugin');
```

### Root package.json alias update
After un-eject, aliases should resolve through the plugin:
- Monorepo: `tsx plugins/zoto-eval-system/scripts/<name>.ts`
- External: needs the resolution wrapper pattern from S03

### Safety checks
- Abort if plugin cannot be resolved (user would be stuck without runtime)
- Abort if not currently ejected (nothing to un-eject)
- Warn if `.zoto/eval-system/node_modules/` exists (suggest removing)

### Files to create
- `plugins/zoto-eval-system/scripts/eval-un-eject.ts`

### Files to modify
- Root `package.json` or `templates/package-scripts/base.json` (add `eval:un-eject` alias)

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Test eject → un-eject round-trip in temp directory
- Verify all vendored files removed
- Verify all ejected primitives removed
- Verify config.yml patched correctly
- Test --dry-run produces no side effects
- Test error when plugin cannot be resolved

## Execution Notes

### Agent Session Info
- Agent: generalPurpose (composer-2.5-fast)
- Started: 2026-06-01
- Completed: 2026-06-01

### Work Log
- Added `eval-un-eject.ts` with vendored dir removal, primitive cleanup (flat-prefix + nested), `hostLayout: plugin` patch, `stampLeanLayout` for bridge + base.json aliases.
- CLI: `--dry-run`, `--force`, interactive confirm, `--json`, `--repo-root=`.
- Tests: eject → un-eject round-trip, dry-run, plugin resolution failure, not-ejected guard.

### Blockers Encountered
None.

### Files Modified
- `plugins/zoto-eval-system/scripts/eval-un-eject.ts` (new)
- `plugins/zoto-eval-system/tests/eval-un-eject.test.ts` (new)
- `plugins/zoto-eval-system/templates/package-scripts/base.json`
- `package.json`
