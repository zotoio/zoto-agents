# Spec Assessment: cursor-top UX, Features & Performance Optimisation

**Target**: `specs/20260610-cursor-top-ux-perf/spec-cursor-top-ux-perf-20260610.md`
**Assessed**: 2026-06-10
**Assessor**: zoto-spec-judge (independent, fresh context)
**Verdict**: **Approve** (4.45/5)

## Scores

| Dimension | Weight | Score | Notes |
|-----------|--------|-------|-------|
| Completeness | 25% | 4/5 | All 6 requirements map to subtasks; thorough DoD with concrete gate commands; rollback story. Gap: the baseline's fs-op counting cannot observe log-tail I/O as specced (see Issue 1), leaving "log re-tailing efficiency" partially uninstrumented until subtask 03 reworks the seam. |
| Feasibility | 20% | 4/5 | ~30 file/symbol/constant references verified against the codebase — nearly all exact. One genuine contradiction inside subtask 01's constraints (Issue 1); everything else achievable with stated tooling (vitest 4 bench, no new deps, model slug available). |
| Structure | 20% | 5/5 | Mermaid graph matches the manifest edge-for-edge (17 edges); no cycles; no dep on a higher-numbered ID; phases equal longest-path layering; serialisation is deliberate and documented (Decision 2). |
| Specificity | 15% | 5/5 | Exceptional: exact files, functions, constants (`TRANSCRIPT_WINDOW_BYTES`, `MAX_SNIPPET_LEN`, 5/30-min thresholds), key reservations, numeric targets (≥50% latency, ≥80% readFile reduction, ≤1.5× tier-M frame build), heuristics, and caps. |
| Risk Awareness | 10% | 4/5 | Baseline-first ordering, contract-test freeze, opt-in flags + rollback, vanish-semantics edge case, NO_COLOR/non-TTY/Windows notes, eval-drift handling rationale, monorepo-flake fallback. Missed the `FsLike`/tail seam blind spot; Windows parity remains audit-based (no Windows CI). |
| Convention Compliance | 10% | 5/5 | Spec-system conventions honoured (NN-prefixed mermaid labels, schema-valid status pairs 8/8, TodoWrite contract, per-subtask testing strategy, reviewer non-interference in 08). Monorepo conventions: correct eval targets, validate scripts, version-bump locations (marketplace.json correctly omitted — it carries no version field). |
| **Overall** | | **4.45/5** | **Approve — ready for `/z-spec-execute` (fixes below recommended first)** |

## Verified Assumptions (sample)

Independently checked against `plugins/zoto-cursor-top/` source:

