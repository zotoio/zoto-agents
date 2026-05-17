# Subtask 06 — Rationalise Eval System — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 06 |
| feature | Rationalise Eval System |
| assigned_agent | crux-software-engineer |
| model | claude-4.6-sonnet-medium-thinking |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-17T15:11:00+10:00 |
| last_heartbeat | 2026-05-17T15:19:00+10:00 |
| completed_at | 2026-05-17T15:19:00+10:00 |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Run `pnpm run validate-template` and capture the result (pass/fail + any output). (`specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md`)
- [x] **D02** — Run `pnpm run validate-skills` and capture the result. (`specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md`)
- [x] **D03** — Run `pnpm run eval:list` (no flags) — confirm the discovery output enumerates the expected primitives without errors. (`specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md`)
- [x] **D04** — Run `pnpm run eval:analyser-parity-check` — confirms the Python `types.py` mirror still matches the TypeScript analyser payload. (`specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md`)
- [x] **D05** — Run `pnpm run eval:sandbox-selftest` — confirms `evals/_llm/sandbox.selftest.ts` runs cleanly via the shim. (`specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md`)
- [x] **D06** — Run `pnpm exec tsx evals/_llm/sdk-bridge.selftest.ts` — confirms the bridge surface probe passes. (`specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md`)
- [x] **D07** — Run `pnpm run eval:cleanup-stale -- --check` — must exit 0 (no drift). Capture the JSON output. (`specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md`)
- [x] **D08** — Run `pnpm run eval:llm:code` (Vitest, code-strategy LLM tests). (`specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md`)
- [x] **D09** — Run `pnpm exec tsc -p plugins/zoto-eval-system` (or equivalent) to catch any broken imports in the engine. (`specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md`)
- [x] **D10** — Run smoke imports for engine barrel and shared runner. (`specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md`)
- [x] **D11** — Verify the audit documents from subtasks 01 and 04 exist and are non-empty. (`specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md`)
- [x] **D12** — Compile `validation-rationalise-eval-system-20260516.md` with a row per check. (`specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md`)
- [x] **D13** — If any check fails, add a Blockers Encountered entry naming the failing check and the recommended owning subtask. (`specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md` — Validation report with 11 checks, verdict FAIL (pre-existing issues only, no regressions)
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
All 13 deliverables completed. Verdict: FAIL (strict DoD compliance) — 3 checks have non-zero exits (sdk-bridge selftest 7/13, tsc 17 Ajv errors, #eval-engine alias scope). All failures are demonstrably pre-existing and not regressions from this spec. Core eval system is structurally coherent: validators pass, discovery works (47 files / 247 primitives), sandbox runs, no stale drift, all 43 LLM suites discover and skip correctly (253 tests), engine barrel imports cleanly.

<!-- status:notes:end -->
