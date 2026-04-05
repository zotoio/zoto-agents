# Subtask: Rename Historical Plan Artifacts

## Metadata
- **Subtask ID**: 09
- **Feature**: Plan-to-Spec Rename
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260405

## Objective
Rename the top-level `plans/` directory to `specs/` and rename all historical artifact files within it that contain "plan" in their filename. Update content within these files to use the new identifiers where they reference system identifiers (skill names, config keys, etc.).

## Deliverables Checklist
- [x] Rename `plans/` → `specs/` (top-level directory)
- [x] Rename `specs/20260403-zoto-spec-system/plan-zoto-spec-system-20260403.md` → `specs/20260403-zoto-spec-system/spec-zoto-spec-system-20260403.md`
- [x] Rename `specs/20260403-zoto-spec-system/subtask-04-spec-system-create-plan-skill-20260403.md` → `subtask-04-spec-system-create-spec-skill-20260403.md`
- [x] Rename `specs/20260403-zoto-spec-system/subtask-05-spec-system-judge-plan-skill-20260403.md` → `subtask-05-spec-system-judge-spec-skill-20260403.md`
- [x] Rename `specs/20260403-zoto-spec-system/subtask-06-spec-system-execute-plan-skill-20260403.md` → `subtask-06-spec-system-execute-spec-skill-20260403.md`
- [x] Update content within renamed and non-renamed files: system identifier references (skill names, agent names, command names, config keys)
- [x] Also rename/move `plans/20260405-plan-to-spec-rename/` (this very spec!) into `specs/20260405-plan-to-spec-rename/`

## Definition of Done
- [x] `plans/` directory no longer exists
- [x] `specs/` directory contains all historical artifacts
- [x] All files with "plan" in their name have been renamed
- [x] System identifier references within files updated (skill names, config keys, etc.)
- [x] Internal cross-references between subtask files and the index file remain consistent
- [x] No linter errors in modified files

## Implementation Notes

### Directory rename
Use `git mv plans specs` to rename the top-level directory (preserves git history).

### File renames within `specs/20260403-zoto-spec-system/`
After the directory rename, use `git mv` for each file:
- `plan-zoto-spec-system-20260403.md` → `spec-zoto-spec-system-20260403.md`
- `subtask-04-spec-system-create-plan-skill-20260403.md` → `subtask-04-spec-system-create-spec-skill-20260403.md`
- `subtask-05-spec-system-judge-plan-skill-20260403.md` → `subtask-05-spec-system-judge-spec-skill-20260403.md`
- `subtask-06-spec-system-execute-plan-skill-20260403.md` → `subtask-06-spec-system-execute-spec-skill-20260403.md`

### Content updates within historical files
These files reference system identifiers. Apply the rename mapping:
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
| `plan-[feature]-[date].md` | `spec-[feature]-[date].md` |

**Historical context**: These are completed plan artifacts. Update system identifiers but keep historical narrative intact where it makes sense. The spec index file and subtask files should reference new skill/command names since they're still used as reference.

### Also handle `plans/20260405-plan-to-spec-rename/`
This is the plan being executed right now. Move it into `specs/` as well. The index file (`plan-plan-to-spec-rename-20260405.md`) should be renamed to `spec-plan-to-spec-rename-20260405.md`. Update internal references.

### DO NOT modify files outside of the `plans/` (soon `specs/`) directory

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Verify `plans/` no longer exists
- Verify `specs/` contains all expected files
- Verify all renamed files exist at new paths
- Grep for file references that might be broken

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 20260405
- Completed: 20260405

### Work Log
1. Used `git mv plans specs` to rename the top-level directory
2. Used `git mv` for file renames within `specs/20260403-zoto-spec-system/`:
   - `plan-zoto-spec-system-20260403.md` → `spec-zoto-spec-system-20260403.md`
   - `subtask-04-spec-system-create-plan-skill-20260403.md` → `subtask-04-spec-system-create-spec-skill-20260403.md`
   - `subtask-05-spec-system-judge-plan-skill-20260403.md` → `subtask-05-spec-system-judge-spec-skill-20260403.md`
   - `subtask-06-spec-system-execute-plan-skill-20260403.md` → `subtask-06-spec-system-execute-spec-skill-20260403.md`
