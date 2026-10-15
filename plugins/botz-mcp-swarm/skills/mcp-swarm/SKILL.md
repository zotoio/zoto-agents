---
name: mcp-swarm
description: Capture, validate, refresh, and run MCP test suites with the botz MCP Swarm CLI. Use for testing MCP servers, repeatable tool assertions, load tests, and CI reports.
license: MIT
disable-model-invocation: true
compatibility: Requires Node.js 22.13+, npm, and shell access. Installs the botz host (@zotoio/botz-cli) and its mcp-swarm extension if missing. Live capture and runs require access to the target MCP server.
metadata:
  author: zotoio
  cli-host: "@zotoio/botz-cli"
  cli-package: "@zotoio/botz-mcp-swarm-cli"
---

# MCP Swarm suites

## Setup

Run every command through the botz host as `botz mcp-swarm`. Do not use the standalone `botz-mcp-swarm` or `swarm` executables. Before the first command in a session:

1. Run `botz --version`. If `botz` is not found, check `node --version` (22.13 or later is required), then install the host with `npm install -g @zotoio/botz-cli` and tell the user you installed it. If Node is too old or the global install fails, for example with a permissions error, stop and report it; do not use `sudo` or change npm configuration.
2. Run `botz plugins info mcp-swarm --json`. If `installedVersion` is `null`, run `botz plugins install mcp-swarm`.
3. Confirm with `botz mcp-swarm --version`, and check the relevant subcommand's `--help` before using unfamiliar options.

## Identify the server

Name every suite after the MCP server it tests: pass `--name <server name>` to capture, using the server's own name (lowercase, non-alphanumerics replaced by `-`) or, before it is known, the URL host or command basename. The suite records the server's name and version (`surface.serverName`, `surface.serverVersion`) and its URL or command (`target`). In every summary, table, and chart state the server as `<server name> <version> (<URL or command>)`, taken from the report's `server` field (`name`, `version`, `endpoint`). It records the endpoint actually tested, including a `--url` or `--target-file` override. Reports from CLI 0.6.1 and earlier have no `server` field: take the server from the suite or from `suite show`, and when such a run used `--url` or `--target-file`, name the endpoint actually tested.

For a new target, capture a suite:

```sh
botz mcp-swarm suite capture --url http://127.0.0.1:3000/mcp --name docs-server
botz mcp-swarm suite show --suite docs-server
botz mcp-swarm suite validate --suite docs-server --json
botz mcp-swarm doctor --suite docs-server --json
botz mcp-swarm suite run --suite docs-server --format json
```

Use the user's actual target. For stdio, substitute `--command <bin>` and repeated `--arg <value>` for `--url`. Capture contacts the live server. Inspect captured arguments and enabled steps before running; tool calls can change target data. Choose concurrency and duration within the requested test scope. Inference is opt-in with `--inference` and needs model configuration; ordinary capture and runs do not need model credentials.

Suites live under `.botz/mcp-swarm/suites/<name>` at the Git root, or under `~/.botz/mcp-swarm/suites` outside a repository, unless `suitesDir` in `.botz/mcp-swarm/settings.json` points elsewhere. A `.botz/suites` directory is the pre-0.6 layout: it is still read, but use the `mcp-swarm-upgrade` skill to move it rather than editing it. Reuse an existing suite instead of overwriting it. Capture refuses an existing suite unless `--force` is supplied. To inspect server changes while preserving assertions and custom arguments:

```sh
botz mcp-swarm suite refresh --suite docs-server --dry-run
botz mcp-swarm suite refresh --suite docs-server
```

Refresh discovers the live surface without executing target tools. Review schema changes and disabled/removed steps before a subsequent run. Do not silently enable write-like tools.

## Multi-server suites

A suite can call tools on several MCP servers in one flow, as an agent does when it reads from one server and acts on another. If `botz mcp-swarm suite server --help` fails, the installed CLI predates multi-server suites; use the `mcp-swarm-upgrade` skill before going on.

```sh
botz mcp-swarm suite capture --url https://gh-mcp.example/mcp --name triage --alias github --bearer-env GH_TOKEN
botz mcp-swarm suite server add --suite triage --alias jira --url https://jira-mcp.example/mcp --bearer-env JIRA_TOKEN
botz mcp-swarm suite server list --suite triage
botz mcp-swarm suite validate --suite triage
```

- Each server has an alias (1-32 of `a-z`, `0-9`, `-`). A step's `"server": "<alias>"` in `suite.json` names the server it calls; steps without one call the default server. A group or loop passes its server to its children. Extractors and think steps never take a server.
- An extractor reads the result of the step before it, on any server; a later step uses the value as `${name}`. Set `"required": true` on an extractor whose value another server needs, so a missing value fails the extractor and skips the steps that use it instead of sending a nonsense call.
- `suite validate` lists every value that moves between servers under "Cross-server data flows". Show that list to the user before the first run: it is data sent from one system to another.
- `suite server add --steps` adds a server's default contract steps in a disabled frame; enable only the steps the user asks for, and never write-like tools without their confirmation. `suite server remove|rename|default|slo` manage servers; `slo` sets objectives over every tool call on one server.
- At run time, `--target <alias>=<url>` replaces one server's URL (`--url` is refused on a multi-server suite), and credential flags take an alias prefix: `--bearer-env jira=JIRA_TOKEN`, `--header-env jira:X-Api-Key=JIRA_KEY`, `--env-from slack:TOKEN=SLACK_TOKEN`. Unprefixed flags apply to the default server.
- Reports add `servers` (one entry per alias), `flow` (whole-pass latency and skipped passes), and `variables` (how often each extractor found a value; never the value). Name every server in summaries as `<alias>: <server name> (<URL or command>)`, and report results per server before the flow as a whole.

To turn a task described in words into a flow, use the `mcp-swarm-flow` skill.

Use environment references for credentials, such as `--bearer-env MCP_TOKEN` or `--header-env X-Api-Key=MCP_KEY`. Do not print secret values or put credentials in suite files. A target override (`--url` or `--target-file`) replaces saved credentials; supply the override's credentials explicitly.

For sustained load, set explicit `--duration-ms`, `--concurrency`, and optionally `--ramp-up-ms`/`--ramp-down-ms`. For CI, use `--format json` or `--format junit`, and preserve the process exit status. Saved-suite runs exit 0 for pass, 1 for failed verdict, 2 for configuration/execution errors, 130/143 for interruption. Report verdict, executed coverage, failures, and report locations; never call a run successful just because a report exists or no enabled tools executed.
