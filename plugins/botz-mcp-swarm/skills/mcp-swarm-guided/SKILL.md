---
name: mcp-swarm-guided
description: Guided, question-driven introspection of an MCP server with botz MCP Swarm, from target and credentials through suite generation, review, and execution to a summarised result. Use when someone wants to test an MCP server and has not set up a suite yet.
license: MIT
disable-model-invocation: true
compatibility: Requires Node.js 22.13+, npm, and shell access. Installs the botz host (@zotoio/botz-cli) and its mcp-swarm extension if missing. Contacts the target MCP server; inference needs model credentials.
metadata:
  author: zotoio
  cli-host: "@zotoio/botz-cli"
  cli-package: "@zotoio/botz-mcp-swarm-cli"
  cli-version: "0.15.0"
---

# Guided MCP Swarm session

Walk the user from an MCP server to a reviewed suite and a summarised run, asking for each required input.

## How to ask

Use the client's structured question tool: `AskQuestion` in Cursor, `AskUserQuestion` in Claude Code. In clients without one, ask in chat, one step at a time, and wait for the answer. Offer concrete options with a recommended default first, group related questions in one call, and always allow a free-text answer. Do not ask for anything you can read from the workspace or the CLI, and do not ask again for an answer already given.

Never ask for a secret value. Ask for the **name** of the environment variable that holds it. If the user pastes a token, do not repeat it, do not write it to any file, and suggest moving it to an environment variable.

## Setup

Run every command through the botz host as `botz mcp-swarm`. Do not use the standalone `botz-mcp-swarm` or `swarm` executables. Before the first command in a session:

1. Run `botz --version`. If `botz` is not found, check `node --version` (22.13 or later is required), then install the host with `npm install -g @zotoio/botz-cli` and tell the user you installed it. If Node is too old or the global install fails, for example with a permissions error, stop and report it; do not use `sudo` or change npm configuration.
2. Run `botz plugins info mcp-swarm --json`. If `installedVersion` is `null` or older than `0.15.0` (the version this plugin is pinned to, `metadata.cli-version`), run `botz plugins install mcp-swarm --version 0.15.0`.
3. Confirm with `botz mcp-swarm --version`, and check the relevant subcommand's `--help` before using unfamiliar options.

## 1. Target

Check for existing suites first (`botz mcp-swarm suite list --json`). Then ask:

- **What to test:** an HTTP MCP endpoint (URL), a local stdio server (command and arguments), or one of the existing suites listed.
- **The URL, or the command and its arguments.** For stdio, run from the directory the server expects; relative paths are stored relative to the Git root.
- **Server name**, defaulting to the URL host or command basename. This becomes the suite name (lowercase, non-alphanumerics replaced by `-`) and labels every output. After capture, prefer the server's own reported name (`surface.serverName`).
- **Other servers:** "Does the task you want to test use any other MCP servers, for example reading from one and writing to another?" Default: no. If yes, collect each one's URL or command, a short alias (`jira`, `slack`), and its credentials in step 2, and follow step 4a.

From here on, refer to the server everywhere as `<server name> <version> (<URL or command>)`: in questions, summaries, file names, and any canvas or chart.

## 2. Access and safety

Ask together:

- **Authentication:** none; a bearer token in an environment variable (`--bearer-env <VAR>`); a header from an environment variable (`--header-env <Header>=<VAR>`); or, for stdio, environment variables passed through (`--env-from <KEY>=<VAR>`). Ask for variable names only.
- **Environment:** local or development, shared test or staging, or production.
- **Authorization:** confirm the user may send test traffic, including load, to this server. Stop if they cannot confirm.

Check each named variable is set without printing it, for example `test -n "$VAR" && echo set || echo missing`. Query-string API keys are refused by the CLI; only offer `--url-key-as-bearer` if the user says the server accepts bearer authentication.

## 3. Test data

Ask whether to use **schema-derived examples** (default; no model needed) or **model-inferred test data and tool evals** (`--inference`; needs model credentials, generates positive and negative prompts per tool). For inference, run `botz mcp-swarm doctor --inference`; if more than one provider key is present, ask which provider (`SWARM_LLM_PROVIDER`) and model (`SWARM_LLM_MODEL`) to use.

## 4. Capture

If a suite for this server already exists, ask whether to reuse it, preview changes with `suite refresh --suite <name> --dry-run`, or recapture with `--force`, which replaces it. Never pass `--force` without that answer.

```sh
botz mcp-swarm suite capture --url <url> --name <server name> [--bearer-env VAR] [--header-env H=VAR] [--inference]
botz mcp-swarm suite capture --command <bin> --arg <a> --name <server name> [--env-from K=VAR] [--inference]
```

Capture lists the server's tools, resources, and prompts and contacts the server; it does not call tools without `--inference`.

## 4a. More servers and the flow

Only when the user named other servers. Capture the first server with `--alias <alias>`, then add each other one:

