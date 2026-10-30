---
name: mcp-swarm-compare
description: Compare two botz MCP Swarm runs or a series of runs and visualise latency, error rate, and tool-eval trends in Cursor's /canvas or a self-contained HTML page. Use to check for regressions between builds, environments, or load settings.
license: MIT
disable-model-invocation: true
compatibility: Requires Node.js 22.13+, npm, and shell access. Installs the botz host (@zotoio/botz-cli) and its mcp-swarm extension if missing. Reads existing run reports; does not contact the target.
metadata:
  author: zotoio
  cli-host: "@zotoio/botz-cli"
  cli-package: "@zotoio/botz-mcp-swarm-cli"
  cli-version: "0.15.0"
---

# Compare MCP Swarm runs

## Setup

Run every command through the botz host as `botz mcp-swarm`. Do not use the standalone `botz-mcp-swarm` or `swarm` executables. Before the first command in a session:

1. Run `botz --version`. If `botz` is not found, check `node --version` (22.13 or later is required), then install the host with `npm install -g @zotoio/botz-cli` and tell the user you installed it. If Node is too old or the global install fails, for example with a permissions error, stop and report it; do not use `sudo` or change npm configuration.
2. Run `botz plugins info mcp-swarm --json`. If `installedVersion` is `null` or older than `0.15.0` (the version this plugin is pinned to, `metadata.cli-version`), run `botz plugins install mcp-swarm --version 0.15.0`.
3. Confirm with `botz mcp-swarm --version`, and check the relevant subcommand's `--help` before using unfamiliar options.

## 1. Find the reports

Saved-suite runs write `botz-run-<timestamp>.json` (and a matching `.md`) to `.botz/mcp-swarm/runs/` at the Git root, to `runsDir` from `.botz/mcp-swarm/settings.json`, or to the `--output` directory used for the run. Use the reports the user names. Otherwise:

- "compare" or "what changed": the two most recent reports.
- "trend", "series", or "over time": every report in the directory, or the last N the user asks for.

If reports from different suites are mixed in one directory, ask which suite to compare rather than guessing. Do not run new load to fill gaps unless the user asks and the target is one they are authorized to test.

## 2. Build the dataset

This skill ships `scripts/runs-dataset.mjs` next to this file. It needs only Node.js:

```sh
node <this skill's directory>/scripts/runs-dataset.mjs [--last <n>] [--suites <dir>] [--title <text>] [--html <file>] <report.json | runs-dir>...
```

Multi-server reports key each tool as `<alias>/<tool>`, so two servers' tools with the same name stay apart. They add `serverRows` (one row per run and server: calls, error rate, p50/p95/p99) and, on each run, `flowP95` (whole-pass latency) and `passesSkipped`. A whole-pass p95 rise of more than 20% between multi-server runs is a `flow` regression, as in `compare`.

It prints JSON with `title` and `servers` (each as `<server name> <version> (<URL or command>)`), `runs` (one row per run: verdict, silent green, mode, concurrency, call count, tool-eval pass rate), `rows` (one row per run and tool: count, error rate, p50/p95/p99, mean, std), `comparability` (reasons the runs may not be comparable), and `regressions` between consecutive runs. Regressions use the CLI's rules: p95 up more than 20%, or any error-rate increase.

The script takes the server name, version, and URL or command from each report's `server` field, which records the live `initialize` result and the endpoint actually used, including a `--url` or `--target-file` override. URLs lose credentials and query strings, and stdio paths are reduced to their basename. Reports from CLI 0.6.1 and earlier have no `server` field. For those, the script reads the run's saved suite (`suites/<suite name>/suite.json` beside the runs directory, or `--suites <dir>`), and `serverSource` is `suite`. The suite shows the captured endpoint, not an override: if such a run used `--url` or `--target-file`, pass `--title` naming the real server and endpoint, and say so in the summary.

For exactly two runs, also run the CLI's own comparison and treat it as authoritative:

```sh
botz mcp-swarm compare --base <base.json> --head <head.json> --output <compare.json>
```

`compare` exits 1 when it finds regressions; that is a result, not a failure of the command.

## Identify the server everywhere

Every output names the MCP server under test by its name and its URL or command: the canvas title, the HTML page title and file name, table rows, and the summary. Use the dataset's `title` and `servers`. If the comparability notes say the server is unknown, ask the user for the server name and URL or command before presenting results, and pass them with `--title`. Never present an unlabelled chart or summary.

## 3. Check comparability first

Read `comparability` before drawing conclusions. Different suites, transports, modes, concurrency, iterations, hold durations, suite `limits` (`maxCallCount`, `maxPayloadBytes`), or parameters make latency differences meaningless on their own. Fewer than 30 samples per tool make p95 and p99 unreliable. Exclude silent-green runs and explain failed verdicts. Reports carry the suite's tool `catalog`. A tool whose schema hash changed between two runs is listed in `comparability` and is not scored for regressions, matching `compare`. The catalog is the one recorded when the suite was captured or last refreshed, so suggest `botz mcp-swarm suite refresh --suite <name> --dry-run` if the server may have changed since. Reports without a catalog (CLI 0.6.1 and earlier) are listed, because schema changes involving them cannot be detected.

## 4. Visualise

**Cursor:** hand the dataset to the `/canvas` tool. Do not draw charts in text. Title the canvas with the dataset's `title`, and ask for:

- p95 latency per tool across runs (one line per tool, x axis = run start time), with p50 and p99 available on hover;
- error rate per tool across runs;
- tool-eval pass rate per run, when any run has tool evals;
- for multi-server runs, p95 and error rate per server across runs (from `serverRows`), and flow p95 per run;
- a runs table (server, URL or command, verdict, silent green, mode, concurrency, calls, report file) and lists of regressions and comparability warnings;
- tooltips that show the run id and report file name.

Pass every row; do not aggregate or downsample.

**Claude Code, Codex, and other clients without a canvas:** write the HTML page with `--html`, saved next to the reports as `compare-<server name>-<timestamp>.html` (server name in lowercase with non-alphanumerics replaced by `-`) (run reports are already git-ignored), and give the user its path. The page is self-contained and makes no network requests. If the client can display HTML itself, it may show the page there instead.

## 5. Summarise

Report, in this order: the server (name and URL or command) and which runs were compared, and whether they are comparable; regressions with before and after values; notable improvements; failed or silent-green runs; and anything the data cannot show. Never call a change a regression or an improvement without its numbers, and never present a comparison of non-comparable runs without saying so.

The `--html` page shell is `scripts/runs-dataset.template.html` (filled with `{{name}}` placeholders, loaded relative to the script), so copy the whole skill directory, not just the `.mjs`, if you vendor it.
