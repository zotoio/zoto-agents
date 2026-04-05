# Subtask: Update Config Schema, Example Config, and Template

## Metadata
- **Subtask ID**: 04
- **Feature**: Plan-to-Spec Rename
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260405

## Objective
Update all configuration-related files to rename config keys from `plan`-based to `spec`-based naming, and update default values and references.

## Deliverables Checklist
- [x] Update `plugins/zoto-spec-system/docs/config-schema.md`: rename `plansDir` → `specsDir`, `plan.*` → `spec.*`, update default values and descriptions
- [x] Update `plugins/zoto-spec-system/docs/example-config.json`: rename JSON keys and update command references
- [x] Update `plugins/zoto-spec-system/templates/config.json`: rename JSON keys and update default values

## Definition of Done
- [x] Config schema documents `specsDir` instead of `plansDir`
- [x] Config schema documents `spec.maxSubtasks`, `spec.parallelLimit`, `spec.adversarialVerification` instead of `plan.*`
- [x] Example config uses new key names, references `/zoto-spec-create` in nudge message, and `"spec"` top-level key
- [x] Template config uses new key names
- [x] Default directory value is `"specs"` everywhere
- [x] No remaining references to `/zoto-plan`, `/zoto-execute`, or `/zoto-judge` in config files (use `/zoto-spec-create`, `/zoto-spec-execute`, `/zoto-spec-judge`)
- [x] No linter errors in modified files

## Implementation Notes

### Files to modify (within `plugins/zoto-spec-system/`)
1. `docs/config-schema.md`
   - Table: `plansDir` → `specsDir`, default `"plans"` → `"specs"`
   - Table: `plan.maxSubtasks` → `spec.maxSubtasks`
   - Table: `plan.parallelLimit` → `spec.parallelLimit`
   - Table: `plan.adversarialVerification` → `spec.adversarialVerification`
   - Description text: "plan directories" → "spec directories"
   - Paths section: `plansDir` → `specsDir`

2. `docs/example-config.json`
   - `"plansDir": "plans"` → `"specsDir": "specs"`
   - `"plan": { ... }` → `"spec": { ... }`
   - `/zoto-plan` → `/zoto-spec-create` in the `hooks.sessionStartNudge.message` field

3. `templates/config.json`
   - `"plansDir": "plans"` → `"specsDir": "specs"`

### DO NOT modify files outside of `plugins/zoto-spec-system/docs/` and `plugins/zoto-spec-system/templates/`

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Verify JSON files are valid JSON after edits
- Grep for remaining old key names in config files

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 20260405
- Completed: 20260405

### Work Log
- Renamed `plansDir` → `specsDir` (default `"plans"` → `"specs"`) in config-schema.md
- Renamed `plan.maxSubtasks` / `plan.parallelLimit` / `plan.adversarialVerification` → `spec.*` in config-schema.md
- Updated description text ("plan directories" → "spec directories") and Paths section in config-schema.md
- Renamed keys in example-config.json: `plansDir` → `specsDir`, `"plan"` → `"spec"`, `/zoto-plan` → `/zoto-spec-create`
- Renamed `plansDir` → `specsDir` (default `"specs"`) in templates/config.json
- Verified no remaining old references in the three target config files
- No linter errors

### Blockers Encountered
None

### Files Modified
- `plugins/zoto-spec-system/docs/config-schema.md`
- `plugins/zoto-spec-system/docs/example-config.json`
- `plugins/zoto-spec-system/templates/config.json`

## Adversarial Verification

- **Verdict**: ✅ **Verified**
- **Verified by**: zoto-spec-judge
- **Date**: 20260405

### Verification Details

**config-schema.md**:
- `specsDir` field present with default `"specs"` — confirmed (line 10)
- `spec.maxSubtasks`, `spec.parallelLimit`, `spec.adversarialVerification` all present — confirmed (lines 15-17)
- Paths section references `specsDir` — confirmed (line 27)
- No stale `plansDir`, `plan.*`, or old command references — confirmed via grep

**example-config.json**:
- `"specsDir": "specs"` — confirmed (line 3)
- Top-level key is `"spec"` (not `"plan"`) — confirmed (line 12)
- Nudge message references `/zoto-spec-create` — confirmed (line 9)
- Valid JSON — confirmed via `json.load()`
- No stale references — confirmed via grep

**templates/config.json**:
- `"specsDir": "specs"` — confirmed (line 3)
- Valid JSON — confirmed via `json.load()`
- No stale references — confirmed via grep

**Cross-file grep** for `plansDir`, `plan.maxSubtasks`, `plan.parallelLimit`, `plan.adversarialVerification`, `/zoto-plan`, `/zoto-execute`, `/zoto-judge`, `"plans"`, `"plan"` across all three files: **zero matches**.

**Linter errors**: None.
