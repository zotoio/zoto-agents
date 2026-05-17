# Configuration schema

The Spec System reads **`plugins/zoto-spec-system/templates/schema/config.schema.json`** when validating normalized configuration and documenting defaults. On disk the canonical workspace file is **`.zoto/spec-system/config.yml`** at the repository root. **`/z-spec-init`** scaffolds that YAML path only — unsupported paths are rejected early.

The loader normalizes the YAML source into the same shape the schema describes; see [`example-config.yml`](example-config.yml) for a worked sample.

## Top-level keys

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `unitOfWork` | string | `"spec"` | Term used for work items in user-facing messages (`spec`, `prp`, `task`, `story`, …). |
| `specsDir` | string | `"specs"` | Directory where spec folders are created, relative to repo root. |
| `workDir` | string | `"specs/current"` | Directory monitored by hooks for unprocessed items, relative to repo root. |
| `hooks` | object | *(see below)* | Hook integration settings; unknown nested keys allowed per schema `additionalProperties`. |
| `hooks.sessionStartNudge.enabled` | boolean | `true` | When true, session-start hook counts items under `workDir`. |
| `hooks.sessionStartNudge.threshold` | integer | `20` | Minimum count before nudge fires (`minimum: 0`). |
| `hooks.sessionStartNudge.message` | string | `"You have ${count} unprocessed ${unitOfWork}s..."` | Template with `${count}` and `${unitOfWork}`. |
| `spec` | object | *(see below)* | Execution limits and verification policy. |
| `spec.maxSubtasks` | integer | `99` | Maximum subtasks per spec (`minimum: 1`). |
| `spec.parallelLimit` | integer | `4` | Maximum concurrent subagents (`minimum: 1`). **Live-reloadable** — applies on next aggregator iteration / spawn decisions without restarting `/z-spec-execute`. |
| `spec.adversarialVerification` | boolean | `true` | When true, adversarial verification is mandatory before closing a spec. |
| `extensions` | object | *(see below)* | Optional integrations; **fresh-invocation-required** when changed mid-run. |
| `extensions.memory.enabled` | boolean | `false` | Enables memory extension hooks when true. |
| `extensions.memory.plugin` | string \| null | `null` | Memory plugin id or null to disable binding. |
| `subagents` | object | *(roles below)* | Per-role defaults for spawned subagents. |
| `subagents.default.tokenBudget` | integer | `200000` | Fallback budget (`1000`–`2000000`). |
| `subagents.default.model` | string | *(omit)* | Optional default model slug. |
| `subagents.generator` | object | *(inherits)* | Overrides for generator role. |
| `subagents.executor` | object | *(inherits)* | Overrides for executor role. |
| `subagents.judge` | object | *(inherits)* | Overrides for judge role. |
| `subagents.subtask` | object | *(inherits)* | Overrides for generic subtask spawns. |
| `subagents.<role>.tokenBudget` | integer | `subagents.default.tokenBudget` | Per-role budget; **live-reloadable**. |
| `subagents.<role>.model` | string | *(omit)* | Per-role model override; **live-reloadable**. |
| `aggregator` | object | *(see below)* | Live status aggregation into spec-root files. |
| `aggregator.enabled` | boolean | `true` | Master switch for background aggregation during execution. **Live-reloadable**. |
| `aggregator.pollIntervalMs` | integer | `1500` | Poll interval for `--watch` (`250`–`60000`). **Live-reloadable**. |
| `aggregator.debounceMs` | integer | `250` | Debounce before rebuild (`50`–`5000`). **Live-reloadable**. |
| `aggregator.outputs.specStatusMd` | string | `"status.md"` | Spec-root markdown aggregate filename. |
| `aggregator.outputs.specStatusYml` | string | `"status.yml"` | Spec-root YAML aggregate filename. |

Additional top-level keys are allowed (`additionalProperties: true`) for forward compatibility.

## `subagents.*` inheritance

For each logical role (`generator`, `executor`, `judge`, `subtask`), the executor resolves:

```text
effective tokenBudget = subagents.<role>.tokenBudget ?? subagents.default.tokenBudget
effective model       = subagents.<role>.model       ?? subagents.default.model ?? host default
```

Roles omitting `tokenBudget` inherit **`subagents.default.tokenBudget`**. The resolved budget is stamped into each spawn’s paired **`status/*.status.yml`** (`token_budget`).

Example:

```yaml
subagents:
  default:
    tokenBudget: 200000
  subtask:
    tokenBudget: 120000
  judge:
    model: claude-4.6-opus-high-thinking
```

Here judge inherits **200000** tokens unless `judge.tokenBudget` is set.

## `aggregator.*` behaviour

When **`aggregator.enabled`** is true and the spec directory contains **`status/`**, `/z-spec-execute` backgrounds:

```bash
tsx scripts/spec-aggregator.ts --watch --spec-dir <specDir> --repo-root <repoRoot>
```

The process reads only **`status/*.status.yml`**, applies **`aggregator.debounceMs`**, polls every **`aggregator.pollIntervalMs`**, and writes **`aggregator.outputs.specStatusMd`** and **`aggregator.outputs.specStatusYml`** under the spec directory. It never mutates subtask-owned pairs.

Standalone modes (`--once`, `--validate-only`) share the same config surface — see [`aggregator.md`](aggregator.md).

## Live reload vs fresh invocation

**Token budget changes apply to the next spawned subagent without restarting the executor.**

| Category | Keys |
|----------|------|
| **Live-reloadable** (mtime-aware reload / next spawn) | `subagents.*.tokenBudget`, `subagents.*.model`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`, `aggregator.enabled`, `spec.parallelLimit` |
| **Fresh-invocation-required** (restart `/z-spec-execute` or equivalent) | `unitOfWork`, `specsDir`, `workDir`, `hooks.*`, `extensions.*` |

The background aggregator calls **`loadConfig(repoRoot, prevMtimeMs)`** at the top of each poll iteration so **`aggregator.*`** and **`spec.parallelLimit`** tracks config file changes without restarting the executor LLM. Per-spawn budgets come from **`spec-spawn-prefix.ts`**, which uses the same loader against **`.zoto/spec-system/config.yml`**.

## Config validation errors (`ConfigValidationError`)

If **`config.yml`** fails schema validation after an mtime change (for example a typo introduces invalid types), the aggregator CLI **keeps the last good normalized config** in memory, continues polling, and on the **next successful aggregate write** records **`kind: "config_reload_failed"`** in the spec-root **`status.yml`** `events[]` audit trail. Fix the file on disk; the following successful reload restores normal **`config_reloaded`** behaviour without restarting the executor process.

## Defaults file

An empty YAML file or one containing only comments behaves like `{}` — every field falls back to schema defaults. **`templates/init-config.yml`** is the canonical commented starter.

## Related docs

- [`example-config.yml`](example-config.yml) — YAML sample matching runtime layout  
- [`status-schema.md`](status-schema.md) — status pair binding  
- [`aggregator.md`](aggregator.md) — aggregator CLI and digest rules  
