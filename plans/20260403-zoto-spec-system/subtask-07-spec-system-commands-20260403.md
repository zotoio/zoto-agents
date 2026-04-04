# Subtask: Commands

## Metadata
- **Subtask ID**: 07
- **Feature**: zoto-spec-system
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 04, 05, 06
- **Created**: 20260403

## Objective

Create the three slash commands that serve as user entry points: `/zoto-plan`, `/zoto-judge`, `/zoto-execute`. Each command spawns the `zoto-spec-planner` agent with the appropriate skill.

## Deliverables Checklist
- [ ] Command file at `plugins/zoto-spec-system/commands/zoto-plan.md`
- [ ] Command file at `plugins/zoto-spec-system/commands/zoto-judge.md`
- [ ] Command file at `plugins/zoto-spec-system/commands/zoto-execute.md`
- [ ] Each command documents usage, argument handling, and what happens
- [ ] `/zoto-plan`: no args (interactive), file ref (design doc), text (description)
- [ ] `/zoto-judge`: no args (repo assessment), plan path (plan assessment)
- [ ] `/zoto-execute`: no args (latest plan), plan path (specific plan), `--resume` flag
- [ ] All commands reference `zoto-spec-planner` agent and corresponding `zoto-*` skills
- [ ] Related section links the three commands together

## Definition of Done
- [ ] All three command files created
- [ ] Usage examples are clear and correct
- [ ] No references to CRUX
- [ ] Commands pass `$ARGUMENTS` to the spawned agent
- [ ] Output locations documented (plan directory, assessment files, execution report)

## Implementation Notes

Adapt from the existing `crux-plan.md`, `crux-judge.md`, `crux-execute.md` commands:
- Replace all `crux-` with `zoto-` prefix
- Replace `crux-planner` with `zoto-spec-planner`
- Replace skill references with `zoto-create-plan`, `zoto-judge-plan`, `zoto-execute-plan`
- Remove all CRUX references
- Use `plansDir` from config for output paths
- `/zoto-judge` repo mode writes to `plansDir/assessment-repo-[yyyymmdd].md`
- `/zoto-judge` plan mode writes to the plan's own directory
- `/zoto-execute` writes execution report to the plan's own directory

## Testing Strategy
- Verify all three files exist
- Verify no CRUX references
- Verify cross-references between commands are consistent

## Execution Notes
[To be filled by executing agent]

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
