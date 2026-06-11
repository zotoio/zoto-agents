# Subtask 06 — cursor-top-ux-perf — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 06 |
| feature | cursor-top-ux-perf |
| assigned_agent | generalPurpose (model: `composer-2.5-fast`) |
| model | composer-2.5-fast |
| token_budget | 150000 |
| state | completed |
| started_at | 2026-06-11T08:15:00Z |
| last_heartbeat | 2026-06-11T08:25:00Z |
| completed_at | 2026-06-11T08:25:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-cursor-top/src/ui/DetailPane.tsx` — themed (subtask 02) pane rendering full metadata for the selected node: `id`, `kind` badge, `pid`, `label`, full untruncated `title`, `model`, `repo`, `startedAt` + elapsed (`formatStart`), `status` (status-coloured), and the full `logSource` path; followed by the deep log tail (newest first, consistent with `Row.tsx`). (`plugins/zoto-cursor-top/src/ui/DetailPane.tsx`)
- [x] **D02** — On-demand deep tail loader: fetch the last `--detail-lines` lines for the selected node only, via `tailFile` / `tailJsonlMessages` (`src/discovery/logs.ts`) with an enlarged `windowBytes` proportional to the requested line count (the existing 16/64 KB defaults are sized for 3 lines; 25–50 message snippets need a bigger window — pass it explicitly via the existing parameter). Loading is async and non-blocking (placeholder while loading), refreshes while the pane is open only when the file's `(mtimeMs, size)` changed (reuse/extend subtask-03 cache utilities), and is cancelled/discarded cleanly when the pane closes or selection changes. (`plugins/zoto-cursor-top/src/ui/detail-tail.ts`)
- [x] **D03** — Key bindings in `App.tsx`: `d` toggles the detail pane for the selected row; `Esc` closes it (without clearing an active filter — `Esc` priority: close pane first, then clear filter); `↑/↓` while open either moves selection (pane follows) — pick one behaviour and document it. No clashes with existing keys (`↑↓jk l h e c r p q space enter`), `/` (filter), or subtask-02 theme/density keys. Footer help + HELP string updated. (`plugins/zoto-cursor-top/src/ui/App.tsx`)
- [x] **D04** — Layout: pane renders as a bottom split or overlay (implementer choice — document it) that adapts to terminal height, truncates gracefully on small terminals, and coexists with the filter bar (04) and event strip (05). (`plugins/zoto-cursor-top/src/ui/App.tsx`)
- [x] **D05** — `--detail-lines <n>` flag (`parseArgs` + HELP, default 25, min 1) controlling the deep-tail depth. (`plugins/zoto-cursor-top/src/cli.ts`)
- [x] **D06** — Demo support: detail pane works in `--demo` (demo nodes have no real `logSource` — give the pane a sensible fallback rendering `recentLogs` when `logSource` is null, which also covers real process-only nodes); default demo output unchanged. (`plugins/zoto-cursor-top/src/ui/detail-tail.ts`)
- [x] **D07** — Tests: deep-tail loader (window enlargement maths, jsonl vs plain text, missing/unreadable file → empty + placeholder), pane rendering (metadata fields, null-`logSource` fallback), and `ink-testing-library` key flow (`d` opens, Esc closes, selection change refreshes content). (`plugins/zoto-cursor-top/tests/detail-pane.test.tsx`)
- [x] **D08** — Docs in the same subtask: README (Features + Keyboard + `--detail-lines`), HELP, CHANGELOG, `commands/zoto-cursor-top.md` / `skills/zoto-cursor-top-monitor/SKILL.md` guidance. Run `pnpm run eval:update --check`; on critical drift `pnpm run eval:update --apply --no-analyser`. (`plugins/zoto-cursor-top/README.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-cursor-top/src/ui/DetailPane.tsx` — themed bottom-split detail view
- **created** `plugins/zoto-cursor-top/src/ui/detail-tail.ts` — lazy deep tail loader with mtime cache
- **modified** `plugins/zoto-cursor-top/src/ui/App.tsx` — d/Esc keys, pane layout, detailLines prop
- **modified** `plugins/zoto-cursor-top/src/cli.ts` — --detail-lines flag and HELP
- **created** `plugins/zoto-cursor-top/tests/detail-pane.test.tsx` — loader, pane, and key-flow tests
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Bottom split between event strip and footer. Selection follows while open. eval:update --check clean after skill doc change.
<!-- status:notes:end -->
