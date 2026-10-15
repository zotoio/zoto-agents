---
name: z-mcp-swarm-flow
description: "Run the mcp-swarm-flow skill. Turn a task described in words into a botz MCP Swarm suite whose steps call several MCP servers in order and pass values between them."
---

# z-mcp-swarm-flow

Shortcut for the `mcp-swarm-flow` skill in this plugin.

## Usage

```
/z-mcp-swarm-flow find an open bug on GitHub, file it in Jira, and post the key to Slack
/z-mcp-swarm-flow add a Jira lookup step to the triage suite
```

## Instructions

Load and follow the `mcp-swarm-flow` skill (`skills/mcp-swarm-flow/SKILL.md` in this plugin). Treat any text after the command as the user's request to that skill; with no text, start the skill from its first step. Follow the skill's setup and safety steps as written, and do not add behaviour the skill does not describe.

## Related

- Skill: `mcp-swarm-flow`
