# Subtask 07 — Eval AskQuestion Strategy Bridge — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 07 |
| feature | Eval AskQuestion Strategy Bridge |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at |  |
| last_heartbeat | 2026-05-25T15:28:50Z |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` imports the new `askquestion-bridge` re-export (path matches the per-repo copy under `evals/llm/_shared/`); preserves the leading `// _meta.generated: true` line; preserves the existing `defineLlmCodeEval` call shape (additive only). (`plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`)
- [x] **D02** — `evals/llm/_shared/run-code-strategy-suite.ts` `runCase` flow is updated so that when a case carries `interactions` (or whatever shape the ADR pins), the bridge is used instead of the bare follow-up loop. Cases without `interactions` keep the existing follow-up behaviour byte-for-byte. (`evals/llm/_shared/run-code-strategy-suite.ts`)
- [x] **D03** — Per-case `interactions` data flows into the per-case report under a new `interactions` field next to `expected_output`; the reporter (`_shared/zoto-llm-reporter.ts`) MAY tag the row `interaction_style: scripted | synthetic | none` so the comparer can flatten it. (`evals/llm/_shared/zoto-llm-reporter.ts`)
- [x] **D04** — Targeted unit tests covering the new branch in `runCase` (vitest scoped to `_shared/`). (`evals/llm/_shared/run-code-strategy-suite.test.ts`)
- [x] **D05** — Compile-time guard rule documented at the top of `run-code-strategy-suite.ts`: cases declaring `interactions` MUST have `_meta.primitive_analysis.requiresInteraction === true` (or be unstamped, like manually written test fixtures). Mismatches throw at suite-load time. (`evals/llm/_shared/run-code-strategy-suite.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` — Added {{ASKQUESTION_BRIDGE_IMPORT}} placeholder after FRAMEWORK_IMPORTS
- **modified** `evals/llm/_shared/run-code-strategy-suite.ts` — Bridge branch, suite-load guard, resolveReportInteractionStyle, reporter fields
- **modified** `evals/llm/_shared/zoto-llm-reporter.ts` — interactions + interaction_style in ReportedCase, logs, llm.yml
- **modified** `evals/llm/_shared/code-strategy-case.ts` — Optional _meta.primitive_analysis.requiresInteraction on case type
- **modified** `evals/llm/_shared/run-code-strategy-suite.test.ts` — 8 tests — guard, style mapping, scripted + legacy runCase paths
- **modified** `scripts/eval-stamp.ts` — renderLlmCodePerPrimitiveTest replaces {{ASKQUESTION_BRIDGE_IMPORT}} when requiresInteraction is true
- **modified** `scripts/__tests__/eval-stamp-routing.test.ts` — Asserts askquestion-bridge import in code-strategy stamp output
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Vitest: `pnpm exec vitest run evals/llm/_shared/run-code-strategy-suite.test.ts --config evals/llm/_shared/vitest.config.ts` — 8/8 passed.
tsc: `pnpm exec tsc --noEmit -p evals/llm/_shared/tsconfig.json` — clean (run-code-strategy-suite.ts not in tsconfig include; pulls pre-existing sandbox-helpers CaseFixtures re-export gap).
Fix round: renderLlmCodePerPrimitiveTest now substitutes {{ASKQUESTION_BRIDGE_IMPORT}} with the askquestion-bridge import when requiresInteraction is true, empty string otherwise. eval-stamp-routing.test.ts 9/9 passed.

<!-- status:notes:end -->
