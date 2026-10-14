# Changelog

## 0.7.0

- Add `mcp-swarm-guided`: question-driven target, credential, test-data, tool, and load selection, followed by capture, review, run, and summary. Tool selection defaults to all tools; write-like tools need per-tool confirmation and are never enabled on production.
- Add `mcp-swarm-compare` with `scripts/runs-dataset.mjs`: compare two runs or a series, flag non-comparable runs, apply the CLI's regression rules, and chart results in `/canvas` or a self-contained HTML page.
- Add `mcp-swarm-descriptions` (tool description review, `optimize` suggestions, tool-eval measurement) and `mcp-swarm-record-replay`.
- Every output names the MCP server by name and URL or command; suites are named after the server.
- Move the MCP Swarm skills here from `@zotoio/botz-mcp-swarm-cli`, which bundled them through 0.6.x. The plugin is now versioned independently.
- Publish for Cursor, Claude Code, and Codex, with evals for each skill.
- Skills run only when invoked by name and install the `botz` host and its `mcp-swarm` extension on first use.
- `mcp-swarm-upgrade` removes skill copies installed by CLI 0.6.x instead of refreshing them.
