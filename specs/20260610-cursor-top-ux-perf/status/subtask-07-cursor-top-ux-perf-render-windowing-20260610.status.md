# Subtask 07 — cursor-top-ux-perf — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 07 |
| feature | cursor-top-ux-perf |
| assigned_agent | generalPurpose (model: `composer-2.5-fast`) |
| model | composer-2.5-fast |
| token_budget | 150000 |
| state | completed |
| started_at | 2026-06-11T08:20:00Z |
| last_heartbeat | 2026-06-11T08:32:00Z |
| completed_at | 2026-06-11T08:32:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Viewport windowing: compute available body rows from terminal size (Ink `useStdout` → `stdout.rows`/`columns`, with sane non-TTY fallbacks) minus fixed chrome: header line, column header, diagnostics block, event strip (05), filter bar (04), detail pane when open (06 exports its height), footer help. Account for the fact that each agent row may span multiple terminal lines depending on density (row + title + log lines). (`plugins/zoto-cursor-top/src/ui/viewport.ts`)
- [x] **D02** — Scroll window over the flattened row list with a stable scroll offset, selection-follow scrolling (moving selection past the window edge scrolls; selection always visible), and overflow indicators (`↑ N more` / `↓ N more`) when rows are clipped above/below. (`plugins/zoto-cursor-top/src/ui/viewport.ts`)
- [x] **D03** — Interplay correctness: window recomputes correctly on expand/collapse (`e`/`c`/arrow keys), filter apply/clear (selection clamping from 04 still holds), detail pane open/close, density changes (02), and terminal resize (Ink re-render on `stdout` resize). (`plugins/zoto-cursor-top/src/ui/App.tsx`)
- [x] **D04** — Row memoisation: `React.memo` on `Row` with stable props; pass quantised elapsed-time inputs so unchanged rows skip re-render — choose between (a) quantising `now` per row outside the memo boundary or (b) computing the elapsed string in the parent and passing it as a prop. Off-window rows are **not rendered at all** (the map over rows only covers the windowed slice). (`plugins/zoto-cursor-top/src/ui/Row.tsx`)
- [x] **D05** — Clock-bound re-renders: the 1 s `setNow` interval may only trigger re-rendering of the windowed slice (bounded by viewport height, independent of total node count). (`plugins/zoto-cursor-top/src/ui/Tree.tsx`)
- [x] **D06** — `--once` / `renderText` unchanged: the plain-text renderer continues to emit the **full** untruncated tree (subtask-01 contracts green) — windowing is interactive-only. (`plugins/zoto-cursor-top/tests/contracts.test.ts`)
- [x] **D07** — Bench delta: extend `bench/render.bench.ts` with a windowed interactive frame-build bench (e.g. flatten + window + per-row format for a 40-row viewport) at tiers M and L; append before/after to `bench/BASELINE.md`. Target: windowed frame-build is O(viewport) — tier-L windowed frame-build time ≤ 1.5× tier M, and both well below the unwindowed full-tree row-build at the same tier; record actuals and explain any miss. (`plugins/zoto-cursor-top/bench/BASELINE.md`)
- [x] **D08** — Tests: windowing maths as pure functions (offset clamping, selection-follow, indicator counts, chrome-height accounting — extract to a testable `src/ui/viewport.ts`), plus `ink-testing-library` scenarios (e.g. 500 visible rows in a 30-row terminal: window renders only the slice + indicators; selection at bottom edge scrolls). (`plugins/zoto-cursor-top/tests/viewport.test.ts`)
- [x] **D09** — Docs in the same subtask: README (scrolling behaviour, indicators), CHANGELOG. Command/skill docs only if user-visible flags change (then eval drift check as in prior subtasks). (`plugins/zoto-cursor-top/README.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-cursor-top/src/ui/viewport.ts` — chrome accounting, row heights, selection-follow window
- **modified** `plugins/zoto-cursor-top/src/ui/Tree.tsx` — windowed slice + overflow indicators
- **modified** `plugins/zoto-cursor-top/src/ui/Row.tsx` — React.memo + startColumn prop
- **modified** `plugins/zoto-cursor-top/src/ui/App.tsx` — resolveTreeWindow integration, terminalRows test override
- **modified** `plugins/zoto-cursor-top/src/ui/format.ts` — optional startColumn on formatAgentRowLine
- **created** `plugins/zoto-cursor-top/tests/viewport.test.ts` — pure viewport maths
- **created** `plugins/zoto-cursor-top/tests/viewport-app.test.tsx` — ink windowing scenarios
- **modified** `plugins/zoto-cursor-top/bench/render.bench.ts` — windowed row-build benches M/L
- **created** `plugins/zoto-cursor-top/bench/quick-render-window.mjs` — one-shot windowed vs full timings
- **modified** `plugins/zoto-cursor-top/bench/BASELINE.md` — post-subtask-07 section
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Contracts 17/17; targeted tests 59/59. M/L bench via synthetic snapshots + quick-render-window.mjs (full vitest bench deferred to subtask 08).
<!-- status:notes:end -->
