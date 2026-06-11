# Subtask: Filtering / Search Across Agents

## Metadata
- **Subtask ID**: 04
- **Feature**: cursor-top-ux-perf
- **Assigned Subagent**: generalPurpose (model: `claude-fable-5-thinking-max`)
- **Dependencies**: 02, 03
- **Created**: 20260610

## Objective

Let users narrow the agent tree by repo, model, status, and free text — interactively (a `/` search prompt in the TUI) and non-interactively (a `--filter` flag that also applies to `--once` / `--json`). Filtering is a pure snapshot transform that preserves ancestor chains so the tree stays navigable.

## Deliverables Checklist
- [ ] `plugins/zoto-cursor-top/src/filter.ts` — pure, UI-free module: `parseFilterQuery(input)` supporting scoped tokens `repo:<text>`, `model:<text>`, `status:<running|waiting|idle|done|error|unknown>` plus bare terms matched as free text across `label`, `title`, `repo`, `model`, and `recentLogs`; multiple terms AND-combine; matching is case-insensitive substring (status matches exactly against `AgentStatus` values).
- [ ] `filterSnapshot(snapshot, query)` in the same module: returns a new `AgentSnapshot` containing matching nodes **plus their ancestor chains** (mirror the survives-set + children-rewrite pattern of `pruneWithoutLogs` in `src/discovery/collector.ts`), along with match counts (`matched`, `total`) for the header. Empty/blank query returns the snapshot untouched.
- [ ] Interactive filter mode in `App.tsx`: `/` opens a footer filter bar; printable keys append, backspace deletes, `Esc` clears + closes, `Enter` commits and returns key focus to navigation. While a filter is active: header shows the query and `matched/total` count (themed via subtask 02 tokens), the filtered view re-applies automatically on every refresh tick, and selection is clamped to visible rows. `useInput` handling must not leak filter keystrokes into navigation bindings (e.g. typing `q` in the filter bar must not quit).
- [ ] `--filter "<query>"` flag in `src/cli.ts` (`parseArgs` + HELP): pre-seeds the interactive filter, and for `--once` / `--json` applies `filterSnapshot` before rendering/serialising. Without the flag, output is byte-identical to today (subtask-01 contracts green). The `--json` output with `--filter` remains a valid `AgentSnapshot` (same shape, fewer nodes).
- [ ] Demo compatibility: filtering works against `demoSnapshot()` (`src/discovery/demo.ts`) so screenshots/tests are deterministic; do not change default demo output.
- [ ] Tests: query parser (tokens, quoting/whitespace, invalid status), matcher semantics (AND, case-insensitivity, per-field scoping, log-line matching), ancestor preservation + children rewriting, `App`-level interactive flow via `ink-testing-library` (open bar, type query, see filtered rows + count, Esc restores), and `--json --filter` end-to-end via `parseArgs` + snapshot filtering.
- [ ] Docs in the same subtask: README (Features, Usage flags, Keyboard table), HELP string, CHANGELOG, `commands/zoto-cursor-top.md` + `skills/zoto-cursor-top-monitor/SKILL.md` (document `--filter` for agent-shell usage with `--once`/`--json`). Run `pnpm run eval:update --check`; on critical drift `pnpm run eval:update --apply --no-analyser`.

## Definition of Done
- [ ] Code implemented; interactive `/` filter and `--filter` flag both functional
- [ ] Targeted tests added and passing
- [ ] Subtask-01 contract tests pass unchanged (default outputs untouched)
- [ ] Filter applies in `--once`, `--json`, `--demo`, and interactive modes consistently
- [ ] Docs + eval drift check clean
- [ ] No linter errors in modified files

## Implementation Notes

- Keep `filterSnapshot` in `src/` (not `src/ui/`) so `cli.ts` can use it for `--once`/`--json` without importing UI modules; it operates on the post-collect snapshot, downstream of the collector's own prune passes — do **not** push filtering into the collector.
- Filtering complements (not replaces) existing view flags `--cursor-only` / `--with-logs` / `--active-only`.
- Transcript-derived rows (parent chats AND subagents) carry `repo` = workspace slug (`buildTranscriptRecord` → `extractWorkspaceSlug`) and `model: null` until the composer-model lookup resolves; `repo: null` occurs on session-JSON-derived subagents and process-only nodes — define and test semantics: scoped tokens match against the node's own fields only; ancestor-chain preservation is what keeps context visible. A `repo:` match on a parent keeps the parent visible but does NOT auto-include non-matching children (children of matched nodes are included only if they match; document this choice in README).
- Wall-clock churn: the filter bar must remain responsive while ticks land every `intervalMs`; memoise `filterSnapshot(snapshot, committedQuery)` via `useMemo` keyed on both.
- Key reservations: `/` is claimed here; `d`/`Esc` are reserved for subtask 06's detail pane; theme/density keys were claimed in subtask 02 — check `App.tsx`'s current bindings before adding.
- Coordinate with the cli.ts state after subtasks 02/03 (this subtask depends on both so flag parsing edits are serialised).
- Follow the TodoWrite contract: create todos from this checklist and the DoD on spawn.

### Hard constraints (must preserve)
- No native dependencies; the filter is pure TypeScript.
- macOS/Linux/Windows parity (string matching only — no platform branches expected).
- Default `--once`/`--json`/`--demo` output unchanged; `--filter` output stays a backward-compatible `AgentSnapshot`.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Targeted runs only, e.g. `pnpm --filter @zoto-agents/zoto-cursor-top exec vitest run tests/filter.test.ts tests/app.test.tsx tests/cli.test.ts tests/contracts.test.ts`
- Manual sanity: `pnpm --filter @zoto-agents/zoto-cursor-top run demo` then `/` search; `tsx src/cli.ts --demo --json --filter "status:running"`
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
