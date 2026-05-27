# Subtask 10 — evals-json-first-migration — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 10 |
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
- [ ] **D01** — Run every relevant validator locally and capture results in the Work Log:
- [ ] **D02** — Tighten `scripts/validate-template.mjs`:
- [ ] **D03** — Add a new CI workflow (or extend an existing one) under `.github/workflows/`:
- [ ] **D04** — Update `.github/workflows/eval-update-check.yml` to additionally assert:
- [ ] **D05** — Update `plugins/zoto-eval-system/tests/plugin.test.ts` (or add a new test file) with assertions that run as part of `pnpm test`:
- [ ] **D06** — Clean up dead code referenced by earlier subtasks:
- [ ] **D07** — Update the spec status file:
- [ ] **D08** — Final smoke test of `/z-eval-create` end-to-end:
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
