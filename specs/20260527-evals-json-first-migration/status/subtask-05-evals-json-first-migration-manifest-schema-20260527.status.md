# Subtask 05 — evals-json-first-migration — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 05 |
| feature | evals-json-first-migration |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-29T19:10:00.000Z |
| last_heartbeat | 2026-05-29T19:14:00.000Z |
| completed_at | 2026-05-29T19:14:00.000Z |
| git_sha | 1fa87d469166c5a78ba836ca4bebb8667fcdc6fb |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Update `plugins/zoto-eval-system/templates/schema/manifest.schema.json`: (`plugins/zoto-eval-system/templates/schema/manifest.schema.json`)
- [x] **D02** — Update `plugins/zoto-eval-system/tests/plugin.test.ts` (or the schema compile test): add an Ajv compile test that: (`plugins/zoto-eval-system/tests/plugin.test.ts`)
- [x] **D03** — Update any TypeScript types for the manifest snapshot (`engine/manifest-snapshot.ts`) so the documented contract matches the new constraint. If the type currently allows any string, narrow the JSDoc to reference the schema and note `.json` requirement. No runtime change beyond the JSDoc. (`plugins/zoto-eval-system/engine/manifest-snapshot.ts`)
- [x] **D04** — Update `templates/manifest.yml.tmpl` (if it exists; check `plugins/zoto-eval-system/templates/` and `baseline-fixtures/`) so the bootstrap manifest emits `.json` eval files for examples. (`plugins/zoto-eval-system/templates/llm/agent-sdk/update.ts.tmpl`)
- [x] **D05** — Update `scripts/validate-template.mjs` or add a new lightweight validator step that warns when a co-located `<kind>/evals/<name>.test.ts` LLM eval file exists alongside a manifest entry pointing to `.json` — this is a transitional check to surface drift during the migration window (subtask 10 will tighten it to an error). (`scripts/validate-template.mjs`)
- [x] **D06** — Update `evals/fixtures/baseline/.zoto/eval-system/config.yml` and any other baseline fixtures only if they currently contain references to `.test.ts` LLM eval files; otherwise leave them alone.
- [x] **D07** — Add a JSDoc / Markdown note (top of schema file or `plugins/zoto-eval-system/docs/manifest.md` if present) explaining: scenarios under `evals/scenarios/<name>.test.ts` are **intentionally not tracked in the manifest** and the schema does not need to allow them. (`plugins/zoto-eval-system/templates/schema/manifest.schema.json`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/templates/schema/manifest.schema.json` — kind-conditioned eval_files patterns (.json non-skill, evals.json skill) + scenario exclusion description
- **modified** `plugins/zoto-eval-system/tests/plugin.test.ts` — four fixture-manifest Ajv tests for eval_files constraints
- **modified** `plugins/zoto-eval-system/engine/manifest-snapshot.ts` — JSDoc documents JSON-first eval_files contract
- **modified** `scripts/validate-template.mjs` — warnJsonFirstMigrationDrift transitional warning (warn-only)
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
D04: no `manifest.yml.tmpl` exists; `templates/llm/agent-sdk/update.ts.tmpl` already emits skill `evals/evals.json` only. D06: baseline fixtures contain comment prose about `.test.ts` harness paths but no manifest `eval_files` references — left unchanged per spec. Verified `engine/update.ts` discovery uses `.json` co-located paths and `findCoLocatedTsEvals`/`loadAndValidateEvalFile` helpers from ST04; no runtime changes required in this subtask. Production `.zoto/eval-system/manifest.yml` not rewritten here (ST07).

<!-- status:notes:end -->
