# Changelog

## 0.9.0

- Add `mcp-swarm-report` and `/z-mcp-swarm-report`: visualise one run in `/canvas` or a self-contained HTML page. `scripts/run-dataset.mjs` builds per-tool latency, error classes, last error, and a sample request and response capped at 4 KB with their source: requests from `report.redactedArgs`, then a record-replay recording, a tool-eval call, or the suite step template; responses from a recording, then a tool-eval call, else `no sample captured`. Multi-server tools are keyed `<alias>/<tool>`. The canvas and the HTML page both have a tool selector.
- `mcp-swarm-report`: `timeline[]` gives calls/s, errors/s, per-tool calls/s, and active virtual users per second. TPS is measured from the run log's step lines (partial on long runs, whose log is a 2000-line tail); VUs are measured from `mcp.load.vus` lines or planned from the load profile, and labelled as such. Each second also has overall and per-tool p50/p95 response time (`latency`, `byToolLatency`) from the same log lines. The canvas and HTML draw two stacked panels on one time axis: response time above, calls/s, errors/s, and virtual users below, each with the selected tool's line.
- `mcp-swarm`, `mcp-swarm-guided`, and `mcp-swarm-diagnose` offer the report after a run or for a failing run.
- Add `mcp-swarm-flow` and `/z-mcp-swarm-flow`: turn a task described in words into a multi-server suite, with server aliases, required extractors between servers, write-like tool confirmation, and the cross-server data flows shown for approval before the first run.
- `mcp-swarm`, `mcp-swarm-guided`, `mcp-swarm-diagnose`, `mcp-swarm-compare`, and `mcp-swarm-upgrade` cover multi-server suites: `suite server add`, `--target <alias>=<url>`, alias-prefixed credential flags, per-server results, flow latency, and skipped steps. `mcp-swarm-record-replay` and `mcp-swarm-descriptions` say they work one server at a time.
- `mcp-swarm-compare`: `runs-dataset.mjs` keys multi-server tools as `<alias>/<tool>`, adds `serverRows`, `flowP95`, and `passesSkipped`, decides schema changes per server, and reports a flow p95 regression above 20%.
- `mcp-swarm-compare`: `runs-dataset.mjs` takes the server name, version, and endpoint from each report's `server` field, so runs with `--url` or `--target-file` are labelled with the endpoint actually tested. Reports without it (CLI 0.6.1 and earlier) still fall back to the saved suite, are flagged in `comparability`, and have their suite endpoint written the same way the CLI writes it (no URL credentials or query, stdio paths as basenames). Each run row has `serverSource` (`report`, `suite`, or `null`).
- `mcp-swarm-compare`: tools whose catalog schema hash changed between consecutive runs are listed in `comparability` and not scored for regressions, matching `botz mcp-swarm compare`. Only reports without a catalog get the "no tool catalog" note.
- `mcp-swarm`: take the server label from the report's `server` field when present.

## 0.8.0

- Add a `/z-<skill>` command for each skill (`/z-mcp-swarm`, `/z-mcp-swarm-guided`, `/z-mcp-swarm-compare`, `/z-mcp-swarm-descriptions`, `/z-mcp-swarm-record-replay`, `/z-mcp-swarm-diagnose`, `/z-mcp-swarm-upgrade`) that loads the skill with the text after the command as the request, with evals for each.

## 0.7.0

- Add the plugin logo (`assets/logo.png`) for Cursor and as the OpenAI listing logo and composer icon.
- Add `mcp-swarm-guided`: question-driven target, credential, test-data, tool, and load selection, followed by capture, review, run, and summary. Tool selection defaults to all tools; write-like tools need per-tool confirmation and are never enabled on production.
- Add `mcp-swarm-compare` with `scripts/runs-dataset.mjs`: compare two runs or a series, flag non-comparable runs, apply the CLI's regression rules, and chart results in `/canvas` or a self-contained HTML page.
- Add `mcp-swarm-descriptions` (tool description review, `optimize` suggestions, tool-eval measurement) and `mcp-swarm-record-replay`.
- Every output names the MCP server by name and URL or command; suites are named after the server.
- Move the MCP Swarm skills here from `@zotoio/botz-mcp-swarm-cli`, which bundled them through 0.6.x. The plugin is now versioned independently.
- Publish for Cursor, Claude Code, and Codex, with evals for each skill.
- Skills run only when invoked by name and install the `botz` host and its `mcp-swarm` extension on first use.
- `mcp-swarm-upgrade` removes skill copies installed by CLI 0.6.x instead of refreshing them.
