# Subtask: Viewport Windowing + Render Performance at Scale

## Metadata
- **Subtask ID**: 07
- **Feature**: cursor-top-ux-perf
- **Assigned Subagent**: generalPurpose (model: `claude-fable-5-thinking-max`)
- **Dependencies**: 01, 03, 06
- **Created**: 20260610

## Objective

Make interactive rendering scale to thousands of agents. Today `Tree.tsx` renders **every** visible row (`flattenVisible` output) regardless of terminal height, and the 1 s wall-clock `now` state re-renders the entire tree every second. Introduce an htop-style scroll viewport bounded by terminal size with selection-follow scrolling, memoise rows, and bound clock-driven re-renders — proving the gain against the subtask-01 baseline.

## Deliverables Checklist
- [ ] Viewport windowing: compute available body rows from terminal size (Ink `useStdout` → `stdout.rows`/`columns`, with sane non-TTY fallbacks) minus fixed chrome: header line, column header, diagnostics block, event strip (05), filter bar (04), detail pane when open (06 exports its height), footer help. Account for the fact that each agent row may span multiple terminal lines depending on density (row + title + log lines).
- [ ] Scroll window over the flattened row list with a stable scroll offset, selection-follow scrolling (moving selection past the window edge scrolls; selection always visible), and overflow indicators (`↑ N more` / `↓ N more`) when rows are clipped above/below.
- [ ] Interplay correctness: window recomputes correctly on expand/collapse (`e`/`c`/arrow keys), filter apply/clear (selection clamping from 04 still holds), detail pane open/close, density changes (02), and terminal resize (Ink re-render on `stdout` resize).
- [ ] Row memoisation: `React.memo` on `Row` with stable props; pass quantised elapsed-time inputs so unchanged rows skip re-render — choose between (a) quantising `now` per row outside the memo boundary or (b) computing the elapsed string in the parent and passing it as a prop. Off-window rows are **not rendered at all** (the map over rows only covers the windowed slice).
- [ ] Clock-bound re-renders: the 1 s `setNow` interval may only trigger re-rendering of the windowed slice (bounded by viewport height, independent of total node count).
- [ ] `--once` / `renderText` unchanged: the plain-text renderer continues to emit the **full** untruncated tree (subtask-01 contracts green) — windowing is interactive-only.
- [ ] Bench delta: extend `bench/render.bench.ts` with a windowed interactive frame-build bench (e.g. flatten + window + per-row format for a 40-row viewport) at tiers M and L; append before/after to `bench/BASELINE.md`. Target: windowed frame-build is O(viewport) — tier-L windowed frame-build time ≤ 1.5× tier M, and both well below the unwindowed full-tree row-build at the same tier; record actuals and explain any miss.
- [ ] Tests: windowing maths as pure functions (offset clamping, selection-follow, indicator counts, chrome-height accounting — extract to a testable `src/ui/viewport.ts`), plus `ink-testing-library` scenarios (e.g. 500 visible rows in a 30-row terminal: window renders only the slice + indicators; selection at bottom edge scrolls).
- [ ] Docs in the same subtask: README (scrolling behaviour, indicators), CHANGELOG. Command/skill docs only if user-visible flags change (then eval drift check as in prior subtasks).

## Definition of Done
- [ ] Code implemented; TUI navigable and correct on small terminals with very large agent trees
- [ ] Targeted tests added and passing (viewport maths + ink-testing-library scenarios)
- [ ] Subtask-01 contract tests pass unchanged (`--once`/`--json` full output preserved)
- [ ] Bench before/after appended to `bench/BASELINE.md` demonstrating viewport-bounded frame cost at tier L
- [ ] No linter errors in modified files

## Implementation Notes

- `flattenVisible` (`src/ui/Tree.tsx`) is O(visible nodes) and already memoised in `App.tsx` via `useMemo` keyed on `(snapshot, expanded)` — keep the flatten cheap and apply windowing downstream of it: `windowRows(flat, selectedIdx, viewportRows, rowHeights)`.
- Multi-line rows are the subtle part: a node consumes 1 line (compact), 2 (cozy), or 2 + min(logLines, recentLogs.length) lines (comfortable). The viewport must window by **terminal lines**, not by node count — `viewport.ts` should compute per-node heights from density + log counts (and title presence) and pick the slice that fits.
- `selectedId` lookup currently does `visible.findIndex` per keypress (`moveSelection` in `App.tsx`) — fine, but keep selection index derivation O(visible) and reuse it for windowing rather than re-scanning.
- Ink reconciles the whole tree each render; the win comes from rendering only ~viewport rows and from `React.memo` skipping unchanged `Row` subtrees. Verify with the bench rather than assuming.
- `process.stdout.rows` can be `undefined` in tests/non-TTY — default to a reasonable height (e.g. 24) and make it injectable for `ink-testing-library` scenarios.
- Expand-all (`e`) with tier-L trees is exactly the scenario this subtask fixes — use it as the manual stress test.
- This subtask lands last in the UI chain so it can account for all chrome (filter bar, event strip, detail pane); coordinate heights via the helpers those subtasks exported.
- Follow the TodoWrite contract: create todos from this checklist and the DoD on spawn.

### Hard constraints (must preserve)
- No native dependencies (terminal size via Node/Ink stdlib surfaces only).
- macOS/Linux/Windows parity — resize + size detection behave on Windows terminals; non-TTY fallback identical everywhere.
- Default `--once`/`--json`/`--demo` output unchanged (full tree, no indicators, no windowing).

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Targeted runs only, e.g. `pnpm --filter @zoto-agents/zoto-cursor-top exec vitest run tests/viewport.test.ts tests/tree.test.ts tests/app.test.tsx tests/render-text.test.ts tests/contracts.test.ts`
- Benches: `pnpm --filter @zoto-agents/zoto-cursor-top run bench` (render benches)
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
