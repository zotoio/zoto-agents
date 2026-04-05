# Subtask: Update Rules and Hook Scripts

## Metadata
- **Subtask ID**: 05
- **Feature**: Plan-to-Spec Rename
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260405

## Objective
Update the rule file and hook scripts to use the new identifiers — command name, config keys, and default directory.

## Deliverables Checklist
- [x] Update `plugins/zoto-spec-system/rules/zoto-spec-system.mdc`: command references, config key references, skill/agent names
- [x] Update `plugins/zoto-spec-system/hooks/zoto-session-start.ts`: `/zoto-plan` → `/zoto-spec-create` in DEFAULT_MESSAGE
- [x] Update `plugins/zoto-spec-system/hooks/zoto-session-start.mjs`: `/zoto-plan` → `/zoto-spec-create` in DEFAULT_MESSAGE

## Definition of Done
- [x] Rule file references `/zoto-spec-create`, `/zoto-spec-execute`, `/zoto-spec-judge` instead of old command names
- [x] Rule file references `specsDir` instead of `plansDir`
- [x] Hook .ts source references `/zoto-spec-create`
- [x] Hook .mjs compiled output references `/zoto-spec-create`
- [x] No remaining references to old identifiers in any of these files
- [x] No linter errors in modified files

## Implementation Notes

### Files to modify (within `plugins/zoto-spec-system/`)

1. `rules/zoto-spec-system.mdc`
   - Available Commands section: `/zoto-plan` → `/zoto-spec-create`, `/zoto-execute` → `/zoto-spec-execute`, `/zoto-judge` → `/zoto-spec-judge`
   - "Suggest `/zoto-plan`" → "Suggest `/zoto-spec-create`"
   - `plansDir` → `specsDir` in Configuration section
   - `"plans"` → `"specs"` as default value

2. `hooks/zoto-session-start.ts`
   - `DEFAULT_MESSAGE` string: `/zoto-plan` → `/zoto-spec-create`
   - That's the only occurrence of "plan" in this file

3. `hooks/zoto-session-start.mjs`
   - This is the compiled JS output of the .ts file
   - Same change: `/zoto-plan` → `/zoto-spec-create` in `DEFAULT_MESSAGE`

### DO NOT modify files outside of `plugins/zoto-spec-system/rules/` and `plugins/zoto-spec-system/hooks/`
### DO NOT modify `hooks/hooks.json` (that file has no plan references)

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Grep for remaining old identifiers in rule and hook files
- Verify .ts and .mjs files are syntactically valid

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 20260405
- Completed: 20260405

### Work Log
- Updated rule file: renamed all three command references (`/zoto-plan` → `/zoto-spec-create`, `/zoto-execute` → `/zoto-spec-execute`, `/zoto-judge` → `/zoto-spec-judge`), `plansDir` → `specsDir`, `"plans"` → `"specs"`, and section headings
- Updated hook .ts source: `/zoto-plan` → `/zoto-spec-create` in DEFAULT_MESSAGE
- Updated hook .mjs compiled output: same change
- Verified no old identifiers remain via grep
- Confirmed no linter errors

### Blockers Encountered
None

### Files Modified
- `plugins/zoto-spec-system/rules/zoto-spec-system.mdc`
- `plugins/zoto-spec-system/hooks/zoto-session-start.ts`
- `plugins/zoto-spec-system/hooks/zoto-session-start.mjs`

## Verification (Judge)

### Verdict: **Verified**

### Verification Details

**Rule file (`rules/zoto-spec-system.mdc`)**:
- `/zoto-spec-create` present at lines 12, 18 — confirmed ✓
- `/zoto-spec-execute` present at line 14 — confirmed ✓
- `/zoto-spec-judge` present at line 13 — confirmed ✓
- `specsDir` present at lines 28, 32 — confirmed ✓
- Default value `"specs"` at line 28 — confirmed ✓

**Hook TS source (`hooks/zoto-session-start.ts`)**:
- `DEFAULT_MESSAGE` at line 13 references `/zoto-spec-create` — confirmed ✓

**Hook MJS compiled (`hooks/zoto-session-start.mjs`)**:
- `DEFAULT_MESSAGE` at line 9 references `/zoto-spec-create` — confirmed ✓

**Old identifier scan** (grep across rules/ and hooks/):
- `/zoto-plan` — 0 matches ✓
- `/zoto-execute` (without `-spec`) — 0 matches ✓
- `/zoto-judge` (without `-spec`) — 0 matches ✓
- `plansDir` — 0 matches ✓

**Linter errors**: None ✓

All Deliverables Checklist and Definition of Done items independently confirmed.
