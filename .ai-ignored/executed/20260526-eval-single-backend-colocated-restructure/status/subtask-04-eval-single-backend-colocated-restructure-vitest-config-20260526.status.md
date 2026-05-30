# Subtask 04 — Eval Single Backend & Co-located Restructure — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 04 |
| feature | Eval Single Backend & Co-located Restructure |
| assigned_agent | zoto-eval-engineer |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-26T11:06:18Z |
| last_heartbeat | 2026-05-26T11:23:00Z |
| completed_at | 2026-05-26T11:23:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `evals/vitest.config.ts` — `root: path.resolve(__dirname, "..")` (the repo root); `include: ["**/evals/*.test.ts", "evals/*.test.ts", "evals/smoke-static-eval.test.ts"]`; `exclude: ["**/node_modules/**", "**/_runs/**", "**/fixtures/**", "**/_llm/**", "evals/llm/_shared/**", "evals/llm/test_*.test.ts"]` (the last exclude prevents the migration window — when both old `evals/llm/test_*.test.ts` and new co-located files exist — from running tests twice; subtask 08 removes those old files and the exclude becomes a no-op)
- [x] **D02** — `evals/vitest.config.ts` — keep the `setupFiles: ["./setup.ts"]` and the existing reporter wiring (both `default` and `./reporters/zoto-eval-reporter.ts`)
- [x] **D03** — `evals/vitest.config.ts` — add the `#eval-engine` alias currently in `evals/llm/vitest.config.ts` (`resolve.alias` mapping to `plugins/zoto-eval-system/engine`) so co-located tests can import the engine without long relative paths
- [x] **D04** — `evals/vitest.config.ts` — add the LLM reporter (`evals/llm/_shared/zoto-llm-reporter.ts`) to the `reporters` array; the LLM reporter MUST partition files by path (writing `llm.yml` for `<kind>/evals/<name>.test.ts` matches, skipping `evals/smoke-static-eval.test.ts`)
- [x] **D05** — `evals/llm/vitest.config.ts` — DELETED (since the unified config takes over). If you'd rather keep it as a thin re-export for backwards compatibility, the file must `export { default } from "../vitest.config.js"` and add no new keys; the cleaner option is deletion
- [x] **D06** — Verify `evals/reporters/zoto-eval-reporter.ts` still writes `evals/_runs/<runId>/static.yml` (no path change needed in this subtask) and `evals/llm/_shared/zoto-llm-reporter.ts` still writes `evals/_runs/<ts>/llm.yml` + `logs/` (no path change needed)
- [x] **D07** — Verify the reporter partitioning rule: a file matching `**/evals/*.test.ts` (co-located) is treated as LLM; `evals/smoke-static-eval.test.ts` is treated as static. The reporters MUST implement this partitioning explicitly — either by filename glob or by a marker frontmatter line `// _meta.eval_kind: llm | static` (defaulting to LLM when matching a `<kind>/evals/` path)
- [x] **D08** — Smoke run: `pnpm vitest run --config evals/vitest.config.ts` against the CURRENT layout (no co-located files yet) MUST exit 0 and only execute `evals/smoke-static-eval.test.ts`. (The existing `evals/llm/test_*.test.ts` files are excluded by the new include/exclude rules above.)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- `evals/vitest.config.ts` (modified) — unified vitest config rooted at repo root; reporters array contains static + LLM shims; `#eval-engine` alias migrated from the deleted `evals/llm/vitest.config.ts`.
- `evals/reporters/zoto-eval-reporter.ts` (modified) — added `isStaticEvalPath` partition filter in `onTestCaseResult` and a `cases.length === 0` short-circuit in `onTestRunEnd`.
- `evals/llm/_shared/zoto-llm-reporter.ts` (modified) — added `isLlmCoLocatedPath`, deferred `logs/` `mkdirSync` behind `ensureLogsDir`, refreshed docstring, and appended default-exported `ZotoLlmVitestReporter` shim that flushes on `onTestRunEnd` when buffered cases exist.
- `evals/llm/vitest.config.ts` (deleted) — cleaner-option deletion per the spec; subtask 03/06 re-wires the `eval:llm:code` package.json script.
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
- Smoke run: `pnpm vitest run --config evals/vitest.config.ts` exits 0; 5 test files (smoke + 4 stamped pilots), 224 tests passing, ~700ms wall time.
- Glob/partitioning probe at `plugins/zoto-eval-system/agents/evals/__subtask04-glob-probe.test.ts` confirmed co-located files are discovered AND filtered out of `static.yml`; no `llm.yml` or empty `logs/` directory is created when LLM tests don't call `reportCase`. Probe deleted after verification.
- `tsconfig.json` referenced by DoD02 does not exist at the repo root. Equivalent type-check via a temporary config produced only the pre-existing `evals/llm/_shared/sandbox-helpers.ts` → `CaseFixtures` diagnostic, verified to be present in HEAD by stashing my changes.
- Deliverable D08 text ("only execute smoke") contradicts DoD01/DoD03 (which expect the 4 legacy stamped pilots). Resolved per DoD intent: the include glob admits both `evals/smoke-*.test.ts` and `evals/test_*.test.ts`.
<!-- status:notes:end -->
