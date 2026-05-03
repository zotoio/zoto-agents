---
name: zoto-eval-configure
description: Guided askQuestion-driven configuration for the Eval System plugin.
---

# zoto-eval-configure

Interactive setup that writes `.zoto-eval-system/config.json`. Every prompt goes through the `askQuestion` tool — no free-form unless a field is documented as open-ended.

## Usage

```
/zoto-eval-configure
```

## Instructions

Spawn a `zoto-eval-configurer` subagent. The agent uses the `zoto-configure-evals` skill to collect and write the config.

### What happens

1. Check for an existing `.zoto-eval-system/config.json`. If present, ask via `askQuestion` whether to overwrite.
2. Walk the documented fields, asking each via `askQuestion`.
3. Stamp `update.preserveUserAuthoredCases: true` and `update.writeMetaMarker: true` without prompting (both are hard-coded contracts).
4. Validate the result against `templates/schema/config.schema.json`.
5. Summarise and point the user at `/zoto-eval-create`.

## Related

- `zoto-eval-configurer` agent — wraps the configuration skill.
- `zoto-configure-evals` skill — the documented workflow.
- `/zoto-eval-create` — the next command to run after configure.
