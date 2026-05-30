# Subtask 04 — Eval AskQuestion Strategy Bridge — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 04 |
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
- [x] **D01** — `plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json` carries two new optional top-level fields: `requiresInteraction: boolean` and `interactionStyle: enum<"command-owned"|"subagent-escalated"|"none">`. Both are added with `additionalProperties: false` still in force; the `required` list is unchanged so old cached payloads still validate. (`plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json`)
- [x] **D02** — `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` gains an explicit "Interaction classification" section explaining the heuristic (commands typically own `AskQuestion`, agents/skills return `needs_user_input`, hooks are non-interactive per existing analyser guidance). Add at least one worked example per `interactionStyle` value. (`plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md`)
- [x] **D03** — `scripts/eval-analyse.ts` recognises the new fields in the parsed payload, propagates them into `_meta.primitive_analysis`, and exposes them through the in-memory `AnalyserPayload` shape consumed by the stamper. (`scripts/eval-analyse.ts`)
- [x] **D04** — `plugins/zoto-eval-system/engine/analyser-payload.ts` (or wherever the canonical TypeScript type lives — discovered while implementing) gains the two optional fields with JSDoc. (`plugins/zoto-eval-system/engine/analyser-payload.ts`)
- [x] **D05** — `analyser_version` is bumped exactly once (current value found in `scripts/eval-analyse.ts` constants); the new value is recorded in `audit/analyser-version-bump.md` with the prior value, the new value, and the trigger justification (this spec). (`specs/20260526-eval-askquestion-strategy-bridge/audit/analyser-version-bump.md`)
- [x] **D06** — Targeted tests for the schema change: at least one test that asserts the schema rejects a non-boolean `requiresInteraction`, accepts `null`-equivalent omission, and round-trips a real payload. (`scripts/__tests__/analyser-payload-schema.test.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json` — Optional requiresInteraction and interactionStyle top-level fields
- **modified** `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` — Interaction classification section with heuristic and worked examples
- **modified** `plugins/zoto-eval-system/engine/analyser-payload.ts` — InteractionStyle type and optional payload fields with JSDoc
- **modified** `scripts/eval-analyse.ts` — ANALYSER_VERSION bump, buildPrimitiveAnalysisMeta export, parity manifest
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/analyser-version-bump.md` — Records 2026.05.03-1 to 2026.05.26-1 bump justification
- **created** `scripts/__tests__/analyser-payload-schema.test.ts` — Targeted vitest schema acceptance/rejection and meta projection tests
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
analyser_version 2026.05.03-1 → 2026.05.26-1; vitest 3/3 passed; buildPrimitiveAnalysisMeta exported for stamper routing in subtask 06.
<!-- status:notes:end -->
