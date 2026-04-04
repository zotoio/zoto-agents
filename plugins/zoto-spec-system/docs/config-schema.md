# Configuration Schema

The Spec System is configured via `.spec-system/config.json` in your repository root.

## Schema

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `unitOfWork` | string | `"spec"` | The term used for work items in user-facing messages. Examples: `"spec"`, `"prp"`, `"task"`, `"story"` |
| `plansDir` | string | `"plans"` | Directory where plan directories are created. Relative to repo root |
| `workDir` | string | `"specs/current"` | Directory monitored by session hook for unprocessed items. Relative to repo root |
| `hooks.sessionStartNudge.enabled` | boolean | `true` | Whether the session start hook checks for unprocessed items |
| `hooks.sessionStartNudge.threshold` | number | `20` | Number of items in workDir before nudge triggers |
| `hooks.sessionStartNudge.message` | string | `"You have ${count} unprocessed ${unitOfWork}s..."` | Nudge message template. Supports `${count}` and `${unitOfWork}` interpolation |
| `plan.maxSubtasks` | number | `99` | Maximum subtasks allowed per plan |
| `plan.parallelLimit` | number | `4` | Maximum concurrent subagents during execution |
| `plan.adversarialVerification` | boolean | `true` | Whether adversarial verification is mandatory |
| `extensions.memory.enabled` | boolean | `false` | Whether the memory extension is active |
| `extensions.memory.plugin` | string\|null | `null` | Name of the memory plugin to use |

## Defaults

A minimal `{}` config is valid — all fields use sensible defaults.

## Paths

All path fields (`plansDir`, `workDir`) are relative to the repository root.
