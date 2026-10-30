---
name: mcp-swarm-report
description: Visualise one botz MCP Swarm run in Cursor's /canvas or a self-contained HTML page, with a tool selector showing each tool's latency, errors, and a sample request and response. Use after a run, or to explain a run report.
license: MIT
disable-model-invocation: true
compatibility: Requires Node.js 22.13+, npm, and shell access. Installs the botz host (@zotoio/botz-cli) and its mcp-swarm extension if missing. Reads an existing run report, its saved suite, and optional record-replay recordings; does not contact the target.
metadata:
  author: zotoio
  cli-host: "@zotoio/botz-cli"
  cli-package: "@zotoio/botz-mcp-swarm-cli"
  cli-version: "0.16.0"
---

# Visualise an MCP Swarm run

> **Platform mode (opt-in):** this skill describes local execution only. If `BOTZ_MCP_SWARM_MODE=platform` is set or a `swarm` MCP server is connected, also read the `mcp-swarm-platform` skill before answering; otherwise do not mention or suggest Swarm platform features.

## Setup

Run every command through the botz host as `botz mcp-swarm`. Do not use the standalone `botz-mcp-swarm` or `swarm` executables. Before the first command in a session:

1. Run `botz --version`. If `botz` is not found, check `node --version` (22.13 or later is required), then install the host with `npm install -g @zotoio/botz-cli` and tell the user you installed it. If Node is too old or the global install fails, for example with a permissions error, stop and report it; do not use `sudo` or change npm configuration.
2. Run `botz plugins info mcp-swarm --json`. If `installedVersion` is `null` or older than `0.16.0` (the version this plugin is pinned to, `metadata.cli-version`), run `botz plugins install mcp-swarm --version 0.16.0`.
3. Confirm with `botz mcp-swarm --version`, and check the relevant subcommand's `--help` before using unfamiliar options.

## 1. Find the report

Use the report the user names. Otherwise take the newest `botz-run-<timestamp>.json` in `.botz/mcp-swarm/runs/` at the Git root, in `runsDir` from `.botz/mcp-swarm/settings.json`, or in the `--output` directory used for the run. Do not start a new run to produce one unless the user asks and the target is one they are authorized to test.

Look for record-replay recordings of the same server (`recording-<server name>-<timestamp>.json`, or `recording-<server name>-<alias>-<timestamp>.json` for a multi-server suite) next to the reports or where the user keeps them. They are the only source of real tool responses.

## 2. Build the dataset

This skill ships `scripts/run-dataset.mjs` next to this file. It needs only Node.js:

```sh
node <this skill's directory>/scripts/run-dataset.mjs [--suites <dir>] [--recording [<alias>=]<file>]... [--max-sample-bytes 4096] [--title <text>] [--html <file>] <report.json>
```

Prefix a recording with its server alias for multi-server suites (`--recording jira=recording-jira-mcp-jira-….json`). It prints JSON with `title`, `server`, `servers` (multi-server: alias, name, URL or command, calls, error rate, p95), `run` (verdict, silent green, fail reasons, mode, load profile, `limits`, `rampDown`, `loadSummary`, calls, concurrency, error rate, `retries`), `flow` (whole-pass latency and skipped passes), `loadTimeline` (`bucketMs`, `durationMs`, `buckets`/`points`, and `summary.overall` / `summary.tools` with `peakActiveVus`, `avgActiveVus`, `peakTps`, `avgTps`), `tools` (each with `load` from `loadTimeline.summary.tools`), `timeline`, `timelineSource`, `nodes`, `toolEvals`, `scenarios`, `process`, and `notes`.

Each `tools[]` entry has `key` (`<alias>/<tool>` on multi-server runs), `count`, `errorRate`, `errors` (count per error class), `lastError`, `latencyMs` (p50, p90, p95, p99, mean, std), bytes, `writeLike`, and `sample`:

- **CLI >= 0.9.0 (full data):** the report's `sampleResults` holds each tool's first successful and first failed call (redacted args, the actual response, latency, node, response bytes, error class and message). When a tool has an entry, `sample.request` and `sample.response` come from it (the success, else the error), `sample.source` is `{ request: "sampleResults", response: "sampleResults" }`, `sample.kind` is `success` or `error`, `sample.atMs`/`latencyMs`/`nodeId`/`responseBytes` describe the call, and `sample.errorSample` holds the first error (`request`, `response`, `errorClass`, `errorMessage`, `atMs`, `latencyMs`, `nodeId`, `truncated`) or `null`. Payloads the CLI truncated arrive as JSON strings and are shown as captured, with `sample.truncated` true. On multi-server runs an entry belongs to the alias of its `nodeId`. When a suite uses `extract` rules (CLI >= 0.11.1), `sampleResults` redacts extracted variable values to `${name}` in `args` (like `redactedArgs`) and omits raw response bodies so extracted secrets never leak into reports. Tools without an entry, and reports from older CLIs, use the fallbacks below.
- `sample.request`: pretty JSON of the arguments. Source, in order: `report.redactedArgs` (the first arguments actually sent for that step, secrets redacted by the CLI), a recording, a tool-eval call, then the suite step's `args` template before substitution.
- `sample.response`: pretty JSON of the result. Source: a recording, else a tool-eval call (a call the model made during tool evals, not load traffic). Run reports before CLI 0.9.0 do not record tool results, so otherwise it is `null` and `sample.source.response` is `no sample captured`.
- `sample.source` names both sources; `sample.truncated` is true when either was cut to `--max-sample-bytes`.

The HTML page also shows the first error sample under the success sample when both exist.

