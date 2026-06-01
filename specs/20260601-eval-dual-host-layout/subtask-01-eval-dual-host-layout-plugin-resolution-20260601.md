# Subtask: Plugin Resolution Layer

## Metadata
- **Subtask ID**: 01
- **Feature**: eval-dual-host-layout
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260601

## Objective

Create a single, well-documented `resolvePluginRoot()` function that finds the eval-system plugin runtime at execution time. This is the foundation all other subtasks build on — lean mode scripts import engine/templates/scripts from wherever this function resolves to.

## Deliverables Checklist
- [x] New exported function `resolvePluginRoot(repoRoot?: string): string` in `plugins/zoto-eval-system/src/paths.ts`
- [x] Precedence chain implemented and documented: (1) monorepo `plugins/zoto-eval-system/` when present relative to repo root, (2) `ZOTO_EVAL_PLUGIN_ROOT` env override, (3) Cursor plugin install dir (platform-aware: `join(os.homedir(), '.cursor', 'plugins', …)` on Unix; `%APPDATA%/Cursor/plugins/…` or equivalent on Windows — glob for marketplace versions)
- [x] When multiple Cursor install candidates match, pick highest semver from each candidate's `package.json` (fallback: most-recently-modified mtime if semver unavailable)
- [x] Validation: function throws with actionable error if no resolution succeeds
- [x] Existing `resolvePluginRuntimeRoot()` refactored to delegate to new `resolvePluginRoot()` for the `legacy-root` / non-self-contained case
- [x] `EvalPaths` interface updated: add `pluginRootAbs` field pointing to resolved plugin root
- [x] Unit tests for all three precedence levels (mock filesystem)
- [x] JSDoc with precedence documentation

## Definition of Done
- [x] Code implemented in `plugins/zoto-eval-system/src/paths.ts`
- [x] Tests pass for resolution across monorepo, env-override, and install-dir scenarios
- [x] No linter errors in modified files

## Implementation Notes

### Current state
- `paths.ts` has `resolvePluginRuntimeRoot()` which already handles monorepo detection but lacks env-override and Cursor install-dir fallback
- The `PLUGIN_ROOT` constant in `stamp-host-layout.ts` resolves from `import.meta.url` — the new function generalises this

### Resolution algorithm
```
1. Check monorepo: join(repoRoot, 'plugins', 'zoto-eval-system')
   → verify: existsSync(join(candidate, 'templates')) OR existsSync(join(candidate, 'engine'))
2. Check env: process.env.ZOTO_EVAL_PLUGIN_ROOT
   → verify: existsSync(candidate) AND same marker check
3. Check Cursor installs (platform-aware via `os.homedir()` + `process.platform`):
   - Unix/macOS: `~/.cursor/plugins/*/zoto-eval-system/` and `~/.cursor/plugins/cache/*/zoto-eval-system/`
   - Windows: `%APPDATA%/Cursor/plugins/*/zoto-eval-system/` (and cache analogue)
   → pick highest semver from candidate `package.json`; fallback to most-recently-modified mtime
4. Throw: "Cannot resolve zoto-eval-system plugin. Set ZOTO_EVAL_PLUGIN_ROOT or install the plugin."
```

### Cross-platform note
Use `node:os` `homedir()` and avoid hard-coded `~` in runtime code. Document Windows path shape in JSDoc; if Windows Cursor layout differs from assumption, log a actionable error rather than silently failing.

### Files to modify
- `plugins/zoto-eval-system/src/paths.ts` — add `resolvePluginRoot()`, refactor `resolvePluginRuntimeRoot()`
- `plugins/zoto-eval-system/src/paths.test.ts` — add unit tests

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Create targeted tests for the resolution function
- Mock filesystem with `memfs` or manual path existence checks
- Test each precedence level in isolation
- Test error case when no plugin found

## Execution Notes

### Agent Session Info
- Agent: generalPurpose (composer-2.5-fast)
- Started: 2026-06-01
- Completed: 2026-06-01

### Work Log
- Added `resolvePluginRoot()` with monorepo → `ZOTO_EVAL_PLUGIN_ROOT` → Cursor install precedence.
- Cursor candidates: direct install, marketplace folders, and `cache/*` paths; semver pick with mtime fallback.
- `resolvePluginRuntimeRoot()` delegates to `resolvePluginRoot()` for `plugin` layout; `ejected` uses eval home.
- `EvalPaths.pluginRootAbs` exposed; tests updated for `plugin`/`ejected` layout names.
- Vitest `include` extended with `src/**/*.test.ts` so `paths.test.ts` runs in-package.

### Blockers Encountered
None.

### Files Modified
- `plugins/zoto-eval-system/src/paths.ts`
- `plugins/zoto-eval-system/src/paths.test.ts`
- `plugins/zoto-eval-system/src/config-loader.ts`
- `plugins/zoto-eval-system/vitest.config.ts`
