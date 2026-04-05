# Subtask: Rename Agent File, Create Executor Agent, Update Agent Contents

## Metadata
- **Subtask ID**: 02
- **Feature**: Plan-to-Spec Rename
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260405

## Objective
Rename the planner agent file from `zoto-spec-planner.md` to `zoto-spec-generator.md`, narrow its scope to spec creation only, create a new `zoto-spec-executor.md` agent for execution flow, and update all references within all three agent files.

## Deliverables Checklist
- [x] Rename `plugins/zoto-spec-system/agents/zoto-spec-planner.md` → `plugins/zoto-spec-system/agents/zoto-spec-generator.md`
- [x] Update `agents/zoto-spec-generator.md`: frontmatter `name: zoto-spec-generator`, narrow to creation focus, remove execution mode content
- [x] Create `plugins/zoto-spec-system/agents/zoto-spec-executor.md` with execution expertise extracted from the former planner agent
- [x] Update `agents/zoto-spec-judge.md`: all references to old identifiers updated per rename mapping

## Definition of Done
- [x] `agents/zoto-spec-generator.md` exists with `name: zoto-spec-generator`, focused on creation/planning
- [x] `agents/zoto-spec-executor.md` exists with `name: zoto-spec-executor`, focused on execution
- [x] `agents/zoto-spec-planner.md` no longer exists
- [x] No remaining references to `zoto-spec-planner` in any agent file
- [x] No remaining references to `zoto-create-plan`, `zoto-execute-plan`, `zoto-judge-plan` in any agent file
- [x] No remaining references to `/zoto-plan`, `/zoto-execute`, `/zoto-judge` (use `/zoto-spec-create`, `/zoto-spec-execute`, `/zoto-spec-judge`)
- [x] Config key references updated (`plansDir` → `specsDir`, `plan.*` → `spec.*`)
- [x] Artifact naming patterns updated (`plan-[feature]-[date].md` → `spec-[feature]-[date].md`)
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

### Files to modify (within `plugins/zoto-spec-system/`)
1. `agents/zoto-spec-generator.md` (after rename from `zoto-spec-planner.md`)
2. `agents/zoto-spec-executor.md` (new file)
3. `agents/zoto-spec-judge.md` (update references)

### Agent Responsibility Split

**`zoto-spec-generator`** (renamed from `zoto-spec-planner`):
- Frontmatter: `name: zoto-spec-generator`, description about spec creation specialist
- Expertise: Initiative Planning, Dependency Management (planning aspects)
- Skills: `zoto-create-spec` (primary), references `zoto-judge-spec` and `zoto-execute-spec` for cross-reference
- Operating Modes: Keep "Planning Mode (zoto-create-spec skill) — `/zoto-spec-create`" only, updated to include automatic judge review as the final step
- Remove: Execution Mode section (moves to executor), Judge Mode section (stays with judge)
- Add: Reference to spawning `zoto-spec-judge` subagent as the final step of spec creation
- Keep: Plan File Formats (templates used during creation), Critical Rules → During Planning
- Remove: Critical Rules → During Execution (moves to executor)
- Update all directory/file patterns, config references

**`zoto-spec-executor`** (new agent):
- Frontmatter: `name: zoto-spec-executor`, `model: claude-4.6-opus-high-thinking`, description about execution coordination specialist
- Expertise: Subagent Coordination, Progress Tracking, Quality Assurance, Dependency Management (execution)
- Skills: `zoto-execute-spec` (primary)
- Operating Modes: "Execution Mode (zoto-execute-spec skill) — `/zoto-spec-execute`" — extract from current planner
- Include: Subagent Coordination section from current planner, execution-specific Critical Rules
- Include: Plan File Formats section (needed to read/update spec files during execution)
- Config loading: same config references as generator
- Reference `zoto-spec-judge` for adversarial verification
- Reference `zoto-spec-generator` for cross-reference

**`zoto-spec-judge`** (existing, update references only):
- Update references to skills: `zoto-judge-plan` → `zoto-judge-spec`
- Update references to other skills/agents/commands per rename mapping
- Keep existing structure and content

### Approach
1. Use `git mv` for `zoto-spec-planner.md` → `zoto-spec-generator.md`
2. Edit `zoto-spec-generator.md`: rename all identifiers, narrow scope to creation
3. Create `zoto-spec-executor.md`: extract execution content from old planner, apply rename mapping
4. Edit `zoto-spec-judge.md`: update identifier references

