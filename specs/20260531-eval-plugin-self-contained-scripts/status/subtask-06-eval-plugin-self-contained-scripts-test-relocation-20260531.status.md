# Subtask 06 — Eval Plugin Self-Contained Scripts Consolidation — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 06 |
| feature | Eval Plugin Self-Contained Scripts Consolidation |
| assigned_agent | zoto-eval-engineer |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-31T22:43:56Z |
| last_heartbeat | 2026-06-01T09:10:00Z |
| completed_at | 2026-06-01T09:10:00Z |
| git_sha | fbfecad15cca5de07f40ec150555f1b8d2fff64c |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Relocate from `scripts/__tests__/` to `plugins/zoto-eval-system/tests/` (9 suites present)
- [x] **D02** — Leave at repo root: tests for monorepo-only scripts (`eval-relocate-migration.test.ts` remains)
- [x] **D03** — Update all import paths in relocated tests to plugin script locations (`../scripts/`, `../engine/`)
- [x] **D04** — `validate-plugin.ts` greps `engine/update.ts` for `_meta?.generated === true` (line 387)
- [x] **D05** — `plugin.test.ts` imports `engine/update.js` (not deleted `eval-update.ts`); `eval-ensure-host` path assertion is plugin-local
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **test-run** — `vitest run` of 9 relocated suites: **Test Files 9 passed (9), Tests 32 passed (32)**
- **validate** — `pnpm --filter @zoto-agents/zoto-eval-system run validate`: **167/167 passed, exit 0**
- **fix** — `engine/package.json`: added `"type": "module"` (nested package.json forced CommonJS, collapsing engine named exports to `default` under raw tsx — broke spawn-based selftests and the real CLI scripts)
- **fix** — `tests/eval-cleanup-stale.selftest.ts`: added missing `fileURLToPath` import
- **fix** — `tests/eval-update-guards.selftest.ts`: realigned 3 stale `.test.ts` expectations to JSON-first co-located eval contract (now 12/12)
- **fix** — `vitest.config.ts`: explicit include of the 3 wrapper-less vitest suites (avoids globbing the process.exit tsx-runner selftests)
- **fix (re-spawn, judge blocker 1)** — `tests/eval-stamp-json-first.test.ts`: added explicit `60_000ms` per-test timeouts to the 4 fs/dynamic-import-heavy `it()` blocks. From repo root there is no root `vitest.config`, so vitest's 5000ms default applied and the suite flaked under load. Now **9/9 from repo root**.
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Relocation deliverables were largely in place from prior subtasks; this subtask
**verified** them and **fixed** the gaps that blocked the DoD "relocated tests pass":

1. `engine/package.json` missing `type: module` (root-cause blocker for all engine
   named imports under raw tsx, including the real `engine/update.ts` CLI).
2. `eval-cleanup-stale.selftest.ts` missing `fileURLToPath` import.
3. `eval-update-guards.selftest.ts` — 3 stale `.test.ts` assertions realigned to the
   JSON-first contract (`resolveLlmTargetPath` emits `<kind-dir>/evals/<name>.json`).
4. `vitest.config.ts` include corrected.

**Grep gate**: functional imports in `evals/_llm/` already retarget the plugin
scripts; remaining `scripts/eval-` hits are cosmetic doc comments in GENERATED test
files + their source templates (subtask 07 owns) and one `types.py` comment. No
broken imports at deleted root `scripts/eval-*.ts`.

**Concurrency**: a concurrent process was rewriting plugin templates/config during the
session; initial transient pytest/jest/vitest-backend runner failures were mid-edit
template state. All runners pass standalone once stable, and the final 9-suite run is
green. Full `pnpm test` deferred to subtask 08 per instructions.

**Re-spawn — judge fix_list (2026-06-01):**
1. _blocker 1 (fixed)_ — `eval-stamp-json-first.test.ts` flaked at vitest's 5000ms
   default when run from repo root (no root `vitest.config`). Added per-test
   `60_000ms` timeouts to the 4 heavy `it()` blocks → **9/9 from repo root**.
2. _blocker 2 (already passing)_ — backend selftests. The jest runner already copies
   templates via `seedEvalHost`; `eval-stamp-jest.runner.ts` standalone → **4/4**, and
   all 3 selftests pass via the plugin vitest config → **3/3**. No code change needed.
3. _should_fix (fixed)_ — grep gate: `rg 'scripts/eval-' evals/test_*.ts evals/_llm/`
   → **0 hits**. `types.py` docstring cites the `eval:analyse` CLI; the tooling test
   prompt/header cite `plugins/zoto-eval-system/engine/update.ts`.

Re-verified: validate **167/167**, json-first **9/9** from repo root.
<!-- status:notes:end -->
