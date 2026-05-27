# Subtask 08 — evals-json-first-migration — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 08 |
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
- [ ] **D01** — Delete `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`.
- [ ] **D02** — Delete any sibling files under `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/` that only existed to support the TS template (e.g. a per-target setup file if present). Audit the directory and confirm — do not delete shared assets (vitest.config.tmpl, setup.tmpl, etc.) without verifying nothing else consumes them.
- [ ] **D03** — Update `scripts/eval-stamp.ts`:
- [ ] **D04** — Update `plugins/zoto-eval-system/engine/update.ts`:
- [ ] **D05** — Update the JSON templates (`templates/{command,agent,hook}-evals/evals.json.tmpl`) so each one:
- [ ] **D06** — Update `scripts/eval-stamp.ts` baseline-only mode (`--baseline-only`) to write the new JSON baseline fixtures into `plugins/zoto-eval-system/templates/baseline-fixtures/` if the current fixtures still reference TS.
- [ ] **D07** — Add focused tests:
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
