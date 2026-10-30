---
name: mcp-swarm-flow
description: Turn a task described in words, such as "find an open bug in GitHub, file it in Jira, tell #triage", into a botz MCP Swarm suite whose steps call several MCP servers in order and pass values between them. Use to load-test or regression-test an agent-like workflow that spans MCP servers.
license: MIT
disable-model-invocation: true
compatibility: Requires Node.js 22.13+, npm, and shell access. Installs the botz host (@zotoio/botz-cli) and its mcp-swarm extension if missing. Needs a CLI with multi-server suites (`botz mcp-swarm suite server --help`). Contacts each MCP server to read its tools; runs call tools on every server.
metadata:
  author: zotoio
  cli-host: "@zotoio/botz-cli"
  cli-package: "@zotoio/botz-mcp-swarm-cli"
  cli-version: "0.15.0"
---

# Build a multi-server flow

> **Platform mode (opt-in):** this skill describes local execution only. If `BOTZ_MCP_SWARM_MODE=platform` is set or a `swarm` MCP server is connected, also read the `mcp-swarm-platform` skill before answering; otherwise do not mention or suggest Swarm platform features.

Turn the user's description of a task into an ordered suite of tool calls across MCP servers, show them exactly what will run and what data moves between servers, and run it only when they agree.

## Setup

Run every command through the botz host as `botz mcp-swarm`. Do not use the standalone `botz-mcp-swarm` or `swarm` executables. Before the first command in a session:

1. Run `botz --version`. If `botz` is not found, check `node --version` (22.13 or later is required), then install the host with `npm install -g @zotoio/botz-cli` and tell the user you installed it. If Node is too old or the global install fails, for example with a permissions error, stop and report it; do not use `sudo` or change npm configuration.
2. Run `botz plugins info mcp-swarm --json`. If `installedVersion` is `null` or older than `0.15.0` (the version this plugin is pinned to, `metadata.cli-version`), run `botz plugins install mcp-swarm --version 0.15.0`.
3. Confirm with `botz mcp-swarm --version`. Run `botz mcp-swarm suite server --help`; if it fails, the CLI predates multi-server suites, so use the `mcp-swarm-upgrade` skill first.

Ask with the client's structured question tool (`AskQuestion` in Cursor, `AskUserQuestion` in Claude Code), or in chat one step at a time. Never ask for a secret value: ask for the name of the environment variable that holds it, and never print or store a pasted token.

## 1. Servers

From the description, list the servers the task touches and give each a short alias (`github`, `jira`, `slack`: 1-32 of `a-z`, `0-9`, `-`). For each, collect its URL or command and the environment variable names for its credentials, and confirm the user may send test traffic to it. Stop for any server they cannot confirm.

If a suite for this task exists (`botz mcp-swarm suite list --json`), offer to extend it. Otherwise capture the first server and add the others:

```sh
botz mcp-swarm suite capture --url <url> --name <task name> --alias <alias> [--bearer-env VAR]
botz mcp-swarm suite server add --suite <task name> --alias <alias> --url <url> [--bearer-env VAR]
botz mcp-swarm suite server add --suite <task name> --alias <alias> --command <bin> --arg <a> [--env-from K=VAR]
botz mcp-swarm suite server list --suite <task name> --json
```

Name the suite after the task (lowercase, non-alphanumerics replaced by `-`). Capture and `server add` list each server's tools without calling them.

## 2. Steps

Read each server's tools from `suite.json`: the default server's under `servers.<defaultServer>.surface.tools[]` (or top-level `surface` in a version 1 file), others under `servers.<alias>.surface.tools[]`. Match each part of the description to one tool by its name, description, and `inputSchema`. When two tools could fit, or none does, ask rather than guess.

Present the proposed steps as a numbered list: alias, tool, arguments, and which earlier value each argument uses. Mark every write-like tool (one whose name or annotations say it creates, updates, deletes, posts, or sends, or with `destructiveHint`) and say what it would change. Ask the user to confirm the steps and, separately, each write-like tool. Never include a write-like tool on a production server; say which were left out and why.

## 3. Values between servers

For each value that one step's result passes to a later step, add an extractor right after the producing step:

- `path` into the result: prefer `structuredContent...` when the tool has an `outputSchema`, using its property names; otherwise ask the user for a sample result or the field name, and say the path is unverified until the first run.
- `variable`: a short name such as `issueTitle`.
- `required: true` whenever a later step on another server needs the value, so a missing value fails the extractor and skips the steps that use it instead of sending them a nonsense call.

Use `${variable}` in the later step's arguments. Parameters the user supplies per run (a label, a project key) go in `params` with an example and are overridden with `--set`.

## 4. Write the suite

Edit `suite.json` in the suite directory. Keep the servers and parameters as written by the CLI and set `nodes` to the flow, in order:

```json
[
  { "id": "find", "type": "sampler", "enabled": true, "method": "tools/call", "tool": "search_issues", "args": { "query": "is:open label:${label}" } },
  { "id": "title", "type": "extractor", "enabled": true, "path": "structuredContent.items[0].title", "variable": "issueTitle", "required": true },
  { "id": "ticket", "type": "sampler", "enabled": true, "server": "jira", "method": "tools/call", "tool": "create_issue", "args": { "summary": "${issueTitle}" } }
]
```

Steps without `server` call the default server. Never put `server` on an extractor or think step. Keep any existing steps the user did not ask to replace; add the flow as a group (`"type": "group"`, `"children": [...]`) if the suite already has other steps.

## 5. Check and show

```sh
botz mcp-swarm suite validate --suite <task name>
botz mcp-swarm suite show --suite <task name>
botz mcp-swarm doctor --suite <task name> --json
```

Fix every validation error (`is not a server`, `is not on server`, `is not set before this step`, duplicate variables) and run validate again. Show the user the "Cross-server data flows" list from validate: each line is a value read from one server and sent to another. Ask them to confirm those values may move between the servers. Do not run until they do.

## 6. Run

Start with one pass (the suite's default). Offer load only after a passing single pass:

```sh
botz mcp-swarm suite run --suite <task name> [--set k=v] [--bearer-env alias=VAR]
botz mcp-swarm suite run --suite <task name> --concurrency 4 --duration-ms 60000 --ramp-up-ms 10000
```

Exit codes: 0 pass, 1 failed verdict, 2 configuration or execution error, 130 or 143 interrupted.

## 7. Summarise

Name each server as `<alias>: <server name> (<URL or command>)`, from the report's `servers`. Report, in order: the verdict; per server, calls, error rate, and p95; the flow (passes, failed passes, passes stopped at a missing value, whole-pass p50 and p95); each variable's `resolvedRate` from `variables`; failures with the first failing server named; and the report paths. A step counted as skipped did not run because an earlier value was missing; attribute it to the earlier server or the extractor's path. When a suite uses `extract` rules, `redactedArgs` and `sampleResults` redact extracted variable values to `${name}` in arguments and `sampleResults` omits raw response bodies so extracted secrets never leak into reports. Passes or server session opens cut off after the drain deadline during ramp-down count under `report.rampDown` (`cancelledByRampDown`, `incompletePasses`) rather than as server errors or flow passes. Never call the flow successful when a server was never reached or every pass was skipped.
