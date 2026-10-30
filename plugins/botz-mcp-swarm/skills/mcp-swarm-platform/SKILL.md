---
name: mcp-swarm-platform
description: Opt in to Botz MCP Swarm platform mode and use its features (central swarm MCP server with OAuth, remote suite runs, worker dispatch, service suites, swarm_* MCP tools). Use only when the user explicitly enables platform mode or BOTZ_MCP_SWARM_MODE=platform is set.
license: MIT
disable-model-invocation: true
compatibility: Requires Node.js 22.13+, npm, shell access, and an MCP client supporting streamable HTTP + OAuth 2.1. Contacts the central Swarm server.
metadata:
  author: zotoio
  cli-host: "@zotoio/botz-cli"
  cli-package: "@zotoio/botz-mcp-swarm-cli"
  cli-version: "0.15.0"
---

# MCP Swarm platform mode (opt-in)

The plugin defaults to **local mode**: no MCP server is wired up and the other skills describe only local execution of the CLI. Platform mode is off until the user turns it on. Never enable it, sign in, or ask for tokens unless the user asked for platform features.

## Is platform mode on?

Platform mode is on when **either** `BOTZ_MCP_SWARM_MODE=platform` is set in the agent's environment **or** a `swarm` MCP server pointing at `https://swarm.botz.ai/mcp` is connected. Otherwise treat it as off and stay local.

## Turn it on (per host)

Ask the user which host and scope (project or user) first, then show the exact change before writing it. The server entry is in `platform/mcp.json` in this plugin.

- **Cursor:** add the `swarm` entry to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (user): `{"mcpServers": {"swarm": {"type": "http", "url": "https://swarm.botz.ai/mcp"}}}`. Cursor runs the OAuth sign-in when the server first connects.
- **Claude Code:** `claude mcp add --transport http --scope project swarm https://swarm.botz.ai/mcp` (or `--scope user`), then `/mcp` to sign in.
- **Codex:** `codex mcp add swarm --url https://swarm.botz.ai/mcp` (or add `[mcp_servers.swarm]` with `url = "https://swarm.botz.ai/mcp"` to `~/.codex/config.toml`), then `codex mcp login swarm`.
- **CLI-only / CI:** export `BOTZ_MCP_SWARM_MODE=platform` and use the CLI's `--remote` / `--server` flags with `SWARM_TOKEN` from the environment. Never print or store the token in a file.

To turn it off, remove the `swarm` entry (`claude mcp remove swarm`, `codex mcp remove swarm`, or delete it from `.cursor/mcp.json`) and unset `BOTZ_MCP_SWARM_MODE`.

## Central Swarm MCP server and sign-in

### Central Swarm MCP Server (`https://swarm.botz.ai/mcp`) & OAuth Sign-In

Platform mode adds a `swarm` MCP server entry (template: `platform/mcp.json` in this plugin) pointing at the central Swarm control plane:

```json
{
  "mcpServers": {
    "swarm": {
      "type": "http",
      "url": "https://swarm.botz.ai/mcp"
    }
  }
}
```

- **Interactive IDE OAuth 2.1 + PKCE + DCR (default):** When enabled in Cursor, Claude Code, or Codex, `https://swarm.botz.ai/mcp` advertises RFC 9728 Protected Resource Metadata (`/.well-known/oauth-protected-resource`) and RFC 8414 OAuth 2.1 Authorization Server Metadata (`/.well-known/oauth-authorization-server`). Your IDE opens a browser sign-in flow automatically—no static tokens or environment variables are stored in the plugin.
- **Headless / CI `Bearer bzt_...` Authentication:** Non-interactive callers can mint a scoped `bzt_...` IAM key (`viewer`, `runner`, `editor`, `operator`, `owner`, or `service_bridge`) in Swarm Studio (`/settings` -> **IAM & API Keys**) and pass `Authorization: Bearer $SWARM_TOKEN`.
- **When to use MCP tools vs CLI:** When the `swarm` MCP server is connected, you can inspect projects (`swarm_projects_list`, `swarm_project_get`), apply load presets (`swarm_load_presets_list`, `swarm_suite_conversational_update`), start/monitor central runs (`swarm_run_start`, `swarm_run_progress`, `swarm_run_get`), query correlated server telemetry (`swarm_server_telemetry_get`), and run AI root-cause analysis (`swarm_run_analyse`) directly via MCP tools, or use the CLI below for local/remote execution and distributed worker fleets.

- **28-tool Swarm MCP server (`https://swarm.botz.ai/mcp`):** Exposes 28 tools (`swarm_projects_list`, `swarm_suite_conversational_update`, `swarm_suite_enhance`, `swarm_run_start`, `swarm_run_progress`, `swarm_run_cleanup_assets`, `swarm_ingest_server_telemetry`, etc.) and 4 `@mcp.prompt` workflows (`/swarm_remediate_latest_run`, `/audit_mcp_server`, `/triage_suite_run`, `/soak_test_plan`) with OAuth 2.1 + PKCE + DCR and `bzt_` IAM keys (including `service_bridge`).

### Central Swarm Suite Execution & Distributed VU/OTEL Worker Mode (`>= 0.14.0`)

