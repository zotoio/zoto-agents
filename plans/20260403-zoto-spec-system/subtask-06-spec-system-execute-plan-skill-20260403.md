# Subtask: Skill zoto-execute-plan

## Metadata
- **Subtask ID**: 06
- **Feature**: zoto-spec-system
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 03
- **Created**: 20260403

## Objective

Create the `zoto-execute-plan` skill — phased execution of engineering plans with manifest-driven agent dispatch, adversarial verification per subtask, and persistent execution reports. Generalized from `crux-execute-plan`.

## Deliverables Checklist
- [ ] Skill file at `plugins/zoto-spec-system/skills/zoto-execute-plan/SKILL.md`
- [ ] Frontmatter with name and description
- [ ] 8-step workflow: load & validate manifest, confirm, execute, adversarial verify, final verify, write execution report, user review, mark complete
- [ ] Manifest-driven agent dispatch (Subagent column is single source of truth)
- [ ] Adversarial verification step — fresh agent verifies each subtask's deliverables
- [ ] Execution report format (`execution-report-[feature]-[yyyymmdd].md`)
- [ ] Dependency management, parallel limits, error handling rules
- [ ] Resume support for interrupted execution
- [ ] Progress update rules

## Definition of Done
- [ ] All 8 workflow steps fully documented
- [ ] Adversarial verification is mandatory (not optional)
- [ ] Execution report written to plan directory
- [ ] No references to CRUX, integrity-expert, or CRUX-specific tooling
- [ ] Agent dispatch uses manifest, never overrides assignments

## Implementation Notes

Adapt from `crux-execute-plan`:
- Remove all CRUX references
- Adversarial verification: instead of spawning `integrity-expert`, the skill instructs spawning a fresh `generalPurpose` agent in adversarial mode — the consuming repo may not have integrity-expert
- Replace `./scripts/test.sh` references with generic "run the project's test suite" (configurable via config or auto-detected)
- Replace ReadLints references with generic "check for linter errors on modified files"
- Execution report goes to `plansDir/[plan-directory]/` with the standard `-[yyyymmdd]` suffix
- Use `unitOfWork` from config in user-facing messages

## Testing Strategy
- Verify no CRUX references
- Verify adversarial verification step is present and mandatory
- Verify execution report format is documented

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
