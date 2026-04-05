# Subtask: Skill zoto-create-spec

## Metadata
- **Subtask ID**: 04
- **Feature**: zoto-spec-system
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 03
- **Created**: 20260403

## Objective

Create the `zoto-create-spec` skill — a guided workflow for creating structured engineering plans. Generalized from `crux-create-plan` with no CRUX dependencies.

## Deliverables Checklist
- [ ] Skill file at `plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md`
- [ ] Frontmatter with name and description
- [ ] 7-step workflow: gather requirements, explore codebase, propose decisions, determine dependencies, assign subagents, create plan files, review and finalize
- [ ] Dependency sequencing rules (lower IDs never depend on higher IDs)
- [ ] Subagent assignment table (generic types only)
- [ ] Plan file naming conventions with `-[yyyymmdd]` suffix
- [ ] Config-driven `specsDir` and `unitOfWork`

## Definition of Done
- [ ] Skill is complete and follows SKILL.md frontmatter format
- [ ] No references to CRUX or CRUX-specific tooling
- [ ] Workflow steps match the spec system's planning mode
- [ ] All conventions documented (directory names, file names, date format)

## Implementation Notes

Adapt from the existing `crux-create-plan` SKILL.md:
- Replace all `crux-` references with `zoto-` prefix
- Remove references to CRUX compression, CRUX files, crux-utils
- Make `specsDir` configurable (read from `.zoto-spec-system/config.json`)
- Subagent table should only include generic types: `generalPurpose`, `explore`, `shell`
- Add extension note: "If memory extension is installed, `memory-manager` is also available as a subagent type"
- Keep the Subtask Manifest table format as the source of truth for agent assignments

## Testing Strategy
- Verify no CRUX references
- Verify skill frontmatter is valid
- Verify naming conventions are consistent with the agent definition

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
