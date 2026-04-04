# Subtask: Agent zoto-spec-planner

## Metadata
- **Subtask ID**: 03
- **Feature**: zoto-spec-system
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01, 02
- **Created**: 20260403

## Objective

Create the `zoto-spec-planner` agent definition — a generic, config-driven planning specialist that handles plan, judge, and execute modes. Must be fully decoupled from CRUX.

## Deliverables Checklist
- [ ] Agent file at `plugins/zoto-spec-system/agents/zoto-spec-planner.md`
- [ ] Frontmatter with name, description, model
- [ ] Three operating modes: Planning, Judge, Execution
- [ ] Config loading from `.spec-system/config.json`
- [ ] Subtask Manifest specification (file, subagent, dependencies, phase, status)
- [ ] Subtask file template
- [ ] Plan directory structure documentation
- [ ] Available subagents table (generic — no CRUX-specific agents)
- [ ] Delegation guidelines and critical rules
- [ ] `unitOfWork` interpolation from config

## Definition of Done
- [ ] Agent definition is complete and self-contained
- [ ] No references to CRUX, CRUX.md, crux-utils, or CRUX notation
- [ ] Config-driven — all repo-specific values come from config, not hardcoded
- [ ] References `zoto-create-plan`, `zoto-judge-plan`, `zoto-execute-plan` skills
- [ ] Plan file naming uses `[yyyymmdd]-[feature-name]/` convention with `-[yyyymmdd]` suffix on all files

## Implementation Notes

Generalize from the existing `crux-planner.md` agent with these changes:
- Remove all CRUX references (CRUX.md loading, crux-utils, CRUX notation awareness)
- Replace `crux-` prefix with `zoto-` on all asset references
- Make the agent read `.spec-system/config.json` for repo-specific settings
- Use `unitOfWork` from config in user-facing messages
- Use `plansDir` from config instead of hardcoded `plans/`
- Available subagents should be generic Cursor types: `generalPurpose`, `explore`, `shell`
- Do NOT include CRUX-specific subagents (crux-cursor-rule-manager, crux-cursor-memory-manager)
- Include a note about optional memory extension under a "## Extensions" section

The plan directory structure, index file template, and subtask file template from the existing crux-planner should be adapted with generic naming.

## Testing Strategy
- Verify no CRUX references in the file
- Verify all `zoto-` prefixed skill/command references are consistent
- Verify config loading instructions are present

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
