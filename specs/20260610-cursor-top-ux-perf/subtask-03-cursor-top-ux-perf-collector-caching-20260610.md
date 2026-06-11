# Subtask: Persistent Collector, Mtime-Gated Caching + Two-Lane Cadence

## Metadata
- **Subtask ID**: 03
- **Feature**: cursor-top-ux-perf
- **Assigned Subagent**: generalPurpose (model: `claude-fable-5-thinking-max`)
- **Dependencies**: 01, 02
- **Created**: 20260610

## Objective

Eliminate the per-tick rebuild-the-world cost in the discovery layer. Today `loadSnapshot` (`src/cli.ts`) constructs a **new** collector on every refresh tick, and each `collect()` re-walks every session root, re-reads + re-parses every JSON/JSONL file, re-tails every log, and re-spawns `sqlite3` for the same chat ids. Make the collector a persistent, stateful instance with `{mtimeMs, size}`-gated caches and a two-lane refresh cadence, and prove the gain against the subtask-01 baseline.

## Deliverables Checklist
- [ ] Persistent collector lifecycle: `src/cli.ts` creates **one** collector before `render()` and reuses it across interactive ticks (including manual `r` refresh). `--once` / `--json` behaviour is unchanged (fresh process → single cold collect; identical output to today).
- [ ] Mtime/size-gated session cache: `readSessionRecords` walk results cached per file — re-`stat` each tick is acceptable, but `readFile` + `JSON.parse` happen only when `(mtimeMs, size)` changed; deleted files drop out of the cache; new files are picked up. Same gating for `repo-url.ts` lookups (`buildSlugPathMap` / `resolveRepoDisplayUrl`) with a sensible TTL.
- [ ] Log-tail cache: per `logSource`, cache `{mtimeMs, size, lines}`; each tick stats first and re-reads the 16/64 KB window (`tailFile` / `tailJsonlMessages`, `src/discovery/logs.ts`) only on change. Unchanged files cost one `stat`, zero `open`/`read`.
- [ ] Composer-model cache: resolved `id → model` results persist for the collector's lifetime (model picker selections are stable per chat); `sqlite3` (`readComposerModels`, `src/discovery/composer-models.ts`) is spawned at most once per tick and **only** when unresolved ids exist; unresolved ids are retried at reduced cadence (e.g. every Nth tick) instead of every tick.
- [ ] Two-lane cadence: fast lane every tick (`ps` scan for liveness, transcript `stat`s for status derivation, changed-log re-tails); slow lane every N ticks (full session-JSON re-walk, workspace/`agent-transcripts` re-enumeration in `enumerateTranscriptRoots`, sqlite retries, slug-map refresh). Choose and document N (constant or flag — implementer judgment; if a flag, follow `parseArgs` conventions and update HELP/docs).
- [ ] Bounded fs concurrency: hand-rolled stdlib semaphore limiting the `Promise.all` tail/stat fan-outs in `collect()` (hundreds of parallel `open()`s at tier L today) to a sane limit (e.g. 16–32 concurrent ops).
- [ ] Correctness tests with a counting `FsLike` (reuse `bench/fixtures.ts` from subtask 01): warm tick #2 with zero file changes performs **zero** `readFile`s and produces a snapshot deep-equal to tick #1 (modulo `capturedAt`); touching one transcript invalidates exactly that entry; deleted/new files handled; `--once`/`--json` cold path identical to pre-change behaviour (subtask-01 contract tests green).
- [ ] Bench delta recorded: re-run subtask-01 collector benches; append a before/after section to `bench/BASELINE.md` (warm-tick latency + fs-op counts per tier). Target: ≥50% warm-tick latency reduction and ≥80% fewer `readFile` ops at tier L with unchanged files; record actuals and explain any miss.
- [ ] Docs in the same subtask: README (Data sources / Development notes on caching + cadence, plus the "Benchmarks" note in the Development section deferred from subtask 01 — bench script usage and a `bench/BASELINE.md` pointer), CHANGELOG entry; command/skill docs only if a new flag was added (then run `pnpm run eval:update --check`, and `--apply --no-analyser` on critical drift).

