---
name: crux-init
description: Set up CRUX Compress in the current project from this plugin. Copies the CRUX specification to CRUX.md, adds or refreshes the <CRUX> block in AGENTS.md, records the version in .crux/crux.json, and optionally creates the memory system scaffolding. Use when CRUX.md is missing, after updating the plugin, or when the user asks to install, initialise, or update CRUX in a project.
---

# CRUX init

Set up a project to use the CRUX Compress plugin. This does the project-side steps of the upstream installer (`install.py`). The agents, commands, skills, rules, and hooks already come from the plugin, so nothing is copied into `.cursor/`.

`<plugin>` is this plugin's install directory (see `<plugin>/rules/crux-plugin-paths.mdc`). Run every step from the project root.

## Inputs

- **Memories**: whether to create the memory system scaffolding. Ask the user if they did not say. Default: no.
- **Force**: overwrite a `CRUX.md` the user has changed. Default: no.

## Steps

1. **Read the plugin version.** Read `<plugin>/upstream.json` and take `tag` without the leading `v` (for example `2.11.6`).

2. **Refuse inside the CRUX-Compress repo.** If the project root has both `CRUX.md` and `scripts/create-crux-zip.py`, stop: this is the upstream repository, and its files are the source of the plugin.

3. **Check for an older install.** Look for files the upstream installer copies into the project: `.cursor/agents/crux-cursor-*.md`, `.cursor/agents/crux/`, `.cursor/commands/crux-*.md`, `.cursor/commands/crux/`, `.cursor/skills/crux-*`, `.cursor/skills/crux/`, `.cursor/rules/_CRUX-RULE.mdc`, `.cursor/rules/crux/`, `.cursor/hooks/crux-*.py`, and `crux-*` entries in `.cursor/hooks.json`. If any exist, list them and tell the user that both copies will load and hooks will run twice. Offer to remove them, and remove nothing without a clear yes.

4. **Write `CRUX.md`.**
   - Missing: copy `<plugin>/spec/CRUX.md` to `CRUX.md`.
   - Present: compare the `version:` in its frontmatter with the plugin's copy. Same version and same content: leave it. Same version with different content: the user changed it; replace it only with **Force**. Older version: replace it, and say which versions.

5. **Add the `<CRUX>` block to `AGENTS.md`.** The block is everything from `<CRUX agents="always">` to `</CRUX>` in `<plugin>/spec/AGENTS.crux.md`.
   - No `AGENTS.md`: create it with the block.
   - `AGENTS.md` has a `<CRUX` … `</CRUX>` block: replace that block only, and keep everything else byte for byte.
   - `AGENTS.md` has no block: add the block at the top, followed by a blank line.
   - Never create `AGENTS.crux.md` in the project.

6. **Record the version.** Write `.crux/crux.json` as `{"version": "<version>"}` followed by a newline.

7. **Memories (only if requested).**
   - If `.crux/crux-memories.json` exists, leave it and say so.
   - Otherwise copy `<plugin>/templates/crux-memories.default.json` to `.crux/crux-memories.json`. Memories stay off until the user sets `enableMemories` to `"true"` in its `flags`.
   - Create `memories/`, `memories/agents/`, and `.crux/reference-tracking/` if they are missing.

8. **Check Python.** The plugin's hooks and scripts run with `python3`. Run `python3 --version`; if it fails, tell the user that the hooks will not run until Python 3 is installed.

9. **Report.** List each file created, replaced, or left alone, the version installed, and these next steps:
   - Add `crux: true` to the frontmatter of a rule to have it compressed when it changes.
   - Run `/crux-compress ALL` to compress every eligible rule.
   - To update later, update the plugin and run `/z-crux-init` again.

## Safety

- Change only `CRUX.md`, `AGENTS.md`, `.crux/crux.json`, and (for memories) `.crux/crux-memories.json`, `memories/`, and `.crux/reference-tracking/`.
- Delete files only in step 3, after the user confirms.
- Never edit files in `<plugin>`.
