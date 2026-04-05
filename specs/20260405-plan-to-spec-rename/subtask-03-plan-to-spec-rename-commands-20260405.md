# Subtask: Rename All Command Files and Update Command Contents

## Metadata
- **Subtask ID**: 03
- **Feature**: Plan-to-Spec Rename
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260405

## Objective
Rename all three command files and update their contents to use the new identifiers, new agent names, and new command names.

## Deliverables Checklist
- [x] Rename `plugins/zoto-spec-system/commands/zoto-plan.md` → `plugins/zoto-spec-system/commands/zoto-spec-create.md`
- [x] Rename `plugins/zoto-spec-system/commands/zoto-execute.md` → `plugins/zoto-spec-system/commands/zoto-spec-execute.md`
- [x] Rename `plugins/zoto-spec-system/commands/zoto-judge.md` → `plugins/zoto-spec-system/commands/zoto-spec-judge.md`
- [x] Update `commands/zoto-spec-create.md`: frontmatter `name: zoto-spec-create`, spawn `zoto-spec-generator` agent, reference `zoto-create-spec` skill
- [x] Update `commands/zoto-spec-execute.md`: frontmatter `name: zoto-spec-execute`, spawn `zoto-spec-executor` agent (NOT generator), reference `zoto-execute-spec` skill
- [x] Update `commands/zoto-spec-judge.md`: frontmatter `name: zoto-spec-judge`, spawn `zoto-spec-judge` agent, reference `zoto-judge-spec` skill

## Definition of Done
- [x] All three command files renamed
- [x] No remaining references to `zoto-spec-planner` in any command file
- [x] No remaining references to old skill names in any command file
- [x] No remaining references to `/zoto-plan`, `/zoto-execute`, `/zoto-judge` (use `/zoto-spec-create`, `/zoto-spec-execute`, `/zoto-spec-judge`)
- [x] Execute command references `zoto-spec-executor` agent (not `zoto-spec-generator`)
- [x] Config and artifact pattern references updated
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
| `plan-[feature-name]-[yyyymmdd].md` | `spec-[feature-name]-[yyyymmdd].md` |

### Files to modify (within `plugins/zoto-spec-system/`)
1. `commands/zoto-spec-create.md` (after rename from `zoto-plan.md`)
2. `commands/zoto-spec-execute.md` (after rename from `zoto-execute.md`)
3. `commands/zoto-spec-judge.md` (after rename from `zoto-judge.md`)

### Key changes in `zoto-spec-create.md` (from `zoto-plan.md`)
- Frontmatter: `name: zoto-plan` → `name: zoto-spec-create`
- Title: `# zoto-plan` → `# zoto-spec-create`
- Description: update to reflect spec creation
- Usage examples: `/zoto-plan` → `/zoto-spec-create`
- "What happens" section: add step for automatic judge review after user approval (spawns `zoto-spec-judge` to assess the spec before finalizing)
- "After planning" section: remove suggestion to run `/zoto-spec-judge` manually (now automatic)
- Instructions: spawn `zoto-spec-generator` (was `zoto-spec-planner`), use `zoto-create-spec` skill (was `zoto-create-plan`)
- Output structure: `plan-feature-name-20260403.md` → `spec-feature-name-20260403.md`
- `{plansDir}` → `{specsDir}`, default `plans` → `specs`
- Related section: update all cross-references including `/zoto-spec-execute` and `/zoto-spec-judge`

### Key changes in `zoto-spec-execute.md` (from `zoto-execute.md`)
- Frontmatter: `name: zoto-execute` → `name: zoto-spec-execute`
- Title: `# zoto-execute` → `# zoto-spec-execute`
- **CRITICAL**: Instructions say "spawn a `zoto-spec-planner` subagent" — change to spawn `zoto-spec-executor` (NOT `zoto-spec-generator`)
- Usage examples: `/zoto-execute` → `/zoto-spec-execute`
- Skill reference: `zoto-execute-plan` → `zoto-execute-spec`
- All `plan-*` patterns → `spec-*`
- `{plansDir}` → `{specsDir}`, default `plans` → `specs`
- Related section: `zoto-spec-planner` → `zoto-spec-executor` for execution, add `zoto-spec-generator` reference, update commands
- Replace `/zoto-plan` → `/zoto-spec-create`, `/zoto-judge` → `/zoto-spec-judge`

