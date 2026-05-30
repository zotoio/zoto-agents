# Subtask: Spec-Root Status Aggregator (in-process loop + standalone script)

## Metadata
- **Subtask ID**: 07
- **Feature**: spec-system-live-status
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 02, 03, 06
- **Created**: 20260506

## Objective

Implement the **aggregator** as a single CLI, `plugins/zoto-spec-system/scripts/spec-aggregator.ts`, that turns every per-subtask `status/*.status.yml` into the spec-root `status.md` + `status.yml`. Three modes share one core:

1. **`--watch`** — long-running poll loop. The executor LLM backgrounds this for the duration of `/zoto-spec-execute` (default during execution). The CLI is the only owner of the loop and the live config reload at the top of every iteration.
2. **`--once`** — one-shot rebuild. Used by dashboards, `--resume` flows, and `crux-cursor-memory-manager` checkpoints.
3. **`--validate-only`** — CI gate. No spec-root writes; non-zero exit on any source-validation failure.

The executor LLM does **not** import the loop or hold an `AbortSignal` — it shells out to `tsx scripts/spec-aggregator.ts --watch ...` and signals it via standard process control. There is no separate in-process Node loop in the executor.

The aggregator is **read-only** with respect to per-subtask status pairs — it never mutates a subtask's `.status.md` / `.status.yml`. It only writes the spec-root pair and validates them against `spec-status.schema.json`.

## Deliverables Checklist

### Aggregator core
- [ ] `plugins/zoto-spec-system/src/aggregator.ts` — public surface:
  ```ts
  import type { SpecSystemConfig } from "./config-loader.js";

  export interface AggregateInput {
    specDir: string;
    config: SpecSystemConfig;
    repoRoot: string;
    nowIso?: string;
  }

  export interface AggregateResult {
    statusYmlPath: string;
    statusMdPath: string;
    rebuilt: boolean;
    sourceCount: number;
    digest: string;
  }

  export function aggregateOnce(input: AggregateInput): AggregateResult;

  export interface WatchOptions extends AggregateInput {
    onTick?: (r: AggregateResult) => void;
    signal?: AbortSignal;
  }

  export function watch(opts: WatchOptions): Promise<void>;
  ```
  Behaviour:
  - `aggregateOnce` scans `<specDir>/status/*.status.yml`, loads each (via `yaml@^2` — the repo standard), validates against `subtask-status.schema.json` (skips and emits a `severity: warn` entry into `events[]` when a single source fails — never throws), then renders the spec-root `status.yml` and `status.md` using subtask 02's `templates/status/spec-status.{md,yml}.tmpl`.
  - `digest` is a SHA-256 over the sorted `(path, mtimeMs)` pairs of all source files plus the resolved config's live-reloadable subset. The aggregator only rewrites the spec-root pair when `digest` changes (avoids unnecessary disk churn).
  - `aggregate_progress` is computed from `subtasks[].state` counts.
  - `blockers[]` is auto-populated from any subtask with `state: blocked` or `state: failed`, ordered by `last_heartbeat` descending.
  - `definition_of_done_status[]` is parsed from the spec index file's `## Definition of Done` checkbox list (read once and cached per `aggregateOnce` call). Each item gets a stable `id` of the form `DOD<NN>` based on order.
  - `events[]` is append-only with a hard cap of 100 entries — the oldest entries are dropped when the cap is exceeded. The aggregator appends a `kind: "rebuild"` event on every actual rewrite (digest changed) and a `kind: "skip"` event is **not** emitted (skip is the silent default).
  - `watch` runs `aggregateOnce` every `cfg.aggregator.pollIntervalMs` milliseconds with a `cfg.aggregator.debounceMs` trailing debounce when multiple ticks fire faster than the debounce window. Honours `signal` for graceful shutdown.
