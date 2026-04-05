# Subtask: Update Validation Script and Test Suite

## Metadata
- **Subtask ID**: 07
- **Feature**: Plan-to-Spec Rename
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260405

## Objective
Update the validation script (`validate-plugin.ts`) and test suite (`plugin.test.ts`) to expect the new file names, identifiers, and the new `zoto-spec-executor` agent.

## Deliverables Checklist
- [x] Update `plugins/zoto-spec-system/scripts/validate-plugin.ts`: update hardcoded agent names, skill name references, command file references
- [x] Update `plugins/zoto-spec-system/tests/plugin.test.ts`: update hardcoded agent names, skill names, command names, file path expectations, config key assertions, and add test for new executor agent

## Definition of Done
- [x] `validate-plugin.ts` references `zoto-spec-generator` and `zoto-spec-executor` instead of `zoto-spec-planner`
- [x] `validate-plugin.ts` references `zoto-create-spec`, `zoto-execute-spec`, `zoto-judge-spec` instead of old skill names
- [x] `plugin.test.ts` expects `agents/zoto-spec-generator.md` instead of `agents/zoto-spec-planner.md`
- [x] `plugin.test.ts` has test for `agents/zoto-spec-executor.md` existence
- [x] `plugin.test.ts` expects `zoto-create-spec`, `zoto-execute-spec`, `zoto-judge-spec` skill references
- [x] `plugin.test.ts` expects command files `zoto-spec-create.md`, `zoto-spec-execute.md`, `zoto-spec-judge.md`
- [x] `plugin.test.ts` config assertions check for `specsDir` and `spec` keys instead of `plansDir` and `plan`
- [x] `plugin.test.ts` cross-reference tests updated for new agent/skill/command names
- [x] No linter errors in modified files

## Implementation Notes

### Files to modify (within `plugins/zoto-spec-system/`)

1. `scripts/validate-plugin.ts`
   - Line ~164: `text.includes("zoto-spec-planner")` → update predicate to check that each command references at least one of `zoto-spec-generator`, `zoto-spec-executor`, or `zoto-spec-judge`
   - Line ~174: `["zoto-create-plan", "zoto-judge-plan", "zoto-execute-plan"]` → `["zoto-create-spec", "zoto-judge-spec", "zoto-execute-spec"]`
   - Review all other string literals for old identifiers

2. `tests/plugin.test.ts`
   - Config assertions (line ~112-122): `"plansDir"` → `"specsDir"`, `"plan"` → `"spec"` in required fields
   - Agent existence tests (lines ~190-199): `"zoto-spec-planner.md"` → `"zoto-spec-generator.md"`, ADD test for `"zoto-spec-executor.md"`
   - Cross-reference tests:
     - Commands should reference `zoto-spec-generator` OR `zoto-spec-judge` OR `zoto-spec-executor` (line ~219)
     - Judge agent should reference `zoto-judge-spec` (was `zoto-judge-plan`) (line ~237)
     - Generator agent should reference `zoto-spec-judge` (line ~243 area)
     - Command file paths: `"zoto-plan.md"` → `"zoto-spec-create.md"`, `"zoto-execute.md"` → `"zoto-spec-execute.md"`, `"zoto-judge.md"` → `"zoto-spec-judge.md"`
     - Skill references in commands: `zoto-create-plan` → `zoto-create-spec`, `zoto-judge-plan` → `zoto-judge-spec`, `zoto-execute-plan` → `zoto-execute-spec`
     - With the responsibility split, use targeted tests: generator references `zoto-create-spec`, executor references `zoto-execute-spec`, judge references `zoto-judge-spec` — do NOT require any single agent to reference all three skills
   - Test description strings: "planner agent" → "generator agent" where referencing the specific agent, add "executor agent" tests

