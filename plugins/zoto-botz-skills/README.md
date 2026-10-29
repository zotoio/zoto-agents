# Botz Skills

Consume governed [Agent Skills](https://agentskills.io) and subagent definitions
from the hosted [botz.ai](https://botz.ai) MCP server, with the plumbing hidden
from the user. Docs: <https://zotoio.github.io/zoto-agents/botz-skills/>

- **Locate** skills (`skill_search`) and subagents (`agent_search`)
  semantically and **download** them as token-frugal
  [CRUX Compress](https://compress.md) bundles via `skill_get_compressed` / `agent_get_compressed` (incorporating `SKILL.md` + all `references/` and `scripts/` in one call; or plain Markdown via `skill_get` + `skill_resource_get` on demand; `agent_get` for installable client definitions).
- **Chained & Batched Lifecycle (`references/chained-workflows.md`)**: Guides agents through the canonical loop:
  `search -> select -> use (get_compressed + batch resources) -> feedback -> evolve (for targeted refinements) / fork (for structural divergence) / create (for net-new capabilities) -> select (@canary / draft) -> test -> rate (agent result scoring via sampling/feedback) -> promote`.
- **Canary A/B Testing & Promotion**: Draft versions created via `skill_evolve` enter canary A/B testing (`@live` vs `@canary`). High ratings from agent result scoring via MCP `sampling/createMessage` and `skill_feedback` automatically promote `@canary` to `@live`. Admin clients can promote immediately via MCP `skill_promote`; standard clients manage promotion in the Web Console.
- **24-Hour Generation Quotas**: Enforces rolling 24h per-user and per-team authoring quotas (default `10/24h`), degrading gracefully to read-only (`skill_search`, `skill_get_compressed`, `skill_resources_get`, `skill_feedback`) when exhausted.
- **Zero drift**: every consumed artifact is pinned by permanent guid +
  version in `.botz/skills.lock.json`. Server-side forks, combinations, or
  evolutions never change what a pinned consumer receives.
- **Evolution aware**: `skill_updates` is checked once per session and the
  user is told about enhancements (changelog included). Saying
  "auto accept skill updates" flips the lock to `"evolution": "auto"`.
- **Self-extending**: uncovered needs go through `skill_request` /
  `agent_request`; creation is conversational, so the server can ask
  clarifying questions mid-request.
- **Full 7-Stage MCP Spec Support (v0.5.0 / Skill v7)**: Supports all 24 tools (`outputSchema` + `structuredContent`, 5-field `ToolAnnotations`), 4 `@mcp.prompt` slash commands (`/use_skill`, `/author_skill`, `/evolve_skill`, `/delegate_subagent`), 16 resource URI templates (including `skill://{name}/illustration` binary `BlobResourceContents`), `completion/complete`, 4-stage `notifications/progress`, and client `sampling/createMessage` + `roots/list` workspace detection.

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

## Headless / CI

IDE clients never need a token. API keys are only for non-interactive callers
(CI jobs, scripts, servers): mint a `bzt_` key in the botz management console
at `/admin` → **IAM · API tokens**, store it as a CI secret, and send it as an
`Authorization: Bearer` header:

```bash
# placeholder only - read the key from your CI secret store
curl -sS https://mcp.botz.ai/mcp \
  -H "Authorization: Bearer $BOTZ_API_KEY" \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Contents

| Path | What |
| --- | --- |
| `skills/botz-mcp/` | The client skill (`SKILL.md` v7, canonical copy in [zotoio/botz-mcp](https://github.com/zotoio/botz-mcp)) |
| `skills/botz-mcp/references/chained-workflows.md` | Canonical chained & batched workflow guide (`search -> select -> use -> feedback -> evolve/fork/create -> select -> test -> rate -> promote`, canary A/B testing, and 24h quotas) |
| `commands/z-botz-mcp.md` | `/z-botz-mcp` shortcut for the skill |
| `mcp.json` / `.mcp.json` | `botz` MCP server entry (Cursor / Claude Code) |

## Keeping the skill in sync

The skill is authored in `zotoio/botz-mcp`. After it changes there, copy
`skills/botz-mcp/SKILL.md` and `skills/botz-mcp/references/chained-workflows.md` into `plugins/zoto-botz-skills/skills/botz-mcp/`,
bump the version in all four manifests, and add a CHANGELOG entry.
