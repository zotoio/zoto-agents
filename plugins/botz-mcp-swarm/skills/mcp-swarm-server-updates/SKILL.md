---
name: mcp-swarm-server-updates
description: Check MCP servers under test for updates (serverInfo version, negotiated MCP spec/protocol version, capabilities, and every tool, resource, template and prompt schema), review the diff, surgically update only the suites and scenarios that reference changed primitives, and record a changelog entry on the server version. Nothing changes until a reviewed update is accepted.
license: MIT
disable-model-invocation: true
compatibility: Requires Node.js 22.13+, npm, shell access, and botz-mcp-swarm-cli with `project server updates`, or the central Swarm MCP server (`swarm_server_check_updates`). Contacts the target MCP servers to re-probe them.
metadata:
  author: zotoio
  cli-host: "@zotoio/botz-cli"
  cli-package: "@zotoio/botz-mcp-swarm-cli"
  cli-version: "0.15.0"
---

# Check MCP servers for updates and update affected suites

> **CLI availability:** `project server updates|accept-update|discard-update|changelog`, `project suite describe|tag`, `project scenario-tag`, `project run-tag` and `--tags` filters land in botz-mcp-swarm-cli after `0.15.0` (zotoio/botz-mcp-swarm-cli#28). Check `botz mcp-swarm project --help` first; if the subcommand is missing, tell the user it needs a newer CLI rather than improvising.

Each project server stores the MCP spec (protocol) version it negotiated at `initialize` and a snapshot of its advertised surface. A check re-probes the server and diffs it against that snapshot. Only suite steps that reference a removed or changed tool, resource, resource template or prompt get a proposal; unaffected suites and scenarios are never regenerated, and newly added primitives are never injected into existing suites.

## Setup

Run every command through the botz host as `botz mcp-swarm`, never the standalone `botz-mcp-swarm` or `swarm` executables. Before the first command in a session:

1. Run `botz --version`. If it is missing, check `node --version` (22.13+), install with `npm install -g @zotoio/botz-cli`, and say so. If that fails, stop and report it; do not use `sudo`.
2. Run `botz plugins info mcp-swarm --json`. If `installedVersion` is `null` or older than `0.15.0` (the version this plugin is pinned to, `metadata.cli-version`), run `botz plugins install mcp-swarm --version 0.15.0`.
3. Run `botz mcp-swarm project server updates --help`. If the command does not exist, tell the user the installed CLI is too old and stop.

When the user works against the central Swarm server instead (the plugin's `swarm` MCP server), use its MCP tools in the same order: `swarm_server_check_updates` → `swarm_server_update_apply` → `swarm_server_changelog`. Both need the `operator` role to change anything.

Name every server as `<server name> <version> (<URL or command>)` and show its MCP spec version (for example `MCP 2025-11-25`) in every summary.

## 1. Check (re-probes the servers; changes nothing in suites)

```sh
botz mcp-swarm project server updates <project> [--server <id>] --json
```

MCP: `swarm_server_check_updates { project_id, server_id? }`.

For each server the result has `diff` (`meta` for serverVersion/protocolVersion/serverName, `capabilities` added/removed, `primitives` with `kind`, `key`, `change` = added|removed|changed and changed `fields`), a readable `diff.summary`, and `proposals`. A server whose probe fails has `error`; report it and do not treat it as "no changes". A changed server keeps the probe as a **pending update** until it is accepted or discarded.

Present the review before anything else:

- protocol version before → after (call out a spec revision change explicitly, since it can change transport and capability semantics),
- serverInfo version before → after,
- a table of primitive changes (kind, name, change, fields),
- the proposals grouped by suite and scenario: `disable-step` (primitive removed; the step is kept but disabled), `refresh-args` (schema or prompt arguments changed; show `beforeArgs` → `afterArgs`), `acknowledge` (the step still fits; the suite is re-pinned to the new catalog).

## 2. Update affected suites (only after the user reviews)

Ask the user which proposals to accept. Never accept on their behalf without a clear instruction; "accept all" is a valid instruction. Ask for changelog notes (optional).

```sh
botz mcp-swarm project server accept-update <project> --server <id> [--change <proposalId> ...] [--notes "<notes>"] --json
```

MCP: `swarm_server_update_apply { project_id, server_id, accept_change_ids?, notes? }` (omit `accept_change_ids` to accept all).

Accepting adopts the new snapshot (catalog, surface, protocol version), writes exactly one new version per suite that had an accepted proposal, leaves every other suite on its current version (`untouchedSuiteIds`), and records a changelog annotation on the server with the auto-generated summary, the notes, and accepted/rejected proposal ids. Report the new suite versions and the untouched suites.

To drop a pending update instead: `botz mcp-swarm project server discard-update <project> --server <id>` (MCP: `swarm_server_update_apply` with `action: "discard"`).

## 3. Changelog

```sh
botz mcp-swarm project server changelog <project> [--server <id>] [--json]
botz mcp-swarm project server changelog <project> --server <id> --entry <entryId> --notes "<edited notes>"
```

MCP: `swarm_server_changelog { project_id, server_id?, entry_id?, notes? }`.

## Studio

In Swarm Studio (`/projects`, open a project) the **MCP servers under test** panel shows a protocol badge per server and the **Check for server updates** button. A changed server opens **Review server changes**; **Update affected suites** shows the per-change preview with an accept checkbox per proposal and a notes field. The **Server changelog** table lists recorded entries with editable notes.

## Safety

- Re-probing contacts the target. Only check servers the user is authorized to test.
- Do not run load or suites as part of a check.
- Do not edit suite files by hand to "apply" a proposal; use accept so the version history and changelog stay consistent.
