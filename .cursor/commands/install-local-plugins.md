---
name: install-local-plugins
description: Install one or more monorepo plugins locally to ~/.cursor/plugins/local/
---

# install-local-plugins

Install selected plugins from this monorepo to `~/.cursor/plugins/local/` so
Cursor picks them up without a marketplace publish.

## Instructions

1. Discover available plugins by listing subdirectories of `plugins/` that
   contain `.cursor-plugin/plugin.json`. Read each `plugin.json` to get the
   `displayName`.

2. Use `askQuestion` to present a **multiselect** list of discovered plugins.
   Each option label should be `<displayName> (plugins/<dir-name>)`. Set
   `allow_multiple: true`.

3. For each selected plugin, run its `install-local` script from the plugin
   directory. Prefer in order:
   - `pnpm install-local` (when `package.json` has the script and deps are
     installed — monorepo checkout).
   - `pnpm exec tsx scripts/install-local.ts` as fallback.

   Every plugin's `install-local` writes to `~/.cursor/plugins/local/<name>/`,
   removes any legacy copy at `~/.cursor/plugins/<name>/` (so rules are not
   loaded twice), and registers `<name>@local` in
   `~/.claude/plugins/installed_plugins.json`.

4. Forward any flags from `$ARGUMENTS` (e.g. `--dry-run`) to each invocation.

5. After all selected plugins finish, report a summary:
   - Which plugins installed successfully.
   - Which plugins failed (with stderr excerpt).
   - Remind the user to reload the Cursor window to pick up changes.

## Failure Modes

- **No plugins found** — report that `plugins/` contains no valid plugin
  directories.
- **User selects nothing** — acknowledge and exit without action.
- **Individual plugin install fails** — continue with remaining plugins; report
  failures at the end.