- `loadSnapshot` (`src/cli.ts`) constructs a fresh collector per call; interactive ticks call it via the `load` prop every `intervalMs` — the "rebuild-the-world every tick" premise is accurate.
- `parseArgs` defaults exactly as frozen by subtask 01 D07: `intervalMs` 1000, `logLines` 3, `cursorOnly`/`withLogs`/`activeOnly` true, `transcriptMaxAgeHours` 24. Version string `zoto-cursor-top 0.1.0` hard-coded; `applyNonTtyDefaults` exists.
- Key bindings in `App.tsx` are exactly `↑↓ j k → ← l h e c r p space enter q` (+ ctrl-c); `d` and `/` are unbound — the reservation plan is conflict-free.
- Colour literals confirmed: `cyan`/`yellow`/`white` in `App.tsx`, status switch in `statusColor` (`format.ts`), `inverse` reserved for selection in `Row.tsx`.
- `flattenVisible` memoised on `(snapshot, expanded)`; 1 s `setNow` clock re-renders the whole tree; `Tree.tsx` renders every visible row — windowing premise accurate.
- Prune passes (`pruneNonCursor`, `pruneWithoutLogs`, `pruneDoneAgents`) match the survives-set + children-rewrite pattern subtask 04 mirrors; `pruneDoneAgents` confirms subtask 05's vanish-as-finished concern is real.
- `readTranscriptRecords` thresholds are `STATUS_RUNNING_MS = 5 min` / `STATUS_IDLE_MS = 30 min` (the spec correctly cites the constants, not the stale docstring above them); status is mtime-derived, so per-tick stats are indeed non-negotiable.
- `tailJsonlMessages(path, n, windowBytes)` accepts `windowBytes`; `extractMessageSnippets` drops the first window line; `MAX_SNIPPET_LEN = 240`.
- `resolveCursorPaths("linux", "/home/bench")` yields exactly the layout subtask 01's fixture notes describe.
- `demoSnapshot()` hard-codes ids and statuses with `logSource: null` — no transition events in live demo, as subtask 05 states.
- vitest config `include` is `tests/**/*.test.ts(x)` — bench files under `bench/` will not leak into `pnpm test`.
- Eval manifest covers exactly the three named targets (`skill:zoto-cursor-top-monitor`, `command:zoto-cursor-top`, `agent:zoto-cursor-top-troubleshooter`); root `eval:update` script exists; `validate-template.mjs` / `validate-skills.mjs` exist; skill `evals.json` has 2 cases.
- `.cursor-plugin/plugin.json` version 0.1.0 — subtask 08's bump list is correct.
- Status pairs: 8/8 schema-valid (aggregator `--validate-only`: 0 invalid sources); checklist item counts match each subtask's Deliverables Checklist (7/8/9/7/7/8/9/8); `token_budget: 200000` matches the resolved config default (`subagents.default.tokenBudget`, no role override active); model `claude-fable-5-thinking-max` recorded everywhere and is an available slug.

## Findings

### Strengths

- **Baseline-before-optimisation discipline** (Decision 1) with numeric, falsifiable targets and a committed `bench/BASELINE.md` that accretes before/after sections at 03/07/08.
- **Behaviour freeze via contract tests** plus additive-only flag policy (Decision 6) gives a genuinely cheap rollback story (Decision 10).
- **Conflict-aware sequencing**: file-overlap serialisation is explicit and justified (Decision 2), including unusually careful Phase-1 README ownership and a parallel-execution fallback in subtask 02's DoD.
- **Reference accuracy**: implementation notes read like they were written against the actual source — verified correct in nearly every spot check (see above).
- **Docs/eval coherence travels with behaviour** (Decision 9), with the `--no-analyser` constraint and its rationale spelled out.

### Issues

