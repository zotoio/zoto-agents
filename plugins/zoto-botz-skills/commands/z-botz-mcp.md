---
name: z-botz-mcp
description: "Run the botz-mcp skill. Find, download, pin, and apply a governed skill or subagent from the botz.ai MCP server for the task at hand, or request a new one."
---

# z-botz-mcp

Shortcut for the `botz-mcp` skill in this plugin.

## Usage

```
/z-botz-mcp
/z-botz-mcp find a skill for writing release notes
/z-botz-mcp check for skill updates
```

## Instructions

Load and follow the `botz-mcp` skill (`skills/botz-mcp/SKILL.md` in this plugin). Treat any text after the command as the user's request to that skill; with no text, start the skill from its first step. Follow the skill's steps and safety rules as written, and do not add behaviour the skill does not describe.

## Related

- Skill: `botz-mcp`
- MCP server: `botz` (`https://mcp.botz.ai/mcp`, OAuth)
