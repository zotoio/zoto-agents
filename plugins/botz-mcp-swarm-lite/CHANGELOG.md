# Changelog

## Unreleased

## [0.1.0] - 2026-10-30

- New plugin: `botz-mcp-swarm` skills for local execution of the botz MCP Swarm CLI with no central Botz MCP Swarm server. No `mcp.json` / `.mcp.json`; no `--remote`, `--server`, worker mode or `swarm_*` MCP tools.
- Skills and commands are prefixed `mcp-swarm-lite` (`/z-mcp-swarm-lite-*`) so both plugins can be installed side by side.
- Pinned to `@zotoio/botz-mcp-swarm-cli` `0.15.0` (`metadata.cli-version`), including protocol eras, server update checks (spec version, diff review, selective suite updates, changelog annotations), descriptions and tags.
