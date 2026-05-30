# Subtask 05 — Eval AskQuestion Strategy Bridge — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 05 |
| feature | Eval AskQuestion Strategy Bridge |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `evals/llm/_shared/askquestion-bridge.ts` — new module exporting the surface pinned by the ADR. At minimum: a "create agent with scripted answers" entry point, an "advance run with answer injection" helper, and a `CodeStrategyCaseDefinition`-compatible accessor that downstream cases use to declare their scripted answers. (`evals/llm/_shared/askquestion-bridge.ts`)
- [x] **D02** — `evals/llm/_shared/askquestion-bridge.test.ts` — vitest unit tests covering: (a) creating an agent with scripted answers; (b) advancing through a happy-path interaction sequence; (c) the fallback path when the SDK lacks native interception; (d) the error case when the runner exhausts scripted answers before the run finishes; (e) the round-trip with `runCase` from `run-code-strategy-suite.ts` — driven by stubbed agent/run mocks. (`evals/llm/_shared/askquestion-bridge.test.ts`)
- [x] **D03** — `evals/llm/_shared/code-strategy-case.ts` extended with an optional `interactions?: { questions: string[]; answers: string[] }` field (or whatever shape the ADR pins). The existing `follow_ups[]` shape stays — both fields can coexist for the migration window. Add JSDoc that explains the ordering precedence. (`evals/llm/_shared/code-strategy-case.ts`)
- [x] **D04** — Re-export entry in any `_shared/` package barrel (if one exists; create the barrel `evals/llm/_shared/index.ts` if not). (`evals/llm/_shared/index.ts`)
- [x] **D05** — Brief module README comment block at the top of `askquestion-bridge.ts` mirroring the discipline in `sdk-bridge.ts` (cite consumers, document the fallback, pin the SDK version this was last verified against). (`evals/llm/_shared/askquestion-bridge.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `evals/llm/_shared/askquestion-bridge.ts` — ADR-pinned askquestion bridge module with synthetic fallback
- **created** `evals/llm/_shared/askquestion-bridge.test.ts` — Vitest unit tests (10 cases) with stubbed agent/run mocks
- **modified** `evals/llm/_shared/code-strategy-case.ts` — CaseInteractions interface and interactions field with precedence JSDoc
- **created** `evals/llm/_shared/index.ts` — Barrel re-export for _shared helpers
- **created** `evals/llm/_shared/vitest.config.ts` — Local vitest config for _shared unit tests
- **created** `evals/llm/_shared/tsconfig.json` — Scoped tsc --noEmit for touched _shared files
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Implemented ADR-pinned synthetic fallback (SDK 1.0.12). Exported resolveInteractionPlanFromCase,
beginScriptedInteractionCase, runCaseWithScriptedAnswers, observeToolCallsFromRun,
formatSyntheticAnswer, ScriptedAnswersExhaustedError, ASKQUESTION_BRIDGE_SURFACE.
Tests: 10/10 pass via `pnpm exec vitest run evals/llm/_shared/askquestion-bridge.test.ts`.
tsc: `pnpm exec tsc --noEmit -p evals/llm/_shared/tsconfig.json` clean.
No edits to sdk-bridge.ts, run-code-strategy-suite.ts, or test_*.test.ts.

<!-- status:notes:end -->