- [ ] `plugins/zoto-spec-system/src/aggregator.test.ts` — vitest unit tests, all running against a temp-dir spec fixture:
  - `aggregateOnce` rebuilds the spec-root pair when called for the first time
  - Calling `aggregateOnce` twice with no source changes returns `rebuilt: false` and does **not** rewrite the files (mtime unchanged)
  - Touching any `.status.yml` source flips the digest and triggers a rebuild
  - `blockers[]` is ordered by `last_heartbeat` descending (unit-level ordering check; the empty → blocked → reverted lifecycle is covered by subtask 08's integration test)
  - A subtask whose yml fails schema validation is skipped, an event is appended, and the rest of the spec aggregates normally (resilience)
  - `definition_of_done_status[]` rolls up from the spec index file's checkboxes (use a fixture spec index with three DOD items, two unchecked)
  - `events[]` is capped at 100 entries (trim test)
  - `watch` honours `AbortSignal` (cancel after one tick, assert the loop exited)

### Standalone CLI
- [ ] `plugins/zoto-spec-system/scripts/spec-aggregator.ts` — `tsx` CLI:
  - `spec-aggregator --spec-dir <dir> --once` — runs `aggregateOnce` and prints the `AggregateResult` as JSON to stdout; exits 0 even when `rebuilt: false`
  - `spec-aggregator --spec-dir <dir> --watch` — calls `loadConfig` at the top of every iteration, runs `aggregateOnce` with the (possibly reloaded) config, prints a one-line summary per tick to stderr, exits cleanly on `SIGINT` / `SIGTERM`
  - `spec-aggregator --spec-dir <dir> --validate-only` — runs `aggregateOnce` with a `--dry-run` flag (does not write the spec-root pair), validates every source, exits non-zero if any validation failed
- [ ] `plugins/zoto-spec-system/scripts/spec-aggregator.test.ts` — vitest:
  - `--once` writes the expected files and exits 0
  - `--validate-only` exits non-zero on a malformed source
  - `--watch` rebuilds when a source mtime advances (test uses a `setTimeout`-based source mutation; signal-cancels the watcher after the rebuild is observed)
- [ ] `plugins/zoto-spec-system/package.json` — add the `bin` entry `"spec-aggregator": "scripts/spec-aggregator.ts"` so `pnpm --filter @zoto-agents/zoto-spec-system exec spec-aggregator ...` works. **Note**: no other plugin in this monorepo currently uses `bin`. Run a one-shot smoke check after `pnpm install` to confirm `pnpm --filter @zoto-agents/zoto-spec-system exec spec-aggregator --once --spec-dir <fixture>` resolves correctly. If it does not, fall back to invoking via `pnpm --filter @zoto-agents/zoto-spec-system exec tsx scripts/spec-aggregator.ts ...` and remove the `bin` field — document the chosen invocation pattern in `docs/aggregator.md`.

### Watch-mode loop (lives inside the standalone CLI)

The `--watch` mode of `spec-aggregator.ts` (above) is the **only** owner of the poll loop. There is no separate `executor-loop.ts` module — the executor LLM backgrounds the CLI and signals it on cancellation. The watch handler must:

- At the **top of every iteration**, call `loadConfig(repoRoot, prevMtimeMs)`. On `ConfigValidationError`, log the error to the spec-root `status.yml` `events[]` array via the next aggregator call and continue with the previous valid config (no crash).
- Call `aggregateOnce({ specDir, config: cfg, repoRoot })`.
- Sleep `cfg.aggregator.pollIntervalMs` (configurable per iteration — picks up live reloads).
- Honour `SIGINT` / `SIGTERM` for graceful shutdown when the user cancels `/zoto-spec-execute`.
- Does **not** spawn subtask agents — that remains the executor LLM's responsibility. The watch loop is the *aggregation half* of execution and runs as a separate child process.

Tests for these behaviours live alongside the CLI's own test file (`scripts/spec-aggregator.test.ts`):
- `--watch` reloads config on mtime change and emits a `config_reloaded` event in the next rebuild
- On `ConfigValidationError`, `--watch` continues with the previous config and emits a `kind: "config_reload_failed"` event
- Sending `SIGINT` to the process exits the loop within one poll interval (the existing CLI test already exercises signal cancellation)

### Agent / skill / command updates (text-only)
- [ ] `plugins/zoto-spec-system/agents/zoto-spec-executor.md` — extend `## Live Configuration` (added in subtask 04) with a new sub-section `### Aggregator Loop`:
  - At the start of `/zoto-spec-execute`, the executor backgrounds `tsx plugins/zoto-spec-system/scripts/spec-aggregator.ts --watch --spec-dir <dir>` as a child process and tracks its PID for the duration of the spec.
  - The watch process **only reads** `status/*.status.yml`; it never writes to a subtask's status pair.
  - The watch process writes the spec-root `status.md` + `status.yml` on every digest change.
  - On `ConfigValidationError`, the watch process falls back to the last good config and emits a `kind: "config_reload_failed"` event into the spec-root `status.yml`.
  - On user cancellation of `/zoto-spec-execute`, the executor sends `SIGINT` to the watch process and waits up to one `pollIntervalMs` for clean exit before sending `SIGTERM`.
- [ ] `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` — add a new section `### Spec-Root Aggregation` immediately after the `### Status File Ownership` section from subtask 06:
  - Documents that the backgrounded `spec-aggregator --watch` process is the only writer of the spec-root `status.md` + `status.yml` (started by the executor; tracked by PID)
  - Documents the digest-based skip semantics (no churn when nothing changed)
  - Documents the three CLI modes (`--once` / `--watch` / `--validate-only`) and when each is appropriate (CI = `--validate-only`, resume = `--watch`, dashboards = `--once`)
- [ ] `plugins/zoto-spec-system/commands/zoto-spec-execute.md` — extend the **Execution safeguards** table with a new row: `| Spec-root aggregation | Executor backgrounds spec-aggregator --watch for the spec's lifetime; rebuilds status.md + status.yml on every source change; --once / --validate-only modes available for resume / CI |`.
- [ ] `plugins/zoto-spec-system/agents/zoto-spec-judge.md` — append a paragraph under Mode 1 (Adversarial Verification) noting that the judge **may** invoke `spec-aggregator --validate-only --spec-dir <spec>` as a final pass to ensure no source went out of sync during execution.

### Docs
- [ ] `plugins/zoto-spec-system/docs/aggregator.md` — single canonical doc covering:
  - The aggregator's read-only contract
  - The digest mechanism (what triggers a rebuild, what doesn't)
  - The blocker-promotion rule
  - The events log cap
  - The three CLI modes with examples
  - Cross-link to `docs/status-schema.md` (subtask 02) and `docs/config-schema.md` (subtask 03 / 09)

## Definition of Done
- [ ] `pnpm --filter @zoto-agents/zoto-spec-system test src/aggregator.test.ts scripts/spec-aggregator.test.ts` passes
- [ ] `pnpm --filter @zoto-agents/zoto-spec-system validate` passes
- [ ] Standalone `spec-aggregator --once` and `--watch` work end-to-end against a fixture spec
- [ ] Skill, executor agent, judge agent, and command docs reference the aggregator with consistent wording (`rg "spec-aggregator" plugins/zoto-spec-system` returns hits in all four file types)
- [ ] `docs/aggregator.md` exists and links to `status-schema.md` + `config-schema.md`
- [ ] No linter errors in modified files
- [ ] No new runtime dep introduced beyond what subtask 03 already added (`ajv`, `ajv-formats`, `yaml`)

## Implementation Notes

- **Read-only contract**: the aggregator must never write to a subtask's `.status.md` / `.status.yml`. The only writers of subtask status are the spawned subagents (subtask 06) plus the round-trip helper (subtask 05). If a developer ever needs a "repair" path, they invoke `spec-status-roundtrip` directly — never the aggregator. This separation keeps the aggregator safe to run from CI / dashboards without race risks.
- **Digest semantics**: hash the `(path, mtimeMs)` tuples of source files plus the live-reloadable config subset (`subagents.*`, `aggregator.*`, `spec.parallelLimit`). This means a config edit that changes `aggregator.pollIntervalMs` triggers a rebuild on the next tick (so the new cadence is reflected in `status.yml`'s `config_reloaded[]` audit trail), but a fresh-invocation-only key edit (e.g. `specsDir`) does **not** force a rebuild.
- **Resilience over strictness**: a single malformed `status.yml` should not block the rest of the spec from aggregating. The schema-violation event in the spec-root `events[]` is the developer's signal to fix the source.
- **Standalone CLI** uses the same `aggregator.ts` core — no duplication. The CLI only adds argument parsing, signal handling, and stdout/stderr formatting.
- **No file watchers** (`fs.watch` is platform-flaky inside `Task` sandboxes and inside containerised CI). Pure mtime polling matches the loader's contract from subtask 03 and keeps the binary portable.
- **Cancellation**: the standalone CLI honours `SIGINT` / `SIGTERM` so `/zoto-spec-execute` cancellation is clean. The executor LLM is responsible for signalling the backgrounded watch process when the user cancels — there is no in-process `AbortSignal` for it to hold.
- **Latency budget**: a typical spec has ≤20 subtasks. `aggregateOnce` should run in ≤50 ms on a warm cache. If a future test surfaces aggregator latency above 200 ms on the reference fixture, profile and optimise (do not add a cache layer in this subtask).

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Run only the new vitest files for `aggregator` and the standalone CLI
- Defer the full repo test suite + cross-subtask end-to-end checks to subtask 08

## Execution Notes
[To be filled by executing agent]

### Agent Session Info
- Agent: crux-software-engineer
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
