---
name: z-mcp-swarm
description: "Run the mcp-swarm skill. Capture, validate, refresh, and run MCP test suites with the botz MCP Swarm CLI. Use for testing MCP servers, repeatable tool assertions, load tests, and CI reports."
---

# z-mcp-swarm

Shortcut for the `mcp-swarm` skill in this plugin.

## Usage

```
/z-mcp-swarm capture http://127.0.0.1:3000/mcp as docs-server and run it
/z-mcp-swarm run docs-server with concurrency 4 for 30 seconds
```

## Instructions

Load and follow the `mcp-swarm` skill (`skills/mcp-swarm/SKILL.md` in this plugin). Treat any text after the command as the user's request to that skill; with no text, start the skill from its first step. Follow the skill's setup and safety steps as written, and do not add behaviour the skill does not describe.

## Related

- Skill: `mcp-swarm`
