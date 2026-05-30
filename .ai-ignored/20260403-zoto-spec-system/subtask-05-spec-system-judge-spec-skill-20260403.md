# Subtask: Skill zoto-judge-spec

## Metadata
- **Subtask ID**: 05
- **Feature**: zoto-spec-system
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 03
- **Created**: 20260403

## Objective

Create the `zoto-judge-spec` skill — independent assessment of the repository or specific plans. Supports two modes: repo-level audit (no args) and plan-specific assessment (with path). Generalized from `crux-judge-plan`.

## Deliverables Checklist
- [ ] Skill file at `plugins/zoto-spec-system/skills/zoto-judge-spec/SKILL.md`
- [ ] Frontmatter with name and description
- [ ] Six assessment dimensions with weights and scoring rubric (1-5)
- [ ] Verdict thresholds: Approve (4.0+), Conditional (3.0-3.9), Reject (<3.0)
- [ ] Repo assessment workflow (no target)
- [ ] Plan assessment workflow (with target)
- [ ] Subtask Manifest validation step
- [ ] Dependency graph audit step
- [ ] Risk analysis step
- [ ] Report format template
- [ ] Report location rules (`specsDir/assessment-repo-[yyyymmdd].md` for repo, plan dir for plans)

## Definition of Done
- [ ] Both assessment modes fully documented
- [ ] No references to CRUX, integrity-expert, or CRUX-specific tooling
- [ ] Assessment dimensions are generic and applicable to any repo
- [ ] Report format is self-contained and actionable

## Implementation Notes

Adapt from `crux-judge-plan`:
- Remove all CRUX references
- Repo assessment mode: instead of spawning `integrity-expert`, instruct the judge agent to perform the checks directly (the consuming repo may not have an integrity-expert agent)
- Use generic assessment criteria — no references to CRUX sync, shell script conventions, or CI/CD specific to this repo
- Convention Compliance dimension should check against the consuming repo's own patterns, not CRUX patterns
- Report location uses `specsDir` from config

## Testing Strategy
- Verify no CRUX references
- Verify both modes are documented
- Verify scoring rubric is complete

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