| # | Severity | Subtask | Finding | Recommendation |
|---|----------|---------|---------|----------------|
| 1 | HIGH | 01 | **Internally contradictory constraints around log-tail I/O.** `tailFile`/`tailJsonlMessages` (`src/discovery/logs.ts`) open files via `node:fs/promises.open` directly — they bypass the injectable `FsLike` (which has no windowed-read API). With a purely in-memory `FsLike`, every tail `open()` ENOENTs against the real fs and returns `[]`. Consequences as specced: (a) tier-L "multi-MB log files to exercise the windowed tail reads" cannot be exercised; (b) the counting-`FsLike` (D04) cannot count tail open/read ops — the per-tick fs-op baseline excludes precisely the I/O subtask 03 optimises; (c) with empty `recentLogs`, `withLogs: true` prunes every fixture node. Yet the subtask simultaneously mandates "Zero changes to `src/`" and "never touch the real filesystem ... in benches". All three cannot hold. | Amend subtask 01: permit fixtures to materialise transcript/log files under a dedicated temp directory (clarify "never touch the real filesystem" to mean "never read real Cursor state dirs or spawn real processes"), point fixture `logSource` values at those temp files, and state explicitly that fs-op counts cover `FsLike` traffic only (walk/parse) until subtask 03 reworks the tail seam. |
| 2 | MEDIUM | 03 | **Tail-read observability seam is assumed but absent.** D-item "Unchanged files cost one `stat`, zero `open`/`read`" and the correctness test "warm tick #2 performs zero `readFile`s" require the tail path to be observable/cacheable, but tails bypass `FsLike` today. The note "`FsLike` ... already exposes `stat` ... sufficient for gating" is true for *gating* but not for serving or asserting the tail reads. Subtask 03 may change `src/`, so this is feasible — but the spec should authorise the seam change explicitly so the agent doesn't discover it mid-flight. | Add an implementation note to subtask 03: route tail reads through an observable seam — either extend `FsLike` with a windowed-read method (e.g. `readWindow(path, offset, length)` or an `open`-like handle) wired through `logs.ts`, or make the tail functions injectable via `CollectorOptions`; update tests/benches to count tail I/O through it. |
| 3 | LOW | 08 | Deliverable says "`cli.test.ts` version assertions updated", but no test currently asserts the CLI version string (verified across `tests/`). | Reword to "add (or update) a `cli.test.ts` assertion covering the 0.2.0 version output". |
| 4 | LOW | 05 | Parenthetical "demoSnapshot() hard-codes node ids AND statuses (per-tick regeneration shifts `startedAt` offsets only)" is inaccurate: `startedAt` is fixed at module load; per-tick regeneration rotates **log lines** (`rotate(pool, tick, …)`). The operative conclusion (live demo fires no transition events) still holds. | Correct the parenthetical in the DoD and Testing Strategy so the executing agent isn't misled about demo dynamics. |
| 5 | LOW | index | Phase-1 descriptions say subtask 01 "touches `bench/` + `tests/` + `package.json` only" while subtask 02 also writes test files (`tests/theme.test.ts`, `tests/app.test.tsx`, …). File-level disjointness holds (02 is barred only from `tests/contracts.test.ts`), but the directory-level wording could make a literal-minded executor flag a phantom conflict. | Tighten Decision 2 / Execution Order wording: 01 owns `bench/`, `tests/contracts.test.ts`, `package.json`; 02 owns `src/ui/`, `src/cli.ts`, docs, and any other `tests/` files. |

### Dependency Graph

- **Exact manifest ↔ mermaid match**: all 17 edges present and correct; no missing or extra edges; no cycles; IDs respect dependency order; phase assignments (1–7) equal longest-path layering.
- **Aggregator compatibility**: every node label carries a two-digit prefix (`S01[01: …]` … `S08[08: …]`) that `subtaskIdFromLabel` resolves; no hand-written `classDef`/`class` block is present, which is correct — the aggregator inserts and owns the managed `%% spec-system:classes:begin/end` block on first rebuild.
- **Serialisation is deliberate, not accidental**: 03→04, 04→05, 05→06 encode file-overlap serialisation per Decision 2 rather than data dependencies; with single-worktree execution this is the right call. No further parallelism is available without worktree isolation, which the spec consciously rejects.

### Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Subtask 01 agent hits the tail-seam contradiction and improvises (deviating from "never touch the real fs" or shipping a bench that under-measures) | High | Medium | Apply Fix 1 (+2) before execution |
| Windows parity regressions slip through (audit + fixtures only; no Windows CI) | Medium | Medium | Accepted by design; 08's written parity checklist + PowerShell parse fixtures are the practical ceiling |
| Long serial chain (phases 2–7 single-lane) stretches wall-clock time; any mid-chain failure blocks everything behind it | Medium | Low | Inherent to Decision 2; contract tests + per-subtask DoD keep failures local and re-spawnable |
| `pnpm run eval:update --apply --no-analyser` invoked headlessly inside subtasks sidesteps the eval-system's per-update user confirmation flow | Low | Low | Scope is constrained to critical drift on the three covered targets; `_meta.generated` contract protects user-authored cases; spec itself was user-approved |
| Bench numbers vary across machines, making "≥50%/≥80%" targets contestable | Low | Low | `BASELINE.md` records machine context + exact re-run instructions; deltas are computed on the same machine within a run |

## Recommendation

