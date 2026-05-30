# Subtask 01 — evals-json-first-migration — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 01 |
| feature | evals-json-first-migration |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-29T19:07:00.000Z |
| last_heartbeat | 2026-05-29T19:09:00.000Z |
| completed_at | 2026-05-29T19:09:00.000Z |
| git_sha | 1fa87d469166c5a78ba836ca4bebb8667fcdc6fb |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Create `plugins/zoto-eval-system/templates/schema/case.schema.json` — full JSON Schema for a non-skill case with `oneOf: [DeclarativeCase, RunnerCase]`. Required fields: `DeclarativeCase` = `id` + `prompt` + `assertions`; `RunnerCase` = `id` + `runner` + `parameters`. Reuse existing `_meta` definition from `case-meta.schema.json` via `$ref`. (`plugins/zoto-eval-system/templates/schema/case.schema.json`)
- [x] **D02** — Create `plugins/zoto-eval-system/templates/schema/runner-params.schema.json` — JSON Schema for the `parameters` payload contract (open shape: `targetId`, `caseId`, and a free-form `parameters` object). (`plugins/zoto-eval-system/templates/schema/runner-params.schema.json`)
- [x] **D03** — Add a top-level eval-file schema `plugins/zoto-eval-system/templates/schema/eval-file.schema.json` — describes the wrapper `{ target_id, cases: [...case.schema.json], _meta? }` and `$ref`s the per-case schema. This is the JSON Schema for a non-skill `evals/<name>.json` file. Skill files (`evals.json` with `skill_name`) stay outside this schema. (`plugins/zoto-eval-system/templates/schema/eval-file.schema.json`)
- [x] **D04** — Create `evals/llm/_shared/runner-params.ts` exporting: (`evals/llm/_shared/runner-params.ts`)
- [x] **D05** — Extend `LlmCaseDefinition` in `evals/llm/_shared/llm-case.ts`: add optional `runner?: string` (relative path to a `.test.ts` file from the JSON file's directory) and `parameters?: Record<string, unknown>`. Update the JSDoc to explain that a case with `runner` is a *runner case* and MUST NOT carry `assertions`, `graders`, `fixtures`, `expected_filesystem`, or `expected_output`. (`evals/llm/_shared/llm-case.ts`)
- [x] **D06** — Extend `EvalCase` in `plugins/zoto-eval-system/engine/case.ts`: add the same optional `runner?: string` and `parameters?: Record<string, unknown>` fields. Update `validateEnriched` to: (`plugins/zoto-eval-system/engine/case.ts`)
- [x] **D07** — Add unit tests for `validateEnriched`'s new branches (next to the existing engine tests or under `plugins/zoto-eval-system/tests/`). Cover: valid runner case, valid declarative case, hybrid case rejection, runner with wrong extension rejection. (`plugins/zoto-eval-system/tests/validate-enriched-runner.test.ts`)
- [x] **D08** — Compile the schemas with Ajv inside the existing schema test (`plugins/zoto-eval-system/tests/plugin.test.ts` or wherever schemas are currently compiled in CI) to confirm they are well-formed. (`plugins/zoto-eval-system/tests/plugin.test.ts`)
- [x] **D09** — Update the `_meta.generated` contract documentation in `case-meta.schema.json` if needed so runner cases can carry the marker the same way declarative cases do (no behavioural change — `_meta.generated` remains the user-vs-generated discriminator). (`plugins/zoto-eval-system/templates/schema/case-meta.schema.json`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-eval-system/templates/schema/case.schema.json` — oneOf DeclarativeCase | RunnerCase with case-meta $ref
- **created** `plugins/zoto-eval-system/templates/schema/runner-params.schema.json` — RunnerParams JSON Schema mirror
- **created** `plugins/zoto-eval-system/templates/schema/eval-file.schema.json` — top-level non-skill eval JSON wrapper schema
- **created** `evals/llm/_shared/runner-params.ts` — RunnerParams, RunnerContext, SdkBridge, RunnerResult, RunnerFn
- **modified** `evals/llm/_shared/llm-case.ts` — optional runner/parameters + runner-case JSDoc
- **modified** `evals/llm/_shared/run-llm-suite.ts` — DefineLlmEvalOptions alias + __sourcePath contract
- **modified** `evals/llm/_shared/index.ts` — re-export runner-params
- **modified** `plugins/zoto-eval-system/engine/case.ts` — isRunnerCase + validateEnriched runner/hybrid branches
- **created** `plugins/zoto-eval-system/tests/validate-enriched-runner.test.ts` — 22 targeted validateEnriched branch tests
- **modified** `plugins/zoto-eval-system/templates/schema/case-meta.schema.json` — runner-case _meta.generated documentation
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Verified prior-session schema/test artifacts on disk; fixed gaps in case.ts (isRunnerCase, validateEnriched runner branch), llm-case.ts (runner/parameters), run-llm-suite.ts (__sourcePath), index.ts re-export, and case-meta.schema.json description. Targeted tests: validate-enriched-runner (19 pass) + declarative-validate-enriched-interactions (3 pass); plugin.test.ts Schemas & config contract (5 pass, all new schemas Ajv-compile).
<!-- status:notes:end -->
