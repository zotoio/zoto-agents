---
name: z-mcp-swarm-record-replay
description: "Run the mcp-swarm-record-replay skill. Record redacted MCP wire traffic from a server with botz MCP Swarm and replay it against the same or another server, as recorded, at maximum rate, or paced. Use to reproduce a session, compare server builds on identical traffic, or create fixtures."
---

# z-mcp-swarm-record-replay

Shortcut for the `mcp-swarm-record-replay` skill in this plugin.

## Usage

```
/z-mcp-swarm-record-replay record node server.mjs
/z-mcp-swarm-record-replay replay recording-docs-server.json max-rate
```

## Instructions

Load and follow the `mcp-swarm-record-replay` skill (`skills/mcp-swarm-record-replay/SKILL.md` in this plugin). Treat any text after the command as the user's request to that skill; with no text, start the skill from its first step. Follow the skill's setup and safety steps as written, and do not add behaviour the skill does not describe.

## Related

- Skill: `mcp-swarm-record-replay`
