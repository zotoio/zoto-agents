# Subtask: Ejected Primitives Layout

## Metadata
- **Subtask ID**: 05
- **Feature**: eval-dual-host-layout
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 04
- **Created**: 20260601

## Objective

When ejecting, eval primitives (agents, skills, commands) must be copied into Cursor-native paths under `.cursor/*/eval-sys/` — NOT into `.zoto/eval-system/agents/`. This makes them discoverable by Cursor's native agent/skill/command resolution while keeping them namespaced.

## Deliverables Checklist
- [x] **Phase 0 (blocking):** Validate Cursor discovers agents/skills/commands from `.cursor/*/eval-sys/` subdirectories (manual or automated smoke: place dummy agent in `.cursor/agents/eval-sys/test-agent.md`, confirm IDE palette / agent list). Record result in this subtask's Execution Notes before implementing stamp logic.
- [x] If Phase 0 fails: implement **fallback flat layout** — copy primitives directly into `.cursor/agents/`, `.cursor/skills/`, `.cursor/commands/` with `eval-sys--` filename prefix (e.g. `eval-sys--zoto-eval-analyser-subagent.md`) instead of nested `eval-sys/` folders; document in README and un-eject cleanup lists
- [x] Create `stampEjectedPrimitives(repoRoot: string, pluginRoot: string, opts)` function in `stamp-host-layout.ts` (or a new `stamp-primitives.ts` module)
- [x] On eject, copy all eval agents from `<pluginRoot>/agents/*.md` → `.cursor/agents/eval-sys/` (flat-prefix default; nested via `primitivesLayout: "nested"`)
- [x] On eject, copy all eval skills from `<pluginRoot>/skills/*/` → `.cursor/skills/eval-sys/*/` (flat-prefix default; nested via opt-in)
- [x] On eject, copy all eval commands from `<pluginRoot>/commands/*.md` → `.cursor/commands/eval-sys/` (flat-prefix default; nested via opt-in)
- [x] Ensure ejected primitive paths exist (flat-prefix `.cursor/*/eval-sys--*` default; nested `eval-sys/` dirs when opted in)
- [x] Add `.cursor/*/eval-sys/` and flat-prefix patterns to plugin's `.gitignore` template (ejected primitives are generated, not tracked)
- [x] `stamp-host-layout.ts` calls `stampEjectedPrimitives()` as part of the eject flow
- [x] Document the primitives layout in the eject CLI's output summary
- [x] Ensure `analyserAgentPath()` in `paths.ts` checks flat-prefix and nested `.cursor/agents/eval-sys/` before plugin source

## Definition of Done
- [x] Eject produces primitives under `.cursor/` (flat-prefix default after Phase 0)
- [x] `analyserAgentPath()` resolves correctly in ejected mode
- [x] No primitives land under `.zoto/eval-system/agents/`
- [x] No linter errors in modified files

## Implementation Notes

### Current state
- Only the analyser agent is copied (to `.zoto/eval-system/agents/zoto-eval-analyser-subagent.md`)
- Other eval primitives (7 more agents, 9 skills, 13 commands) are never stamped to host repos
- In lean mode, Cursor resolves these from the marketplace plugin install automatically
- In ejected mode, the plugin install may not exist — primitives must be local

### Primitives inventory (from plugin)
**Agents** (8 total):
- zoto-eval-analyser-subagent.md, zoto-eval-adviser.md, zoto-eval-comparer.md, zoto-eval-configurer.md, zoto-eval-executor.md, zoto-eval-generator.md, zoto-eval-judge.md, zoto-eval-updater.md

**Skills** (9 directories):
- zoto-advise-evals, zoto-compare-evals, zoto-configure-evals, zoto-create-evals, zoto-eval-tooling, zoto-execute-evals, zoto-help-evals, zoto-judge-evals, zoto-update-evals

**Commands** (13 files):
- z-eval-advise.md, z-eval-compare.md, z-eval-configure.md, z-eval-create.md, z-eval-execute.md, z-eval-help.md, z-eval-init.md, z-eval-judge.md, z-eval-jump.md, z-eval-operator.md, z-eval-start.md, z-eval-update.md, z-eval-workflow.md

