---
name: mcp-swarm-record-replay
description: Record redacted MCP wire traffic from a server with botz MCP Swarm and replay it against the same or another server, as recorded, at maximum rate, or paced. Use to reproduce a session, compare server builds on identical traffic, or create fixtures.
license: MIT
disable-model-invocation: true
compatibility: Requires Node.js 22.13+, npm, and shell access. Installs the botz host (@zotoio/botz-cli) and its mcp-swarm extension if missing. Recording and replay contact the target MCP server.
metadata:
  author: zotoio
  cli-host: "@zotoio/botz-cli"
  cli-package: "@zotoio/botz-mcp-swarm-cli"
---

# Record and replay MCP traffic

## Setup

Run every command through the botz host as `botz mcp-swarm`. Do not use the standalone `botz-mcp-swarm` or `swarm` executables. Before the first command in a session:

1. Run `botz --version`. If `botz` is not found, check `node --version` (22.13 or later is required), then install the host with `npm install -g @zotoio/botz-cli` and tell the user you installed it. If Node is too old or the global install fails, for example with a permissions error, stop and report it; do not use `sudo` or change npm configuration.
2. Run `botz plugins info mcp-swarm --json`. If `installedVersion` is `null`, run `botz plugins install mcp-swarm`.
3. Confirm with `botz mcp-swarm --version`, and check the relevant subcommand's `--help` before using unfamiliar options.

Recording and replay work on one server at a time. For a multi-server suite, record and replay each server separately, naming its alias in the file name (`recording-<server name>-<alias>-<timestamp>.json`).

## Identify the server

Name the MCP server under test by its name and its URL or command in the recording file name (`recording-<server name>-<timestamp>.json`, server name in lowercase with non-alphanumerics replaced by `-`), the replay summary, and any comparison. Take them from the suite (`surface.serverName`, `surface.serverVersion`, `target`) or `botz mcp-swarm suite show`; if neither is available, ask the user. Write them as `<server name> <version> (<URL or command>)`.

## Targets and allowlist

Both commands take the target as JSON, inline with `--target` or in a file with `--target-file`, and require `--allowlist`:

- HTTP: `{"transport":"streamable-http","url":"https://host/mcp"}` (or `"sse"`), allowlisted by host name, for example `--allowlist host`.
- stdio: `{"transport":"stdio","command":"node","args":["server.mjs"]}`, allowlisted as `--allowlist stdio`.

Put credentials in environment references rather than literal values, and do not print them. Confirm with the user that they are authorized to send traffic to the target.

## Record

```sh
botz mcp-swarm record --target-file target.json --allowlist <host|stdio> --output recording-<server name>-<timestamp>.json
```

The recording holds `frames` (timestamp, direction, method, session) with the default redaction profile applied. Review it before committing or sharing; redaction is best effort, so look for tokens, personal data, and internal URLs.

## Replay

```sh
botz mcp-swarm replay --recording recording-<server name>-<timestamp>.json --target-file target.json --allowlist <host|stdio> --mode as-recorded
```

- `as-recorded` keeps the original timing; use it to reproduce a session.
- `max-rate` sends frames back to back; use it for a quick stress check.
- `paced` sends a frame every `--pace-ms` milliseconds (default 100).

Replay reports the frames sent and the error count. Replaying tool calls repeats their side effects: do not replay recordings containing write-like calls against a production server without the user's explicit agreement.

## Check the outcome

A target outside the allowlist or an unreachable server fails the command with exit 1 and an `Error:` line. A completed replay prints `Replayed <n> frames, <e> errors`; a non-zero error count does not change the exit status, so read it. Report the frames replayed, errors, and any difference from the recorded session. For latency comparisons between builds, prefer saved-suite runs and the `mcp-swarm-compare` skill, which produce full reports.
