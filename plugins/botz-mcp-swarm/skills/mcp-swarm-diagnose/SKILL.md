---
name: mcp-swarm-diagnose
description: Diagnose failed botz MCP Swarm suites, missing credentials, invalid fixtures, execution errors, and performance regressions from CLI diagnostics and run reports.
license: MIT
disable-model-invocation: true
compatibility: Requires Node.js 22.13+, npm, and shell access. Installs the botz host (@zotoio/botz-cli) and its mcp-swarm extension if missing. Offline validation and doctor do not require target access.
metadata:
  author: zotoio
  cli-host: "@zotoio/botz-cli"
  cli-package: "@zotoio/botz-mcp-swarm-cli"
  cli-version: "0.15.0"
---

# Diagnose MCP Swarm

## Setup

Run every command through the botz host as `botz mcp-swarm`. Do not use the standalone `botz-mcp-swarm` or `swarm` executables. Before the first command in a session:

1. Run `botz --version`. If `botz` is not found, check `node --version` (22.13 or later is required), then install the host with `npm install -g @zotoio/botz-cli` and tell the user you installed it. If Node is too old or the global install fails, for example with a permissions error, stop and report it; do not use `sudo` or change npm configuration.
2. Run `botz plugins info mcp-swarm --json`. If `installedVersion` is `null` or older than `0.15.0` (the version this plugin is pinned to, `metadata.cli-version`), run `botz plugins install mcp-swarm --version 0.15.0`.
3. Confirm with `botz mcp-swarm --version`, and check the relevant subcommand's `--help` before using unfamiliar options.

## Identify the server

Name the MCP server under test by its name and its URL or command in every finding, table, and summary. Take them from the suite (`surface.serverName`, `surface.serverVersion`, `target`) or `botz mcp-swarm suite show`; if neither is available, ask the user. Write them as `<server name> <version> (<URL or command>)`.

Begin with the existing report and offline diagnostics, using the user's suite name or directory:

```sh
botz mcp-swarm suite list --json
botz mcp-swarm suite validate --suite demo --json
botz mcp-swarm doctor --suite demo --json
```

Validation checks suite structure and parameter examples. Doctor checks credential references, executables, and output permissions without contacting target or model servers. Use `doctor --inference` for model configuration issues. Report missing environment-variable names without reading or displaying their secret values.

Distinguish configuration/execution errors from failed assertions, SLO failures, and interrupted runs. Saved-suite run exit codes are 0 pass, 1 failed verdict, 2 configuration/execution error, and 130/143 interruption. Offline diagnostics use 1 for failed checks. Manifest runs have different error semantics; inspect their report rather than inferring the cause from exit 1 alone.

Inspect enabled steps, actual operation counts, and `report.loadTimeline.summary` (`overall` and `tools`) for overall and per-tool peak/average active VUs and TPS. A green-looking summary with no meaningful execution is not evidence of correctness. Preserve assertions while fixing malformed arguments or credential references. If target schema drift is suspected, `suite refresh --suite demo --dry-run` contacts the server without executing its tools; review the diff before applying refresh.

Check rate-limit retries, suite limits, and ramp-down accounting in the report before treating transient or drain-time events as server bugs:

- **Rate-limit retries (`report.retries`, `nodeOutcomes[].retries`):** HTTP 429 responses, `Retry-After` headers, and rate-limit / quota messages are classified as `rate_limit` (separate from `auth`) and retried automatically with exponential backoff and full jitter (`load.retry`, or `retry: { enabled: false }` to disable). Retries are counted separately in `report.retries` and `nodeOutcomes[].retries` and do not count toward the suite's error limit until retries are exhausted.
- **Suite limits (`report.limits`):** `maxCallCount` (default 100000) and `maxPayloadBytes` (default 1048576) are configured via `limits` in `suite.json`, `--max-call-count <n>` / `--max-payload-bytes <n>` on `run --suite`, or `SWARM_MAX_CALL_COUNT` / `SWARM_MAX_PAYLOAD_BYTES`. Check `report.limits` and `quotas` when a run stops early or fails with `quota` errors.
- **Graceful ramp-down (`report.rampDown`):** with graceful ramp-down (`load.rampDown: { strategy: "graceful" | "immediate", drainTimeoutMs, passEstimateMs }`, `--ramp-down-strategy`, `--drain-timeout-ms`), passes or server session opens cut off after the drain deadline on any server are recorded in `report.rampDown` (`incompletePasses`, `cancelledByRampDown`, `skippedPasses`) as cancelled rather than errors or unreachable servers, and do not fail the suite.
- **Extractor sample redaction (`sampleResults`):** when a suite uses `extract` steps, both `redactedArgs` and `sampleResults` redact extracted variable values to `${name}` in `args`, and `sampleResults` omits raw response bodies so extracted secrets never leak into reports.

For a multi-server suite (a report with more than one entry in `servers`), read per server before anything else:

- Find the first server, in step order, whose calls failed. Later servers often fail only because of it.
- Steps counted under `nodeOutcomes[].skipped`, and passes in `flow.passesSkipped`, did not run because a required extractor found nothing (`extract_missing: <name> (<path>)`). That is a problem with the earlier server's result or the extractor's path, not with the server that was skipped. Check `variables` for the extractor's `resolvedRate`.
- `session failed on <alias>` or `Session warm-up failed on <alias>` means that server could not be reached; check its target, credentials (variables named `SWARM_TARGET_<ALIAS>_...`), and `doctor --suite <name>` for its stdio executable.
- `suite <name> has N servers; use --target <alias>=<url>` means `--url` was used on a multi-server suite. `"<alias>" is not a server` names a step, `--target`, or credential prefix with an unknown alias.
- `Server <alias> error_rate|p95|p99 ... exceeds max` is a per-server objective, judged over every tool call on that server.
- `suite validate` reports `${name} is not set before this step` and duplicate extractor variables; a step whose tool is not on its server is an error in a multi-server suite.

For two existing JSON reports:

```sh
botz mcp-swarm compare --base base.json --head head.json
```

Compare target, workload, concurrency, duration, and enabled tool coverage before attributing latency or error changes to a regression. Separate telemetry delivery failures from test verdicts. Re-run only within the user's authorized target and load limits, and summarize the observed cause, correction, and remaining uncertainty.

To show the user a failing run, offer the `mcp-swarm-report` skill (`/z-mcp-swarm-report`): its tool selector shows each tool's errors by class, last error, sample request and response, and VUs/TPS over time. To have the configured model propose reviewed JSON-patch fixes for a failed run, offer the `mcp-swarm-analyse` skill (`/z-mcp-swarm-analyse`).

- **Disabled suite versions (`suite_version_disabled`, CLI `>= 0.12.0`):** If a run is refused with `suite_version_disabled`, that specific version was marked disabled. Inspect version history with `botz mcp-swarm project suite versions <project>` and either run the latest version or re-enable the version with `botz mcp-swarm project suite enable-version <project> --version <n>`.
