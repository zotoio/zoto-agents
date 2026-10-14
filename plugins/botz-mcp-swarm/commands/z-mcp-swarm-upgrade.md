---
name: z-mcp-swarm-upgrade
description: "Run the mcp-swarm-upgrade skill. Upgrade the botz MCP Swarm CLI and move saved suites, credentials, run reports, and service state into the current layout. Use when updating MCP Swarm, after release notes mention moved files, or when old .botz/suites, .runs, .swarm-data, or .otel directories are present."
---

# z-mcp-swarm-upgrade

Shortcut for the `mcp-swarm-upgrade` skill in this plugin.

## Usage

```
/z-mcp-swarm-upgrade
/z-mcp-swarm-upgrade preview only
```

## Instructions

Load and follow the `mcp-swarm-upgrade` skill (`skills/mcp-swarm-upgrade/SKILL.md` in this plugin). Treat any text after the command as the user's request to that skill; with no text, start the skill from its first step. Follow the skill's setup and safety steps as written, and do not add behaviour the skill does not describe.

## Related

- Skill: `mcp-swarm-upgrade`
