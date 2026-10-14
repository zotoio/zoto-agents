# MCP Swarm

Agent Skills for the [botz MCP Swarm CLI](https://github.com/zotoio/botz-mcp-swarm-cli): capture suites from live MCP servers, run repeatable assertions and load tests, diagnose failures, and upgrade saved suites.

| Skill | Use it to |
| --- | --- |
| `mcp-swarm-guided` | Be walked through testing a server: questions for the target, credentials, test data, tool selection, and load, then capture, review, run, and summary |
| `mcp-swarm` | Capture, validate, refresh, and run suites directly |
| `mcp-swarm-compare` | Compare two runs or a series, and chart latency, error rate, and tool-eval trends in Cursor's `/canvas` or a self-contained HTML page |
| `mcp-swarm-descriptions` | Review a server's tool descriptions, examine `optimize` suggestions, and measure a change with tool evals |
| `mcp-swarm-record-replay` | Record redacted wire traffic and replay it as recorded, at maximum rate, or paced |
| `mcp-swarm-diagnose` | Explain failed runs, missing credentials, and regressions |
| `mcp-swarm-upgrade` | Update the CLI and migrate saved suites to the current layout |

The skills set `disable-model-invocation: true`: run them by name (for example `/mcp-swarm`). On first use they install the `botz` host (`@zotoio/botz-cli`) and its `mcp-swarm` extension if missing, so Node.js 22.13+ and npm are required. No MCP server or executable is bundled.

Every suite, report summary, chart, and file the skills produce names the MCP server under test by its name and its URL or command. Run reports record the server and the endpoint actually used in their `server` field. For reports from CLI 0.6.1 and earlier, the skills take the server from the run's saved suite.

`mcp-swarm-compare` ships `scripts/runs-dataset.mjs`, which needs only Node.js; `pnpm --filter @zoto-agents/botz-mcp-swarm test` runs its tests.

## Install

| Client | Marketplace file | Install |
| --- | --- | --- |
| Cursor | `.cursor-plugin/marketplace.json` | Add `zotoio/zoto-agents` as a marketplace, then install **botz-mcp-swarm** |
| Claude Code | `.claude-plugin/marketplace.json` | `/plugin marketplace add zotoio/zoto-agents`, then `/plugin install botz-mcp-swarm@zoto-agents` |
| Codex | `.agents/plugins/marketplace.json` | `codex plugin marketplace add zotoio/zoto-agents`, then install from `/plugins` |

The plugin carries manifests for each client: `plugin.json` ([Agent Plugins 1.0](https://agent-plugins.org/), with OpenAI metadata under `extensions["com.openai"]`), `.cursor-plugin/plugin.json`, and `.claude-plugin/plugin.json`. All of them discover the same `skills/`.

## Maintenance

This directory is the source of these skills; the CLI no longer bundles them. The plugin is versioned independently of `@zotoio/botz-mcp-swarm-cli`. When a CLI release changes commands or flags used here, update the skills and their `evals/` in the same change. Skills installed by CLI 0.6.x can be removed with `botz mcp-swarm skills uninstall`.
