# Changelog

## 0.7.0

- Move the MCP Swarm skills here from `@zotoio/botz-mcp-swarm-cli`, which bundled them through 0.6.x. The plugin is now versioned independently.
- Publish for Cursor, Claude Code, and Codex, with evals for each skill.
- Skills run only when invoked by name and install the `botz` host and its `mcp-swarm` extension on first use.
- `mcp-swarm-upgrade` removes skill copies installed by CLI 0.6.x instead of refreshing them.