### Rename Mapping
| Old | New |
|-----|-----|
| `zoto-create-plan` | `zoto-create-spec` |
| `zoto-execute-plan` | `zoto-execute-spec` |
| `zoto-judge-plan` | `zoto-judge-spec` |
| `zoto-spec-planner` | `zoto-spec-generator` |
| `zoto-plan.md` (command file) | `zoto-spec-create.md` |
| `zoto-execute.md` (command file) | `zoto-spec-execute.md` |
| `zoto-judge.md` (command file) | `zoto-spec-judge.md` |
| `plansDir` | `specsDir` |
| `"plan"` (config key) | `"spec"` |
| NEW: | `zoto-spec-executor` agent, `zoto-spec-executor.md` file |

### DO NOT modify files outside of `plugins/zoto-spec-system/scripts/` and `plugins/zoto-spec-system/tests/`

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Verify TypeScript files have no syntax errors
- Grep for remaining old identifiers in these files

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 20260405
- Completed: 20260405

### Work Log
1. Updated `validate-plugin.ts` cross-reference checks:
   - Agent reference predicate: `zoto-spec-planner || zoto-spec-judge` → `zoto-spec-generator || zoto-spec-executor || zoto-spec-judge`
   - Skill name array: `zoto-create-plan, zoto-judge-plan, zoto-execute-plan` → `zoto-create-spec, zoto-judge-spec, zoto-execute-spec`
2. Updated `plugin.test.ts`:
   - Config assertions: `plansDir` → `specsDir`, `plan` → `spec`
   - Renamed "planner agent exists" test → "generator agent exists" with `zoto-spec-generator.md`
   - Added new "executor agent exists" test for `zoto-spec-executor.md`
   - Updated all command file paths: `zoto-plan.md` → `zoto-spec-create.md`, `zoto-execute.md` → `zoto-spec-execute.md`, `zoto-judge.md` → `zoto-spec-judge.md`
   - Updated all skill references in cross-reference tests
   - Replaced monolithic "planner agent references all skills" test with targeted per-agent tests: generator→create-spec, executor→execute-spec
   - Updated execute command to reference executor agent instead of judge
3. Verified no old identifiers remain (grep confirms zero matches)
4. Verified no linter errors in either file

### Blockers Encountered
None

### Files Modified
- `plugins/zoto-spec-system/scripts/validate-plugin.ts`
- `plugins/zoto-spec-system/tests/plugin.test.ts`

## Adversarial Verification

**Verified by**: zoto-spec-judge
**Date**: 20260405
**Verdict**: **Verified**

### Verification Details

1. **`validate-plugin.ts` — agent references** (line 165): Confirmed predicate checks `zoto-spec-generator || zoto-spec-executor || zoto-spec-judge`. No trace of `zoto-spec-planner`.
2. **`validate-plugin.ts` — skill references** (line 175): Confirmed array is `["zoto-create-spec", "zoto-judge-spec", "zoto-execute-spec"]`. No old skill names remain.
3. **`plugin.test.ts` — config assertions** (lines 114, 117): Confirmed `specsDir` and `spec` are in the required-fields list. No `plansDir` or `plan` (as config key).
4. **`plugin.test.ts` — generator agent test** (line 190): Confirmed test "generator agent exists" checks `zoto-spec-generator.md`.
5. **`plugin.test.ts` — executor agent test** (line 196): Confirmed test "executor agent exists" checks `zoto-spec-executor.md`.
6. **`plugin.test.ts` — command file references**: Confirmed tests reference `zoto-spec-create.md` (line 252), `zoto-spec-execute.md` (lines 237, 262), `zoto-spec-judge.md` (lines 232, 257). No old command filenames.
7. **`plugin.test.ts` — cross-reference tests for three-agent architecture**: Confirmed targeted per-agent tests exist: generator→create-spec (line 266), executor→execute-spec (line 271), judge→judge-spec (line 241). Execute command references executor agent (line 236).
8. **Old identifier grep**: Zero matches for `zoto-spec-planner`, `zoto-create-plan`, `zoto-execute-plan`, `zoto-judge-plan`, `plansDir`, `zoto-plan.md`, `zoto-execute.md`, `zoto-judge.md` across both files.

All Deliverables Checklist and Definition of Done items independently confirmed.
