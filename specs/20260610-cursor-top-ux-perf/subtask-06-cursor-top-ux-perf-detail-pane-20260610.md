# Subtask: Per-Agent Detail Pane + Expanded Log View

## Metadata
- **Subtask ID**: 06
- **Feature**: cursor-top-ux-perf
- **Assigned Subagent**: generalPurpose (model: `claude-fable-5-thinking-max`)
- **Dependencies**: 03, 05
- **Created**: 20260610

## Objective

Give every agent an on-demand detail view: press a key on the selected row to open a pane showing full metadata and a deep log tail (default 25 lines instead of 3), fetched lazily for just that node so the per-tick cost of the main view is untouched.

## Deliverables Checklist
- [ ] `plugins/zoto-cursor-top/src/ui/DetailPane.tsx` — themed (subtask 02) pane rendering full metadata for the selected node: `id`, `kind` badge, `pid`, `label`, full untruncated `title`, `model`, `repo`, `startedAt` + elapsed (`formatStart`), `status` (status-coloured), and the full `logSource` path; followed by the deep log tail (newest first, consistent with `Row.tsx`).
- [ ] On-demand deep tail loader: fetch the last `--detail-lines` lines for the selected node only, via `tailFile` / `tailJsonlMessages` (`src/discovery/logs.ts`) with an enlarged `windowBytes` proportional to the requested line count (the existing 16/64 KB defaults are sized for 3 lines; 25–50 message snippets need a bigger window — pass it explicitly via the existing parameter). Loading is async and non-blocking (placeholder while loading), refreshes while the pane is open only when the file's `(mtimeMs, size)` changed (reuse/extend subtask-03 cache utilities), and is cancelled/discarded cleanly when the pane closes or selection changes.
- [ ] Key bindings in `App.tsx`: `d` toggles the detail pane for the selected row; `Esc` closes it (without clearing an active filter — `Esc` priority: close pane first, then clear filter); `↑/↓` while open either moves selection (pane follows) — pick one behaviour and document it. No clashes with existing keys (`↑↓jk l h e c r p q space enter`), `/` (filter), or subtask-02 theme/density keys. Footer help + HELP string updated.
- [ ] Layout: pane renders as a bottom split or overlay (implementer choice — document it) that adapts to terminal height, truncates gracefully on small terminals, and coexists with the filter bar (04) and event strip (05).
- [ ] `--detail-lines <n>` flag (`parseArgs` + HELP, default 25, min 1) controlling the deep-tail depth.
- [ ] Demo support: detail pane works in `--demo` (demo nodes have no real `logSource` — give the pane a sensible fallback rendering `recentLogs` when `logSource` is null, which also covers real process-only nodes); default demo output unchanged.
- [ ] Tests: deep-tail loader (window enlargement maths, jsonl vs plain text, missing/unreadable file → empty + placeholder), pane rendering (metadata fields, null-`logSource` fallback), and `ink-testing-library` key flow (`d` opens, Esc closes, selection change refreshes content).
- [ ] Docs in the same subtask: README (Features + Keyboard + `--detail-lines`), HELP, CHANGELOG, `commands/zoto-cursor-top.md` / `skills/zoto-cursor-top-monitor/SKILL.md` guidance. Run `pnpm run eval:update --check`; on critical drift `pnpm run eval:update --apply --no-analyser`.

## Definition of Done
- [ ] Code implemented; detail pane opens/closes/refreshes correctly for agents, subagents, and process-only nodes
- [ ] Targeted tests added and passing
- [ ] Subtask-01 contract tests pass unchanged (pane is interactive-only; `--once`/`--json` untouched)
- [ ] Main-view tick cost unaffected when the pane is closed (no extra reads — verify via counting-fs test)
- [ ] Docs + eval drift check clean
- [ ] No linter errors in modified files

## Implementation Notes

- `tailJsonlMessages` already accepts `windowBytes` as a parameter — no signature changes needed; choose window ≈ `max(TRANSCRIPT_WINDOW_BYTES, lines × 8 KB)` capped at ~1 MB, and document the heuristic. Remember `extractMessageSnippets` drops the first (possibly truncated) line of the window.
- Snippets are truncated to 240 chars (`MAX_SNIPPET_LEN` in `logs.ts`) — acceptable for the pane; do not change the truncation constant (it is shared with the main view).
- Keep the deep tail **out** of the per-tick collector pipeline: it is a UI-side fetch for one node, triggered by pane state, using the node's `logSource`. The collector's 3-line tails continue to drive the tree rows.
- `Enter` currently expands nodes (`key.return` in `App.tsx`) — leave it as expand; `d` is the documented detail key (it is currently unbound).
- Pane height interacts with subtask 07's viewport maths — keep the pane's rendered height computable (export a helper or constant) so 07 can subtract it.
- Selected node id can disappear between ticks (prunes, filters, finished agents): the pane must handle "node gone" by closing gracefully or showing a tombstone line, not crashing.
- Follow the TodoWrite contract: create todos from this checklist and the DoD on spawn.

### Hard constraints (must preserve)
- No native dependencies; stdlib `open`/`read` windowed access only (never load whole multi-MB logs).
- macOS/Linux/Windows parity (path display uses the stored string verbatim; no platform branches expected).
- Default `--once`/`--json`/`--demo` output unchanged; JSON snapshot shape untouched.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Targeted runs only, e.g. `pnpm --filter @zoto-agents/zoto-cursor-top exec vitest run tests/detail-pane.test.tsx tests/logs.test.ts tests/app.test.tsx tests/cli.test.ts tests/contracts.test.ts`
- Manual sanity: `pnpm --filter @zoto-agents/zoto-cursor-top run demo`, select a row, press `d`
- Defer the monorepo suite and validators to subtask 08.

## Execution Notes

Implemented bottom-split detail pane (between event strip and footer):

- **`d`** toggles pane; **`Esc`** closes pane before clearing filter
- **`↑/↓`** moves selection; pane follows selected node
- **`--detail-lines`** (default 25, min 1) controls deep tail depth
- Lazy load via `detail-tail.ts` with mtime/size cache; zero detail reads while closed
- Demo / null `logSource` nodes use `recentLogs` fallback

### Agent Session Info
- Agent: generalPurpose (composer-2.5-fast)
- Started: 2026-06-11
- Completed: 2026-06-11

### Work Log
- Added `DetailPane.tsx`, `detail-tail.ts`, wired `App.tsx` + `--detail-lines`
- 14 new tests in `detail-pane.test.tsx`; contracts 17/17 unchanged
- Docs: README, HELP, CHANGELOG, command, skill; eval drift resolved

### Blockers Encountered
_None._

### Files Modified
- `plugins/zoto-cursor-top/src/ui/DetailPane.tsx` (new)
- `plugins/zoto-cursor-top/src/ui/detail-tail.ts` (new)
- `plugins/zoto-cursor-top/src/ui/App.tsx`
- `plugins/zoto-cursor-top/src/cli.ts`
- `plugins/zoto-cursor-top/src/discovery/logs.ts` (export TRANSCRIPT_WINDOW_BYTES)
- `plugins/zoto-cursor-top/tests/detail-pane.test.tsx` (new)
- `plugins/zoto-cursor-top/tests/cli.test.ts`
- `plugins/zoto-cursor-top/README.md`
- `plugins/zoto-cursor-top/CHANGELOG.md`
- `plugins/zoto-cursor-top/commands/zoto-cursor-top.md`
- `plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/SKILL.md`
