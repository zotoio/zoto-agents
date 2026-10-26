---
name: z-mcp-swarm-report
description: "Run the mcp-swarm-report skill. Visualise one botz MCP Swarm run in Cursor's /canvas or a self-contained HTML page, with overall and per-tool VUs/TPS over time (loadTimeline/timeSeries) and a tool selector showing each tool's latency, errors, and sample request/response."
---

# z-mcp-swarm-report

Shortcut for the `mcp-swarm-report` skill in this plugin.

## Usage

```
/z-mcp-swarm-report the latest docs-server run
/z-mcp-swarm-report .botz/mcp-swarm/runs/botz-run-20261023T020000Z.json with recording-docs-server.json
```

## Instructions

Load and follow the `mcp-swarm-report` skill (`skills/mcp-swarm-report/SKILL.md` in this plugin). Treat any text after the command as the user's request to that skill; with no text, start the skill from its first step. Follow the skill's setup and safety steps as written, and do not add behaviour the skill does not describe.

## Related

- Skill: `mcp-swarm-report`
