# Subtask 03 — evals-json-first-migration — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 03 |
| feature | evals-json-first-migration |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | pending |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [ ] **D01** — Update `evals/llm/_shared/run-llm-suite.ts` to detect runner cases inside the loop that emits `it()` blocks. Detection rule: `typeof caseDef.runner === "string" && caseDef.runner.length > 0`.
- [ ] **D02** — For runner cases, the synthesised `it()` body:
- [ ] **D03** — Add type guards / runtime assertion helpers in `evals/llm/_shared/run-llm-suite.ts`:
- [ ] **D04** — Update the suite-load validator (`validateCasesAtSuiteLoad` or equivalent) to run `assertNoHybridCase` per case and to confirm the `__sourcePath` option is present whenever any case is a runner case (otherwise we cannot resolve the relative path safely).
- [ ] **D05** — Document the `__sourcePath` option in the `defineLlmEval` JSDoc. Mark it as **set by the JSON loader; tests authored by hand may set it to `import.meta.url`**.
- [ ] **D06** — Add focused harness tests under `evals/llm/_shared/run-llm-suite.test.ts`:
- [ ] **D07** — Provide a minimal fixture runner `evals/llm/_shared/__fixtures__/sample-runner.test.ts` that exports a default function returning `{ passed: true, reason: "ok" }`. This is consumed by the harness tests only.
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
