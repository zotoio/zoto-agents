# Subtask 02 — Eval Single Backend & Co-located Restructure — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 02 |
| feature | Eval Single Backend & Co-located Restructure |
| assigned_agent | zoto-eval-engineer |
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
- [ ] **D01** — `plugins/zoto-eval-system/templates/schema/cleanup-plan.schema.json` — remove `"strategy-switch"` from the `reason` enum (line ~112 per exploration); remove the strategy `from` / `to` fields (lines ~115–123); remove `llm.strategy` / `llm.codeFramework` from any snapshot definition (lines ~84–96); retain `"framework-switch"` reason and the `static.framework` snapshot fields
- [ ] **D02** — `scripts/eval-cleanup-stale.ts` — remove `enumerateLlmStrategyAssets` function (~lines 601–672) and its callers; remove strategy-switch branches in `enumerateAssets` / `enumerateGenerated` / `buildPlan` (the `reason: "strategy-switch"` arms ~lines 107–112, 283, 325–384, 608–638, 948–960); retain `framework-switch` arms
- [ ] **D03** — `scripts/__tests__/eval-cleanup-stale.test.ts` — remove `strategy-switch` test cases; ADD a regression test asserting that running cleanup with NO `llm.strategy` in the snapshot does not throw and emits an empty `groups[]` (or framework-switch-only groups)
- [ ] **D04** — Any cleanup-related fixture under `evals/fixtures/**/cleanup-*.json` — verify it still matches the post-cleanup schema; update if needed
- [ ] **D05** — Updated cleanup README (if one exists under `plugins/zoto-eval-system/docs/`) — flagged for subtask 10 if doc edits are out of scope
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
