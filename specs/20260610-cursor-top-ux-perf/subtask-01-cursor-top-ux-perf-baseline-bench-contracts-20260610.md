# Subtask: Performance Baseline Benchmarks + Behavioural Contract Tests

## Metadata
- **Subtask ID**: 01
- **Feature**: cursor-top-ux-perf
- **Assigned Subagent**: generalPurpose (model: `claude-fable-5-thinking-max`)
- **Dependencies**: None
- **Created**: 20260610

## Objective

Establish the measured baseline and the behavioural safety net **before any production code changes**. Deliver (a) a reusable scale-fixture generator, (b) vitest benchmarks for the collector tick pipeline and the renderers at three scale tiers, (c) a committed `bench/BASELINE.md` with the numbers later subtasks must beat, and (d) contract regression tests that freeze today's default `--once` / `--json` / `--demo` behaviour for the rest of the spec.

## Deliverables Checklist
- [x] `plugins/zoto-cursor-top/bench/fixtures.ts` — deterministic synthetic-scale generator producing: an in-memory `FsLike` (matching `src/types.ts`) populated with session JSON and workspace `agent-transcripts/` tree metadata (dir listings + per-file stats); the JSONL transcript/log files themselves materialised as **real files under a dedicated per-run temp directory**, with fixture `logSource`/`logPath` values pointing at them and the in-memory stat metadata mirroring them (the tail readers bypass `FsLike` — see the tail-seam note in Implementation Notes); a matching fake `ps` stdout (`psRunner` stub); and a stub `composerModelRunner`. Parameterised by tier: **S** (~10 agents), **M** (~100 agents + subagents), **L** (~1000 agents + subagents, multi-MB log files). Exported for reuse by tests and later subtasks.
- [x] `plugins/zoto-cursor-top/bench/collector.bench.ts` — vitest bench (`vitest bench`) measuring warm-process `collector.collect()` end-to-end latency per tier (collector created via `createCollector` with injected fs/psRunner/composerModelRunner), plus stage-level benches for the exported pipeline pieces: `readSessionRecords`, `readTranscriptRecords`, `tailFile`/`tailJsonlMessages` fan-out, and `buildHierarchy` + prune passes.
- [x] `plugins/zoto-cursor-top/bench/render.bench.ts` — vitest bench measuring `renderText(snapshot)` and the interactive row-build path (`flattenVisible` + `formatAgentRowLine` over all visible rows) per tier.
- [x] Counting-`FsLike` instrumentation in `bench/fixtures.ts` (wraps the in-memory fs, counts `readdir`/`readFile`/`stat`/`exists` calls) so fs-operation counts per tick are reported alongside latency. Known limitation to record in `bench/BASELINE.md`: tail `open()`/`read()` I/O (`tailFile`/`tailJsonlMessages`) bypasses `FsLike` and is **not** included in these counts — subtask 03 introduces the observable tail seam and reports tail reads as a separate metric column.
- [x] `bench` script added to `plugins/zoto-cursor-top/package.json` (e.g. `"bench": "vitest bench --run"`). No README edits in this subtask — subtask 02 owns all `README.md` changes during Phase 1; the README "Benchmarks" note (bench script usage + `bench/BASELINE.md` pointer) lands with subtask 03's docs pass. Re-run instructions live in `bench/BASELINE.md` meanwhile.
- [x] `plugins/zoto-cursor-top/bench/BASELINE.md` — recorded baseline: machine context, per-tier `collect()` latency, per-stage timings, fs-op counts per tick, render timings; plus exact re-run instructions. This file is the canonical "numbers to beat" and gains before/after sections in subtasks 03, 07, and 08.
- [x] `plugins/zoto-cursor-top/tests/contracts.test.ts` — contract tests that freeze: (1) the JSON snapshot shape (`AgentSnapshot` keys `capturedAt`/`nodes`/`roots`/`diagnostics`; `AgentNode` required keys and types per `src/types.ts`) on both demo and synthetic fixtures; (2) `renderText` structure on a fixed-clock snapshot (header from `headerRow()`, row layout from `formatAgentRowLine`, title/log body lines, newest-log-first order); (3) default `parseArgs` values (`intervalMs` 1000, `logLines` 3, `cursorOnly`/`withLogs`/`activeOnly` true, `transcriptMaxAgeHours` 24).

