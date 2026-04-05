# Subtask: Update Plugin Manifest and Package Metadata

## Metadata
- **Subtask ID**: 06
- **Feature**: Plan-to-Spec Rename
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260405

## Objective
Update the plugin manifest (`plugin.json`) and `package.json` to remove "plan" from descriptions and keywords where it refers to the artifact name.

## Deliverables Checklist
- [x] Update `plugins/zoto-spec-system/.cursor-plugin/plugin.json`: description and keywords
- [x] Update `plugins/zoto-spec-system/package.json`: description

## Definition of Done
- [x] `plugin.json` description no longer uses "plan" as an artifact name (e.g. "create, judge, and execute" or "spec, judge, and execute")
- [x] `plugin.json` keywords updated (e.g. `"planning"` → `"generation"` or similar if appropriate)
- [x] `package.json` description updated consistently
- [x] Both files remain valid JSON
- [x] No linter errors in modified files

## Implementation Notes

### Files to modify (within `plugins/zoto-spec-system/`)

1. `.cursor-plugin/plugin.json`
   - Current description: `"Structured spec workflow: plan, judge, and execute engineering initiatives with adversarial verification."`
   - New description: `"Structured spec workflow: create, judge, and execute engineering initiatives with adversarial verification."` (replacing "plan" with "create" since the command is now `/zoto-spec-create`)
   - Keywords: `["planning", "execution", "specs", "engineering", "adversarial-verification"]` — consider changing `"planning"` to `"generation"` or `"spec-creation"`

2. `package.json`
   - Current description: `"Structured spec workflow: plan, judge, and execute engineering initiatives with adversarial verification."`
   - Update to match plugin.json description

### DO NOT modify files outside of `plugins/zoto-spec-system/.cursor-plugin/` and `plugins/zoto-spec-system/package.json`

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Verify both files are valid JSON after edits
- Grep for remaining "plan" references (as artifact name) in these files

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 20260405
- Completed: 20260405

### Work Log
- Updated `plugin.json` description: "plan, judge, and execute" → "create, judge, and execute"
- Updated `plugin.json` keywords: `"planning"` → `"spec-creation"`
- Updated `package.json` description to match `plugin.json`
- Verified both files are valid JSON
- Confirmed no remaining "plan" references in either file

### Blockers Encountered
None

### Files Modified
- `plugins/zoto-spec-system/.cursor-plugin/plugin.json`
- `plugins/zoto-spec-system/package.json`

## Verification

### Judge Verdict: **Verified**

All deliverables and Definition of Done items independently confirmed.

| Check | Result |
|-------|--------|
| `plugin.json` description uses "create, judge, and execute" | Confirmed |
| `plugin.json` keywords: `"planning"` → `"spec-creation"` | Confirmed |
| `package.json` description matches `plugin.json` | Confirmed — both read `"Structured spec workflow: create, judge, and execute engineering initiatives with adversarial verification."` |
| Both files valid JSON | Confirmed via `JSON.parse()` |
| No remaining `plan` artifact-name references | Confirmed via case-insensitive grep on both files |
