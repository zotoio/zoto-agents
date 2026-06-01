# Subtask: Move host CLI into plugin scripts

## Metadata
- **Subtask ID**: 02
- **Feature**: Eval Plugin Self-Contained Scripts Consolidation
- **Assigned Subagent**: zoto-eval-engineer
- **Dependencies**: 01
- **Created**: 20260531

## Objective

Relocate all host eval CLI from repo-root `scripts/` into `plugins/zoto-eval-system/scripts/` as the canonical source. Rewrite every import to use plugin-relative paths (`../src/`, `../engine/`). Delete stale plugin forks before or after the move so only one copy of each script exists.

## Deliverables Checklist
- [ ] Move (with import rewrites): `eval-analyse.ts`, `eval-stamp.ts`, `eval-orchestrate.ts`, `eval-discover.ts`, `eval-gc.ts`, `eval-cleanup-vendored.ts`, `eval-cleanup-stale.ts`, `check-analyser-payload-parity.ts`, `test.py`
- [ ] Consolidate `eval-ensure-host.ts` — move root copy into plugin OR align root to delegate to plugin; ensure imports use `../templates/…` not `../plugins/zoto-eval-system/templates/…`
- [ ] Delete `plugins/zoto-eval-system/scripts/eval-discover.ts` stale fork (if not overwritten by move)
- [ ] Delete `plugins/zoto-eval-system/scripts/eval-update.ts` (superseded by `engine/update.ts`)
- [ ] All moved scripts import `loadEvalConfig` / `loadEvalPaths` from `../src/config-loader.js`
- [ ] Engine imports in moved scripts use `../engine/…` (e.g. `analyser-payload.js`, `_user-case-guards.ts`)
- [ ] `const REPO_ROOT = resolve(process.cwd())` replaced with `resolveHostRepoRoot()` where host-layout awareness is required (match existing stamper rewrite behaviour)
- [ ] `plugins/zoto-eval-system/tsconfig.json` — add `engine/**/*.ts` to `include` so moved scripts and `engine/update.ts` type-check under one project config

## Definition of Done
- [ ] Each moved file exists at `plugins/zoto-eval-system/scripts/<name>`
- [ ] `rg '../plugins/zoto-eval-system' plugins/zoto-eval-system/scripts/` returns zero import hits
- [ ] Stale `eval-update.ts` and duplicate `eval-discover.ts` removed from plugin scripts
- [ ] Moved scripts type-check under `plugins/zoto-eval-system/tsconfig.json` (or document pre-existing unrelated errors)
- [ ] Targeted smoke: `pnpm exec tsx plugins/zoto-eval-system/scripts/eval-discover.ts --pretty | head` exits 0

## Implementation Notes

Follow audit inventory from subtask 01. When moving `eval-discover.ts`, the **root** version is authoritative — do not resurrect the smaller plugin fork.

Preserve shebang / usage comments; update Usage lines to say `plugins/zoto-eval-system/scripts/…` or generic `scripts/…` (stamped host layout keeps `scripts/` relative to eval home).

**Do NOT yet:**
- Delete repo-root copies (subtask 05 retargets `package.json` first or in parallel)
- Change `stamp-host-layout.ts` (subtask 04)
- Change `engine/update.ts` imports (subtask 03)

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution.

- Run `tsx plugins/zoto-eval-system/scripts/eval-discover.ts` smoke
- Run any moved-script unit tests if already relocated in this subtask (prefer deferring bulk test moves to subtask 06)

## Execution Notes

[To be filled by executing agent]

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log

### Blockers Encountered

### Files Modified