3. Renamed `plan-plan-to-spec-rename-20260405.md` → `spec-plan-to-spec-rename-20260405.md`
4. Updated system identifier references in all files within `specs/`:
   - `zoto-create-plan` → `zoto-create-spec`
   - `zoto-execute-plan` → `zoto-execute-spec`
   - `zoto-judge-plan` → `zoto-judge-spec`
   - `zoto-spec-planner` → `zoto-spec-generator`
   - `/zoto-plan` → `/zoto-spec-create`
   - `/zoto-execute` → `/zoto-spec-execute`
   - `/zoto-judge` → `/zoto-spec-judge`
   - `plansDir` → `specsDir`
5. Updated cross-references to renamed subtask files in the spec index
6. Verified no old identifiers remain via grep

### Judge Verification (Adversarial)

**Verdict: Verified**

Independent verification performed by `zoto-spec-judge`. All deliverables and DoD items confirmed.

#### Deliverables Checklist — Verified Items
1. **`plans/` → `specs/` directory rename**: Confirmed — `plans/` does not exist on disk; `specs/` exists with two subdirectories (`20260403-zoto-spec-system/`, `20260405-plan-to-spec-rename/`).
2. **`plan-zoto-spec-system-20260403.md` → `spec-zoto-spec-system-20260403.md`**: Confirmed — old file absent, new file exists at expected path.
3. **Subtask 04, 05, 06 renames** (`-create-plan-` → `-create-spec-`, etc.): Confirmed — all three old filenames absent, all three new filenames present.
4. **`plan-plan-to-spec-rename-20260405.md` → `spec-plan-to-spec-rename-20260405.md`**: Confirmed — old file absent, new file exists.
5. **Content updates in historical files**: Confirmed — grep for `zoto-create-plan`, `zoto-execute-plan`, `zoto-judge-plan`, `zoto-spec-planner`, `plansDir`, `/zoto-plan`, `/zoto-execute[^-]`, `/zoto-judge[^-]` across `specs/20260403-zoto-spec-system/` returned zero matches.
6. **Cross-references in spec index**: Confirmed — subtask manifest table (lines 56–65) references new filenames (`subtask-04-spec-system-create-spec-skill`, etc.) and Mermaid graph labels updated ("Create Spec Skill", etc.).

#### Definition of Done — Verified Items
- `plans/` directory gone: Confirmed
- `specs/` contains all historical artifacts: Confirmed (13 files in `20260403/`, 11 files in `20260405/`)
- All files with "plan" in name renamed: Confirmed (4 files renamed)
- System identifiers updated: Confirmed (zero stale identifiers in historical directory)
- Internal cross-references consistent: Confirmed
- No linter errors: N/A (markdown files only)

### Blockers Encountered
None

### Files Modified
- `specs/20260403-zoto-spec-system/spec-zoto-spec-system-20260403.md` (renamed + content updated)
- `specs/20260403-zoto-spec-system/subtask-02-spec-system-config-schema-20260403.md` (content updated)
- `specs/20260403-zoto-spec-system/subtask-03-spec-system-agent-20260403.md` (content updated)
- `specs/20260403-zoto-spec-system/subtask-04-spec-system-create-spec-skill-20260403.md` (renamed + content updated)
- `specs/20260403-zoto-spec-system/subtask-05-spec-system-judge-spec-skill-20260403.md` (renamed + content updated)
- `specs/20260403-zoto-spec-system/subtask-06-spec-system-execute-spec-skill-20260403.md` (renamed + content updated)
- `specs/20260403-zoto-spec-system/subtask-07-spec-system-commands-20260403.md` (content updated)
- `specs/20260403-zoto-spec-system/subtask-08-spec-system-rules-hooks-20260403.md` (content updated)
- `specs/20260403-zoto-spec-system/subtask-09-spec-system-documentation-20260403.md` (content updated)
- `specs/20260403-zoto-spec-system/execution-report-zoto-spec-system-20260403.md` (content updated)
- `specs/20260403-zoto-spec-system/assessment-zoto-spec-system-20260403.md` (content updated)
- `specs/20260405-plan-to-spec-rename/spec-plan-to-spec-rename-20260405.md` (renamed + content updated)
- `specs/20260405-plan-to-spec-rename/subtask-09-plan-to-spec-rename-historical-20260405.md` (this file, updated)
