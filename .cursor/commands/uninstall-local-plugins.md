---
name: uninstall-local-plugins
description: Uninstall one or more locally-installed plugins from ~/.cursor/plugins/
---

# uninstall-local-plugins

Remove selected plugins from the local Cursor plugins directory and deregister
them so Cursor no longer loads them.

## Instructions

1. Discover **currently installed** plugins by listing directories under
   `~/.cursor/plugins/local/` that contain a `.cursor-plugin/plugin.json`
   manifest. Also check `~/.cursor/plugins/<name>/` (the legacy pre-unification
   install location) for any plugins whose name matches a monorepo plugin —
   a copy there alongside the `local/` copy means Cursor loads the plugin's
   rules twice. Read each `plugin.json` to get the `displayName`.

2. Use `askQuestion` to present a **multiselect** list of installed plugins.
   Each option label should be `<displayName> (<install-path>)`. Set
   `allow_multiple: true`.

3. For each selected plugin, run its `uninstall-local` script if available in
   the monorepo source. Prefer in order:
   - `pnpm uninstall-local` from `plugins/<plugin-name>/` (when the monorepo
     source is available and deps are installed).
   - `pnpm exec tsx plugins/<plugin-name>/scripts/uninstall-local.ts` as
     fallback.
   - If no uninstall script exists in the monorepo for that plugin, manually
     remove both install directories and deregister the `<name>@local` entry
     from `~/.claude/plugins/installed_plugins.json` and `enabledPlugins` in
     `~/.claude/settings.json` (Cursor reads the plugin registry from the
     `~/.claude/` config tree — this is not a typo).

4. Forward any flags from `$ARGUMENTS` (e.g. `--dry-run`) to each invocation.

5. After all selected plugins finish, report a summary:
   - Which plugins were removed successfully.
   - Which plugins failed (with stderr excerpt).
   - Remind the user to reload the Cursor window.

## Failure Modes

- **No plugins installed** — report that no locally-installed plugins were
  found.
- **User selects nothing** — acknowledge and exit without action.
- **Individual plugin uninstall fails** — continue with remaining plugins;
  report failures at the end.
