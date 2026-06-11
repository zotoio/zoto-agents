# Subtask: Status-Change Highlights + Event Strip

## Metadata
- **Subtask ID**: 05
- **Feature**: cursor-top-ux-perf
- **Assigned Subagent**: generalPurpose (model: `claude-fable-5-thinking-max`)
- **Dependencies**: 04
- **Created**: 20260610

## Objective

Surface agent lifecycle transitions — finished, blocked (waiting), failed — the moment they happen: a pure snapshot-diff produces events, the TUI shows a recent-events strip and transiently highlights rows whose status just changed, and an opt-in `--bell` flag rings the terminal bell on completion/failure. Events are TUI-only in this spec; `--json` output is deliberately unchanged.

## Deliverables Checklist
- [ ] `plugins/zoto-cursor-top/src/events.ts` — pure module: `diffSnapshots(prev, next, now)` returning `AgentEvent[]` (`{id, label, title, kind, from, to, at}`) for: status transitions to `done` (**finished**), to `error` (**failed**), to `waiting` (**blocked / needs input**), new node appeared, and node **vanished** between snapshots. Vanish semantics: with the default `--active-only` prune (`pruneDoneAgents`, `src/discovery/collector.ts`), an agent that finishes disappears from the next snapshot rather than transitioning to `done` — a vanished node whose last-known status was running/waiting/idle must be reported as **finished**, not silently dropped.
- [ ] App integration (`App.tsx`): maintain an event ring buffer (cap ~50) fed by `diffSnapshots` on every snapshot replacement (auto tick **and** manual `r` refresh); render the most recent 3–5 events as a themed event strip (e.g. `✓ Task(explore) finished · 12s ago`, `✗ chat failed`, `⏸ main waiting`) using subtask-02 theme tokens and relative times via `formatDuration` (`src/ui/format.ts`).
- [ ] Transient row highlights: rows whose status changed within the last ~5 s render highlighted (theme accent — colour/bold, not `inverse`, which is reserved for selection in `Row.tsx`); the highlight expires using the existing 1 s `now` clock in `App.tsx` without adding extra timers.
- [ ] `--bell` flag (`parseArgs` + HELP, default off): writes BEL (`\u0007`) to stdout/stderr on **finished** / **failed** events only (not waiting), at most one BEL per tick regardless of event count.
- [ ] TUI-only guarantee: no `events` field added to `AgentSnapshot` / `--json`; `--once` output unchanged. Record this as a deliberate non-goal in README (future additive extension).
- [ ] Tests: `diffSnapshots` unit coverage (each transition class, appear, vanish-as-finished, no-event on identical snapshots, id-stability across prunes), ring-buffer capping, and `ink-testing-library` App-level test driving two injected snapshots through the `load` prop and asserting the strip + highlight render; `--bell` gating logic unit-tested (BEL emission isolated behind a small injectable writer).
- [ ] Docs in the same subtask: README (Features + event strip explanation + `--bell`), HELP string, CHANGELOG, `commands/zoto-cursor-top.md` / `skills/zoto-cursor-top-monitor/SKILL.md` if flag guidance changes. Run `pnpm run eval:update --check`; on critical drift `pnpm run eval:update --apply --no-analyser`.

## Definition of Done
- [ ] Code implemented; events strip, row highlights, and `--bell` functional in interactive mode — verified via the `ink-testing-library` injected-snapshot tests (live `--demo` produces no transition events by design: `demoSnapshot()` hard-codes node ids and statuses; default `--demo` output stays unchanged)
- [ ] Targeted tests added and passing
- [ ] Subtask-01 contract tests pass unchanged (`--json`/`--once` untouched)
- [ ] Vanish-with-activeOnly semantics covered by an explicit test
- [ ] Docs + eval drift check clean
- [ ] No linter errors in modified files

## Implementation Notes

- `App.tsx` currently replaces the snapshot wholesale in the tick effect and in the `r` handler — both paths must diff prev→next before `setSnapshot`. Keep the diff outside React state churn (compute once per arriving snapshot; store events + a `changedAt` map in refs/state updated together).
- Status vocabulary is `AgentStatus` (`src/types.ts`): `running | waiting | idle | done | error | unknown`. Treat `unknown` transitions conservatively (no event) to avoid noise from transcript-status flapping; `running→idle` is likewise not an event (mtime-based statuses flap at the 5-min threshold in `readTranscriptRecords`).
- Filtering interplay (subtask 04): events are derived from the **unfiltered** snapshot so a filtered view still announces lifecycle changes happening off-screen; highlights apply to whichever matching rows are visible.
- The event strip consumes vertical space — keep it to one or two lines above the footer help, and ensure the diagnostics block (`snapshot.diagnostics.slice(0, 3)`) still renders. Subtask 07 will account for the strip in viewport maths; keep its height deterministic.
- BEL must never be written in `--once`/`--json` modes nor when stdout is not a TTY.
- Follow the TodoWrite contract: create todos from this checklist and the DoD on spawn.

### Hard constraints (must preserve)
- No native dependencies — terminal bell is the only "notification" channel (OS notifications are out of scope).
- macOS/Linux/Windows parity (BEL + ANSI-free fallbacks behave on Windows terminals).
- Default `--once`/`--json`/`--demo` output unchanged; JSON snapshot shape untouched.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Targeted runs only, e.g. `pnpm --filter @zoto-agents/zoto-cursor-top exec vitest run tests/events.test.ts tests/app.test.tsx tests/cli.test.ts tests/contracts.test.ts`
- Manual sanity: `pnpm --filter @zoto-agents/zoto-cursor-top run demo` renders the strip chrome and themed layout only — `demoSnapshot()` hard-codes node ids AND statuses (per-tick regeneration rotates the demo **log lines** only; ids, statuses, and `startedAt` stay fixed from module load), so live demo ticks fire no transition events. Strip content + highlights are verified by the `ink-testing-library` injected-snapshot tests, not by watching the demo.
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
