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
| state | completed |
| started_at | 2026-05-29T19:10:00.000Z |
| last_heartbeat | 2026-05-29T19:12:00.000Z |
| completed_at | 2026-05-29T19:12:00.000Z |
| git_sha | 1fa87d469166c5a78ba836ca4bebb8667fcdc6fb |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Update `evals/llm/_shared/run-llm-suite.ts` to detect runner cases inside the loop that emits `it()` blocks. Detection rule: `typeof caseDef.runner === "string" && caseDef.runner.length > 0`. (`evals/llm/_shared/run-llm-suite.ts`)
- [x] **D02** — For runner cases, the synthesised `it()` body: (`evals/llm/_shared/run-llm-suite.ts`)
- [x] **D03** — Add type guards / runtime assertion helpers in `evals/llm/_shared/run-llm-suite.ts`: (`evals/llm/_shared/run-llm-suite.ts`)
- [x] **D04** — Update the suite-load validator (`validateCasesAtSuiteLoad` or equivalent) to run `assertNoHybridCase` per case and to confirm the `__sourcePath` option is present whenever any case is a runner case (otherwise we cannot resolve the relative path safely). (`evals/llm/_shared/run-llm-suite.ts`)
- [x] **D05** — Document the `__sourcePath` option in the `defineLlmEval` JSDoc. Mark it as **set by the JSON loader; tests authored by hand may set it to `import.meta.url`**. (`evals/llm/_shared/run-llm-suite.ts`)
- [x] **D06** — Add focused harness tests under `evals/llm/_shared/run-llm-suite.test.ts`: (`evals/llm/_shared/run-llm-suite.test.ts`)
- [x] **D07** — Provide a minimal fixture runner `evals/llm/_shared/__fixtures__/sample-runner.test.ts` that exports a default function returning `{ passed: true, reason: "ok" }`. This is consumed by the harness tests only. (`evals/llm/_shared/__fixtures__/sample-runner.test.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `evals/llm/_shared/run-llm-suite.ts` — isRunnerCase, assertNoHybridCase, runRunnerCase, defineLlmEval runner branch
- **modified** `evals/llm/_shared/run-llm-suite.test.ts` — runner dispatch, hybrid rejection, missing default export, __sourcePath tests
- **created** `evals/llm/_shared/__fixtures__/sample-runner.test.ts` — minimal happy-path runner fixture
- **created** `evals/llm/_shared/__fixtures__/no-default-export.test.ts` — missing default export failure fixture
- **modified** `evals/llm/_shared/vitest.config.ts` — exclude __fixtures__ from test discovery
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Implemented runner dispatch in defineLlmEval: runner cases dynamic-import the referenced .test.ts via new URL(runner, __sourcePath), build RunnerParams with full RunnerContext, report via reportCase, and surface pass/fail through expect().toBe(). Runner cases skip the CURSOR_API_KEY gate. Targeted tests: run-llm-suite.test.ts 14/14 pass.
<!-- status:notes:end -->