Approve. This is an unusually well-researched spec whose implementation notes verify against the actual source in nearly every detail, with a sound baseline-first structure and a correct, aggregator-compatible dependency graph. Before running `/z-spec-execute`, apply Fix 1 (and ideally Fix 2) so subtask 01's executing agent has a self-consistent set of constraints around log-tail benching; Fixes 3–5 are cheap wording corrections that remove minor landmines. None of the findings require restructuring subtasks, dependencies, or phases.

**Update 2026-06-10**: all 5 fixes were applied with explicit user approval — see Applied Fixes below. The spec is now ready for `/z-spec-execute`.

## Applied Fixes (2026-06-10, user-approved)

The scores above assess the spec **as originally submitted**; they are intentionally left unchanged. The following fixes were applied to the spec files after the assessment was presented:

| # | Severity | File | Change |
|---|----------|------|--------|
| 1 | HIGH | `subtask-01-...-baseline-bench-contracts-20260610.md` | Resolved the tail-I/O contradiction: D01 now prescribes a hybrid fixture (in-memory `FsLike` for walk/stat surfaces; tailed JSONL transcript/log files materialised as real files under a dedicated per-run temp directory, mirrored into the in-memory stats); D04 drops the impossible "open-equivalent" counting and records the tail-I/O exclusion as a known limitation in `BASELINE.md`; Implementation Notes clarify that "never touch the real filesystem" means never reading real Cursor state dirs / never spawning processes (the temp dir is the one sanctioned real-fs surface) and add a tail-seam note explaining why (`logs.ts` opens via `node:fs/promises.open`, bypassing `FsLike`); Tier-L bullet and the zero-`src/` DoD item updated to match. |
| 2 | MEDIUM | `subtask-03-...-collector-caching-20260610.md` | Implementation Notes now explicitly authorise the observable windowed-read seam (preferred: `FsLike.readWindow(...)` implemented in `realFs` and routed through `logs.ts`, keeping `tailFile`/`tailJsonlMessages` signatures stable for subtask 06; alternative: injectable tail functions via `CollectorOptions`), require extending the subtask-01 counting fixture to count tail reads, and mandate reporting tail reads as a **new** `BASELINE.md` metric column so before/after comparisons stay like-for-like with the tail-excluded baseline. |
| 3 | LOW | `subtask-08-...-integration-verification-20260610.md` | Release-metadata deliverable now reads "add a `--version` output assertion to `cli.test.ts` (none exists today) pinned to `zoto-cursor-top 0.2.0`" instead of referencing non-existent assertions to "update". |
| 4 | LOW | `subtask-05-...-status-events-20260610.md` | Testing Strategy parenthetical corrected: per-tick demo regeneration rotates the demo **log lines** only; ids, statuses, and `startedAt` stay fixed from module load. (The DoD wording was found to be already accurate, so only the Testing Strategy bullet changed.) |
| 5 | LOW | `spec-cursor-top-ux-perf-20260610.md` (index) | Phase-1 file ownership disambiguated in all three spots (Decision 2, Execution Order Phase 1 table, Subagent Assignment Guidance): subtask 01 owns `bench/` + `tests/contracts.test.ts` + `package.json`; subtask 02 owns `src/ui/` + `src/cli.ts` + docs + every other `tests/` file. |

**Consistency note (1 ↔ 2)**: the subtask-01 and subtask-03 edits were written as a pair — 01 records the tail-I/O counting exclusion in `BASELINE.md` and defers the seam to 03; 03 is authorised to build the seam and must surface tail reads as a separate column against that recorded limitation.

**Known cosmetic side effect**: the paired `status/*.status.yml` files snapshot deliverable *text* (checklist `text` fields for subtask 01 D01/D04 and subtask 08's release-metadata item now lag the amended subtask wording). Status files are out of scope for the judge per the reviewer non-interference rules; checklist **ids, ordering, and checkbox semantics are unaffected**, and the spec-system onStop/aggregator checks validate ids and checkbox state, not text equality. The subtask files remain the authoritative deliverable definitions.
