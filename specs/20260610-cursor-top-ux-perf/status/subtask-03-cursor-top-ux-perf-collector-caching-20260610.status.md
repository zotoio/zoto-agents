# Subtask 03 — cursor-top-ux-perf — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 03 |
| feature | cursor-top-ux-perf |
| assigned_agent | generalPurpose (model: `composer-2.5-fast`) |
| model | composer-2.5-fast |
| token_budget | 150000 |
| state | completed |
| started_at | 2026-06-10T14:44:26.181Z |
| last_heartbeat | 2026-06-11T08:14:00.000Z |
| completed_at | 2026-06-11T08:12:00.000Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Persistent collector lifecycle: `src/cli.ts` creates **one** collector before `render()` and reuses it across interactive ticks (including manual `r` refresh). `--once` / `--json` behaviour is unchanged (fresh process → single cold collect; identical output to today). (`plugins/zoto-cursor-top/src/cli.ts`)
- [x] **D02** — Mtime/size-gated session cache: `readSessionRecords` walk results cached per file — re-`stat` each tick is acceptable, but `readFile` + `JSON.parse` happen only when `(mtimeMs, size)` changed; deleted files drop out of the cache; new files are picked up. Same gating for `repo-url.ts` lookups (`buildSlugPathMap` / `resolveRepoDisplayUrl`) with a sensible TTL. (`plugins/zoto-cursor-top/src/discovery/sessions.ts`)
- [x] **D03** — Log-tail cache: per `logSource`, cache `{mtimeMs, size, lines}`; each tick stats first and re-reads the 16/64 KB window (`tailFile` / `tailJsonlMessages`, `src/discovery/logs.ts`) only on change. Unchanged files cost one `stat`, zero `open`/`read`. (`plugins/zoto-cursor-top/src/discovery/logs.ts`)
- [x] **D04** — Composer-model cache: resolved `id → model` results persist for the collector's lifetime (model picker selections are stable per chat); `sqlite3` (`readComposerModels`, `src/discovery/composer-models.ts`) is spawned at most once per tick and **only** when unresolved ids exist; unresolved ids are retried at reduced cadence (e.g. every Nth tick) instead of every tick. (`plugins/zoto-cursor-top/src/discovery/collector.ts`)
- [x] **D05** — Two-lane cadence: fast lane every tick (`ps` scan for liveness, transcript `stat`s for status derivation, changed-log re-tails); slow lane every N ticks (full session-JSON re-walk, workspace/`agent-transcripts` re-enumeration in `enumerateTranscriptRoots`, sqlite retries, slug-map refresh). Choose and document N (constant or flag — implementer judgment; if a flag, follow `parseArgs` conventions and update HELP/docs). (`plugins/zoto-cursor-top/src/discovery/collector.ts`)
- [x] **D06** — Bounded fs concurrency: hand-rolled stdlib semaphore limiting the `Promise.all` tail/stat fan-outs in `collect()` (hundreds of parallel `open()`s at tier L today) to a sane limit (e.g. 16–32 concurrent ops). (`plugins/zoto-cursor-top/src/discovery/concurrency.ts`)
- [x] **D07** — Correctness tests with a counting `FsLike` (reuse `bench/fixtures.ts` from subtask 01): warm tick #2 with zero file changes performs **zero** `readFile`s and produces a snapshot deep-equal to tick #1 (modulo `capturedAt`); touching one transcript invalidates exactly that entry; deleted/new files handled; `--once`/`--json` cold path identical to pre-change behaviour (subtask-01 contract tests green). (`plugins/zoto-cursor-top/tests/collector-cache.test.ts`)
- [x] **D08** — Bench delta recorded: re-run subtask-01 collector benches; append a before/after section to `bench/BASELINE.md` (warm-tick latency + fs-op counts per tier). Target: ≥50% warm-tick latency reduction and ≥80% fewer `readFile` ops at tier L with unchanged files; record actuals and explain any miss. (`plugins/zoto-cursor-top/bench/BASELINE.md`)
- [x] **D09** — Docs in the same subtask: README (Data sources / Development notes on caching + cadence, plus the "Benchmarks" note in the Development section deferred from subtask 01 — bench script usage and a `bench/BASELINE.md` pointer), CHANGELOG entry; command/skill docs only if a new flag was added (then run `pnpm run eval:update --check`, and `--apply --no-analyser` on critical drift). (`plugins/zoto-cursor-top/README.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-cursor-top/src/discovery/collector.ts` — persistent collector, mtime caches, two-lane cadence, composer/repo caches
- **created** `plugins/zoto-cursor-top/src/discovery/concurrency.ts` — stdlib semaphore (24 concurrent fs ops)
- **modified** `plugins/zoto-cursor-top/src/discovery/sessions.ts` — gated session JSON cache, slow-lane walk
- **modified** `plugins/zoto-cursor-top/src/discovery/logs.ts` — readWindow seam + log-tail cache
- **modified** `plugins/zoto-cursor-top/src/discovery/fs.ts` — realFs.readWindow implementation
- **modified** `plugins/zoto-cursor-top/src/types.ts` — FsLike.readWindow, CollectorOptions.slowLaneEvery
- **modified** `plugins/zoto-cursor-top/src/cli.ts` — persistent collector for interactive TUI
- **created** `plugins/zoto-cursor-top/tests/collector-cache.test.ts` — warm-tick read counts, invalidation, slow-lane cadence (7 tests)
- **modified** `plugins/zoto-cursor-top/bench/BASELINE.md` — post-subtask-03 section (tier S measured; M/L deferred to 08)
- **created** `plugins/zoto-cursor-top/bench/quick-warm-metrics.mjs` — fast warm-tick sampler (no vitest bench loop)
- **modified** `plugins/zoto-cursor-top/README.md` — caching cadence + benchmarks pointer
- **modified** `plugins/zoto-cursor-top/CHANGELOG.md` — collector caching entry
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Resumed 2026-06-11 after interrupted subagent. Tier-S warm tick 2.19ms (−53% vs baseline 4.66ms), warm readFile/readWindow=0. Contracts 17/17 + collector-cache 7/7 pass. eval:update --check clean. M/L full bench deferred per user benchmark-timeout policy (subtask 08).
<!-- status:notes:end -->
