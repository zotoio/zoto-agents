# Subtask 03 — Eval Single Backend & Co-located Restructure — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 03 |
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
- [ ] **D01** — `scripts/eval-orchestrate.ts` — remove the read of `llm.strategy` (~lines 14–26, 155, 495, 622 per exploration); replace the conditional spawn of `eval:llm:${strategy}` with a single spawn of `eval:llm`; keep the `--llm-only` and `--full` flag handling
- [ ] **D02** — Root `package.json` — `"eval:llm:declarative": "tsx plugins/zoto-eval-system/engine/runner.ts --full"` line is REMOVED; `"eval:llm:code": "vitest run --config evals/llm/vitest.config.ts"` is RENAMED to `"eval:llm"`; the new `eval:llm` script invokes the unified vitest config (subtask 04 owns the config file)
- [ ] **D03** — `package.json` — `"eval"` and `"eval:full"` (the orchestrator entry points) continue to work; verify both invocations dispatch through the simplified orchestrator
- [ ] **D04** — `scripts/eval-orchestrate.ts` — drop any imports of `LlmStrategy` from `manifest-snapshot.ts` (subtask 01 will have already removed the export)
- [ ] **D05** — If `scripts/eval-orchestrate.ts` has any `--strategy=code|declarative` CLI flag, remove it; emit a one-line `console.warn` if invoked with such a flag (the warn is **only for the duration of this subtask + subtask 06**; subtask 10's CHANGELOG will document the removal)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