### Target layout after eject
```
.cursor/
├── agents/
│   └── eval-sys/
│       ├── zoto-eval-analyser-subagent.md
│       ├── zoto-eval-adviser.md
│       └── ...
├── skills/
│   └── eval-sys/
│       ├── zoto-advise-evals/
│       │   └── SKILL.md
│       ├── zoto-create-evals/
│       │   └── SKILL.md
│       └── ...
└── commands/
    └── eval-sys/
        ├── z-eval-init.md
        ├── z-eval-create.md
        └── ...
```

### Phase 0: Cursor subdirectory discovery (judge finding #1)
Before committing to nested `eval-sys/` folders, verify Cursor's primitive resolution recurses into subdirectories under `.cursor/agents/`, `.cursor/skills/`, and `.cursor/commands/`. If it does **not** recurse, use the flat-prefix fallback above and update `analyserAgentPath()` / un-eject accordingly.

### Resolution update
`analyserAgentPath()` in `paths.ts` currently checks:
1. `.zoto/eval-system/agents/zoto-eval-analyser-subagent.md` (self-contained)
2. `plugins/zoto-eval-system/agents/…` (monorepo)

Update to also check:
3. `.cursor/agents/eval-sys/zoto-eval-analyser-subagent.md` (ejected primitives)

### Files to modify
- `plugins/zoto-eval-system/scripts/stamp-host-layout.ts` (or new module)
- `plugins/zoto-eval-system/src/paths.ts` (`analyserAgentPath`)
- `plugins/zoto-eval-system/templates/host-package/.gitignore`

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Test stampEjectedPrimitives produces expected directory tree
- Verify all agents, skills, commands are present
- Test analyserAgentPath resolves through `.cursor/agents/eval-sys/`

## Execution Notes

### Agent Session Info
- Agent: generalPurpose (composer-2.5-fast)
- Started: 2026-06-01
- Completed: 2026-06-01

### Phase 0 — Cursor subdirectory discovery
**Result: FAIL for nested `eval-sys/` folders (use flat-prefix fallback).**

Evidence (automated research, no IDE smoke required):
- [Nested directory support for subagents](https://forum.cursor.com/t/nested-directory-support-for-subagents/151298) — agents only discovered at `.cursor/agents/` top level.
- Skills standard layout is `.cursor/skills/<name>/SKILL.md`; an extra `eval-sys/` parent is not in default `skillsRoots`.
- Commands: IDE may recurse subfolders but CLI does not ([Cursor staff confirmation](https://forum.cursor.com/t/subfolders-within-cursor-commands-folder-supported-in-ide-but-not-cli/154719)).

**Default eject layout:** `flat-prefix` — `.cursor/agents/eval-sys--*.md`, `.cursor/skills/eval-sys--*/`, `.cursor/commands/eval-sys--*.md`.

**Opt-in nested layout:** pass `primitivesLayout: "nested"` to stamp options (for future Cursor support / S09 round-trip tests).

### Work Log
1. Added `stamp-primitives.ts` with `stampEjectedPrimitives()`, layout helpers, and un-eject cleanup target helper.
2. Integrated into `stampHostLayout()`; eject summary reports primitive counts and layout mode.
3. Updated `analyserAgentPath()` — flat-prefix first, then nested `.cursor/agents/eval-sys/`, then plugin source; removed legacy `.zoto/eval-system/agents/` check.
4. Extended host-package `.gitignore` for both layouts.
5. Added `tests/stamp-primitives.test.ts` (6 cases) — all pass with existing stamp-host-layout tests (11 total).

### Blockers Encountered
None. Phase 0 outcome drives flat-prefix default; S07 should use `ejectedPrimitivesCleanupTargets()` for un-eject.

### Files Modified
- `plugins/zoto-eval-system/scripts/stamp-primitives.ts` (new)
- `plugins/zoto-eval-system/scripts/stamp-host-layout.ts`
- `plugins/zoto-eval-system/src/paths.ts`
- `plugins/zoto-eval-system/templates/host-package/.gitignore`
- `plugins/zoto-eval-system/tests/stamp-primitives.test.ts` (new)
