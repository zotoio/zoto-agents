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
| state | completed |
| started_at |  |
| last_heartbeat | 2026-05-29T09:11:29.182Z |
| completed_at | 2026-05-29T09:11:29.182Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `engine/case.ts`:
- [x] **D02** — `engine/runner.ts`:
- [x] **D03** — `engine/update.ts`: (`plugins/zoto-eval-system/engine/update.ts`)
- [x] **D04** — `engine/_user-case-guards.ts`: confirm `isUserAuthoredCase` already returns `true` for any case without `_meta.generated === true`. No change expected, but add a focused test that a runner case with `_meta.generated: false` is treated as user-authored.
- [x] **D05** — Unit tests:
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/engine/runner.ts` — partition runner cases; --list/--full deferral helpers
- **modified** `plugins/zoto-eval-system/engine/update.ts` — findCoLocatedTsEvals, loadAndValidateEvalFile, runner-case surgical merge
- **created** `plugins/zoto-eval-system/tests/engine-runner-update-spec04.test.ts` — subtask 04 engine unit tests
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
