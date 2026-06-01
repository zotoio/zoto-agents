# Subtask: Documentation and README Updates

## Metadata
- **Subtask ID**: 08
- **Feature**: eval-dual-host-layout
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 03, 04, 05, 06, 07
- **Created**: 20260601

## Objective

Update all documentation to reflect the dual-mode layout: lean (plugin-dependent) as default, ejected (self-contained) as opt-in. Cover the plugin README, skill docs, command docs, and any inline code documentation.

## Deliverables Checklist
- [x] Update `plugins/zoto-eval-system/README.md` "Plugin vs host runtime layout" section — rewrite the three-layer table to describe: Plugin package (source of truth), Lean host (default), Ejected host (opt-in)
- [x] Document resolution precedence chain in README (monorepo → env → Cursor install dir)
- [x] Document `hostLayout` config field in README Configuration section
- [x] Document eject CLI usage: `pnpm run eval:stamp-host-layout` (when, why, what it does)
- [x] Document un-eject CLI usage: `pnpm run eval:un-eject` (when, why, what it does)
- [x] Document ejected primitives layout (`.cursor/*/eval-sys/`) in README
- [x] Update `plugins/zoto-eval-system/commands/z-eval-init.md` — mention lean deps install
- [x] Update `plugins/zoto-eval-system/commands/z-eval-create.md` — clarify lean-only stamping
- [x] Update `plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md` — document lean flow
- [x] Update `plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md` — ensure script path docs reflect both modes
- [x] Add "Migration from ejected to lean" section in README for existing users — **external host repos** that previously ran full-stamp `/z-eval-create`: run `pnpm run eval:un-eject` to strip vendored runtime and `.cursor/*/eval-sys/` primitives, set `hostLayout: plugin`, keep config/manifest/evals intact
- [x] Update CHANGELOG.md with breaking change notice

## Definition of Done
- [x] README accurately describes dual-mode layout
- [x] All command/skill docs consistent with new behaviour
- [x] No stale references to old single-mode behaviour
- [x] No linter errors in modified files

## Implementation Notes

### README structure update
The current "Plugin vs host runtime layout" section has three layers:
1. Plugin package (source of truth)
2. Stamped host copy (always full)
3. Monorepo dogfood

New structure should be:
1. Plugin package (source of truth / authoring)
2. Lean host (default for consumers — config + manifest + evals only)
3. Ejected host (opt-in — full self-contained copy + primitives)
4. Monorepo dogfood (same as lean, just with direct path)

### Key points to document
- Lean mode is the default and recommended path
- Eject is for: offline/air-gapped use, heavy customisation of engine, CI environments without plugin access
- Un-eject returns to lean with no data loss (config, manifest, evals preserved)
- The `hostLayout` config field records state; scripts consult it
- Resolution function is the single source of truth for finding the plugin

### Files to modify
- `plugins/zoto-eval-system/README.md`
- `plugins/zoto-eval-system/CHANGELOG.md`
- `plugins/zoto-eval-system/commands/z-eval-init.md`
- `plugins/zoto-eval-system/commands/z-eval-create.md`
- `plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md`
- `plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md`

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Review all documentation for internal consistency
- Verify code references in docs point to correct paths
- Ensure no broken relative links

## Execution Notes

Subtask 08 completed 2026-06-01 (judge fix pass). Documentation updated for dual-mode lean/ejected host layout across README, CHANGELOG, commands, and skills. Judge fix_list resolved: dual-mode script resolution in zoto-eval-tooling eval:stamp note, README scenarios ensure-host via alias/bridge, CHANGELOG self-contained section annotated superseded.

### Agent Session Info
- Agent: generalPurpose
- Started: 2026-06-01T04:48:03Z
- Completed: 2026-06-01T04:52:00Z

### Work Log
- Rewrote README "Plugin vs host runtime layout" to four-layer model with resolution precedence, eject/un-eject CLIs, ejected primitives layout, and migration section.
- Added `hostLayout` to Configuration table; updated lifecycle/troubleshooting for lean mode.
- Added BREAKING dual-mode entry to CHANGELOG.
- Extended z-eval-init, z-eval-create, zoto-create-evals, zoto-eval-tooling for lean flow and dual-mode script resolution.
- Judge fix pass: eval:stamp Note documents lean (plugin via eval-bridge) vs ejected allowlist paths; README scenarios use `pnpm run eval:ensure-host`; CHANGELOG self-contained section marked superseded.

### Blockers Encountered
None.

### Files Modified
- `plugins/zoto-eval-system/README.md`
- `plugins/zoto-eval-system/CHANGELOG.md`
- `plugins/zoto-eval-system/commands/z-eval-init.md`
- `plugins/zoto-eval-system/commands/z-eval-create.md`
- `plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md`
- `plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md`
