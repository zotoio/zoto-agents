# Subtask: Plugin Scaffold

## Metadata
- **Subtask ID**: 01
- **Feature**: zoto-spec-system
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260403

## Objective

Create the plugin directory structure and manifest following the Cursor marketplace plugin specification.

## Deliverables Checklist
- [ ] Directory `plugins/zoto-spec-system/` created
- [ ] `.cursor-plugin/plugin.json` manifest with correct schema
- [ ] `agents/` directory stub
- [ ] `skills/` directory stub
- [ ] `commands/` directory stub
- [ ] `rules/` directory stub
- [ ] `hooks/` directory stub
- [ ] `LICENSE` file (MIT)
- [ ] `.gitkeep` files in empty directories
- [ ] Plugin.json validated against a real marketplace plugin manifest (e.g. `cursor/plugins/continual-learning/.cursor-plugin/plugin.json`)
- [ ] Skills directory structure validated against the agentskills.io specification (SKILL.md with frontmatter)

## Definition of Done
- [ ] Plugin manifest validates against Cursor marketplace spec (https://github.com/cursor/plugins)
- [ ] Skill structure validates against agentskills.io specification
- [ ] Directory structure matches `cursor/plugins` convention
- [ ] No files reference CRUX or CRUX-specific tooling

## Implementation Notes

**Reference**: https://github.com/cursor/plugins — see `continual-learning/.cursor-plugin/plugin.json` for a working example of the manifest format.

The plugin manifest should follow this format:

```json
{
  "name": "zoto-spec-system",
  "displayName": "Spec System",
  "version": "0.1.0",
  "description": "Structured spec workflow: plan, judge, and execute engineering initiatives with adversarial verification.",
  "author": {
    "name": "zotoio",
    "email": "plugins@zotoio.com"
  },
  "homepage": "https://github.com/zotoio/spec-system",
  "repository": "https://github.com/zotoio/spec-system",
  "license": "MIT",
  "keywords": ["planning", "execution", "specs", "engineering", "adversarial-verification"],
  "category": "developer-tools",
  "tags": ["planning", "execution", "workflow"],
  "agents": "./agents/",
  "skills": "./skills/",
  "commands": "./commands/",
  "rules": "./rules/",
  "hooks": "./hooks/hooks.json"
}
```

Directory structure:

```
plugins/zoto-spec-system/
├── .cursor-plugin/
│   └── plugin.json
├── agents/
├── skills/
├── commands/
├── rules/
├── hooks/
├── LICENSE
└── README.md (stub — full content in subtask 09)
```

## Testing Strategy
- Verify `plugin.json` is valid JSON with all required fields
- Verify all directories exist

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
