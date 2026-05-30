# Subtask 08 — Eval AskQuestion Strategy Bridge — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 08 |
| feature | Eval AskQuestion Strategy Bridge |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` validation step rejects any loaded case where `case.interactions` (or the field name pinned by the ADR) is non-empty, with a clear error pointing at the analyser-classification mismatch. (`plugins/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl`)
- [x] **D02** — `plugins/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl` (the case-shape source for the declarative runner) updated to mark the `interactions` field as forbidden in declarative mode (a top-level type or runtime guard, depending on what makes the rejection reliable). (`plugins/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl`)
- [x] **D03** — Per-target rollup in the runner (the path that writes `evals/_runs/<ts>/llm.yml`) annotates each row with `backend: declarative` (constant — this runner only handles declarative cases) and `requires_interaction: false` (constant — anything else is rejected upstream). (`plugins/zoto-eval-system/templates/llm/agent-sdk/writer.ts.tmpl`)
- [x] **D04** — Targeted unit tests for the new validation: a fixture case that declares `interactions` MUST cause `validateEnriched` (or the equivalent check) to throw with a specific error message that names the offending case id. (`plugins/zoto-eval-system/tests/declarative-validate-enriched-interactions.test.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl` — DeclarativeForbiddenInteractions type, caseDeclaresInteractions, validateEnriched rejection
- **modified** `plugins/zoto-eval-system/templates/llm/agent-sdk/writer.ts.tmpl` — per-row backend declarative and requires_interaction false
- **modified** `plugins/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` — rejection stderr mentions scripted interactions
- **modified** `plugins/zoto-eval-system/engine/case.ts` — engine mirror for
- **modified** `plugins/zoto-eval-system/engine/writer.ts` — engine mirror for per-row annotations
- **created** `plugins/zoto-eval-system/tests/declarative-validate-enriched-interactions.test.ts` — 3 vitest cases — accept, validateEnriched reject, assertNoDeclarativeInteractions throw
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Targeted vitest: 3/3 passed (declarative-validate-enriched-interactions.test.ts).
tsc --noEmit clean on engine/case.ts, engine/writer.ts, and the new test file.
No edits to code-strategy templates or live plugins/*/evals/**/*.json files.

<!-- status:notes:end -->
