# Subtask 06 — Eval Single Backend & Co-located Restructure — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 06 |
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
- [ ] **D01** — Rename `evals/llm/_shared/run-code-strategy-suite.ts` → `evals/llm/_shared/run-llm-suite.ts`. Update all internal references and the entry export name `defineLlmCodeEval` → `defineLlmEval`. Also rename `CodeStrategyCaseDefinition` → `LlmCaseDefinition` (keep `CaseDefinition` as deprecated alias for the migration window only — subtask 08 removes the alias once all stamped files are restamped)
- [ ] **D02** — `evals/llm/_shared/code-strategy-case.ts` → rename file to `evals/llm/_shared/llm-case.ts`. Update the type name `CodeStrategyCaseDefinition` → `LlmCaseDefinition`
- [ ] **D03** — `evals/llm/_shared/index.ts` — re-export the renamed module; keep `./askquestion-bridge.js`, `./sdk-bridge.js` exports unchanged
- [ ] **D04** — `evals/llm/_shared/zoto-create-plugin-strategy.ts` and `evals/llm/_shared/zoto-create-plugin-strategy.test.ts` — rename to `zoto-create-plugin-suite.ts` / `.test.ts` if the "strategy" word appears in the file name; update imports
- [ ] **D05** — `evals/llm/_shared/run-code-strategy-suite.test.ts` → rename to `run-llm-suite.test.ts`; update imports
- [ ] **D06** — `evals/llm/_shared/askquestion-bridge.ts` and `askquestion-bridge.test.ts` — verify no "strategy" references; rename if any
- [ ] **D07** — `scripts/eval-stamp.ts` — `resolveLlmPerTargetBackend` removed (no more per-target code/declarative routing); replaced with a single `resolveLlmTargetPath(primitive)` that returns:
- [ ] **D08** — `scripts/eval-stamp.ts` — remove `stampLlmDeclarativeStrategy` (lines ~2699+ per exploration) and all its helpers (`buildDeclarativeStampedCase`, `buildDeclarativeStampedCaseRow`)
- [ ] **D09** — `scripts/eval-stamp.ts` — remove `assertNoConflictingLlmStrategy` (lines ~2105+ per exploration) — no longer relevant
- [ ] **D10** — `scripts/eval-stamp.ts` — rename `stampLlmCodeStrategy` → `stampLlmTarget`; output file marker line stays `// _meta.generated: true` (the file-level guard from `_user-case-guards.ts`)
- [ ] **D11** — `scripts/eval-stamp.ts` — `stampTargetWithBackendRouting` collapses into a single `stampTarget` (no opposite-backend artefact removal needed; one path, one file)
- [ ] **D12** — `scripts/__tests__/eval-stamp-routing.test.ts` — drop strategy-routing test cases (the entire `resolveLlmPerTargetBackend` test block); ADD tests for the new path pattern (one test per kind: command, agent, hook, skill-skipped)
- [ ] **D13** — `scripts/eval-stamp.ts` — verify the TS file it emits compiles in isolation: the stamped file imports `defineLlmEval` from `evals/llm/_shared/run-llm-suite.js` and declares `const CASES: LlmCaseDefinition[] = [...]` — exactly the same template, only renamed symbols + a new file path
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
