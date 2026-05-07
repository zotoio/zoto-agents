---
name: z-spec-init
description: Initialise the Spec System config at .zoto/spec-system/config.yml with a commented template of all defaults.
---

# z-spec-init

Scaffold a fresh `.zoto/spec-system/config.yml` for this repository. The generated file contains every supported key — **commented out** — alongside the value the plugin would otherwise apply internally. Uncomment any line(s) to override a default.

## Usage

```
/z-spec-init                  - Create .zoto/spec-system/config.yml from the init template (no-op if it already exists)
/z-spec-init --force          - Overwrite an existing config.yml with a fresh init template (DESTRUCTIVE)
```

## Instructions

1. Resolve the repository root from `$CURSOR_WORKING_DIRECTORY` (fall back to the current working directory if unset).
2. Read `plugins/zoto-spec-system/templates/init-config.yml` from the installed plugin and write it verbatim to `<repoRoot>/.zoto/spec-system/config.yml`, creating the parent directories with `mkdir -p` semantics.
3. **Idempotency rule:** if the destination file already exists, **abort with a non-zero exit message** unless `--force` was passed. Never silently overwrite a user-edited config.
4. After writing the file, print a one-line confirmation that includes:
   - the absolute path of the new file,
   - a reminder that all defaults are commented (so the file behaves identically to no-config until the user uncomments lines),
   - a pointer to `plugins/zoto-spec-system/docs/config-schema.md` for the full reference.
5. Do **not** run `/z-spec-create` or any other Spec System command from this command — `init` is purely a scaffolding step.

## Failure modes

- **Plugin template missing** — surface a precise error (`templates/init-config.yml not found at <path>`); do not synthesize a fallback.
- **Destination exists without --force** — exit non-zero with the message `.zoto/spec-system/config.yml already exists; pass --force to overwrite`.
- **Filesystem permission denied** — surface the underlying OS error verbatim.

## Related

- `plugins/zoto-spec-system/templates/init-config.yml` — the canonical template
- `plugins/zoto-spec-system/templates/schema/config.schema.json` — JSON Schema used by the loader
- `plugins/zoto-spec-system/docs/config-schema.md` — human-readable field reference
- `/z-spec-create`, `/z-spec-execute`, `/z-spec-judge` — these all require `.zoto/spec-system/config.yml` to exist
