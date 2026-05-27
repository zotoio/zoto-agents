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
| state | pending |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [ ] **D01** — Create `plugins/zoto-eval-system/templates/schema/case.schema.json` — full JSON Schema for a non-skill case with `oneOf: [DeclarativeCase, RunnerCase]`. Required fields: `DeclarativeCase` = `id` + `prompt` + `assertions`; `RunnerCase` = `id` + `runner` + `parameters`. Reuse existing `_meta` definition from `case-meta.schema.json` via `$ref`.
- [ ] **D02** — Create `plugins/zoto-eval-system/templates/schema/runner-params.schema.json` — JSON Schema for the `parameters` payload contract (open shape: `targetId`, `caseId`, and a free-form `parameters` object).
- [ ] **D03** — Add a top-level eval-file schema `plugins/zoto-eval-system/templates/schema/eval-file.schema.json` — describes the wrapper `{ target_id, cases: [...case.schema.json], _meta? }` and `$ref`s the per-case schema. This is the JSON Schema for a non-skill `evals/<name>.json` file. Skill files (`evals.json` with `skill_name`) stay outside this schema.
- [ ] **D04** — Create `evals/llm/_shared/runner-params.ts` exporting:
- [ ] **D05** — Extend `LlmCaseDefinition` in `evals/llm/_shared/llm-case.ts`: add optional `runner?: string` (relative path to a `.test.ts` file from the JSON file's directory) and `parameters?: Record<string, unknown>`. Update the JSDoc to explain that a case with `runner` is a *runner case* and MUST NOT carry `assertions`, `graders`, `fixtures`, `expected_filesystem`, or `expected_output`.
- [ ] **D06** — Extend `EvalCase` in `plugins/zoto-eval-system/engine/case.ts`: add the same optional `runner?: string` and `parameters?: Record<string, unknown>` fields. Update `validateEnriched` to:
- [ ] **D07** — Add unit tests for `validateEnriched`'s new branches (next to the existing engine tests or under `plugins/zoto-eval-system/tests/`). Cover: valid runner case, valid declarative case, hybrid case rejection, runner with wrong extension rejection.
- [ ] **D08** — Compile the schemas with Ajv inside the existing schema test (`plugins/zoto-eval-system/tests/plugin.test.ts` or wherever schemas are currently compiled in CI) to confirm they are well-formed.
- [ ] **D09** — Update the `_meta.generated` contract documentation in `case-meta.schema.json` if needed so runner cases can carry the marker the same way declarative cases do (no behavioural change — `_meta.generated` remains the user-vs-generated discriminator).
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
