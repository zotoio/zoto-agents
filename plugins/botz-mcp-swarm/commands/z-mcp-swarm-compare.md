---
name: z-mcp-swarm-compare
description: "Run the mcp-swarm-compare skill. Compare two botz MCP Swarm runs or a series of runs and visualise latency, error rate, and tool-eval trends in Cursor's /canvas or a self-contained HTML page. Use to check for regressions between builds, environments, or load settings."
---

# z-mcp-swarm-compare

Shortcut for the `mcp-swarm-compare` skill in this plugin.

## Usage

```
/z-mcp-swarm-compare the last two docs-server runs
/z-mcp-swarm-compare trend across all runs
```

## Instructions

Load and follow the `mcp-swarm-compare` skill (`skills/mcp-swarm-compare/SKILL.md` in this plugin). Treat any text after the command as the user's request to that skill; with no text, start the skill from its first step. Follow the skill's setup and safety steps as written, and do not add behaviour the skill does not describe.

## Related

- Skill: `mcp-swarm-compare`
