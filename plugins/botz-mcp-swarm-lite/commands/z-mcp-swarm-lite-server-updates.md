---
name: z-mcp-swarm-lite-server-updates
description: "Run the mcp-swarm-lite-server-updates skill. Check MCP servers under test for updates (serverInfo version, negotiated MCP spec/protocol version, capabilities, and every tool, resource, template and prompt schema), review the diff, surgically update only the suites and scenarios that reference changed primitives, and record a changelog entry on the server version. Nothing changes until a reviewed update is accepted."
---

# z-mcp-swarm-lite-server-updates

Shortcut for the `mcp-swarm-lite-server-updates` skill in this plugin.

## Usage

```
/z-mcp-swarm-lite-server-updates check every server in the docs project
/z-mcp-swarm-lite-server-updates accept all and note "2.0 release"
```

## Instructions

Load and follow the `mcp-swarm-lite-server-updates` skill (`skills/mcp-swarm-lite-server-updates/SKILL.md` in this plugin). Treat any text after the command as the user's request to that skill; with no text, start the skill from its first step. Follow the skill's setup and safety steps as written, and do not add behaviour the skill does not describe.

## Related

- Skill: `mcp-swarm-lite-server-updates`
