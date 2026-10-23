# Botz Skills

Consume governed [Agent Skills](https://agentskills.io) and subagent definitions
from the hosted [botz.ai](https://botz.ai) MCP server, with the plumbing hidden
from the user. Docs: <https://zotoio.github.io/zoto-agents/botz-skills/>

- **Locate** skills (`skill_search`) and subagents (`agent_search`)
  semantically and **download** them as token-frugal
  [CRUX Compress](https://compress.md) documents (`skill_get` / `agent_get`).
- **Zero drift**: every consumed artifact is pinned by permanent guid +
  version in `.botz/skills.lock.json`. Server-side forks, combinations, or
  evolutions never change what a pinned consumer receives.
- **Evolution aware**: `skill_updates` is checked once per session and the
  user is told about enhancements (changelog included). Saying
  "auto accept skill updates" flips the lock to `"evolution": "auto"`.
- **Self-extending**: uncovered needs go through `skill_request` /
  `agent_request`; creation is conversational, so the server can ask
  clarifying questions mid-request.

## Install

```
/add-plugin zoto-botz-skills
```

## Connection

The plugin ships an MCP server entry named `botz`:

```json
{ "mcpServers": { "botz": { "url": "https://mcp.botz.ai/mcp" } } }
```

`https://mcp.botz.ai/mcp` uses MCP OAuth: your client opens a browser sign-in
the first time it connects. There are no tokens or environment variables to
set, and none are stored in the plugin. To use a self-hosted botz-mcp server,
override the `botz` entry's `url` in your own MCP config.

## Contents

| Path | What |
| --- | --- |
| `skills/botz-mcp/` | The client skill (canonical copy lives in [zotoio/botz-mcp](https://github.com/zotoio/botz-mcp) `skills/botz-mcp/SKILL.md`) |
| `commands/z-botz-mcp.md` | `/z-botz-mcp` shortcut for the skill |
| `mcp.json` / `.mcp.json` | `botz` MCP server entry (Cursor / Claude Code) |

## Keeping the skill in sync

The skill is authored in `zotoio/botz-mcp`. After it changes there, copy
`skills/botz-mcp/SKILL.md` into `plugins/zoto-botz-skills/skills/botz-mcp/`,
bump the version in all four manifests, and add a CHANGELOG entry.
