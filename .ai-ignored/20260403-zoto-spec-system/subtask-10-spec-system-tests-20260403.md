# Subtask: Tests

## Metadata
- **Subtask ID**: 10
- **Feature**: zoto-spec-system
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 07, 08, 09
- **Created**: 20260403

## Objective

Create validation tests for the plugin: structure checks, config schema validation, and content integrity.

## Deliverables Checklist
- [ ] Test directory at `plugins/zoto-spec-system/tests/`
- [ ] Plugin structure test — verify all expected files and directories exist
- [ ] Config schema test — verify example config is valid, defaults work, invalid config is rejected
- [ ] Content integrity test — verify no CRUX references in any plugin file
- [ ] Naming convention test — verify all assets use `zoto-` prefix consistently
- [ ] Cross-reference test — verify commands reference correct skills, agent references correct skills
- [ ] Test runner script or instructions in README

## Definition of Done
- [ ] All tests are runnable with standard tools (bash, python, or bats)
- [ ] Tests pass on the current plugin state
- [ ] Tests catch regressions (missing files, broken references, CRUX leakage)

## Implementation Notes

Tests can be implemented as:
- **Bash/Bats tests** (matching existing CRUX-Compress test patterns) — preferred for consistency
- **Python tests** if more complex validation is needed (e.g., JSON schema validation)

Test categories:

**Structure validation:**
- `.cursor-plugin/plugin.json` exists and is valid JSON
- All directories listed in plugin.json exist
- All files referenced in hooks.json exist
- LICENSE file exists

**Config schema:**
- Example config parses as valid JSON
- Config with missing fields uses defaults correctly
- Config with invalid `unitOfWork` type is caught

**Content integrity:**
- Grep all `.md`, `.mdc`, `.sh`, `.json` files for `crux`, `CRUX`, `crux-` — must be zero matches (except in memory extension guide where CRUX is mentioned as the source)
- All `zoto-` prefixed references in commands match actual skill/agent filenames

**Cross-references:**
- Each command file references an agent that exists
- Each command references skills that exist
- Agent references skills that exist
- Hooks.json references scripts that exist

## Testing Strategy
- Meta: these ARE the tests — verify they pass after all other subtasks complete

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
