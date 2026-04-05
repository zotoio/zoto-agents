# Subtask: Final Verification

## Metadata
- **Subtask ID**: 10
- **Feature**: Plan-to-Spec Rename
- **Assigned Subagent**: shell
- **Dependencies**: 01, 02, 03, 04, 05, 06, 07, 08, 09
- **Created**: 20260405

## Objective
Run the full test suite, check linter errors, and verify that no old identifiers remain in the codebase.

## Deliverables Checklist
- [x] Run `pnpm test` in `plugins/zoto-spec-system/` — all tests pass
- [x] Run `pnpm validate` in `plugins/zoto-spec-system/` — validation passes
- [x] Grep for remaining old identifiers across the entire plugin (excluding node_modules): `zoto-create-plan`, `zoto-execute-plan`, `zoto-judge-plan`, `zoto-spec-planner`, `plansDir`, `plan.maxSubtasks`, `plan.parallelLimit`, `plan.adversarialVerification`
- [x] Grep for old command names: `/zoto-plan` (not followed by `-to-spec`), `/zoto-execute` (without `-spec` suffix), `/zoto-judge` (without `-spec` suffix)
- [x] Verify no broken cross-references: all files referenced in commands, agents, and skills exist at their expected paths
- [x] Verify `plans/` directory no longer exists and `specs/` directory is present
- [x] Verify `zoto-spec-executor.md` agent exists

## Definition of Done
- [x] All tests passing
- [x] Validation script passes
- [x] No old identifiers found in plugin source files
- [x] All cross-references valid
- [x] Directory structure is correct
- [x] Three agents exist: `zoto-spec-generator.md`, `zoto-spec-executor.md`, `zoto-spec-judge.md`
- [x] Three commands exist: `zoto-spec-create.md`, `zoto-spec-execute.md`, `zoto-spec-judge.md`

## Implementation Notes

### Commands to run
```bash
# In plugins/zoto-spec-system/
pnpm test
pnpm validate

# From repo root — search for old identifiers
rg "zoto-create-plan|zoto-execute-plan|zoto-judge-plan" --type md --type ts --type json -g '!node_modules' plugins/zoto-spec-system/
rg "zoto-spec-planner" --type md --type ts --type json -g '!node_modules' plugins/zoto-spec-system/
rg "plansDir" --type md --type ts --type json -g '!node_modules' plugins/zoto-spec-system/
rg '"plan\.' --type md --type ts --type json -g '!node_modules' plugins/zoto-spec-system/

# Catch stale /zoto-create-spec (wrong form — should be /zoto-spec-create)
rg "/zoto-create-spec|/zoto-execute-spec|/zoto-judge-spec" --type md --type ts --type json -g '!node_modules' plugins/zoto-spec-system/

# Check .cursor/agents for stale references
rg "zoto-spec-planner|zoto-create-plan|/zoto-plan" .cursor/agents/

# Verify directory structure
ls -la specs/
ls plans/ 2>&1 || echo "plans/ correctly removed"
ls plugins/zoto-spec-system/skills/
ls plugins/zoto-spec-system/agents/
ls plugins/zoto-spec-system/commands/
```

### Expected results
- Tests: all pass (test expectations updated by subtask 07)
- Validation: passes (validation script updated by subtask 07)
- Grep: no matches for old identifiers in plugin source
- `plans/` does not exist; `specs/` exists with historical artifacts
- Skill dirs: `zoto-create-spec/`, `zoto-execute-spec/`, `zoto-judge-spec/`
- Agent files: `zoto-spec-generator.md`, `zoto-spec-executor.md`, `zoto-spec-judge.md`
- Command files: `zoto-spec-create.md`, `zoto-spec-execute.md`, `zoto-spec-judge.md`

## Testing Strategy
This subtask IS the test phase — run the full test suite here.

## Execution Notes

### Agent Session Info
- Agent: shell (parent-delegated)
- Started: 2026-04-05
- Completed: 2026-04-05

### Work Log

**1. Tests — PASS**
- `pnpm test`: 28/28 tests passed (vitest, 1.12s)

**2. Validation — PASS**
- `pnpm validate`: 47/47 checks passed. Plugin is ready for submission.

**3. Old identifier search — PASS**
- `zoto-create-plan`, `zoto-execute-plan`, `zoto-judge-plan`: only in CHANGELOG.md (historical documentation)
- `zoto-spec-planner`: only in CHANGELOG.md (historical documentation)
- `plansDir`: only in CHANGELOG.md (historical documentation)
- `"plan.*"` config keys: no matches anywhere
- `/zoto-plan`, `/zoto-execute`, `/zoto-judge` (old command names): only in CHANGELOG.md (historical documentation)
- No old identifiers found in any active source files (agents, skills, commands, rules, hooks, tests, scripts, config, docs)

**4. .cursor/agents stale references — PASS**
- No matches for `zoto-spec-planner`, `zoto-create-plan`, or `/zoto-plan` in `.cursor/agents/`

**5. Directory structure — PASS**
- `specs/` exists with: `20260403-zoto-spec-system/`, `20260405-plan-to-spec-rename/`
- `plans/` does not exist (correctly removed)
- Skills: `zoto-create-spec/`, `zoto-execute-spec/`, `zoto-judge-spec/`
- Agents: `zoto-spec-executor.md`, `zoto-spec-generator.md`, `zoto-spec-judge.md`
- Commands: `zoto-spec-create.md`, `zoto-spec-execute.md`, `zoto-spec-judge.md`

**6. Key files — PASS**
All 9 key files verified to exist at their expected paths.

### Blockers Encountered
None.

### Files Modified
- `specs/20260405-plan-to-spec-rename/subtask-10-plan-to-spec-rename-verification-20260405.md` (this file — checklist updates)
