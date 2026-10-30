---
name: z-mcp-swarm-lite-analyse
description: "Run the mcp-swarm-lite-analyse skill. Analyse a failed botz MCP Swarm run, review proposed suite fixes, and accept or reject them by explicit proposal id."
---

# z-mcp-swarm-lite-analyse

Shortcut for the `mcp-swarm-lite-analyse` skill in this plugin.

## Usage

```
/z-mcp-swarm-lite-analyse why did the demo run fail, and what should change?
/z-mcp-swarm-lite-analyse accept p1, reject p3 from runs/demo-123.analysis.json
```

## Instructions

Load and follow the `mcp-swarm-lite-analyse` skill (`skills/mcp-swarm-lite-analyse/SKILL.md` in this plugin). Treat any text after the command as the user's request to that skill; with no text, start the skill from its first step. Follow the skill's setup and safety steps as written, and do not add behaviour the skill does not describe.

## Related

- Skill: `mcp-swarm-lite-analyse`
