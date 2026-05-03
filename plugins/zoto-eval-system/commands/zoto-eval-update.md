---
name: zoto-eval-update
description: Diff-aware eval updater. Surgical diffs preserve user-authored cases. Targeted and rediscovery modes; --check for CI.
---

# zoto-eval-update

Keeps generated eval cases in sync with the code they cover. User-authored cases (no `_meta`, or `_meta.generated === false`) are NEVER mutated — the `_meta.generated === true` contract is enforced at runtime and at compile time.

## Usage

```
/zoto-eval-update                      # rediscovery dry-run
/zoto-eval-update --apply              # rediscovery apply (askQuestion per change)
/zoto-eval-update <file-or-glob>       # targeted dry-run
/zoto-eval-update <file-or-glob> --apply
/zoto-eval-update --check              # CI gate (exit 0 or 2)
```

## Instructions

Spawn a `zoto-eval-updater` subagent that uses the `zoto-update-evals` skill.

### Argument handling

- **No args**: rediscovery mode. Without `--apply`, emit a diff report only. With `--apply`, `askQuestion` per change.
- **`<file-or-glob>`**: targeted mode. Same dry-run / apply semantics.
- **`--check`**: non-interactive CI mode. Exits 0 on clean drift, or `config.update.checkExitCodeOnCriticalDrift` (default 2) on critical drift.

### What happens (apply modes)

1. Load `.zoto-eval-system/config.json` and `.zoto-eval-system/manifest.yml`. Abort if the manifest is missing.
2. Rediscover using `manifest.discovery_config` (snapshot from last create/update).
3. Classify each delta against `config.update.criticalChangeRules`.
4. Build surgical patches for generated cases. Flag user-authored cases as "may need review".
5. Present each change via `askQuestion` (accept / reject / edit / skip-rest).
6. Write accepted patches, update `manifest.yml`, append a snapshot to `manifest.history.yml`.
7. Summarise: `{ added, removed, modified-applied, modified-skipped, orphaned, user-authored-flagged }`.

## Related

- `zoto-eval-updater` agent — wraps the diff engine.
- `zoto-update-evals` skill — the documented workflow.
- `/zoto-eval-create` — prerequisite; initial scaffold produces the manifest.
- `pnpm run eval:update:check` — CI-equivalent non-interactive gate.
