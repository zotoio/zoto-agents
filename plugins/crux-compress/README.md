# CRUX Compress

[CRUX-Compress](https://github.com/zotoio/CRUX-Compress), packaged as a plugin for Cursor, Claude Code, and Codex.

CRUX (Context Reduction Using X-encoding) compresses markdown rules, code files, images, and web pages into a dense notation that agents read directly, usually to about a quarter of the original tokens. The plugin carries the CRUX-Compress release unchanged except for the path and frontmatter changes listed in [`scripts/upstream-map.json`](scripts/upstream-map.json).

This plugin is version **2.11.8**, the same as the CRUX-Compress release it packages.

## Requirements

- Python 3 (`python3` on `PATH`) for the hooks and the `crux-utils` and memory-index scripts.

## Set up a project

Run once in each project, and again after updating the plugin:

```text
/z-crux-init
/z-crux-init with memories
```

This copies the CRUX specification to `CRUX.md`, adds or refreshes the `<CRUX>` block in `AGENTS.md`, and writes `.crux/crux.json`. With memories, it also creates `.crux/crux-memories.json` (memories stay off until you set `enableMemories` to `"true"`), `memories/`, and `.crux/reference-tracking/`.

If the project already has CRUX from the upstream installer (files under `.cursor/agents/crux*`, `.cursor/commands/crux*`, `.cursor/skills/crux*`, `.cursor/hooks/crux-*.py`), `/z-crux-init` lists them and offers to remove them. Leaving them loads every CRUX agent and rule twice and runs each hook twice.

## What's included

| Component | Contents |
|---|---|
| Commands | `/crux-compress`, `/crux-dream`, `/crux-recall`, `/crux-remember`, `/crux-forget`, `/crux-amnesia`, `/crux-meditate`, and a `/z-<skill>` command for each skill |
| Agents | `crux-cursor-rule-manager`, `crux-cursor-meditation-guide`, `crux-cursor-memory-manager` (deprecated upstream), and the memory agents `crux-memory-dream`, `crux-memory-rem`, `crux-memory-recall`, `crux-memory-remember`, `crux-memory-forget` |
| Skills | `crux-init` (this plugin), `crux-utils`, and the `crux-skill-memory-*` skills |
| Rules | `_CRUX-RULE.mdc`, `crux-memories-integration.crux.mdc`, and `crux-plugin-paths.mdc` (this plugin) |
| Hooks | Session start (pending compressions, memory nudges), after file edit (queue changed `crux: true` sources, flag the memory index), after agent response (track `[memory:*]` references) |

The `crux-skill-memory-meditation-*` skills are steps of `/crux-meditate`, loaded by the `crux-cursor-meditation-guide` agent. Their `/z-` commands exist to inspect or reuse one step.

### Hooks

`hooks/hooks.json` runs each hook as `python3 "${CURSOR_PLUGIN_ROOT:-.}"/hooks/<hook>.py`, so it finds the script whether Cursor runs plugin hooks from the plugin directory or provides `CURSOR_PLUGIN_ROOT`. The hooks read and write `.crux/` in `CURSOR_PROJECT_DIR`. The hooks file uses Cursor's format, so Claude Code does not run these hooks.

### Paths

Upstream files refer to their own files as `.cursor/...`. In the plugin those paths are written `<plugin>/...`, and `rules/crux-plugin-paths.mdc` tells agents that `<plugin>` is the plugin's install directory. Project paths (`CRUX.md`, `AGENTS.md`, `.crux/`, `memories/`, your `.cursor/rules/`) are unchanged.

## Update from upstream

The plugin is built from a CRUX-Compress GitHub release by [`scripts/sync-upstream.mjs`](scripts/sync-upstream.mjs):

```bash
node scripts/sync-upstream.mjs --ref v2.11.8
node scripts/sync-upstream.mjs
node scripts/sync-upstream.mjs --check --ref v2.11.8
```

The script:

1. Downloads the release zip (or reads one given with `--zip`).
2. Checks every file against the release's own `.crux/crux-release-files.json` checksums.
3. Fetches files the zip leaves out from the release commit (see `extraFiles` and `derived` in the map).
4. Moves files into the plugin layout and applies the rewrites and frontmatter in `scripts/upstream-map.json`. `--raw` skips the content changes.
5. Writes `upstream.json` with the tag, commit, and per-file checksums, and removes files that an earlier sync wrote and this release no longer has.

`--check` writes nothing and exits non-zero if the plugin differs from the release. After syncing a new release, bump the version in the three manifests and `package.json` to match, and add wrapper commands and evals for any new skills (`validate-template` reports missing ones).

Files this plugin adds are not touched by a sync: `rules/crux-plugin-paths.mdc`, `skills/crux-init/`, `commands/z-*.md`, every `evals/` directory, the manifests, `assets/`, `tests/`, and this README.

## Known upstream issues

- `AGENTS.crux.md` is in the zip but not in the release's checksum manifest, so the sync cannot verify it and warns.

## Licence

MIT, from the CRUX-Compress repository ([`LICENSE`](LICENSE)).
