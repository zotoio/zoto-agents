# Subtask: Rename Skill Directories and Update Skill Contents

## Metadata
- **Subtask ID**: 01
- **Feature**: Plan-to-Spec Rename
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260405

## Objective
Rename all three skill directories from `*-plan` to `*-spec`, update all references within the SKILL.md files and evals.json files to use the new identifiers, and add an automatic judge review as the final step of the `zoto-create-spec` workflow.

## Deliverables Checklist
- [x] Rename `plugins/zoto-spec-system/skills/zoto-create-plan/` → `plugins/zoto-spec-system/skills/zoto-create-spec/`
- [x] Rename `plugins/zoto-spec-system/skills/zoto-execute-plan/` → `plugins/zoto-spec-system/skills/zoto-execute-spec/`
- [x] Rename `plugins/zoto-spec-system/skills/zoto-judge-plan/` → `plugins/zoto-spec-system/skills/zoto-judge-spec/`
- [x] Update `skills/zoto-create-spec/SKILL.md`: frontmatter `name: zoto-create-spec`, all content references per rename mapping, and add automatic judge review as the final workflow step
- [x] Update `skills/zoto-execute-spec/SKILL.md`: frontmatter `name: zoto-execute-spec`, all content references per rename mapping
- [x] Update `skills/zoto-judge-spec/SKILL.md`: frontmatter `name: zoto-judge-spec`, all content references per rename mapping
- [x] Update all three `evals/evals.json` files: `skill_name`, example paths (`plans/` → `specs/`), and command strings (`/zoto-plan` → `/zoto-spec-create`, etc.)

## Definition of Done
- [x] All three skill directories renamed
- [x] No remaining references to `zoto-create-plan`, `zoto-execute-plan`, or `zoto-judge-plan` in any skill file
- [x] No remaining references to `zoto-spec-planner` (use `zoto-spec-generator`)
- [x] No remaining references to `/zoto-plan` (use `/zoto-spec-create`), `/zoto-execute` (use `/zoto-spec-execute`), `/zoto-judge` (use `/zoto-spec-judge`)
- [x] No remaining references to `plansDir` (use `specsDir`), `plan.maxSubtasks` (use `spec.maxSubtasks`), etc.
- [x] Artifact naming patterns updated from `plan-[feature]-[date].md` to `spec-[feature]-[date].md`
- [x] No linter errors in modified files

## Implementation Notes

### Rename Mapping (apply throughout all files in this subtask)
| Old | New |
|-----|-----|
| `zoto-create-plan` | `zoto-create-spec` |
| `zoto-execute-plan` | `zoto-execute-spec` |
| `zoto-judge-plan` | `zoto-judge-spec` |
| `zoto-spec-planner` | `zoto-spec-generator` |
| `/zoto-plan` | `/zoto-spec-create` |
| `/zoto-execute` | `/zoto-spec-execute` |
| `/zoto-judge` | `/zoto-spec-judge` |
| `plansDir` | `specsDir` |
| `plans` (as default dir value) | `specs` |
| `plan.maxSubtasks` | `spec.maxSubtasks` |
| `plan.parallelLimit` | `spec.parallelLimit` |
| `plan.adversarialVerification` | `spec.adversarialVerification` |
| `plan-[feature-name]-[yyyymmdd].md` | `spec-[feature-name]-[yyyymmdd].md` |

### Behavioral change: automatic judge review in `zoto-create-spec`

The current `zoto-create-plan` skill ends at Step 7 (Review and Finalize) with a note that the user can optionally run `/zoto-judge` afterward. Change this so that:

1. After user approval in Step 7, the skill automatically spawns a **fresh `zoto-spec-judge` subagent** to independently assess the spec (using the `zoto-judge-spec` skill)
2. The judge produces an assessment file in the spec directory
3. The spec status moves from `Draft` → `Ready for Review` only after the judge completes
4. Present both the spec summary AND the judge's verdict/findings to the user
5. If the judge returns **Reject**, flag the issues and ask the user whether to revise or proceed anyway

This replaces the current "suggest running `/zoto-spec-judge`" with an integrated automatic step.