## Definition of Done
- [x] `pnpm --filter @zoto-agents/zoto-cursor-top run bench` completes green and prints per-tier results
- [x] `bench/BASELINE.md` committed with real measured numbers (not placeholders)
- [x] Contract tests pass via targeted vitest run
- [x] **Zero changes to `src/`** — instrumentation is achieved via injection (`CollectorOptions.fs` / `psRunner` / `composerModelRunner`), direct imports of exported functions, and the sanctioned fixture temp directory for tailed files (see Implementation Notes)
- [x] No linter errors in added files

## Implementation Notes

- `createCollector` (`src/discovery/collector.ts`) accepts injected `fs`, `psRunner`, `platform`, `homeDir`, and `composerModelRunner` — build fixtures against those seams. "Never touch the real filesystem" means: never read the developer's real Cursor state directories (`~/.cursor`, `~/.config/Cursor`, …) and never spawn real processes in benches — the dedicated fixture temp directory below is the one sanctioned real-fs surface.
- **Tail-seam reality (drives the fixture design)**: `tailFile` / `tailJsonlMessages` (`src/discovery/logs.ts`) open files via `node:fs/promises.open` **directly** — they do not go through the injected `FsLike`, which has no windowed-read API. A purely in-memory fixture would tail nothing (every `open()` ENOENTs → `recentLogs: []`, and a `withLogs: true` collect would prune every node). Resolution that keeps "zero `src/` changes": root the fixture `homeDir` at a per-run temp directory (`fs.mkdtemp` under `os.tmpdir()`, removed in a `finally`/`afterAll`), write each tier's JSONL transcript/log files there as real files (set mtimes explicitly via `fs.utimes` relative to the fixed `now`), and mirror their existence + `{mtimeMs, size}` in the in-memory `FsLike` so walk/stat surfaces stay consistent with what the tail readers see on disk.
- Reuse the path layout expectations from `resolveCursorPaths` (`src/discovery/paths.ts`): with `platform: "linux"` and `homeDir` rooted at the fixture temp dir (illustrated below as `/home/bench`), sessions live under `/home/bench/.config/Cursor` + `/home/bench/.cursor/{agents,sessions,cli/...}`, and transcripts under `/home/bench/.cursor/projects/<ws>/agent-transcripts/<uuid>/<uuid>.jsonl` (+ `subagents/<sub-uuid>.jsonl`). Transcript JSONL lines must match what `extractMessageSnippets` (`src/discovery/logs.ts`) parses (`{role, message:{content:[{type:"text",text}]}}` and `tool_use` blocks).
- Tier L must include several multi-MB JSONL files (real temp files, per the tail-seam note above) to exercise the windowed tail reads (`TRANSCRIPT_WINDOW_BYTES` = 64 KB) and many small files to exercise the walk.
- Set transcript mtimes relative to a fixed `now` so the status derivation thresholds in `readTranscriptRecords` (5 min running / 30 min idle) produce a stable mix of running/idle/done nodes; pass `transcriptMaxAgeMs` explicitly.
- vitest 4 is already the test runner (`vitest.config.ts`); `vitest bench` requires no new dependency. Keep bench files outside the default test glob if they would otherwise run during `pnpm test` (check `vitest.config.ts` include patterns; benches must not slow the normal suite).
- Contract tests should be structure-based (key presence, types, line-shape regexes, fixed-clock rendering via the `now` parameters on `renderText`/`formatAgentRowLine`) rather than byte-golden against `demoSnapshot()`, because `demo.ts` bakes `Date.now()` into `startedAt`.
- Later subtasks rely on this exact harness: keep fixture/bench APIs small and documented in `BASELINE.md`.
- Follow the TodoWrite contract: on spawn, create todos from this checklist (D01…) and the DoD items.

### Hard constraints (must preserve)
- No native dependencies; Node stdlib + existing `ink`/`react` only. Benches/fixtures add **no** runtime dependencies.
- macOS/Linux/Windows parity unaffected (no `src/` changes).
- Default `--once`/`--json`/`--demo` output unchanged (this subtask *encodes* that contract).

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Run targeted tests only: `pnpm --filter @zoto-agents/zoto-cursor-top exec vitest run tests/contracts.test.ts`
- Run benches via `pnpm --filter @zoto-agents/zoto-cursor-top run bench`
- Defer the monorepo suite (`pnpm test`, validate scripts) to subtask 08.

## Execution Notes

### Agent Session Info
- Agent: generalPurpose (model: claude-fable-5-thinking-max)
- Started: 2026-06-10T14:01:25Z
- Completed: 2026-06-10T14:22:45Z

