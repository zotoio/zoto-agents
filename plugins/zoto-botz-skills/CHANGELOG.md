# Changelog

## 0.3.0 (2026-10-26)

- Upgraded `botz-mcp` client skill to v5:
  - Added two-mode consumption: silent staging (`.botz/staged/<id>@<version>/<variant>/`) and persistent workspace/user installation (`skill_install`, `agent_install`) across Cursor, Claude Code, Codex (`.agents/`), and canonical layouts.
  - Documented RFC 6570 MCP resource templates (`skill://{name}@{version}/SKILL.md`, `SKILL.crux.md`, `resources/{+path}`, `bundle`, and `agent://` equivalents) with `ETag`/`sha256` immutable and TTL caching.
  - Documented batch `skill_resources_get(name, "*")`, `updates_check`, `skill_diff`/`agent_diff`, `requires` preflight, `.botz/policy.json`, and client-side secret redaction before `skill_request`/`agent_request`.

## 0.2.2

- Sync `botz-mcp` skill (v4) from `zotoio/botz-mcp`: reinforce preference for `skill_get_compressed` (and `agent_get_compressed`) which returns the default unified CRUX bundle incorporating the main skill/agent Markdown plus all `references/` and `scripts/` in a single call; document `skill_get(raw=true)` + `skill_resource_get` as the plain-Markdown alternative.

## 0.2.1

- Sync the `botz-mcp` skill from zotoio/botz-mcp: on 401, IDE clients re-run the GitHub sign-in; only headless/CI callers use a `bzt_` API key as an `Authorization: Bearer` header.
- Docs: IDE setup is URL + GitHub OAuth only; add a separate Headless / CI section.

## 0.2.0

- Move the plugin into zoto-agents from `zotoio/botz-mcp` (`marketplace/botz-skills/`, published there as 0.1.0).
- Connect to the hosted server: the MCP entry is now `botz` → `https://mcp.botz.ai/mcp` with OAuth sign-in. The `BOTZ_MCP_URL` / `BOTZ_TOKEN` env variables and the static `Authorization` header are gone.
- Add `.mcp.json` for Claude Code, the `/z-botz-mcp` command, and evals for the skill and command.
- Register the plugin in the Cursor, Claude Code, and Codex marketplaces.
