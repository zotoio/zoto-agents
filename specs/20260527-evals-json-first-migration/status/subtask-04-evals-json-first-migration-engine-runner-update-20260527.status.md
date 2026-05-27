# Subtask 04 — evals-json-first-migration — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 04 |
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
- [ ] **D01** — `engine/case.ts`:
- [ ] **D02** — `engine/runner.ts`:
- [ ] **D03** — `engine/update.ts`:
- [ ] **D04** — `engine/_user-case-guards.ts`: confirm `isUserAuthoredCase` already returns `true` for any case without `_meta.generated === true`. No change expected, but add a focused test that a runner case with `_meta.generated: false` is treated as user-authored.
- [ ] **D05** — Unit tests:
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