- **Triggering a Suite Run on the Central Swarm Server (`run --remote` / `--server`):**
  - Execute a project or suite remotely on the central Swarm control plane (`https://swarm.botz.ai` by default, or `SWARM_SERVER_URL`), streaming live progress/VUs/latency and returning the full `RunReport`:
    ```sh
    botz mcp-swarm run --suite proj-botz-mcp --remote --preset baseline --token $SWARM_TOKEN
    botz mcp-swarm suite run --suite proj-botz-mcp --server https://swarm.botz.ai --dispatch worker --format json
    ```
  - Pass `--dispatch worker` to distribute the suite's virtual users across registered remote CLI workers connected to the central Swarm hub.
- **Starting a Distributed VU & OTEL Worker (`botz mcp-swarm worker`):**
  - Start the CLI as a long-running worker node that registers with the central Swarm server (`--server`, defaulting to `SWARM_SERVER_URL` or `https://swarm.botz.ai`), advertises its VU capacity (`--max-vus <n>`) and capabilities, executes assigned VU slices (`User-Agent: botz-mcp-swarm/<version> (mcp-tester)`), and exports OpenTelemetry spans and metrics (`/otlp/v1/traces` and `/otlp/v1/metrics` plus real-time worker progress frames) back to the central Swarm server:
    ```sh
    botz mcp-swarm worker --server https://swarm.botz.ai --token $SWARM_WORKER_TOKEN --max-vus 25 --otel-export
    ```

### Suites on the swarm service

For suites stored in the botz-mcp-swarm service (`0.6.0+`, for example swarm.botz.ai), failed smoke test runs auto-trigger error analysis and surface recommendations in the run view, while other runs use the run view's **Analyse errors** button (Studio also provides a per-run standalone HTML/PDF **Report** link and `/docs` reference page). The service's rules apply: runners can analyse, and only editors and admins can accept or reject. An accepted fix becomes a new suite version, with the run, proposal ids and user in its history and the audit log. Do not copy a service suite to work around those permissions.

- **Latest-only editing & inline JEV eval testing (`>= 0.12.0`):** On the Swarm service workspace (`/projects/:id`), **✨ Analyse Run** is highlighted in the top toolbar and run report for every completed run. Applying suite fix proposals or editing JEV eval prompts/assertions inline (`Test inline`, `Re-judge assertions`, and `Save all to new suite version`) is enabled only when viewing the **latest suite version (`vN`) and its latest run**, preventing accidental forks from older historical versions.

### Server updates on the platform

When the user works against the central Swarm server instead (the plugin's `swarm` MCP server), use its MCP tools in the same order: `swarm_server_check_updates` → `swarm_server_update_apply` → `swarm_server_changelog`. Both need the `operator` role to change anything.
MCP: `swarm_server_check_updates { project_id, server_id? }`.
MCP: `swarm_server_update_apply { project_id, server_id, accept_change_ids?, notes? }` (omit `accept_change_ids` to accept all).
MCP: `swarm_server_changelog { project_id, server_id?, entry_id?, notes? }`.

### Refresh from server, last introspected, and the remediation gate

- **Studio:** the **MCP servers under test** panel and the suite view show `Last introspected: <relative>` (hover for the absolute time), the era/spec badge (for example `2026-07-28` modern) and a **stale** badge (default 24h). **⟳ Refresh from server** (and **Check for server updates** in the servers panel) re-probes now; changes and suite drift open **Review server changes** with **Update affected suites** (accept checkbox per proposal, notes) and nothing is applied until accepted. The **Server changelog** table lists recorded entries with editable notes. The Analyse panel shows whether the run gets a server remediation prompt, suite-fix recommendations, or is blocked pending a refresh.
- **API:** `GET /api/admin/projects/:pid/introspection`, `POST /api/admin/projects/:pid/servers/:svid/refresh`, `POST /api/admin/projects/:pid/suites/:sid/refresh`. `GET …/server-prompt.md` returns `409 refresh_needed` when introspection is stale and auto-refresh is off, suite-fix markdown (`X-Remediation-Kind: suite_fix`) when every finding is `suite_bug`, and otherwise a server prompt that carries the last-introspected timestamp and a "Suite Changes Pending Review" section.
- **MCP:** `swarm_server_introspection_status { project_id, server_id? }` (viewer), `swarm_server_refresh { project_id, server_id? | suite_id? }` (operator), and `swarm_remediation_prompt { …, auto_refresh?, stale_hours? }`, which returns `kind` (`server` | `suite_fix` | `none`), `blocked`, `introspection` and `pending_reviews`. Never accept pending reviews on the user's behalf.

### Descriptions and tags on the platform

MCP: `swarm_describe { project_id, entity: "suite" | "server", id, description }`.
MCP: `swarm_tags_set { project_id, entity: "suite" | "scenario" | "run", id, suite_id?, tags: [...] }`.
MCP: `tags` on `swarm_suites_list`, `swarm_scenarios_list` and `swarm_runs_list`.
In Swarm Studio the **Descriptions & tags** panel shows tag chips; click chips to filter the Suites, Scenarios and Runs tables (every column heading sorts ascending and descending), and **Edit** on a row to change its description or tags.

### Descriptions drafts

Accepting a description draft happens in the Swarm service dashboard; the CLI has no accept command.
