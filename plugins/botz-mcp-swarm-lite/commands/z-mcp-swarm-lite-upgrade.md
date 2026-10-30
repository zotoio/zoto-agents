---
name: z-mcp-swarm-lite-upgrade
description: "Run the mcp-swarm-lite-upgrade skill. Upgrade the botz MCP Swarm CLI and move saved suites, credentials, run reports, and service state into the current layout. Use when updating MCP Swarm, after release notes mention moved files, or when old .botz/suites, .runs, .swarm-data, or .otel directories are present."
---

# z-mcp-swarm-lite-upgrade

Shortcut for the `mcp-swarm-lite-upgrade` skill in this plugin.

## Usage

```
/z-mcp-swarm-lite-upgrade
/z-mcp-swarm-lite-upgrade preview only
```

## Instructions

Load and follow the `mcp-swarm-lite-upgrade` skill (`skills/mcp-swarm-lite-upgrade/SKILL.md` in this plugin). Treat any text after the command as the user's request to that skill; with no text, start the skill from its first step. Follow the skill's setup and safety steps as written, and do not add behaviour the skill does not describe.

## Related

- Skill: `mcp-swarm-lite-upgrade`
