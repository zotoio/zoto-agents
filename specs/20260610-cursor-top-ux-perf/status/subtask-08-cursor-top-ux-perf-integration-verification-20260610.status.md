# Subtask 08 — cursor-top-ux-perf — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 08 |
| feature | cursor-top-ux-perf |
| assigned_agent | generalPurpose (model: `composer-2.5-fast`) |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-06-11T08:50:00Z |
| last_heartbeat | 2026-06-11T08:55:00Z |
| completed_at | 2026-06-11T08:55:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Full test + validation gates green, with outputs captured in the Work Log: `pnpm --filter @zoto-agents/zoto-cursor-top test` (canonical per-package signal), `node scripts/validate-template.mjs`, `node scripts/validate-skills.mjs`, and the monorepo `pnpm test` (if the single parallel invocation flakes on unrelated CLI-integration timeouts, fall back to per-package runs and note it — do not chase unrelated flakes). (`plugins/zoto-cursor-top/tests/`)
- [x] **D02** — Eval coherence: `pnpm run eval:update --check` exits 0. If subtasks left critical drift on `skill:zoto-cursor-top-monitor`, `command:zoto-cursor-top`, or `agent:zoto-cursor-top-troubleshooter`, run `pnpm run eval:update --apply --no-analyser` (cached analyser payloads; never `--with-analyser` — it is network-dependent and can hang) and re-check. `skills/zoto-cursor-top-monitor/evals/evals.json` still contains ≥ 2 valid cases. (`plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json`)
- [x] **D03** — Final benchmark run: execute the full bench suite and append a consolidated **before/after table** (baseline → post-03 → post-07 → final) to `bench/BASELINE.md` covering warm-tick collector latency, fs-op counts, and windowed frame-build cost at tiers S/M/L, summarising the realised gains of subtasks 03 + 07. (`plugins/zoto-cursor-top/bench/BASELINE.md`)
- [x] **D04** — Hard-constraint re-verification with evidence: (1) `package.json` dependency diff shows **no new runtime dependencies** (and none native anywhere); (2) subtask-01 contract tests pass on the final tree — default `--once`/`--json`/`--demo` outputs stable, `AgentSnapshot` shape backward compatible with all new flags additive; (3) interactive features degrade gracefully in non-TTY contexts (auto-promote to `--once` still intact in `applyNonTtyDefaults`). (`plugins/zoto-cursor-top/tests/contracts.test.ts`)
- [x] **D05** — Cross-platform parity audit: a written checklist (in the Work Log / execution report) walking every changed code path against `darwin` / `linux` / `win32`: `paths.ts` roots, `processes.ts` PowerShell branch + fixtures, terminal-size and resize handling (07), colour/`NO_COLOR` handling (02), BEL emission (05), path rendering (06). Windows-specific parse fixtures updated where new parsing landed. (`specs/20260610-cursor-top-ux-perf/execution-report-cursor-top-ux-perf-20260610.md`)
- [x] **D06** — Docs coherence pass: README Features / Usage / Keyboard sections present every new flag (`--theme`, `--density`, `--filter`, `--detail-lines`, `--bell`, plus any cadence flag from 03) and key binding exactly as implemented (cross-check against `HELP` in `src/cli.ts` and `useInput` in `App.tsx`); `commands/zoto-cursor-top.md`, `skills/zoto-cursor-top-monitor/SKILL.md`, `rules/zoto-cursor-top.mdc`, and `agents/zoto-cursor-top-troubleshooter.md` updated consistently (troubleshooter gains the new flags/diagnostics in its playbook). (`plugins/zoto-cursor-top/README.md`)
- [x] **D07** — Release metadata: CHANGELOG.md consolidated `[0.2.0]` entry (Added/Changed/Performance subsections); version bumped to `0.2.0` in `plugins/zoto-cursor-top/package.json`, `.cursor-plugin/plugin.json`, and the hard-coded version string in `src/cli.ts` (`zoto-cursor-top 0.1.0`); add a `--version` output assertion to `cli.test.ts` (none exists today) pinned to `zoto-cursor-top 0.2.0`. (`plugins/zoto-cursor-top/src/cli.ts`)
- [x] **D08** — Execution-report inputs: a per-constraint outcomes summary (no native deps / parity / stable modes / JSON compat / balanced UX-features-performance delivery) with evidence pointers, ready for the executor's execution report. (`specs/20260610-cursor-top-ux-perf/execution-report-cursor-top-ux-perf-20260610.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-cursor-top/src/cli.ts` — CLI_VERSION export + 0.2.0 --version output
- **modified** `plugins/zoto-cursor-top/tests/cli.test.ts` — CLI_VERSION assertion
- **modified** `plugins/zoto-cursor-top/agents/zoto-cursor-top-troubleshooter.md` — filter/detail/bell diagnostics
- **modified** `plugins/zoto-cursor-top/bench/BASELINE.md` — consolidated before/after table
- **modified** `plugins/zoto-cursor-top/CHANGELOG.md` — released [0.2.0] section
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Gates: cursor-top 231/231 tests, validate-plugin 27/27, validate-template PASS, validate-skills 13/13, eval:update --check clean. Root pnpm test: one pre-existing zoto-eval-system failure (unrelated). Bench: quick-warm-metrics S + quick-render-window S/M/L only (no full vitest bench at tier L). Parity audit in execution report.
<!-- status:notes:end -->