### Work Log
- Read subtask brief, spec index, and the full plugin discovery/UI source to map the injection seams (`CollectorOptions.fs`/`psRunner`/`composerModelRunner`/`platform`/`homeDir`) and the tail-seam reality in `src/discovery/logs.ts`.
- Built `bench/fixtures.ts`: deterministic (mulberry32-seeded) tiered generator. In-memory `MemFs` carries session JSON, projects/agent-transcripts tree metadata, workspaceStorage + `state.vscdb` existence, and fake workspace `.git/config` files; transcript/log JSONL files are written as REAL files under a per-run `fs.mkdtemp` dir (mtimes stamped via `fs.utimes` relative to fixture `now` for stable running/idle/done mixes) and mirrored metadata-only in `MemFs`. Fake `ps` stdout is rendered per host platform (unix table / PowerShell JSON); composer-model runner answers `id|model` for the SQL's `composerData:` ids. `CountingFs` wrapper counts readdir/readFile/stat/exists (D04). Tier composition: S=10, M=100, L=1000 agents exactly (L includes 13 ~3 MB JSONL files).
- Built `bench/collector.bench.ts` (e2e collect() with default flags AND prunes-off, plus stage benches: `readSessionRecords`, `readTranscriptRecords`, tail fan-out, `buildHierarchy`; fs-op + ps/sqlite spawn counts printed per tier during setup) and `bench/render.bench.ts` (`renderText` + `flattenVisible`/`formatAgentRowLine` row-build). The prune passes are module-private in `collector.ts`, so their cost is bracketed by the two e2e variants (documented in BASELINE.md) — zero `src/` changes preserved.
- Added `"bench": "vitest bench --run"` to package.json; bench files live outside the `tests/**` include glob so `vitest run` never collects them (verified: plugin suite runs 13 files / 103 tests with no benches).
- Wrote `tests/contracts.test.ts` (17 tests): snapshot shape on demo + synthetic S-tier collector run (required keys/types, referential integrity, JSON round-trip, kind/model/log-tail/prune guarantees), fixed-clock `renderText` frame (exact frozen frame, literal header pin, ANSI-free output, badge/chevron/elapsed/truncation regexes, newest-log-first), `parseArgs` defaults via `toMatchObject` (additive-safe per Decision 6) plus `--json`→`--once` coupling.
- Ran benches twice (first run exposed a stale ps/composer call-counter read in the setup reporting — fixed in collector.bench.ts; no fixture/measurement change) and recorded the final run in `bench/BASELINE.md` with machine context and re-run instructions.

### Blockers Encountered
- None. Two design notes: (1) prune passes are not exported, so stage-level prune timing is derived from the e2e default-vs-prunes-off pair rather than direct benches; (2) tail open/read I/O bypasses `FsLike`, so fs-op counts exclude it — recorded in BASELINE.md as the known limitation that subtask 03's tail seam resolves.

### Files Modified
- `plugins/zoto-cursor-top/bench/fixtures.ts` (created)
- `plugins/zoto-cursor-top/bench/collector.bench.ts` (created)
- `plugins/zoto-cursor-top/bench/render.bench.ts` (created)
- `plugins/zoto-cursor-top/bench/BASELINE.md` (created)
- `plugins/zoto-cursor-top/tests/contracts.test.ts` (created)
- `plugins/zoto-cursor-top/package.json` (modified — `bench` script only)

### Verification (targeted only)
- `pnpm --filter @zoto-agents/zoto-cursor-top run bench` → exit 0, 24 per-tier bench results printed.
- `pnpm --filter @zoto-agents/zoto-cursor-top exec vitest run tests/contracts.test.ts` → 17/17 passed.
- `pnpm --filter @zoto-agents/zoto-cursor-top test` → 13 files / 103 tests passed (pre-existing 86 + 17 new; benches not collected).
- `git status` for the plugin shows only the three allowed paths; `src/` untouched. No linter errors in added files.

### Baseline headline numbers (mean ms; see bench/BASELINE.md)
- collect() e2e (default flags): S 4.66 / M 40.6 / L 281
- tail fan-out stage: S 3.40 / M 28.1 / L 259 (~73–92 % of the tick)
- renderText: S 0.023 / M 0.204 / L 3.27; row-build: S 0.014 / M 0.142 / L 1.28
- FsLike ops per default tick: S 79 / M 504 / L 4579 (+1 ps, +1 sqlite3 spawn; tail I/O excluded — see limitation)