### DO NOT modify files outside of `plugins/zoto-spec-system/agents/`

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Verify `zoto-spec-generator.md` and `zoto-spec-executor.md` exist
- Verify `zoto-spec-planner.md` no longer exists
- Grep for remaining old identifiers in agent files

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 20260405
- Completed: 20260405

### Work Log
1. Used `git mv` to rename `zoto-spec-planner.md` → `zoto-spec-generator.md`
2. Rewrote `zoto-spec-generator.md`: updated frontmatter to `name: zoto-spec-generator`, narrowed scope to spec creation only (removed Execution Mode, Judge Mode, Subagent Coordination, and execution Critical Rules), added judge review as final creation step, renamed all identifiers per mapping
3. Created `zoto-spec-executor.md`: extracted execution content from former planner (Execution Mode, Subagent Coordination, execution Critical Rules), applied full rename mapping, set frontmatter with `name: zoto-spec-executor`
4. Updated `zoto-spec-judge.md`: replaced all old identifier references (`zoto-judge-plan` → `zoto-judge-spec`, `zoto-spec-planner` → `zoto-spec-executor`, `/zoto-judge` → `/zoto-spec-judge`, `/zoto-execute` → `/zoto-spec-execute`, `plansDir` → `specsDir`, `plans` → `specs`, "plan" → "spec" in descriptions)
5. Verified via grep: zero remaining old references in any agent file

### Blockers Encountered
None

### Files Modified
- `plugins/zoto-spec-system/agents/zoto-spec-generator.md` (renamed from `zoto-spec-planner.md`, rewritten)
- `plugins/zoto-spec-system/agents/zoto-spec-executor.md` (new file)
- `plugins/zoto-spec-system/agents/zoto-spec-judge.md` (reference updates)

### Adversarial Verification (Judge)
- **Verdict**: Verified
- **Verified by**: zoto-spec-judge
- **Date**: 20260405

#### Verification Details
1. **`zoto-spec-planner.md` removed** — Confirmed: file does not exist on disk
2. **`zoto-spec-generator.md` exists with correct content** — Confirmed:
   - Frontmatter: `name: zoto-spec-generator`, `model: claude-4.6-opus-high-thinking` ✓
   - Description: "Config-driven spec creation specialist" ✓
   - Only operating mode: "Spec Creation Mode (zoto-create-spec skill) — `/zoto-spec-create`" ✓
   - No Execution Mode section ✓
   - Judge review as final creation step (step 5 in workflow) ✓
   - Config keys: `specsDir`, `spec.maxSubtasks`, `spec.parallelLimit`, `spec.adversarialVerification` ✓
   - Artifact pattern: `spec-[feature-name]-[yyyymmdd].md` ✓
3. **`zoto-spec-executor.md` exists with correct content** — Confirmed:
   - Frontmatter: `name: zoto-spec-executor`, `model: claude-4.6-opus-high-thinking` ✓
   - Description: "Execution coordination specialist" ✓
   - References `zoto-execute-spec` skill as primary (line 30) ✓
   - References `zoto-spec-judge` for adversarial verification (lines 31, 181, 194) ✓
   - Subagent Coordination section present with correct agent table ✓
   - Execution Mode operating mode with full workflow ✓
   - Config keys all use new naming ✓
4. **`zoto-spec-judge.md` references updated** — Confirmed:
   - Skill: `zoto-judge-spec` ✓
   - Agent reference: `zoto-spec-executor` (line 28) ✓
   - Commands: `/zoto-spec-execute`, `/zoto-spec-judge` ✓
   - Config: `specsDir`, `unitOfWork`, `spec` terminology ✓
5. **No remaining old identifiers** — Confirmed: grep for `zoto-spec-planner`, `zoto-create-plan`, `zoto-execute-plan`, `zoto-judge-plan`, `/zoto-plan`, `/zoto-execute[^-]`, `/zoto-judge[^-]`, `plansDir`, `plan.maxSubtasks`, `plan.parallelLimit`, `plan.adversarialVerification`, `plan-[feature` all returned zero matches across all agent files
6. **No linter errors** — Confirmed: ReadLints returned clean for all three agent files