```sh
botz mcp-swarm suite server add --suite <name> --alias <alias> --url <url> [--bearer-env VAR]
botz mcp-swarm suite server add --suite <name> --alias <alias> --command <bin> --arg <a> [--env-from K=VAR]
```

Then ask, in one call: which steps make up the task, in order (offer the tools from `suite server list` and `suite show`, grouped by server), and which values pass from one step's result to a later step (for example "the issue title from search_issues goes into create_issue's summary"). Write the steps into `suite.json`: a `"server": "<alias>"` on each step for a server other than the default, an extractor after each step whose value is passed on (`"path"` into the result, `"variable"`, `"required": true`), and `${variable}` in the later step's arguments. Use the `mcp-swarm-flow` skill's rules for paths and write-like tools. Run `suite validate`, show the user the "Cross-server data flows" list, and ask them to confirm those values may be sent between the servers before any run.

## 5. Review

```sh
botz mcp-swarm suite show --suite <name>
botz mcp-swarm suite validate --suite <name> --json
botz mcp-swarm doctor --suite <name> --json
```

Present the server name, version, and URL or command; the tools found; which steps are enabled; and parameters with their example values (`params.example.json` in the suite directory). Then ask:

- **Which tools to run** (multiple choice, all tools preselected by default). Capture leaves write-like tools disabled, so if the selection includes any, follow up with one question that names each write-like tool and what it may change, and enable only the ones the user confirms there. Never enable a write-like tool on a production server; say which were left out and why. To apply the selection, set `enabled` on the matching `tools/call` steps in `suite.json`; refresh preserves these edits.
- **Parameter values** for any example that is a placeholder or must be real (an ID, a path, a query). Pass them at run time with `--set key=value`, or save them in a params file passed with `--params <file>`; do not put secrets in either.

Fix any validation or doctor errors before running, and re-run validate after editing.

## 6. Load

Ask for a profile, recommending the lightest that answers the user's question, and only smoke on production:

| Profile | Flags |
| --- | --- |
| Smoke (default): each enabled step once | none |
| Light load | `--concurrency 2 --duration-ms 30000 --ramp-up-ms 5000` |
| Sustained | `--concurrency 4 --duration-ms 120000 --ramp-up-ms 10000 --ramp-down-ms 5000` |
| Custom | ask for concurrency, duration, ramp times, and optional ramp-down strategy (`--ramp-down-strategy graceful|immediate`, `--drain-timeout-ms <ms>`) or suite limits (`--max-call-count <n>`, `--max-payload-bytes <n>`) |

Graceful ramp-down is the default (`load.rampDown: { strategy, drainTimeoutMs, passEstimateMs }`): virtual users retire linearly across `rampDownMs` and finish in-flight passes, and any pass or server session open cut off after the drain deadline counts as cancelled (`report.rampDown.cancelledByRampDown` / `incompletePasses`), not as an error. Suite call-count and payload limits default to 100000 calls and 1048576 bytes and can be set in `suite.json` under `limits`, via `--max-call-count` / `--max-payload-bytes`, or via `SWARM_MAX_CALL_COUNT` / `SWARM_MAX_PAYLOAD_BYTES` (recorded in `report.limits`).

## 7. Run

```sh
botz mcp-swarm suite run --suite <name> [--inference] [--set k=v] [load flags] [credential flags]
```

Exit codes: 0 pass, 1 failed verdict, 2 configuration or execution error, 130 or 143 interrupted. A report is written to `.botz/mcp-swarm/runs/` (or the configured `runsDir`) as `botz-run-<timestamp>.json` and `.md`.

## 8. Summarise and offer next steps

For a multi-server suite, report each server (`<alias>: <server name> (<URL or command>)`) with its calls, error rate, and p95 from the report's `servers`, then the flow: passes, failed passes, passes stopped at a missing value, and whole-pass p95. Name the first server whose calls failed.

Report the server (`<server name> <version> (<URL or command>)`), the verdict, executed coverage (calls per tool against the enabled steps), overall and per-tool peak/average active VUs and TPS from `report.loadTimeline.summary` (`overall` and `tools`), enforced `report.limits` and `report.rampDown` cut-offs (`incompletePasses`, `cancelledByRampDown`, `skippedPasses`) when present, failures with reasons, tool-eval results when inference was on, and the report paths. Never call a run successful because a report exists or when no enabled tool executed.

Then ask what to do next:

- visualise this run, with a tool selector showing each tool's latency, errors, and sample request and response (the `mcp-swarm-report` skill);
- compare with earlier runs of this server (the `mcp-swarm-compare` skill);
- review the server's tool descriptions (`mcp-swarm-descriptions`);
- investigate a failure (`mcp-swarm-diagnose`) or have the model propose reviewed suite fixes (`mcp-swarm-analyse`);
- rerun with a different load profile, or stop.
