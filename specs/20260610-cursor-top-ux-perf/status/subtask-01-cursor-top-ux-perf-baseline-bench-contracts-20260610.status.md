# Subtask 01 — cursor-top-ux-perf — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 01 |
| feature | cursor-top-ux-perf |
| assigned_agent | generalPurpose (model: `claude-fable-5-thinking-max`) |
| model | claude-fable-5-thinking-max |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-06-10T14:01:25.566Z |
| last_heartbeat | 2026-06-10T14:45:06.458Z |
| completed_at | 2026-06-10T14:33:14.623Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-cursor-top/bench/fixtures.ts` — deterministic synthetic-scale generator producing: an in-memory `FsLike` (matching `src/types.ts`) populated with session JSON, workspace `agent-transcripts/` trees, and large JSONL transcript/log files; a matching fake `ps` stdout (`psRunner` stub); and a stub `composerModelRunner`. Parameterised by tier: **S** (~10 agents), **M** (~100 agents + subagents), **L** (~1000 agents + subagents, multi-MB log files). Exported for reuse by tests and later subtasks.
- [x] **D02** — `plugins/zoto-cursor-top/bench/collector.bench.ts` — vitest bench (`vitest bench`) measuring warm-process `collector.collect()` end-to-end latency per tier (collector created via `createCollector` with injected fs/psRunner/composerModelRunner), plus stage-level benches for the exported pipeline pieces: `readSessionRecords`, `readTranscriptRecords`, `tailFile`/`tailJsonlMessages` fan-out, and `buildHierarchy` + prune passes.
- [x] **D03** — `plugins/zoto-cursor-top/bench/render.bench.ts` — vitest bench measuring `renderText(snapshot)` and the interactive row-build path (`flattenVisible` + `formatAgentRowLine` over all visible rows) per tier.
- [x] **D04** — Counting-`FsLike` instrumentation in `bench/fixtures.ts` (wraps the in-memory fs, counts `readdir`/`readFile`/`stat`/`exists`/open-equivalent calls) so fs-operation counts per tick are reported alongside latency.
- [x] **D05** — `bench` script added to `plugins/zoto-cursor-top/package.json` (e.g. `"bench": "vitest bench --run"`). No README edits in this subtask — subtask 02 owns all `README.md` changes during Phase 1; the README "Benchmarks" note (bench script usage + `bench/BASELINE.md` pointer) lands with subtask 03's docs pass. Re-run instructions live in `bench/BASELINE.md` meanwhile.
- [x] **D06** — `plugins/zoto-cursor-top/bench/BASELINE.md` — recorded baseline: machine context, per-tier `collect()` latency, per-stage timings, fs-op counts per tick, render timings; plus exact re-run instructions. This file is the canonical "numbers to beat" and gains before/after sections in subtasks 03, 07, and 08.
- [x] **D07** — `plugins/zoto-cursor-top/tests/contracts.test.ts` — contract tests that freeze: (1) the JSON snapshot shape (`AgentSnapshot` keys `capturedAt`/`nodes`/`roots`/`diagnostics`; `AgentNode` required keys and types per `src/types.ts`) on both demo and synthetic fixtures; (2) `renderText` structure on a fixed-clock snapshot (header from `headerRow()`, row layout from `formatAgentRowLine`, title/log body lines, newest-log-first order); (3) default `parseArgs` values (`intervalMs` 1000, `logLines` 3, `cursorOnly`/`withLogs`/`activeOnly` true, `transcriptMaxAgeHours` 24).
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-cursor-top/bench/fixtures.ts` — tiered scale-fixture generator (MemFs + CountingFs + real temp JSONL + ps/composer stubs)
- **created** `plugins/zoto-cursor-top/bench/collector.bench.ts` — collector e2e + stage benches per tier with fs-op count reporting
- **created** `plugins/zoto-cursor-top/bench/render.bench.ts` — renderText + row-build benches per tier
- **created** `plugins/zoto-cursor-top/tests/contracts.test.ts` — contract tests freezing snapshot shape, renderText frame, parseArgs defaults (17 tests)
- **modified** `plugins/zoto-cursor-top/package.json` — added bench script (vitest bench --run)
- **created** `plugins/zoto-cursor-top/bench/BASELINE.md` — measured baseline (machine context, per-tier collect/stage/render timings, fs-op counts, re-run instructions, tail-seam limitation)
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
All 7 deliverables + 5 DoD items complete within token budget. Baseline (mean ms): collect() e2e default S 4.66 / M 40.6 / L 281; tail fan-out S 3.40 / M 28.1 / L 259 (~73-92% of tick); renderText S 0.023 / M 0.204 / L 3.27; row-build S 0.014 / M 0.142 / L 1.28; FsLike ops/tick S 79 / M 504 / L 4579 (+1 ps +1 sqlite3 spawn; tail open/read I/O bypasses FsLike - subtask 03 adds that seam). Verification: bench exit 0 (24 per-tier results), contracts 17/17, plugin suite 13 files / 103 tests green, zero src/ changes (git-verified), no lints. Prune-pass timing bracketed via e2e default-vs-prunes-off pair (prunes are module-private; zero src/ changes preserved).
<!-- status:notes:end -->
