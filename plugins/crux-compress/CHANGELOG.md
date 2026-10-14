# Changelog

## 2.11.7

- First release: packages CRUX-Compress v2.11.7 (commit `1a252af`) as a plugin for Cursor, Claude Code, and Codex.
- Add `scripts/sync-upstream.mjs`, which builds the plugin from a CRUX-Compress release, checks each file against the release checksums, and records the result in `upstream.json`.
- Add the `crux-init` skill (`/z-crux-init`) to set up `CRUX.md`, the `AGENTS.md` `<CRUX>` block, `.crux/crux.json`, and optional memory scaffolding in a project.
- Add `rules/crux-plugin-paths.mdc`, which tells agents where `<plugin>/...` paths point.
- Add a `/z-<skill>` command with evals for each skill, and evals for each skill, command, agent, and the hooks.
- Run hooks as `python3 "${CURSOR_PLUGIN_ROOT:-.}"/hooks/<hook>.py`; the hooks keep project state in `CURSOR_PROJECT_DIR`.
