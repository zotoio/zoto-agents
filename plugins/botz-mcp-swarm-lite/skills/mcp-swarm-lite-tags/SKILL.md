---
name: mcp-swarm-lite-tags
description: Edit descriptions on MCP Swarm suites and servers, and add ad-hoc tags to suites, scenarios and runs, then filter lists by tag from the local CLI.
license: MIT
disable-model-invocation: true
compatibility: Requires Node.js 22.13+, npm, shell access, and botz-mcp-swarm-cli with `project suite tag`. Does not contact the target MCP servers.
metadata:
  author: zotoio
  cli-host: "@zotoio/botz-cli"
  cli-package: "@zotoio/botz-mcp-swarm-cli"
  cli-version: "0.15.0"
---

# Describe and tag suites, scenarios, runs and servers

> **CLI availability:** `project server updates|accept-update|discard-update|changelog`, `project suite describe|tag`, `project scenario-tag`, `project run-tag` and `--tags` filters land in botz-mcp-swarm-cli after `0.15.0` (zotoio/botz-mcp-swarm-cli#28). Check `botz mcp-swarm project --help` first; if the subcommand is missing, tell the user it needs a newer CLI rather than improvising.

Descriptions are free text on suites and servers. Tags are lower-cased, trimmed, de-duplicated and limited to `[a-z0-9:_.-]` (spaces become `-`), at most 20 per item. Setting tags replaces the list; an empty list clears it. Tagging never creates a new suite version. Tag filters use AND semantics: an item must carry every requested tag.

## Setup

Run every command through the botz host as `botz mcp-swarm`. Before the first command in a session:

1. Run `botz --version`; if it is missing, check `node --version` (22.13+), install with `npm install -g @zotoio/botz-cli`, and say so. Do not use `sudo`.
2. Run `botz plugins info mcp-swarm --json`; if `installedVersion` is `null`, run `botz plugins install mcp-swarm-lite`.
3. Run `botz mcp-swarm project suite tag --help`. If the command does not exist, tell the user the installed CLI is too old and stop.

## Descriptions

```sh
botz mcp-swarm project suite describe <project> "<text>" --suite <suite>
botz mcp-swarm project server describe <project> "<text>" --server <server>
```

## Tags

```sh
botz mcp-swarm project suite tag <project> smoke nightly --suite <suite>
botz mcp-swarm project scenario-tag <project> <scenarioId> checkout --suite <suite>
botz mcp-swarm project run-tag <project> <runId> regression release-1.4
```

## Filter

```sh
botz mcp-swarm project suite list <project> --tags smoke,nightly --json
botz mcp-swarm project scenarios <project> --tags checkout --json
botz mcp-swarm project runs <project> --tags regression --json
```

In Swarm Studio the **Descriptions & tags** panel shows tag chips; click chips to filter the Suites, Scenarios and Runs tables (every column heading sorts ascending and descending), and **Edit** on a row to change its description or tags.

## Good practice

- Confirm the exact tag list before replacing tags, since setting tags overwrites the existing list. Read the current tags first (`suite list --json`, `scenarios --json`, `runs --tags`-less `--json`).
- Suggest stable, short tags (`smoke`, `nightly`, `release-1.4`, `team:search`) over sentences.
