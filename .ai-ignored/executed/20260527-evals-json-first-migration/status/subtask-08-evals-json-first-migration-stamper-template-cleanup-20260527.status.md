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
| state | completed |
| started_at | 2026-05-29T09:21:12.482Z |
| last_heartbeat | 2026-05-29T09:21:13.903Z |
| completed_at | 2026-05-29T09:21:13.903Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Delete `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`.
- [x] **D02** — Delete any sibling files under `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/` that only existed to support the TS template (e.g. a per-target setup file if present). Audit the directory and confirm — do not delete shared assets (vitest.config.tmpl, setup.tmpl, etc.) without verifying nothing else consumes them.
- [x] **D03** — Update `scripts/eval-stamp.ts`:
- [x] **D04** — Update `plugins/zoto-eval-system/engine/update.ts`:
- [x] **D05** — Update the JSON templates (`templates/{command,agent,hook}-evals/evals.json.tmpl`) so each one:
- [x] **D06** — Update `scripts/eval-stamp.ts` baseline-only mode (`--baseline-only`) to write the new JSON baseline fixtures into `plugins/zoto-eval-system/templates/baseline-fixtures/` if the current fixtures still reference TS.
- [x] **D07** — Add focused tests:
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **deleted** `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` — Removed obsolete TS per-primitive LLM template
- **modified** `scripts/eval-stamp.ts` — JSON-first stampLlmTarget + buildStampedLlmCaseRow + renderLlmJsonTemplate
- **modified** `plugins/zoto-eval-system/engine/update.ts` — regenerateLlm surgical JSON merge + colocated_ts_eval_count check gate
- **modified** `plugins/zoto-eval-system/engine/runner.ts` — Added discoverCoLocatedEvalJson helper
- **modified** `plugins/zoto-eval-system/templates/command-evals/evals.json.tmpl` — Runner case _template_doc example
- **modified** `plugins/zoto-eval-system/templates/agent-evals/evals.json.tmpl` — Runner case _template_doc example
- **modified** `plugins/zoto-eval-system/templates/hook-evals/evals.json.tmpl` — Runner case _template_doc example
- **created** `scripts/__tests__/eval-stamp-json-first.test.ts` — Subtask 08 focused unit tests (9/9 pass)
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
