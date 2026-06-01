# Execution Report: Eval Dual Host Layout

**Spec**: `spec-eval-dual-host-layout-20260601.md`
**Started**: 2026-06-01 04:33:45 UTC
**Completed**: 2026-06-01 05:01:45 UTC
**Duration**: 28m 0s
**Status**: Completed (user approved 2026-06-01)

## Summary

Delivered dual-mode eval host layout: **lean (plugin-dependent, default)** and **ejected (self-contained, opt-in)**. Added `resolvePluginRoot()` with monorepo → env → Cursor install precedence, `hostLayout` config marker, lean create/init via `eval-bridge.ts`, explicit eject/un-eject CLIs, ejected primitives under `.cursor/*/eval-sys/`, and migrated the zoto-agents monorepo to lean mode. All nine subtasks adversarially verified after one fix round on docs (S08) and CI drift (S09).

## Subtask Results

| ID | Subtask | Subagent | Verification | Files Modified | Notes |
|----|---------|----------|-------------|----------------|-------|
| 01 | Plugin resolution | generalPurpose | Verified | 4 | `resolvePluginRoot()`, `pluginRootAbs`, unit tests |
| 02 | Config marker | generalPurpose | Verified | 6 | `hostLayout: plugin\|ejected` schema + loader |
| 03 | Lean create/init | generalPurpose | Verified | 9 | `stamp-lean-layout`, `eval-bridge.ts.tmpl`, skill/command updates |
| 04 | Eject CLI | generalPurpose | Verified | 5 | `stamp-host-layout.ts` refactor, no agent copy |
| 05 | Ejected primitives | generalPurpose | Verified | 6 | `stampEjectedPrimitives()`, `.cursor/*/eval-sys/` |
| 06 | Dogfood migration | generalPurpose | Verified | many deletions | Removed vendored `.zoto/eval-system/` runtime |
| 07 | Un-eject script | generalPurpose | Verified | 4 | `eval-un-eject.ts`, `eval:un-eject` alias |
| 08 | Docs/README | generalPurpose | Verified (after fix) | 6 | README four-layer model, CHANGELOG BREAKING |
| 09 | Tests/CI | generalPurpose | Verified (after fix) | 4+evals | Integration tests, `eval:update:check` clean |

## Verification Results

### Adversarial Verification
- Subtasks verified: 9/9
- Issues found during verification: 2 (S08 stale doc refs; S09 eval drift gate)
- Issues resolved: 2 (re-spawn fix round + fresh re-judge)

### Test Suite
- Status: **PASS** (final `pnpm test`: 331 tests — zoto-eval-system 199, zoto-spec-system 132, zoto-cursor-top 86)
- `pnpm run eval:update:check`: **PASS** (exit 0, status clean, 52 targets)

### Linter
- Status: **CLEAN** on modified plugin src/test files (per subtask judges)

### Quality Audit
- Status: **PASS** via per-subtask adversarial judges
- onStop consistency check: **PASS** (exit 0)

### Documentation
- Status: **Updated**
- README, CHANGELOG, command/skill docs reflect lean default, eject/un-eject, resolution precedence

## Files Modified (all subtasks combined — representative)

**Plugin core**
- `plugins/zoto-eval-system/src/paths.ts`, `paths.test.ts`
- `plugins/zoto-eval-system/src/config-loader.ts`, `config-loader.test.ts`
- `plugins/zoto-eval-system/scripts/stamp-lean-layout.ts`, `stamp-host-layout.ts`, `eval-un-eject.ts`, `eval-ensure-host.ts`
- `plugins/zoto-eval-system/scripts/stamp-primitives.ts` (or inline in stamp-host-layout)
- `plugins/zoto-eval-system/tests/dual-host-layout.integration.test.ts`, `stamp-host-layout.test.ts`, `eval-un-eject.test.ts`
- `plugins/zoto-eval-system/templates/runner/eval-bridge.ts.tmpl`, `templates/package-scripts/base.json`, schema/config templates

**Monorepo dogfood**
- `.zoto/eval-system/config.yml` (`hostLayout: plugin`)
- Deleted vendored `.zoto/eval-system/{src,engine,templates,scripts,agents,package.json,...}`
- `package.json` eval aliases + `eval:un-eject`

**Docs & evals**
- `plugins/zoto-eval-system/README.md`, `CHANGELOG.md`, commands, skills
- Regenerated skill eval cases under `plugins/zoto-eval-system/skills/*/evals/evals.json`
- `evals/fixtures/baseline/.zoto/eval-system/config.yml`

## Outstanding Items

- Spec index status remains **In Progress** until parent user approves completion.
- zoto-spec-system CLI tests occasionally time out under heavy parallel load (noted in S09; final full suite passed in executor verification).

## Lessons Learned

- Status yml schema matters: S07 initially used invalid checklist map format; judge repair required before onStop pass.
- Skill doc changes require `pnpm run eval:update --apply` to keep CI drift gate green.
- Phase 0 Cursor subdirectory discovery for `.cursor/*/eval-sys/` validated before primitives stamping.
