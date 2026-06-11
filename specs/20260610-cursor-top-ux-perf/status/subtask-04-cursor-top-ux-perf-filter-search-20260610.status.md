# Subtask 04 — cursor-top-ux-perf — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 04 |
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
- [x] **D01** — `plugins/zoto-cursor-top/src/filter.ts` — pure, UI-free module: `parseFilterQuery(input)` supporting scoped tokens `repo:<text>`, `model:<text>`, `status:<running|waiting|idle|done|error|unknown>` plus bare terms matched as free text across `label`, `title`, `repo`, `model`, and `recentLogs`; multiple terms AND-combine; matching is case-insensitive substring (status matches exactly against `AgentStatus` values). (`plugins/zoto-cursor-top/src/filter.ts`)
- [x] **D02** — `filterSnapshot(snapshot, query)` in the same module: returns a new `AgentSnapshot` containing matching nodes **plus their ancestor chains** (mirror the survives-set + children-rewrite pattern of `pruneWithoutLogs` in `src/discovery/collector.ts`), along with match counts (`matched`, `total`) for the header. Empty/blank query returns the snapshot untouched. (`plugins/zoto-cursor-top/src/filter.ts`)
- [x] **D03** — Interactive filter mode in `App.tsx`: `/` opens a footer filter bar; printable keys append, backspace deletes, `Esc` clears + closes, `Enter` commits and returns key focus to navigation. While a filter is active: header shows the query and `matched/total` count (themed via subtask 02 tokens), the filtered view re-applies automatically on every refresh tick, and selection is clamped to visible rows. `useInput` handling must not leak filter keystrokes into navigation bindings (e.g. typing `q` in the filter bar must not quit). (`plugins/zoto-cursor-top/src/ui/App.tsx`)
- [x] **D04** — `--filter "<query>"` flag in `src/cli.ts` (`parseArgs` + HELP): pre-seeds the interactive filter, and for `--once` / `--json` applies `filterSnapshot` before rendering/serialising. Without the flag, output is byte-identical to today (subtask-01 contracts green). The `--json` output with `--filter` remains a valid `AgentSnapshot` (same shape, fewer nodes). (`plugins/zoto-cursor-top/src/cli.ts`)
- [x] **D05** — Demo compatibility: filtering works against `demoSnapshot()` (`src/discovery/demo.ts`) so screenshots/tests are deterministic; do not change default demo output. (`plugins/zoto-cursor-top/tests/filter.test.ts`)
- [x] **D06** — Tests: query parser (tokens, quoting/whitespace, invalid status), matcher semantics (AND, case-insensitivity, per-field scoping, log-line matching), ancestor preservation + children rewriting, `App`-level interactive flow via `ink-testing-library` (open bar, type query, see filtered rows + count, Esc restores), and `--json --filter` end-to-end via `parseArgs` + snapshot filtering. (`plugins/zoto-cursor-top/tests/filter.test.ts`)
- [x] **D07** — Docs in the same subtask: README (Features, Usage flags, Keyboard table), HELP string, CHANGELOG, `commands/zoto-cursor-top.md` + `skills/zoto-cursor-top-monitor/SKILL.md` (document `--filter` for agent-shell usage with `--once`/`--json`). Run `pnpm run eval:update --check`; on critical drift `pnpm run eval:update --apply --no-analyser`. (`plugins/zoto-cursor-top/README.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-cursor-top/src/filter.ts` — Pure parseFilterQuery + filterSnapshot module
- **created** `plugins/zoto-cursor-top/tests/filter.test.ts` — Parser, matcher, tree-rewrite, demo fixture tests
- **created** `plugins/zoto-cursor-top/tests/filter-app.test.tsx` — Interactive filter + --json --filter integration tests
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Targeted vitest: 45 passed across filter.test.ts, filter-app.test.tsx, cli.test.ts, contracts.test.ts (17/17 contracts green).
eval:update --check clean after --apply --no-analyser.

<!-- status:notes:end -->
