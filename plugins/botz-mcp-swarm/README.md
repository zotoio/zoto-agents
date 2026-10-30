# MCP Swarm

**From introspection to optimisation.** Point swarm at any MCP server and it builds, runs and scores the tests for you.

Agent Skills (local by default, Botz platform opt-in) for the [botz MCP Swarm CLI](https://github.com/zotoio/botz-mcp-swarm-cli): introspect live MCP servers, generate test suites from tool schemas, annotations and intents, run contract/schema checks, evals and load tests locally or on the central Swarm server, get optimisation recommendations, register distributed VU/OTEL workers, diagnose failures, and upgrade saved suites.

| Skill | Command | Use it to |
| --- | --- | --- |
| `mcp-swarm-guided` | `/z-mcp-swarm-guided` | Be walked through testing a server: questions for the target, credentials, test data, tool selection, and load, then capture, review, run, and summary |
| `mcp-swarm` | `/z-mcp-swarm` | Capture, validate, refresh, and run suites directly on this machine |
| `mcp-swarm-flow` | `/z-mcp-swarm-flow` | Turn a task described in words into a suite whose steps call several MCP servers in order and pass values between them |
| `mcp-swarm-report` | `/z-mcp-swarm-report` | Visualise one run in Cursor's `/canvas` or a self-contained HTML page, with a tool selector showing each tool's latency, errors, and a sample request and response |
| `mcp-swarm-compare` | `/z-mcp-swarm-compare` | Compare two runs or a series, and chart latency, error rate, and tool-eval trends in Cursor's `/canvas` or a self-contained HTML page |
| `mcp-swarm-descriptions` | `/z-mcp-swarm-descriptions` | Review a server's tool descriptions, examine `optimize` suggestions, and measure a change with tool evals |
| `mcp-swarm-record-replay` | `/z-mcp-swarm-record-replay` | Record redacted wire traffic and replay it as recorded, at maximum rate, or paced |
| `mcp-swarm-diagnose` | `/z-mcp-swarm-diagnose` | Explain failed runs, missing credentials, and regressions |
| `mcp-swarm-analyse` | `/z-mcp-swarm-analyse` | Have the model propose suite fixes for a failed run; accept or reject each by id |
| `mcp-swarm-server-updates` | `/z-mcp-swarm-server-updates` | Check servers for updates (MCP spec version, serverInfo, capabilities, schemas), review the diff, surgically update only affected suites, and record a changelog entry |
| `mcp-swarm-tags` | `/z-mcp-swarm-tags` | Edit suite and server descriptions; tag suites, scenarios and runs and filter by tag |
| `mcp-swarm-platform` | `/z-mcp-swarm-platform` | Opt in to (or out of) Botz platform mode: central swarm MCP server, remote runs, workers |
| `mcp-swarm-upgrade` | `/z-mcp-swarm-upgrade` | Update the CLI and migrate saved suites to the current layout |

The skills set `disable-model-invocation: true`: run them by name (for example `/mcp-swarm`) or through their `/z-<skill>` command, a light wrapper that loads the skill with the text after the command as the request. On first use they install the `botz` host (`@zotoio/botz-cli`) and its `mcp-swarm` extension if missing, so Node.js 22.13+ and npm are required.

## Local mode (default) and platform mode (opt-in)

Out of the box the plugin wires up **no MCP server**: every skill runs the bundled CLI locally, and suites, reports and project data stay in `.botz/mcp-swarm/`. To use the Botz MCP Swarm platform (central `https://swarm.botz.ai/mcp` with OAuth, remote runs, worker dispatch, service suites), run `/z-mcp-swarm-platform` — it adds the `swarm` server from `platform/mcp.json` to your host's MCP config (Cursor `.cursor/mcp.json`, `claude mcp add`, `codex mcp add`) or tells you to set `BOTZ_MCP_SWARM_MODE=platform` for CLI/CI use. Plugin manifests can't declare a conditional MCP server on any of the three hosts, so the opt-in writes host config rather than toggling the plugin.

## Install

| Client | Marketplace file | Install |
| --- | --- | --- |
| Cursor | `.cursor-plugin/marketplace.json` | Add `zotoio/zoto-agents` as a marketplace, then install **botz-mcp-swarm** |
| Claude Code | `.claude-plugin/marketplace.json` | `/plugin marketplace add zotoio/zoto-agents`, then `/plugin install botz-mcp-swarm@zoto-agents` |
| Codex | `.agents/plugins/marketplace.json` | `codex plugin marketplace add zotoio/zoto-agents`, then install from `/plugins` |

The plugin carries manifests for each client: `plugin.json` ([Agent Plugins 1.0](https://agent-plugins.org/), with OpenAI metadata under `extensions["com.openai"]`), `.cursor-plugin/plugin.json`, and `.claude-plugin/plugin.json`. All of them discover the same `skills/` and `mcp.json`.

## Maintenance

This directory is the source of these skills; the CLI no longer bundles them. The plugin is versioned independently of `@zotoio/botz-mcp-swarm-cli`. When a CLI release changes commands or flags used here, update the skills and their `evals/` in the same change. Skills installed by CLI 0.6.x can be removed with `botz mcp-swarm skills uninstall`.

### CLI 0.12.0–0.14.0 & Swarm Service Workspace Features

- **Suite Version History & Per-Version Disable (`0.12.0`):** `botz mcp-swarm project suite versions <project>` lists every stored version (`v1..vN`) with its status (`latest`, `read-only`, or `disabled`) and generated changelog. `disable-version` / `enable-version` prevent or re-enable executing a specific version while keeping its stored runs inspectable. Only the latest version is editable to create `vN+1`.
- **Inline JEV Eval Testing & Batch Save:** Edit multiple eval prompts and JEV assertions inline on the latest version, test them via `Test inline` or `Re-judge assertions`, and save all edits together to `vN+1`.
- **Remote MCP Server OTLP Instrumentation (Python & Node.js):** Swarm sends `X-Swarm-Run-Id: <runId>` on every HTTP/SSE MCP call so remote Python and Node.js servers can correlate `process.runtime.rss.bytes`, `process.runtime.cpu.ratio`, and tool latency histograms per run with client+server secret redaction.
- **CLI `0.13.0` & 28-Tool Swarm MCP Server (`https://swarm.botz.ai/mcp`):** Adds `--preset smoke|baseline|peak|spike|soak` (`10 VUs · 1h · ~4 TPS/user`), `--skip-image-gen` & `--skip-expensive-llm`, automatic end-of-run `signalCalleeRunCompleted` + `swarm_run_cleanup_assets`, full 7-stage MCP spec coverage (`outputSchema` validation, 5-field `ToolAnnotations`, `ttfpMs` progress, deterministic mock `sampling/createMessage` & `roots/list`), and 28 MCP tools + 4 `@mcp.prompt` workflows (`/swarm_remediate_latest_run`, `/audit_mcp_server`, `/triage_suite_run`, `/soak_test_plan`).
- **CLI `0.14.0` & Plugin `0.12.0` — Bundled Central `https://swarm.botz.ai/mcp` OAuth Server, Remote Suite Execution & Distributed VU/OTEL Workers:** Bundles `mcp.json` / `.mcp.json` defaulting to `https://swarm.botz.ai/mcp` with OAuth 2.1 sign-in; adds CLI `run --remote` (`--server https://swarm.botz.ai`) to trigger and stream suite runs on the central Swarm server; and upgrades `botz mcp-swarm worker` (defaulting `--server` to `https://swarm.botz.ai`) with `--max-vus`, capability registration, distributed VU slice execution, and OTLP trace/metric export (`/otlp/v1/traces` & `/otlp/v1/metrics`) back to the central Swarm server.
