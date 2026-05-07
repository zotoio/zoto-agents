# Spec-root status aggregator

The aggregator **only reads** `status/*.status.yml` under a spec directory and **only writes** the spec-root pair:

- `{specDir}/{config.aggregator.outputs.specStatusYml}` (default `status.yml`)
- `{specDir}/{config.aggregator.outputs.specStatusMd}` (default `status.md`)

It never edits a subtask’s paired `.status.md` / `.status.yml`. Subagents and `spec-status-roundtrip` own those files.

**Schema references:** [`spec-status.schema.json`](../templates/schema/spec-status.schema.json), [`subtask-status.schema.json`](../templates/schema/subtask-status.schema.json), [`config.schema.json`](../templates/schema/config.schema.json). Human-readable contracts: [`status-schema.md`](status-schema.md), [`config-schema.md`](config-schema.md).

## Digest and when the spec-root pair rewrites

Each run computes a **SHA-256 digest** from:

1. Sorted `(repo-relative path, mtimeMs)` for every `status/*.status.yml` file, and  
2. A JSON-stable subset of live config: `subagents.*`, `aggregator.*`, and `spec.parallelLimit`.

If the digest matches the value stored in `status.yml` under `extra.aggregator_digest` and the spec-root files already exist, the aggregator **skips the write** (no disk churn, no new `rebuild` event).

**Forcing a write without a source change:** audit-only inputs (`configReloadAudit`, `extraAuditEvents` — used when the standalone CLI records a config reload or a failed reload) still rewrite the spec-root pair so those audits persist.

## Blockers

Any subtask with `state: blocked` or `state: failed` appears in `blockers[]` (and in the markdown **Blockers** section). Entries are ordered by `last_heartbeat` **descending** so the most recently active blockers float to the top.

## Events log

`events[]` is append-only in memory of the last aggregate; implementations cap it at **100** entries and drop the oldest on overflow. On each successful rewrite after a digest change, a `kind: "rebuild"` event is appended. Invalid subtask YAML yields `kind: "source_validation_warn"` (the file is skipped; aggregation continues). There are **no** `skip` events when the digest is unchanged — silence is intentional.

## CLI (`scripts/spec-aggregator.ts`)

`plugins/zoto-spec-system/package.json` declares a `bin` entry — `"spec-aggregator": "scripts/spec-aggregator.ts"` — for downstream consumers that run `pnpm install` after the entry was added. In this monorepo (and in any environment where the plugin's bin has not been wired into `node_modules/.bin`), invoke the script directly through **tsx**:

```bash
pnpm --filter @zoto-agents/zoto-spec-system exec tsx scripts/spec-aggregator.ts --once --spec-dir <specDir> --repo-root <repoRoot>
pnpm --filter @zoto-agents/zoto-spec-system exec tsx scripts/spec-aggregator.ts --watch --spec-dir <specDir> --repo-root <repoRoot>
pnpm --filter @zoto-agents/zoto-spec-system exec tsx scripts/spec-aggregator.ts --validate-only --spec-dir <specDir> --repo-root <repoRoot>
```

The `--repo-root` flag should point at the repo root that hosts `.zoto/spec-system/config.yml` (the canonical workspace config); `--spec-dir` is the absolute path to the dated spec directory under `{specsDir}/`. Once `pnpm install` re-runs and `node_modules/.bin/spec-aggregator` exists, the `tsx scripts/spec-aggregator.ts` portion may be replaced with `spec-aggregator` — the flags are identical.

| Mode | Behaviour |
|------|-----------|
| `--once` | Single aggregate; prints `AggregateResult` JSON on stdout; exit `0` even when `rebuilt: false`. |
| `--watch` | At the top of each loop: `loadConfig` → `aggregateOnce` → sleep `aggregator.pollIntervalMs`. Stderr one-line summary per tick. Reloads config when `.zoto/spec-system/config.yml` mtime changes; on validation failure keeps the last good config and appends `config_reload_failed` on the next successful write. |
| `--validate-only` | Dry run (no spec-root writes); exit **`2`** if any subtask source failed parse/schema validation. |

## See Also

- [`status-schema.md`](status-schema.md) — HTML markers, per-subtask vs aggregate binding, round-trip precedence, and full CLI reference for `spec-status-roundtrip`  
- [`config-schema.md`](config-schema.md) — `subagents.*`, `aggregator.*`, live reload vs fresh-invocation keys  
- [`README.md`](../README.md#live-status--no-restart-configuration) — **Live Status & No-Restart Configuration** overview  