## Definition of Done
- [ ] Code implemented; collector instance survives across ticks with gated caches
- [ ] Targeted tests added and passing (cache invalidation, read-count assertions, cold-path equivalence)
- [ ] Subtask-01 contract tests pass unchanged
- [ ] Bench before/after appended to `bench/BASELINE.md` with measured improvement at tiers M and L
- [ ] No linter errors in modified files

## Implementation Notes

- Cache state hangs off the collector closure created in `createCollector` (`src/discovery/collector.ts`) — `CollectorOptions` keeps its injection seams so tests/benches can drive everything deterministically. Consider adding an injectable clock to `CollectorOptions` if cadence logic needs testable time.
- `FsLike` (`src/types.ts`) already exposes `stat` with `mtimeMs`/`size` — sufficient for the gating *decisions*; do **not** reach for `fs.watch` (cross-platform reliability) or any native watcher (forbidden).
- **Authorised seam change (required for the cache assertions)**: the tail *reads* currently bypass `FsLike` — `tailFile`/`tailJsonlMessages` (`src/discovery/logs.ts`) call `node:fs/promises.open` directly, so "unchanged files cost one `stat`, zero `open`/`read`" is not observable or assertable today. This subtask is explicitly authorised to introduce an observable windowed-read seam. Preferred: extend `FsLike` with a windowed read (e.g. `readWindow(path, offset, length)`), implement it in `realFs` (`src/discovery/fs.ts`), and route `logs.ts` through it — keeping the `tailFile`/`tailJsonlMessages` signatures and default behaviour identical for existing callers (subtask 06 relies on those signatures and the `windowBytes` parameter). Alternative: make the tail functions injectable via `CollectorOptions`. Extend the subtask-01 counting fixture (`bench/fixtures.ts`) to count tail reads through the new seam, and present them as a **new metric column** in the `BASELINE.md` before/after — the subtask-01 baseline fs-op counts deliberately excluded tail I/O (a recorded limitation), so compare like-for-like on the original `FsLike` counters and report tail-read counts alongside.
- Transcript status is *derived from mtime* (`readTranscriptRecords`, thresholds 5 min/30 min in `src/discovery/sessions.ts`) — transcripts must still be stat'ed every fast-lane tick or status freshness regresses. The cacheable part is record construction and content reads, not the stats.
- Mind interactions with prune passes: caches must hold **pre-prune** data (merge → enrich → prune happens per tick from cached primitives), because `--active-only` etc. are view filters; a node leaving "done" must be able to reappear.
- The `e` (expand-all) key uses `Object.keys(snapshot.nodes)` — snapshot semantics must stay value-identical; never hand the UI live cache references that mutate between ticks (clone or rebuild node objects per snapshot).
- `ps` stays per-tick: it is the liveness source and one `exec` per second is cheap relative to the fs storm; if baseline numbers say otherwise, document and adjust in the slow lane instead.
- Coordinate with subtask 02's `cli.ts` changes (this subtask depends on 02 specifically so `cli.ts` edits are serialised).
- Follow the TodoWrite contract: create todos from this checklist and the DoD on spawn.

### Hard constraints (must preserve)
- No native dependencies; stdlib semaphore (no `p-limit` etc.).
- macOS/Linux/Windows parity — caching layer is platform-agnostic; PowerShell path untouched or equally cached.
- `--once`/`--json`/`--demo` default output unchanged; JSON snapshot shape backward compatible (no new fields needed by this subtask).

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Targeted runs only, e.g. `pnpm --filter @zoto-agents/zoto-cursor-top exec vitest run tests/collector.test.ts tests/logs.test.ts tests/sessions.test.ts tests/composer-models.test.ts tests/contracts.test.ts`
- Benches: `pnpm --filter @zoto-agents/zoto-cursor-top run bench` (collector benches)
- Defer the monorepo suite and validators to subtask 08.

## Execution Notes
[To be filled by executing agent]

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
