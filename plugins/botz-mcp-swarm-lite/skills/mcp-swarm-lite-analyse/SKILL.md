---
name: mcp-swarm-lite-analyse
description: Analyse a failed botz MCP Swarm run with the configured model, review its proposed suite fixes one by one, and accept or reject them by explicit proposal id. Nothing changes without a named id.
license: MIT
disable-model-invocation: true
compatibility: Requires Node.js 22.13+, npm, shell access, and botz-mcp-swarm-cli with `suite analyse`. Calling the model needs SWARM_LLM_PROVIDER and its API key; reviewing a saved analysis does not.
metadata:
  author: zotoio
  cli-host: "@zotoio/botz-cli"
  cli-package: "@zotoio/botz-mcp-swarm-cli"
  cli-version: "0.15.0"
---

# Analyse a failed MCP Swarm run

The model reads the run's errors, the suite steps and the server's tool schemas (secrets and headers redacted) and returns proposals. Each has an id, a category, a confidence, a rationale and evidence. Only `suite_bug` proposals carry a patch. `server_bug` and `environment` (for example rate limits) proposals are reported to the user and are never applied. Rate-limited calls (HTTP 429, `Retry-After` headers, and server rate-limit errors) are classified as `rate_limit` (separate from `auth`) and retried automatically with exponential backoff and full jitter (`load.retry`, or `retry: { enabled: false }` to disable); `report.retries` and `nodeOutcomes[].retries` track those retries separately without counting toward the suite's error limit until retries are exhausted.

## Setup

Run every command through the botz host as `botz mcp-swarm`, never the standalone `botz-mcp-swarm` or `swarm` executables. Before the first command in a session:

1. Run `botz --version`. If it is missing, check `node --version` (22.13+), install with `npm install -g @zotoio/botz-cli`, and say so. If that fails, stop and report it; do not use `sudo`.
2. Run `botz plugins info mcp-swarm --json`; if `installedVersion` is `null`, run `botz plugins install mcp-swarm-lite`.
3. Run `botz mcp-swarm suite analyse --help`. If the command does not exist, tell the user the installed CLI is too old and stop.

Name the MCP server under test as `<server name> <version> (<URL or command>)` in every summary, from the suite or `botz mcp-swarm suite show`.

## 1. Analyse (read-only)

```sh
botz mcp-swarm suite analyse <suite> --format json
```

Add `--report <path>` for a specific run; otherwise the newest report for the suite is used. The analysis is saved next to the report as `<report>.analysis.json`; say where. If analysis is off or no inference key is configured, report the CLI's message and stop. Do not read, print or ask for key values.

Present every proposal with its id, category, confidence, title, rationale, evidence and, for suite fixes, the patch as a before/after of the affected steps. Mark `invalid` and `stale` proposals as not applicable, with their reason. List server bugs and environment issues as findings to raise with the server owner or to fix in the environment.

## 2. Wait for the user's decision

Never accept a proposal on your own, even at high confidence, and never use `--apply all`. Accept or reject only the ids the user names in this conversation. If the user says "accept the good ones" or similar, list the ids and ask them to confirm which.

## 3. Record the decision by explicit id

Reject:

```sh
botz mcp-swarm suite analyse <suite> --from <analysis.json> --reject <id>[,<id>...]
```

Accept (writes `suite.proposed.json` for review; nothing in `suite.json` changes):

```sh
botz mcp-swarm suite analyse <suite> --from <analysis.json> --apply <id>[,<id>...]
```

Only add `--in-place` (keeps `suite.json.bak`) when the user asks to update the suite itself. Only add `--allow-destructive` when the user has confirmed, for that specific tool, that enabling a write-like or destructive tool is intended and the target is not production. If the CLI refuses an id (unknown, already decided, report only, or no longer applies), report the reason; do not edit the suite by hand to get around it. If a fix no longer applies, offer to analyse again.

After accepting, offer a re-run with `botz mcp-swarm suite run --suite <suite>` within the user's authorised target and load limits, and do not start it without their yes.

## Local suites only

The lite plugin works on local suites (`.botz/mcp-swarm/suites/` or `data/projects/`). Suites stored on a Swarm service keep that service's RBAC (runners analyse; only editors and admins can accept or reject); do not copy a service suite locally to bypass it. Use the full `botz-mcp-swarm` plugin for service suites.
