# Changelog

## Unreleased

- `mcp-swarm-compare`: `runs-dataset.mjs` takes the server name, version, and endpoint from each report's `server` field, so runs with `--url` or `--target-file` are labelled with the endpoint actually tested. Reports without it (CLI 0.6.1 and earlier) still fall back to the saved suite, are flagged in `comparability`, and have their suite endpoint written the same way the CLI writes it (no URL credentials or query, stdio paths as basenames). Each run row has `serverSource` (`report`, `suite`, or `null`).
- `mcp-swarm-compare`: tools whose catalog schema hash changed between consecutive runs are listed in `comparability` and not scored for regressions, matching `botz mcp-swarm compare`. Only reports without a catalog get the "no tool catalog" note.
- `mcp-swarm`: take the server label from the report's `server` field when present.

## 0.7.0

- Add the plugin logo (`assets/logo.png`) for Cursor and as the OpenAI listing logo and composer icon.
- Add `mcp-swarm-guided`: question-driven target, credential, test-data, tool, and load selection, followed by capture, review, run, and summary. Tool selection defaults to all tools; write-like tools need per-tool confirmation and are never enabled on production.
- Add `mcp-swarm-compare` with `scripts/runs-dataset.mjs`: compare two runs or a series, flag non-comparable runs, apply the CLI's regression rules, and chart results in `/canvas` or a self-contained HTML page.
- Add `mcp-swarm-descriptions` (tool description review, `optimize` suggestions, tool-eval measurement) and `mcp-swarm-record-replay`.
- Every output names the MCP server by name and URL or command; suites are named after the server.
- Move the MCP Swarm skills here from `@zotoio/botz-mcp-swarm-cli`, which bundled them through 0.6.x. The plugin is now versioned independently.
- Publish for Cursor, Claude Code, and Codex, with evals for each skill.
- Skills run only when invoked by name and install the `botz` host and its `mcp-swarm` extension on first use.
- `mcp-swarm-upgrade` removes skill copies installed by CLI 0.6.x instead of refreshing them.
