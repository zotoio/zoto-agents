---
name: mcp-swarm-tags
description: Edit descriptions on MCP Swarm suites and servers, and add ad-hoc tags to suites, scenarios and runs, then filter lists by tag from the CLI, the central Swarm MCP tools, or Swarm Studio.
license: MIT
disable-model-invocation: true
compatibility: Requires Node.js 22.13+, npm, shell access, and botz-mcp-swarm-cli with `project suite tag`, or the central Swarm MCP server (`swarm_tags_set`). Does not contact the target MCP servers.
metadata:
  author: zotoio
  cli-host: "@zotoio/botz-cli"
  cli-package: "@zotoio/botz-mcp-swarm-cli"
---

# Describe and tag suites, scenarios, runs and servers

Descriptions are free text on suites and servers. Tags are lower-cased, trimmed, de-duplicated and limited to `[a-z0-9:_.-]` (spaces become `-`), at most 20 per item. Setting tags replaces the list; an empty list clears it. Tagging never creates a new suite version. Tag filters use AND semantics: an item must carry every requested tag.

## Setup

Run every command through the botz host as `botz mcp-swarm`. Before the first command in a session:

1. Run `botz --version`; if it is missing, check `node --version` (22.13+), install with `npm install -g @zotoio/botz-cli`, and say so. Do not use `sudo`.
2. Run `botz plugins info mcp-swarm --json`; if `installedVersion` is `null`, run `botz plugins install mcp-swarm`.
3. Run `botz mcp-swarm project suite tag --help`. If the command does not exist, tell the user the installed CLI is too old and stop.

## Descriptions

```sh
botz mcp-swarm project suite describe <project> "<text>" --suite <suite>
botz mcp-swarm project server describe <project> "<text>" --server <server>
```

MCP: `swarm_describe { project_id, entity: "suite" | "server", id, description }`.

## Tags

```sh
botz mcp-swarm project suite tag <project> smoke nightly --suite <suite>
botz mcp-swarm project scenario-tag <project> <scenarioId> checkout --suite <suite>
botz mcp-swarm project run-tag <project> <runId> regression release-1.4
```

MCP: `swarm_tags_set { project_id, entity: "suite" | "scenario" | "run", id, suite_id?, tags: [...] }`.

## Filter

```sh
botz mcp-swarm project suite list <project> --tags smoke,nightly --json
botz mcp-swarm project scenarios <project> --tags checkout --json
botz mcp-swarm project runs <project> --tags regression --json
```

MCP: `tags` on `swarm_suites_list`, `swarm_scenarios_list` and `swarm_runs_list`.

In Swarm Studio the **Descriptions & tags** panel shows tag chips; click chips to filter the Suites, Scenarios and Runs tables (every column heading sorts ascending and descending), and **Edit** on a row to change its description or tags.

## Good practice

- Confirm the exact tag list before replacing tags, since setting tags overwrites the existing list. Read the current tags first (`suite list --json`, `scenarios --json`, `runs --tags`-less `--json`).
- Suggest stable, short tags (`smoke`, `nightly`, `release-1.4`, `team:search`) over sentences.
