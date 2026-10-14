---
name: z-mcp-swarm-diagnose
description: "Run the mcp-swarm-diagnose skill. Diagnose failed botz MCP Swarm suites, missing credentials, invalid fixtures, execution errors, and performance regressions from CLI diagnostics and run reports."
---

# z-mcp-swarm-diagnose

Shortcut for the `mcp-swarm-diagnose` skill in this plugin.

## Usage

```
/z-mcp-swarm-diagnose why did the docs-server run exit 2?
/z-mcp-swarm-diagnose compare base.json head.json
```

## Instructions

Load and follow the `mcp-swarm-diagnose` skill (`skills/mcp-swarm-diagnose/SKILL.md` in this plugin). Treat any text after the command as the user's request to that skill; with no text, start the skill from its first step. Follow the skill's setup and safety steps as written, and do not add behaviour the skill does not describe.

## Related

- Skill: `mcp-swarm-diagnose`
