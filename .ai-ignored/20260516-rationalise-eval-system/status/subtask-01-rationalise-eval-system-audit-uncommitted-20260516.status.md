# Subtask 01 — Rationalise Eval System — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 01 |
| feature | Rationalise Eval System |
| assigned_agent | crux-platform-architect |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-16T12:29:00Z |
| last_heartbeat | 2026-05-16T12:41:00Z |
| completed_at | 2026-05-16T12:35:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Inventory the deleted set in `evals/_llm/` (declarative engine modules + graders) and confirm each has a counterpart at `plugins/zoto-eval-system/engine/` with equivalent exports. (`specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md#F-01`)
- [x] **D02** — Inventory the deleted set in `evals/llm/_shared/` (old shared files) and confirm each is replaced by the new helpers (`code-strategy-case.ts`, `run-code-strategy-suite.ts`, `sandbox-helpers.ts`, `setup.ts`, `zoto-llm-reporter.ts`). (`specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md#F-02`)
- [x] **D03** — Verify `evals/_llm/case.ts` and `evals/_llm/_user-case-guards.ts` are thin re-export shims pointing at the engine. (`specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md#F-03`)
- [x] **D04** — Confirm whether `evals/_llm/sandbox.ts` is a shim or a duplicate full implementation. If duplicate, flag for subtask 02. (`specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md#F-04`)
- [x] **D05** — Grep all template files (`plugins/zoto-eval-system/templates/llm/**`, `templates/static/**`) for imports of `../../_llm/*` and list each occurrence with the recommended replacement (`#eval-engine/*` alias or shim). (`specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md#F-05 #F-06`)
- [x] **D06** — Grep all `evals/llm/test_*.test.ts` files for any remaining `interface CaseDefinition` inline declarations or imports from `../../_llm/*` outside of allowed shims. (`specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md#F-07`)
- [x] **D07** — Grep `scripts/eval-*.ts` and `evals/setup.ts` for imports/comments referencing moved engine paths (`evals/_llm/runner.ts`, `evals/_llm/manifest-snapshot.ts`, `evals/_llm/sdk-bridge.ts`, etc.). List each with a recommended fix. (`specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md#F-10`)
- [x] **D08** — List all untracked artefacts: `evals/_runs/*` (count, size estimate), `.zoto/eval-system/cache/analyser/*` (count). Confirm the `.gitignore` does **not** currently cover them. (`specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md#F-14`)
- [x] **D09** — Inspect `.github/workflows/eval-cleanup-stale-check.yml` for correctness (script invocation, exit-code handling, concurrency). (`specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md#F-15`)
- [x] **D10** — Spot-check 3 modified test files (`evals/llm/test_command_*.test.ts`) to confirm they use the shared harness pattern and contain no orphan imports. (`specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md#F-16`)
- [x] **D11** — Inspect `.zoto/eval-system/config.yml`, `manifest.yml`, `manifest.history.yml` modifications and confirm the changes align with the documented schema (no broken keys). (`specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md#F-17`)
- [x] **D12** — Verify `package.json` script mapping is internally consistent: `eval:llm:code` uses Vitest on `evals/llm/`, `eval:llm:declarative` uses the engine path, `eval:update` and `eval:compare` point at engine modules. (`specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md#F-18`)
- [x] **D13** — Write `audit-rationalise-eval-system-20260516.md` in the spec directory with the structure below. (`specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md`)
- [x] **D14** — Open one or more **Blockers** in the audit if anything cannot proceed without re-planning (e.g. an engine module is missing or a shim is broken). (`specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md#Blockers`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `specs/20260516-rationalise-eval-system/audit-rationalise-eval-system-20260516.md` — Full audit document with 27 findings
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Audit complete. 169 tracked files + ~227 untracked artefacts reviewed. 17 coherent, 8 cleanup, 2 defect, 0 blocker. Phase 2 can proceed.
<!-- status:notes:end -->