### Files to modify (within the plugin at `plugins/zoto-spec-system/`)
1. `skills/zoto-create-spec/SKILL.md` (after dir rename) — update `name:` frontmatter, all body references, and add Step 8: Automatic Judge Review
2. `skills/zoto-execute-spec/SKILL.md` (after dir rename) — update `name:` frontmatter and all body references
3. `skills/zoto-judge-spec/SKILL.md` (after dir rename) — update `name:` frontmatter and all body references
4. `skills/zoto-create-spec/evals/evals.json` — update any `skill_name` or path references
5. `skills/zoto-execute-spec/evals/evals.json` — update any `skill_name` or path references
6. `skills/zoto-judge-spec/evals/evals.json` — update any `skill_name` or path references

### Approach
1. Use `git mv` for directory renames to preserve git history
2. Then update file contents using string replacement
3. Be careful to distinguish "plan" as an English word (keep) vs "plan" as a system identifier (replace)

### DO NOT modify files outside of `plugins/zoto-spec-system/skills/`

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Verify renamed directories exist
- Verify old directories no longer exist
- Grep for any remaining old identifiers in the skill files

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 2026-04-05
- Completed: 2026-04-05

### Work Log
1. Renamed all three skill directories using `git mv` to preserve history
2. Rewrote `zoto-create-spec/SKILL.md` with all identifier renames and added Step 8: Automatic Judge Review
3. Rewrote `zoto-execute-spec/SKILL.md` with all identifier renames (plan→spec, plansDir→specsDir, plan.parallelLimit→spec.parallelLimit, etc.)
4. Rewrote `zoto-judge-spec/SKILL.md` with all identifier renames
5. Updated all three `evals/evals.json` files with new skill_name, path references, and command strings
6. Verified zero remaining old identifiers via grep across all skill files
7. Verified old directories no longer exist

### Blockers Encountered
None

### Files Modified
- `plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md` (renamed from zoto-create-plan, content updated)
- `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` (renamed from zoto-execute-plan, content updated)
- `plugins/zoto-spec-system/skills/zoto-judge-spec/SKILL.md` (renamed from zoto-judge-plan, content updated)
- `plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json` (updated)
- `plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json` (updated)
- `plugins/zoto-spec-system/skills/zoto-judge-spec/evals/evals.json` (updated)

### Adversarial Verification (independent)
- **Verdict**: Verified
- **Verified by**: Independent adversarial verifier (did not execute the subtask)
- **Date**: 2026-04-05

#### Verification Details
1. **Old directories removed**: Confirmed — `zoto-create-plan/`, `zoto-execute-plan/`, and `zoto-judge-plan/` are absent under `plugins/zoto-spec-system/skills/` (`test -d` each path).
2. **New directories exist**: Confirmed — each of `zoto-create-spec/`, `zoto-execute-spec/`, `zoto-judge-spec/` contains `SKILL.md` and `evals/evals.json`.
3. **Frontmatter `name`**: Confirmed — `zoto-create-spec`, `zoto-execute-spec`, `zoto-judge-spec` respectively; directory names match frontmatter (workspace skill convention).
4. **Step 8 (Automatic Judge Review)**: Confirmed in `zoto-create-spec/SKILL.md` (lines 74–85): spawns fresh `zoto-spec-judge` using `zoto-judge-spec`, assessment in spec directory, combined presentation to user, Approve/Conditional/Reject handling, `Draft` → `Ready for Review` gated on judge completion and user confirmation.
5. **evals.json**: Confirmed — each file has matching `skill_name`; prompts/paths use `specs/` and `/zoto-spec-judge`, `/zoto-spec-execute` where applicable; create-spec eval id 1 asserts automatic judge review after approval.
6. **Legacy identifier grep**: No matches in `plugins/zoto-spec-system/skills/` for: `zoto-create-plan`, `zoto-execute-plan`, `zoto-judge-plan`, `zoto-spec-planner`, `/zoto-plan`, `/zoto-execute`, `/zoto-judge`, `plansDir`, `plan.maxSubtasks`, `plan.parallelLimit`, `plan.adversarialVerification`. Remaining uses of the word “plan” are ordinary English (e.g. user prompts, “rollback plan”).
7. **Linter**: `read_lints` on all six modified skill paths — no issues reported.

#### Observation (out of subtask scope)
- `zoto-create-spec/SKILL.md` Conventions list `zoto-judge-assessment-…` / `zoto-execute-report-…` while `zoto-judge-spec/SKILL.md` and execute evals use `assessment-…` / `execution-report-…`. Not a failure against the explicit rename checklist; worth aligning in a follow-up if single naming is desired.
