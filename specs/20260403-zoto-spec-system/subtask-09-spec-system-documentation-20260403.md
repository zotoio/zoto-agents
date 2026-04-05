# Subtask: Documentation

## Metadata
- **Subtask ID**: 09
- **Feature**: zoto-spec-system
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 03, 04, 05, 06, 07, 08
- **Created**: 20260403

## Objective

Write the plugin's README, CHANGELOG, and a guide for extending with the memory system from a future CRUX plugin.

## Deliverables Checklist
- [ ] `plugins/zoto-spec-system/README.md` — comprehensive plugin documentation
- [ ] `plugins/zoto-spec-system/CHANGELOG.md` — initial entry for v0.1.0
- [ ] `plugins/zoto-spec-system/docs/memory-extension-guide.md` — how to add memory system later
- [ ] README includes uninstall/cleanup section (remove `.zoto-spec-system/`, `specs/` is user data — keep or delete)

## Definition of Done
- [ ] README covers: installation, configuration, commands, workflow overview, examples
- [ ] README is clear enough for a first-time user to install and run `/zoto-spec-create`
- [ ] Memory extension guide describes what the memory plugin provides, how to enable it, and how it integrates with the spec lifecycle
- [ ] No references to CRUX in README or CHANGELOG
- [ ] Memory extension guide may reference CRUX as the source of the memory plugin, but makes clear it's a separate install

## Implementation Notes

**README structure:**
1. Plugin name, description, badges
2. Installation (`/add-plugin zoto-spec-system`)
3. Quick start (minimal config, first `/zoto-spec-create`)
4. Configuration (`.zoto-spec-system/config.json` schema reference)
5. Commands: `/zoto-spec-create`, `/zoto-spec-judge`, `/zoto-spec-execute` with usage examples
6. Workflow overview: Plan → Judge → Execute lifecycle
7. Plan file structure (directory, index, subtasks, assessment, execution report)
8. Extensions (memory system, others)
9. Uninstall/cleanup (remove plugin, `.zoto-spec-system/` config; `specs/` is user data)
10. License

**Memory extension guide** (`docs/memory-extension-guide.md`):
- Explain the memory system concept (dream, REM sleep, mindreader)
- Describe commands it adds (`/crux-dream`, `/crux-mindreader`)
- Show how to enable: install the memory plugin, set `extensions.memory.enabled: true` in config
- Describe how memories integrate with the spec lifecycle (dream after spec execution, REM sleep for consolidation)
- Note: the memory plugin is a separate install from a future CRUX release

**CHANGELOG:**
- Initial entry for v0.1.0 listing all features

## Testing Strategy
- Verify README renders correctly as markdown
- Verify all command references match actual command files
- Verify config examples match the schema from subtask 02

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