### Key changes in `zoto-spec-judge.md` (from `zoto-judge.md`)
- Frontmatter: `name: zoto-judge` → `name: zoto-spec-judge`
- Title: `# zoto-judge` → `# zoto-spec-judge`
- Usage examples: `/zoto-judge` → `/zoto-spec-judge`
- Skill reference: `zoto-judge-plan` → `zoto-judge-spec`
- All `plan-*` patterns → `spec-*`
- `{plansDir}` → `{specsDir}`, default `plans` → `specs`
- Related section: `zoto-spec-planner` → `zoto-spec-generator`/`zoto-spec-executor` as appropriate
- Replace `/zoto-plan` → `/zoto-spec-create`, `/zoto-execute` → `/zoto-spec-execute`

### Approach
1. Use `git mv` for all three file renames
2. Apply systematic string replacements in all three command files

### DO NOT modify files outside of `plugins/zoto-spec-system/commands/`

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Verify all three files renamed
- Grep for remaining old identifiers in command files

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 20260405
- Completed: 20260405

### Work Log
1. Read all three existing command files to understand current content
2. Used `git mv` to rename all three files:
   - `zoto-plan.md` → `zoto-spec-create.md`
   - `zoto-execute.md` → `zoto-spec-execute.md`
   - `zoto-judge.md` → `zoto-spec-judge.md`
3. Rewrote `zoto-spec-create.md`: updated frontmatter, title, description, usage examples, instructions to spawn `zoto-spec-generator` with `zoto-create-spec` skill, added automatic judge review step, updated output structure patterns, replaced `{plansDir}` with `{specsDir}`, updated Related section
4. Rewrote `zoto-spec-execute.md`: updated frontmatter, title, description, usage examples, instructions to spawn `zoto-spec-executor` (NOT generator) with `zoto-execute-spec` skill, updated all `plan-*` patterns to `spec-*`, replaced `{plansDir}` with `{specsDir}`, updated Related section
5. Rewrote `zoto-spec-judge.md`: updated frontmatter, title, description, usage examples, skill reference to `zoto-judge-spec`, updated all `plan-*` patterns to `spec-*`, replaced `{plansDir}` with `{specsDir}`, updated Related section
6. Verified no remaining old references (`zoto-spec-planner`, `zoto-create-plan`, `zoto-execute-plan`, `zoto-judge-plan`, `/zoto-plan`, `/zoto-execute`, `/zoto-judge`, `plansDir`, `plan-feature`) in any command file

### Blockers Encountered
None

### Files Modified
- `plugins/zoto-spec-system/commands/zoto-spec-create.md` (renamed from `zoto-plan.md`, content rewritten)
- `plugins/zoto-spec-system/commands/zoto-spec-execute.md` (renamed from `zoto-execute.md`, content rewritten)
- `plugins/zoto-spec-system/commands/zoto-spec-judge.md` (renamed from `zoto-judge.md`, content rewritten)

### Adversarial Verification
- **Judge**: zoto-spec-judge (fresh context)
- **Verdict**: Verified

#### Verification Details

**Old files removed**: Confirmed — `zoto-plan.md`, `zoto-execute.md`, `zoto-judge.md` do not exist on disk.

**Frontmatter correctness**:
- `zoto-spec-create.md`: `name: zoto-spec-create` — confirmed
- `zoto-spec-execute.md`: `name: zoto-spec-execute` — confirmed
- `zoto-spec-judge.md`: `name: zoto-spec-judge` — confirmed

**Agent spawn correctness**:
- `zoto-spec-create.md` spawns `zoto-spec-generator` — confirmed (line 20)
- `zoto-spec-execute.md` spawns `zoto-spec-executor` (CRITICAL check) — confirmed (line 23)
- `zoto-spec-judge.md` spawns `zoto-spec-judge` — confirmed (line 22)

**Skill references**:
- `zoto-spec-create.md` references `zoto-create-spec` — confirmed
- `zoto-spec-execute.md` references `zoto-execute-spec` — confirmed
- `zoto-spec-judge.md` references `zoto-judge-spec` — confirmed

**Automatic judge review step**: `zoto-spec-create.md` step 6 spawns `zoto-spec-judge` after user approval — confirmed (line 37).

**Old identifier grep**: Zero matches for `zoto-spec-planner`, `zoto-create-plan`, `zoto-execute-plan`, `zoto-judge-plan`, `/zoto-plan`, `/zoto-execute` (bare), `/zoto-judge` (bare), `plansDir`, `plan-feature`, `plan-[feature` across all command files.

**`{specsDir}` usage**: All three files use `{specsDir}` consistently with default `specs`.

**Linter errors**: None.
