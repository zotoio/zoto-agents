# botz-mcp-swarm-lite

Agent Skills for running the [botz MCP Swarm CLI](https://github.com/zotoio/botz-mcp-swarm-cli) **locally**, with no central Botz MCP Swarm server. Unlike [`botz-mcp-swarm`](../botz-mcp-swarm/), this plugin ships no `mcp.json` / `.mcp.json`, needs no OAuth sign-in or `bzt_` token, and its skills never use `--remote`, `--server`, worker mode or the `swarm_*` MCP tools. Suites, reports and project data stay in `.botz/mcp-swarm/` on this machine.

Skills install the botz host (`@zotoio/botz-cli`) and the `mcp-swarm` extension pinned to `@zotoio/botz-mcp-swarm-cli` **0.15.0** (`botz plugins install mcp-swarm --version 0.15.0`) on first use, and run only when invoked by name.

| Skill | Command |
| --- | --- |
| `mcp-swarm-lite` | `/z-mcp-swarm-lite` |
| `mcp-swarm-lite-analyse` | `/z-mcp-swarm-lite-analyse` |
| `mcp-swarm-lite-compare` | `/z-mcp-swarm-lite-compare` |
| `mcp-swarm-lite-descriptions` | `/z-mcp-swarm-lite-descriptions` |
| `mcp-swarm-lite-diagnose` | `/z-mcp-swarm-lite-diagnose` |
| `mcp-swarm-lite-flow` | `/z-mcp-swarm-lite-flow` |
| `mcp-swarm-lite-guided` | `/z-mcp-swarm-lite-guided` |
| `mcp-swarm-lite-record-replay` | `/z-mcp-swarm-lite-record-replay` |
| `mcp-swarm-lite-report` | `/z-mcp-swarm-lite-report` |
| `mcp-swarm-lite-server-updates` | `/z-mcp-swarm-lite-server-updates` |
| `mcp-swarm-lite-tags` | `/z-mcp-swarm-lite-tags` |
| `mcp-swarm-lite-upgrade` | `/z-mcp-swarm-lite-upgrade` |

`mcp-swarm-lite-compare` ships `scripts/runs-dataset.mjs` (+ `runs-dataset.template.html`) and `mcp-swarm-lite-report` ships `scripts/run-dataset.mjs`; they need only Node.js. `pnpm --filter @zoto-agents/botz-mcp-swarm-lite test` runs the tests.

Install one of `botz-mcp-swarm` or `botz-mcp-swarm-lite`, or both: names do not collide.