Never fill a missing sample yourself, and never call the target to get one.

`timeline[]` has one row per second from the run start: `t` (seconds), `tps` (completed calls), `tpsErrors`, `latency` (`{ p50, p95 }` in ms of the calls completed that second, or `null`), `byTool` (calls per tool key), `byToolLatency` (`{ p50, p95 }` per tool key), `vus` (active virtual users), and `vusSource`. `timelineSource` says where each came from:

- **CLI >= 0.9.0 (`loadTimeline` & `timeSeries`):** when the report has `loadTimeline` (`buckets`/`points` in 1s buckets, widened to whole seconds to cap long runs at 600 points, plus `summary.overall` and `summary.tools` with `peakActiveVus`/`peakVus`, `avgActiveVus`/`avgVus`, `peakTps`, `avgTps`, `calls`, `errors`), the dataset prefers `loadTimeline` for active VUs, TPS, errors, and per-tool calls/in-flight (`timelineSource.tps` and `timelineSource.vus` are `measured (loadTimeline)`, `vusSource` is `loadTimeline`), and merges per-second response time (`latency` and `byToolLatency`) from `timeSeries` when present (`timelineSource.latency` is `measured (timeSeries)`). When only `timeSeries` is present (per-second buckets for the whole run, not limited by the log tail), every row comes from `timeSeries`: `timelineSource` is `measured (timeSeries)` for TPS, response time, and VUs, `vusSource` is `timeSeries`, and nothing is partial. Seconds `timeSeries` omits are idle rows with the last known VUs; idle seconds have `latency: null`. Both `loadTimeline` and `timeSeries` name tools without an alias, so on multi-server runs a tool exposed by more than one server is left out of the per-tool lines (noted).
- Otherwise, TPS and response time are `measured (log)` from the `mcp.step … phase=done` lines (count and `latencyMs`) in the report's `log`. The CLI keeps only the last 2000 log lines, so on a long run it is `measured (log tail, partial)` and earlier seconds have `tps: null` and `latency: null` (unknown, not zero). Response time is `not captured` when the lines carry no `latencyMs`.
- Virtual users are `measured (log)` from `mcp.load.vus` lines, otherwise `planned (from load profile)` from `loadProfile` (ramp-up, hold, ramp-down), which is the schedule, not what ran.
- Either is `not captured` when the report has neither; `timeline` is then empty.

## Identify the server

Every output names the MCP server under test by its name and its URL or command: the canvas title, the HTML page title and file name, and the summary. Use the dataset's `title` (and `servers` with aliases for multi-server runs). If `notes` say the server is unknown, ask the user and pass `--title`. Never present an unlabelled chart or summary.

## 3. Visualise

**Cursor:** hand the dataset to the `/canvas` tool. Do not draw charts in text. Title the canvas with the dataset's `title`, and ask for:

- a header with the verdict (red when not `pass` or silent green), fail reasons, and stat cards for calls, error rate, concurrency, overall peak/average active VUs and TPS from `loadTimeline.summary.overall` (`run.loadSummary`) when present, mode, duration, and flow p95 when present;
- on multi-server runs, a servers table (alias, server, URL or command, calls, error rate, p95);
- p50, p95, and p99 latency per tool as bars, and errors per tool by error class;
- one chart over `timeline` as two stacked panels sharing the x axis (seconds from start), with each panel's axis title above its plot area, not on it:
  - top, **Response time (ms)**: overall p95 (strong) and p50 (lighter) from `latency`, plus the selected tool's p95 from `byToolLatency[key]`;
  - bottom, **Calls/s** on the left axis and **Virtual users** on the right: calls/s, errors/s, virtual users, plus the selected tool's calls/s from `byTool[key]`;
  - a subtitle with the response-time, TPS, and VU sources from `timelineSource`; planned VUs dashed and labelled "planned (from load profile)"; `null` seconds drawn as gaps; "not captured" instead of the chart when `timeline` is empty. The selected-tool lines follow the tool selector;
- a **tool selector** (a dropdown or tabs over `tools[].key`, held in canvas state, defaulting to the first tool with errors, else the first tool). Selecting a tool shows its calls, error rate, p50/p95/p99, mean ± std, errors by class, and last error, and its sample request and sample response side by side as pretty-printed JSON in scrollable code blocks, each labelled with `sample.source` and marked when truncated, or showing "no sample captured";
- the tool-eval results table and scenario outcomes when present, and worker and server memory and CPU over time from `process` when present;
- the `notes` list.

Pass every row; do not aggregate, downsample, or edit the samples.

**Claude Code, Codex, and other clients without a canvas:** write the HTML page with `--html`, saved next to the report as `report-<server name>-<run id>.html` (server name in lowercase with non-alphanumerics replaced by `-`), and give the user its path. The page has the same two-panel chart and tool `<select>`, which also redraws the selected tool's p95 and calls/s lines, is self-contained, and makes no network requests. If the client can display HTML itself, it may show the page there instead.

## 4. Summarise

Report, in this order: the server (name and URL or command, per alias for multi-server) and the run; the verdict and fail reasons, saying so plainly when the run was silent green; overall and per-tool peak/average active VUs and TPS from `loadTimeline.summary` when present (plus any `rampDown` cut-offs or `retries`); the slowest tools and the tools with errors, with numbers; where the samples came from, saying when a response is from tool evals rather than load traffic, when response bodies were omitted because the suite uses extractors, or when a sample was not captured; and the output path or canvas. Recordings can hold real data; do not paste sample contents into chat beyond what the user asks for.
