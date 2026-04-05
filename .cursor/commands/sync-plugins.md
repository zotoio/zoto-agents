---
name: sync-plugins
description: Force-sync plugin source files to ~/.cursor/plugins/local/
---

# sync-plugins

Force-sync all plugin source files to the local Cursor plugins directory.

## Instructions

Run the sync script in the workspace root:

```
node .cursor/hooks/sync-plugins.mjs --full
```

Feed an empty JSON object `{}` to stdin since the script expects the hook protocol.

After the command completes, report the result to the user. List which plugins were synced and let them know a Cursor window reload will pick up the changes.
