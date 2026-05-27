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
| state | pending |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [ ] **D01** — Update `plugins/zoto-eval-system/templates/schema/manifest.schema.json`:
- [ ] **D02** — Update `plugins/zoto-eval-system/tests/plugin.test.ts` (or the schema compile test): add an Ajv compile test that:
- [ ] **D03** — Update any TypeScript types for the manifest snapshot (`engine/manifest-snapshot.ts`) so the documented contract matches the new constraint. If the type currently allows any string, narrow the JSDoc to reference the schema and note `.json` requirement. No runtime change beyond the JSDoc.
- [ ] **D04** — Update `templates/manifest.yml.tmpl` (if it exists; check `plugins/zoto-eval-system/templates/` and `baseline-fixtures/`) so the bootstrap manifest emits `.json` eval files for examples.
- [ ] **D05** — Update `scripts/validate-template.mjs` or add a new lightweight validator step that warns when a co-located `<kind>/evals/<name>.test.ts` LLM eval file exists alongside a manifest entry pointing to `.json` — this is a transitional check to surface drift during the migration window (subtask 10 will tighten it to an error).
- [ ] **D06** — Update `evals/fixtures/baseline/.zoto/eval-system/config.yml` and any other baseline fixtures only if they currently contain references to `.test.ts` LLM eval files; otherwise leave them alone.
- [ ] **D07** — Add a JSDoc / Markdown note (top of schema file or `plugins/zoto-eval-system/docs/manifest.md` if present) explaining: scenarios under `evals/scenarios/<name>.test.ts` are **intentionally not tracked in the manifest** and the schema does not need to allow them.
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
