# MCP Swarm

Agent Skills for the [botz MCP Swarm CLI](https://github.com/zotoio/botz-mcp-swarm-cli): capture suites from live MCP servers, run repeatable assertions and load tests, diagnose failures, and upgrade saved suites.

| Skill | Command | Use it to |
| --- | --- | --- |
| `mcp-swarm-guided` | `/z-mcp-swarm-guided` | Be walked through testing a server: questions for the target, credentials, test data, tool selection, and load, then capture, review, run, and summary |
| `mcp-swarm` | `/z-mcp-swarm` | Capture, validate, refresh, and run suites directly, including suites that call several servers |
| `mcp-swarm-flow` | `/z-mcp-swarm-flow` | Turn a task described in words into a suite whose steps call several MCP servers in order and pass values between them |
| `mcp-swarm-report` | `/z-mcp-swarm-report` | Visualise one run in Cursor's `/canvas` or a self-contained HTML page, with a tool selector showing each tool's latency, errors, and a sample request and response |
| `mcp-swarm-compare` | `/z-mcp-swarm-compare` | Compare two runs or a series, and chart latency, error rate, and tool-eval trends in Cursor's `/canvas` or a self-contained HTML page |
| `mcp-swarm-descriptions` | `/z-mcp-swarm-descriptions` | Review a server's tool descriptions, examine `optimize` suggestions, and measure a change with tool evals |
| `mcp-swarm-record-replay` | `/z-mcp-swarm-record-replay` | Record redacted wire traffic and replay it as recorded, at maximum rate, or paced |
| `mcp-swarm-diagnose` | `/z-mcp-swarm-diagnose` | Explain failed runs, missing credentials, and regressions |
| `mcp-swarm-analyse` | `/z-mcp-swarm-analyse` | Have the model propose suite fixes for a failed run; accept or reject each by id |
| `mcp-swarm-upgrade` | `/z-mcp-swarm-upgrade` | Update the CLI and migrate saved suites to the current layout |

The skills set `disable-model-invocation: true`: run them by name (for example `/mcp-swarm`) or through their `/z-<skill>` command, a light wrapper that loads the skill with the text after the command as the request. On first use they install the `botz` host (`@zotoio/botz-cli`) and its `mcp-swarm` extension if missing, so Node.js 22.13+ and npm are required. No MCP server or executable is bundled.

Every suite, report summary, chart, and file the skills produce names the MCP server under test by its name and its URL or command. Run reports record the server and the endpoint actually used in their `server` field. For reports from CLI 0.6.1 and earlier, the skills take the server from the run's saved suite.

`mcp-swarm-compare` ships `scripts/runs-dataset.mjs` and `mcp-swarm-report` ships `scripts/run-dataset.mjs`, which need only Node.js; `pnpm --filter @zoto-agents/botz-mcp-swarm test` runs its tests. `mcp-swarm-report` needs CLI >= 0.9.0 for full data (`sampleResults` with real tool responses and `timeSeries` covering the whole run); older reports fall back to recordings, tool evals, and the log tail.

## Install

| Client | Marketplace file | Install |
| --- | --- | --- |
| Cursor | `.cursor-plugin/marketplace.json` | Add `zotoio/zoto-agents` as a marketplace, then install **botz-mcp-swarm** |
| Claude Code | `.claude-plugin/marketplace.json` | `/plugin marketplace add zotoio/zoto-agents`, then `/plugin install botz-mcp-swarm@zoto-agents` |
| Codex | `.agents/plugins/marketplace.json` | `codex plugin marketplace add zotoio/zoto-agents`, then install from `/plugins` |

The plugin carries manifests for each client: `plugin.json` ([Agent Plugins 1.0](https://agent-plugins.org/), with OpenAI metadata under `extensions["com.openai"]`), `.cursor-plugin/plugin.json`, and `.claude-plugin/plugin.json`. All of them discover the same `skills/`.

## Maintenance

This directory is the source of these skills; the CLI no longer bundles them. The plugin is versioned independently of `@zotoio/botz-mcp-swarm-cli`. When a CLI release changes commands or flags used here, update the skills and their `evals/` in the same change. Skills installed by CLI 0.6.x can be removed with `botz mcp-swarm skills uninstall`.
