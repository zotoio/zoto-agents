# Subtask 02 — cursor-top-ux-perf — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 02 |
| feature | cursor-top-ux-perf |
| assigned_agent | generalPurpose (model: `claude-fable-5-thinking-max`) |
| model | claude-fable-5-thinking-max |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-06-10T14:27:00Z |
| last_heartbeat | 2026-06-10T14:55:40.982Z |
| completed_at | 2026-06-10T14:55:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-cursor-top/src/ui/theme.ts` — theme model + built-ins. A `Theme` carries named tokens: per-status colours (replacing the hard-coded switch in `statusColor`, `src/ui/format.ts`), header/accent, dim, selection, badge, diagnostics. Built-ins: `default` (current colours, unchanged), `mono` (no colour), `high-contrast`, and one accent palette (e.g. `ocean`). `resolveTheme(name, env)` falls back to `default` on unknown names (with a stderr warning) and forces `mono` when `NO_COLOR` is set (per no-color.org convention). (`plugins/zoto-cursor-top/src/ui/theme.ts`)
- [x] **D02** — Density model with three levels: `compact` (agent row line only), `cozy` (row + title line), `comfortable` (row + title + log tail — exactly today's layout, the default). Density governs which body lines `Row` renders; the log-tail line count stays `--lines`-driven. (`plugins/zoto-cursor-top/src/ui/theme.ts`)
- [x] **D03** — Wiring: `Row.tsx` / `App.tsx` / `Tree.tsx` consume theme + density via props or a React context; all colour literals in `App.tsx` (`cyan`, `yellow`, `white`) and `Row.tsx`/`format.ts` route through theme tokens. `statusColor(status)` becomes theme-aware (e.g. `statusColor(status, theme)`) while keeping a default-theme overload so existing call sites/tests keep working. (`plugins/zoto-cursor-top/src/ui/App.tsx`)
- [x] **D04** — CLI flags in `src/cli.ts`: `--theme <name>` and `--density <compact|cozy|comfortable>`, parsed in `parseArgs` with validation (unknown value → stderr warning + default, consistent with existing arg handling), threaded into `App`; HELP text updated. (`plugins/zoto-cursor-top/src/cli.ts`)
- [x] **D05** — Interactive keys to cycle theme and density at runtime (chosen keys MUST NOT clash with existing bindings `↑↓jk l h e c r p q space enter` nor with keys reserved by later subtasks: `/` for filter, `d` + `Esc` for the detail pane). Footer key help + HELP string updated; document the final choice in this file's Work Log. (`plugins/zoto-cursor-top/src/ui/App.tsx`)
- [x] **D06** — Default-output stability: with no new flags passed, `--once`, `--json`, and `--demo` output is unchanged (default density = `comfortable`, default theme = `default`; themes never inject ANSI into `renderText` output — `--once` stays plain text; `--json` is unaffected by theme/density entirely). Contract tests from subtask 01 stay green. (`plugins/zoto-cursor-top/tests/contracts.test.ts`)
- [x] **D07** — Tests: theme resolution (named lookup, unknown fallback, `NO_COLOR` forcing mono), density rendering via `ink-testing-library` (compact hides title+logs; cozy hides logs only), and density-variant behaviour of `--once` rendering when `--density` is explicitly passed. (`plugins/zoto-cursor-top/tests/theme.test.ts`)
- [x] **D08** — Docs in the same subtask: README (Features + Usage flags + Keyboard tables), CHANGELOG (unreleased/0.2.0 section), `commands/zoto-cursor-top.md` flag list, `skills/zoto-cursor-top-monitor/SKILL.md` recommended-flags guidance, `rules/zoto-cursor-top.mdc` if conventions change. This subtask owns ALL `README.md` edits during Phase 1 (subtask 01 makes none; its "Benchmarks" note is deferred to subtask 03). Then run `pnpm run eval:update --check`; on critical drift run `pnpm run eval:update --apply --no-analyser` (the skill/command/agent are covered eval targets; never use `--with-analyser` here). (`plugins/zoto-cursor-top/README.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-cursor-top/src/ui/theme.ts` — Theme model, built-in palettes, resolveTheme/resolveDensity helpers
- **modified** `plugins/zoto-cursor-top/src/ui/App.tsx` — Theme/density state, t/y cycling keys, theme token wiring
- **modified** `plugins/zoto-cursor-top/src/ui/Row.tsx` — Density gating for title/log body lines, theme tokens
- **modified** `plugins/zoto-cursor-top/src/ui/Tree.tsx` — Forward theme + density props to Row
- **modified** `plugins/zoto-cursor-top/src/ui/format.ts` — Theme-aware statusColor overload
- **modified** `plugins/zoto-cursor-top/src/ui/render-text.ts` — Density gating for --once output (colour-free)
- **modified** `plugins/zoto-cursor-top/src/cli.ts` — --theme/--density flags, HELP text, App threading
- **created** `plugins/zoto-cursor-top/tests/theme.test.ts` — Theme resolution, NO_COLOR, density model unit tests
- **created** `plugins/zoto-cursor-top/tests/density.test.tsx` — Ink density rendering + interactive t/y key tests (vi.waitFor for Ink 7)
- **modified** `plugins/zoto-cursor-top/tests/cli.test.ts` — --theme/--density parseArgs tests
- **modified** `plugins/zoto-cursor-top/tests/render-text.test.ts` — Density gating + ANSI-free assertions
- **modified** `plugins/zoto-cursor-top/README.md` — Features, flags table, keyboard bindings
- **modified** `plugins/zoto-cursor-top/CHANGELOG.md` — Unreleased section for theme + density
- **modified** `plugins/zoto-cursor-top/commands/zoto-cursor-top.md` — Theme/density flag list and argument handling
- **modified** `plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/SKILL.md` — Recommended flags + t/y keyboard guidance
- **modified** `plugins/zoto-cursor-top/rules/zoto-cursor-top.mdc` — Themes and density conventions section
<!-- status:artifacts:end -->

<!-- status:errors:start -->
- **warn** `2026-06-10T14:52:00Z` — Duplicate concurrent session: a second agent (composer-2.5-fast, token_budget 300000) raced this assigned session (claude-fable-5-thinking-max, 200000) on the same subtask, overwriting this status pair's metadata and marking it completed at 2026-06-11T00:45 local. On-disk src/ui + cli + tests implementation is the assigned session's work (file mtimes match its writes); docs edits and the brief's Execution Notes were recorded by the duplicate session and have been verified accurate against the implementation. Mandated metadata (model/budget/started_at) restored per executor instruction; judge verdict block preserved untouched.
- **warn** `2026-06-10T14:52:00Z` — Transient contract-test failure NOT caused by this subtask: tests/contracts.test.ts 'collector snapshot shape on the synthetic scale fixture' began failing at ~00:47 local because a concurrent (phase-2) session is actively editing src/discovery/{collector,fs,logs}.ts, src/types.ts and bench/fixtures.ts — files outside subtask-02 ownership. With this subtask's diff alone the full contract suite passed 17/17 at 00:43 local. RESOLVED 00:53 local after the churn settled: contracts 17/17, targeted 74/74, full plugin suite 150/150.
<!-- status:errors:end -->

<!-- status:notes:start -->
Interactive keys: t=cycle theme (default→mono→high-contrast→ocean), y=cycle density (comfortable→compact→cozy). Final verification 00:53 local: contracts 17/17, targeted 74/74, full plugin suite 150/150, ReadLints clean; eval:update --check exit 0 (critical_count 0); default --demo --once/--json byte-identical to pre-change baseline after timestamp normalisation. Judge verdict recorded by concurrent session preserved in extra.judge.
<!-- status:notes:end -->
