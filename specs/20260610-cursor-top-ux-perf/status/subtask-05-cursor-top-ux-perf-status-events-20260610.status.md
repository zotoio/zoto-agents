# Subtask 05 — cursor-top-ux-perf — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 05 |
| feature | cursor-top-ux-perf |
| assigned_agent | generalPurpose (model: `composer-2.5-fast`) |
| model | composer-2.5-fast |
| token_budget | 150000 |
| state | completed |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-cursor-top/src/events.ts` — pure module: `diffSnapshots(prev, next, now)` returning `AgentEvent[]` (`{id, label, title, kind, from, to, at}`) for: status transitions to `done` (**finished**), to `error` (**failed**), to `waiting` (**blocked / needs input**), new node appeared, and node **vanished** between snapshots. Vanish semantics: with the default `--active-only` prune (`pruneDoneAgents`, `src/discovery/collector.ts`), an agent that finishes disappears from the next snapshot rather than transitioning to `done` — a vanished node whose last-known status was running/waiting/idle must be reported as **finished**, not silently dropped. (`plugins/zoto-cursor-top/src/events.ts`)
- [x] **D02** — App integration (`App.tsx`): maintain an event ring buffer (cap ~50) fed by `diffSnapshots` on every snapshot replacement (auto tick **and** manual `r` refresh); render the most recent 3–5 events as a themed event strip (e.g. `✓ Task(explore) finished · 12s ago`, `✗ chat failed`, `⏸ main waiting`) using subtask-02 theme tokens and relative times via `formatDuration` (`src/ui/format.ts`). (`plugins/zoto-cursor-top/src/ui/App.tsx`)
- [x] **D03** — Transient row highlights: rows whose status changed within the last ~5 s render highlighted (theme accent — colour/bold, not `inverse`, which is reserved for selection in `Row.tsx`); the highlight expires using the existing 1 s `now` clock in `App.tsx` without adding extra timers. (`plugins/zoto-cursor-top/src/ui/Row.tsx`)
- [x] **D04** — `--bell` flag (`parseArgs` + HELP, default off): writes BEL (`\u0007`) to stdout/stderr on **finished** / **failed** events only (not waiting), at most one BEL per tick regardless of event count. (`plugins/zoto-cursor-top/src/cli.ts`)
- [x] **D05** — TUI-only guarantee: no `events` field added to `AgentSnapshot` / `--json`; `--once` output unchanged. Record this as a deliberate non-goal in README (future additive extension). (`plugins/zoto-cursor-top/README.md`)
- [x] **D06** — Tests: `diffSnapshots` unit coverage (each transition class, appear, vanish-as-finished, no-event on identical snapshots, id-stability across prunes), ring-buffer capping, and `ink-testing-library` App-level test driving two injected snapshots through the `load` prop and asserting the strip + highlight render; `--bell` gating logic unit-tested (BEL emission isolated behind a small injectable writer). (`plugins/zoto-cursor-top/tests/events.test.ts`)
- [x] **D07** — Docs in the same subtask: README (Features + event strip explanation + `--bell`), HELP string, CHANGELOG, `commands/zoto-cursor-top.md` / `skills/zoto-cursor-top-monitor/SKILL.md` if flag guidance changes. Run `pnpm run eval:update --check`; on critical drift `pnpm run eval:update --apply --no-analyser`. (`plugins/zoto-cursor-top/README.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-cursor-top/src/events.ts` — Pure diffSnapshots + ring buffer + bell helpers
- **created** `plugins/zoto-cursor-top/tests/events.test.ts` — Unit tests for diffSnapshots, ring buffer, bell gating
- **created** `plugins/zoto-cursor-top/tests/events-app.test.tsx` — Ink App tests for event strip and bell
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Targeted vitest: 55 passed (events.test.ts, events-app.test.tsx, app.test.tsx, cli.test.ts, contracts.test.ts 17/17).
eval:update --check clean after skill doc drift resolved.

<!-- status:notes:end -->
