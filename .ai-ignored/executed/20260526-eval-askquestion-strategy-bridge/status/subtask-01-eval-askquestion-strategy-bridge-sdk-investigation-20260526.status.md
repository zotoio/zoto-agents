# Subtask 01 — Eval AskQuestion Strategy Bridge — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 01 |
| feature | Eval AskQuestion Strategy Bridge |
| assigned_agent | explore |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-26T00:00:00.000Z |
| last_heartbeat | 2026-05-25T15:12:12.473Z |
| completed_at | 2026-05-25T15:12:12.473Z |
| git_sha | e49961f |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-askquestion-adr.md` — short ADR with: (a) what `@cursor/sdk` 1.0.12 exposes (`Run`, `RunResult`, `agent.send`, `run.wait`, etc.); (b) whether the SDK surfaces tool-call interception, replay, or scripted answers; (c) the chosen helper architecture (concrete signatures); (d) a fallback path if the SDK has no native interception (script answers as ordinary follow-up prompts but tag them so the runner can mark `interaction_style: synthetic` in the report); (e) at least one concrete usage sketch. (`specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-askquestion-adr.md`)
- [x] **D02** — `specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-surface-snapshot.md` — verbatim transcript of the relevant `node_modules/@cursor/sdk/dist/esm/*.d.ts` entries, plus a list of any release-note-relevant SDK fields (e.g. `RunResult` extensions like `usage.totalTokens`). (`specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-surface-snapshot.md`)
- [x] **D03** — An exported-surface table for the new `evals/llm/_shared/askquestion-bridge.ts` module, copied verbatim into the ADR — function names, parameter shapes, return types, and the package barrel re-export plan. (`specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-askquestion-adr.md#exported-surface-evalsllm_sharedaskquestion-bridge.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-askquestion-adr.md` — ADR pinning askquestion-bridge exported surface and synthetic fallback strategy
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-surface-snapshot.md` — Verbatim @cursor/sdk@1.0.12 .d.ts excerpts and drift watchlist
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
SDK 1.0.12 exposes observe-only tool streaming (run.stream, SendOptions.onDelta) but no AskQuestion interception. ADR locks interaction_style synthetic, resolveInteractionPlanFromCase, runCaseWithScriptedAnswers, and interactions.answers > follow_ups[] precedence.
<!-- status:notes:end -->
