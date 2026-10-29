# MCP Swarm

**From introspection to optimisation.** Point swarm at any MCP server and it builds, runs and scores the tests for you.

Agent Skills and optional central MCP server (`https://swarm.botz.ai/mcp` with OAuth 2.1 sign-in) for the [botz MCP Swarm CLI](https://github.com/zotoio/botz-mcp-swarm-cli): introspect live MCP servers, generate test suites from tool schemas, annotations and intents, run contract/schema checks, evals and load tests locally or on the central Swarm server, get optimisation recommendations, register distributed VU/OTEL workers, diagnose failures, and upgrade saved suites.

| Skill | Command | Use it to |
| --- | --- | --- |
| `mcp-swarm-guided` | `/z-mcp-swarm-guided` | Be walked through testing a server: questions for the target, credentials, test data, tool selection, and load, then capture, review, run, and summary |
| `mcp-swarm` | `/z-mcp-swarm` | Capture, validate, refresh, and run suites directly (locally or via central `https://swarm.botz.ai`), or start distributed VU/OTEL workers |
| `mcp-swarm-flow` | `/z-mcp-swarm-flow` | Turn a task described in words into a suite whose steps call several MCP servers in order and pass values between them |
| `mcp-swarm-report` | `/z-mcp-swarm-report` | Visualise one run in Cursor's `/canvas` or a self-contained HTML page, with a tool selector showing each tool's latency, errors, and a sample request and response |
| `mcp-swarm-compare` | `/z-mcp-swarm-compare` | Compare two runs or a series, and chart latency, error rate, and tool-eval trends in Cursor's `/canvas` or a self-contained HTML page |
| `mcp-swarm-descriptions` | `/z-mcp-swarm-descriptions` | Review a server's tool descriptions, examine `optimize` suggestions, and measure a change with tool evals |
| `mcp-swarm-record-replay` | `/z-mcp-swarm-record-replay` | Record redacted wire traffic and replay it as recorded, at maximum rate, or paced |
| `mcp-swarm-diagnose` | `/z-mcp-swarm-diagnose` | Explain failed runs, missing credentials, and regressions |
| `mcp-swarm-analyse` | `/z-mcp-swarm-analyse` | Have the model propose suite fixes for a failed run; accept or reject each by id |
| `mcp-swarm-upgrade` | `/z-mcp-swarm-upgrade` | Update the CLI and migrate saved suites to the current layout |

The skills set `disable-model-invocation: true`: run them by name (for example `/mcp-swarm`) or through their `/z-<skill>` command, a light wrapper that loads the skill with the text after the command as the request. On first use they install the `botz` host (`@zotoio/botz-cli`) and its `mcp-swarm` extension if missing, so Node.js 22.13+ and npm are required.

## Central Swarm MCP Server (`https://swarm.botz.ai/mcp`) & OAuth

The plugin ships `mcp.json` and `.mcp.json` registering the central `swarm` MCP server:

```json
{
  "mcpServers": {
    "swarm": {
      "type": "http",
      "url": "https://swarm.botz.ai/mcp"
    }
  }
}
```

- **Interactive OAuth 2.1 Sign-In (IDE Default):** `https://swarm.botz.ai/mcp` supports MCP OAuth 2.1 + PKCE + Dynamic Client Registration (`/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`). Your IDE opens a browser sign-in automatically on first connection—no static tokens or environment variables are stored in the plugin.
- **Headless / CI (`Bearer bzt_...`):** For CI pipelines or headless agents, mint a scoped `bzt_...` IAM key (`viewer`, `runner`, `editor`, `operator`, `owner`, or `service_bridge`) in Swarm Studio (`/settings` → **IAM & API Keys**) and pass `Authorization: Bearer $SWARM_TOKEN`.
- **CLI Central Suite Execution & Distributed Worker Mode (`>= 0.14.0`):**
  - Run a suite on the central Swarm server: `botz mcp-swarm run --suite <project-or-suite> --remote --server https://swarm.botz.ai --token $SWARM_TOKEN`
  - Register a distributed worker that accepts VU slices (`User-Agent: botz-mcp-swarm/<version> (mcp-tester)`) and streams OTEL spans/metrics (`/otlp/v1/traces` & `/otlp/v1/metrics`) back to the central server: `botz mcp-swarm worker --server https://swarm.botz.ai --token $SWARM_WORKER_TOKEN --max-vus 25 --otel-export`

Every suite, report summary, chart, and file the skills produce names the MCP server under test by its name and its URL or command. Run reports record the server and the endpoint actually used in their `server` field. For reports from CLI 0.6.1 and earlier, the skills take the server from the run's saved suite.

`mcp-swarm-compare` ships `scripts/runs-dataset.mjs` and `mcp-swarm-report` ships `scripts/run-dataset.mjs`, which need only Node.js; `pnpm --filter @zoto-agents/botz-mcp-swarm test` runs its tests. `mcp-swarm-report` uses CLI >= 0.9.0 `loadTimeline` (overall and per-tool peak/average active VUs and TPS over time), `timeSeries` (whole-run per-second response time), and `sampleResults` (redacted requests and responses, with extractor values redacted to `${name}` and response bodies omitted on suites with extractors in CLI >= 0.11.1); older reports fall back to recordings, tool evals, and the log tail. The skills also cover CLI 0.8.0–0.14.0 automatic rate-limit retries (`load.retry`, `rate_limit` error class, `report.retries`), configurable suite `limits` (`--max-call-count`, `--max-payload-bytes`, `SWARM_MAX_CALL_COUNT`, `SWARM_MAX_PAYLOAD_BYTES`, `report.limits`), and graceful `rampDown` (`--ramp-down-strategy`, `--drain-timeout-ms`, `report.rampDown`).

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
