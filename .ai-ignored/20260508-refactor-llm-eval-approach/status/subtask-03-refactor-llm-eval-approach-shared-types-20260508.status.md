# Subtask 03 — Refactor LLM eval approach — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 03 |
| feature | Refactor LLM eval approach |
| assigned_agent | crux-software-engineer |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-08T20:16:00+10:00 |
| last_heartbeat | 2026-05-08T10:27:18.785Z |
| completed_at | 2026-05-08T20:24:00+10:00 |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — New or extended module(s), e.g. `evals/llm/_shared/code-strategy-case.ts` (name adjustable) exporting the case type used by Vitest tests **and** re-using or narrowing `DeclarativeGraderConfig` where possible (`evals/llm/_shared/code-strategy-case.ts`)
- [x] **D02** — If needed, thin **re-export** from `evals/_llm/case.ts` or a shared `evals/_llm/shared-types.ts` to avoid circular imports—document the graph in a comment (`evals/llm/_shared/sdk-bridge.ts`)
- [x] **D03** — Update **one** representative `evals/llm/test_*.test.ts` to consume the shared type (proof of concept) OR defer bulk migration to subtask 06 if subtask 04 needs the harness first—coordinate so no double mass-edit (`evals/llm/_shared/code-strategy-case.proof.ts`)
- [x] **D04** — Typecheck passes (`pnpm exec tsc --noEmit` or repo-standard equivalent if present)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `evals/llm/_shared/code-strategy-case.ts` — Shared CodeStrategyCaseDefinition type, imports CaseFixtures/CaseExpectedFilesystem from evals/_llm/case.ts
- **created** `evals/_llm/analyser-payload.ts` — Canonical AnalyserPayload type family — single source of truth extracted from scripts/eval-analyse.ts
- **modified** `evals/llm/_shared/sdk-bridge.ts` — Replaced 215-line verbatim copy with thin re-export from evals/_llm/sdk-bridge.ts
- **modified** `evals/llm/_shared/_user-case-guards.ts` — Replaced 153-line verbatim copy with thin re-export from evals/_llm/_user-case-guards.ts
- **modified** `scripts/eval-analyse.ts` — Replaced inline AnalyserPayload type definitions with import+re-export from evals/_llm/analyser-payload.ts
- **created** `evals/llm/_shared/code-strategy-case.proof.ts` — Compile-time proof that CodeStrategyCaseDefinition is drop-in for inline CaseDefinition (deletable after subtask 06)
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
D03 chose the "proof of concept" path using a non-generated file rather
than modifying a `_meta.generated: true` stamped test file directly.
All 37 stamped test_*.test.ts files remain untouched — template update
is subtask 05's job, bulk re-stamp is subtask 06's job.

Coordination for subtasks 04-06:
- Subtask 04 (central runner): can import AnalyserPayload from evals/_llm/analyser-payload.ts directly.
- Subtask 05 (templates): update per-primitive-test.ts.tmpl to replace inline CaseDefinition with `import type { CodeStrategyCaseDefinition } from "./_shared/code-strategy-case.js"`.
- Subtask 06 (bulk migration): re-stamp all 37 test files using updated template.

<!-- status:notes:end -->
